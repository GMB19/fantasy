import type { Position } from "./types";
import { hash32, rng } from "./ids";

export const NFL_TEAMS = [
  "ARI", "ATL", "BAL", "BUF", "CAR", "CHI", "CIN", "CLE", "DAL", "DEN", "DET", "GB",
  "HOU", "IND", "JAX", "KC", "LAC", "LAR", "LV", "MIA", "MIN", "NE", "NO", "NYG",
  "NYJ", "PHI", "PIT", "SEA", "SF", "TB", "TEN", "WAS",
] as const;

export type NflTeam = (typeof NFL_TEAMS)[number];

export const TEAM_NAMES: Record<string, string> = {
  ARI: "Cardinals", ATL: "Falcons", BAL: "Ravens", BUF: "Bills", CAR: "Panthers",
  CHI: "Bears", CIN: "Bengals", CLE: "Browns", DAL: "Cowboys", DEN: "Broncos",
  DET: "Lions", GB: "Packers", HOU: "Texans", IND: "Colts", JAX: "Jaguars",
  KC: "Chiefs", LAC: "Chargers", LAR: "Rams", LV: "Raiders", MIA: "Dolphins",
  MIN: "Vikings", NE: "Patriots", NO: "Saints", NYG: "Giants", NYJ: "Jets",
  PHI: "Eagles", PIT: "Steelers", SEA: "Seahawks", SF: "49ers", TB: "Buccaneers",
  TEN: "Titans", WAS: "Commanders",
};

export const BYE_WEEKS: Record<string, number> = {
  ARI: 8, ATL: 5, BAL: 7, BUF: 7, CAR: 14, CHI: 5, CIN: 10, CLE: 9, DAL: 10, DEN: 12,
  DET: 8, GB: 5, HOU: 6, IND: 11, JAX: 8, KC: 10, LAC: 12, LAR: 8, LV: 8, MIA: 12,
  MIN: 6, NE: 14, NO: 11, NYG: 14, NYJ: 9, PHI: 9, PIT: 5, SEA: 8, SF: 14, TB: 9,
  TEN: 10, WAS: 12,
};

/** Defensive strength vs each position: 0 (tough) → 100 (soft). */
export const DEF_RATINGS: Record<string, { QB: number; RB: number; WR: number; TE: number; K: number; DEF: number }> = {
  ARI: { QB: 58, RB: 62, WR: 55, TE: 66, K: 52, DEF: 50 },
  ATL: { QB: 62, RB: 55, WR: 60, TE: 58, K: 55, DEF: 50 },
  BAL: { QB: 44, RB: 34, WR: 58, TE: 52, K: 45, DEF: 50 },
  BUF: { QB: 42, RB: 48, WR: 40, TE: 46, K: 44, DEF: 50 },
  CAR: { QB: 70, RB: 74, WR: 66, TE: 62, K: 60, DEF: 50 },
  CHI: { QB: 55, RB: 58, WR: 52, TE: 60, K: 50, DEF: 50 },
  CIN: { QB: 66, RB: 70, WR: 62, TE: 58, K: 58, DEF: 50 },
  CLE: { QB: 38, RB: 45, WR: 42, TE: 50, K: 42, DEF: 50 },
  DAL: { QB: 68, RB: 72, WR: 64, TE: 60, K: 58, DEF: 50 },
  DEN: { QB: 28, RB: 40, WR: 30, TE: 42, K: 36, DEF: 50 },
  DET: { QB: 52, RB: 50, WR: 54, TE: 56, K: 48, DEF: 50 },
  GB: { QB: 40, RB: 42, WR: 44, TE: 48, K: 42, DEF: 50 },
  HOU: { QB: 32, RB: 44, WR: 34, TE: 44, K: 38, DEF: 50 },
  IND: { QB: 58, RB: 56, WR: 58, TE: 62, K: 52, DEF: 50 },
  JAX: { QB: 60, RB: 60, WR: 56, TE: 64, K: 54, DEF: 50 },
  KC: { QB: 46, RB: 46, WR: 48, TE: 50, K: 46, DEF: 50 },
  LAC: { QB: 36, RB: 52, WR: 38, TE: 46, K: 40, DEF: 50 },
  LAR: { QB: 50, RB: 54, WR: 50, TE: 54, K: 50, DEF: 50 },
  LV: { QB: 64, RB: 66, WR: 62, TE: 66, K: 58, DEF: 50 },
  MIA: { QB: 62, RB: 68, WR: 60, TE: 62, K: 56, DEF: 50 },
  MIN: { QB: 42, RB: 38, WR: 46, TE: 48, K: 44, DEF: 50 },
  NE: { QB: 48, RB: 50, WR: 46, TE: 52, K: 46, DEF: 50 },
  NO: { QB: 56, RB: 58, WR: 54, TE: 58, K: 52, DEF: 50 },
  NYG: { QB: 54, RB: 62, WR: 50, TE: 56, K: 50, DEF: 50 },
  NYJ: { QB: 50, RB: 56, WR: 44, TE: 54, K: 48, DEF: 50 },
  PHI: { QB: 34, RB: 36, WR: 32, TE: 44, K: 36, DEF: 50 },
  PIT: { QB: 40, RB: 48, WR: 42, TE: 50, K: 42, DEF: 50 },
  SEA: { QB: 46, RB: 52, WR: 44, TE: 52, K: 46, DEF: 50 },
  SF: { QB: 44, RB: 44, WR: 48, TE: 50, K: 44, DEF: 50 },
  TB: { QB: 60, RB: 48, WR: 62, TE: 60, K: 54, DEF: 50 },
  TEN: { QB: 64, RB: 64, WR: 60, TE: 64, K: 56, DEF: 50 },
  WAS: { QB: 58, RB: 60, WR: 56, TE: 60, K: 52, DEF: 50 },
};

type Seed = [name: string, pos: Position, team: string, adp: number, depth: number];

/**
 * Illustrative NFL player universe used by the projection + market engines.
 * ADP is a consensus-style redraft ADP; depth is the depth-chart slot.
 */
export const PLAYER_SEEDS: Seed[] = [
  // ---------------- QB ----------------
  ["Josh Allen", "QB", "BUF", 22, 1],
  ["Lamar Jackson", "QB", "BAL", 24, 1],
  ["Jayden Daniels", "QB", "WAS", 28, 1],
  ["Jalen Hurts", "QB", "PHI", 34, 1],
  ["Joe Burrow", "QB", "CIN", 38, 1],
  ["Patrick Mahomes", "QB", "KC", 44, 1],
  ["Bo Nix", "QB", "DEN", 62, 1],
  ["Baker Mayfield", "QB", "TB", 66, 1],
  ["Kyler Murray", "QB", "ARI", 74, 1],
  ["Justin Herbert", "QB", "LAC", 82, 1],
  ["Brock Purdy", "QB", "SF", 88, 1],
  ["Caleb Williams", "QB", "CHI", 94, 1],
  ["Dak Prescott", "QB", "DAL", 98, 1],
  ["Justin Fields", "QB", "NYJ", 104, 1],
  ["Jared Goff", "QB", "DET", 108, 1],
  ["C.J. Stroud", "QB", "HOU", 112, 1],
  ["Drake Maye", "QB", "NE", 118, 1],
  ["Trevor Lawrence", "QB", "JAX", 124, 1],
  ["Jordan Love", "QB", "GB", 128, 1],
  ["Matthew Stafford", "QB", "LAR", 134, 1],
  ["Tua Tagovailoa", "QB", "MIA", 140, 1],
  ["J.J. McCarthy", "QB", "MIN", 146, 1],
  ["Michael Penix Jr.", "QB", "ATL", 152, 1],
  ["Sam Darnold", "QB", "SEA", 158, 1],
  ["Geno Smith", "QB", "LV", 164, 1],
  ["Bryce Young", "QB", "CAR", 172, 1],
  ["Aaron Rodgers", "QB", "PIT", 178, 1],
  ["Daniel Jones", "QB", "IND", 184, 1],
  ["Cam Ward", "QB", "TEN", 188, 1],
  ["Russell Wilson", "QB", "NYG", 196, 1],
  ["Joe Flacco", "QB", "CLE", 210, 1],
  ["Spencer Rattler", "QB", "NO", 216, 1],

  // ---------------- RB ----------------
  ["Bijan Robinson", "RB", "ATL", 2, 1],
  ["Saquon Barkley", "RB", "PHI", 3, 1],
  ["Jahmyr Gibbs", "RB", "DET", 4, 1],
  ["Christian McCaffrey", "RB", "SF", 8, 1],
  ["Ashton Jeanty", "RB", "LV", 11, 1],
  ["De'Von Achane", "RB", "MIA", 12, 1],
  ["Derrick Henry", "RB", "BAL", 13, 1],
  ["Josh Jacobs", "RB", "GB", 16, 1],
  ["Bucky Irving", "RB", "TB", 19, 1],
  ["Jonathan Taylor", "RB", "IND", 21, 1],
  ["Chase Brown", "RB", "CIN", 26, 1],
  ["Kyren Williams", "RB", "LAR", 30, 1],
  ["James Cook", "RB", "BUF", 32, 1],
  ["Breece Hall", "RB", "NYJ", 36, 1],
  ["Omarion Hampton", "RB", "LAC", 40, 1],
  ["Kenneth Walker III", "RB", "SEA", 42, 1],
  ["Alvin Kamara", "RB", "NO", 48, 1],
  ["Chuba Hubbard", "RB", "CAR", 52, 1],
  ["James Conner", "RB", "ARI", 54, 1],
  ["David Montgomery", "RB", "DET", 58, 2],
  ["TreVeyon Henderson", "RB", "NE", 60, 1],
  ["Tony Pollard", "RB", "TEN", 64, 1],
  ["Quinshon Judkins", "RB", "CLE", 68, 1],
  ["Aaron Jones", "RB", "MIN", 72, 1],
  ["RJ Harvey", "RB", "DEN", 76, 1],
  ["D'Andre Swift", "RB", "CHI", 80, 1],
  ["Isiah Pacheco", "RB", "KC", 84, 1],
  ["Kaleb Johnson", "RB", "PIT", 90, 1],
  ["Travis Etienne Jr.", "RB", "JAX", 92, 1],
  ["Tyrone Tracy Jr.", "RB", "NYG", 96, 1],
  ["Brian Robinson Jr.", "RB", "WAS", 100, 1],
  ["Javonte Williams", "RB", "DAL", 106, 1],
  ["Rhamondre Stevenson", "RB", "NE", 110, 2],
  ["Jaylen Warren", "RB", "PIT", 114, 2],
  ["Zach Charbonnet", "RB", "SEA", 116, 2],
  ["Rachaad White", "RB", "TB", 120, 2],
  ["Najee Harris", "RB", "LAC", 126, 2],
  ["Joe Mixon", "RB", "HOU", 130, 1],
  ["Nick Chubb", "RB", "HOU", 136, 2],
  ["Jordan Mason", "RB", "MIN", 138, 2],
  ["Cam Skattebo", "RB", "NYG", 142, 2],
  ["Tank Bigsby", "RB", "JAX", 148, 2],
  ["Braelon Allen", "RB", "NYJ", 154, 2],
  ["Blake Corum", "RB", "LAR", 160, 2],
  ["Trey Benson", "RB", "ARI", 166, 2],
  ["Bhayshul Tuten", "RB", "JAX", 170, 3],
  ["Ray Davis", "RB", "BUF", 176, 2],
  ["Jaydon Blue", "RB", "DAL", 180, 2],
  ["Tyjae Spears", "RB", "TEN", 186, 2],
  ["Rico Dowdle", "RB", "CAR", 190, 2],
  ["Kareem Hunt", "RB", "KC", 194, 2],
  ["Isaac Guerendo", "RB", "SF", 200, 2],
  ["Roschon Johnson", "RB", "CHI", 206, 2],
  ["Jerome Ford", "RB", "CLE", 212, 2],
  ["Emanuel Wilson", "RB", "GB", 220, 2],
  ["Devin Neal", "RB", "NO", 226, 2],
  ["Sean Tucker", "RB", "TB", 232, 3],
  ["Antonio Gibson", "RB", "NE", 236, 3],
  ["Will Shipley", "RB", "PHI", 240, 2],
  ["Audric Estime", "RB", "DEN", 246, 3],

  // ---------------- WR ----------------
  ["Ja'Marr Chase", "WR", "CIN", 1, 1],
  ["Justin Jefferson", "WR", "MIN", 5, 1],
  ["CeeDee Lamb", "WR", "DAL", 6, 1],
  ["Puka Nacua", "WR", "LAR", 7, 1],
  ["Malik Nabers", "WR", "NYG", 9, 1],
  ["Amon-Ra St. Brown", "WR", "DET", 10, 1],
  ["Nico Collins", "WR", "HOU", 14, 1],
  ["Brian Thomas Jr.", "WR", "JAX", 15, 1],
  ["A.J. Brown", "WR", "PHI", 17, 1],
  ["Drake London", "WR", "ATL", 18, 1],
  ["Ladd McConkey", "WR", "LAC", 20, 1],
  ["Tee Higgins", "WR", "CIN", 23, 2],
  ["Tyreek Hill", "WR", "MIA", 25, 1],
  ["Jaxon Smith-Njigba", "WR", "SEA", 27, 1],
  ["Davante Adams", "WR", "LAR", 29, 2],
  ["Terry McLaurin", "WR", "WAS", 31, 1],
  ["Marvin Harrison Jr.", "WR", "ARI", 33, 1],
  ["Garrett Wilson", "WR", "NYJ", 35, 1],
  ["DK Metcalf", "WR", "PIT", 37, 1],
  ["Mike Evans", "WR", "TB", 39, 1],
  ["Zay Flowers", "WR", "BAL", 41, 1],
  ["Rashee Rice", "WR", "KC", 43, 1],
  ["Courtland Sutton", "WR", "DEN", 45, 1],
  ["DJ Moore", "WR", "CHI", 46, 1],
  ["Jameson Williams", "WR", "DET", 47, 2],
  ["Xavier Worthy", "WR", "KC", 49, 2],
  ["Jerry Jeudy", "WR", "CLE", 50, 1],
  ["Chris Godwin", "WR", "TB", 53, 2],
  ["Jaylen Waddle", "WR", "MIA", 55, 2],
  ["Rome Odunze", "WR", "CHI", 56, 2],
  ["Travis Hunter", "WR", "JAX", 57, 2],
  ["Tetairoa McMillan", "WR", "CAR", 59, 1],
  ["Calvin Ridley", "WR", "TEN", 61, 1],
  ["Khalil Shakir", "WR", "BUF", 63, 1],
  ["Jakobi Meyers", "WR", "LV", 65, 1],
  ["Deebo Samuel Sr.", "WR", "WAS", 67, 2],
  ["Emeka Egbuka", "WR", "TB", 69, 3],
  ["George Pickens", "WR", "DAL", 70, 2],
  ["Michael Pittman Jr.", "WR", "IND", 71, 1],
  ["Chris Olave", "WR", "NO", 73, 1],
  ["Jordan Addison", "WR", "MIN", 75, 2],
  ["Keon Coleman", "WR", "BUF", 77, 2],
  ["Ricky Pearsall", "WR", "SF", 78, 1],
  ["Matthew Golden", "WR", "GB", 79, 1],
  ["Cooper Kupp", "WR", "SEA", 81, 2],
  ["Josh Downs", "WR", "IND", 83, 2],
  ["Stefon Diggs", "WR", "NE", 85, 1],
  ["Jauan Jennings", "WR", "SF", 86, 2],
  ["Darnell Mooney", "WR", "ATL", 87, 2],
  ["Rashid Shaheed", "WR", "NO", 89, 2],
  ["Jayden Reed", "WR", "GB", 91, 2],
  ["Marvin Mims Jr.", "WR", "DEN", 93, 2],
  ["Wan'Dale Robinson", "WR", "NYG", 95, 2],
  ["Quentin Johnston", "WR", "LAC", 97, 2],
  ["Luther Burden III", "WR", "CHI", 99, 3],
  ["Christian Watson", "WR", "GB", 102, 3],
  ["Alec Pierce", "WR", "IND", 105, 3],
  ["Tre Tucker", "WR", "LV", 107, 2],
  ["Cedric Tillman", "WR", "CLE", 111, 2],
  ["Adam Thielen", "WR", "CAR", 113, 2],
  ["Xavier Legette", "WR", "CAR", 117, 3],
  ["Kyle Williams", "WR", "NE", 119, 2],
  ["Jack Bech", "WR", "LV", 122, 3],
  ["Elic Ayomanor", "WR", "TEN", 125, 2],
  ["DeMario Douglas", "WR", "NE", 129, 3],
  ["Dontayvion Wicks", "WR", "GB", 133, 3],
  ["Pat Bryant", "WR", "DEN", 137, 3],
  ["Jalen Coker", "WR", "CAR", 141, 3],
  ["Troy Franklin", "WR", "DEN", 145, 3],
  ["Roman Wilson", "WR", "PIT", 150, 3],
  ["Malik Washington", "WR", "MIA", 155, 3],
  ["Andrei Iosivas", "WR", "CIN", 162, 3],
  ["Tank Dell", "WR", "HOU", 168, 3],
  ["Christian Kirk", "WR", "HOU", 174, 2],
  ["Dyami Brown", "WR", "JAX", 182, 3],
  ["Michael Wilson", "WR", "ARI", 192, 2],
  ["Jalen McMillan", "WR", "TB", 198, 4],
  ["Rashod Bateman", "WR", "BAL", 204, 2],
  ["Darius Slayton", "WR", "NYG", 214, 3],
  ["Brandin Cooks", "WR", "NO", 222, 3],
  ["Kayshon Boutte", "WR", "NE", 230, 4],
  ["Isaiah Bond", "WR", "CLE", 238, 4],

  // ---------------- TE ----------------
  ["Brock Bowers", "TE", "LV", 24, 1],
  ["Trey McBride", "TE", "ARI", 28, 1],
  ["George Kittle", "TE", "SF", 44, 1],
  ["Sam LaPorta", "TE", "DET", 51, 1],
  ["T.J. Hockenson", "TE", "MIN", 74, 1],
  ["Travis Kelce", "TE", "KC", 78, 1],
  ["Mark Andrews", "TE", "BAL", 88, 1],
  ["David Njoku", "TE", "CLE", 94, 1],
  ["Tucker Kraft", "TE", "GB", 101, 1],
  ["Evan Engram", "TE", "DEN", 109, 1],
  ["Colston Loveland", "TE", "CHI", 115, 1],
  ["Tyler Warren", "TE", "IND", 121, 1],
  ["Dallas Goedert", "TE", "PHI", 127, 1],
  ["Jonnu Smith", "TE", "PIT", 132, 1],
  ["Hunter Henry", "TE", "NE", 143, 1],
  ["Isaiah Likely", "TE", "BAL", 147, 2],
  ["Zach Ertz", "TE", "WAS", 151, 1],
  ["Dalton Kincaid", "TE", "BUF", 156, 1],
  ["Kyle Pitts Sr.", "TE", "ATL", 161, 1],
  ["Jake Ferguson", "TE", "DAL", 167, 1],
  ["Cade Otton", "TE", "TB", 173, 1],
  ["Pat Freiermuth", "TE", "PIT", 179, 2],
  ["Chigoziem Okonkwo", "TE", "TEN", 185, 1],
  ["Brenton Strange", "TE", "JAX", 191, 1],
  ["Juwan Johnson", "TE", "NO", 197, 1],
  ["Mike Gesicki", "TE", "CIN", 203, 1],
  ["Theo Johnson", "TE", "NYG", 209, 1],
  ["Elijah Arroyo", "TE", "SEA", 218, 1],
  ["Mason Taylor", "TE", "NYJ", 224, 1],
  ["Darren Waller", "TE", "MIA", 234, 1],

  // ---------------- K ----------------
  ["Brandon Aubrey", "K", "DAL", 130, 1],
  ["Cameron Dicker", "K", "LAC", 144, 1],
  ["Chris Boswell", "K", "PIT", 149, 1],
  ["Jake Bates", "K", "DET", 153, 1],
  ["Ka'imi Fairbairn", "K", "HOU", 157, 1],
  ["Harrison Butker", "K", "KC", 163, 1],
  ["Tyler Bass", "K", "BUF", 169, 1],
  ["Chase McLaughlin", "K", "TB", 175, 1],
  ["Jake Elliott", "K", "PHI", 181, 1],
  ["Younghoe Koo", "K", "ATL", 187, 1],
  ["Wil Lutz", "K", "DEN", 193, 1],
  ["Evan McPherson", "K", "CIN", 199, 1],
  ["Jason Sanders", "K", "MIA", 205, 1],
  ["Cairo Santos", "K", "CHI", 211, 1],
  ["Tyler Loop", "K", "BAL", 217, 1],
  ["Matt Gay", "K", "WAS", 223, 1],
  ["Joshua Karty", "K", "LAR", 229, 1],
  ["Will Reichard", "K", "MIN", 235, 1],

  // ---------------- DEF ----------------
  ["Broncos D/ST", "DEF", "DEN", 131, 1],
  ["Eagles D/ST", "DEF", "PHI", 139, 1],
  ["Ravens D/ST", "DEF", "BAL", 159, 1],
  ["Texans D/ST", "DEF", "HOU", 165, 1],
  ["Steelers D/ST", "DEF", "PIT", 171, 1],
  ["Vikings D/ST", "DEF", "MIN", 177, 1],
  ["Bills D/ST", "DEF", "BUF", 183, 1],
  ["Lions D/ST", "DEF", "DET", 189, 1],
  ["Packers D/ST", "DEF", "GB", 195, 1],
  ["Seahawks D/ST", "DEF", "SEA", 201, 1],
  ["Chargers D/ST", "DEF", "LAC", 207, 1],
  ["Chiefs D/ST", "DEF", "KC", 213, 1],
  ["Cardinals D/ST", "DEF", "ARI", 219, 1],
  ["49ers D/ST", "DEF", "SF", 225, 1],
  ["Buccaneers D/ST", "DEF", "TB", 231, 1],
  ["Jets D/ST", "DEF", "NYJ", 237, 1],
];

/**
 * Deterministic 18-week NFL schedule (circle-method round robin over 32 teams).
 * Teams rest on their bye week.
 */
let scheduleCache: Record<number, Record<string, { opp: string; home: boolean }>> | null = null;

export function nflSchedule(): Record<number, Record<string, { opp: string; home: boolean }>> {
  if (scheduleCache) return scheduleCache;
  const teams = [...NFL_TEAMS];
  const n = teams.length;
  const sched: Record<number, Record<string, { opp: string; home: boolean }>> = {};
  const rotation = teams.slice(1);
  for (let week = 1; week <= 18; week++) {
    const weekMap: Record<string, { opp: string; home: boolean }> = {};
    const order = [teams[0], ...rotation];
    for (let i = 0; i < n / 2; i++) {
      const a = order[i];
      const b = order[n - 1 - i];
      const aHome = (week + i) % 2 === 0;
      if (BYE_WEEKS[a] !== week && BYE_WEEKS[b] !== week) {
        weekMap[a] = { opp: b, home: aHome };
        weekMap[b] = { opp: a, home: !aHome };
      }
    }
    sched[week] = weekMap;
    // rotate
    rotation.unshift(rotation.pop() as (typeof rotation)[number]);
  }
  scheduleCache = sched;
  return sched;
}

export function opponentFor(team: string, week: number): { opp: string; home: boolean } | null {
  const sched = nflSchedule();
  return sched[week]?.[team] ?? null;
}

export interface UsageProfile {
  snapPct: number;
  targetShare: number;
  routePct: number;
  touchesPg: number;
  targetsPg: number;
  redZoneShare: number;
  passAttPg: number;
  rushAttPg: number;
}

/** Build realistic usage priors from ADP + depth chart slot. */
export function usageProfile(seed: Seed): UsageProfile {
  const [name, pos, , adp, depth] = seed;
  const r = rng(`usage:${name}`);
  const jitter = (scale: number) => (r() - 0.5) * scale;
  const strength = Math.max(0, 1 - Math.log10(Math.max(adp, 1)) / 2.45); // 1 → elite, 0 → deep

  switch (pos) {
    case "QB": {
      const starter = depth === 1;
      return {
        snapPct: starter ? 96 + jitter(4) : 12 + jitter(8),
        targetShare: 0,
        routePct: 0,
        touchesPg: starter ? 4 + strength * 6 + jitter(2) : 1,
        targetsPg: 0,
        redZoneShare: starter ? 22 + strength * 14 : 4,
        passAttPg: starter ? 30 + strength * 9 + jitter(4) : 6,
        rushAttPg: starter ? 2.5 + strength * 6 + jitter(2) : 1,
      };
    }
    case "RB": {
      const share = depth === 1 ? 0.55 + strength * 0.3 : depth === 2 ? 0.25 + strength * 0.18 : 0.1 + strength * 0.1;
      return {
        snapPct: Math.min(92, 30 + share * 70 + jitter(8)),
        targetShare: 6 + share * 10 + jitter(3),
        routePct: 25 + share * 45 + jitter(10),
        touchesPg: 4 + share * 19 + jitter(2.5),
        targetsPg: 1 + share * 5 + jitter(1),
        redZoneShare: 8 + share * 42 + jitter(6),
        passAttPg: 0,
        rushAttPg: 3 + share * 16 + jitter(2),
      };
    }
    case "WR": {
      const share = depth === 1 ? 0.24 + strength * 0.09 : depth === 2 ? 0.17 + strength * 0.07 : 0.1 + strength * 0.05;
      return {
        snapPct: Math.min(95, 45 + share * 160 + jitter(8)),
        targetShare: share * 100,
        routePct: Math.min(96, 50 + share * 150 + jitter(8)),
        touchesPg: share * 40 + jitter(1),
        targetsPg: share * 37 + jitter(1.2),
        redZoneShare: share * 70 + jitter(5),
        passAttPg: 0,
        rushAttPg: share > 0.22 ? 0.6 + jitter(0.5) : 0.15,
      };
    }
    case "TE": {
      const share = depth === 1 ? 0.14 + strength * 0.1 : 0.07 + strength * 0.04;
      return {
        snapPct: Math.min(94, 48 + share * 170 + jitter(8)),
        targetShare: share * 100,
        routePct: Math.min(92, 42 + share * 170 + jitter(9)),
        touchesPg: share * 35,
        targetsPg: share * 36 + jitter(1),
        redZoneShare: share * 85 + jitter(6),
        passAttPg: 0,
        rushAttPg: 0,
      };
    }
    case "K":
      return { snapPct: 100, targetShare: 0, routePct: 0, touchesPg: 0, targetsPg: 0, redZoneShare: 0, passAttPg: 0, rushAttPg: 0 };
    default:
      return { snapPct: 100, targetShare: 0, routePct: 0, touchesPg: 0, targetsPg: 0, redZoneShare: 0, passAttPg: 0, rushAttPg: 0 };
  }
}

export function playerAge(name: string, pos: Position): number {
  const r = rng(`age:${name}`);
  const base = pos === "QB" ? 27 : pos === "RB" ? 25 : pos === "TE" ? 26 : 26;
  return Math.round(base + (r() - 0.4) * 8);
}

export function playerExp(name: string): number {
  const r = rng(`exp:${name}`);
  return Math.max(0, Math.round(r() * 9));
}

export function jerseyFor(name: string): number {
  return (hash32(`jersey:${name}`) % 97) + 1;
}
