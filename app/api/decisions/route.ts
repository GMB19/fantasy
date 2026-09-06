import { withLeague } from "@/lib/api";
import { getDecisions, withParsedDecision } from "@/lib/queries";

export async function GET(req: Request) {
  return withLeague(req, (_user, league) => {
    const url = new URL(req.url);
    return {
      decisions: getDecisions(
        league.id,
        Number(url.searchParams.get("limit") ?? 50),
        url.searchParams.get("type") ?? "all"
      ).map(withParsedDecision),
    };
  });
}
