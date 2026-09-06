import { withLeague, badRequest } from "@/lib/api";
import { getRoster, getTeams } from "@/lib/queries";

export async function GET(req: Request) {
  return withLeague(req, (_user, league) => {
    const url = new URL(req.url);
    const teamId = url.searchParams.get("teamId");
    const teams = getTeams(league.id);
    if (teamId) {
      const team = teams.find((t) => t.id === teamId);
      if (!team) return badRequest("Team not found", 404);
      return { team, roster: getRoster(league.id, team.id, league.current_week) };
    }
    return { teams };
  });
}
