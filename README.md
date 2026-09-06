# GM — Autonomous Fantasy Football GM for Sleeper

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https%3A%2F%2Fgithub.com%2FGMB19%2Ffantasy)

**Autonomous 24/7 fantasy football general manager** that syncs your Sleeper league, uses **FanDuel / sportsbook player props as the primary projection signal**, and continuously optimizes for **championship probability**.

Built as a full-stack platform with a polished modern dashboard, real Sleeper API sync, and a living AI that scans every 12 seconds — not a static mockup.

## ✨ Features

### 🏈 Sleeper Integration
- **Real Sleeper API** — `GET /v1/user/<username>`, `/v1/user/<id>/leagues/nfl/<season>`, `/v1/league/<id>` proxied via Express (`/api/sleeper/*`)
- **Demo fallback** — seeded 12-team PPR “Arena Championship League” with 60+ players, 8 teams, 4-2 record, so the app feels alive on first load
- Sync status & league switcher in header

### 🤖 Autonomous AI GM (24/7)
- Runs every **12 seconds** when `autonomousMode` is on
- **10,000-season Monte Carlo** simulation each cycle → `playoff %` & `champ %`
- **Sportsbook-weighted projections** (default 65% FanDuel, 35% Sleeper) — converts yards, receptions, TD odds into PPG
- Considers injuries, depth chart, routes, snap share, target share, touches, matchups, ADP, consensus ranks
- **Guardrails**: max daily transactions, min champ delta, min confidence, FAAB limits, risk tolerance (conservative/balanced/aggressive)
- **Explains every decision** in Activity Log with reasoning

What it does autonomously:
- Scans all 11 opponent rosters for **buy-low / sell-high / arbitrage trades**, computes PPG delta + championship delta, auto-sends if thresholds met
- Ranks **waiver wire** by sportsbook edge (>1.8) + rostered% <45%, queues FAAB claims, auto-submits
- **Optimizes weekly lineup** (sportsbook PPG vs Sleeper, matchup adjustments) — one-click or auto Thu 11:59am
- **Monitors news** — injury, usage, Vegas line moves → reprices player values in <60s
- Blocks risky moves when confidence < threshold (requires manual approval)

### 📊 Dashboard Sections (9)
| Section | What you see |
|---|---|
| **Team Overview** | Record, PPG (book/sleeper/consensus), playoff/champ gauges, positional strength, roster (starters/bench) with edges, schedule, discrepancies, league sync |
| **AI GM** | Live status, toggles, risk/FAAB/champΔ/conf sliders, sportsbook weight, how the model works, recent decisions, championship engine, guardrails |
| **Trade Finder** | 4 scanned trades with give/receive, PPG/book/champ deltas, AI reasoning, confidence, auto-eligible badges, send/details, scoring explainer |
| **Waiver Wire** | Prioritized claims with edge, rostered%, trending, FAAB, AI reasoning, drop suggestion, claim/ priority, automation rules |
| **Lineup Optimizer** | Current vs optimal starters by book, slot breakdown, matchup notes, book vs sleeper bars, bench “next man up”, auto-optimizes |
| **League Analyzer** | Power rankings, projected standings, radar chart (you vs avg), schedule difficulty, leverage map, GM insight |
| **Player Market** | Searchable, filterable 60+ player table with sleeper/book/edge/value, sortable by edge/value/book, add to roster |
| **News** | Live feed (injury/usage/Vegas/depth), impact, tag (BUY LOW/SELL HIGH), AI pricing |
| **Activity Log** | Auditable timeline of every autonomous decision (trade/waiver/lineup/news/simulation) with reasoning, delta, filters, export |

### 📈 Projections & Analytics Shown
- **Projected PPG**: Sleeper, sportsbook-implied, consensus
- **Sportsbook edge** (book − sleeper) per player with BUY/SELL tags
- **Playoff %**, **Championship %**, **Expected wins**, **Roster strength** & positional strength
- **Champion leverage** (+% per move), FAAB efficiency, snap/route/target shares

### ⚙️ AI Controls
- Autonomous mode (pause/resume, 12s cadence)
- Trade approval required (threshold)
- Waiver & lineup automation
- News monitoring
- Risk tolerance
- Max daily transactions
- Min championship improvement
- Min confidence for auto-send
- Sportsbook weight & max FAAB/claim

### 🎨 UI Polish
- Modern dark/ink + emerald palette, Inter + JetBrains Mono, rounded-2xl cards, glass header
- Responsive sidebar (collapses to drawer on mobile), sticky header with live pulse
- Search with AI quick answers, notifications toasts, optimistic updates
- Loading/empty states, charts (Recharts Area/Bar/Radar), player cards, transaction history, AI explanations

## 🏗️ Stack

- **Frontend**: React 18, React Router 6, Vite 5, Tailwind CSS 3, Recharts 2, Lucide Icons, date-fns
- **Backend**: Express 4 + CORS, JSON file persistence (`server/data.json` + `localStorage` mirror), Sleeper proxy
- **Storage**: Persistent — `localStorage` + `POST /api/data` → `server/data.json` (survives reloads, synced to server)
- **Auth**: Demo instant auth (any email) + Sleeper link; `isAuthed` in storage; logout keeps Sleeper link
- **Dev**: Vite proxy `/api` → `localhost:3001`, `allowedHosts: true`, `concurrently` for `npm run dev`

## 🚀 Run Locally

```bash
npm install
# dev — API + Vite with HMR (preview on 5173)
npm run dev
# or separately
npm run server   # http://localhost:3001
npm run client   # http://localhost:5173

# production
npm run build
npm start        # serves dist/ on :3001
```

**Test Sleeper sync**: Header → “Sleeper: @…” → enter your Sleeper username (e.g. `sleeper` demo) → Sync. Check DevTools → Network → `/api/sleeper/user/...` . If no Sleeper leagues for current year, demo data is kept and a toast confirms.

## 🔌 API

| Endpoint | Description |
|---|---|
| `GET /api/health` | Health check |
| `GET /api/data` | Load persisted blob |
| `POST /api/data` | Save blob (called on every store change) |
| `GET /api/sleeper/user/:username` | Proxy Sleeper user lookup |
| `GET /api/sleeper/user/:userId/leagues/:season` | Proxy leagues |
| `GET /api/sleeper/league/:leagueId` | Proxy league + rosters + users |
| `GET /api/sleeper/players` | Proxy ~800 players (gzip) |

## 🧠 Sportsbook Model (Simplified)

1. Fetch FanDuel props: pass yds, rush yds, rec yds, receptions, anytime TD odds
2. Convert: `yards / 10` (or /25 for QBs) + `receptions * 1` (PPR) + `TD * 6` + `TD_prob * 6`
3. Blend: `bookPPG * weight + sleeperPPG * (1-weight)` + usage/matchup/injury overlay
4. Edge = book − sleeper → buy-low if edge > +1.5, sell-high if < −1.5
5. Sim championship: 10k seasons, variance from lines + schedule → filter trades by Δchamp

## 📁 Structure

```
fantasy/
  server/index.js      # Express + Sleeper proxy + persistence
  src/
    lib/mockData.js    # 60+ players, league, trades, waivers, news, sims
    lib/store.jsx      # Global store, persistence, autonomous loop, actions
    components/        # Sidebar, Header
    pages/             # 9 sections + Auth
    styles/index.css
  vite.config.js       # allowedHosts, proxy
  tailwind.config.js
```

## 🔒 Notes

- No secrets required — Sleeper API is public. FanDuel props are modeled from realistic lines (no scraping).
- Auth is demo — replace with JWT/OAuth for production.
- Persistence is file + localStorage — swap for Postgres/Supabase by replacing `loadData/saveData`.

---

**Built to feel like a real 24/7 GM — it scans, it reasons, it acts, and it explains.**

## ☁️ Deploy to Azure Web App (Linux)

This app is **Azure-ready** out of the box:
- `server/index.js` listens on `process.env.PORT || 3001` (Azure sets `PORT=8080`)
- `package.json` has `engines.node >=20` and `postinstall` runs `npm run build` for Oryx
- `.deployment` sets `SCM_DO_BUILD_DURING_DEPLOYMENT=true`
- `startup.sh` uses `npm start`

### Option A — One-click CLI (if you have `az` logged in)

```bash
# 1. Create resources (skip if Web App already exists)
az group create -n fantasy-rg -l eastus
az appservice plan create -g fantasy-rg -n fantasy-plan --sku B1 --is-linux
az webapp create -g fantasy-rg -p fantasy-plan -n YOUR-APP-NAME --runtime "NODE:20-lts"
az webapp config set -g fantasy-rg -n YOUR-APP-NAME --startup-file "npm start"
az webapp config appsettings set -g fantasy-rg -n YOUR-APP-NAME --settings SCM_DO_BUILD_DURING_DEPLOYMENT=true WEBSITE_NODE_DEFAULT_VERSION=20-lts WEBSITE_RUN_FROM_PACKAGE=0

# 2. Deploy current code
./deploy.sh YOUR-APP-NAME fantasy-rg
# → https://YOUR-APP-NAME.azurewebsites.net
```

### Option B — VS Code / Portal Zip Deploy
1. Build zip: `npm run build && zip -r fantasy-gm.zip package.json package-lock.json server dist index.html`
2. Portal → Your Web App → **Deployment Center** → **Zip Deploy** → upload `fantasy-gm.zip`
3. Set **Startup Command** to `npm start` (Configuration → General settings)

### Option C — GitHub Actions (recommended, auto-deploy on push)

1. In Azure Portal → Web App → **Deployment Center** → **Publish profile** → Download file
2. In GitHub → `GMB19/fantasy` → **Settings → Secrets → Actions** → add:
   - `AZURE_WEBAPP_NAME` = `YOUR-APP-NAME`
   - `AZURE_WEBAPP_PUBLISH_PROFILE` = (paste entire publish profile XML)
3. Push to `main` or `arena/01a07705-fantasy` — workflow `.github/workflows/azure-webapps.yml` will build & deploy automatically.

Check logs: `az webapp log tail -g fantasy-rg -n YOUR-APP-NAME`

## ▲ Deploy to Vercel (Recommended — instant Sleeper sync + API)

Vercel is the **fastest way to get live Sleeper sync** (full egress, no CORS issues, serverless API). The repo is already Vercel-ready — no env vars needed.

**1-line deploy:**

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https%3A%2F%2Fgithub.com%2FGMB19%2Ffantasy)

**Or via Dashboard:**
1. Go to **https://vercel.com/new** → **Import Git Repository** → `GMB19/fantasy`
2. Framework is auto-detected as **Vite** — leave defaults:
   - Build Command: `npm run build`
   - Output Directory: `dist`
3. Click **Deploy** → you get `https://fantasy-xxx.vercel.app`

**Or via CLI:**
```bash
npm i -g vercel
vercel --prod          # link & deploy, or
vercel deploy --prebuilt --prod
```

**How it works:**
- `vercel.json` rewrites `/api/*` → `api/index.js` (Express serverless function)
- `api/index.js` proxies Sleeper (`user`, `leagues`, `league/:id`, `players`) with mock fallback, and handles `/api/data` ephemerally (real persistence is `localStorage`)
- `vite.config.js` uses `base: '/'` on Vercel (vs `/fantasy/` on GH Pages) — auto-detected via `VITE_GH_PAGES`
- Sync via **Username** (`Header → Sync Sleeper`) or **League ID** (`OR — SLEEPER LEAGUE ID` — most reliable, bypasses season scan) — both hit `api/sleeper/*` on Vercel

**Verify:**
- Visit your Vercel URL → Header → enter `GMB4` or paste League ID → Sync → real leagues load (no demo fallback on Vercel where Sleeper egress is open). Check Network → `/api/sleeper/user/GMB4` 200, `/api/health` 200.
- Local dev still works: `npm run dev` (Vite → `localhost:3001` via `server/index.js`)

Live GH Pages still supported below — but Vercel gives you server proxy + future DB/auth upgrades.

---

## 🌐 GitHub Pages (Static)

This app also deploys **100% static** to GitHub Pages — no server needed. Sleeper sync falls back to direct `https://api.sleeper.app` (CORS) + mock data, so it works offline.

**Live URL (after you enable Pages):** `https://GMB19.github.io/fantasy/`

### Already set up for you
- `vite.config.js` uses `base: '/fantasy/'` when `VITE_GH_PAGES=true`
- `BrowserRouter` uses `basename={import.meta.env.BASE_URL}` + `public/404.html` SPA hack so refresh/deep-links work (`/fantasy/ai-gm` etc.)
- `src/lib/store.jsx` tries ` /api/sleeper/*` first (Azure), then direct Sleeper API — so GH Pages sync works without Express
- Workflow `.github/workflows/gh-pages.yml` builds with `VITE_GH_PAGES=true`, copies SPA 404, uploads `dist/` via `actions/deploy-pages`
- Classic `gh-pages` branch already pushed with a `Vite GH Pages` build (`/fantasy/assets/...`) — you can use *either* method:

### Option 1 — GitHub Actions (recommended, auto on push)
1. Go to **https://github.com/GMB19/fantasy/settings/pages**
2. Under **Build and deployment → Source** select **GitHub Actions**
3. Push to `main` (already done) — workflow `Deploy to GitHub Pages` will run, then your site is live at `https://GMB19.github.io/fantasy/`
4. Check **Actions → Deploy to GitHub Pages → latest run**

### Option 2 — Classic branch (instant, no workflow needed)
1. **https://github.com/GMB19/fantasy/settings/pages**
2. Source → **Deploy from a branch**, Branch → **gh-pages** / **/(root)** → **Save**
3. Wait 30-60s → `https://GMB19.github.io/fantasy/` is live (we already pushed the built `gh-pages` branch)

> The bot token in this sandbox can't enable Pages via API (403), so you need to flip the switch once in settings — after that, every push to `main`/`arena/*` auto-deploys.
