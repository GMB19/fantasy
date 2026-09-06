import { db } from "@/lib/db";
import { badRequest, readBody, withLeague } from "@/lib/api";
import { expandClaims, getMyTeam } from "@/lib/queries";
import { scanWaivers, submitClaim, freeAgents } from "@/lib/waivers";
import { getSettings, logActivity, logDecision } from "@/lib/agent";
import { enrichPlayers } from "@/lib/queries";
import type { Player } from "@/lib/types";

export async function GET(req: Request) {
  return withLeague(req, (_user, league) => {
    const url = new URL(req.url);
    const myTeam = getMyTeam(league.id);
    const fa = enrichPlayers(freeAgents(league.id), league.id, league.current_week)
      .sort((a, b) => b.model_pts - a.model_pts)
      .slice(0, 60);
    return {
      claims: expandClaims(league.id, league.current_week, url.searchParams.get("status") ?? "all"),
      freeAgents: fa,
      faab: myTeam ? { budget: myTeam.faab_budget, spent: myTeam.faab_spent, left: myTeam.faab_budget - myTeam.faab_spent } : null,
    };
  });
}

export async function POST(req: Request) {
  return withLeague(req, async (_user, league) => {
    const body = await readBody<{ addPlayerId: string; dropPlayerId?: string | null; bid?: number }>(req);
    const myTeam = getMyTeam(league.id);
    if (!myTeam) return badRequest("No team");
    const player = db.prepare(`SELECT * FROM players WHERE id = ?`).get(body.addPlayerId) as Player | undefined;
    if (!player) return badRequest("Player not found", 404);
    const taken = db.prepare(`SELECT 1 FROM rosters WHERE league_id = ? AND player_id = ?`).get(league.id, body.addPlayerId);
    if (taken) return badRequest("That player is already rostered");

    const dropPlayer = body.dropPlayerId
      ? (db.prepare(`SELECT * FROM players WHERE id = ?`).get(body.dropPlayerId) as Player | undefined) ?? null
      : null;
    const bid = Math.max(0, Number(body.bid ?? 1));
    const settings = getSettings(league.id);
    const targets = scanWaivers(league, settings, { limit: 25, simIterations: 250 });
    const modelled = targets.find((t) => t.player.id === body.addPlayerId);

    const claimId = submitClaim(
      league,
      myTeam.id,
      {
        player,
        dropPlayer,
        ppgDelta: modelled?.ppgDelta ?? 0,
        champDelta: modelled?.champDelta ?? 0,
        bid,
        maxBid: Math.ceil(bid * 1.3),
        confidence: modelled?.confidence ?? 0.5,
        headline: `Claim ${player.name} (${player.position} - ${player.nfl_team})${dropPlayer ? ` / drop ${dropPlayer.name}` : ""}`,
        rationale: modelled?.rationale ?? [
          `Manual claim submitted from the waiver wire at $${bid} FAAB.`,
          `The AI GM will still process this claim against simulated rival bids.`,
        ],
        competitionRisk: modelled?.competitionRisk ?? 50,
      },
      "user",
      1000 * 60 * 2
    );

    logDecision({
      leagueId: league.id,
      type: "waiver",
      action: "claim_submitted",
      status: "executed",
      title: `Manual claim: ${player.name} ($${bid})`,
      summary: `You submitted a waiver claim. It processes in ~2 minutes against simulated rival bids.`,
      rationale: modelled?.rationale ?? [],
      confidence: modelled?.confidence ?? 0.5,
      ppgDelta: modelled?.ppgDelta ?? 0,
      champDelta: modelled?.champDelta ?? 0,
      relatedType: "waiver_claim",
      relatedId: claimId,
    });
    logActivity({
      leagueId: league.id,
      kind: "waiver_submitted",
      actor: "user",
      message: `Submitted a $${bid} claim for ${player.name}`,
      meta: { claim_id: claimId },
    });
    return { claimId, claims: expandClaims(league.id, league.current_week, "all") };
  });
}
