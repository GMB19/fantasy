import { withLeague, readBody } from "@/lib/api";
import { scanWaivers } from "@/lib/waivers";
import { getSettings, logActivity } from "@/lib/agent";

export async function POST(req: Request) {
  return withLeague(req, async (_user, league) => {
    const body = await readBody<{ iterations?: number }>(req);
    const settings = getSettings(league.id);
    const targets = scanWaivers(league, settings, { limit: 12, simIterations: body.iterations ?? 400 });
    logActivity({
      leagueId: league.id,
      kind: "waiver_scan",
      message: `Waiver scan complete — ${targets.length} adds improve the starting lineup`,
      detail: targets[0] ? `Top target: ${targets[0].player.name} (+${targets[0].ppgDelta.toFixed(2)} PPG)` : "No free agent beats the current roster.",
    });
    return {
      targets: targets.map((t) => ({
        ...t,
        player: {
          id: t.player.id,
          name: t.player.name,
          position: t.player.position,
          nfl_team: t.player.nfl_team,
          injury_status: t.player.injury_status,
          snap_pct: t.player.snap_pct,
          targets_pg: t.player.targets_pg,
          touches_pg: t.player.touches_pg,
        },
        dropPlayer: t.dropPlayer
          ? { id: t.dropPlayer.id, name: t.dropPlayer.name, position: t.dropPlayer.position, nfl_team: t.dropPlayer.nfl_team }
          : null,
      })),
    };
  });
}
