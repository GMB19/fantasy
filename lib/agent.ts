import { db } from "./db";
import { clamp, id, now, round } from "./ids";
import { autoSetLineups, weeksToProject } from "./seed";
import {
  bumpOddsTick,
  projectionsForWeek,
  refreshPlayerValues,
  refreshProjections,
} from "./projections";
import { computeStrengths, getMatchups, persistSim, simulateSeason } from "./sim";
import { leagueRosterMap, optimizeLineup, parseRosterPositions, slotLabel, startingSlots } from "./lineup";
import { executeTrade, findTrades, persistTrade } from "./trades";
import { processDueClaims, scanWaivers, submitClaim } from "./waivers";
import { generateNewsEvent, setAiTake } from "./agent-news";
import type { AISettings, League, Player, Team } from "./types";

export interface CycleReport {
  cycleId: string;
  leagueId: string;
  startedAt: number;
  durationMs: number;
  tradesScanned: number;
  tradesProposed: number;
  waiverTargets: number;
  claimsSubmitted: number;
  lineupChanges: number;
  newsProcessed: number;
  champProb: number;
  champDelta: number;
  decisions: number;
  skipped: string[];
}

export function getSettings(leagueId: string): AISettings {
  let s = db.prepare(`SELECT * FROM ai_settings WHERE league_id = ?`).get(leagueId) as AISettings | undefined;
  if (!s) {
    db.prepare(`INSERT INTO ai_settings (league_id, updated_at) VALUES (?, ?)`).run(leagueId, now());
    s = db.prepare(`SELECT * FROM ai_settings WHERE league_id = ?`).get(leagueId) as AISettings;
  }
  return s;
}

export function logDecision(params: {
  leagueId: string;
  cycleId?: string;
  type: string;
  action: string;
  status: "executed" | "proposed" | "skipped" | "blocked" | "monitored";
  title: string;
  summary: string;
  rationale?: string[];
  inputs?: Record<string, unknown>;
  confidence?: number;
  ppgDelta?: number;
  champDelta?: number;
  relatedType?: string;
  relatedId?: string;
}): string {
  const decisionId = id("dec");
  db.prepare(
    `INSERT INTO ai_decisions (id, league_id, cycle_id, type, action, status, title, summary, rationale, inputs,
      confidence, ppg_delta, champ_delta, related_type, related_id, created_at)
     VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`
  ).run(
    decisionId,
    params.leagueId,
    params.cycleId ?? null,
    params.type,
    params.action,
    params.status,
    params.title,
    params.summary,
    JSON.stringify(params.rationale ?? []),
    JSON.stringify(params.inputs ?? {}),
    params.confidence ?? 0,
    params.ppgDelta ?? 0,
    params.champDelta ?? 0,
    params.relatedType ?? null,
    params.relatedId ?? null,
    now()
  );
  return decisionId;
}

export function logActivity(params: {
  leagueId: string;
  kind: string;
  actor?: string;
  message: string;
  detail?: string;
  meta?: Record<string, unknown>;
}): void {
  db.prepare(
    `INSERT INTO activity_log (id, league_id, kind, actor, message, detail, meta, created_at) VALUES (?,?,?,?,?,?,?,?)`
  ).run(
    id("act"),
    params.leagueId,
    params.kind,
    params.actor ?? "ai",
    params.message,
    params.detail ?? null,
    JSON.stringify(params.meta ?? {}),
    now()
  );
}

export function notify(params: {
  userId: string;
  leagueId?: string;
  type: string;
  title: string;
  body: string;
  link?: string;
}): void {
  db.prepare(
    `INSERT INTO notifications (id, user_id, league_id, type, title, body, link, is_read, created_at)
     VALUES (?,?,?,?,?,?,?,0,?)`
  ).run(id("ntf"), params.userId, params.leagueId ?? null, params.type, params.title, params.body, params.link ?? null, now());
}

export function transactionsToday(leagueId: string): number {
  const dayAgo = now() - 1000 * 60 * 60 * 24;
  const trades = db
    .prepare(`SELECT COUNT(*) AS c FROM trades WHERE league_id = ? AND origin = 'ai' AND created_at > ?`)
    .get(leagueId, dayAgo) as { c: number };
  const claims = db
    .prepare(`SELECT COUNT(*) AS c FROM waiver_claims WHERE league_id = ? AND origin = 'ai' AND created_at > ?`)
    .get(leagueId, dayAgo) as { c: number };
  return trades.c + claims.c;
}

const running = new Set<string>();

/** One full autonomous GM cycle for a league. */
export async function runCycle(
  leagueId: string,
  opts: { trigger?: "auto" | "manual"; force?: boolean } = {}
): Promise<CycleReport | null> {
  if (running.has(leagueId)) return null;
  running.add(leagueId);
  const started = Date.now();
  const cycleId = id("cyc");

  try {
    const league = db.prepare(`SELECT * FROM leagues WHERE id = ?`).get(leagueId) as League | undefined;
    if (!league) return null;
    const settings = getSettings(leagueId);
    const trigger = opts.trigger ?? "auto";

    if (!opts.force && settings.paused_until && settings.paused_until > now()) return null;
    if (!opts.force && trigger === "auto" && !settings.autonomous_mode) {
      // still keep market data warm even when autonomy is off
      bumpOddsTick();
      refreshProjections(weeksToProject(league), settings);
      refreshPlayerValues(leagueId, league.current_week);
      db.prepare(`UPDATE ai_settings SET last_run_at = ? WHERE league_id = ?`).run(now(), leagueId);
      return null;
    }

    const teams = db.prepare(`SELECT * FROM teams WHERE league_id = ?`).all(leagueId) as Team[];
    const myTeam = teams.find((t) => t.is_user_team);
    if (!myTeam) return null;

    const report: CycleReport = {
      cycleId,
      leagueId,
      startedAt: started,
      durationMs: 0,
      tradesScanned: 0,
      tradesProposed: 0,
      waiverTargets: 0,
      claimsSubmitted: 0,
      lineupChanges: 0,
      newsProcessed: 0,
      champProb: 0,
      champDelta: 0,
      decisions: 0,
      skipped: [],
    };

    // ---------- 1. refresh market data ----------
    bumpOddsTick();
    refreshProjections(weeksToProject(league), settings);
    refreshPlayerValues(leagueId, league.current_week);

    const priorSim = db
      .prepare(`SELECT champ_prob FROM sim_snapshots WHERE league_id = ? AND team_id = ? ORDER BY created_at DESC LIMIT 1`)
      .get(leagueId, myTeam.id) as { champ_prob: number } | undefined;

    // ---------- 2. news monitoring ----------
    if (settings.news_monitoring) {
      const eventCount = Math.random() < 0.55 ? 1 : Math.random() < 0.2 ? 2 : 0;
      for (let i = 0; i < eventCount; i++) {
        const news = generateNewsEvent(league, `${cycleId}:${i}`);
        if (!news?.player) continue;
        report.newsProcessed++;
        const rostered = db
          .prepare(`SELECT team_id FROM rosters WHERE league_id = ? AND player_id = ?`)
          .get(leagueId, news.player.id) as { team_id: string } | undefined;
        const isMine = rostered?.team_id === myTeam.id;
        const take = isMine
          ? `${news.player.name} is on our roster. Projection impact ${news.item.projection_delta >= 0 ? "+" : ""}${news.item.projection_delta.toFixed(1)} pts — lineup and trade models re-scored immediately.`
          : rostered
            ? `${news.player.name} is rostered by a rival. Value moved ${news.item.value_delta >= 0 ? "+" : ""}${news.item.value_delta.toFixed(1)} — flagged for ${news.item.value_delta < 0 ? "buy-low" : "sell-high"} trade construction.`
            : `${news.player.name} is a free agent. Added to the waiver priority queue for re-scoring.`;
        setAiTake(news.item.id, take);
        if (news.actionable) {
          logDecision({
            leagueId,
            cycleId,
            type: "news",
            action: "monitor_news",
            status: "monitored",
            title: news.item.headline,
            summary: take,
            rationale: [
              news.item.body,
              `Severity ${news.item.severity}; modelled value change ${news.item.value_delta.toFixed(1)} pts, projection change ${news.item.projection_delta.toFixed(1)} pts.`,
            ],
            inputs: { player: news.player.name, category: news.item.category, source: news.item.source },
            confidence: 0.8,
            ppgDelta: news.item.projection_delta,
            relatedType: "news",
            relatedId: news.item.id,
          });
          report.decisions++;
          logActivity({
            leagueId,
            kind: "news",
            message: news.item.headline,
            detail: take,
            meta: { player_id: news.player.id, severity: news.item.severity },
          });
        }
      }
    }

    // ---------- 3. resolve pending waiver claims ----------
    const claimResults = processDueClaims(league);
    for (const res of claimResults) {
      const claim = db.prepare(`SELECT * FROM waiver_claims WHERE id = ?`).get(res.claimId) as any;
      logActivity({
        leagueId,
        kind: res.won ? "waiver_won" : "waiver_lost",
        message: res.note,
        detail: claim?.result_note ?? undefined,
        meta: { claim_id: res.claimId },
      });
      logDecision({
        leagueId,
        cycleId,
        type: "waiver",
        action: "claim_result",
        status: res.won ? "executed" : "skipped",
        title: res.won ? `Waiver won: ${res.note}` : `Waiver lost: ${res.note}`,
        summary: claim?.result_note ?? res.note,
        rationale: JSON.parse(claim?.rationale ?? "[]"),
        confidence: claim?.confidence ?? 0.5,
        ppgDelta: claim?.ppg_delta ?? 0,
        champDelta: claim?.champ_delta ?? 0,
        relatedType: "waiver_claim",
        relatedId: res.claimId,
      });
      report.decisions++;
      notify({
        userId: league.user_id,
        leagueId,
        type: res.won ? "waiver_won" : "waiver_lost",
        title: res.won ? "Waiver claim won" : "Waiver claim lost",
        body: res.note,
        link: "/dashboard/waivers",
      });
    }

    // ---------- 4. resolve outstanding trade offers ----------
    resolvePendingTrades(league, cycleId);

    // ---------- 5. lineup optimisation ----------
    if (settings.lineup_automation) {
      report.lineupChanges = optimizeUserLineup(league, myTeam, cycleId);
    }

    const withinTxnLimit = transactionsToday(leagueId) < settings.max_daily_transactions;

    // ---------- 6. waiver scan ----------
    const waiverTargets = scanWaivers(league, settings, { limit: 8, simIterations: 350 });
    report.waiverTargets = waiverTargets.length;
    const pendingClaimPlayerIds = new Set(
      (
        db
          .prepare(`SELECT add_player_id FROM waiver_claims WHERE league_id = ? AND status IN ('pending','queued')`)
          .all(leagueId) as { add_player_id: string }[]
      ).map((r) => r.add_player_id)
    );
    const pendingClaimPositions = new Set(
      (
        db
          .prepare(
            `SELECT p.position AS position FROM waiver_claims w JOIN players p ON p.id = w.add_player_id
             WHERE w.league_id = ? AND w.status IN ('pending','queued')`
          )
          .all(leagueId) as { position: string }[]
      ).map((r) => r.position)
    );

    for (const target of waiverTargets.slice(0, 3)) {
      if (pendingClaimPlayerIds.has(target.player.id)) continue;
      if (pendingClaimPositions.has(target.player.position)) continue;
      const meetsBar = target.champDelta >= settings.min_champ_improvement * 0.4 || target.ppgDelta >= 0.9;
      if (!settings.waiver_automation) {
        logDecision({
          leagueId,
          cycleId,
          type: "waiver",
          action: "claim_suggested",
          status: "proposed",
          title: target.headline,
          summary: `Waiver automation is off — surfaced for manual review. +${target.ppgDelta.toFixed(2)} PPG, ${target.champDelta >= 0 ? "+" : ""}${target.champDelta.toFixed(2)}% title odds.`,
          rationale: target.rationale,
          confidence: target.confidence,
          ppgDelta: target.ppgDelta,
          champDelta: target.champDelta,
        });
        report.decisions++;
        report.skipped.push("waiver_automation_off");
        break;
      }
      if (!withinTxnLimit) {
        report.skipped.push("daily_transaction_limit");
        break;
      }
      if (!meetsBar) {
        logDecision({
          leagueId,
          cycleId,
          type: "waiver",
          action: "claim_skipped",
          status: "skipped",
          title: `Passed on ${target.player.name}`,
          summary: `Projected championship gain ${target.champDelta.toFixed(2)}% is below the ${settings.min_champ_improvement.toFixed(2)}% minimum improvement threshold.`,
          rationale: target.rationale,
          confidence: target.confidence,
          ppgDelta: target.ppgDelta,
          champDelta: target.champDelta,
        });
        report.decisions++;
        continue;
      }
      const claimId = submitClaim(league, myTeam.id, target, "ai", 1000 * 60 * 2);
      report.claimsSubmitted++;
      logDecision({
        leagueId,
        cycleId,
        type: "waiver",
        action: "claim_submitted",
        status: "executed",
        title: target.headline,
        summary: `Submitted a $${target.bid} FAAB claim. Adds ${target.ppgDelta.toFixed(2)} PPG and ${target.champDelta >= 0 ? "+" : ""}${target.champDelta.toFixed(2)}% championship probability.`,
        rationale: target.rationale,
        inputs: {
          bid: target.bid,
          max_bid: target.maxBid,
          competition_risk: target.competitionRisk,
          drop: target.dropPlayer?.name ?? null,
        },
        confidence: target.confidence,
        ppgDelta: target.ppgDelta,
        champDelta: target.champDelta,
        relatedType: "waiver_claim",
        relatedId: claimId,
      });
      report.decisions++;
      logActivity({
        leagueId,
        kind: "waiver_submitted",
        message: `AI GM submitted a $${target.bid} claim for ${target.player.name}`,
        detail: target.rationale[0],
        meta: { claim_id: claimId, player_id: target.player.id },
      });
      notify({
        userId: league.user_id,
        leagueId,
        type: "waiver_submitted",
        title: "Waiver claim submitted",
        body: `$${target.bid} on ${target.player.name} (${target.player.position}) — +${target.ppgDelta.toFixed(2)} PPG`,
        link: "/dashboard/waivers",
      });
      break;
    }

    // ---------- 7. trade scan ----------
    const openOffers = db
      .prepare(`SELECT COUNT(*) AS c FROM trades WHERE league_id = ? AND status IN ('proposed','pending_approval')`)
      .get(leagueId) as { c: number };

    if (openOffers.c < 3) {
      const candidates = findTrades(league, settings, { maxCandidates: 5, simIterations: 400 });
      report.tradesScanned = candidates.length;
      const best = candidates[0];
      if (best) {
        const passesChamp = best.champDelta >= settings.min_champ_improvement;
        const passesRisk = best.riskScore <= 30 + settings.risk_tolerance * 70;
        const duplicate = db
          .prepare(
            `SELECT 1 FROM trades WHERE league_id = ? AND to_team_id = ? AND send_player_ids = ? AND receive_player_ids = ? AND status IN ('proposed','pending_approval','accepted')`
          )
          .get(
            leagueId,
            best.partnerTeamId,
            JSON.stringify(best.send.map((p) => p.id)),
            JSON.stringify(best.receive.map((p) => p.id))
          );

        if (duplicate) {
          report.skipped.push("duplicate_offer");
        } else if (!settings.autonomous_mode) {
          persistTrade(league, myTeam.id, best, "draft", "ai");
          logDecision({
            leagueId,
            cycleId,
            type: "trade",
            action: "trade_drafted",
            status: "proposed",
            title: best.headline,
            summary: `Autonomous mode is off — offer drafted for your review (+${best.myPpgDelta.toFixed(2)} PPG, ${best.champDelta >= 0 ? "+" : ""}${best.champDelta.toFixed(2)}% title odds).`,
            rationale: best.rationale,
            confidence: best.confidence,
            ppgDelta: best.myPpgDelta,
            champDelta: best.champDelta,
          });
          report.decisions++;
        } else if (!passesChamp) {
          logDecision({
            leagueId,
            cycleId,
            type: "trade",
            action: "trade_skipped",
            status: "skipped",
            title: `Held off: ${best.headline}`,
            summary: `Championship gain ${best.champDelta.toFixed(2)}% is under your ${settings.min_champ_improvement.toFixed(2)}% minimum. Continuing to monitor the market.`,
            rationale: best.rationale,
            confidence: best.confidence,
            ppgDelta: best.myPpgDelta,
            champDelta: best.champDelta,
          });
          report.decisions++;
          report.skipped.push("below_champ_threshold");
        } else if (!passesRisk) {
          logDecision({
            leagueId,
            cycleId,
            type: "trade",
            action: "trade_blocked",
            status: "blocked",
            title: `Risk limit blocked: ${best.headline}`,
            summary: `Risk score ${best.riskScore}/100 exceeds your tolerance ceiling of ${Math.round(30 + settings.risk_tolerance * 70)}.`,
            rationale: best.rationale,
            confidence: best.confidence,
            ppgDelta: best.myPpgDelta,
            champDelta: best.champDelta,
          });
          report.decisions++;
          report.skipped.push("risk_limit");
        } else if (!withinTxnLimit) {
          report.skipped.push("daily_transaction_limit");
        } else {
          const status = settings.require_trade_approval ? "pending_approval" : "proposed";
          const tradeId = persistTrade(league, myTeam.id, best, status, "ai");
          report.tradesProposed++;
          logDecision({
            leagueId,
            cycleId,
            type: "trade",
            action: settings.require_trade_approval ? "trade_awaiting_approval" : "trade_sent",
            status: settings.require_trade_approval ? "proposed" : "executed",
            title: best.headline,
            summary: settings.require_trade_approval
              ? `Offer built and queued for your approval — ${(best.acceptanceProb * 100).toFixed(0)}% modelled acceptance, +${best.myPpgDelta.toFixed(2)} PPG, +${best.champDelta.toFixed(2)}% title odds.`
              : `Offer sent to ${best.partnerName} — ${(best.acceptanceProb * 100).toFixed(0)}% modelled acceptance, +${best.myPpgDelta.toFixed(2)} PPG, +${best.champDelta.toFixed(2)}% title odds.`,
            rationale: best.rationale,
            inputs: {
              partner: best.partnerName,
              send: best.send.map((p) => p.name),
              receive: best.receive.map((p) => p.name),
              risk_score: best.riskScore,
              acceptance_prob: best.acceptanceProb,
            },
            confidence: best.confidence,
            ppgDelta: best.myPpgDelta,
            champDelta: best.champDelta,
            relatedType: "trade",
            relatedId: tradeId,
          });
          report.decisions++;
          logActivity({
            leagueId,
            kind: settings.require_trade_approval ? "trade_pending" : "trade_sent",
            message: settings.require_trade_approval
              ? `AI GM queued a trade offer for approval: ${best.headline}`
              : `AI GM sent a trade offer to ${best.partnerName}: ${best.headline}`,
            detail: best.rationale[0],
            meta: { trade_id: tradeId },
          });
          notify({
            userId: league.user_id,
            leagueId,
            type: settings.require_trade_approval ? "trade_approval" : "trade_sent",
            title: settings.require_trade_approval ? "Trade offer needs approval" : "Trade offer sent",
            body: `${best.headline} — +${best.champDelta.toFixed(2)}% championship probability`,
            link: "/dashboard/trades",
          });
        }
      }
    } else {
      report.skipped.push("open_offer_cap");
    }

    // ---------- 8. re-simulate the season ----------
    const rosters = leagueRosterMap(leagueId) as Map<string, Player[]>;
    const strengths = computeStrengths(league, teams, rosters);
    const sim = simulateSeason(league, teams, strengths, getMatchups(leagueId), 1200, "cycle");
    persistSim(league, sim, strengths, 1200);
    const mine = sim.get(myTeam.id);
    report.champProb = mine?.champProb ?? 0;
    report.champDelta = round(report.champProb - (priorSim?.champ_prob ?? report.champProb), 2);

    db.prepare(`UPDATE ai_settings SET last_run_at = ? WHERE league_id = ?`).run(now(), leagueId);
    report.durationMs = Date.now() - started;

    logActivity({
      leagueId,
      kind: "cycle",
      message: `AI cycle complete — scanned ${report.tradesScanned} trade constructions, ${report.waiverTargets} waiver targets, ${report.newsProcessed} news events`,
      detail: `Championship probability ${report.champProb.toFixed(1)}% (${report.champDelta >= 0 ? "+" : ""}${report.champDelta.toFixed(2)}). Cycle time ${report.durationMs}ms.`,
      meta: { cycle_id: cycleId, trigger, ...report },
    });

    return report;
  } catch (err) {
    console.error("[agent] cycle failed", err);
    return null;
  } finally {
    running.delete(leagueId);
  }
}

function optimizeUserLineup(league: League, myTeam: Team, cycleId: string): number {
  const slots = startingSlots(parseRosterPositions(league.roster_positions));
  const rosters = leagueRosterMap(league.id) as Map<string, Player[]>;
  const players = rosters.get(myTeam.id) ?? [];
  const projs = projectionsForWeek(league.current_week);
  const pointsFor = (p: Player) => {
    const proj = projs.get(p.id);
    if (!proj || proj.is_bye) return 0;
    if (p.injury_status === "OUT" || p.injury_status === "IR") return 0;
    return proj.model_pts;
  };

  const current = db
    .prepare(`SELECT * FROM lineups WHERE team_id = ? AND week = ? ORDER BY slot_index`)
    .all(myTeam.id, league.current_week) as any[];
  const byId = new Map(players.map((p) => [p.id, p]));
  const currentTotal = current.reduce((sum, row) => {
    const p = row.player_id ? byId.get(row.player_id) : null;
    return sum + (p ? pointsFor(p) : 0);
  }, 0);

  const optimal = optimizeLineup(slots, players, pointsFor);
  const gain = round(optimal.total - currentTotal, 2);
  if (gain < 0.35) return 0;

  const currentBySlot = new Map(current.map((r) => [`${r.slot}:${r.slot_index}`, r.player_id]));
  const changes: string[] = [];
  for (const a of optimal.assignments) {
    const prev = currentBySlot.get(`${a.slot}:${a.slotIndex}`);
    if (prev !== a.playerId) {
      const inP = a.playerId ? byId.get(a.playerId) : null;
      const outP = prev ? byId.get(prev) : null;
      changes.push(
        `${slotLabel(a.slot)}: ${outP ? `${outP.name} (${pointsFor(outP).toFixed(1)})` : "empty"} → ${inP ? `${inP.name} (${pointsFor(inP).toFixed(1)})` : "empty"}`
      );
    }
  }
  if (!changes.length) return 0;

  autoSetLineups(league, "ai");

  logDecision({
    leagueId: league.id,
    cycleId,
    type: "lineup",
    action: "lineup_optimized",
    status: "executed",
    title: `Lineup re-optimised for week ${league.current_week} (+${gain.toFixed(2)} pts)`,
    summary: `${changes.length} slot change${changes.length > 1 ? "s" : ""} based on refreshed sportsbook-implied projections, injury designations and matchup ratings.`,
    rationale: [
      ...changes,
      `Projected starting total ${currentTotal.toFixed(1)} → ${optimal.total.toFixed(1)} points.`,
      `Projections weighted toward FanDuel-implied outcomes with injury and bye filters applied.`,
    ],
    confidence: 0.88,
    ppgDelta: gain,
  });
  logActivity({
    leagueId: league.id,
    kind: "lineup",
    message: `AI GM adjusted ${changes.length} lineup slot${changes.length > 1 ? "s" : ""} (+${gain.toFixed(2)} projected pts)`,
    detail: changes.join(" · "),
  });
  return changes.length;
}

function resolvePendingTrades(league: League, cycleId: string) {
  const pending = db
    .prepare(`SELECT * FROM trades WHERE league_id = ? AND status = 'proposed'`)
    .all(league.id) as any[];
  for (const trade of pending) {
    const age = now() - (trade.sent_at ?? trade.created_at);
    if (trade.expires_at && now() > trade.expires_at) {
      db.prepare(`UPDATE trades SET status = 'expired', resolved_at = ? WHERE id = ?`).run(now(), trade.id);
      logActivity({ leagueId: league.id, kind: "trade_expired", message: `Trade offer expired: ${trade.headline}` });
      continue;
    }
    if (age < 1000 * 45) continue;

    const roll = Math.random();
    const partner = db.prepare(`SELECT * FROM teams WHERE id = ?`).get(trade.to_team_id) as Team | undefined;
    if (roll < trade.acceptance_prob) {
      executeTrade(trade.id);
      db.prepare(`UPDATE trades SET response_note = ? WHERE id = ?`).run(
        `${partner?.owner_name ?? "Partner"} accepted — "${pickAcceptLine()}"`,
        trade.id
      );
      autoSetLineups(league, "ai");
      logDecision({
        leagueId: league.id,
        cycleId,
        type: "trade",
        action: "trade_accepted",
        status: "executed",
        title: `Trade accepted: ${trade.headline}`,
        summary: `${partner?.name ?? "Partner"} accepted the offer. Rosters updated and lineup re-optimised.`,
        rationale: JSON.parse(trade.rationale || "[]"),
        confidence: trade.confidence,
        ppgDelta: trade.ppg_delta,
        champDelta: trade.champ_delta,
        relatedType: "trade",
        relatedId: trade.id,
      });
      logActivity({
        leagueId: league.id,
        kind: "trade_accepted",
        message: `Trade accepted by ${partner?.name ?? "partner"}: ${trade.headline}`,
        detail: `+${trade.ppg_delta.toFixed(2)} PPG, +${trade.champ_delta.toFixed(2)}% championship probability`,
        meta: { trade_id: trade.id },
      });
      notify({
        userId: league.user_id,
        leagueId: league.id,
        type: "trade_accepted",
        title: "Trade accepted",
        body: `${partner?.name ?? "Partner"} accepted: ${trade.headline}`,
        link: "/dashboard/trades",
      });
    } else if (roll > 0.72) {
      db.prepare(`UPDATE trades SET status = 'rejected', resolved_at = ?, response_note = ? WHERE id = ?`).run(
        now(),
        `${partner?.owner_name ?? "Partner"} declined — "${pickRejectLine()}"`,
        trade.id
      );
      logDecision({
        leagueId: league.id,
        cycleId,
        type: "trade",
        action: "trade_rejected",
        status: "skipped",
        title: `Trade declined: ${trade.headline}`,
        summary: `${partner?.name ?? "Partner"} passed. Re-scoring alternative packages with this roster next cycle.`,
        rationale: JSON.parse(trade.rationale || "[]"),
        confidence: trade.confidence,
        ppgDelta: trade.ppg_delta,
        champDelta: trade.champ_delta,
        relatedType: "trade",
        relatedId: trade.id,
      });
      logActivity({
        leagueId: league.id,
        kind: "trade_rejected",
        message: `${partner?.name ?? "Partner"} declined: ${trade.headline}`,
        meta: { trade_id: trade.id },
      });
    }
  }
}

function pickAcceptLine(): string {
  const lines = [
    "Needed the upgrade at that spot, let's do it.",
    "Fair value both ways — accepted.",
    "I'll take the depth. Good luck the rest of the way.",
    "You drive a hard bargain but my starting lineup gets better.",
  ];
  return lines[Math.floor(Math.random() * lines.length)];
}

function pickRejectLine(): string {
  const lines = [
    "Not moving him at that price.",
    "I'd need more back to make it work.",
    "Too thin at that position already.",
    "Let me think on it — pass for now.",
  ];
  return lines[Math.floor(Math.random() * lines.length)];
}

// ------------------------------------------------------------------
// Scheduler: keeps every active league's GM running around the clock
// ------------------------------------------------------------------

declare global {
  // eslint-disable-next-line no-var
  var __gm_scheduler: NodeJS.Timeout | undefined;
  // eslint-disable-next-line no-var
  var __gm_last_run: Map<string, number> | undefined;
}

const lastRun = globalThis.__gm_last_run ?? new Map<string, number>();
globalThis.__gm_last_run = lastRun;

export function startScheduler(): void {
  if (globalThis.__gm_scheduler) return;
  const tick = async () => {
    try {
      const leagues = db.prepare(`SELECT id FROM leagues`).all() as { id: string }[];
      for (const { id: leagueId } of leagues) {
        const settings = getSettings(leagueId);
        const interval = clamp(settings.scan_interval_sec, 10, 3600) * 1000;
        const last = lastRun.get(leagueId) ?? 0;
        if (Date.now() - last >= interval) {
          lastRun.set(leagueId, Date.now());
          await runCycle(leagueId, { trigger: "auto" });
        }
      }
    } catch (err) {
      console.error("[agent] scheduler error", err);
    }
  };
  globalThis.__gm_scheduler = setInterval(tick, 10_000);
  setTimeout(tick, 4_000);
  console.log("[agent] autonomous GM scheduler started");
}

export function stopScheduler(): void {
  if (globalThis.__gm_scheduler) {
    clearInterval(globalThis.__gm_scheduler);
    globalThis.__gm_scheduler = undefined;
  }
}
