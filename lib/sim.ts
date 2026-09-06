import { db } from "./db";
import { gauss, id, now, round, rng } from "./ids";
import { leagueRosterMap, optimizeLineup, parseRosterPositions, startingSlots } from "./lineup";
import { projectionsForWeek, rosPpg } from "./projections";
import type { League, Player, Team } from "./types";

export interface TeamStrength {
  teamId: string;
  mean: number;
  sd: number;
  starters: string[];
  rosterStrength: number;
  positional: Record<string, number>;
}

export interface SimResult {
  teamId: string;
  playoffProb: number;
  champProb: number;
  byeProb: number;
  finalsProb: number;
  projWins: number;
  projPoints: number;
  avgSeed: number;
}

export interface MatchupRow {
  id: string;
  week: number;
  home_team_id: string;
  away_team_id: string;
  home_points: number | null;
  away_points: number | null;
  is_complete: number;
}

export function computeStrengths(
  league: League,
  teams: Team[],
  rosterMap?: Map<string, Player[]>
): Map<string, TeamStrength> {
  const slots = startingSlots(parseRosterPositions(league.roster_positions));
  const rosters = rosterMap ?? (leagueRosterMap(league.id) as Map<string, Player[]>);
  const projs = projectionsForWeek(league.current_week);
  const out = new Map<string, TeamStrength>();

  for (const team of teams) {
    const players = (rosters.get(team.id) ?? []) as Player[];
    const pointsFor = (p: Player) => rosPpg(p, league.current_week, projs);
    const opt = optimizeLineup(slots, players, pointsFor);
    const starters = opt.assignments.map((a) => a.playerId).filter(Boolean) as string[];
    const mean = opt.total;
    const variance = starters.reduce((sum, pid) => {
      const proj = projs.get(pid);
      const sd = proj?.stdev ?? 4;
      return sum + sd * sd;
    }, 0);
    const sd = Math.max(12, Math.sqrt(variance));

    const positional: Record<string, number> = {};
    for (const pos of ["QB", "RB", "WR", "TE", "K", "DEF"]) {
      const group = players
        .filter((p) => p.position === pos)
        .map(pointsFor)
        .sort((a, b) => b - a);
      const take = pos === "QB" || pos === "TE" || pos === "K" || pos === "DEF" ? 1 : pos === "RB" ? 3 : 4;
      const top = group.slice(0, take);
      positional[pos] = round(top.reduce((a, b) => a + b, 0), 2);
    }

    out.set(team.id, {
      teamId: team.id,
      mean: round(mean, 2),
      sd: round(sd, 2),
      starters,
      rosterStrength: round(mean, 2),
      positional,
    });
  }
  return out;
}

export function getMatchups(leagueId: string): MatchupRow[] {
  return db
    .prepare(`SELECT * FROM matchups WHERE league_id = ? ORDER BY week, rowid`)
    .all(leagueId) as MatchupRow[];
}

/**
 * Monte-Carlo the rest of the regular season plus the playoff bracket.
 * This is the objective function the AI GM maximises.
 */
export function simulateSeason(
  league: League,
  teams: Team[],
  strengths: Map<string, TeamStrength>,
  matchups: MatchupRow[],
  iterations = 1500,
  seed = "sim"
): Map<string, SimResult> {
  const next = rng(`${seed}:${league.id}:${league.current_week}`);
  const teamIds = teams.map((t) => t.id);
  const baseWins = new Map(teams.map((t) => [t.id, t.wins + t.ties * 0.5]));
  const basePoints = new Map(teams.map((t) => [t.id, t.points_for]));
  const remaining = matchups.filter((m) => !m.is_complete && m.week <= league.regular_season_weeks);

  const playoffTeams = Math.min(league.playoff_teams, teams.length);
  const byes = playoffTeams === 6 ? 2 : playoffTeams === 4 ? 0 : playoffTeams % 2 === 0 ? 0 : 1;

  const counts = new Map(
    teamIds.map((tid) => [
      tid,
      { playoff: 0, champ: 0, bye: 0, finals: 0, wins: 0, points: 0, seed: 0 },
    ])
  );

  const sample = (tid: string) => {
    const s = strengths.get(tid);
    if (!s) return 90;
    return Math.max(35, gauss(next, s.mean, s.sd));
  };

  for (let iter = 0; iter < iterations; iter++) {
    const wins = new Map(baseWins);
    const points = new Map(basePoints);

    for (const m of remaining) {
      const hs = sample(m.home_team_id);
      const as = sample(m.away_team_id);
      points.set(m.home_team_id, (points.get(m.home_team_id) ?? 0) + hs);
      points.set(m.away_team_id, (points.get(m.away_team_id) ?? 0) + as);
      if (hs > as) wins.set(m.home_team_id, (wins.get(m.home_team_id) ?? 0) + 1);
      else if (as > hs) wins.set(m.away_team_id, (wins.get(m.away_team_id) ?? 0) + 1);
      else {
        wins.set(m.home_team_id, (wins.get(m.home_team_id) ?? 0) + 0.5);
        wins.set(m.away_team_id, (wins.get(m.away_team_id) ?? 0) + 0.5);
      }
    }

    const standings = [...teamIds].sort((a, b) => {
      const dw = (wins.get(b) ?? 0) - (wins.get(a) ?? 0);
      if (Math.abs(dw) > 1e-9) return dw;
      return (points.get(b) ?? 0) - (points.get(a) ?? 0);
    });

    standings.forEach((tid, idx) => {
      const c = counts.get(tid)!;
      c.wins += wins.get(tid) ?? 0;
      c.points += points.get(tid) ?? 0;
      c.seed += idx + 1;
      if (idx < playoffTeams) c.playoff += 1;
      if (idx < byes) c.bye += 1;
    });

    // playoff bracket
    let field = standings.slice(0, playoffTeams);
    if (byes > 0) {
      const byeTeams = field.slice(0, byes);
      let round1 = field.slice(byes);
      const winners: string[] = [];
      while (round1.length > 1) {
        const hi = round1.shift()!;
        const lo = round1.pop()!;
        winners.push(sample(hi) >= sample(lo) ? hi : lo);
      }
      if (round1.length === 1) winners.push(round1[0]);
      field = [...byeTeams, ...winners].sort(
        (a, b) => standings.indexOf(a) - standings.indexOf(b)
      );
    }

    while (field.length > 1) {
      const nextRound: string[] = [];
      const pool = [...field];
      while (pool.length > 1) {
        const hi = pool.shift()!;
        const lo = pool.pop()!;
        nextRound.push(sample(hi) >= sample(lo) ? hi : lo);
      }
      if (pool.length === 1) nextRound.push(pool[0]);
      if (nextRound.length === 2) {
        counts.get(nextRound[0])!.finals += 1;
        counts.get(nextRound[1])!.finals += 1;
      }
      field = nextRound.sort((a, b) => standings.indexOf(a) - standings.indexOf(b));
    }
    if (field.length === 1) counts.get(field[0])!.champ += 1;
  }

  const results = new Map<string, SimResult>();
  for (const tid of teamIds) {
    const c = counts.get(tid)!;
    results.set(tid, {
      teamId: tid,
      playoffProb: round((c.playoff / iterations) * 100, 2),
      champProb: round((c.champ / iterations) * 100, 2),
      byeProb: round((c.bye / iterations) * 100, 2),
      finalsProb: round((c.finals / iterations) * 100, 2),
      projWins: round(c.wins / iterations, 2),
      projPoints: round(c.points / iterations, 1),
      avgSeed: round(c.seed / iterations, 2),
    });
  }
  return results;
}

export function persistSim(
  league: League,
  results: Map<string, SimResult>,
  strengths: Map<string, TeamStrength>,
  iterations: number
) {
  const ts = now();
  const insert = db.prepare(`
    INSERT INTO sim_snapshots (id, league_id, team_id, week, playoff_prob, champ_prob, bye_prob, proj_wins, proj_points, roster_strength, iterations, created_at)
    VALUES (?,?,?,?,?,?,?,?,?,?,?,?)
  `);
  const updateTeam = db.prepare(
    `UPDATE teams SET playoff_prob = ?, champ_prob = ?, power_score = ? WHERE id = ?`
  );
  const run = db.transaction(() => {
    for (const [teamId, r] of results) {
      const s = strengths.get(teamId);
      insert.run(
        id("sim"),
        league.id,
        teamId,
        league.current_week,
        r.playoffProb,
        r.champProb,
        r.byeProb,
        r.projWins,
        r.projPoints,
        s?.rosterStrength ?? 0,
        iterations,
        ts
      );
      updateTeam.run(r.playoffProb, r.champProb, s?.rosterStrength ?? 0, teamId);
    }
    // keep the history table bounded
    db.prepare(
      `DELETE FROM sim_snapshots WHERE league_id = ? AND created_at < ?`
    ).run(league.id, ts - 1000 * 60 * 60 * 24 * 3);
  });
  run();
}

/** Evaluate a hypothetical roster change for one or two teams. */
export function simulateWhatIf(
  league: League,
  teams: Team[],
  baseRosters: Map<string, Player[]>,
  overrides: Map<string, Player[]>,
  matchups: MatchupRow[],
  iterations = 700
): Map<string, SimResult> {
  const merged = new Map(baseRosters);
  for (const [teamId, players] of overrides) merged.set(teamId, players);
  const strengths = computeStrengths(league, teams, merged);
  return simulateSeason(league, teams, strengths, matchups, iterations, "whatif");
}
