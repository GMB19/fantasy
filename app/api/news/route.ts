import { withLeague } from "@/lib/api";
import { recentNews } from "@/lib/agent-news";

export async function GET(req: Request) {
  return withLeague(req, (_user, league) => {
    const url = new URL(req.url);
    const category = url.searchParams.get("category") ?? "all";
    let news = recentNews(league.id, Number(url.searchParams.get("limit") ?? 60));
    if (category !== "all") news = news.filter((n) => n.category === category);
    return { news };
  });
}
