import puppeteer from 'puppeteer';
import fs from 'fs';
import readline from 'readline';

const URLS = [
   "https://www.wattpad.com/1219339655-gimai-seikatsu-vol-5-minh-h%E1%BB%8Da",
  "https://www.wattpad.com/1219631847-gimai-seikatsu-vol-5-m%E1%BB%9F-%C4%91%E1%BA%A7u",
  "https://www.wattpad.com/1221603583-gimai-seikatsu-vol-5-ch%C6%B0%C6%A1ng-1-ng%C3%A0y-19-th%C3%A1ng-10-th%E1%BB%A9",
  "https://www.wattpad.com/1227784097-gimai-seikatsu-vol-5-ch%C6%B0%C6%A1ng-2-ng%C3%A0y-19-th%C3%A1ng-10-th%E1%BB%A9",
  "https://www.wattpad.com/1235896066-gimai-seikatsu-vol-5-ch%C6%B0%C6%A1ng-3-ng%C3%A0y-20-th%C3%A1ng-10-th%E1%BB%A9",
  "https://www.wattpad.com/1237761575-gimai-seikatsu-vol-5-ch%C6%B0%C6%A1ng-4-ng%C3%A0y-20-th%C3%A1ng-10-th%E1%BB%A9",
  "https://www.wattpad.com/1255773478-gimai-seikatsu-vol-5-ch%C6%B0%C6%A1ng-5-ng%C3%A0y-21-th%C3%A1ng-10-th%E1%BB%A9",
  "https://www.wattpad.com/1256961011-gimai-seikatsu-vol-5-ch%C6%B0%C6%A1ng-6-ng%C3%A0y-21-th%C3%A1ng-10-th%E1%BB%A9",
  "https://www.wattpad.com/1260257214-gimai-seikatsu-vol-5-ch%C6%B0%C6%A1ng-7-ng%C3%A0y-29-th%C3%A1ng-10-th%E1%BB%A9",
  "https://www.wattpad.com/1261162910-gimai-seikatsu-vol-5-ch%C6%B0%C6%A1ng-8-ng%C3%A0y-29-th%C3%A1ng-10-th%E1%BB%A9",
  "https://www.wattpad.com/1266041898-gimai-seikatsu-vol-5-ch%C6%B0%C6%A1ng-9-ng%C3%A0y-30-th%C3%A1ng-10-th%E1%BB%A9",
  "https://www.wattpad.com/1272223647-gimai-seikatsu-vol-5-ch%C6%B0%C6%A1ng-10-ng%C3%A0y-30-th%C3%A1ng-10",
  "https://www.wattpad.com/1273911361-gimai-seikatsu-vol-5-ch%C6%B0%C6%A1ng-11-ng%C3%A0y-31-th%C3%A1ng-10",
  "https://www.wattpad.com/1273913049-gimai-seikatsu-vol-5-ch%C6%B0%C6%A1ng-12-ng%C3%A0y-31-th%C3%A1ng-10",
  "https://www.wattpad.com/1274497827-gimai-seikatsu-vol-5-l%E1%BB%9Di-b%E1%BA%A1t",
  "https://www.wattpad.com/1275824578-gimai-seikatsu-vol-5-tr%C3%B2-ch%C6%A1i-%C3%B4-ch%E1%BB%AF-c%C3%B9ng-em-k%E1%BA%BF"
];

const SCROLL_STEP = 800;
const SCROLL_DELAY = 1000;
const OUTPUT_FILE = 'data.html';

function sleep(ms) {
  return new Promise(r => setTimeout(r, ms));
}

function ask(question) {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  return new Promise(resolve => rl.question(question, ans => { rl.close(); resolve(ans.trim().toLowerCase()); }));
}

async function scrollUntilEnd(page) {
  while (true) {
    const status = await page.evaluate((step) => {
      const nav = document.querySelector('#story-part-navigation');
      if (nav && nav.getBoundingClientRect().top <= window.innerHeight) return 'nav';
      const before = window.scrollY;
      window.scrollBy(0, step);
      return window.scrollY === before ? 'bottom' : 'scrolling';
    }, SCROLL_STEP);

    if (status === 'nav' || status === 'bottom') break;
    await sleep(SCROLL_DELAY);
  }
}

(async () => {
  if (fs.existsSync(OUTPUT_FILE)) {
    const ans = await ask(`⚠️  "${OUTPUT_FILE}" đã tồn tại. Xóa và scrape lại từ đầu? (y/n): `);
    if (ans === 'y') {
      fs.unlinkSync(OUTPUT_FILE);
      console.log(`🗑️  Đã xóa ${OUTPUT_FILE}`);
    } else {
      console.log(`📝 Giữ file cũ, append thêm vào cuối.`);
    }
  }

  const browser = await puppeteer.launch({ headless: false });
  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 900 });

  let saved = 0;

  for (let i = 0; i < URLS.length; i++) {
    const url = URLS[i];
    console.log(`\n📖 [${i + 1}/${URLS.length}] ${url}`);

    await page.goto(url, { waitUntil: 'networkidle2', timeout: 60000 });
    await sleep(1500);

    console.log('  ⏬ Đang scroll...');
    await scrollUntilEnd(page);

    const articleHtml = await page.evaluate(() => {
      const el = document.querySelector('article.story-part');
      return el ? el.outerHTML : null;
    });

    if (articleHtml) {
      // Append vào file ngay, không chờ xong hết
      fs.appendFileSync(OUTPUT_FILE, articleHtml + '\n\n', 'utf8');
      saved++;
      console.log(`  ✅ Đã lưu chương ${i + 1} vào ${OUTPUT_FILE}`);
    } else {
      console.warn(`  ⚠️  Không tìm thấy <article>, bỏ qua`);
    }
  }

  await browser.close();
  console.log(`\n✅ Hoàn tất! ${saved}/${URLS.length} chương đã lưu vào ${OUTPUT_FILE}`);
})();
