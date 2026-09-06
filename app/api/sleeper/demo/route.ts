import { readBody, withUser } from "@/lib/api";
import { createSimulatedLeague } from "@/lib/seed";
import { logActivity, runCycle } from "@/lib/agent";
import { saveSleeperAccount, getSleeperAccount } from "@/lib/sleeper";
import { hash32 } from "@/lib/ids";

/** One-click demo: build a full mid-season league so the app is alive instantly. */
export async function POST(req: Request) {
  return withUser(async (user) => {
    const body = await readBody<{ leagueName?: string; teamName?: string }>(req);
    if (!getSleeperAccount(user.id)) {
      const handle = user.email.split("@")[0];
      saveSleeperAccount(user.id, {
        sleeperUserId: `sim_${hash32(handle).toString(36)}`,
        username: handle,
        displayName: user.name,
        avatar: null,
        source: "simulated",
      });
    }
    const league = createSimulatedLeague({
      userId: user.id,
      name: body.leagueName || "Dynasty of Dysfunction",
      teamName: body.teamName || "Autonomous FC",
      ownerName: user.name,
      currentWeek: 7,
    });
    logActivity({
      leagueId: league.id,
      kind: "sync",
      actor: "system",
      message: `Demo league "${league.name}" generated with a full 12-team mid-season state`,
      detail: "Draft, six completed weeks, FAAB spend, injuries and a live sportsbook feed were simulated.",
    });
    runCycle(league.id, { trigger: "manual", force: true }).catch(() => {});
    return { league };
  });
}
