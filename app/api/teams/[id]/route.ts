import { db } from "@/lib/db";
import { badRequest, readBody, withUser } from "@/lib/api";
import { logActivity } from "@/lib/agent";
import type { Team } from "@/lib/types";

export async function PATCH(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  return withUser(async (user) => {
    const team = db
      .prepare(
        `SELECT t.* FROM teams t JOIN leagues l ON l.id = t.league_id WHERE t.id = ? AND l.user_id = ?`
      )
      .get(id, user.id) as Team | undefined;
    if (!team) return badRequest("Team not found", 404);
    const body = await readBody<Partial<Team>>(req);
    const fields: string[] = [];
    const params: any[] = [];
    for (const key of ["name", "owner_name", "gm_persona", "wins", "losses", "ties", "points_for", "points_against", "faab_budget", "faab_spent", "waiver_position"] as const) {
      if (body[key] !== undefined) {
        fields.push(`${key} = ?`);
        params.push(body[key]);
      }
    }
    if (!fields.length) return badRequest("Nothing to update");
    params.push(id);
    db.prepare(`UPDATE teams SET ${fields.join(", ")} WHERE id = ?`).run(...params);
    logActivity({
      leagueId: team.league_id,
      kind: "team_updated",
      actor: "user",
      message: `Updated ${team.name}`,
      detail: fields.map((f) => f.replace(" = ?", "")).join(", "),
    });
    return { team: db.prepare(`SELECT * FROM teams WHERE id = ?`).get(id) };
  });
}
