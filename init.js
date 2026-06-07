const fs = require('fs');
const { execSync } = require('child_process');
const path = require('path');

const CONFIG_FILE = './config.json';
const DATA_FILE = './data.html';
const PKG_FILE = './package.json';

const PACKAGE_JSON = {
  name: "wattpad-to-epub-converter",
  version: "1.0.1",
  description: "Parse Wattpad HTML and generate a clean EPUB file",
  type: "module",
  main: "app.js",
  scripts: {
    init: "node init.js",
    start: "node app.js",
    scrape: "node scrape.js"
  },
  dependencies: {
    cheerio: "^1.0.0",
    "epub-gen": "^0.1.0",
    puppeteer: "^24.0.0"
  }
};

const DEFAULT_CONFIG = {
  manga: {
    title: "My Manga Title",
    author: "Author Name",
    language: "vi"
  },
  scrape: {
    outputFile: "data.html",
    headless: false,
    scroll: {
      step: 800,
      delay: 1000
    },
    comments: {
      enabled: true,
      scrollDelay: 1200,
      maxIterations: 80,
      maxReplyClicks: 200
    },
    urls: []
  },
  epub: {
    inputFile: "data.html",
    coverDir: ".",
    imagesDir: "./epub-images"
  }
};

// Step 1: Create package.json
if (fs.existsSync(PKG_FILE)) {
  console.log(`⏭️  ${PKG_FILE} already exists, skipping.`);
} else {
  fs.writeFileSync(PKG_FILE, JSON.stringify(PACKAGE_JSON, null, 2), 'utf8');
  console.log(`✅ Created ${PKG_FILE}`);
}

// Step 2: Install dependencies
if (!fs.existsSync(path.join(__dirname, 'node_modules'))) {
  console.log('\n📦 Installing dependencies...');
  execSync('npm install', { stdio: 'inherit', cwd: __dirname });
  console.log('✅ Dependencies installed');
} else {
  console.log('⏭️  node_modules already exists, skipping install.');
}

// Step 3: Create config.json
if (fs.existsSync(CONFIG_FILE)) {
  console.log(`⏭️  ${CONFIG_FILE} already exists, skipping.`);
} else {
  fs.writeFileSync(CONFIG_FILE, JSON.stringify(DEFAULT_CONFIG, null, 2), 'utf8');
  console.log(`✅ Created ${CONFIG_FILE}`);
}

// Step 4: Create data.html
if (fs.existsSync(DATA_FILE)) {
  console.log(`⏭️  ${DATA_FILE} already exists, skipping.`);
} else {
  fs.writeFileSync(DATA_FILE, '', 'utf8');
  console.log(`✅ Created ${DATA_FILE} (empty)`);
}

console.log('\n👉 Next steps:');
console.log(`  1. Edit ${CONFIG_FILE} — set manga.title, manga.author, and add URLs to scrape.urls`);
console.log('  2. Run: npm run scrape');
console.log('  3. Run: npm start');
