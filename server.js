import express from 'express';
import fs from 'fs';
import path from 'path';
import https from 'https';
import http from 'http';
import multer from 'multer';
import * as cheerio from 'cheerio';
import Epub from 'epub-gen';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const upload = multer({ dest: 'uploads/' });
const IMG_DIR = './epub-images';
const PORT = 3000;

app.use(express.static(__dirname));

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

async function localizeImages(chapters, log) {
  if (!fs.existsSync(IMG_DIR)) fs.mkdirSync(IMG_DIR);
  let imgIndex = 0;
  for (const chapter of chapters) {
    const $ = cheerio.load(chapter.data);
    const imgs = $('img').toArray();
    for (const el of imgs) {
      const src = $(el).attr('src');
      if (!src) continue;
      const ext = path.extname(src.split('?')[0]) || '.jpg';
      const filename = `img_${imgIndex++}${ext}`;
      const localPath = path.resolve(IMG_DIR, filename);
      try {
        await downloadFile(src, localPath);
        $(el).attr('src', localPath);
        log(`Downloaded: ${filename}`);
      } catch {
        log(`Failed to download: ${src.slice(0, 60)}...`);
      }
    }
    chapter.data = $('body').html();
  }
}

app.post('/generate', upload.fields([
  { name: 'dataHtml', maxCount: 1 },
  { name: 'cover', maxCount: 1 }
]), async (req, res) => {
  const logs = [];
  const log = (msg) => { logs.push(msg); console.log(msg); };

  const { title, author, includeImages } = req.body;
  const dataFile = req.files?.dataHtml?.[0];
  const coverFile = req.files?.cover?.[0];

  if (!dataFile) {
    return res.status(400).json({ error: 'Missing data.html file' });
  }

  try {
    const html = fs.readFileSync(dataFile.path, 'utf8');
    const $ = cheerio.load(html);
    const chapters = [];

    $('article.story-part').each((i, article) => {
      const chapterTitle = $(article).find('.part-header h1').text().trim() || `Chapter ${i + 1}`;
      const paragraphs = [];
      $(article).find('div.panel-reading p[data-p-id]').each((j, p) => {
        $(p).find('.component-wrapper').remove();
        const inner = $(p).html().trim();
        if (inner && inner !== '<br>') paragraphs.push(`<p>${inner}</p>`);
      });
      if (paragraphs.length > 0) chapters.push({ title: chapterTitle, data: paragraphs.join('\n') });
    });

    if (chapters.length === 0) {
      return res.status(400).json({ error: 'No chapters found in HTML' });
    }

    log(`Found ${chapters.length} chapters`);

    const hasImg = chapters.some(c => c.data.includes('<img'));
    log(`Images in content: ${hasImg}`);

    if (hasImg && includeImages === 'true') {
      log('Downloading images...');
      await localizeImages(chapters, log);
    } else if (hasImg) {
      chapters.forEach(c => {
        const $c = cheerio.load(c.data);
        $c('img').remove();
        c.data = $c('body').html();
      });
      log('Images removed from content');
    }

    const epubTitle = title || 'Untitled';
    const outputPath = path.resolve(__dirname, `${epubTitle}.epub`);

    const option = {
      title: epubTitle,
      author: author || 'Unknown',
      cover: coverFile ? coverFile.path : undefined,
      content: chapters
    };

    await new Epub(option, outputPath).promise;
    log(`EPUB created: ${epubTitle}.epub`);

    res.download(outputPath, `${epubTitle}.epub`, (err) => {
      // cleanup
      fs.unlink(dataFile.path, () => {});
      if (coverFile) fs.unlink(coverFile.path, () => {});
      if (fs.existsSync(IMG_DIR)) fs.rmSync(IMG_DIR, { recursive: true, force: true });
      if (!err) fs.unlink(outputPath, () => {});
    });

  } catch (err) {
    log(`Error: ${err.message}`);
    res.status(500).json({ error: err.message, logs });
  }
});

app.listen(PORT, () => {
  console.log(`\n🚀 UI running at http://localhost:${PORT}\n`);
});
