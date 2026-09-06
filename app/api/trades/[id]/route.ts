import { db } from "@/lib/db";
import { badRequest, readBody, withUser } from "@/lib/api";
import { executeTrade } from "@/lib/trades";
import { autoSetLineups } from "@/lib/seed";
import { logActivity, logDecision, notify } from "@/lib/agent";
import { expandTrades } from "@/lib/queries";
import { now } from "@/lib/ids";
import type { League } from "@/lib/types";

export async function PATCH(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  return withUser(async (user) => {
    const trade = db.prepare(`SELECT * FROM trades WHERE id = ?`).get(id) as any;
    if (!trade) return badRequest("Trade not found", 404);
    const league = db.prepare(`SELECT * FROM leagues WHERE id = ? AND user_id = ?`).get(trade.league_id, user.id) as League | undefined;
    if (!league) return badRequest("Trade not found", 404);
    const body = await readBody<{ action: string; note?: string }>(req);

    switch (body.action) {
      case "approve": {
        db.prepare(`UPDATE trades SET status = 'proposed', sent_at = ?, expires_at = ? WHERE id = ?`).run(
          now(),
          now() + 1000 * 60 * 60 * 36,
          id
        );
        logDecision({
          leagueId: league.id,
          type: "trade",
          action: "trade_sent",
          status: "executed",
          title: `Approved and sent: ${trade.headline}`,
          summary: `You approved the AI-built offer. It is now live with the partner GM.`,
          rationale: JSON.parse(trade.rationale || "[]"),
          confidence: trade.confidence,
          ppgDelta: trade.ppg_delta,
          champDelta: trade.champ_delta,
          relatedType: "trade",
          relatedId: id,
        });
        logActivity({ leagueId: league.id, kind: "trade_sent", actor: "user", message: `Approved trade offer: ${trade.headline}` });
        break;
      }
      case "reject":
      case "cancel": {
        db.prepare(`UPDATE trades SET status = 'cancelled', resolved_at = ?, response_note = ? WHERE id = ?`).run(
          now(),
          body.note ?? "Cancelled by you",
          id
        );
        logDecision({
          leagueId: league.id,
          type: "trade",
          action: "trade_cancelled",
          status: "skipped",
          title: `Cancelled: ${trade.headline}`,
          summary: body.note ?? "You cancelled this offer. The model will avoid re-proposing the same package this cycle.",
          rationale: JSON.parse(trade.rationale || "[]"),
          relatedType: "trade",
          relatedId: id,
        });
        logActivity({ leagueId: league.id, kind: "trade_cancelled", actor: "user", message: `Cancelled trade: ${trade.headline}` });
        break;
      }
      case "force_accept": {
        executeTrade(id);
        db.prepare(`UPDATE trades SET response_note = ? WHERE id = ?`).run("Executed manually", id);
        autoSetLineups(league, "ai");
        logDecision({
          leagueId: league.id,
          type: "trade",
          action: "trade_accepted",
          status: "executed",
          title: `Trade executed: ${trade.headline}`,
          summary: `Rosters swapped and the lineup was re-optimised around the new pieces.`,
          rationale: JSON.parse(trade.rationale || "[]"),
          ppgDelta: trade.ppg_delta,
          champDelta: trade.champ_delta,
          relatedType: "trade",
          relatedId: id,
        });
        logActivity({ leagueId: league.id, kind: "trade_accepted", actor: "user", message: `Executed trade: ${trade.headline}` });
        notify({
          userId: user.id,
          leagueId: league.id,
          type: "trade_accepted",
          title: "Trade executed",
          body: trade.headline,
          link: "/dashboard/trades",
        });
        break;
      }
      default:
        return badRequest("Unknown action");
    }

    const updated = expandTrades(league.id, league.current_week, "all").find((t) => t.id === id);
    return { trade: updated ?? null };
  });
}

export async function DELETE(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  return withUser(async (user) => {
    const trade = db.prepare(`SELECT * FROM trades WHERE id = ?`).get(id) as any;
    if (!trade) return badRequest("Trade not found", 404);
    const league = db.prepare(`SELECT * FROM leagues WHERE id = ? AND user_id = ?`).get(trade.league_id, user.id);
    if (!league) return badRequest("Trade not found", 404);
    db.prepare(`DELETE FROM trades WHERE id = ?`).run(id);
    return { ok: true };
  });
}
