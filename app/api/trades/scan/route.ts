import { withLeague, readBody } from "@/lib/api";
import { findTrades } from "@/lib/trades";
import { getSettings, logActivity } from "@/lib/agent";

export async function POST(req: Request) {
  return withLeague(req, async (_user, league) => {
    const body = await readBody<{ targetTeamId?: string; iterations?: number }>(req);
    const settings = getSettings(league.id);
    const candidates = findTrades(league, settings, {
      maxCandidates: 8,
      simIterations: body.iterations ?? 500,
      targetTeamId: body.targetTeamId,
    });
    logActivity({
      leagueId: league.id,
      kind: "trade_scan",
      message: `Trade scan complete — ${candidates.length} viable constructions surfaced`,
      detail: candidates[0]
        ? `Top target: ${candidates[0].headline} (+${candidates[0].champDelta.toFixed(2)}% title odds)`
        : "No trade cleared the acceptance-probability floor.",
    });
    return {
      candidates: candidates.map((c) => ({
        ...c,
        send: c.send.map((p) => ({ id: p.id, name: p.name, position: p.position, nfl_team: p.nfl_team, injury_status: p.injury_status })),
        receive: c.receive.map((p) => ({ id: p.id, name: p.name, position: p.position, nfl_team: p.nfl_team, injury_status: p.injury_status })),
      })),
    };
  });
}
