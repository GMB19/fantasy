/** Odds math + fantasy scoring helpers. */

export const PPR_SCORING = {
  passYd: 0.04,
  passTd: 4,
  interception: -1,
  rushYd: 0.1,
  rushTd: 6,
  recYd: 0.1,
  recTd: 6,
  reception: 1,
  fumbleLost: -2,
};

/** American odds → implied probability (with vig). */
export function americanToProb(odds: number): number {
  if (odds === 0) return 0.5;
  return odds > 0 ? 100 / (odds + 100) : -odds / (-odds + 100);
}

/** Remove vig from a two-way market. */
export function devig(overOdds: number, underOdds: number): { over: number; under: number } {
  const o = americanToProb(overOdds);
  const u = americanToProb(underOdds);
  const total = o + u || 1;
  return { over: o / total, under: u / total };
}

export function probToAmerican(p: number): number {
  const clamped = Math.min(0.97, Math.max(0.03, p));
  return clamped >= 0.5
    ? Math.round((-100 * clamped) / (1 - clamped))
    : Math.round((100 * (1 - clamped)) / clamped);
}

/** Odds with a standard ~4.5% hold baked in. */
export function priceTwoWay(trueOverProb: number, hold = 0.045): { over: number; under: number } {
  const p = Math.min(0.92, Math.max(0.08, trueOverProb));
  const over = probToAmerican(p * (1 + hold));
  const under = probToAmerican((1 - p) * (1 + hold));
  return { over, under };
}

export function formatOdds(odds: number): string {
  return odds > 0 ? `+${odds}` : `${odds}`;
}

/**
 * Expected value of an over/under market given the posted line and de-vigged
 * over probability. A line is set near the median; we shift the mean by how far
 * the market leans.
 */
export function marketExpectation(line: number, overProb: number, volatility = 0.42): number {
  const lean = overProb - 0.5;
  return line * (1 + lean * volatility * 2);
}

export function kickingPointsToFantasy(points: number): number {
  return points;
}

export function defenseFantasy(pointsAllowed: number, sacks: number, turnovers: number): number {
  let pts = 0;
  if (pointsAllowed === 0) pts += 10;
  else if (pointsAllowed <= 6) pts += 7;
  else if (pointsAllowed <= 13) pts += 4;
  else if (pointsAllowed <= 20) pts += 1;
  else if (pointsAllowed <= 27) pts += 0;
  else if (pointsAllowed <= 34) pts -= 1;
  else pts -= 4;
  pts += sacks * 1 + turnovers * 2 + 0.6; // small TD equity
  return pts;
}
