import { badRequest, readBody, withLeague } from "@/lib/api";
import { expandTrades, getMyTeam, getTeams } from "@/lib/queries";
import { persistTrade } from "@/lib/trades";
import { logActivity, logDecision } from "@/lib/agent";
import { projectionsForWeek, valuesForLeague } from "@/lib/projections";
import { leagueRosterMap, parseRosterPositions, startingSlots } from "@/lib/lineup";
import { lineupTotal } from "@/lib/trades";
import { round } from "@/lib/ids";
import type { Player } from "@/lib/types";

export async function GET(req: Request) {
  return withLeague(req, (_user, league) => {
    const url = new URL(req.url);
    return {
      trades: expandTrades(league.id, league.current_week, url.searchParams.get("status") ?? "all"),
      teams: getTeams(league.id),
      myTeamId: getMyTeam(league.id)?.id ?? null,
    };
  });
}

/** Build a manual offer from the trade builder. */
export async function POST(req: Request) {
  return withLeague(req, async (_user, league) => {
    const body = await readBody<{
      partnerTeamId: string;
      sendPlayerIds: string[];
      receivePlayerIds: string[];
      autoSend?: boolean;
    }>(req);
    const myTeam = getMyTeam(league.id);
    if (!myTeam) return badRequest("No team");
    if (!body.partnerTeamId || !body.sendPlayerIds?.length || !body.receivePlayerIds?.length) {
      return badRequest("Select at least one player on each side");
    }

    const week = league.current_week;
    const slots = startingSlots(parseRosterPositions(league.roster_positions));
    const rosters = leagueRosterMap(league.id) as Map<string, Player[]>;
    const projs = projectionsForWeek(week);
    const values = valuesForLeague(league.id);
    const partner = getTeams(league.id).find((t) => t.id === body.partnerTeamId);
    if (!partner) return badRequest("Partner team not found", 404);

    const mine = rosters.get(myTeam.id) ?? [];
    const theirs = rosters.get(partner.id) ?? [];
    const send = mine.filter((p) => body.sendPlayerIds.includes(p.id));
    const receive = theirs.filter((p) => body.receivePlayerIds.includes(p.id));
    if (send.length !== body.sendPlayerIds.length || receive.length !== body.receivePlayerIds.length) {
      return badRequest("Some selected players are no longer on those rosters");
    }

    const sendIds = new Set(send.map((p) => p.id));
    const recvIds = new Set(receive.map((p) => p.id));
    const myBase = lineupTotal(slots, mine, week, projs);
    const myAfter = lineupTotal(slots, [...mine.filter((p) => !sendIds.has(p.id)), ...receive], week, projs);
    const theirBase = lineupTotal(slots, theirs, week, projs);
    const theirAfter = lineupTotal(slots, [...theirs.filter((p) => !recvIds.has(p.id)), ...send], week, projs);

    const valOf = (p: Player) => values.get(p.id)?.value ?? 0;
    const sendValue = send.reduce((s, p) => s + valOf(p), 0);
    const recvValue = receive.reduce((s, p) => s + valOf(p), 0);
    const partnerPpgDelta = round(theirAfter - theirBase, 2);
    const acceptanceProb = round(
      Math.max(
        0.02,
        Math.min(0.97, 1 / (1 + Math.exp(-((sendValue - recvValue) * 0.1 + partnerPpgDelta * 0.55))))
      ),
      3
    );

    const candidate = {
      partnerTeamId: partner.id,
      partnerName: partner.name,
      send,
      receive,
      myPpgDelta: round(myAfter - myBase, 2),
      partnerPpgDelta,
      myValueDelta: round(recvValue - sendValue, 1),
      partnerValueDelta: round(sendValue - recvValue, 1),
      acceptanceProb,
      champDelta: 0,
      playoffDelta: 0,
      confidence: 0.6,
      riskScore: 40,
      headline: `Acquire ${receive.map((p) => p.name).join(" + ")} for ${send.map((p) => p.name).join(" + ")}`,
      rationale: [
        `Manual offer built in the trade builder.`,
        `Your optimal lineup moves ${myBase.toFixed(1)} → ${myAfter.toFixed(1)} projected PPG.`,
        `${partner.name} moves ${theirBase.toFixed(1)} → ${theirAfter.toFixed(1)} — modelled acceptance ${(acceptanceProb * 100).toFixed(0)}%.`,
        `Value ledger: sending ${sendValue.toFixed(1)}, receiving ${recvValue.toFixed(1)}.`,
      ],
    };

    const status = body.autoSend ? "proposed" : "pending_approval";
    const tradeId = persistTrade(league, myTeam.id, candidate, status, "user");
    logDecision({
      leagueId: league.id,
      type: "trade",
      action: body.autoSend ? "trade_sent" : "trade_drafted",
      status: body.autoSend ? "executed" : "proposed",
      title: candidate.headline,
      summary: body.autoSend
        ? `Manual offer sent to ${partner.name}.`
        : `Manual offer saved as a draft awaiting approval.`,
      rationale: candidate.rationale,
      confidence: candidate.confidence,
      ppgDelta: candidate.myPpgDelta,
      relatedType: "trade",
      relatedId: tradeId,
    });
    logActivity({
      leagueId: league.id,
      kind: body.autoSend ? "trade_sent" : "trade_draft",
      actor: "user",
      message: `${body.autoSend ? "Sent" : "Drafted"} trade offer to ${partner.name}: ${candidate.headline}`,
      meta: { trade_id: tradeId },
    });
    return { tradeId, trade: expandTrades(league.id, week, "all").find((t) => t.id === tradeId) ?? null };
  });
}
