# Wattpad → EPUB Converter

Automatically scrape content from Wattpad and generate an EPUB file.

## Requirements

- Node.js >= 18

## Installation

```bash
npm install
```

## Workflow

```
scrape.js  →  data.html  →  app.js  →  .epub
```

---

## Step 1 — Scrape content (`scrape.js`)

Open `scrape.js` and add chapter URLs to the `URLS` array:

```js
const URLS = [
  'https://www.wattpad.com/1173022060-chapter-1',
  'https://www.wattpad.com/1173066655-chapter-2',
  // ...
];
```

Run the scraper:

```bash
npm run scrape
```

The script will:
1. If `data.html` already exists — ask whether to delete it or keep it (append to the end)
2. Open Chrome and visit each URL in order
3. Scroll 800px at a time with a 1-second delay — stops when it hits the navigation element or reaches the bottom of the page
4. Extract `<article class="story-part">` and **write to `data.html` immediately** before moving to the next chapter

> If interrupted, all chapters already scraped are safely kept in `data.html`.

---

## Step 2 — Generate EPUB (`app.js`)

Edit the book info at the top of `app.js`:

```js
const epubTitle  = 'Gimai Seikatsu Vol 4';
const epubAuthor = 'DuyAnhBi4';
```

Optionally place a cover image named `cover.jpg` / `cover.png` in the same directory.

Run:

```bash
npm start
```

Confirm `y` when prompted — the file `<epubTitle>.epub` will be created in the same directory.

---

## Supported HTML Structure

| Tag | Meaning |
|-----|---------|
| `article.story-part` | A single chapter |
| `.part-header h1` | Chapter title |
| `div.panel-reading p[data-p-id]` | Paragraph content |
