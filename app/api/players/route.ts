import { db } from "@/lib/db";
import { badRequest, readBody, withLeague } from "@/lib/api";
import { getMarket } from "@/lib/queries";
import { id, now } from "@/lib/ids";
import { BYE_WEEKS } from "@/lib/nfl-data";
import { refreshPlayerValues, refreshProjections } from "@/lib/projections";
import { weeksToProject } from "@/lib/seed";
import { logActivity } from "@/lib/agent";

export async function GET(req: Request) {
  return withLeague(req, (_user, league) => {
    const url = new URL(req.url);
    return {
      players: getMarket(league.id, league.current_week, {
        position: url.searchParams.get("position") ?? "ALL",
        availability: url.searchParams.get("availability") ?? "all",
        search: url.searchParams.get("search") ?? "",
        sort: url.searchParams.get("sort") ?? "value",
        limit: Number(url.searchParams.get("limit") ?? 80),
      }),
    };
  });
}

/** Create a custom player (e.g. a practice-squad callup the feed hasn't picked up). */
export async function POST(req: Request) {
  return withLeague(req, async (_user, league) => {
    const body = await readBody<any>(req);
    if (!body.name?.trim() || !body.position || !body.nfl_team) {
      return badRequest("Name, position and NFL team are required");
    }
    const playerId = id("plr");
    db.prepare(
      `INSERT INTO players (id, sleeper_player_id, name, position, nfl_team, age, years_exp, jersey, status,
        injury_status, injury_note, bye_week, depth_chart_order, adp, consensus_rank, snap_pct, target_share,
        route_pct, touches_pg, targets_pg, red_zone_share, sleeper_ppg, season_ppg, last3_ppg, is_custom, updated_at)
       VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,1,?)`
    ).run(
      playerId,
      `custom_${playerId}`,
      body.name.trim(),
      body.position,
      body.nfl_team,
      Number(body.age) || 25,
      Number(body.years_exp) || 1,
      Number(body.jersey) || 0,
      "Active",
      body.injury_status || null,
      body.injury_note || null,
      BYE_WEEKS[body.nfl_team] ?? 0,
      Number(body.depth_chart_order) || 2,
      Number(body.adp) || 240,
      Number(body.consensus_rank) || 280,
      Number(body.snap_pct) || 35,
      Number(body.target_share) || 8,
      Number(body.route_pct) || 40,
      Number(body.touches_pg) || 4,
      Number(body.targets_pg) || 3,
      Number(body.red_zone_share) || 8,
      Number(body.season_ppg) || 6,
      Number(body.season_ppg) || 6,
      Number(body.last3_ppg) || Number(body.season_ppg) || 6,
      now()
    );
    refreshProjections(weeksToProject(league));
    refreshPlayerValues(league.id, league.current_week);
    logActivity({
      leagueId: league.id,
      kind: "player_created",
      actor: "user",
      message: `Added custom player ${body.name} (${body.position} - ${body.nfl_team}) to the player pool`,
    });
    return { player: db.prepare(`SELECT * FROM players WHERE id = ?`).get(playerId) };
  });
}
