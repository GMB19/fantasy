# Gridiron GM — Autonomous Fantasy Football General Manager

A full-stack, always-on AI general manager for Sleeper fantasy football leagues. It does not just
analyse your team: it continuously re-prices the player market off **sportsbook player props**,
simulates the rest of the season, and then *acts* — sending trade offers, submitting FAAB claims and
re-optimising your lineup inside the guardrails you set.

```
Next.js 15 (App Router) · React 19 · TypeScript · Tailwind · Recharts · SQLite (better-sqlite3)
```

---

## Quick start

```bash
npm install
npm run dev          # http://localhost:3000
```

1. Create an account at `/signup`.
2. On `/connect`, either enter a Sleeper username or click **Load a demo league**.
3. You land on a fully populated mid-season league with rosters, records, a prop feed and an AI
   decision history already in place.

Other scripts: `npm run build`, `npm start`, `npm run typecheck`.

The database is a single SQLite file at `data/gridiron.db` (created automatically, git-ignored).
Delete it to reset everything.

---

## The projection engine

Everything downstream — trade values, waiver bids, lineup slots, championship odds — is built on one
number per player per week: `model_pts`.

| Source | Default weight | What it is |
| --- | --- | --- |
| **Sportsbook (FanDuel)** | **0.55** | De-vigged player props (pass/rush/rec yards, TD, receptions, attempts) converted into fantasy points |
| Consensus rankings | 0.25 | Positional consensus + ADP mapped onto a points curve |
| Sleeper platform | 0.20 | The platform's own weekly projection |

Props are converted with `lib/scoring.ts`: American odds → implied probability → de-vig across the
two sides of a line → expected value of the stat → PPR points. The blend weights are user-editable
in **AI Settings**, and the resulting **book-vs-platform discrepancy** is itself a tradeable signal
(it is what drives the buy-low / sell-high board).

Layered on top: injury status, depth-chart order, snap %, target share, route %, touches/game,
red-zone share, bye weeks, and a 0–100 matchup rating from opponent defensive ratings.

---

## What the agent actually does

`lib/agent.ts` runs a cycle every `scan_interval_sec` (default 30s) per league, in this order:

1. **Refresh** — re-run projections and player values from the latest prop slate.
2. **News monitor** — pull the wire, apply injury/usage/depth-chart deltas, re-score affected players
   and write an AI take for each item.
3. **Lineup** — solve the optimal starting lineup (`lib/lineup.ts`) and apply it if automation is on.
4. **Waivers** — score every free agent against your weakest startable player, size a FAAB bid from
   your risk/aggressiveness settings, and submit claims that clear the championship-probability
   threshold.
5. **Trades** — enumerate 1-for-1 / 2-for-1 constructions against all 11 rivals, simulate each one
   (`lib/sim.ts` Monte Carlo), estimate the rival GM's acceptance probability from their persona and
   needs, and send or queue the best offers.
6. **Simulate** — persist a fresh playoff / championship probability snapshot so the trend charts
   move over time.

Every step writes an **AI decision** (title, summary, numbered rationale, confidence, projected-point
delta, championship-probability delta) and an **activity-log** row, so nothing the agent does is
unexplained.

### Guardrails

Nothing executes unless it passes every gate: autonomous mode on, not paused, under the daily
transaction cap, risk score under your tolerance, championship-probability improvement above your
minimum, bid within your max-FAAB share, and no protected ("untouchable") player involved.

---

## Dashboard

| Route | Section | Highlights |
| --- | --- | --- |
| `/dashboard` | **Team Overview** | KPI grid, championship-probability trend, this week's matchup, live lineup, positional radar, top discrepancies |
| `/dashboard/ai-gm` | **AI GM** | Agent status band, guardrail controls, blend weights, full decision log with type filters, objective chart, watch list |
| `/dashboard/trades` | **Trade Finder** | Ranked trade constructions with acceptance odds, trade book with approve / reject / force-accept / withdraw, manual trade builder |
| `/dashboard/waivers` | **Waiver Wire** | FAAB burn-down, AI waiver board with recommended bids, claim queue, free-agent search |
| `/dashboard/lineup` | **Lineup Optimizer** | Slot-by-slot starters with book/platform/model columns, points-left-on-bench, one-click apply, manual swap |
| `/dashboard/league` | **League Analyzer** | Power rankings, positional edges vs league average, standings and roster audit, week matchups, rival GM editing |
| `/dashboard/market` | **Player Market** | Full market board with filters and sorts, buy-low / sell-high panels, biggest book-vs-Sleeper gaps, custom player creation |
| `/dashboard/news` | **News** | Severity-tagged wire with value and projection deltas plus the GM's read on each item |
| `/dashboard/activity` | **Activity Log** | Full audit timeline across AI, user and league actors |
| `/dashboard/settings` | **AI Settings** | Autonomy switches, risk limits, projection weights, untouchables, league CRUD and sync |

The whole dashboard polls `/api/snapshot` every 6 seconds, and each section polls its own endpoint,
so numbers move while you watch. Optimistic updates, toasts, skeletons and empty states throughout.

---

## Sleeper connection

`lib/sleeper.ts` speaks the real Sleeper API (`api.sleeper.app`). When the network is unavailable it
falls back to a **deterministic synthetic league generator** seeded from your username, and the UI
labels the feed as simulated (`source: 'live' | 'simulated'`) rather than pretending otherwise.

---

## Layout

```
app/
  api/            REST surface (auth, leagues, teams, players, trades, waivers, lineup, ai, news, ...)
  dashboard/      the ten dashboard sections
  page.tsx        landing · login · signup · connect
lib/
  db.ts           SQLite schema (20 tables) + migrations
  scoring.ts      PPR scoring, odds → probability, de-vig, prop expectation
  props.ts        sportsbook slate construction (FanDuel primary)
  projections.ts  blended projections, ROS PPG, VORP, trade value
  lineup.ts       optimal-lineup solver
  sim.ts          Monte Carlo season / playoff / championship simulation
  trades.ts       trade construction, rival acceptance model, execution
  waivers.ts      free agents, claim scoring, FAAB sizing, processing
  agent.ts        the autonomous cycle, decisions, activity, notifications
  seed.ts         realistic demo-league generation
components/       UI kit, charts, player cards, data provider, app shell
```
