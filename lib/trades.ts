import { db } from "./db";
import { clamp, id, now, round } from "./ids";
import { leagueRosterMap, optimizeLineup, parseRosterPositions, startingSlots } from "./lineup";
import { projectionsForWeek, rosPpg, tradeValue, valuesForLeague } from "./projections";
import { computeStrengths, getMatchups, simulateSeason, type SimResult } from "./sim";
import type { AISettings, League, Player, Projection, Team } from "./types";

export interface TradeCandidate {
  partnerTeamId: string;
  partnerName: string;
  send: Player[];
  receive: Player[];
  myPpgDelta: number;
  partnerPpgDelta: number;
  myValueDelta: number;
  partnerValueDelta: number;
  acceptanceProb: number;
  champDelta: number;
  playoffDelta: number;
  confidence: number;
  riskScore: number;
  headline: string;
  rationale: string[];
}

const PERSONA_BIAS: Record<string, { valueGreed: number; needWeight: number; noise: number }> = {
  analytics: { valueGreed: 1.12, needWeight: 1.15, noise: 0.05 },
  win_now: { valueGreed: 0.95, needWeight: 1.35, noise: 0.12 },
  rebuilder: { valueGreed: 1.25, needWeight: 0.7, noise: 0.15 },
  homer: { valueGreed: 1.3, needWeight: 0.9, noise: 0.2 },
  sharp: { valueGreed: 1.2, needWeight: 1.05, noise: 0.04 },
  casual: { valueGreed: 0.85, needWeight: 0.8, noise: 0.28 },
  unknown: { valueGreed: 1.05, needWeight: 1.0, noise: 0.15 },
  autonomous: { valueGreed: 1.0, needWeight: 1.0, noise: 0.05 },
};

export function lineupTotal(
  slots: string[],
  players: Player[],
  week: number,
  projs: Map<string, Projection>
): number {
  return optimizeLineup(slots, players, (p) => rosPpg(p, week, projs)).total;
}

export function positionalNeeds(
  slots: string[],
  players: Player[],
  week: number,
  projs: Map<string, Projection>
): Record<string, number> {
  const base = lineupTotal(slots, players, week, projs);
  const needs: Record<string, number> = {};
  for (const pos of ["QB", "RB", "WR", "TE"]) {
    const group = players.filter((p) => p.position === pos);
    const best = group.length ? Math.max(...group.map((p) => rosPpg(p, week, projs))) : 0;
    // marginal value of adding a league-average starter at this position
    const phantom: Player = {
      ...(group[0] ?? players[0]),
      id: `phantom_${pos}`,
      position: pos as Player["position"],
      season_ppg: 14,
      last3_ppg: 14,
      injury_status: null,
      bye_week: 0,
    };
    const withPhantom = lineupTotal(slots, [...players, phantom], week, projs);
    needs[pos] = round(withPhantom - base - Math.max(0, best - 14) * 0.1, 2);
  }
  return needs;
}

/** Scan every rival roster for mutually-beneficial trades ranked by championship impact. */
export function findTrades(
  league: League,
  settings: AISettings,
  opts: { maxCandidates?: number; simIterations?: number; targetTeamId?: string } = {}
): TradeCandidate[] {
  const teams = db.prepare(`SELECT * FROM teams WHERE league_id = ?`).all(league.id) as Team[];
  const myTeam = teams.find((t) => t.is_user_team);
  if (!myTeam) return [];

  const slots = startingSlots(parseRosterPositions(league.roster_positions));
  const rosters = leagueRosterMap(league.id) as Map<string, Player[]>;
  const projs = projectionsForWeek(league.current_week);
  const values = valuesForLeague(league.id);
  const week = league.current_week;
  const protectedIds: string[] = JSON.parse(settings.protected_player_ids || "[]");

  const myPlayers = rosters.get(myTeam.id) ?? [];
  const myBase = lineupTotal(slots, myPlayers, week, projs);

  const valOf = (p: Player) => values.get(p.id)?.value ?? tradeValue(p, week, projs);
  const candidates: TradeCandidate[] = [];

  const partnerTeams = opts.targetTeamId
    ? teams.filter((t) => t.id === opts.targetTeamId)
    : teams.filter((t) => !t.is_user_team);

  for (const partner of partnerTeams) {
    const theirPlayers = rosters.get(partner.id) ?? [];
    if (!theirPlayers.length) continue;
    const theirBase = lineupTotal(slots, theirPlayers, week, projs);
    const theirNeeds = positionalNeeds(slots, theirPlayers, week, projs);
    const persona = PERSONA_BIAS[partner.gm_persona] ?? PERSONA_BIAS.unknown;

    const myTradeable = myPlayers
      .filter((p) => !protectedIds.includes(p.id))
      .filter((p) => p.position !== "K" && p.position !== "DEF")
      .sort((a, b) => valOf(b) - valOf(a))
      .slice(0, 11);
    const theirTargets = theirPlayers
      .filter((p) => p.position !== "K" && p.position !== "DEF")
      .sort((a, b) => valOf(b) - valOf(a))
      .slice(0, 11);

    const combos: { send: Player[]; receive: Player[] }[] = [];
    for (const mine of myTradeable) {
      for (const theirs of theirTargets) {
        combos.push({ send: [mine], receive: [theirs] });
      }
    }
    // 2-for-1 consolidation: package two mid pieces for one stud
    const midMine = myTradeable.filter((p) => valOf(p) >= 15 && valOf(p) <= 62).slice(0, 6);
    const studs = theirTargets.filter((p) => valOf(p) >= 55).slice(0, 3);
    for (let i = 0; i < midMine.length; i++) {
      for (let j = i + 1; j < midMine.length; j++) {
        for (const stud of studs) {
          combos.push({ send: [midMine[i], midMine[j]], receive: [stud] });
        }
      }
    }
    // 1-for-2: sell a stud into depth
    const myStuds = myTradeable.filter((p) => valOf(p) >= 58).slice(0, 2);
    const theirMids = theirTargets.filter((p) => valOf(p) >= 18 && valOf(p) <= 62).slice(0, 5);
    for (const stud of myStuds) {
      for (let i = 0; i < theirMids.length; i++) {
        for (let j = i + 1; j < theirMids.length; j++) {
          combos.push({ send: [stud], receive: [theirMids[i], theirMids[j]] });
        }
      }
    }

    for (const combo of combos) {
      const sendIds = new Set(combo.send.map((p) => p.id));
      const recvIds = new Set(combo.receive.map((p) => p.id));
      const myAfterPlayers = [...myPlayers.filter((p) => !sendIds.has(p.id)), ...combo.receive];
      const theirAfterPlayers = [...theirPlayers.filter((p) => !recvIds.has(p.id)), ...combo.send];
      if (myAfterPlayers.length < slots.length || theirAfterPlayers.length < slots.length) continue;

      const myAfter = lineupTotal(slots, myAfterPlayers, week, projs);
      const theirAfter = lineupTotal(slots, theirAfterPlayers, week, projs);
      const myPpgDelta = round(myAfter - myBase, 2);
      const partnerPpgDelta = round(theirAfter - theirBase, 2);
      if (myPpgDelta < 0.35) continue;

      const sendValue = combo.send.reduce((s, p) => s + valOf(p), 0);
      const recvValue = combo.receive.reduce((s, p) => s + valOf(p), 0);
      const myValueDelta = round(recvValue - sendValue, 1);
      const needFit = combo.send.reduce((s, p) => s + (theirNeeds[p.position] ?? 0), 0);
      const partnerValueDelta = round(sendValue * persona.valueGreed - recvValue, 1);

      const acceptScore =
        partnerValueDelta * 0.12 + partnerPpgDelta * 0.55 + needFit * persona.needWeight * 0.35 - combo.receive.length * 0.25;
      const acceptanceProb = round(clamp(1 / (1 + Math.exp(-acceptScore)) - persona.noise * 0.15, 0.02, 0.97), 3);

      const bookEdge = combo.receive.reduce((s, p) => s + (values.get(p.id)?.discrepancy ?? 0), 0)
        - combo.send.reduce((s, p) => s + (values.get(p.id)?.discrepancy ?? 0), 0);

      const riskScore = round(
        clamp(
          (combo.receive.filter((p) => p.injury_status).length * 0.22 +
            combo.receive.reduce((s, p) => s + (projs.get(p.id)?.stdev ?? 4), 0) / 40 +
            (myValueDelta < 0 ? 0.25 : 0)) * 100,
          4,
          98
        ),
        0
      );

      const confidence = round(
        clamp(0.4 + myPpgDelta * 0.06 + bookEdge * 0.03 + acceptanceProb * 0.25 - riskScore / 400, 0.15, 0.97),
        2
      );

      const rationale: string[] = [];
      const recvNames = combo.receive.map((p) => p.name).join(" + ");
      const sendNames = combo.send.map((p) => p.name).join(" + ");
      rationale.push(
        `Starting lineup gains ${myPpgDelta.toFixed(2)} projected PPG (${myBase.toFixed(1)} → ${myAfter.toFixed(1)}) after re-optimising around ${recvNames}.`
      );
      for (const p of combo.receive) {
        const v = values.get(p.id);
        const proj = projs.get(p.id);
        if (v && Math.abs(v.discrepancy) > 0.6 && proj) {
          rationale.push(
            `${p.name}: FanDuel-implied ${proj.book_pts.toFixed(1)} pts vs Sleeper ${proj.sleeper_pts.toFixed(1)} — a ${v.discrepancy > 0 ? "+" : ""}${v.discrepancy.toFixed(1)} pt market edge the league hasn't priced.`
          );
        }
        if (p.target_share > 20) rationale.push(`${p.name} commands a ${p.target_share.toFixed(0)}% target share on ${p.route_pct.toFixed(0)}% route participation.`);
        else if (p.touches_pg > 14) rationale.push(`${p.name} is averaging ${p.touches_pg.toFixed(1)} touches per game with ${p.red_zone_share.toFixed(0)}% red-zone share.`);
        if (p.injury_status) rationale.push(`Injury risk acknowledged: ${p.name} listed ${p.injury_status}${p.injury_note ? ` — ${p.injury_note}` : ""}.`);
      }
      for (const p of combo.send) {
        const v = values.get(p.id);
        if (v?.market_signal === "sell_high") rationale.push(`${p.name} grades as a sell-high: recent output is outrunning his book-implied baseline.`);
      }
      rationale.push(
        `Partner read (${partner.gm_persona.replace("_", " ")} GM): their lineup improves ${partnerPpgDelta.toFixed(2)} PPG and ${sendNames} fills their biggest hole — modelled acceptance ${(acceptanceProb * 100).toFixed(0)}%.`
      );

      candidates.push({
        partnerTeamId: partner.id,
        partnerName: partner.name,
        send: combo.send,
        receive: combo.receive,
        myPpgDelta,
        partnerPpgDelta,
        myValueDelta,
        partnerValueDelta,
        acceptanceProb,
        champDelta: 0,
        playoffDelta: 0,
        confidence,
        riskScore,
        headline: `Acquire ${recvNames} for ${sendNames}`,
        rationale,
      });
    }
  }

  const riskFloor = 0.18 + (1 - settings.risk_tolerance) * 0.32;
  const prelim = candidates
    .filter((c) => c.acceptanceProb >= riskFloor)
    .sort((a, b) => b.myPpgDelta * b.acceptanceProb - a.myPpgDelta * a.acceptanceProb)
    .slice(0, opts.maxCandidates ?? 6);

  // Championship-probability impact via Monte Carlo on the shortlist
  const matchups = getMatchups(league.id);
  const baseStrengths = computeStrengths(league, teams, rosters);
  const baseSim = simulateSeason(league, teams, baseStrengths, matchups, opts.simIterations ?? 500, "base");
  const baseChamp = baseSim.get(myTeam.id)?.champProb ?? 0;
  const basePlayoff = baseSim.get(myTeam.id)?.playoffProb ?? 0;

  for (const c of prelim) {
    const sendIds = new Set(c.send.map((p) => p.id));
    const recvIds = new Set(c.receive.map((p) => p.id));
    const override = new Map(rosters);
    override.set(myTeam.id, [...(rosters.get(myTeam.id) ?? []).filter((p) => !sendIds.has(p.id)), ...c.receive]);
    override.set(c.partnerTeamId, [
      ...(rosters.get(c.partnerTeamId) ?? []).filter((p) => !recvIds.has(p.id)),
      ...c.send,
    ]);
    const strengths = computeStrengths(league, teams, override);
    const sim = simulateSeason(league, teams, strengths, matchups, opts.simIterations ?? 500, "whatif");
    const after = sim.get(myTeam.id) as SimResult | undefined;
    c.champDelta = round((after?.champProb ?? 0) - baseChamp, 2);
    c.playoffDelta = round((after?.playoffProb ?? 0) - basePlayoff, 2);
    c.rationale.push(
      `Monte Carlo (${opts.simIterations ?? 500} seasons): championship probability ${baseChamp.toFixed(1)}% → ${(after?.champProb ?? 0).toFixed(1)}% (${c.champDelta >= 0 ? "+" : ""}${c.champDelta.toFixed(2)} pts), playoff odds ${c.playoffDelta >= 0 ? "+" : ""}${c.playoffDelta.toFixed(2)}.`
    );
  }

  return prelim.sort((a, b) => b.champDelta * 2 + b.myPpgDelta - (a.champDelta * 2 + a.myPpgDelta));
}

export function persistTrade(
  league: League,
  fromTeamId: string,
  candidate: TradeCandidate,
  status: string,
  origin: "ai" | "user" | "league"
): string {
  const tradeId = id("trd");
  db.prepare(
    `INSERT INTO trades (id, league_id, from_team_id, to_team_id, send_player_ids, receive_player_ids, faab_included,
      status, origin, value_delta, ppg_delta, champ_delta, playoff_delta, partner_value_delta, acceptance_prob,
      confidence, risk_score, headline, rationale, created_at, sent_at, expires_at)
     VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`
  ).run(
    tradeId,
    league.id,
    fromTeamId,
    candidate.partnerTeamId,
    JSON.stringify(candidate.send.map((p) => p.id)),
    JSON.stringify(candidate.receive.map((p) => p.id)),
    0,
    status,
    origin,
    candidate.myValueDelta,
    candidate.myPpgDelta,
    candidate.champDelta,
    candidate.playoffDelta,
    candidate.partnerValueDelta,
    candidate.acceptanceProb,
    candidate.confidence,
    candidate.riskScore,
    candidate.headline,
    JSON.stringify(candidate.rationale),
    now(),
    status === "proposed" ? now() : null,
    now() + 1000 * 60 * 60 * 36
  );
  return tradeId;
}

/** Execute an accepted trade: swap the players between rosters. */
export function executeTrade(tradeId: string): boolean {
  const trade = db.prepare(`SELECT * FROM trades WHERE id = ?`).get(tradeId) as any;
  if (!trade) return false;
  const send: string[] = JSON.parse(trade.send_player_ids);
  const receive: string[] = JSON.parse(trade.receive_player_ids);
  const move = db.prepare(`UPDATE rosters SET team_id = ?, acquired_via = 'trade', acquired_at = ? WHERE league_id = ? AND player_id = ?`);
  const run = db.transaction(() => {
    for (const pid of send) move.run(trade.to_team_id, now(), trade.league_id, pid);
    for (const pid of receive) move.run(trade.from_team_id, now(), trade.league_id, pid);
    db.prepare(`UPDATE trades SET status = 'accepted', resolved_at = ? WHERE id = ?`).run(now(), tradeId);
  });
  run();
  return true;
}
