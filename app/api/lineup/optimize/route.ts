import { withLeague, readBody } from "@/lib/api";
import { autoSetLineups } from "@/lib/seed";
import { getLineupForWeek, getMyTeam } from "@/lib/queries";
import { logActivity, logDecision } from "@/lib/agent";

export async function POST(req: Request) {
  return withLeague(req, async (_user, league) => {
    const body = await readBody<{ teamId?: string }>(req);
    const teamId = body.teamId ?? getMyTeam(league.id)?.id;
    const before = teamId ? getLineupForWeek(league, teamId, league.current_week) : null;
    autoSetLineups(league, "ai");
    const after = teamId ? getLineupForWeek(league, teamId, league.current_week) : null;
    const gain = (after?.currentTotal ?? 0) - (before?.currentTotal ?? 0);
    if (gain > 0.01) {
      logDecision({
        leagueId: league.id,
        type: "lineup",
        action: "lineup_optimized",
        status: "executed",
        title: `Lineup optimised on request (+${gain.toFixed(2)} pts)`,
        summary: `Applied the model-optimal lineup for week ${league.current_week} using sportsbook-implied projections.`,
        rationale: [
          `Projected starting total ${(before?.currentTotal ?? 0).toFixed(1)} → ${(after?.currentTotal ?? 0).toFixed(1)}.`,
          `Players ruled OUT or on bye were excluded automatically.`,
        ],
        confidence: 0.9,
        ppgDelta: gain,
      });
      logActivity({
        leagueId: league.id,
        kind: "lineup",
        actor: "user",
        message: `Lineup optimised (+${gain.toFixed(2)} projected pts)`,
      });
    }
    return { lineup: after, gain };
  });
}
