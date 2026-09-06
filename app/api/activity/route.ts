import { withLeague } from "@/lib/api";
import { getActivity } from "@/lib/queries";

export async function GET(req: Request) {
  return withLeague(req, (_user, league) => {
    const url = new URL(req.url);
    return {
      activity: getActivity(
        league.id,
        Number(url.searchParams.get("limit") ?? 80),
        url.searchParams.get("kind") ?? "all"
      ),
    };
  });
}
