import { withLeague } from "@/lib/api";
import { getLeagueAnalysis, getSimHistory, getTeams } from "@/lib/queries";
import { getMatchups } from "@/lib/sim";

export async function GET(req: Request) {
  return withLeague(req, (_user, league) => {
    const analysis = getLeagueAnalysis(league);
    const teams = getTeams(league.id);
    const myTeam = teams.find((t) => t.is_user_team);
    return {
      league,
      analysis,
      standings: teams,
      simHistory: myTeam ? getSimHistory(league.id, myTeam.id, 40) : [],
      schedule: getMatchups(league.id),
    };
  });
}
