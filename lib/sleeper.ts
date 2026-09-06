import { db, tx } from "./db";
import { hash32, id, now, rng, round } from "./ids";
import { BYE_WEEKS } from "./nfl-data";
import { createSimulatedLeague, DEFAULT_ROSTER_POSITIONS, ensurePlayerPool } from "./seed";
import { SEASON } from "./projections";
import type { League, SleeperAccount } from "./types";

const SLEEPER_BASE = "https://api.sleeper.app/v1";
const TIMEOUT_MS = 4500;

export interface SleeperUserResult {
  sleeperUserId: string;
  username: string;
  displayName: string;
  avatar: string | null;
  source: "live" | "simulated";
  note?: string;
}

export interface SleeperLeagueSummary {
  league_id: string;
  name: string;
  season: string;
  total_rosters: number;
  scoring_settings?: Record<string, number>;
  roster_positions?: string[];
  status?: string;
  settings?: Record<string, number>;
  source: "live" | "simulated";
}

async function sleeperFetch<T>(path: string): Promise<T | null> {
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
    const res = await fetch(`${SLEEPER_BASE}${path}`, {
      signal: controller.signal,
      headers: { accept: "application/json" },
      cache: "no-store",
    });
    clearTimeout(timer);
    if (!res.ok) return null;
    return (await res.json()) as T;
  } catch {
    return null;
  }
}

export async function sleeperReachable(): Promise<boolean> {
  const state = await sleeperFetch<{ week: number }>("/state/nfl");
  return !!state;
}

/** Look up a Sleeper account. Falls back to a deterministic simulated account offline. */
export async function lookupSleeperUser(username: string): Promise<SleeperUserResult> {
  const clean = username.trim().replace(/^@/, "");
  const live = await sleeperFetch<{ user_id: string; username: string; display_name: string; avatar: string | null }>(
    `/user/${encodeURIComponent(clean)}`
  );
  if (live?.user_id) {
    return {
      sleeperUserId: live.user_id,
      username: live.username ?? clean,
      displayName: live.display_name ?? clean,
      avatar: live.avatar,
      source: "live",
    };
  }
  return {
    sleeperUserId: `sim_${hash32(clean.toLowerCase()).toString(36)}`,
    username: clean,
    displayName: clean,
    avatar: null,
    source: "simulated",
    note: "Sleeper API unreachable from this environment — connected in simulation mode with a full synthetic league feed.",
  };
}

const SIM_LEAGUE_NAMES = [
  "Dynasty of Dysfunction",
  "The Sunday Syndicate",
  "Bookmakers Beware",
  "Alpha Ceiling League",
  "The Expected Points Club",
];

export async function listSleeperLeagues(
  sleeperUserId: string,
  season = SEASON
): Promise<SleeperLeagueSummary[]> {
  const live = await sleeperFetch<any[]>(`/user/${sleeperUserId}/leagues/nfl/${season}`);
  if (live && Array.isArray(live) && live.length) {
    return live.map((l) => ({
      league_id: l.league_id,
      name: l.name,
      season: l.season,
      total_rosters: l.total_rosters ?? 12,
      scoring_settings: l.scoring_settings,
      roster_positions: l.roster_positions,
      status: l.status,
      settings: l.settings,
      source: "live" as const,
    }));
  }
  const r = rng(`leagues:${sleeperUserId}`);
  const count = 2 + Math.floor(r() * 2);
  return Array.from({ length: count }).map((_, i) => ({
    league_id: `${9_100_000_000_000_000 + Math.floor(r() * 8_999_999_999)}`,
    name: SIM_LEAGUE_NAMES[(hash32(sleeperUserId) + i) % SIM_LEAGUE_NAMES.length],
    season,
    total_rosters: i === 0 ? 12 : 10 + Math.floor(r() * 3),
    roster_positions: DEFAULT_ROSTER_POSITIONS,
    status: "in_season",
    source: "simulated" as const,
  }));
}

export function saveSleeperAccount(userId: string, result: SleeperUserResult): SleeperAccount {
  const existing = db
    .prepare(`SELECT * FROM sleeper_accounts WHERE user_id = ?`)
    .get(userId) as SleeperAccount | undefined;
  const ts = now();
  if (existing) {
    db.prepare(
      `UPDATE sleeper_accounts SET username = ?, display_name = ?, sleeper_user_id = ?, avatar = ?, source = ?, last_sync_at = ? WHERE id = ?`
    ).run(result.username, result.displayName, result.sleeperUserId, result.avatar, result.source, ts, existing.id);
    return db.prepare(`SELECT * FROM sleeper_accounts WHERE id = ?`).get(existing.id) as SleeperAccount;
  }
  const account: SleeperAccount = {
    id: id("slp"),
    user_id: userId,
    username: result.username,
    display_name: result.displayName,
    sleeper_user_id: result.sleeperUserId,
    avatar: result.avatar,
    source: result.source,
    connected_at: ts,
    last_sync_at: ts,
  };
  db.prepare(
    `INSERT INTO sleeper_accounts (id, user_id, username, display_name, sleeper_user_id, avatar, source, connected_at, last_sync_at)
     VALUES (@id, @user_id, @username, @display_name, @sleeper_user_id, @avatar, @source, @connected_at, @last_sync_at)`
  ).run(account);
  return account;
}

export function getSleeperAccount(userId: string): SleeperAccount | undefined {
  return db.prepare(`SELECT * FROM sleeper_accounts WHERE user_id = ?`).get(userId) as SleeperAccount | undefined;
}

/** Import a league. Live payloads are mapped onto the local model; otherwise we synthesise. */
export async function importSleeperLeague(
  userId: string,
  account: SleeperAccount,
  summary: SleeperLeagueSummary,
  opts: { teamName?: string; currentWeek?: number } = {}
): Promise<League> {
  ensurePlayerPool();
  const already = db
    .prepare(`SELECT * FROM leagues WHERE user_id = ? AND sleeper_league_id = ?`)
    .get(userId, summary.league_id) as League | undefined;
  if (already) return already;

  if (summary.source === "live") {
    const [rosters, users, state] = await Promise.all([
      sleeperFetch<any[]>(`/league/${summary.league_id}/rosters`),
      sleeperFetch<any[]>(`/league/${summary.league_id}/users`),
      sleeperFetch<{ week: number }>(`/state/nfl`),
    ]);
    if (rosters && users) {
      return importLiveLeague(userId, account, summary, rosters, users, state?.week ?? 1);
    }
  }

  return createSimulatedLeague({
    userId,
    name: summary.name,
    teamName: opts.teamName ?? `${account.display_name || account.username}'s Team`,
    ownerName: account.display_name || account.username,
    totalRosters: summary.total_rosters,
    currentWeek: opts.currentWeek ?? 7,
    sleeperLeagueId: summary.league_id,
    source: "simulated",
    seasonSeed: `${summary.league_id}:${userId}`,
  });
}

function importLiveLeague(
  userId: string,
  account: SleeperAccount,
  summary: SleeperLeagueSummary,
  rosters: any[],
  users: any[],
  week: number
): League {
  const leagueId = id("lg");
  const ts = now();
  const league: League = {
    id: leagueId,
    user_id: userId,
    sleeper_league_id: summary.league_id,
    name: summary.name,
    season: summary.season,
    sport: "nfl",
    status: summary.status ?? "in_season",
    scoring_type: (summary.scoring_settings?.rec ?? 1) >= 1 ? "ppr" : (summary.scoring_settings?.rec ?? 0) > 0 ? "half_ppr" : "standard",
    total_rosters: summary.total_rosters,
    roster_positions: JSON.stringify(summary.roster_positions ?? DEFAULT_ROSTER_POSITIONS),
    playoff_teams: summary.settings?.playoff_teams ?? 6,
    playoff_week_start: summary.settings?.playoff_week_start ?? 15,
    current_week: Math.max(1, week),
    regular_season_weeks: (summary.settings?.playoff_week_start ?? 15) - 1,
    waiver_type: summary.settings?.waiver_type === 2 ? "faab" : "priority",
    faab_budget: summary.settings?.waiver_budget ?? 100,
    source: "live",
    is_active: 1,
    avatar: null,
    created_at: ts,
    synced_at: ts,
  };

  tx(() => {
    db.prepare(
      `INSERT INTO leagues (id, user_id, sleeper_league_id, name, season, sport, status, scoring_type, total_rosters,
        roster_positions, playoff_teams, playoff_week_start, current_week, regular_season_weeks, waiver_type,
        faab_budget, source, is_active, avatar, created_at, synced_at)
       VALUES (@id, @user_id, @sleeper_league_id, @name, @season, @sport, @status, @scoring_type, @total_rosters,
        @roster_positions, @playoff_teams, @playoff_week_start, @current_week, @regular_season_weeks, @waiver_type,
        @faab_budget, @source, @is_active, @avatar, @created_at, @synced_at)`
    ).run(league);
    db.prepare(`UPDATE leagues SET is_active = 0 WHERE user_id = ? AND id != ?`).run(userId, leagueId);

    const userById = new Map(users.map((u) => [u.user_id, u]));
    const insertTeam = db.prepare(
      `INSERT INTO teams (id, league_id, sleeper_roster_id, sleeper_owner_id, name, owner_name, avatar, is_user_team,
        wins, losses, ties, points_for, points_against, faab_budget, faab_spent, waiver_position, gm_persona,
        playoff_prob, champ_prob, power_score, created_at)
       VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,0,0,0,?)`
    );
    const insertRoster = db.prepare(
      `INSERT OR IGNORE INTO rosters (id, league_id, team_id, player_id, slot_status, acquired_via, acquired_at) VALUES (?,?,?,?,?,?,?)`
    );
    const findPlayer = db.prepare(`SELECT id FROM players WHERE sleeper_player_id = ?`);

    rosters.forEach((r, idx) => {
      const owner = userById.get(r.owner_id);
      const teamId = id("tm");
      insertTeam.run(
        teamId,
        leagueId,
        String(r.roster_id),
        r.owner_id ?? null,
        owner?.metadata?.team_name ?? owner?.display_name ?? `Team ${idx + 1}`,
        owner?.display_name ?? "Unknown",
        owner?.avatar ?? null,
        r.owner_id === account.sleeper_user_id ? 1 : 0,
        r.settings?.wins ?? 0,
        r.settings?.losses ?? 0,
        r.settings?.ties ?? 0,
        (r.settings?.fpts ?? 0) + (r.settings?.fpts_decimal ?? 0) / 100,
        (r.settings?.fpts_against ?? 0) + (r.settings?.fpts_against_decimal ?? 0) / 100,
        league.faab_budget,
        r.settings?.waiver_budget_used ?? 0,
        r.settings?.waiver_position ?? idx + 1,
        "unknown",
        ts
      );
      for (const pid of r.players ?? []) {
        const local = findPlayer.get(`sp_live_${pid}`) as { id: string } | undefined;
        if (local) {
          insertRoster.run(id("ros"), leagueId, teamId, local.id, "bench", "draft", ts);
        }
      }
    });

    db.prepare(`INSERT INTO ai_settings (league_id, updated_at) VALUES (?, ?) ON CONFLICT(league_id) DO NOTHING`).run(
      leagueId,
      ts
    );
  });

  return db.prepare(`SELECT * FROM leagues WHERE id = ?`).get(leagueId) as League;
}

export function byeWeekFor(team: string): number {
  return BYE_WEEKS[team] ?? 0;
}

export function syncLeagueTimestamp(leagueId: string) {
  db.prepare(`UPDATE leagues SET synced_at = ? WHERE id = ?`).run(now(), leagueId);
}

export function roundPts(v: number): number {
  return round(v, 2);
}
