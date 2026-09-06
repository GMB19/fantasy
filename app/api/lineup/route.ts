import { db } from "@/lib/db";
import { badRequest, readBody, withLeague } from "@/lib/api";
import { getLineupForWeek, getMyTeam } from "@/lib/queries";
import { id, now } from "@/lib/ids";
import { logActivity } from "@/lib/agent";

export async function GET(req: Request) {
  return withLeague(req, (_user, league) => {
    const url = new URL(req.url);
    const week = Number(url.searchParams.get("week") ?? league.current_week);
    const teamId = url.searchParams.get("teamId") ?? getMyTeam(league.id)?.id;
    if (!teamId) return badRequest("No team");
    return { week, lineup: getLineupForWeek(league, teamId, week) };
  });
}

/** Manually set a slot (drag/drop or swap in the lineup UI). */
export async function POST(req: Request) {
  return withLeague(req, async (_user, league) => {
    const body = await readBody<{
      week?: number;
      teamId?: string;
      slot: string;
      slotIndex: number;
      playerId: string | null;
    }>(req);
    const week = body.week ?? league.current_week;
    const teamId = body.teamId ?? getMyTeam(league.id)?.id;
    if (!teamId) return badRequest("No team");
    if (body.slot === undefined || body.slotIndex === undefined) return badRequest("Slot required");

    const run = db.transaction(() => {
      if (body.playerId) {
        // if the player is already in another slot this week, clear that slot
        db.prepare(`UPDATE lineups SET player_id = NULL, set_by = 'user', updated_at = ? WHERE team_id = ? AND week = ? AND player_id = ?`).run(
          now(),
          teamId,
          week,
          body.playerId
        );
      }
      db.prepare(
        `INSERT INTO lineups (id, league_id, team_id, week, slot, slot_index, player_id, locked, set_by, updated_at)
         VALUES (?,?,?,?,?,?,?,0,'user',?)
         ON CONFLICT(team_id, week, slot, slot_index) DO UPDATE SET player_id = excluded.player_id, set_by = 'user', updated_at = excluded.updated_at`
      ).run(id("ln"), league.id, teamId, week, body.slot, body.slotIndex, body.playerId, now());

      const starters = db
        .prepare(`SELECT player_id FROM lineups WHERE team_id = ? AND week = ? AND player_id IS NOT NULL`)
        .all(teamId, week) as { player_id: string }[];
      const startingIds = new Set(starters.map((s) => s.player_id));
      const roster = db.prepare(`SELECT player_id FROM rosters WHERE team_id = ?`).all(teamId) as { player_id: string }[];
      for (const r of roster) {
        db.prepare(`UPDATE rosters SET slot_status = ? WHERE team_id = ? AND player_id = ?`).run(
          startingIds.has(r.player_id) ? "starter" : "bench",
          teamId,
          r.player_id
        );
      }
    });
    run();

    logActivity({
      leagueId: league.id,
      kind: "lineup_manual",
      actor: "user",
      message: `Manual lineup change in week ${week}`,
      detail: `${body.slot} slot updated`,
    });
    return { lineup: getLineupForWeek(league, teamId, week) };
  });
}
