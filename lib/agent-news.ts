import { db } from "./db";
import { clamp, id, now, pick, rng, round } from "./ids";
import { TEAM_NAMES } from "./nfl-data";
import type { League, NewsItem, Player } from "./types";

export type NewsCategory =
  | "injury"
  | "injury_recovery"
  | "usage"
  | "depth_chart"
  | "market"
  | "practice"
  | "suspension"
  | "coaching";

export interface GeneratedNews {
  item: NewsItem;
  player: Player | null;
  actionable: boolean;
}

const SOURCES = [
  "FanDuel Line Feed",
  "Beat Writer Report",
  "NFL Wire",
  "Team Injury Report",
  "Practice Report",
  "Field Level Media",
];

function insertNews(row: Omit<NewsItem, "id">): NewsItem {
  const item: NewsItem = { id: id("nws"), ...row };
  db.prepare(
    `INSERT INTO news_items (id, league_id, player_id, headline, body, source, category, severity, value_delta,
      projection_delta, processed, ai_take, published_at)
     VALUES (@id, @league_id, @player_id, @headline, @body, @source, @category, @severity, @value_delta,
      @projection_delta, @processed, @ai_take, @published_at)`
  ).run(item);
  return item;
}

/**
 * Advance the live news wire. Mutates player state (injury, usage, depth chart)
 * so downstream projections and the AI GM react to real changes.
 */
export function generateNewsEvent(league: League, seed?: string): GeneratedNews | null {
  const r = rng(seed ?? `news:${league.id}:${now()}:${Math.random()}`);
  const candidates = db
    .prepare(
      `SELECT p.* FROM players p
       LEFT JOIN rosters ro ON ro.player_id = p.id AND ro.league_id = ?
       WHERE p.adp < 200
       ORDER BY (CASE WHEN ro.id IS NULL THEN 1 ELSE 0 END), p.adp
       LIMIT 160`
    )
    .all(league.id) as Player[];
  if (!candidates.length) return null;

  const player = candidates[Math.floor(r() * Math.min(candidates.length, 120))];
  const teamName = TEAM_NAMES[player.nfl_team] ?? player.nfl_team;
  const roll = r();
  const ts = now();

  let category: NewsCategory;
  let severity: NewsItem["severity"] = "info";
  let headline = "";
  let body = "";
  let valueDelta = 0;
  let projectionDelta = 0;
  const updates: Partial<Player> = {};

  if (player.injury_status && roll < 0.3) {
    category = "injury_recovery";
    severity = "moderate";
    headline = `${player.name} cleared to return for ${teamName}`;
    body = `${player.name} was a full participant and carries no game-status designation into Sunday. Books immediately restored his usage-based props to pre-injury levels.`;
    updates.injury_status = null;
    updates.injury_note = null;
    updates.status = "Active";
    valueDelta = round(3 + r() * 6, 2);
    projectionDelta = round(1.4 + r() * 3.2, 2);
  } else if (roll < 0.22) {
    category = "injury";
    const designations = [
      { s: "QUESTIONABLE", sev: "moderate" as const, note: "Limited participant (hamstring)", vd: -4, pd: -1.6 },
      { s: "DOUBTFUL", sev: "major" as const, note: "Did not practice Thursday or Friday (knee)", vd: -9, pd: -4.5 },
      { s: "OUT", sev: "critical" as const, note: "Ruled out for Sunday", vd: -14, pd: -9 },
    ];
    const d = designations[Math.floor(r() * designations.length)];
    severity = d.sev;
    headline = `${player.name} listed ${d.s.toLowerCase()} — ${d.note.split("(")[0].trim()}`;
    body = `${teamName} listed ${player.name} as ${d.s} on the final injury report. ${d.note}. Sportsbooks pulled his props off the board briefly before reposting sharply lower.`;
    updates.injury_status = d.s;
    updates.injury_note = d.note;
    valueDelta = round(d.vd * (0.7 + r() * 0.6), 2);
    projectionDelta = round(d.pd * (0.7 + r() * 0.6), 2);
  } else if (roll < 0.42) {
    category = "usage";
    severity = "moderate";
    const up = r() > 0.4;
    const swing = round((up ? 1 : -1) * (3 + r() * 9), 1);
    headline = up
      ? `${player.name} sees expanded role in ${teamName} game plan`
      : `${player.name}'s snap share dips as ${teamName} rotate`;
    body = up
      ? `${player.name} posted a season-high ${clamp(player.snap_pct + swing, 20, 99).toFixed(0)}% snap rate with ${(player.targets_pg + 1.4).toFixed(1)} targets and ${(player.touches_pg + 2).toFixed(1)} touches. The market moved his yardage line up before consensus projections adjusted.`
      : `${player.name} played just ${clamp(player.snap_pct + swing, 15, 99).toFixed(0)}% of snaps in a committee. Books trimmed his props while fantasy platforms held their projection steady — a downgrade signal.`;
    updates.snap_pct = round(clamp(player.snap_pct + swing, 10, 99), 1);
    updates.targets_pg = round(clamp(player.targets_pg + (up ? 1.2 : -1), 0, 14), 1);
    updates.touches_pg = round(clamp(player.touches_pg + (up ? 2.1 : -1.6), 0, 26), 1);
    updates.target_share = round(clamp(player.target_share + (up ? 2.4 : -2), 0, 40), 1);
    updates.last3_ppg = round(clamp(player.last3_ppg + (up ? 2.2 : -1.8), 0, 40), 2);
    valueDelta = round(up ? 4 + r() * 6 : -(3 + r() * 5), 2);
    projectionDelta = round(up ? 1.6 + r() * 2.4 : -(1.2 + r() * 2), 2);
  } else if (roll < 0.55) {
    category = "depth_chart";
    severity = "major";
    headline = `${teamName} promote ${player.name} to the top of the depth chart`;
    body = `Coaching staff confirmed ${player.name} will open as the first-team option at ${player.position}. Expect a material bump in opportunity share starting this week.`;
    updates.depth_chart_order = 1;
    updates.snap_pct = round(clamp(player.snap_pct + 14, 20, 99), 1);
    updates.touches_pg = round(clamp(player.touches_pg + 3.4, 0, 26), 1);
    valueDelta = round(7 + r() * 9, 2);
    projectionDelta = round(2.6 + r() * 3.4, 2);
  } else if (roll < 0.75) {
    category = "market";
    severity = "info";
    const up = r() > 0.45;
    headline = `${up ? "Sharp money lifts" : "Books trim"} ${player.name}'s ${player.position === "QB" ? "passing yards" : player.position === "RB" ? "rushing yards" : "receiving yards"} line`;
    body = `${player.name}'s primary yardage market moved ${up ? "up" : "down"} ${(2 + r() * 9).toFixed(1)} yards on early limit action at FanDuel. Fantasy platform projections have not moved, opening a book-vs-consensus gap the model is tracking.`;
    valueDelta = round(up ? 2 + r() * 3 : -(1.5 + r() * 3), 2);
    projectionDelta = round(up ? 0.6 + r() * 1.6 : -(0.5 + r() * 1.4), 2);
  } else if (roll < 0.86) {
    category = "practice";
    headline = `${player.name} full participant in Wednesday practice`;
    body = `No limitations for ${player.name}. Normal workload expected — the model holds projection steady and keeps him in the optimal lineup.`;
    valueDelta = round(r() * 1.4, 2);
    projectionDelta = round(r() * 0.6, 2);
  } else if (roll < 0.93) {
    category = "coaching";
    severity = "moderate";
    headline = `${teamName} shake up play-calling duties`;
    body = `A change in offensive play-calling is expected to shift pass rate. The model re-weighted volume expectations for ${player.name} and teammates accordingly.`;
    valueDelta = round((r() - 0.4) * 6, 2);
    projectionDelta = round((r() - 0.4) * 2.4, 2);
  } else {
    category = "suspension";
    severity = "critical";
    headline = `${player.name} suspended — will miss upcoming action`;
    body = `The league announced a suspension for ${player.name}. He is off the board for fantasy purposes until reinstated.`;
    updates.injury_status = "OUT";
    updates.injury_note = "Suspended";
    updates.status = "Inactive";
    valueDelta = round(-(14 + r() * 10), 2);
    projectionDelta = round(-(8 + r() * 6), 2);
  }

  if (Object.keys(updates).length) {
    const sets = Object.keys(updates)
      .map((k) => `${k} = @${k}`)
      .join(", ");
    db.prepare(`UPDATE players SET ${sets}, updated_at = @updated_at WHERE id = @id`).run({
      ...updates,
      updated_at: ts,
      id: player.id,
    });
  }

  const item = insertNews({
    league_id: league.id,
    player_id: player.id,
    headline,
    body,
    source: pick(r, SOURCES),
    category,
    severity,
    value_delta: valueDelta,
    projection_delta: projectionDelta,
    processed: 0,
    ai_take: null,
    published_at: ts,
  });

  const actionable = Math.abs(projectionDelta) >= 1.4 || severity === "critical" || severity === "major";
  const updated = db.prepare(`SELECT * FROM players WHERE id = ?`).get(player.id) as Player;
  return { item, player: updated, actionable };
}

export function setAiTake(newsId: string, take: string) {
  db.prepare(`UPDATE news_items SET ai_take = ?, processed = 1 WHERE id = ?`).run(take, newsId);
}

export function unprocessedNews(leagueId: string): NewsItem[] {
  return db
    .prepare(`SELECT * FROM news_items WHERE league_id = ? AND processed = 0 ORDER BY published_at DESC LIMIT 12`)
    .all(leagueId) as NewsItem[];
}

export function recentNews(leagueId: string, limit = 40): (NewsItem & { player_name?: string; position?: string; nfl_team?: string })[] {
  return db
    .prepare(
      `SELECT n.*, p.name AS player_name, p.position, p.nfl_team
       FROM news_items n LEFT JOIN players p ON p.id = n.player_id
       WHERE n.league_id = ? OR n.league_id IS NULL
       ORDER BY n.published_at DESC LIMIT ?`
    )
    .all(leagueId, limit) as any[];
}
