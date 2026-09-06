import { db, tx } from "./db";
import { clamp, gauss, hash32, id, now, pick, rng, round } from "./ids";
import {
  BYE_WEEKS,
  PLAYER_SEEDS,
  TEAM_NAMES,
  jerseyFor,
  playerAge,
  playerExp,
  usageProfile,
} from "./nfl-data";
import { seasonBaseline } from "./props";
import { refreshPlayerValues, refreshProjections, SEASON } from "./projections";
import { computeStrengths, getMatchups, persistSim, simulateSeason } from "./sim";
import { leagueRosterMap, optimizeLineup, parseRosterPositions, startingSlots } from "./lineup";
import type { League, Player, Team } from "./types";

export const DEFAULT_ROSTER_POSITIONS = [
  "QB", "RB", "RB", "WR", "WR", "WR", "TE", "FLEX", "K", "DEF",
  "BN", "BN", "BN", "BN", "BN",
];

const INJURY_POOL: { status: string; note: string; weight: number }[] = [
  { status: "QUESTIONABLE", note: "Limited in Wednesday practice (hamstring)", weight: 5 },
  { status: "QUESTIONABLE", note: "Ankle — trending toward playing", weight: 4 },
  { status: "DOUBTFUL", note: "Missed back-to-back practices (knee)", weight: 2 },
  { status: "OUT", note: "Ruled out — concussion protocol", weight: 2 },
  { status: "IR", note: "Placed on IR, eligible to return week 12", weight: 1 },
];

/** Create (or top up) the global NFL player universe. */
export function ensurePlayerPool(): number {
  const existing = db.prepare(`SELECT COUNT(*) AS c FROM players`).get() as { c: number };
  if (existing.c >= PLAYER_SEEDS.length) return existing.c;

  const insert = db.prepare(`
    INSERT INTO players (id, sleeper_player_id, name, position, nfl_team, age, years_exp, jersey, status,
      injury_status, injury_note, bye_week, depth_chart_order, adp, consensus_rank, snap_pct, target_share,
      route_pct, touches_pg, targets_pg, red_zone_share, sleeper_ppg, season_ppg, last3_ppg, is_custom, updated_at)
    VALUES (@id, @sleeper_player_id, @name, @position, @nfl_team, @age, @years_exp, @jersey, @status,
      @injury_status, @injury_note, @bye_week, @depth_chart_order, @adp, @consensus_rank, @snap_pct, @target_share,
      @route_pct, @touches_pg, @targets_pg, @red_zone_share, @sleeper_ppg, @season_ppg, @last3_ppg, 0, @updated_at)
    ON CONFLICT(sleeper_player_id) DO NOTHING
  `);

  const ts = now();
  const sorted = [...PLAYER_SEEDS].sort((a, b) => a[3] - b[3]);

  tx(() => {
    sorted.forEach((seed, index) => {
      const [name, pos, team, adp, depth] = seed;
      const usage = usageProfile(seed);
      const { seasonPpg, last3 } = seasonBaseline({
        name,
        position: pos,
        nfl_team: team,
        adp,
        depth_chart_order: depth,
        bye_week: BYE_WEEKS[team] ?? 0,
      });
      const r = rng(`injury:${name}`);
      let injury: { status: string; note: string } | null = null;
      if (r() < 0.11) {
        const roll = r() * 14;
        let acc = 0;
        for (const opt of INJURY_POOL) {
          acc += opt.weight;
          if (roll <= acc) {
            injury = { status: opt.status, note: opt.note };
            break;
          }
        }
      }
      insert.run({
        id: id("plr"),
        sleeper_player_id: `sp_${hash32(name).toString(36)}`,
        name,
        position: pos,
        nfl_team: team,
        age: playerAge(name, pos),
        years_exp: playerExp(name),
        jersey: jerseyFor(name),
        status: injury?.status === "IR" ? "Inactive" : "Active",
        injury_status: injury?.status ?? null,
        injury_note: injury?.note ?? null,
        bye_week: BYE_WEEKS[team] ?? 0,
        depth_chart_order: depth,
        adp,
        consensus_rank: index + 1,
        snap_pct: round(usage.snapPct, 1),
        target_share: round(usage.targetShare, 1),
        route_pct: round(usage.routePct, 1),
        touches_pg: round(usage.touchesPg, 1),
        targets_pg: round(usage.targetsPg, 1),
        red_zone_share: round(usage.redZoneShare, 1),
        sleeper_ppg: round(seasonPpg * 0.98, 2),
        season_ppg: seasonPpg,
        last3_ppg: last3,
        updated_at: ts,
      });
    });
  });

  return (db.prepare(`SELECT COUNT(*) AS c FROM players`).get() as { c: number }).c;
}

const TEAM_NAME_POOL: [string, string][] = [
  ["Gridiron Ghosts", "Marcus Webb"],
  ["Route Tree Rebels", "Danielle Cruz"],
  ["Play Action Padres", "Owen Bradley"],
  ["Red Zone Rhinos", "Priya Raman"],
  ["Sunday Scaries", "Tyler Nguyen"],
  ["Fourth & Chaos", "Jordan Fields"],
  ["Cover 2 Cowboys", "Alexis Moore"],
  ["Snap Count Snipers", "Devin Okafor"],
  ["Target Share Titans", "Hannah Boyle"],
  ["Two Minute Warning", "Chris Alvarez"],
  ["Prevent Defense", "Sam Whitfield"],
  ["Bootleg Bandits", "Riley Chen"],
  ["Hurry Up Offense", "Nina Petrov"],
  ["Pylon Pushers", "Ben Kowalski"],
];

const PERSONAS = ["analytics", "win_now", "rebuilder", "homer", "sharp", "casual"];

export interface CreateLeagueOptions {
  userId: string;
  name?: string;
  teamName?: string;
  ownerName?: string;
  totalRosters?: number;
  scoringType?: string;
  currentWeek?: number;
  sleeperLeagueId?: string;
  source?: "live" | "simulated";
  seasonSeed?: string;
}

/** Build a complete, realistic mid-season league: teams, draft, schedule, results. */
export function createSimulatedLeague(opts: CreateLeagueOptions): League {
  ensurePlayerPool();
  const seedKey = opts.seasonSeed ?? id("seed");
  const r = rng(seedKey);
  const totalRosters = opts.totalRosters ?? 12;
  const currentWeek = opts.currentWeek ?? 7;
  const leagueId = id("lg");
  const ts = now();

  const league: League = {
    id: leagueId,
    user_id: opts.userId,
    sleeper_league_id: opts.sleeperLeagueId ?? `${9_000_000_000_000_000 + Math.floor(r() * 8_999_999)}`,
    name: opts.name ?? "Dynasty of Dysfunction",
    season: SEASON,
    sport: "nfl",
    status: "in_season",
    scoring_type: opts.scoringType ?? "ppr",
    total_rosters: totalRosters,
    roster_positions: JSON.stringify(DEFAULT_ROSTER_POSITIONS),
    playoff_teams: 6,
    playoff_week_start: 15,
    current_week: currentWeek,
    regular_season_weeks: 14,
    waiver_type: "faab",
    faab_budget: 100,
    source: opts.source ?? "simulated",
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
    db.prepare(`UPDATE leagues SET is_active = 0 WHERE user_id = ? AND id != ?`).run(opts.userId, leagueId);
  });

  // ---- teams ----
  const teams: Team[] = [];
  const pool = [...TEAM_NAME_POOL];
  for (let i = 0; i < totalRosters; i++) {
    const isUser = i === 0;
    const [defaultName, defaultOwner] = isUser
      ? [opts.teamName ?? "Autonomous FC", opts.ownerName ?? "You"]
      : pool.splice(Math.floor(r() * pool.length), 1)[0];
    const team: Team = {
      id: id("tm"),
      league_id: leagueId,
      sleeper_roster_id: `${i + 1}`,
      sleeper_owner_id: `so_${hash32(defaultName + leagueId).toString(36)}`,
      name: defaultName,
      owner_name: defaultOwner,
      avatar: null,
      is_user_team: isUser ? 1 : 0,
      wins: 0,
      losses: 0,
      ties: 0,
      points_for: 0,
      points_against: 0,
      faab_budget: 100,
      faab_spent: 0,
      waiver_position: i + 1,
      gm_persona: isUser ? "autonomous" : PERSONAS[Math.floor(r() * PERSONAS.length)],
      playoff_prob: 0,
      champ_prob: 0,
      power_score: 0,
      created_at: ts,
    };
    teams.push(team);
  }

  tx(() => {
    const stmt = db.prepare(
      `INSERT INTO teams (id, league_id, sleeper_roster_id, sleeper_owner_id, name, owner_name, avatar, is_user_team,
        wins, losses, ties, points_for, points_against, faab_budget, faab_spent, waiver_position, gm_persona,
        playoff_prob, champ_prob, power_score, created_at)
       VALUES (@id, @league_id, @sleeper_roster_id, @sleeper_owner_id, @name, @owner_name, @avatar, @is_user_team,
        @wins, @losses, @ties, @points_for, @points_against, @faab_budget, @faab_spent, @waiver_position, @gm_persona,
        @playoff_prob, @champ_prob, @power_score, @created_at)`
    );
    for (const t of teams) stmt.run(t);
  });

  // ---- draft ----
  draftRosters(league, teams, r);

  // ---- schedule + completed weeks ----
  buildSchedule(league, teams, r);

  // projections must exist before we can simulate results
  refreshProjections(weeksToProject(league));
  simulateCompletedWeeks(league, teams, r);
  refreshPlayerValues(leagueId, currentWeek);
  autoSetLineups(league, "seed");

  // ---- AI settings ----
  db.prepare(
    `INSERT INTO ai_settings (league_id, updated_at) VALUES (?, ?)
     ON CONFLICT(league_id) DO NOTHING`
  ).run(leagueId, ts);

  seedHistory(league, teams, r);

  const freshLeague = db.prepare(`SELECT * FROM leagues WHERE id = ?`).get(leagueId) as League;
  const freshTeams = db.prepare(`SELECT * FROM teams WHERE league_id = ?`).all(leagueId) as Team[];
  const strengths = computeStrengths(freshLeague, freshTeams);
  const results = simulateSeason(freshLeague, freshTeams, strengths, getMatchups(leagueId), 1200);
  persistSim(freshLeague, results, strengths, 1200);
  seedSimHistory(freshLeague, freshTeams, results, r);

  return freshLeague;
}

export function weeksToProject(league: League): number[] {
  const w = league.current_week;
  return [w, w + 1, w + 2].filter((x) => x >= 1 && x <= 18);
}

function draftRosters(league: League, teams: Team[], r: () => number) {
  const players = db
    .prepare(`SELECT * FROM players ORDER BY adp ASC`)
    .all() as Player[];
  const rosterSize = parseRosterPositions(league.roster_positions).length;
  const needs = new Map<string, Record<string, number>>();
  for (const t of teams) needs.set(t.id, { QB: 2, RB: 5, WR: 6, TE: 2, K: 1, DEF: 1 });

  const available = [...players];
  const picks = new Map<string, Player[]>(teams.map((t) => [t.id, []]));
  const insert = db.prepare(
    `INSERT INTO rosters (id, league_id, team_id, player_id, slot_status, acquired_via, acquired_at)
     VALUES (?,?,?,?,?,?,?)`
  );

  tx(() => {
    for (let round_ = 0; round_ < rosterSize; round_++) {
      const order = round_ % 2 === 0 ? teams : [...teams].reverse();
      for (const team of order) {
        const need = needs.get(team.id)!;
        const roster = picks.get(team.id)!;
        const remainingPicks = rosterSize - roster.length;
        // mandatory starting slots that are still unfilled
        const mandatory: Record<string, number> = { QB: 1, RB: 2, WR: 3, TE: 1, K: 1, DEF: 1 };
        const missing = Object.entries(mandatory)
          .filter(([pos, n]) => roster.filter((x) => x.position === pos).length < n)
          .map(([pos]) => pos);
        // once the clock forces it, only draft the positions we still must fill
        const forced = remainingPicks <= missing.length;
        const window = forced
          ? missing.flatMap((pos) => available.filter((p) => p.position === pos).slice(0, 3))
          : available.slice(0, 16);
        let best: Player | null = null;
        let bestScore = -Infinity;
        for (const p of window) {
          const posCount = roster.filter((x) => x.position === p.position).length;
          const maxAt: Record<string, number> = { QB: 2, RB: 6, WR: 7, TE: 2, K: 1, DEF: 1 };
          if (posCount >= (maxAt[p.position] ?? 5)) continue;
          const remaining = rosterSize - roster.length;
          const urgency = need[p.position] > 0 ? 1 : 0.55;
          const lateK = (p.position === "K" || p.position === "DEF") && remaining > 3 ? 0.25 : 1;
          const score = (250 - p.adp) * urgency * lateK * (0.88 + r() * 0.24);
          if (score > bestScore) {
            bestScore = score;
            best = p;
          }
        }
        if (!best) best = available[0];
        available.splice(available.indexOf(best), 1);
        roster.push(best);
        need[best.position] = Math.max(0, (need[best.position] ?? 0) - 1);
        insert.run(
          id("ros"),
          league.id,
          team.id,
          best.id,
          "bench",
          "draft",
          now() - 1000 * 60 * 60 * 24 * 70
        );
      }
    }
  });
}

function buildSchedule(league: League, teams: Team[], r: () => number) {
  const ids = teams.map((t) => t.id);
  const n = ids.length;
  const rotation = ids.slice(1);
  const insert = db.prepare(
    `INSERT INTO matchups (id, league_id, week, home_team_id, away_team_id, home_points, away_points, is_complete, is_playoff)
     VALUES (?,?,?,?,?,?,?,?,?)`
  );
  tx(() => {
    for (let week = 1; week <= league.regular_season_weeks; week++) {
      const order = [ids[0], ...rotation];
      for (let i = 0; i < n / 2; i++) {
        const home = order[i];
        const away = order[n - 1 - i];
        insert.run(id("mu"), league.id, week, home, away, null, null, 0, 0);
      }
      rotation.unshift(rotation.pop() as string);
    }
  });
}

function simulateCompletedWeeks(league: League, teams: Team[], r: () => number) {
  const rosters = leagueRosterMap(league.id) as Map<string, Player[]>;
  const strengths = computeStrengths(league, teams, rosters);
  const matchups = getMatchups(league.id).filter((m) => m.week < league.current_week);
  const records = new Map(teams.map((t) => [t.id, { w: 0, l: 0, t: 0, pf: 0, pa: 0 }]));

  tx(() => {
    const update = db.prepare(
      `UPDATE matchups SET home_points = ?, away_points = ?, is_complete = 1 WHERE id = ?`
    );
    for (const m of matchups) {
      const homeUser = teams.find((t) => t.id === m.home_team_id)?.is_user_team ? 5 : 0;
      const awayUser = teams.find((t) => t.id === m.away_team_id)?.is_user_team ? 5 : 0;
      const hs = Math.max(52, gauss(r, (strengths.get(m.home_team_id)?.mean ?? 105) + homeUser, strengths.get(m.home_team_id)?.sd ?? 22));
      const as = Math.max(52, gauss(r, (strengths.get(m.away_team_id)?.mean ?? 105) + awayUser, strengths.get(m.away_team_id)?.sd ?? 22));
      const h = round(hs, 2);
      const a = round(as, 2);
      update.run(h, a, m.id);
      const hr = records.get(m.home_team_id)!;
      const ar = records.get(m.away_team_id)!;
      hr.pf += h; hr.pa += a; ar.pf += a; ar.pa += h;
      if (h > a) { hr.w++; ar.l++; } else if (a > h) { ar.w++; hr.l++; } else { hr.t++; ar.t++; }
    }
    const upd = db.prepare(
      `UPDATE teams SET wins = ?, losses = ?, ties = ?, points_for = ?, points_against = ?, faab_spent = ? WHERE id = ?`
    );
    for (const t of teams) {
      const rec = records.get(t.id)!;
      const spent = t.is_user_team ? Math.floor(r() * 22) : Math.floor(r() * 55);
      upd.run(rec.w, rec.l, rec.t, round(rec.pf, 2), round(rec.pa, 2), spent, t.id);
    }
  });
}

/** Write optimal lineups for every team for the current week. */
export function autoSetLineups(league: League, setBy = "ai"): void {
  const teams = db.prepare(`SELECT * FROM teams WHERE league_id = ?`).all(league.id) as Team[];
  const slots = startingSlots(parseRosterPositions(league.roster_positions));
  const rosters = leagueRosterMap(league.id) as Map<string, Player[]>;
  const projs = new Map(
    (db.prepare(`SELECT * FROM projections WHERE week = ? AND season = ?`).all(league.current_week, SEASON) as any[]).map(
      (p) => [p.player_id, p]
    )
  );
  const pointsFor = (p: Player) => {
    const proj = projs.get(p.id);
    if (!proj || proj.is_bye) return 0;
    if (p.injury_status === "OUT" || p.injury_status === "IR") return 0;
    return proj.model_pts;
  };

  const upsert = db.prepare(`
    INSERT INTO lineups (id, league_id, team_id, week, slot, slot_index, player_id, locked, set_by, updated_at)
    VALUES (?,?,?,?,?,?,?,0,?,?)
    ON CONFLICT(team_id, week, slot, slot_index) DO UPDATE SET player_id = excluded.player_id, set_by = excluded.set_by, updated_at = excluded.updated_at
  `);
  const updateSlot = db.prepare(`UPDATE rosters SET slot_status = ? WHERE team_id = ? AND player_id = ?`);

  tx(() => {
    for (const team of teams) {
      const players = rosters.get(team.id) ?? [];
      const result = optimizeLineup(slots, players, pointsFor);
      const startingIds = new Set(result.assignments.map((a) => a.playerId).filter(Boolean) as string[]);
      for (const a of result.assignments) {
        upsert.run(id("ln"), league.id, team.id, league.current_week, a.slot, a.slotIndex, a.playerId, setBy, now());
      }
      for (const p of players) {
        updateSlot.run(startingIds.has(p.id) ? "starter" : "bench", team.id, p.id);
      }
    }
  });
}

const NEWS_TEMPLATES = [
  {
    category: "injury",
    severity: "major" as const,
    headline: (n: string, t: string) => `${n} (${t}) exits with a lower-body injury`,
    body: (n: string) => `${n} was evaluated on the sideline and did not return. The staff called it day-to-day pending imaging. Expect a Wednesday practice report to set the tone for the week.`,
  },
  {
    category: "usage",
    severity: "moderate" as const,
    headline: (n: string, t: string) => `${n} logs a season-high snap share for ${t}`,
    body: (n: string) => `${n} played on 84% of offensive snaps and ran a route on 79% of dropbacks — a clear signal that the coaching staff is expanding the role.`,
  },
  {
    category: "depth_chart",
    severity: "moderate" as const,
    headline: (n: string, t: string) => `${t} elevate ${n} on the depth chart`,
    body: (n: string) => `Coaches confirmed ${n} will see first-team reps this week. Sportsbooks reacted immediately, moving his receiving props up.`,
  },
  {
    category: "market",
    severity: "info" as const,
    headline: (n: string) => `Sharp money moves ${n}'s yardage line`,
    body: (n: string) => `${n}'s primary yardage prop moved on early limit bets. The book-implied projection now sits meaningfully above the consensus fantasy projection.`,
  },
  {
    category: "practice",
    severity: "info" as const,
    headline: (n: string) => `${n} full participant in practice`,
    body: (n: string) => `${n} handled a full workload with no limitations and is expected to carry a normal role on Sunday.`,
  },
];

function seedHistory(league: League, teams: Team[], r: () => number) {
  const players = db.prepare(`SELECT * FROM players ORDER BY adp LIMIT 90`).all() as Player[];
  const ts = now();

  const insertNews = db.prepare(
    `INSERT INTO news_items (id, league_id, player_id, headline, body, source, category, severity, value_delta, projection_delta, processed, ai_take, published_at)
     VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)`
  );
  const insertActivity = db.prepare(
    `INSERT INTO activity_log (id, league_id, kind, actor, message, detail, meta, created_at) VALUES (?,?,?,?,?,?,?,?)`
  );

  tx(() => {
    for (let i = 0; i < 14; i++) {
      const p = pick(r, players);
      const tpl = pick(r, NEWS_TEMPLATES);
      const delta = round((r() - 0.42) * 6, 2);
      insertNews.run(
        id("nws"),
        league.id,
        p.id,
        tpl.headline(p.name, TEAM_NAMES[p.nfl_team] ?? p.nfl_team),
        tpl.body(p.name),
        pick(r, ["FanDuel Feed", "Field Level Media", "Beat Report", "NFL Wire", "Practice Report"]),
        tpl.category,
        tpl.severity,
        delta,
        round(delta * 0.4, 2),
        1,
        delta > 0
          ? `Book-implied projection ticked up ${Math.abs(delta * 0.4).toFixed(1)} pts. Flagged as a buy window before consensus catches up.`
          : `Projection trimmed ${Math.abs(delta * 0.4).toFixed(1)} pts. Monitoring practice participation before any roster action.`,
        ts - Math.floor(r() * 1000 * 60 * 60 * 60)
      );
    }

    const others = teams.filter((t) => !t.is_user_team);
    for (let i = 0; i < 16; i++) {
      const t = pick(r, others);
      const p = pick(r, players);
      const kind = pick(r, ["waiver", "trade", "lineup", "drop"]);
      const messages: Record<string, string> = {
        waiver: `${t.name} won ${p.name} on waivers for $${Math.floor(r() * 30) + 1}`,
        trade: `${t.name} completed a 2-for-1 trade with a division rival`,
        lineup: `${t.name} started ${p.name} over their projected optimal play`,
        drop: `${t.name} dropped a bench asset to open a roster spot`,
      };
      insertActivity.run(
        id("act"),
        league.id,
        `league_${kind}`,
        "league",
        messages[kind],
        null,
        JSON.stringify({ team_id: t.id, player_id: p.id }),
        ts - Math.floor(r() * 1000 * 60 * 60 * 96)
      );
    }
  });
}

function seedSimHistory(
  league: League,
  teams: Team[],
  results: Map<string, { champProb: number; playoffProb: number; projWins: number; projPoints: number }>,
  r: () => number
) {
  const userTeam = teams.find((t) => t.is_user_team);
  if (!userTeam) return;
  const current = results.get(userTeam.id);
  if (!current) return;
  const insert = db.prepare(
    `INSERT INTO sim_snapshots (id, league_id, team_id, week, playoff_prob, champ_prob, bye_prob, proj_wins, proj_points, roster_strength, iterations, created_at)
     VALUES (?,?,?,?,?,?,?,?,?,?,?,?)`
  );
  tx(() => {
    for (let i = 20; i >= 1; i--) {
      const drift = (r() - 0.5) * 2.4 * i * 0.35;
      insert.run(
        id("sim"),
        league.id,
        userTeam.id,
        Math.max(1, league.current_week - Math.floor(i / 3)),
        clamp(current.playoffProb - drift * 1.4, 1, 99),
        clamp(current.champProb - drift, 0.4, 80),
        0,
        Math.max(0, current.projWins - drift * 0.08),
        current.projPoints,
        0,
        1200,
        now() - i * 1000 * 60 * 60 * 6
      );
    }
  });
}

export { NEWS_TEMPLATES };
