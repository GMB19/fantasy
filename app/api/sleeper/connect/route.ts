import { withUser, readBody, badRequest } from "@/lib/api";
import { listSleeperLeagues, lookupSleeperUser, saveSleeperAccount } from "@/lib/sleeper";
import { getLeagues } from "@/lib/queries";

export async function POST(req: Request) {
  return withUser(async (user) => {
    const { username } = await readBody<{ username: string }>(req);
    if (!username?.trim()) return badRequest("Enter your Sleeper username");
    const result = await lookupSleeperUser(username);
    const account = saveSleeperAccount(user.id, result);
    const leagues = await listSleeperLeagues(result.sleeperUserId);
    const existing = getLeagues(user.id);
    const importedIds = new Set(existing.map((l) => l.sleeper_league_id));
    return {
      account,
      note: result.note ?? null,
      leagues: leagues.map((l) => ({ ...l, imported: importedIds.has(l.league_id) })),
    };
  });
}
