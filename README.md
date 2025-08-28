# Stock Market Prediction Game

Static web app that lets you pick any stock ticker and play a simple up/down prediction game using real data from Alpha Vantage.

Uses:
- Alpha Vantage TIME_SERIES_DAILY_ADJUSTED (real market data)
- Chart.js for visualization

## How it works

1. Enter a valid ticker (e.g., `MSFT`, `AAPL`, `COF`).
2. The app fetches real daily prices from Alpha Vantage.
3. It chooses a random starting trading day between 7 and 100 days before today.
4. It shows the 7 trading days before that start date plus the start date itself.
5. You predict whether the next day's close will go up or down. The app reveals the next day, updates the chart and your score, and you continue until you stop.

## Local development

Just open `index.html` in a modern browser. Because the app calls Alpha Vantage from the browser, there is no build step required.

If you run into CORS caching issues, try using a simple HTTP server (examples):

```bash
# Python 3
python3 -m http.server 8000

# Node
npx http-server -p 8000
```

Then open `http://localhost:8000`.

## Deploy to GitHub Pages

Option A: Deploy from the root of `main` branch

1. Create a new GitHub repository and push these files.
2. Go to Settings → Pages.
3. Under "Build and deployment", set:
   - Source: Deploy from a branch
   - Branch: `main` (or your default) and root (`/`).
4. Save. Your site will be published at `https://<your-username>.github.io/<repo-name>/`.

Option B: Deploy from `docs/` folder

1. Move all files into a `docs/` folder at the repo root.
2. In Settings → Pages, choose the `main` branch and `/docs` folder.

## Configuration

The app uses the provided API key in `app.js`:

```js
const API_KEY = "MBX1XO94WJHYAW9P";
```

If you prefer to use your own key, replace it there.

## Notes

- Alpha Vantage free tier has rate limits (typically 5 req/min, 500/day). If you see an API limit message, wait a minute and try again.
- The app only uses real market data. No mock or demo data is used.

# demo