import { db } from "@/lib/db";
import { badRequest, withUser } from "@/lib/api";
import { gauss, round, rng } from "@/lib/ids";
import { autoSetLineups, weeksToProject } from "@/lib/seed";
import { refreshPlayerValues, refreshProjections, projectionsForWeek } from "@/lib/projections";
import { getLineupForWeek } from "@/lib/queries";
import { logActivity, logDecision, notify, runCycle } from "@/lib/agent";
import type { League, Team } from "@/lib/types";

/** Play out the current week and roll the league forward. */
export async function POST(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  return withUser(async (user) => {
    const league = db.prepare(`SELECT * FROM leagues WHERE id = ? AND user_id = ?`).get(id, user.id) as League | undefined;
    if (!league) return badRequest("League not found", 404);
    if (league.current_week >= league.regular_season_weeks + 3) {
      return badRequest("Season is complete");
    }

    const teams = db.prepare(`SELECT * FROM teams WHERE league_id = ?`).all(league.id) as Team[];
    const week = league.current_week;
    const r = rng(`week:${league.id}:${week}`);
    const projs = projectionsForWeek(week);
    const matchups = db
      .prepare(`SELECT * FROM matchups WHERE league_id = ? AND week = ? AND is_complete = 0`)
      .all(league.id, week) as any[];

    const scoreFor = (teamId: string) => {
      const lineup = getLineupForWeek(league, teamId, week);
      const mean = lineup.currentTotal || 95;
      const variance = lineup.slots.reduce((s, x) => {
        const proj = x.player ? projs.get(x.player.id) : null;
        return s + (proj?.stdev ?? 4) ** 2;
      }, 0);
      return round(Math.max(45, gauss(r, mean, Math.max(14, Math.sqrt(variance)))), 2);
    };

    const results: string[] = [];
    const run = db.transaction(() => {
      for (const m of matchups) {
        const hs = scoreFor(m.home_team_id);
        const as = scoreFor(m.away_team_id);
        db.prepare(`UPDATE matchups SET home_points = ?, away_points = ?, is_complete = 1 WHERE id = ?`).run(hs, as, m.id);
        const home = teams.find((t) => t.id === m.home_team_id)!;
        const away = teams.find((t) => t.id === m.away_team_id)!;
        const homeWin = hs > as;
        const tie = hs === as;
        db.prepare(
          `UPDATE teams SET wins = wins + ?, losses = losses + ?, ties = ties + ?, points_for = points_for + ?, points_against = points_against + ? WHERE id = ?`
        ).run(tie ? 0 : homeWin ? 1 : 0, tie ? 0 : homeWin ? 0 : 1, tie ? 1 : 0, hs, as, home.id);
        db.prepare(
          `UPDATE teams SET wins = wins + ?, losses = losses + ?, ties = ties + ?, points_for = points_for + ?, points_against = points_against + ? WHERE id = ?`
        ).run(tie ? 0 : homeWin ? 0 : 1, tie ? 0 : homeWin ? 1 : 0, tie ? 1 : 0, as, hs, away.id);
        results.push(`${home.name} ${hs.toFixed(1)} — ${as.toFixed(1)} ${away.name}`);
      }
      db.prepare(`UPDATE leagues SET current_week = current_week + 1 WHERE id = ?`).run(league.id);
    });
    run();

    const updated = db.prepare(`SELECT * FROM leagues WHERE id = ?`).get(league.id) as League;
    refreshProjections(weeksToProject(updated));
    refreshPlayerValues(updated.id, updated.current_week);
    autoSetLineups(updated, "ai");

    const myTeam = teams.find((t) => t.is_user_team);
    const myResult = results.find((line) => myTeam && line.includes(myTeam.name));

    logActivity({
      leagueId: league.id,
      kind: "week_advanced",
      actor: "user",
      message: `Week ${week} scored — league advanced to week ${updated.current_week}`,
      detail: results.join(" · "),
      meta: { week, results },
    });
    logDecision({
      leagueId: league.id,
      type: "season",
      action: "week_rollover",
      status: "executed",
      title: `Week ${week} complete — re-baselining for week ${updated.current_week}`,
      summary: `Scored ${matchups.length} matchups, refreshed the sportsbook feed for weeks ${updated.current_week}-${updated.current_week + 2}, re-optimised every lineup and re-ran the season simulation.`,
      rationale: results,
      confidence: 0.95,
    });
    if (myResult) {
      notify({
        userId: user.id,
        leagueId: league.id,
        type: "week_result",
        title: `Week ${week} final`,
        body: myResult,
        link: "/dashboard",
      });
    }

    const report = await runCycle(league.id, { trigger: "manual", force: true });
    return { league: updated, results, report };
  });
}
