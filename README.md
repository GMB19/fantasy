# GM — Autonomous Fantasy Football GM for Sleeper

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
