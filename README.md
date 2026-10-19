# ALZ Technology website

Static site for **ALZ Technology** (blockchain, Web3 and business analysis), made for GitHub Pages.
Plain HTML, CSS and JavaScript. No build step and no dependencies.

## Structure

```
index.html              Home: hero, live market board, articles, about, footer
404.html                GitHub Pages "not found" page
css/style.css           All styles (mobile first)
js/main.js              Node-network animation, CoinGecko market board + ticker, article list
articles/
  articles.json         List of articles shown on the home page
  _template.html        Copy this to write a new article
  rwa-tokenization.html First article
  img/                  Article header images
assets/img/             Logo, banner, favicons, Open Graph image
favicon.ico, site.webmanifest, robots.txt, .nojekyll
```

## Run it locally

```bash
cd alz-site
python3 -m http.server 8000
# open http://localhost:8000
```

Use a local server. Opening `index.html` directly from disk (`file://`) blocks the `articles.json` fetch, so the article list won't load.

## Add a new article

1. Copy `articles/_template.html` to `articles/<your-slug>.html`, for example `articles/what-is-xrpl.html`.
2. Replace every `{{PLACEHOLDER}}`: title, description, date, tag, image file, image alt text and the article body inside `<div class="prose">`. Delete the comment at the top.
3. Put the header image (16:9, about 1280x720 JPG) in `articles/img/`.
4. Add an entry to `articles/articles.json`. The newest date is shown first:

```json
{
  "title": "What is the XRP Ledger?",
  "url": "articles/what-is-xrpl.html",
  "image": "articles/img/what-is-xrpl.jpg",
  "imageAlt": "Short description of the image",
  "summary": "One or two sentences shown on the card.",
  "tag": "XRPL",
  "date": "2026-10-21",
  "readMinutes": 3
}
```

Paths in `articles.json` are relative to the site root. Remember the comma between entries. Add `"draft": true` to hide an entry without deleting it.

## Market board

- Data comes from CoinGecko's free public API (`/api/v3/coins/markets`), fetched in the browser. No API key is needed.
- Coins: BTC, ETH, XRP, XLM, HBAR, ADA, XDC, SOL, DOGE, VET. To change them, edit the `COINS` array at the top of the market section in `js/main.js`. Use CoinGecko coin ids, for example `xdce-crowd-sale` for XDC.
- It refreshes every 60 seconds while the tab is visible and backs off after repeated errors.
- The last good response is cached in `localStorage`. If CoinGecko is down or rate-limited (HTTP 429), the board shows the cached prices with a "Live data temporarily unavailable" note.

## Publish on GitHub Pages

1. Create a repository and push the contents of this folder, with `index.html` at the repository root.
2. In the repository, go to **Settings → Pages**, choose **Deploy from a branch**, then select `main` and `/ (root)`.
3. Once the URL is known (for example `https://<user>.github.io/<repo>/`), change the `og:image` and `twitter:image` values in `index.html` and in each article to **absolute** URLs. LinkedIn, X and WhatsApp previews need absolute image URLs.

`_preview/` holds local test screenshots and is excluded by `.gitignore`.
