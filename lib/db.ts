import Database from "better-sqlite3";
import fs from "node:fs";
import path from "node:path";

const DATA_DIR = process.env.GM_DATA_DIR || path.join(process.cwd(), "data");
const DB_PATH = path.join(DATA_DIR, "gridiron.db");

function createDb() {
  fs.mkdirSync(DATA_DIR, { recursive: true });
  const db = new Database(DB_PATH);
  db.pragma("journal_mode = WAL");
  db.pragma("foreign_keys = ON");
  migrate(db);
  return db;
}

function migrate(db: Database.Database) {
  db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    email TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    password_hash TEXT NOT NULL,
    created_at INTEGER NOT NULL
  );

  CREATE TABLE IF NOT EXISTS sessions (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at INTEGER NOT NULL,
    expires_at INTEGER NOT NULL
  );

  CREATE TABLE IF NOT EXISTS sleeper_accounts (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    username TEXT NOT NULL,
    display_name TEXT,
    sleeper_user_id TEXT NOT NULL,
    avatar TEXT,
    source TEXT NOT NULL DEFAULT 'simulated',
    connected_at INTEGER NOT NULL,
    last_sync_at INTEGER
  );

  CREATE TABLE IF NOT EXISTS leagues (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    sleeper_league_id TEXT NOT NULL,
    name TEXT NOT NULL,
    season TEXT NOT NULL,
    sport TEXT NOT NULL DEFAULT 'nfl',
    status TEXT NOT NULL DEFAULT 'in_season',
    scoring_type TEXT NOT NULL DEFAULT 'ppr',
    total_rosters INTEGER NOT NULL DEFAULT 12,
    roster_positions TEXT NOT NULL,
    playoff_teams INTEGER NOT NULL DEFAULT 6,
    playoff_week_start INTEGER NOT NULL DEFAULT 15,
    current_week INTEGER NOT NULL DEFAULT 1,
    regular_season_weeks INTEGER NOT NULL DEFAULT 14,
    waiver_type TEXT NOT NULL DEFAULT 'faab',
    faab_budget INTEGER NOT NULL DEFAULT 100,
    source TEXT NOT NULL DEFAULT 'simulated',
    is_active INTEGER NOT NULL DEFAULT 0,
    avatar TEXT,
    created_at INTEGER NOT NULL,
    synced_at INTEGER
  );

  CREATE TABLE IF NOT EXISTS teams (
    id TEXT PRIMARY KEY,
    league_id TEXT NOT NULL REFERENCES leagues(id) ON DELETE CASCADE,
    sleeper_roster_id TEXT,
    sleeper_owner_id TEXT,
    name TEXT NOT NULL,
    owner_name TEXT NOT NULL,
    avatar TEXT,
    is_user_team INTEGER NOT NULL DEFAULT 0,
    wins INTEGER NOT NULL DEFAULT 0,
    losses INTEGER NOT NULL DEFAULT 0,
    ties INTEGER NOT NULL DEFAULT 0,
    points_for REAL NOT NULL DEFAULT 0,
    points_against REAL NOT NULL DEFAULT 0,
    faab_budget INTEGER NOT NULL DEFAULT 100,
    faab_spent INTEGER NOT NULL DEFAULT 0,
    waiver_position INTEGER NOT NULL DEFAULT 1,
    gm_persona TEXT NOT NULL DEFAULT 'balanced',
    playoff_prob REAL NOT NULL DEFAULT 0,
    champ_prob REAL NOT NULL DEFAULT 0,
    power_score REAL NOT NULL DEFAULT 0,
    created_at INTEGER NOT NULL
  );

  CREATE TABLE IF NOT EXISTS players (
    id TEXT PRIMARY KEY,
    sleeper_player_id TEXT UNIQUE,
    name TEXT NOT NULL,
    position TEXT NOT NULL,
    nfl_team TEXT NOT NULL,
    age INTEGER,
    years_exp INTEGER,
    jersey INTEGER,
    status TEXT NOT NULL DEFAULT 'Active',
    injury_status TEXT,
    injury_note TEXT,
    bye_week INTEGER NOT NULL DEFAULT 0,
    depth_chart_order INTEGER NOT NULL DEFAULT 1,
    adp REAL NOT NULL DEFAULT 200,
    consensus_rank INTEGER NOT NULL DEFAULT 300,
    snap_pct REAL NOT NULL DEFAULT 0,
    target_share REAL NOT NULL DEFAULT 0,
    route_pct REAL NOT NULL DEFAULT 0,
    touches_pg REAL NOT NULL DEFAULT 0,
    targets_pg REAL NOT NULL DEFAULT 0,
    red_zone_share REAL NOT NULL DEFAULT 0,
    sleeper_ppg REAL NOT NULL DEFAULT 0,
    season_ppg REAL NOT NULL DEFAULT 0,
    last3_ppg REAL NOT NULL DEFAULT 0,
    is_custom INTEGER NOT NULL DEFAULT 0,
    updated_at INTEGER NOT NULL
  );

  CREATE TABLE IF NOT EXISTS rosters (
    id TEXT PRIMARY KEY,
    league_id TEXT NOT NULL REFERENCES leagues(id) ON DELETE CASCADE,
    team_id TEXT NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
    player_id TEXT NOT NULL REFERENCES players(id) ON DELETE CASCADE,
    slot_status TEXT NOT NULL DEFAULT 'bench',
    acquired_via TEXT NOT NULL DEFAULT 'draft',
    acquired_at INTEGER NOT NULL,
    UNIQUE(league_id, player_id)
  );

  CREATE TABLE IF NOT EXISTS lineups (
    id TEXT PRIMARY KEY,
    league_id TEXT NOT NULL REFERENCES leagues(id) ON DELETE CASCADE,
    team_id TEXT NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
    week INTEGER NOT NULL,
    slot TEXT NOT NULL,
    slot_index INTEGER NOT NULL,
    player_id TEXT REFERENCES players(id) ON DELETE CASCADE,
    locked INTEGER NOT NULL DEFAULT 0,
    set_by TEXT NOT NULL DEFAULT 'user',
    updated_at INTEGER NOT NULL,
    UNIQUE(team_id, week, slot, slot_index)
  );

  CREATE TABLE IF NOT EXISTS projections (
    id TEXT PRIMARY KEY,
    player_id TEXT NOT NULL REFERENCES players(id) ON DELETE CASCADE,
    week INTEGER NOT NULL,
    season TEXT NOT NULL,
    opponent TEXT,
    book_pts REAL NOT NULL DEFAULT 0,
    sleeper_pts REAL NOT NULL DEFAULT 0,
    consensus_pts REAL NOT NULL DEFAULT 0,
    model_pts REAL NOT NULL DEFAULT 0,
    floor_pts REAL NOT NULL DEFAULT 0,
    ceiling_pts REAL NOT NULL DEFAULT 0,
    stdev REAL NOT NULL DEFAULT 4,
    matchup_rating REAL NOT NULL DEFAULT 50,
    dvoa_rank INTEGER NOT NULL DEFAULT 16,
    is_bye INTEGER NOT NULL DEFAULT 0,
    updated_at INTEGER NOT NULL,
    UNIQUE(player_id, week, season)
  );

  CREATE TABLE IF NOT EXISTS player_props (
    id TEXT PRIMARY KEY,
    player_id TEXT NOT NULL REFERENCES players(id) ON DELETE CASCADE,
    week INTEGER NOT NULL,
    book TEXT NOT NULL DEFAULT 'FanDuel',
    market TEXT NOT NULL,
    line REAL NOT NULL,
    over_odds INTEGER NOT NULL,
    under_odds INTEGER NOT NULL,
    implied_value REAL NOT NULL,
    fantasy_pts REAL NOT NULL DEFAULT 0,
    line_move REAL NOT NULL DEFAULT 0,
    updated_at INTEGER NOT NULL,
    UNIQUE(player_id, week, book, market)
  );

  CREATE TABLE IF NOT EXISTS player_values (
    id TEXT PRIMARY KEY,
    league_id TEXT NOT NULL REFERENCES leagues(id) ON DELETE CASCADE,
    player_id TEXT NOT NULL REFERENCES players(id) ON DELETE CASCADE,
    value REAL NOT NULL DEFAULT 0,
    prev_value REAL NOT NULL DEFAULT 0,
    trend_7d REAL NOT NULL DEFAULT 0,
    tier INTEGER NOT NULL DEFAULT 5,
    market_signal TEXT NOT NULL DEFAULT 'hold',
    discrepancy REAL NOT NULL DEFAULT 0,
    confidence REAL NOT NULL DEFAULT 0.5,
    updated_at INTEGER NOT NULL,
    UNIQUE(league_id, player_id)
  );

  CREATE TABLE IF NOT EXISTS matchups (
    id TEXT PRIMARY KEY,
    league_id TEXT NOT NULL REFERENCES leagues(id) ON DELETE CASCADE,
    week INTEGER NOT NULL,
    home_team_id TEXT NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
    away_team_id TEXT NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
    home_points REAL,
    away_points REAL,
    is_complete INTEGER NOT NULL DEFAULT 0,
    is_playoff INTEGER NOT NULL DEFAULT 0
  );

  CREATE TABLE IF NOT EXISTS trades (
    id TEXT PRIMARY KEY,
    league_id TEXT NOT NULL REFERENCES leagues(id) ON DELETE CASCADE,
    from_team_id TEXT NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
    to_team_id TEXT NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
    send_player_ids TEXT NOT NULL,
    receive_player_ids TEXT NOT NULL,
    faab_included INTEGER NOT NULL DEFAULT 0,
    status TEXT NOT NULL DEFAULT 'draft',
    origin TEXT NOT NULL DEFAULT 'ai',
    value_delta REAL NOT NULL DEFAULT 0,
    ppg_delta REAL NOT NULL DEFAULT 0,
    champ_delta REAL NOT NULL DEFAULT 0,
    playoff_delta REAL NOT NULL DEFAULT 0,
    partner_value_delta REAL NOT NULL DEFAULT 0,
    acceptance_prob REAL NOT NULL DEFAULT 0,
    confidence REAL NOT NULL DEFAULT 0,
    risk_score REAL NOT NULL DEFAULT 0,
    headline TEXT NOT NULL DEFAULT '',
    rationale TEXT NOT NULL DEFAULT '[]',
    response_note TEXT,
    created_at INTEGER NOT NULL,
    sent_at INTEGER,
    resolved_at INTEGER,
    expires_at INTEGER
  );

  CREATE TABLE IF NOT EXISTS waiver_claims (
    id TEXT PRIMARY KEY,
    league_id TEXT NOT NULL REFERENCES leagues(id) ON DELETE CASCADE,
    team_id TEXT NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
    add_player_id TEXT NOT NULL REFERENCES players(id) ON DELETE CASCADE,
    drop_player_id TEXT REFERENCES players(id) ON DELETE SET NULL,
    bid INTEGER NOT NULL DEFAULT 0,
    max_bid INTEGER NOT NULL DEFAULT 0,
    priority INTEGER NOT NULL DEFAULT 1,
    status TEXT NOT NULL DEFAULT 'pending',
    origin TEXT NOT NULL DEFAULT 'ai',
    ppg_delta REAL NOT NULL DEFAULT 0,
    champ_delta REAL NOT NULL DEFAULT 0,
    confidence REAL NOT NULL DEFAULT 0,
    headline TEXT NOT NULL DEFAULT '',
    rationale TEXT NOT NULL DEFAULT '[]',
    result_note TEXT,
    created_at INTEGER NOT NULL,
    process_at INTEGER NOT NULL,
    resolved_at INTEGER
  );

  CREATE TABLE IF NOT EXISTS ai_settings (
    league_id TEXT PRIMARY KEY REFERENCES leagues(id) ON DELETE CASCADE,
    autonomous_mode INTEGER NOT NULL DEFAULT 1,
    require_trade_approval INTEGER NOT NULL DEFAULT 1,
    waiver_automation INTEGER NOT NULL DEFAULT 1,
    lineup_automation INTEGER NOT NULL DEFAULT 1,
    news_monitoring INTEGER NOT NULL DEFAULT 1,
    risk_tolerance REAL NOT NULL DEFAULT 0.5,
    aggressiveness REAL NOT NULL DEFAULT 0.5,
    max_daily_transactions INTEGER NOT NULL DEFAULT 4,
    min_champ_improvement REAL NOT NULL DEFAULT 0.5,
    max_faab_pct INTEGER NOT NULL DEFAULT 35,
    book_weight REAL NOT NULL DEFAULT 0.55,
    consensus_weight REAL NOT NULL DEFAULT 0.25,
    sleeper_weight REAL NOT NULL DEFAULT 0.20,
    scan_interval_sec INTEGER NOT NULL DEFAULT 30,
    protected_player_ids TEXT NOT NULL DEFAULT '[]',
    strategy TEXT NOT NULL DEFAULT 'win_now',
    paused_until INTEGER,
    last_run_at INTEGER,
    updated_at INTEGER NOT NULL
  );

  CREATE TABLE IF NOT EXISTS ai_decisions (
    id TEXT PRIMARY KEY,
    league_id TEXT NOT NULL REFERENCES leagues(id) ON DELETE CASCADE,
    cycle_id TEXT,
    type TEXT NOT NULL,
    action TEXT NOT NULL,
    status TEXT NOT NULL,
    title TEXT NOT NULL,
    summary TEXT NOT NULL,
    rationale TEXT NOT NULL DEFAULT '[]',
    inputs TEXT NOT NULL DEFAULT '{}',
    confidence REAL NOT NULL DEFAULT 0,
    ppg_delta REAL NOT NULL DEFAULT 0,
    champ_delta REAL NOT NULL DEFAULT 0,
    related_type TEXT,
    related_id TEXT,
    created_at INTEGER NOT NULL
  );

  CREATE TABLE IF NOT EXISTS activity_log (
    id TEXT PRIMARY KEY,
    league_id TEXT NOT NULL REFERENCES leagues(id) ON DELETE CASCADE,
    kind TEXT NOT NULL,
    actor TEXT NOT NULL DEFAULT 'ai',
    message TEXT NOT NULL,
    detail TEXT,
    meta TEXT NOT NULL DEFAULT '{}',
    created_at INTEGER NOT NULL
  );

  CREATE TABLE IF NOT EXISTS news_items (
    id TEXT PRIMARY KEY,
    league_id TEXT REFERENCES leagues(id) ON DELETE CASCADE,
    player_id TEXT REFERENCES players(id) ON DELETE CASCADE,
    headline TEXT NOT NULL,
    body TEXT NOT NULL,
    source TEXT NOT NULL,
    category TEXT NOT NULL,
    severity TEXT NOT NULL DEFAULT 'info',
    value_delta REAL NOT NULL DEFAULT 0,
    projection_delta REAL NOT NULL DEFAULT 0,
    processed INTEGER NOT NULL DEFAULT 0,
    ai_take TEXT,
    published_at INTEGER NOT NULL
  );

  CREATE TABLE IF NOT EXISTS sim_snapshots (
    id TEXT PRIMARY KEY,
    league_id TEXT NOT NULL REFERENCES leagues(id) ON DELETE CASCADE,
    team_id TEXT NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
    week INTEGER NOT NULL,
    playoff_prob REAL NOT NULL,
    champ_prob REAL NOT NULL,
    bye_prob REAL NOT NULL DEFAULT 0,
    proj_wins REAL NOT NULL DEFAULT 0,
    proj_points REAL NOT NULL DEFAULT 0,
    roster_strength REAL NOT NULL DEFAULT 0,
    iterations INTEGER NOT NULL DEFAULT 0,
    created_at INTEGER NOT NULL
  );

  CREATE TABLE IF NOT EXISTS notifications (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    league_id TEXT REFERENCES leagues(id) ON DELETE CASCADE,
    type TEXT NOT NULL,
    title TEXT NOT NULL,
    body TEXT NOT NULL,
    link TEXT,
    is_read INTEGER NOT NULL DEFAULT 0,
    created_at INTEGER NOT NULL
  );

  CREATE INDEX IF NOT EXISTS idx_rosters_team ON rosters(team_id);
  CREATE INDEX IF NOT EXISTS idx_rosters_league ON rosters(league_id);
  CREATE INDEX IF NOT EXISTS idx_proj_week ON projections(week);
  CREATE INDEX IF NOT EXISTS idx_props_player_week ON player_props(player_id, week);
  CREATE INDEX IF NOT EXISTS idx_decisions_league ON ai_decisions(league_id, created_at DESC);
  CREATE INDEX IF NOT EXISTS idx_activity_league ON activity_log(league_id, created_at DESC);
  CREATE INDEX IF NOT EXISTS idx_news_pub ON news_items(published_at DESC);
  CREATE INDEX IF NOT EXISTS idx_trades_league ON trades(league_id, created_at DESC);
  CREATE INDEX IF NOT EXISTS idx_claims_league ON waiver_claims(league_id, created_at DESC);
  CREATE INDEX IF NOT EXISTS idx_values_league ON player_values(league_id);
  CREATE INDEX IF NOT EXISTS idx_sim_league ON sim_snapshots(league_id, created_at DESC);
  `);
}

declare global {
  // eslint-disable-next-line no-var
  var __gm_db: Database.Database | undefined;
}

export const db: Database.Database = globalThis.__gm_db ?? createDb();
if (process.env.NODE_ENV !== "production") globalThis.__gm_db = db;

export function tx<T>(fn: () => T): T {
  const run = db.transaction(fn);
  return run();
}
