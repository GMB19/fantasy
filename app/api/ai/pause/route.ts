import { db } from "@/lib/db";
import { readBody, withLeague } from "@/lib/api";
import { getSettings, logActivity } from "@/lib/agent";
import { now } from "@/lib/ids";

export async function POST(req: Request) {
  return withLeague(req, async (_user, league) => {
    const body = await readBody<{ minutes?: number; resume?: boolean }>(req);
    if (body.resume) {
      db.prepare(`UPDATE ai_settings SET paused_until = NULL, updated_at = ? WHERE league_id = ?`).run(now(), league.id);
      logActivity({ leagueId: league.id, kind: "ai_resumed", actor: "user", message: "AI GM resumed — autonomous cycles are live again" });
    } else {
      const until = now() + Math.max(1, Number(body.minutes ?? 60)) * 60_000;
      db.prepare(`UPDATE ai_settings SET paused_until = ?, updated_at = ? WHERE league_id = ?`).run(until, now(), league.id);
      logActivity({
        leagueId: league.id,
        kind: "ai_paused",
        actor: "user",
        message: `AI GM paused for ${body.minutes ?? 60} minutes`,
      });
    }
    return { settings: getSettings(league.id) };
  });
}
