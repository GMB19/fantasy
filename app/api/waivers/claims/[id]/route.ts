import { db } from "@/lib/db";
import { badRequest, readBody, withUser } from "@/lib/api";
import { processDueClaims } from "@/lib/waivers";
import { logActivity } from "@/lib/agent";
import { expandClaims } from "@/lib/queries";
import { now } from "@/lib/ids";
import type { League } from "@/lib/types";

export async function PATCH(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  return withUser(async (user) => {
    const claim = db.prepare(`SELECT * FROM waiver_claims WHERE id = ?`).get(id) as any;
    if (!claim) return badRequest("Claim not found", 404);
    const league = db.prepare(`SELECT * FROM leagues WHERE id = ? AND user_id = ?`).get(claim.league_id, user.id) as League | undefined;
    if (!league) return badRequest("Claim not found", 404);
    const body = await readBody<{ action?: string; bid?: number; dropPlayerId?: string | null }>(req);

    if (body.action === "cancel") {
      db.prepare(`UPDATE waiver_claims SET status = 'cancelled', resolved_at = ? WHERE id = ?`).run(now(), id);
      logActivity({ leagueId: league.id, kind: "waiver_cancelled", actor: "user", message: `Cancelled waiver claim: ${claim.headline}` });
    } else if (body.action === "process_now") {
      db.prepare(`UPDATE waiver_claims SET process_at = ? WHERE id = ?`).run(now() - 1, id);
      processDueClaims(league);
    } else {
      const fields: string[] = [];
      const params: any[] = [];
      if (body.bid !== undefined) {
        fields.push("bid = ?");
        params.push(Math.max(0, Number(body.bid)));
      }
      if (body.dropPlayerId !== undefined) {
        fields.push("drop_player_id = ?");
        params.push(body.dropPlayerId || null);
      }
      if (!fields.length) return badRequest("Nothing to update");
      params.push(id);
      db.prepare(`UPDATE waiver_claims SET ${fields.join(", ")} WHERE id = ?`).run(...params);
      logActivity({ leagueId: league.id, kind: "waiver_updated", actor: "user", message: `Updated waiver claim: ${claim.headline}` });
    }

    return { claims: expandClaims(league.id, league.current_week, "all") };
  });
}

export async function DELETE(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  return withUser(async (user) => {
    const claim = db.prepare(`SELECT * FROM waiver_claims WHERE id = ?`).get(id) as any;
    if (!claim) return badRequest("Claim not found", 404);
    const league = db.prepare(`SELECT * FROM leagues WHERE id = ? AND user_id = ?`).get(claim.league_id, user.id);
    if (!league) return badRequest("Claim not found", 404);
    db.prepare(`DELETE FROM waiver_claims WHERE id = ?`).run(id);
    return { ok: true };
  });
}
