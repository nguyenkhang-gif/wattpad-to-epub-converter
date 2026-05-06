import fs from 'fs';
import path from 'path';
import https from 'https';
import http from 'http';
import readline from 'readline';
import * as cheerio from 'cheerio';
import Epub from 'epub-gen';

const inputFile = 'data.html';
const epubTitle = 'Gimai Seikatsu Vol 4';
const epubAuthor = 'DuyAnhBi4';
const IMG_DIR = './epub-images';

const LOCAL_COVER_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.webp'];

function findLocalCover() {
  for (const ext of LOCAL_COVER_EXTENSIONS) {
    const p = `./cover${ext}`;
    if (fs.existsSync(p)) return p;
  }
  return null;
}

function downloadFile(url, dest) {
  return new Promise((resolve, reject) => {
    const file = fs.createWriteStream(dest);
    const client = url.startsWith('https') ? https : http;
    client.get(url, (res) => {
      if (res.statusCode === 301 || res.statusCode === 302) {
        file.close();
        fs.unlink(dest, () => {});
        return downloadFile(res.headers.location, dest).then(resolve).catch(reject);
      }
      res.pipe(file);
      file.on('finish', () => file.close(resolve));
    }).on('error', (err) => {
      fs.unlink(dest, () => {});
      reject(err);
    });
  });
}

// Download all <img> in chapters to local, replace src with absolute file path
async function localizeImages(chapters) {
  if (!fs.existsSync(IMG_DIR)) fs.mkdirSync(IMG_DIR);

  let imgIndex = 0;
  for (const chapter of chapters) {
    const $ = cheerio.load(chapter.data, { xmlMode: false });
    const imgs = $('img').toArray();
    if (imgs.length === 0) continue;

    for (const el of imgs) {
      const src = $(el).attr('src');
      if (!src) continue;

      const ext = path.extname(src.split('?')[0]) || '.jpg';
      const filename = `img_${imgIndex++}${ext}`;
      const localPath = path.resolve(IMG_DIR, filename);

      try {
        await downloadFile(src, localPath);
        $(el).attr('src', localPath);
        console.log(`  🖼️  Downloaded: ${filename}`);
      } catch (e) {
        console.warn(`  ⚠️  Failed to download image: ${src.slice(0, 60)}...`);
      }
    }

    chapter.data = $('body').html();
  }
}

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

let html;
try {
  html = fs.readFileSync(inputFile, 'utf8');
} catch (err) {
  console.error("❌ Lỗi khi đọc file:", err);
  process.exit(1);
}

(async () => {
  const $ = cheerio.load(html);

  const coverPath = findLocalCover();
  if (coverPath) {
    console.log(`🖼️  Cover: ${coverPath}`);
  } else {
    console.log('⚠️  No local cover found (cover.jpg / cover.png / ...)');
  }

  const chapters = [];

  $('article.story-part').each((i, article) => {
    const title = $(article).find('.part-header h1').text().trim()
      || `Chapter ${i + 1}`;

    const paragraphs = [];
    $(article).find('div.panel-reading p[data-p-id]').each((j, p) => {
      $(p).find('.component-wrapper').remove();
      const inner = $(p).html().trim();
      if (inner && inner !== '<br>') {
        paragraphs.push(`<p>${inner}</p>`);
      }
    });

    if (paragraphs.length > 0) {
      chapters.push({ title, data: paragraphs.join('\n') });
    }
  });

  if (chapters.length === 0) {
    console.log("⚠️ No chapters found!");
    rl.close();
    return;
  }

  const hasImg = chapters.some(c => c.data.includes('<img'));
  console.log(`\n🔍 Images in content: ${hasImg}`);

  if (hasImg) {
    console.log('📥 Pre-downloading images to local...');
    await localizeImages(chapters);
  }

  console.log(`\n📘 File: ${inputFile}`);
  chapters.forEach((chap, idx) => {
    console.log(`  [${idx + 1}] ${chap.title}`);
  });

  rl.question(`\nCreate EPUB "${epubTitle}.epub"? (y/n): `, async (answer) => {
    if (answer.trim().toLowerCase() === 'y') {
      const option = {
        title: epubTitle,
        author: epubAuthor,
        cover: coverPath || undefined,
        content: chapters
      };

      try {
        await new Epub(option, `./${epubTitle}.epub`).promise;
        console.log(`✅ EPUB created: ${epubTitle}.epub`);
      } catch (error) {
        console.error("❌ Error creating EPUB:", error);
      } finally {
        if (fs.existsSync(IMG_DIR)) {
          fs.rmSync(IMG_DIR, { recursive: true, force: true });
          console.log('🗑️  Cleared epub-images/');
        }
      }
    } else {
      console.log("❌ Cancelled.");
    }

    rl.close();
  });
})();
