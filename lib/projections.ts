import { db, tx } from "./db";
import { clamp, id, now, round } from "./ids";
import { buildBookSlate, consensusProjection, sleeperProjection } from "./props";
import type { AISettings, Player, Position, Projection } from "./types";

export const SEASON = "2025";

let oddsTick = 0;
export function bumpOddsTick(): number {
  oddsTick += 1;
  return oddsTick;
}
export function currentOddsTick(): number {
  return oddsTick;
}

export function getAllPlayers(): Player[] {
  return db.prepare(`SELECT * FROM players`).all() as Player[];
}

export function getPlayer(playerId: string): Player | undefined {
  return db.prepare(`SELECT * FROM players WHERE id = ?`).get(playerId) as Player | undefined;
}

const REPLACEMENT_PPG: Record<Position, number> = {
  QB: 13.5,
  RB: 7.5,
  WR: 8.0,
  TE: 5.5,
  K: 7.0,
  DEF: 6.0,
};

export function replacementLevel(pos: Position): number {
  return REPLACEMENT_PPG[pos] ?? 6;
}

export function blendWeights(settings?: Partial<AISettings>) {
  const book = settings?.book_weight ?? 0.55;
  const consensus = settings?.consensus_weight ?? 0.25;
  const sleeper = settings?.sleeper_weight ?? 0.2;
  const total = book + consensus + sleeper || 1;
  return { book: book / total, consensus: consensus / total, sleeper: sleeper / total };
}

/**
 * Recompute the sportsbook feed + all projection sources for the given weeks.
 * This is the core "market data refresh" the AI GM runs on every cycle.
 */
export function refreshProjections(weeks: number[], settings?: Partial<AISettings>): number {
  const players = getAllPlayers();
  const w = blendWeights(settings);
  const ts = now();
  const tick = currentOddsTick();

  const insertProp = db.prepare(`
    INSERT INTO player_props (id, player_id, week, book, market, line, over_odds, under_odds, implied_value, fantasy_pts, line_move, updated_at)
    VALUES (@id, @player_id, @week, @book, @market, @line, @over_odds, @under_odds, @implied_value, @fantasy_pts, @line_move, @updated_at)
    ON CONFLICT(player_id, week, book, market) DO UPDATE SET
      line=excluded.line, over_odds=excluded.over_odds, under_odds=excluded.under_odds,
      implied_value=excluded.implied_value, fantasy_pts=excluded.fantasy_pts,
      line_move=excluded.line_move, updated_at=excluded.updated_at
  `);

  const insertProj = db.prepare(`
    INSERT INTO projections (id, player_id, week, season, opponent, book_pts, sleeper_pts, consensus_pts, model_pts,
      floor_pts, ceiling_pts, stdev, matchup_rating, dvoa_rank, is_bye, updated_at)
    VALUES (@id, @player_id, @week, @season, @opponent, @book_pts, @sleeper_pts, @consensus_pts, @model_pts,
      @floor_pts, @ceiling_pts, @stdev, @matchup_rating, @dvoa_rank, @is_bye, @updated_at)
    ON CONFLICT(player_id, week, season) DO UPDATE SET
      opponent=excluded.opponent, book_pts=excluded.book_pts, sleeper_pts=excluded.sleeper_pts,
      consensus_pts=excluded.consensus_pts, model_pts=excluded.model_pts, floor_pts=excluded.floor_pts,
      ceiling_pts=excluded.ceiling_pts, stdev=excluded.stdev, matchup_rating=excluded.matchup_rating,
      dvoa_rank=excluded.dvoa_rank, is_bye=excluded.is_bye, updated_at=excluded.updated_at
  `);

  let count = 0;
  tx(() => {
    for (const p of players) {
      for (const week of weeks) {
        const slate = buildBookSlate(p, week, tick);
        for (const prop of slate.props) {
          insertProp.run({
            id: id("prp"),
            player_id: p.id,
            week,
            book: "FanDuel",
            market: prop.market,
            line: prop.line,
            over_odds: prop.overOdds,
            under_odds: prop.underOdds,
            implied_value: prop.impliedValue,
            fantasy_pts: prop.fantasyPts,
            line_move: prop.lineMove,
            updated_at: ts,
          });
        }
        const sleeperPts = slate.isBye ? 0 : sleeperProjection(p, week, slate.bookPts, p.season_ppg);
        const consensusPts = slate.isBye ? 0 : consensusProjection(p, week, slate.bookPts, p.season_ppg);
        const model = slate.isBye
          ? 0
          : round(slate.bookPts * w.book + consensusPts * w.consensus + sleeperPts * w.sleeper, 2);
        insertProj.run({
          id: id("prj"),
          player_id: p.id,
          week,
          season: SEASON,
          opponent: slate.opponent,
          book_pts: slate.bookPts,
          sleeper_pts: sleeperPts,
          consensus_pts: consensusPts,
          model_pts: model,
          floor_pts: slate.floor,
          ceiling_pts: slate.ceiling,
          stdev: slate.stdev,
          matchup_rating: slate.matchupRating,
          dvoa_rank: Math.max(1, Math.min(32, Math.round(33 - (slate.matchupRating / 100) * 32))),
          is_bye: slate.isBye ? 1 : 0,
          updated_at: ts,
        });
        count++;
      }
    }
  });
  return count;
}

export function projectionsForWeek(week: number): Map<string, Projection> {
  const rows = db
    .prepare(`SELECT * FROM projections WHERE week = ? AND season = ?`)
    .all(week, SEASON) as Projection[];
  return new Map(rows.map((r) => [r.player_id, r]));
}

export function projectionFor(playerId: string, week: number): Projection | undefined {
  return db
    .prepare(`SELECT * FROM projections WHERE player_id = ? AND week = ? AND season = ?`)
    .get(playerId, week, SEASON) as Projection | undefined;
}

export function propsFor(playerId: string, week: number) {
  return db
    .prepare(`SELECT * FROM player_props WHERE player_id = ? AND week = ? ORDER BY rowid`)
    .all(playerId, week);
}

/**
 * Rest-of-season points-per-game estimate: blends the live market projection
 * for the current week with season-long baseline talent.
 */
export function rosPpg(player: Player, week: number, projs?: Map<string, Projection>): number {
  const proj = projs ? projs.get(player.id) : projectionFor(player.id, week);
  const weekly = proj && !proj.is_bye ? proj.model_pts : 0;
  const baseline = player.season_ppg || weekly;
  const recent = player.last3_ppg || baseline;
  const live = weekly > 0 ? weekly : baseline * 0.9;
  return round(live * 0.5 + baseline * 0.32 + recent * 0.18, 2);
}

export function vorp(player: Player, week: number, projs?: Map<string, Projection>): number {
  return round(rosPpg(player, week, projs) - replacementLevel(player.position), 2);
}

/** 0-100 trade value scale used across the market + trade engines. */
export function tradeValue(player: Player, week: number, projs?: Map<string, Projection>): number {
  const v = vorp(player, week, projs);
  const ageFactor =
    player.position === "RB"
      ? clamp(1.08 - Math.max(0, (player.age ?? 25) - 26) * 0.045, 0.72, 1.1)
      : clamp(1.05 - Math.max(0, (player.age ?? 26) - 29) * 0.035, 0.78, 1.08);
  const posMult: Record<string, number> = { QB: 0.82, RB: 1.06, WR: 1.0, TE: 1.04, K: 0.35, DEF: 0.4 };
  const injuryPenalty =
    player.injury_status === "OUT" || player.injury_status === "IR"
      ? 0.55
      : player.injury_status === "DOUBTFUL"
        ? 0.72
        : player.injury_status === "QUESTIONABLE"
          ? 0.93
          : 1;
  const raw = (v + 4) * 4.4 * ageFactor * (posMult[player.position] ?? 1) * injuryPenalty;
  return round(clamp(raw, 0.5, 100), 1);
}

export function tierFor(value: number): number {
  if (value >= 78) return 1;
  if (value >= 62) return 2;
  if (value >= 46) return 3;
  if (value >= 32) return 4;
  if (value >= 18) return 5;
  return 6;
}

/** Recompute the league-wide player market (values, trends, buy-low / sell-high). */
export function refreshPlayerValues(leagueId: string, week: number): void {
  const players = getAllPlayers();
  const projs = projectionsForWeek(week);
  const ts = now();
  const existing = new Map(
    (
      db.prepare(`SELECT player_id, value FROM player_values WHERE league_id = ?`).all(leagueId) as {
        player_id: string;
        value: number;
      }[]
    ).map((r) => [r.player_id, r.value])
  );

  const stmt = db.prepare(`
    INSERT INTO player_values (id, league_id, player_id, value, prev_value, trend_7d, tier, market_signal, discrepancy, confidence, updated_at)
    VALUES (@id, @league_id, @player_id, @value, @prev_value, @trend_7d, @tier, @market_signal, @discrepancy, @confidence, @updated_at)
    ON CONFLICT(league_id, player_id) DO UPDATE SET
      value=excluded.value, prev_value=excluded.prev_value, trend_7d=excluded.trend_7d,
      tier=excluded.tier, market_signal=excluded.market_signal, discrepancy=excluded.discrepancy,
      confidence=excluded.confidence, updated_at=excluded.updated_at
  `);

  tx(() => {
    for (const p of players) {
      const proj = projs.get(p.id);
      const value = tradeValue(p, week, projs);
      const prev = existing.get(p.id) ?? value;
      const trend = round(value - prev, 2);
      const discrepancy = proj ? round(proj.book_pts - proj.sleeper_pts, 2) : 0;
      const recentDelta = (p.last3_ppg || p.season_ppg) - p.season_ppg;

      let signal: string = "hold";
      if (discrepancy > 1.6 && recentDelta < -0.4) signal = "buy_low";
      else if (discrepancy < -1.6 && recentDelta > 0.6) signal = "sell_high";
      else if (trend > 1.2 || discrepancy > 2.4) signal = "rising";
      else if (trend < -1.2 || discrepancy < -2.4) signal = "falling";

      const confidence = clamp(
        0.45 + Math.abs(discrepancy) * 0.06 + (proj ? (100 - proj.stdev * 4) / 400 : 0),
        0.3,
        0.96
      );

      stmt.run({
        id: id("pv"),
        league_id: leagueId,
        player_id: p.id,
        value,
        prev_value: prev,
        trend_7d: trend,
        tier: tierFor(value),
        market_signal: signal,
        discrepancy,
        confidence: round(confidence, 2),
        updated_at: ts,
      });
    }
  });
}

export function valuesForLeague(leagueId: string): Map<string, { value: number; prev_value: number; trend_7d: number; tier: number; market_signal: string; discrepancy: number; confidence: number }> {
  const rows = db.prepare(`SELECT * FROM player_values WHERE league_id = ?`).all(leagueId) as any[];
  return new Map(rows.map((r) => [r.player_id, r]));
}
