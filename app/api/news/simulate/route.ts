import { withLeague } from "@/lib/api";
import { generateNewsEvent, setAiTake } from "@/lib/agent-news";
import { logActivity } from "@/lib/agent";
import { db } from "@/lib/db";

/** Force a breaking-news event so you can watch the GM react in real time. */
export async function POST(req: Request) {
  return withLeague(req, async (_user, league) => {
    const news = generateNewsEvent(league);
    if (!news) return { news: null };
    const rostered = db
      .prepare(`SELECT t.name, t.is_user_team FROM rosters r JOIN teams t ON t.id = r.team_id WHERE r.league_id = ? AND r.player_id = ?`)
      .get(league.id, news.player?.id ?? "") as { name: string; is_user_team: number } | undefined;
    const take = rostered
      ? `${news.player?.name} is rostered by ${rostered.is_user_team ? "you" : rostered.name}. Value impact ${news.item.value_delta >= 0 ? "+" : ""}${news.item.value_delta.toFixed(1)}; models re-scored.`
      : `${news.player?.name} is a free agent — added to the waiver scan queue.`;
    setAiTake(news.item.id, take);
    logActivity({
      leagueId: league.id,
      kind: "news",
      message: news.item.headline,
      detail: take,
    });
    return { news: news.item, take };
  });
}
