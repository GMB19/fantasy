import { badRequest, readBody, withUser } from "@/lib/api";
import { getLeagues } from "@/lib/queries";
import { createSimulatedLeague } from "@/lib/seed";
import { logActivity, runCycle } from "@/lib/agent";

export async function GET() {
  return withUser((user) => ({ leagues: getLeagues(user.id) }));
}

export async function POST(req: Request) {
  return withUser(async (user) => {
    const body = await readBody<{
      name?: string;
      teamName?: string;
      totalRosters?: number;
      scoringType?: string;
      currentWeek?: number;
    }>(req);
    if (!body.name?.trim()) return badRequest("League name is required");
    const league = createSimulatedLeague({
      userId: user.id,
      name: body.name.trim(),
      teamName: body.teamName?.trim() || "Autonomous FC",
      ownerName: user.name,
      totalRosters: Math.min(14, Math.max(8, Number(body.totalRosters) || 12)),
      scoringType: body.scoringType || "ppr",
      currentWeek: Math.min(14, Math.max(1, Number(body.currentWeek) || 7)),
    });
    logActivity({
      leagueId: league.id,
      kind: "league_created",
      actor: "user",
      message: `Created league "${league.name}"`,
      detail: `${league.total_rosters} teams · ${league.scoring_type.toUpperCase()}`,
    });
    runCycle(league.id, { trigger: "manual", force: true }).catch(() => {});
    return { league };
  });
}
