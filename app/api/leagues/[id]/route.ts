import { db } from "@/lib/db";
import { badRequest, readBody, withUser } from "@/lib/api";
import { logActivity } from "@/lib/agent";
import type { League } from "@/lib/types";

async function loadLeague(userId: string, id: string) {
  return db.prepare(`SELECT * FROM leagues WHERE id = ? AND user_id = ?`).get(id, userId) as League | undefined;
}

export async function PATCH(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  return withUser(async (user) => {
    const league = await loadLeague(user.id, id);
    if (!league) return badRequest("League not found", 404);
    const body = await readBody<Partial<League> & { activate?: boolean }>(req);

    if (body.activate) {
      db.prepare(`UPDATE leagues SET is_active = 0 WHERE user_id = ?`).run(user.id);
      db.prepare(`UPDATE leagues SET is_active = 1 WHERE id = ?`).run(id);
    }
    const fields: string[] = [];
    const params: any[] = [];
    for (const key of ["name", "scoring_type", "playoff_teams", "playoff_week_start", "current_week", "regular_season_weeks", "faab_budget", "status"] as const) {
      if (body[key] !== undefined) {
        fields.push(`${key} = ?`);
        params.push(body[key]);
      }
    }
    if (fields.length) {
      params.push(id);
      db.prepare(`UPDATE leagues SET ${fields.join(", ")} WHERE id = ?`).run(...params);
      logActivity({
        leagueId: id,
        kind: "league_updated",
        actor: "user",
        message: `League settings updated`,
        detail: fields.map((f) => f.replace(" = ?", "")).join(", "),
      });
    }
    return { league: await loadLeague(user.id, id) };
  });
}

export async function DELETE(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  return withUser(async (user) => {
    const league = await loadLeague(user.id, id);
    if (!league) return badRequest("League not found", 404);
    db.prepare(`DELETE FROM leagues WHERE id = ?`).run(id);
    const next = db.prepare(`SELECT id FROM leagues WHERE user_id = ? LIMIT 1`).get(user.id) as { id: string } | undefined;
    if (next) db.prepare(`UPDATE leagues SET is_active = 1 WHERE id = ?`).run(next.id);
    return { ok: true, activeLeagueId: next?.id ?? null };
  });
}
