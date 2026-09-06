import { db } from "./db";
import { round } from "./ids";
import { leagueRosterMap, optimizeLineup, parseRosterPositions, slotLabel, startingSlots } from "./lineup";
import { projectionsForWeek, rosPpg, SEASON, valuesForLeague } from "./projections";
import { computeStrengths, getMatchups } from "./sim";
import { getSettings } from "./agent";
import type {
  AIDecision,
  ActivityEntry,
  League,
  Notification,
  Player,
  PlayerCard,
  Team,
} from "./types";

export function getLeagues(userId: string): League[] {
  return db.prepare(`SELECT * FROM leagues WHERE user_id = ? ORDER BY created_at DESC`).all(userId) as League[];
}

export function getActiveLeague(userId: string): League | undefined {
  return (
    (db.prepare(`SELECT * FROM leagues WHERE user_id = ? AND is_active = 1`).get(userId) as League | undefined) ??
    (db.prepare(`SELECT * FROM leagues WHERE user_id = ? ORDER BY created_at DESC LIMIT 1`).get(userId) as League | undefined)
  );
}

export function getLeague(userId: string, leagueId?: string | null): League | undefined {
  if (leagueId) {
    return db.prepare(`SELECT * FROM leagues WHERE id = ? AND user_id = ?`).get(leagueId, userId) as League | undefined;
  }
  return getActiveLeague(userId);
}

export function getTeams(leagueId: string): Team[] {
  return db
    .prepare(`SELECT * FROM teams WHERE league_id = ? ORDER BY wins DESC, points_for DESC`)
    .all(leagueId) as Team[];
}

export function getMyTeam(leagueId: string): Team | undefined {
  return db.prepare(`SELECT * FROM teams WHERE league_id = ? AND is_user_team = 1`).get(leagueId) as Team | undefined;
}

export function enrichPlayers(players: (Player & { slot_status?: string })[], leagueId: string, week: number): PlayerCard[] {
  const projs = projectionsForWeek(week);
  const values = valuesForLeague(leagueId);
  const ownership = new Map(
    (
      db
        .prepare(
          `SELECT r.player_id, r.team_id, t.name AS team_name, t.owner_name, t.is_user_team
           FROM rosters r JOIN teams t ON t.id = r.team_id WHERE r.league_id = ?`
        )
        .all(leagueId) as any[]
    ).map((r) => [r.player_id, r])
  );

  return players.map((p) => {
    const proj = projs.get(p.id);
    const v = values.get(p.id);
    const own = ownership.get(p.id);
    return {
      ...p,
      team_id: own?.team_id ?? null,
      team_name: own?.team_name ?? null,
      owner_name: own?.owner_name ?? null,
      is_user_player: !!own?.is_user_team,
      is_free_agent: !own,
      model_pts: proj?.model_pts ?? 0,
      book_pts: proj?.book_pts ?? 0,
      sleeper_pts: proj?.sleeper_pts ?? 0,
      consensus_pts: proj?.consensus_pts ?? 0,
      floor_pts: proj?.floor_pts ?? 0,
      ceiling_pts: proj?.ceiling_pts ?? 0,
      opponent: proj?.opponent ?? null,
      matchup_rating: proj?.matchup_rating ?? 50,
      discrepancy: v?.discrepancy ?? round((proj?.book_pts ?? 0) - (proj?.sleeper_pts ?? 0), 2),
      value: v?.value ?? 0,
      prev_value: v?.prev_value ?? 0,
      trend_7d: v?.trend_7d ?? 0,
      tier: v?.tier ?? 6,
      market_signal: v?.market_signal ?? "hold",
      ros_ppg: rosPpg(p, week, projs),
    } as PlayerCard & { ros_ppg: number };
  });
}

export function getRoster(leagueId: string, teamId: string, week: number): PlayerCard[] {
  const rows = db
    .prepare(
      `SELECT p.*, r.slot_status, r.acquired_via, r.acquired_at FROM rosters r
       JOIN players p ON p.id = r.player_id WHERE r.league_id = ? AND r.team_id = ?`
    )
    .all(leagueId, teamId) as any[];
  return enrichPlayers(rows, leagueId, week).sort((a, b) => b.model_pts - a.model_pts);
}

export function getLineupForWeek(league: League, teamId: string, week: number) {
  const rows = db
    .prepare(`SELECT * FROM lineups WHERE team_id = ? AND week = ? ORDER BY slot_index`)
    .all(teamId, week) as any[];
  const roster = getRoster(league.id, teamId, week);
  const byId = new Map(roster.map((p) => [p.id, p]));
  const slots = startingSlots(parseRosterPositions(league.roster_positions));

  const filled = slots.map((slot, index) => {
    const row = rows.find((r) => r.slot === slot && r.slot_index === index);
    const player = row?.player_id ? byId.get(row.player_id) ?? null : null;
    return { slot, slotLabel: slotLabel(slot), slotIndex: index, player, setBy: row?.set_by ?? "user" };
  });
  const startingIds = new Set(filled.map((f) => f.player?.id).filter(Boolean));
  const bench = roster.filter((p) => !startingIds.has(p.id));

  const projs = projectionsForWeek(week);
  const pointsFor = (p: Player) => {
    const proj = projs.get(p.id);
    if (!proj || proj.is_bye) return 0;
    if (p.injury_status === "OUT" || p.injury_status === "IR") return 0;
    return proj.model_pts;
  };
  const optimal = optimizeLineup(slots, roster as unknown as Player[], pointsFor);
  const currentTotal = round(filled.reduce((s, f) => s + (f.player ? pointsFor(f.player as unknown as Player) : 0), 0), 2);

  return {
    slots: filled,
    bench,
    currentTotal,
    optimalTotal: optimal.total,
    gain: round(optimal.total - currentTotal, 2),
    optimal: optimal.assignments.map((a) => ({
      slot: a.slot,
      slotLabel: slotLabel(a.slot),
      slotIndex: a.slotIndex,
      playerId: a.playerId,
      points: a.points,
      player: a.playerId ? byId.get(a.playerId) ?? null : null,
    })),
  };
}

export function getSimHistory(leagueId: string, teamId: string, limit = 40) {
  const rows = db
    .prepare(
      `SELECT champ_prob, playoff_prob, proj_wins, created_at FROM sim_snapshots
       WHERE league_id = ? AND team_id = ? ORDER BY created_at DESC LIMIT ?`
    )
    .all(leagueId, teamId, limit) as any[];
  return rows.reverse();
}

export function getDecisions(leagueId: string, limit = 30, type?: string): AIDecision[] {
  if (type && type !== "all") {
    return db
      .prepare(`SELECT * FROM ai_decisions WHERE league_id = ? AND type = ? ORDER BY created_at DESC LIMIT ?`)
      .all(leagueId, type, limit) as AIDecision[];
  }
  return db
    .prepare(`SELECT * FROM ai_decisions WHERE league_id = ? ORDER BY created_at DESC LIMIT ?`)
    .all(leagueId, limit) as AIDecision[];
}

export function getActivity(leagueId: string, limit = 60, kind?: string): ActivityEntry[] {
  if (kind && kind !== "all") {
    return db
      .prepare(`SELECT * FROM activity_log WHERE league_id = ? AND kind LIKE ? ORDER BY created_at DESC LIMIT ?`)
      .all(leagueId, `%${kind}%`, limit) as ActivityEntry[];
  }
  return db
    .prepare(`SELECT * FROM activity_log WHERE league_id = ? ORDER BY created_at DESC LIMIT ?`)
    .all(leagueId, limit) as ActivityEntry[];
}

export function getNotifications(userId: string, limit = 25): Notification[] {
  return db
    .prepare(`SELECT * FROM notifications WHERE user_id = ? ORDER BY created_at DESC LIMIT ?`)
    .all(userId, limit) as Notification[];
}

export function expandTrades(leagueId: string, week: number, status?: string) {
  const rows = (
    status && status !== "all"
      ? (db
          .prepare(`SELECT * FROM trades WHERE league_id = ? AND status = ? ORDER BY created_at DESC LIMIT 60`)
          .all(leagueId, status) as any[])
      : (db.prepare(`SELECT * FROM trades WHERE league_id = ? ORDER BY created_at DESC LIMIT 60`).all(leagueId) as any[])
  );
  const teams = new Map(getTeams(leagueId).map((t) => [t.id, t]));
  const allPlayerIds = new Set<string>();
  for (const t of rows) {
    for (const pid of JSON.parse(t.send_player_ids)) allPlayerIds.add(pid);
    for (const pid of JSON.parse(t.receive_player_ids)) allPlayerIds.add(pid);
  }
  const players = allPlayerIds.size
    ? (db
        .prepare(`SELECT * FROM players WHERE id IN (${[...allPlayerIds].map(() => "?").join(",")})`)
        .all(...allPlayerIds) as Player[])
    : [];
  const cards = new Map(enrichPlayers(players, leagueId, week).map((p) => [p.id, p]));

  return rows.map((t) => ({
    ...t,
    rationale: JSON.parse(t.rationale || "[]") as string[],
    fromTeam: teams.get(t.from_team_id) ?? null,
    toTeam: teams.get(t.to_team_id) ?? null,
    send: (JSON.parse(t.send_player_ids) as string[]).map((pid) => cards.get(pid)).filter(Boolean),
    receive: (JSON.parse(t.receive_player_ids) as string[]).map((pid) => cards.get(pid)).filter(Boolean),
  }));
}

export function expandClaims(leagueId: string, week: number, status?: string) {
  const rows = (
    status && status !== "all"
      ? (db
          .prepare(`SELECT * FROM waiver_claims WHERE league_id = ? AND status = ? ORDER BY created_at DESC LIMIT 60`)
          .all(leagueId, status) as any[])
      : (db.prepare(`SELECT * FROM waiver_claims WHERE league_id = ? ORDER BY created_at DESC LIMIT 60`).all(leagueId) as any[])
  );
  const ids = new Set<string>();
  for (const c of rows) {
    ids.add(c.add_player_id);
    if (c.drop_player_id) ids.add(c.drop_player_id);
  }
  const players = ids.size
    ? (db.prepare(`SELECT * FROM players WHERE id IN (${[...ids].map(() => "?").join(",")})`).all(...ids) as Player[])
    : [];
  const cards = new Map(enrichPlayers(players, leagueId, week).map((p) => [p.id, p]));
  const teams = new Map(getTeams(leagueId).map((t) => [t.id, t]));
  return rows.map((c) => ({
    ...c,
    rationale: JSON.parse(c.rationale || "[]") as string[],
    addPlayer: cards.get(c.add_player_id) ?? null,
    dropPlayer: c.drop_player_id ? cards.get(c.drop_player_id) ?? null : null,
    team: teams.get(c.team_id) ?? null,
  }));
}

export function getLeagueAnalysis(league: League) {
  const teams = getTeams(league.id);
  const rosters = leagueRosterMap(league.id) as Map<string, Player[]>;
  const strengths = computeStrengths(league, teams, rosters);
  const matchups = getMatchups(league.id);
  const week = league.current_week;
  const projs = projectionsForWeek(week);

  const rows = teams.map((t) => {
    const s = strengths.get(t.id);
    const players = rosters.get(t.id) ?? [];
    const starters = new Set(s?.starters ?? []);
    const bench = players.filter((p) => !starters.has(p.id));
    const benchStrength = round(
      bench.reduce((sum, p) => sum + rosPpg(p, week, projs), 0) / Math.max(1, bench.length),
      2
    );
    const injuries = players.filter((p) => p.injury_status).length;
    return {
      team: t,
      rosterStrength: s?.rosterStrength ?? 0,
      sd: s?.sd ?? 0,
      positional: s?.positional ?? {},
      benchStrength,
      injuries,
      faabLeft: t.faab_budget - t.faab_spent,
      record: `${t.wins}-${t.losses}${t.ties ? `-${t.ties}` : ""}`,
    };
  });

  const positions = ["QB", "RB", "WR", "TE", "K", "DEF"];
  const leagueAvg: Record<string, number> = {};
  for (const pos of positions) {
    leagueAvg[pos] = round(
      rows.reduce((s, r) => s + (r.positional[pos] ?? 0), 0) / Math.max(1, rows.length),
      2
    );
  }

  const upcoming = matchups
    .filter((m) => m.week === week)
    .map((m) => ({
      ...m,
      home: teams.find((t) => t.id === m.home_team_id) ?? null,
      away: teams.find((t) => t.id === m.away_team_id) ?? null,
      homeProj: strengths.get(m.home_team_id)?.mean ?? 0,
      awayProj: strengths.get(m.away_team_id)?.mean ?? 0,
    }));

  return { rows: rows.sort((a, b) => b.rosterStrength - a.rosterStrength), leagueAvg, upcoming, positions };
}

export function getMarket(
  leagueId: string,
  week: number,
  opts: { position?: string; availability?: string; search?: string; sort?: string; limit?: number } = {}
) {
  const clauses: string[] = [];
  const params: any[] = [];
  if (opts.position && opts.position !== "ALL") {
    clauses.push(`p.position = ?`);
    params.push(opts.position);
  }
  if (opts.search) {
    clauses.push(`p.name LIKE ?`);
    params.push(`%${opts.search}%`);
  }
  const where = clauses.length ? `WHERE ${clauses.join(" AND ")}` : "";
  const rows = db.prepare(`SELECT p.* FROM players p ${where}`).all(...params) as Player[];
  let cards = enrichPlayers(rows, leagueId, week);

  if (opts.availability === "free_agent") cards = cards.filter((c) => c.is_free_agent);
  else if (opts.availability === "mine") cards = cards.filter((c) => c.is_user_player);
  else if (opts.availability === "rostered") cards = cards.filter((c) => !c.is_free_agent);
  else if (opts.availability === "buy_low") cards = cards.filter((c) => c.market_signal === "buy_low");
  else if (opts.availability === "sell_high") cards = cards.filter((c) => c.market_signal === "sell_high");

  const sort = opts.sort ?? "value";
  cards.sort((a, b) => {
    switch (sort) {
      case "discrepancy":
        return Math.abs(b.discrepancy) - Math.abs(a.discrepancy);
      case "book":
        return b.book_pts - a.book_pts;
      case "trend":
        return b.trend_7d - a.trend_7d;
      case "projection":
        return b.model_pts - a.model_pts;
      default:
        return b.value - a.value;
    }
  });
  return cards.slice(0, opts.limit ?? 80);
}

export function getSnapshot(userId: string, leagueId?: string | null) {
  const league = getLeague(userId, leagueId);
  if (!league) return null;
  const teams = getTeams(league.id);
  const myTeam = teams.find((t) => t.is_user_team) ?? teams[0];
  const settings = getSettings(league.id);
  const week = league.current_week;

  const roster = myTeam ? getRoster(league.id, myTeam.id, week) : [];
  const lineup = myTeam ? getLineupForWeek(league, myTeam.id, week) : null;
  const simHistory = myTeam ? getSimHistory(league.id, myTeam.id, 30) : [];
  const decisions = getDecisions(league.id, 12);
  const activity = getActivity(league.id, 15);
  const notifications = getNotifications(userId, 12);

  const startersPts = lineup?.currentTotal ?? 0;
  const bookPts = round(
    (lineup?.slots ?? []).reduce((s, x) => s + (x.player?.book_pts ?? 0), 0),
    2
  );
  const sleeperPts = round(
    (lineup?.slots ?? []).reduce((s, x) => s + (x.player?.sleeper_pts ?? 0), 0),
    2
  );

  const pendingTrades = db
    .prepare(`SELECT COUNT(*) AS c FROM trades WHERE league_id = ? AND status IN ('proposed','pending_approval')`)
    .get(league.id) as { c: number };
  const pendingClaims = db
    .prepare(`SELECT COUNT(*) AS c FROM waiver_claims WHERE league_id = ? AND status = 'pending'`)
    .get(league.id) as { c: number };
  const unread = db
    .prepare(`SELECT COUNT(*) AS c FROM notifications WHERE user_id = ? AND is_read = 0`)
    .get(userId) as { c: number };

  const matchup = db
    .prepare(
      `SELECT * FROM matchups WHERE league_id = ? AND week = ? AND (home_team_id = ? OR away_team_id = ?)`
    )
    .get(league.id, week, myTeam?.id ?? "", myTeam?.id ?? "") as any;
  const opponentTeam = matchup
    ? teams.find((t) => t.id === (matchup.home_team_id === myTeam?.id ? matchup.away_team_id : matchup.home_team_id))
    : null;

  const discrepancies = roster
    .filter((p) => Math.abs(p.discrepancy) > 0.8)
    .sort((a, b) => Math.abs(b.discrepancy) - Math.abs(a.discrepancy))
    .slice(0, 5);

  return {
    league,
    settings,
    teams,
    myTeam,
    roster,
    lineup,
    simHistory,
    decisions: decisions.map(withParsedDecision),
    activity,
    notifications,
    unreadCount: unread.c,
    pendingTrades: pendingTrades.c,
    pendingClaims: pendingClaims.c,
    opponentTeam,
    matchup,
    discrepancies,
    totals: {
      projectedPpg: startersPts,
      bookPpg: bookPts,
      sleeperPpg: sleeperPts,
      season: SEASON,
    },
  };
}

export function withParsedDecision(d: AIDecision) {
  return {
    ...d,
    rationale: safeParse<string[]>(d.rationale, []),
    inputs: safeParse<Record<string, unknown>>(d.inputs, {}),
  };
}

export function safeParse<T>(raw: string, fallback: T): T {
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}
