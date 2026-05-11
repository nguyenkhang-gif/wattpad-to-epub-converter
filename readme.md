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
npm run init  →  config.json  →  scrape.js  →  data.html  →  app.js  →  .epub
```

---

## Initialisation

Run once after cloning:

```bash
npm run init
```

This creates `config.json` (from defaults) and an empty `data.html` if they don't already exist. `config.json` is git-ignored — use `config.example.json` as a reference.

---

## Configuration (`config.json`)

All settings are centralised in `config.json`. Edit this file instead of touching any script.

```json
{
  "manga": {
    "title": "Gimai Seikatsu Vol 9",
    "author": "mis3ry",
    "language": "vi"
  },
  "scrape": {
    "outputFile": "data.html",
    "headless": false,
    "scroll": {
      "step": 800,
      "delay": 1000
    },
    "comments": {
      "enabled": true,
      "scrollDelay": 1200,
      "maxIterations": 80,
      "maxReplyClicks": 200
    },
    "urls": [
      "https://www.wattpad.com/...-chapter-1",
      "https://www.wattpad.com/...-chapter-2"
    ]
  },
  "epub": {
    "inputFile": "data.html",
    "coverDir": ".",
    "imagesDir": "./epub-images"
  }
}
```

| Field | Description |
|-------|-------------|
| `manga.title` | EPUB title and output filename |
| `manga.author` | EPUB author metadata |
| `scrape.outputFile` | HTML file produced by the scraper |
| `scrape.headless` | `false` = show Chrome window, `true` = run invisible |
| `scrape.scroll.step` | Pixels scrolled per tick |
| `scrape.scroll.delay` | ms between each scroll tick |
| `scrape.comments.enabled` | Toggle comment scraping |
| `scrape.comments.scrollDelay` | ms between comment-load ticks |
| `scrape.comments.maxIterations` | Max "load more" click attempts |
| `scrape.comments.maxReplyClicks` | Max "view replies" click attempts |
| `scrape.urls` | Ordered list of Wattpad chapter URLs |
| `epub.inputFile` | HTML file to read (should match `scrape.outputFile`) |
| `epub.coverDir` | Directory to search for `cover.jpg / .png / .webp` |
| `epub.imagesDir` | Temp directory used to cache downloaded images |

---

## Step 1 — Scrape content (`scrape.js`)

Add chapter URLs to `scrape.urls` in `config.json`, then run:

```bash
npm run scrape
```

The script will:
1. If `outputFile` already exists — ask whether to delete it or keep it (append to the end)
2. Open Chrome and visit each URL in order
3. Scroll `scroll.step` px at a time with `scroll.delay` ms — stops when it hits the navigation element or reaches the bottom
4. If `comments.enabled` — load all comments, click "Hiển thị thêm / Show more" until exhausted, then expand every reply thread
5. Extract `<article class="story-part">` together with the final `<div class="comments-list">`, wrap them in `<section class="chapter-bundle">`, and **write to `outputFile` immediately** before moving to the next chapter

> If interrupted, all chapters already scraped are safely kept in `outputFile`.

---

## Step 2 — Generate EPUB (`app.js`)

Set `manga.title`, `manga.author` in `config.json`. Optionally place a cover image named `cover.jpg` / `cover.png` / `cover.webp` inside `epub.coverDir` (default: same directory).

Run:

```bash
npm start
```

Confirm `y` when prompted — the file `<title>.epub` will be created in the same directory.

---

## Supported HTML Structure

| Tag | Meaning |
|-----|---------|
| `section.chapter-bundle` | Chapter wrapper (article + its comments) |
| `article.story-part` | A single chapter |
| `.part-header h1` | Chapter title |
| `div.panel-reading p[data-p-id]` | Paragraph content |
| `div.comments-list` | Chapter-end comments section |
| `div.comment-card-container` | A single comment (or reply if nested) |
| `h3.title-action` | Comment author username |
| `.pill__HVTvX` | Author badge (e.g. "Tác Giả") |
| `pre.text-body-sm` | Comment body text |
| `p.postedDate__xcq5D` | Comment posted-date label |

Each chapter renders the original paragraphs followed by a `💬 Bình luận (N)` section listing every captured top-level comment and reply (replies are indented).
