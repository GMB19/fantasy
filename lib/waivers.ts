import { db } from "./db";
import { clamp, id, now, round, rng } from "./ids";
import { leagueRosterMap, parseRosterPositions, startingSlots } from "./lineup";
import { projectionsForWeek, rosPpg, valuesForLeague } from "./projections";
import { computeStrengths, getMatchups, simulateSeason } from "./sim";
import { lineupTotal } from "./trades";
import type { AISettings, League, Player, Team } from "./types";

export interface WaiverTarget {
  player: Player;
  dropPlayer: Player | null;
  ppgDelta: number;
  champDelta: number;
  bid: number;
  maxBid: number;
  confidence: number;
  headline: string;
  rationale: string[];
  competitionRisk: number;
}

export function freeAgents(leagueId: string): Player[] {
  return db
    .prepare(
      `SELECT p.* FROM players p
       WHERE p.id NOT IN (SELECT player_id FROM rosters WHERE league_id = ?)`
    )
    .all(leagueId) as Player[];
}

/** Rank the waiver wire by lineup impact, then price a FAAB bid against rival demand. */
export function scanWaivers(
  league: League,
  settings: AISettings,
  opts: { limit?: number; simIterations?: number } = {}
): WaiverTarget[] {
  const teams = db.prepare(`SELECT * FROM teams WHERE league_id = ?`).all(league.id) as Team[];
  const myTeam = teams.find((t) => t.is_user_team);
  if (!myTeam) return [];

  const slots = startingSlots(parseRosterPositions(league.roster_positions));
  const rosterPositions = parseRosterPositions(league.roster_positions);
  const rosters = leagueRosterMap(league.id) as Map<string, Player[]>;
  const projs = projectionsForWeek(league.current_week);
  const values = valuesForLeague(league.id);
  const week = league.current_week;
  const myPlayers = rosters.get(myTeam.id) ?? [];
  const base = lineupTotal(slots, myPlayers, week, projs);
  const protectedIds: string[] = JSON.parse(settings.protected_player_ids || "[]");
  const rosterCap = rosterPositions.length;

  const pool = freeAgents(league.id)
    .map((p) => ({ p, ppg: rosPpg(p, week, projs) }))
    .sort((a, b) => b.ppg - a.ppg)
    .slice(0, 40);

  const dropCandidates = [...myPlayers]
    .filter((p) => !protectedIds.includes(p.id))
    .sort((a, b) => rosPpg(a, week, projs) - rosPpg(b, week, projs))
    .slice(0, 6);

  const targets: WaiverTarget[] = [];
  const remainingFaab = Math.max(0, myTeam.faab_budget - myTeam.faab_spent);
  const faabCap = Math.floor((remainingFaab * settings.max_faab_pct) / 100);

  for (const { p, ppg } of pool) {
    const needsDrop = myPlayers.length >= rosterCap;
    let bestDrop: Player | null = null;
    let bestAfter = -Infinity;

    if (!needsDrop) {
      bestAfter = lineupTotal(slots, [...myPlayers, p], week, projs);
    } else {
      for (const d of dropCandidates) {
        const after = lineupTotal(slots, [...myPlayers.filter((x) => x.id !== d.id), p], week, projs);
        if (after > bestAfter) {
          bestAfter = after;
          bestDrop = d;
        }
      }
    }
    const ppgDelta = round(bestAfter - base, 2);
    if (ppgDelta < 0.12) continue;

    const v = values.get(p.id);
    const proj = projs.get(p.id);
    const competition = clamp(
      (ppg / 14) * 0.6 + (v?.trend_7d ?? 0) * 0.05 + (v?.market_signal === "rising" ? 0.2 : 0),
      0.05,
      0.95
    );
    const aggression = 0.55 + settings.aggressiveness * 0.9;
    const rawBid = Math.ceil(ppgDelta * 5.2 * aggression + competition * 12 * aggression);
    const bid = clamp(rawBid, 1, Math.max(1, faabCap));
    const maxBid = clamp(Math.ceil(bid * 1.45), bid, Math.max(1, faabCap));

    const rationale: string[] = [];
    rationale.push(
      `Adds ${ppgDelta.toFixed(2)} PPG to the optimal starting lineup${bestDrop ? ` after dropping ${bestDrop.name} (${rosPpg(bestDrop, week, projs).toFixed(1)} ROS PPG)` : ""}.`
    );
    if (proj) {
      rationale.push(
        `Book-implied ${proj.book_pts.toFixed(1)} pts vs Sleeper ${proj.sleeper_pts.toFixed(1)} this week (${proj.opponent ? `vs ${proj.opponent}` : "bye"}, matchup rating ${proj.matchup_rating}/100).`
      );
    }
    if (p.snap_pct > 55) rationale.push(`Snap rate ${p.snap_pct.toFixed(0)}%, ${p.targets_pg.toFixed(1)} targets/gm, ${p.touches_pg.toFixed(1)} touches/gm.`);
    if (v?.market_signal === "rising") rationale.push(`Market value trending up ${v.trend_7d.toFixed(1)} pts over the last cycle — expect rival claims.`);
    rationale.push(`FAAB model: bid $${bid} of $${remainingFaab} remaining (cap ${settings.max_faab_pct}% per claim), walk-away at $${maxBid}.`);

    targets.push({
      player: p,
      dropPlayer: bestDrop,
      ppgDelta,
      champDelta: 0,
      bid,
      maxBid,
      confidence: round(clamp(0.42 + ppgDelta * 0.12 + (v?.confidence ?? 0.5) * 0.2, 0.2, 0.96), 2),
      headline: `Claim ${p.name} (${p.position} - ${p.nfl_team})${bestDrop ? ` / drop ${bestDrop.name}` : ""}`,
      rationale,
      competitionRisk: round(competition * 100, 0),
    });
  }

  const shortlist = targets.sort((a, b) => b.ppgDelta - a.ppgDelta).slice(0, opts.limit ?? 8);

  const matchups = getMatchups(league.id);
  const baseStrengths = computeStrengths(league, teams, rosters);
  const baseSim = simulateSeason(league, teams, baseStrengths, matchups, opts.simIterations ?? 400, "wbase");
  const baseChamp = baseSim.get(myTeam.id)?.champProb ?? 0;

  for (const t of shortlist.slice(0, 5)) {
    const override = new Map(rosters);
    const nextRoster = [
      ...(rosters.get(myTeam.id) ?? []).filter((x) => x.id !== t.dropPlayer?.id),
      t.player,
    ];
    override.set(myTeam.id, nextRoster);
    const strengths = computeStrengths(league, teams, override);
    const sim = simulateSeason(league, teams, strengths, matchups, opts.simIterations ?? 400, "wwhatif");
    t.champDelta = round((sim.get(myTeam.id)?.champProb ?? 0) - baseChamp, 2);
    t.rationale.push(
      `Championship probability ${baseChamp.toFixed(1)}% → ${(sim.get(myTeam.id)?.champProb ?? 0).toFixed(1)}% (${t.champDelta >= 0 ? "+" : ""}${t.champDelta.toFixed(2)}).`
    );
  }

  return shortlist.sort((a, b) => b.champDelta * 1.5 + b.ppgDelta - (a.champDelta * 1.5 + a.ppgDelta));
}

export function submitClaim(
  league: League,
  teamId: string,
  target: WaiverTarget,
  origin: "ai" | "user",
  processInMs = 1000 * 60 * 3
): string {
  const claimId = id("wcl");
  db.prepare(
    `INSERT INTO waiver_claims (id, league_id, team_id, add_player_id, drop_player_id, bid, max_bid, priority, status,
      origin, ppg_delta, champ_delta, confidence, headline, rationale, created_at, process_at)
     VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`
  ).run(
    claimId,
    league.id,
    teamId,
    target.player.id,
    target.dropPlayer?.id ?? null,
    target.bid,
    target.maxBid,
    1,
    "pending",
    origin,
    target.ppgDelta,
    target.champDelta,
    target.confidence,
    target.headline,
    JSON.stringify(target.rationale),
    now(),
    now() + processInMs
  );
  return claimId;
}

/** Resolve claims whose process time has arrived, simulating rival bids. */
export function processDueClaims(league: League): { claimId: string; won: boolean; note: string }[] {
  const due = db
    .prepare(`SELECT * FROM waiver_claims WHERE league_id = ? AND status = 'pending' AND process_at <= ?`)
    .all(league.id, now()) as any[];
  const out: { claimId: string; won: boolean; note: string }[] = [];
  if (!due.length) return out;

  const teams = db.prepare(`SELECT * FROM teams WHERE league_id = ?`).all(league.id) as Team[];
  const teamById = new Map(teams.map((t) => [t.id, t]));

  for (const claim of due) {
    const r = rng(`waiver:${claim.id}`);
    const stillFree = !db
      .prepare(`SELECT 1 FROM rosters WHERE league_id = ? AND player_id = ?`)
      .get(league.id, claim.add_player_id);
    const player = db.prepare(`SELECT * FROM players WHERE id = ?`).get(claim.add_player_id) as Player | undefined;
    const rivalBid = Math.round((claim.ppg_delta * 4.4 + r() * 14) * (0.6 + r() * 0.9));
    const won = stillFree && claim.bid >= rivalBid;

    const run = db.transaction(() => {
      if (won && player) {
        if (claim.drop_player_id) {
          db.prepare(`DELETE FROM rosters WHERE league_id = ? AND player_id = ?`).run(league.id, claim.drop_player_id);
        }
        db.prepare(
          `INSERT OR IGNORE INTO rosters (id, league_id, team_id, player_id, slot_status, acquired_via, acquired_at)
           VALUES (?,?,?,?,?,?,?)`
        ).run(id("ros"), league.id, claim.team_id, claim.add_player_id, "bench", "waiver", now());
        const team = teamById.get(claim.team_id);
        if (team) {
          db.prepare(`UPDATE teams SET faab_spent = faab_spent + ? WHERE id = ?`).run(claim.bid, team.id);
        }
        db.prepare(`UPDATE waiver_claims SET status = 'won', resolved_at = ?, result_note = ? WHERE id = ?`).run(
          now(),
          `Won at $${claim.bid}. Next highest simulated bid: $${Math.max(0, rivalBid)}.`,
          claim.id
        );
      } else {
        db.prepare(`UPDATE waiver_claims SET status = 'lost', resolved_at = ?, result_note = ? WHERE id = ?`).run(
          now(),
          stillFree
            ? `Outbid — winning claim came in at $${rivalBid} (we capped at $${claim.bid}).`
            : `Player was rostered before the claim processed.`,
          claim.id
        );
      }
    });
    run();

    out.push({
      claimId: claim.id,
      won,
      note: won
        ? `Won ${player?.name ?? "player"} for $${claim.bid}`
        : `Lost ${player?.name ?? "player"} — outbid at $${rivalBid}`,
    });
  }
  return out;
}

export function dropPlayer(leagueId: string, teamId: string, playerId: string): boolean {
  const res = db
    .prepare(`DELETE FROM rosters WHERE league_id = ? AND team_id = ? AND player_id = ?`)
    .run(leagueId, teamId, playerId);
  return res.changes > 0;
}

export function addPlayer(leagueId: string, teamId: string, playerId: string, via = "free_agent"): boolean {
  const taken = db.prepare(`SELECT 1 FROM rosters WHERE league_id = ? AND player_id = ?`).get(leagueId, playerId);
  if (taken) return false;
  db.prepare(
    `INSERT INTO rosters (id, league_id, team_id, player_id, slot_status, acquired_via, acquired_at) VALUES (?,?,?,?,?,?,?)`
  ).run(id("ros"), leagueId, teamId, playerId, "bench", via, now());
  return true;
}
