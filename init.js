import fs from 'fs';

const CONFIG_FILE = './config.json';
const DATA_FILE = './data.html';

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

let created = 0;

if (fs.existsSync(CONFIG_FILE)) {
  console.log(`⏭️  ${CONFIG_FILE} already exists, skipping.`);
} else {
  fs.writeFileSync(CONFIG_FILE, JSON.stringify(DEFAULT_CONFIG, null, 2), 'utf8');
  console.log(`✅ Created ${CONFIG_FILE}`);
  created++;
}

if (fs.existsSync(DATA_FILE)) {
  console.log(`⏭️  ${DATA_FILE} already exists, skipping.`);
} else {
  fs.writeFileSync(DATA_FILE, '', 'utf8');
  console.log(`✅ Created ${DATA_FILE} (empty)`);
  created++;
}

if (created > 0) {
  console.log('\n👉 Next steps:');
  if (!fs.existsSync(CONFIG_FILE) || created > 0) {
    console.log(`  1. Edit ${CONFIG_FILE} — set manga.title, manga.author, and add URLs to scrape.urls`);
  }
  console.log('  2. Run: npm run scrape');
  console.log('  3. Run: npm start');
} else {
  console.log('\n✅ Everything already initialised. Ready to go.');
}
