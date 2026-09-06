import { withLeague } from "@/lib/api";
import { getMarket } from "@/lib/queries";

export async function GET(req: Request) {
  return withLeague(req, (_user, league) => {
    const url = new URL(req.url);
    const players = getMarket(league.id, league.current_week, {
      position: url.searchParams.get("position") ?? "ALL",
      availability: url.searchParams.get("availability") ?? "all",
      search: url.searchParams.get("search") ?? "",
      sort: url.searchParams.get("sort") ?? "value",
      limit: Number(url.searchParams.get("limit") ?? 100),
    });
    const buyLow = getMarket(league.id, league.current_week, { availability: "buy_low", limit: 8 });
    const sellHigh = getMarket(league.id, league.current_week, { availability: "sell_high", limit: 8 });
    const risers = getMarket(league.id, league.current_week, { sort: "trend", limit: 200 })
      .filter((p) => p.trend_7d > 0)
      .slice(0, 8);
    const fallers = getMarket(league.id, league.current_week, { sort: "trend", limit: 400 })
      .filter((p) => p.trend_7d < 0)
      .sort((a, b) => a.trend_7d - b.trend_7d)
      .slice(0, 8);
    const discrepancies = getMarket(league.id, league.current_week, { sort: "discrepancy", limit: 400 })
      .filter((p) => Math.abs(p.discrepancy) > 0.5)
      .slice(0, 12);
    return { players, buyLow, sellHigh, risers, fallers, discrepancies };
  });
}
