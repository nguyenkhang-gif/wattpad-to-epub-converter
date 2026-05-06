import puppeteer from 'puppeteer';
import fs from 'fs';

const START_URL = 'https://www.wattpad.com/1173022060-gimai-seikatsu-vol-4-ch%C6%B0%C6%A1ng-1-ng%C3%A0y-3-th%C3%A1ng-9-th%E1%BB%A9';
const SCROLL_STEP = 800;
const SCROLL_DELAY = 1000;

function sleep(ms) {
  return new Promise(r => setTimeout(r, ms));
}

(async () => {
  const browser = await puppeteer.launch({ headless: false });
  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 900 });

  let currentUrl = START_URL;
  const allArticles = [];
  let chapterIndex = 1;

  while (currentUrl) {
    console.log(`\n📖 Chương ${chapterIndex}: ${currentUrl}`);
    await page.goto(currentUrl, { waitUntil: 'networkidle2', timeout: 60000 });
    await sleep(1500);

    console.log('  ⏬ Đang scroll...');
    await scrollUntilEndFn(page);

    // Lấy article của trang hiện tại
    const articleHtml = await page.evaluate(() => {
      const el = document.querySelector('article.story-part');
      return el ? el.outerHTML : null;
    });

    if (articleHtml) {
      allArticles.push(articleHtml);
      console.log(`  ✅ Đã lấy nội dung chương ${chapterIndex}`);
    } else {
      console.warn(`  ⚠️  Không tìm thấy <article> ở chương ${chapterIndex}`);
    }

    // Tìm link chương tiếp theo
    const nextUrl = await page.evaluate(() => {
      const a = document.querySelector('#story-part-navigation a');
      return a ? a.href : null;
    });

    currentUrl = nextUrl || null;
    chapterIndex++;
  }

  if (allArticles.length === 0) {
    console.error('\n❌ Không thu được nội dung nào!');
    await browser.close();
    process.exit(1);
  }

  fs.writeFileSync('data.html', allArticles.join('\n\n'), 'utf8');
  console.log(`\n✅ Hoàn tất! Đã lưu ${allArticles.length} chương vào data.html`);

  await browser.close();
})();

async function scrollUntilEndFn(page) {
  while (true) {
    const status = await page.evaluate((step) => {
      const nav = document.querySelector('#story-part-navigation');
      if (nav) {
        const rect = nav.getBoundingClientRect();
        if (rect.top <= window.innerHeight) return 'nav';
      }
      const before = window.scrollY;
      window.scrollBy(0, step);
      return window.scrollY === before ? 'bottom' : 'scrolling';
    }, SCROLL_STEP);

    if (status === 'nav' || status === 'bottom') break;
    await sleep(SCROLL_DELAY);
  }
}
