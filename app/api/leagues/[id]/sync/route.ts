import { db } from "@/lib/db";
import { badRequest, withUser } from "@/lib/api";
import { logActivity, runCycle } from "@/lib/agent";
import { refreshPlayerValues, refreshProjections } from "@/lib/projections";
import { weeksToProject } from "@/lib/seed";
import { syncLeagueTimestamp } from "@/lib/sleeper";
import type { League } from "@/lib/types";

export async function POST(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  return withUser(async (user) => {
    const league = db.prepare(`SELECT * FROM leagues WHERE id = ? AND user_id = ?`).get(id, user.id) as League | undefined;
    if (!league) return badRequest("League not found", 404);
    refreshProjections(weeksToProject(league));
    refreshPlayerValues(league.id, league.current_week);
    syncLeagueTimestamp(league.id);
    logActivity({
      leagueId: league.id,
      kind: "sync",
      actor: "user",
      message: `Manual Sleeper sync completed`,
      detail: `Rosters, injuries and the sportsbook feed were refreshed for week ${league.current_week}.`,
    });
    const report = await runCycle(league.id, { trigger: "manual", force: true });
    return { ok: true, report };
  });
}
