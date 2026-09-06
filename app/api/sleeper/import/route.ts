import { badRequest, readBody, withUser } from "@/lib/api";
import { getSleeperAccount, importSleeperLeague, listSleeperLeagues } from "@/lib/sleeper";
import { runCycle, logActivity } from "@/lib/agent";

export async function POST(req: Request) {
  return withUser(async (user) => {
    const body = await readBody<{ sleeperLeagueId: string; teamName?: string }>(req);
    const account = getSleeperAccount(user.id);
    if (!account) return badRequest("Connect your Sleeper account first");
    const available = await listSleeperLeagues(account.sleeper_user_id);
    const summary = available.find((l) => l.league_id === body.sleeperLeagueId) ?? available[0];
    if (!summary) return badRequest("League not found on that Sleeper account");

    const league = await importSleeperLeague(user.id, account, summary, { teamName: body.teamName });
    logActivity({
      leagueId: league.id,
      kind: "sync",
      actor: "system",
      message: `Imported ${league.name} from Sleeper (${league.source === "live" ? "live API" : "simulation feed"})`,
      detail: `${league.total_rosters} teams · ${league.scoring_type.toUpperCase()} · week ${league.current_week}`,
    });
    runCycle(league.id, { trigger: "manual", force: true }).catch(() => {});
    return { league };
  });
}
