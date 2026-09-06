import { clamp, gauss, rng, round } from "./ids";
import { DEF_RATINGS, opponentFor, usageProfile } from "./nfl-data";
import type { Player, Position } from "./types";
import { defenseFantasy, devig, marketExpectation, priceTwoWay, PPR_SCORING } from "./scoring";

export interface GeneratedProp {
  market: string;
  line: number;
  overOdds: number;
  underOdds: number;
  impliedValue: number;
  fantasyPts: number;
  lineMove: number;
}

export interface BookSlate {
  props: GeneratedProp[];
  bookPts: number;
  floor: number;
  ceiling: number;
  stdev: number;
  opponent: string | null;
  matchupRating: number;
  isBye: boolean;
}

const BOOKS = ["FanDuel", "DraftKings", "BetMGM", "Caesars"];

export function primaryBook(): string {
  return BOOKS[0];
}

interface PlayerLike {
  id?: string;
  name: string;
  position: Position | string;
  nfl_team: string;
  adp: number;
  depth_chart_order: number;
  injury_status?: string | null;
  bye_week: number;
  snap_pct?: number;
  target_share?: number;
  targets_pg?: number;
  touches_pg?: number;
}

function injuryMultiplier(status?: string | null): number {
  switch ((status || "").toUpperCase()) {
    case "OUT":
    case "IR":
    case "SUSP":
      return 0;
    case "DOUBTFUL":
      return 0.35;
    case "QUESTIONABLE":
      return 0.84;
    default:
      return 1;
  }
}

/**
 * Build a full sportsbook prop slate for a player/week.
 * `tick` advances when the odds feed refreshes, which nudges lines (line movement).
 */
export function buildBookSlate(p: PlayerLike, week: number, tick = 0): BookSlate {
  const pos = p.position as Position;
  const matchup = opponentFor(p.nfl_team, week);
  const isBye = p.bye_week === week || !matchup;
  const opp = matchup?.opp ?? null;
  const home = matchup?.home ?? true;

  if (isBye) {
    return { props: [], bookPts: 0, floor: 0, ceiling: 0, stdev: 0, opponent: null, matchupRating: 50, isBye: true };
  }

  const defRating = opp ? DEF_RATINGS[opp]?.[pos] ?? 50 : 50;
  const matchupRating = clamp(defRating + (home ? 4 : -4), 1, 99);
  const matchupMult = 0.86 + (matchupRating / 100) * 0.28;

  const usage = usageProfile([p.name, pos, p.nfl_team, p.adp, p.depth_chart_order]);
  const r = rng(`props:${p.name}:${week}:${Math.floor(tick / 3)}`);
  const rMove = rng(`move:${p.name}:${week}:${tick}`);
  const noise = () => 1 + (r() - 0.5) * 0.16;
  const inj = injuryMultiplier(p.injury_status);
  const props: GeneratedProp[] = [];

  const push = (
    market: string,
    line: number,
    overProb: number,
    fantasyPerUnit: number,
    volatility = 0.4
  ) => {
    const roundedLine = market.includes("TDs") || market === "Anytime TD"
      ? round(line, 1)
      : Math.round(line * 2) / 2;
    const { over, under } = priceTwoWay(overProb);
    const dv = devig(over, under);
    const expected = market === "Anytime TD" ? dv.over : marketExpectation(roundedLine, dv.over, volatility);
    const move = round((rMove() - 0.5) * (market.includes("Yds") ? 6 : 0.4), 2);
    props.push({
      market,
      line: roundedLine,
      overOdds: over,
      underOdds: under,
      impliedValue: round(expected, 2),
      fantasyPts: round(expected * fantasyPerUnit, 2),
      lineMove: move,
    });
  };

  if (pos === "QB") {
    const passYds = usage.passAttPg * 7.1 * matchupMult * noise() * inj;
    const passTd = usage.passAttPg * 0.052 * matchupMult * noise() * inj;
    const rushYds = usage.rushAttPg * 5.2 * noise() * inj;
    push("Pass Yds", passYds, 0.5 + (r() - 0.5) * 0.08, PPR_SCORING.passYd, 0.22);
    push("Pass TDs", passTd, 0.5 + (r() - 0.5) * 0.12, PPR_SCORING.passTd, 0.5);
    push("Pass Attempts", usage.passAttPg * noise(), 0.5, 0, 0.18);
    if (usage.rushAttPg > 2) push("Rush Yds", rushYds, 0.5 + (r() - 0.5) * 0.1, PPR_SCORING.rushYd, 0.4);
    push("Interceptions", 0.62 * noise(), 0.5, PPR_SCORING.interception, 0.5);
    const rushTdProb = clamp(usage.rushAttPg * 0.035 * inj, 0.02, 0.55);
    push("Anytime TD", 0.5, rushTdProb, PPR_SCORING.rushTd, 0);
  } else if (pos === "RB") {
    const rushYds = usage.rushAttPg * (3.9 + (r() - 0.5) * 0.9) * matchupMult * inj;
    const rec = usage.targetsPg * 0.75 * inj;
    const recYds = rec * (7.4 + (r() - 0.5) * 2) * inj;
    push("Rush Yds", rushYds, 0.5 + (r() - 0.5) * 0.1, PPR_SCORING.rushYd, 0.36);
    push("Rush Attempts", usage.rushAttPg * noise(), 0.5, 0, 0.22);
    push("Receptions", rec, 0.5 + (r() - 0.5) * 0.1, PPR_SCORING.reception, 0.4);
    push("Rec Yds", recYds, 0.5, PPR_SCORING.recYd, 0.45);
    const tdProb = clamp((usage.redZoneShare / 100) * 0.62 * matchupMult * inj, 0.02, 0.72);
    push("Anytime TD", 0.5, tdProb, PPR_SCORING.rushTd, 0);
  } else if (pos === "WR" || pos === "TE") {
    const rec = usage.targetsPg * (pos === "TE" ? 0.7 : 0.64) * inj;
    const recYds = rec * (pos === "TE" ? 10.2 : 12.4) * matchupMult * inj * noise();
    push("Receptions", rec, 0.5 + (r() - 0.5) * 0.09, PPR_SCORING.reception, 0.38);
    push("Rec Yds", recYds, 0.5 + (r() - 0.5) * 0.1, PPR_SCORING.recYd, 0.44);
    push("Longest Reception", recYds * 0.42, 0.5, 0, 0.5);
    const tdProb = clamp((usage.redZoneShare / 100) * 0.5 * matchupMult * inj + 0.03, 0.02, 0.62);
    push("Anytime TD", 0.5, tdProb, PPR_SCORING.recTd, 0);
  } else if (pos === "K") {
    const teamTotal = 20 + (r() - 0.3) * 8;
    const kickPts = clamp(teamTotal * 0.36 + (r() - 0.5) * 2.2, 3.5, 13);
    push("Kicking Points", kickPts, 0.5, 1, 0.32);
    push("Field Goals Made", kickPts / 3.4, 0.5, 0, 0.4);
  } else {
    const oppOffense = opp ? 100 - (DEF_RATINGS[opp]?.QB ?? 50) : 50;
    const ptsAllowed = clamp(27 - oppOffense * 0.16 + (r() - 0.5) * 6, 9, 34);
    const sacks = clamp(2.4 + (r() - 0.4) * 1.6, 0.5, 5);
    const tos = clamp(1.2 + (r() - 0.45) * 1.1, 0.2, 3.2);
    push("Team Total Allowed", ptsAllowed, 0.5, 0, 0.2);
    push("Sacks", sacks, 0.5, 0, 0.35);
    props.push({
      market: "Turnovers Forced",
      line: round(tos, 1),
      overOdds: -115,
      underOdds: -105,
      impliedValue: round(tos, 2),
      fantasyPts: 0,
      lineMove: 0,
    });
  }

  let bookPts: number;
  if (pos === "DEF") {
    const pa = props.find((x) => x.market === "Team Total Allowed")?.impliedValue ?? 22;
    const sk = props.find((x) => x.market === "Sacks")?.impliedValue ?? 2.4;
    const to = props.find((x) => x.market === "Turnovers Forced")?.impliedValue ?? 1.2;
    bookPts = defenseFantasy(pa, sk, to);
  } else {
    bookPts = props.reduce((sum, x) => sum + x.fantasyPts, 0);
  }
  bookPts = Math.max(0, round(bookPts, 2));

  const varianceByPos: Record<string, number> = { QB: 0.28, RB: 0.42, WR: 0.48, TE: 0.5, K: 0.36, DEF: 0.62 };
  const stdev = round(Math.max(1.6, bookPts * (varianceByPos[pos] ?? 0.45)), 2);

  return {
    props,
    bookPts,
    floor: round(Math.max(0, bookPts - stdev * 1.05), 2),
    ceiling: round(bookPts + stdev * 1.5, 2),
    stdev,
    opponent: opp,
    matchupRating: round(matchupRating, 0),
    isBye: false,
  };
}

/** Platform (Sleeper) projections: smoother, slower to react, matchup-light. */
export function sleeperProjection(p: PlayerLike, week: number, bookPts: number, seasonPpg: number): number {
  const r = rng(`sleeper:${p.name}:${week}`);
  const anchor = seasonPpg > 0 ? seasonPpg : bookPts;
  const blended = anchor * 0.62 + bookPts * 0.38;
  const bias = gauss(r, 0, Math.max(0.7, blended * 0.09));
  const inj = injuryMultiplier(p.injury_status);
  return Math.max(0, round(blended * (inj < 1 ? Math.max(inj, 0.55) : 1) + bias, 2));
}

/** Consensus expert rankings-derived projection. */
export function consensusProjection(p: PlayerLike, week: number, bookPts: number, seasonPpg: number): number {
  const r = rng(`consensus:${p.name}:${week}`);
  const anchor = seasonPpg > 0 ? seasonPpg : bookPts;
  const blended = anchor * 0.45 + bookPts * 0.55;
  return Math.max(0, round(blended + gauss(r, 0, Math.max(0.6, blended * 0.07)), 2));
}

export function seasonBaseline(p: PlayerLike): { seasonPpg: number; last3: number } {
  const r = rng(`baseline:${p.name}`);
  let total = 0;
  for (let w = 1; w <= 4; w++) {
    total += buildBookSlate(p, w, 0).bookPts;
  }
  const seasonPpg = Math.max(0, round((total / 4) * (0.92 + r() * 0.18), 2));
  const last3 = Math.max(0, round(seasonPpg * (0.8 + r() * 0.45), 2));
  return { seasonPpg, last3 };
}

export function propsToDisplay(props: GeneratedProp[]): GeneratedProp[] {
  return props.filter((x) => x.market !== "Longest Reception");
}

export type { PlayerLike };
export function isPlayerAvailable(p: Pick<Player, "injury_status">): boolean {
  return injuryMultiplier(p.injury_status) > 0.5;
}
