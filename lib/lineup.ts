import { db } from "./db";
import type { Player, Position, Projection, Team } from "./types";
import { projectionsForWeek, rosPpg } from "./projections";
import { round } from "./ids";

export const FLEX_ELIGIBLE: Record<string, Position[]> = {
  QB: ["QB"],
  RB: ["RB"],
  WR: ["WR"],
  TE: ["TE"],
  K: ["K"],
  DEF: ["DEF"],
  FLEX: ["RB", "WR", "TE"],
  WRRB_FLEX: ["RB", "WR"],
  REC_FLEX: ["WR", "TE"],
  SUPER_FLEX: ["QB", "RB", "WR", "TE"],
};

export const STARTING_SLOTS = ["QB", "RB", "WR", "TE", "FLEX", "WRRB_FLEX", "REC_FLEX", "SUPER_FLEX", "K", "DEF"];

export function slotLabel(slot: string): string {
  switch (slot) {
    case "FLEX":
      return "FLEX";
    case "WRRB_FLEX":
      return "W/R";
    case "REC_FLEX":
      return "W/T";
    case "SUPER_FLEX":
      return "SFLEX";
    case "DEF":
      return "D/ST";
    default:
      return slot;
  }
}

export function parseRosterPositions(json: string): string[] {
  try {
    const arr = JSON.parse(json);
    return Array.isArray(arr) ? arr : [];
  } catch {
    return [];
  }
}

export function startingSlots(rosterPositions: string[]): string[] {
  return rosterPositions.filter((p) => STARTING_SLOTS.includes(p));
}

export interface LineupAssignment {
  slot: string;
  slotIndex: number;
  playerId: string | null;
  points: number;
}

export interface OptimizeResult {
  assignments: LineupAssignment[];
  total: number;
  bench: string[];
}

/**
 * Optimal lineup via restrictive-first greedy + pairwise improvement.
 * Fast enough to run inside every AI cycle for all 12 teams.
 */
export function optimizeLineup(
  slots: string[],
  players: Player[],
  pointsFor: (p: Player) => number
): OptimizeResult {
  const slotList = slots.map((slot, i) => ({ slot, slotIndex: i }));
  const flexibility = (slot: string) => (FLEX_ELIGIBLE[slot]?.length ?? 1);
  const ordered = [...slotList].sort((a, b) => flexibility(a.slot) - flexibility(b.slot));

  const used = new Set<string>();
  const assign = new Map<number, { playerId: string | null; points: number }>();

  for (const s of ordered) {
    const eligible = FLEX_ELIGIBLE[s.slot] ?? [];
    let best: Player | null = null;
    let bestPts = -Infinity;
    for (const p of players) {
      if (used.has(p.id)) continue;
      if (!eligible.includes(p.position)) continue;
      const pts = pointsFor(p);
      if (pts > bestPts) {
        best = p;
        bestPts = pts;
      }
    }
    if (best) {
      used.add(best.id);
      assign.set(s.slotIndex, { playerId: best.id, points: round(bestPts, 2) });
    } else {
      assign.set(s.slotIndex, { playerId: null, points: 0 });
    }
  }

  // pairwise improvement between starters and bench
  const byId = new Map(players.map((p) => [p.id, p]));
  let improved = true;
  let guard = 0;
  while (improved && guard++ < 6) {
    improved = false;
    for (const s of slotList) {
      const cur = assign.get(s.slotIndex)!;
      const eligible = FLEX_ELIGIBLE[s.slot] ?? [];
      for (const p of players) {
        if (used.has(p.id)) continue;
        if (!eligible.includes(p.position)) continue;
        const pts = pointsFor(p);
        if (pts > cur.points + 0.001) {
          if (cur.playerId) used.delete(cur.playerId);
          used.add(p.id);
          assign.set(s.slotIndex, { playerId: p.id, points: round(pts, 2) });
          improved = true;
          break;
        }
      }
    }
    // swap two starters between slots if it helps
    for (const a of slotList) {
      for (const b of slotList) {
        if (a.slotIndex >= b.slotIndex) continue;
        const pa = assign.get(a.slotIndex)!;
        const pb = assign.get(b.slotIndex)!;
        const playerA = pa.playerId ? byId.get(pa.playerId) : null;
        const playerB = pb.playerId ? byId.get(pb.playerId) : null;
        if (!playerA || !playerB) continue;
        const aOk = (FLEX_ELIGIBLE[a.slot] ?? []).includes(playerB.position);
        const bOk = (FLEX_ELIGIBLE[b.slot] ?? []).includes(playerA.position);
        if (aOk && bOk) {
          const current = pa.points + pb.points;
          const swapped = pointsFor(playerB) + pointsFor(playerA);
          if (swapped > current + 0.001) {
            assign.set(a.slotIndex, { playerId: playerB.id, points: round(pointsFor(playerB), 2) });
            assign.set(b.slotIndex, { playerId: playerA.id, points: round(pointsFor(playerA), 2) });
            improved = true;
          }
        }
      }
    }
  }

  const assignments: LineupAssignment[] = slotList.map((s) => ({
    slot: s.slot,
    slotIndex: s.slotIndex,
    playerId: assign.get(s.slotIndex)?.playerId ?? null,
    points: assign.get(s.slotIndex)?.points ?? 0,
  }));
  const total = round(assignments.reduce((sum, a) => sum + a.points, 0), 2);
  const bench = players.filter((p) => !used.has(p.id)).map((p) => p.id);
  return { assignments, total, bench };
}

export function rosterPlayers(teamId: string): (Player & { slot_status: string })[] {
  return db
    .prepare(
      `SELECT p.*, r.slot_status FROM rosters r JOIN players p ON p.id = r.player_id WHERE r.team_id = ?`
    )
    .all(teamId) as (Player & { slot_status: string })[];
}

export function leagueRosterMap(leagueId: string): Map<string, (Player & { slot_status: string })[]> {
  const rows = db
    .prepare(
      `SELECT r.team_id, p.*, r.slot_status FROM rosters r JOIN players p ON p.id = r.player_id WHERE r.league_id = ?`
    )
    .all(leagueId) as (Player & { slot_status: string; team_id: string })[];
  const map = new Map<string, (Player & { slot_status: string })[]>();
  for (const row of rows) {
    const list = map.get(row.team_id) ?? [];
    list.push(row);
    map.set(row.team_id, list);
  }
  return map;
}

export function weeklyPointsFn(week: number, projs?: Map<string, Projection>) {
  const map = projs ?? projectionsForWeek(week);
  return (p: Player) => {
    const proj = map.get(p.id);
    if (!proj || proj.is_bye) return 0;
    if (p.injury_status === "OUT" || p.injury_status === "IR") return 0;
    return proj.model_pts;
  };
}

export function rosPointsFn(week: number, projs?: Map<string, Projection>) {
  const map = projs ?? projectionsForWeek(week);
  return (p: Player) => rosPpg(p, week, map);
}

export function teamStarters(
  team: Team,
  slots: string[],
  players: Player[],
  week: number,
  projs?: Map<string, Projection>
): OptimizeResult {
  return optimizeLineup(slots, players, weeklyPointsFn(week, projs));
}
