import { db } from "@/lib/db";
import { readBody, withLeague } from "@/lib/api";
import { getSettings, logActivity, logDecision } from "@/lib/agent";
import { now } from "@/lib/ids";
import type { AISettings } from "@/lib/types";

export async function GET(req: Request) {
  return withLeague(req, (_user, league) => ({ settings: getSettings(league.id) }));
}

const NUMERIC_KEYS = [
  "risk_tolerance", "aggressiveness", "max_daily_transactions", "min_champ_improvement",
  "max_faab_pct", "book_weight", "consensus_weight", "sleeper_weight", "scan_interval_sec",
] as const;
const BOOL_KEYS = [
  "autonomous_mode", "require_trade_approval", "waiver_automation", "lineup_automation", "news_monitoring",
] as const;

export async function PATCH(req: Request) {
  return withLeague(req, async (_user, league) => {
    const body = await readBody<Partial<AISettings> & { protectedPlayerIds?: string[] }>(req);
    const before = getSettings(league.id);
    const fields: string[] = [];
    const params: any[] = [];

    for (const key of BOOL_KEYS) {
      if (body[key] !== undefined) {
        fields.push(`${key} = ?`);
        params.push(body[key] ? 1 : 0);
      }
    }
    for (const key of NUMERIC_KEYS) {
      if (body[key] !== undefined) {
        fields.push(`${key} = ?`);
        params.push(Number(body[key]));
      }
    }
    if (body.strategy !== undefined) {
      fields.push(`strategy = ?`);
      params.push(body.strategy);
    }
    if (body.protectedPlayerIds !== undefined) {
      fields.push(`protected_player_ids = ?`);
      params.push(JSON.stringify(body.protectedPlayerIds));
    }
    if (body.paused_until !== undefined) {
      fields.push(`paused_until = ?`);
      params.push(body.paused_until);
    }
    if (fields.length) {
      params.push(now(), league.id);
      db.prepare(`UPDATE ai_settings SET ${fields.join(", ")}, updated_at = ? WHERE league_id = ?`).run(...params);
    }

    const after = getSettings(league.id);
    const changes = Object.keys(after)
      .filter((k) => (before as any)[k] !== (after as any)[k] && k !== "updated_at")
      .map((k) => `${k.replace(/_/g, " ")}: ${(before as any)[k]} → ${(after as any)[k]}`);

    if (changes.length) {
      logDecision({
        leagueId: league.id,
        type: "settings",
        action: "settings_updated",
        status: "executed",
        title: "AI GM configuration updated",
        summary: `${changes.length} control${changes.length > 1 ? "s" : ""} changed. The next cycle uses the new limits immediately.`,
        rationale: changes,
        confidence: 1,
      });
      logActivity({
        leagueId: league.id,
        kind: "settings",
        actor: "user",
        message: `Updated AI GM controls`,
        detail: changes.join(" · "),
      });
    }
    return { settings: after };
  });
}
