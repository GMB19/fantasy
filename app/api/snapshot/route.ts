import { withUser } from "@/lib/api";
import { getSnapshot, getLeagues } from "@/lib/queries";
import { getSleeperAccount } from "@/lib/sleeper";

export async function GET(req: Request) {
  return withUser((user) => {
    const url = new URL(req.url);
    const snapshot = getSnapshot(user.id, url.searchParams.get("leagueId"));
    return {
      user,
      account: getSleeperAccount(user.id) ?? null,
      leagues: getLeagues(user.id),
      snapshot,
      serverTime: Date.now(),
    };
  });
}
