import { db } from "@/lib/db";
import { badRequest, readBody, withLeague } from "@/lib/api";
import { addPlayer, dropPlayer } from "@/lib/waivers";
import { autoSetLineups } from "@/lib/seed";
import { logActivity } from "@/lib/agent";
import type { Player, Team } from "@/lib/types";

export async function POST(req: Request) {
  return withLeague(req, async (_user, league) => {
    const body = await readBody<{ action: "add" | "drop" | "move"; playerId: string; teamId?: string }>(req);
    const myTeam = db.prepare(`SELECT * FROM teams WHERE league_id = ? AND is_user_team = 1`).get(league.id) as Team | undefined;
    const teamId = body.teamId ?? myTeam?.id;
    if (!teamId) return badRequest("No team");
    const player = db.prepare(`SELECT * FROM players WHERE id = ?`).get(body.playerId) as Player | undefined;
    if (!player) return badRequest("Player not found", 404);

    if (body.action === "add") {
      const ok = addPlayer(league.id, teamId, body.playerId, "free_agent");
      if (!ok) return badRequest("Player is already rostered in this league");
      logActivity({
        leagueId: league.id,
        kind: "roster_add",
        actor: "user",
        message: `Added ${player.name} (${player.position} - ${player.nfl_team}) as a free agent`,
      });
    } else if (body.action === "drop") {
      const ok = dropPlayer(league.id, teamId, body.playerId);
      if (!ok) return badRequest("Player is not on that roster");
      logActivity({
        leagueId: league.id,
        kind: "roster_drop",
        actor: "user",
        message: `Dropped ${player.name} (${player.position} - ${player.nfl_team})`,
      });
    } else if (body.action === "move") {
      db.prepare(`UPDATE rosters SET team_id = ? WHERE league_id = ? AND player_id = ?`).run(teamId, league.id, body.playerId);
      logActivity({
        leagueId: league.id,
        kind: "roster_move",
        actor: "user",
        message: `Moved ${player.name} to a different roster`,
      });
    }
    autoSetLineups(league, "ai");
    return { ok: true };
  });
}
