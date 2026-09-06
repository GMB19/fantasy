import { db } from "@/lib/db";
import { badRequest, readBody, withUser } from "@/lib/api";
import { enrichPlayers, getLeague } from "@/lib/queries";
import { projectionFor, propsFor, refreshPlayerValues, refreshProjections, rosPpg } from "@/lib/projections";
import { weeksToProject } from "@/lib/seed";
import { logActivity } from "@/lib/agent";
import { now } from "@/lib/ids";
import type { Player } from "@/lib/types";

export async function GET(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id: playerId } = await ctx.params;
  return withUser(async (user) => {
    const url = new URL(req.url);
    const league = getLeague(user.id, url.searchParams.get("leagueId"));
    if (!league) return badRequest("No league", 404);
    const player = db.prepare(`SELECT * FROM players WHERE id = ?`).get(playerId) as Player | undefined;
    if (!player) return badRequest("Player not found", 404);
    const week = league.current_week;
    const [card] = enrichPlayers([player], league.id, week);
    const weeks = weeksToProject(league).map((w) => ({
      week: w,
      projection: projectionFor(playerId, w) ?? null,
      props: propsFor(playerId, w),
    }));
    const news = db
      .prepare(`SELECT * FROM news_items WHERE player_id = ? ORDER BY published_at DESC LIMIT 10`)
      .all(playerId);
    return { player: card, rosPpg: rosPpg(player, week), weeks, news };
  });
}

export async function PATCH(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id: playerId } = await ctx.params;
  return withUser(async (user) => {
    const body = await readBody<any>(req);
    const league = getLeague(user.id, body.leagueId);
    const player = db.prepare(`SELECT * FROM players WHERE id = ?`).get(playerId) as Player | undefined;
    if (!player) return badRequest("Player not found", 404);
    const fields: string[] = [];
    const params: any[] = [];
    for (const key of [
      "name", "position", "nfl_team", "age", "status", "injury_status", "injury_note", "bye_week",
      "depth_chart_order", "adp", "consensus_rank", "snap_pct", "target_share", "route_pct",
      "touches_pg", "targets_pg", "red_zone_share", "season_ppg", "last3_ppg", "sleeper_ppg",
    ] as const) {
      if (body[key] !== undefined) {
        fields.push(`${key} = ?`);
        params.push(body[key] === "" ? null : body[key]);
      }
    }
    if (!fields.length) return badRequest("Nothing to update");
    params.push(now(), playerId);
    db.prepare(`UPDATE players SET ${fields.join(", ")}, updated_at = ? WHERE id = ?`).run(...params);
    if (league) {
      refreshProjections(weeksToProject(league));
      refreshPlayerValues(league.id, league.current_week);
      logActivity({
        leagueId: league.id,
        kind: "player_updated",
        actor: "user",
        message: `Updated ${player.name} — ${fields.map((f) => f.replace(" = ?", "")).join(", ")}`,
        detail: "Projections and player values were recomputed against the sportsbook feed.",
      });
    }
    return { player: db.prepare(`SELECT * FROM players WHERE id = ?`).get(playerId) };
  });
}

export async function DELETE(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id: playerId } = await ctx.params;
  return withUser(async () => {
    const player = db.prepare(`SELECT * FROM players WHERE id = ?`).get(playerId) as Player | undefined;
    if (!player) return badRequest("Player not found", 404);
    if (!player.is_custom) return badRequest("Only custom players can be deleted from the pool");
    db.prepare(`DELETE FROM players WHERE id = ?`).run(playerId);
    return { ok: true };
  });
}
