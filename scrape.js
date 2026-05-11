import puppeteer from 'puppeteer';
import fs from 'fs';
import readline from 'readline';

const config = JSON.parse(fs.readFileSync('./config.json', 'utf8'));
const { urls, outputFile, headless, scroll, comments: commentsCfg } = config.scrape;

const SCROLL_STEP = scroll.step;
const SCROLL_DELAY = scroll.delay;
const OUTPUT_FILE = outputFile;

const SCRAPE_COMMENTS = commentsCfg.enabled;
const COMMENT_SCROLL_DELAY = commentsCfg.scrollDelay;
const COMMENT_MAX_ITERATIONS = commentsCfg.maxIterations;
const REPLY_MAX_CLICKS = commentsCfg.maxReplyClicks;

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

async function loadAllComments(page) {
  let stagnant = 0;
  let lastHeight = 0;

  for (let i = 0; i < COMMENT_MAX_ITERATIONS; i++) {
    const result = await page.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll('button'));
      const loadMore = buttons.find(b => {
        if (b.disabled || b.offsetParent === null) return false;
        const text = (b.textContent || '').trim().toLowerCase();
        const aria = (b.getAttribute('aria-label') || '').toLowerCase();
        return text.startsWith('hiển thị thêm')
            || text.startsWith('xem thêm')
            || text.startsWith('show more')
            || text.startsWith('load more')
            || aria.includes('show more')
            || aria.includes('load more');
      });

      if (loadMore) {
        loadMore.scrollIntoView({ block: 'center' });
        loadMore.click();
        return { action: 'clicked', height: document.documentElement.scrollHeight };
      }

      window.scrollTo(0, document.documentElement.scrollHeight);
      return { action: 'scrolled', height: document.documentElement.scrollHeight };
    });

    await sleep(COMMENT_SCROLL_DELAY);

    if (result.height === lastHeight && result.action === 'scrolled') {
      stagnant++;
      if (stagnant >= 3) break;
    } else {
      stagnant = 0;
      lastHeight = result.height;
    }
  }
}

async function expandAllReplies(page) {
  for (let i = 0; i < REPLY_MAX_CLICKS; i++) {
    const clicked = await page.evaluate(() => {
      const isReplyBtn = (b) => {
        if (b.disabled || b.offsetParent === null) return false;
        const aria = (b.getAttribute('aria-label') || '').toLowerCase();
        if (aria === 'view replies') return true;
        const text = (b.textContent || '').trim().toLowerCase();
        return text.startsWith('xem ') && text.includes('trả lời') && !text.startsWith('trả lời');
      };
      const target = Array.from(document.querySelectorAll('button')).find(isReplyBtn);
      if (target) {
        target.scrollIntoView({ block: 'center' });
        target.click();
        return true;
      }
      return false;
    });

    if (!clicked) break;
    await sleep(700);
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

  let browser;
  try {
    const res = await fetch('http://localhost:9222/json/version');
    const { webSocketDebuggerUrl } = await res.json();
    browser = await puppeteer.connect({ browserWSEndpoint: webSocketDebuggerUrl });
    console.log('🔗 Đã kết nối vào Chrome đang chạy (VPN active)');
  } catch {
    console.log('🚀 Khởi động Chrome mới...');
    browser = await puppeteer.launch({
      headless,
      executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
      args: ['--no-first-run', '--no-default-browser-check'],
    });
  }
  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 900 });

  let saved = 0;

  for (let i = 0; i < urls.length; i++) {
    const url = urls[i];
    console.log(`\n📖 [${i + 1}/${urls.length}] ${url}`);

    await page.goto(url, { waitUntil: 'networkidle2', timeout: 60000 });
    await sleep(1500);

    console.log('  ⏬ Đang scroll nội dung chương...');
    await scrollUntilEnd(page);

    if (SCRAPE_COMMENTS) {
      console.log('  💬 Đang load comments...');
      await loadAllComments(page);
      console.log('  💬 Đang mở rộng replies...');
      await expandAllReplies(page);
      await loadAllComments(page);
    }

    const result = await page.evaluate(() => {
      const article = document.querySelector('article.story-part');
      if (!article) return null;
      const lists = document.querySelectorAll('.comments-list');
      const comments = lists.length ? lists[lists.length - 1] : null;
      return {
        article: article.outerHTML,
        comments: comments ? comments.outerHTML : ''
      };
    });

    if (result) {
      const bundle =
        `<section class="chapter-bundle">\n${result.article}\n${result.comments}\n</section>\n\n`;
      fs.appendFileSync(OUTPUT_FILE, bundle, 'utf8');
      saved++;
      console.log(`  ✅ Đã lưu chương ${i + 1} (${result.comments ? 'kèm comments' : 'không có comments'}) vào ${OUTPUT_FILE}`);
    } else {
      console.warn(`  ⚠️  Không tìm thấy <article>, bỏ qua`);
    }
  }

  await browser.close();
  console.log(`\n✅ Hoàn tất! ${saved}/${urls.length} chương đã lưu vào ${OUTPUT_FILE}`);
})();
