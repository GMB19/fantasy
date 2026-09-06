export type Position = "QB" | "RB" | "WR" | "TE" | "K" | "DEF";

export interface User {
  id: string;
  email: string;
  name: string;
  created_at: number;
}

export interface SleeperAccount {
  id: string;
  user_id: string;
  username: string;
  display_name: string | null;
  sleeper_user_id: string;
  avatar: string | null;
  source: "live" | "simulated";
  connected_at: number;
  last_sync_at: number | null;
}

export interface League {
  id: string;
  user_id: string;
  sleeper_league_id: string;
  name: string;
  season: string;
  sport: string;
  status: string;
  scoring_type: string;
  total_rosters: number;
  roster_positions: string;
  playoff_teams: number;
  playoff_week_start: number;
  current_week: number;
  regular_season_weeks: number;
  waiver_type: string;
  faab_budget: number;
  source: "live" | "simulated";
  is_active: number;
  avatar: string | null;
  created_at: number;
  synced_at: number | null;
}

export interface Team {
  id: string;
  league_id: string;
  sleeper_roster_id: string | null;
  sleeper_owner_id: string | null;
  name: string;
  owner_name: string;
  avatar: string | null;
  is_user_team: number;
  wins: number;
  losses: number;
  ties: number;
  points_for: number;
  points_against: number;
  faab_budget: number;
  faab_spent: number;
  waiver_position: number;
  gm_persona: string;
  playoff_prob: number;
  champ_prob: number;
  power_score: number;
  created_at: number;
}

export interface Player {
  id: string;
  sleeper_player_id: string | null;
  name: string;
  position: Position;
  nfl_team: string;
  age: number | null;
  years_exp: number | null;
  jersey: number | null;
  status: string;
  injury_status: string | null;
  injury_note: string | null;
  bye_week: number;
  depth_chart_order: number;
  adp: number;
  consensus_rank: number;
  snap_pct: number;
  target_share: number;
  route_pct: number;
  touches_pg: number;
  targets_pg: number;
  red_zone_share: number;
  sleeper_ppg: number;
  season_ppg: number;
  last3_ppg: number;
  is_custom: number;
  updated_at: number;
}

export interface Projection {
  id: string;
  player_id: string;
  week: number;
  season: string;
  opponent: string | null;
  book_pts: number;
  sleeper_pts: number;
  consensus_pts: number;
  model_pts: number;
  floor_pts: number;
  ceiling_pts: number;
  stdev: number;
  matchup_rating: number;
  dvoa_rank: number;
  is_bye: number;
  updated_at: number;
}

export interface PlayerProp {
  id: string;
  player_id: string;
  week: number;
  book: string;
  market: string;
  line: number;
  over_odds: number;
  under_odds: number;
  implied_value: number;
  fantasy_pts: number;
  line_move: number;
  updated_at: number;
}

export interface PlayerValue {
  id: string;
  league_id: string;
  player_id: string;
  value: number;
  prev_value: number;
  trend_7d: number;
  tier: number;
  market_signal: "buy_low" | "sell_high" | "hold" | "rising" | "falling";
  discrepancy: number;
  confidence: number;
  updated_at: number;
}

export interface Trade {
  id: string;
  league_id: string;
  from_team_id: string;
  to_team_id: string;
  send_player_ids: string;
  receive_player_ids: string;
  faab_included: number;
  status: "draft" | "proposed" | "pending_approval" | "accepted" | "rejected" | "countered" | "expired" | "cancelled";
  origin: "ai" | "user" | "league";
  value_delta: number;
  ppg_delta: number;
  champ_delta: number;
  playoff_delta: number;
  partner_value_delta: number;
  acceptance_prob: number;
  confidence: number;
  risk_score: number;
  headline: string;
  rationale: string;
  response_note: string | null;
  created_at: number;
  sent_at: number | null;
  resolved_at: number | null;
  expires_at: number | null;
}

export interface WaiverClaim {
  id: string;
  league_id: string;
  team_id: string;
  add_player_id: string;
  drop_player_id: string | null;
  bid: number;
  max_bid: number;
  priority: number;
  status: "pending" | "queued" | "won" | "lost" | "cancelled" | "failed";
  origin: "ai" | "user";
  ppg_delta: number;
  champ_delta: number;
  confidence: number;
  headline: string;
  rationale: string;
  result_note: string | null;
  created_at: number;
  process_at: number;
  resolved_at: number | null;
}

export interface AISettings {
  league_id: string;
  autonomous_mode: number;
  require_trade_approval: number;
  waiver_automation: number;
  lineup_automation: number;
  news_monitoring: number;
  risk_tolerance: number;
  aggressiveness: number;
  max_daily_transactions: number;
  min_champ_improvement: number;
  max_faab_pct: number;
  book_weight: number;
  consensus_weight: number;
  sleeper_weight: number;
  scan_interval_sec: number;
  protected_player_ids: string;
  strategy: string;
  paused_until: number | null;
  last_run_at: number | null;
  updated_at: number;
}

export interface AIDecision {
  id: string;
  league_id: string;
  cycle_id: string | null;
  type: string;
  action: string;
  status: string;
  title: string;
  summary: string;
  rationale: string;
  inputs: string;
  confidence: number;
  ppg_delta: number;
  champ_delta: number;
  related_type: string | null;
  related_id: string | null;
  created_at: number;
}

export interface ActivityEntry {
  id: string;
  league_id: string;
  kind: string;
  actor: string;
  message: string;
  detail: string | null;
  meta: string;
  created_at: number;
}

export interface NewsItem {
  id: string;
  league_id: string | null;
  player_id: string | null;
  headline: string;
  body: string;
  source: string;
  category: string;
  severity: "info" | "moderate" | "major" | "critical";
  value_delta: number;
  projection_delta: number;
  processed: number;
  ai_take: string | null;
  published_at: number;
}

export interface SimSnapshot {
  id: string;
  league_id: string;
  team_id: string;
  week: number;
  playoff_prob: number;
  champ_prob: number;
  bye_prob: number;
  proj_wins: number;
  proj_points: number;
  roster_strength: number;
  iterations: number;
  created_at: number;
}

export interface Notification {
  id: string;
  user_id: string;
  league_id: string | null;
  type: string;
  title: string;
  body: string;
  link: string | null;
  is_read: number;
  created_at: number;
}

export interface LineupSlot {
  id: string;
  league_id: string;
  team_id: string;
  week: number;
  slot: string;
  slot_index: number;
  player_id: string | null;
  locked: number;
  set_by: string;
  updated_at: number;
}

/** Enriched player used across the UI */
export interface PlayerCard extends Player {
  team_id: string | null;
  team_name: string | null;
  owner_name: string | null;
  is_user_player: boolean;
  is_free_agent: boolean;
  model_pts: number;
  book_pts: number;
  sleeper_pts: number;
  consensus_pts: number;
  floor_pts: number;
  ceiling_pts: number;
  opponent: string | null;
  matchup_rating: number;
  discrepancy: number;
  value: number;
  prev_value: number;
  trend_7d: number;
  tier: number;
  market_signal: string;
  slot_status?: string;
}
