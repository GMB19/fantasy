export const INJURY = {
  HEALTHY: 'Healthy',
  QUESTIONABLE: 'Questionable',
  DOUBTFUL: 'Doubtful',
  OUT: 'Out',
  IR: 'IR'
};

export const playersSeed = [
  // QBs
  { id: 'p1', name: 'Josh Allen', pos: 'QB', team: 'BUF', age: 28, avatar: 'https://a.espncdn.com/combiner/i?img=/i/headshots/nfl/players/full/3918298.png', injury: INJURY.HEALTHY, depth: 'QB1', snapShare: 100, adp: 22, sleeperPPG: 22.4, sportsbookPPG: 24.1, consensusPPG: 23.2, value: 92, trend: 'up', owned: true, rostered: true, stats: { passYds: 312, passTd: 2.1, rushYds: 38, rushTd: 0.4 } },
  { id: 'p2', name: 'Jalen Hurts', pos: 'QB', team: 'PHI', age: 26, avatar: 'https://a.espncdn.com/combiner/i?img=/i/headshots/nfl/players/full/4040715.png', injury: INJURY.HEALTHY, depth: 'QB1', snapShare: 100, adp: 28, sleeperPPG: 21.8, sportsbookPPG: 23.9, consensusPPG: 22.6, value: 88, trend: 'up', owned: false },
  { id: 'p3', name: 'Lamar Jackson', pos: 'QB', team: 'BAL', age: 27, avatar: 'https://a.espncdn.com/combiner/i?img=/i/headshots/nfl/players/full/3916387.png', injury: INJURY.HEALTHY, depth: 'QB1', snapShare: 100, adp: 32, sleeperPPG: 21.5, sportsbookPPG: 22.0, consensusPPG: 21.7, value: 86, trend: 'stable', owned: false },
  { id: 'p4', name: 'Patrick Mahomes', pos: 'QB', team: 'KC', age: 29, avatar: 'https://a.espncdn.com/combiner/i?img=/i/headshots/nfl/players/full/3139477.png', injury: INJURY.HEALTHY, depth: 'QB1', snapShare: 100, adp: 36, sleeperPPG: 20.9, sportsbookPPG: 21.2, consensusPPG: 21.0, value: 85, trend: 'stable', owned: false },
  { id: 'p5', name: 'Jayden Daniels', pos: 'QB', team: 'WSH', age: 23, avatar: 'https://a.espncdn.com/combiner/i?img=/i/headshots/nfl/players/full/4432732.png', injury: INJURY.HEALTHY, depth: 'QB1', snapShare: 100, adp: 58, sleeperPPG: 19.2, sportsbookPPG: 21.5, consensusPPG: 19.8, value: 78, trend: 'up', owned: true, rostered: true },
  // RBs
  { id: 'p6', name: 'Christian McCaffrey', pos: 'RB', team: 'SF', age: 28, avatar: 'https://a.espncdn.com/combiner/i?img=/i/headshots/nfl/players/full/3117251.png', injury: INJURY.QUESTIONABLE, depth: 'RB1', snapShare: 78, routes: 42, touches: 21.2, adp: 2, sleeperPPG: 19.8, sportsbookPPG: 16.2, consensusPPG: 18.1, value: 94, trend: 'down', owned: false },
  { id: 'p7', name: 'Bijan Robinson', pos: 'RB', team: 'ATL', age: 22, avatar: 'https://a.espncdn.com/combiner/i?img=/i/headshots/nfl/players/full/4430807.png', injury: INJURY.HEALTHY, depth: 'RB1', snapShare: 68, routes: 38, touches: 18.5, adp: 5, sleeperPPG: 17.4, sportsbookPPG: 19.8, consensusPPG: 18.2, value: 91, trend: 'up', owned: true, rostered: true },
  { id: 'p8', name: 'Breece Hall', pos: 'RB', team: 'NYJ', age: 23, avatar: 'https://a.espncdn.com/combiner/i?img=/i/headshots/nfl/players/full/4426338.png', injury: INJURY.HEALTHY, depth: 'RB1', snapShare: 71, routes: 45, touches: 19.1, adp: 7, sleeperPPG: 16.9, sportsbookPPG: 18.4, consensusPPG: 17.3, value: 89, trend: 'up', owned: true, rostered: true },
  { id: 'p9', name: 'Jahmyr Gibbs', pos: 'RB', team: 'DET', age: 22, avatar: 'https://a.espncdn.com/combiner/i?img=/i/headshots/nfl/players/full/4430737.png', injury: INJURY.HEALTHY, depth: 'RB1A', snapShare: 58, routes: 48, touches: 15.4, adp: 12, sleeperPPG: 15.2, sportsbookPPG: 14.9, consensusPPG: 15.1, value: 84, trend: 'stable', owned: false },
  { id: 'p10', name: 'Saquon Barkley', pos: 'RB', team: 'PHI', age: 27, avatar: 'https://a.espncdn.com/combiner/i?img=/i/headshots/nfl/players/full/3929630.png', injury: INJURY.HEALTHY, depth: 'RB1', snapShare: 74, routes: 32, touches: 20.3, adp: 9, sleeperPPG: 16.5, sportsbookPPG: 17.9, consensusPPG: 16.8, value: 87, trend: 'up', owned: false },
  { id: 'p11', name: 'Kyren Williams', pos: 'RB', team: 'LAR', age: 24, avatar: 'https://a.espncdn.com/combiner/i?img=/i/headshots/nfl/players/full/4429202.png', injury: INJURY.HEALTHY, depth: 'RB1', snapShare: 82, routes: 35, touches: 22.1, adp: 18, sleeperPPG: 18.1, sportsbookPPG: 15.4, consensusPPG: 17.2, value: 82, trend: 'down', owned: false },
  { id: 'p12', name: 'De\'Von Achane', pos: 'RB', team: 'MIA', age: 22, avatar: 'https://a.espncdn.com/combiner/i?img=/i/headshots/nfl/players/full/4430802.png', injury: INJURY.QUESTIONABLE, depth: 'RB1', snapShare: 52, routes: 28, touches: 13.8, adp: 15, sleeperPPG: 14.6, sportsbookPPG: 13.1, consensusPPG: 14.0, value: 80, trend: 'down', owned: false },
  { id: 'p13', name: 'Kenneth Walker III', pos: 'RB', team: 'SEA', age: 24, avatar: 'https://a.espncdn.com/combiner/i?img=/i/headshots/nfl/players/full/4426354.png', injury: INJURY.HEALTHY, depth: 'RB1', snapShare: 62, routes: 18, touches: 16.2, adp: 24, sleeperPPG: 13.9, sportsbookPPG: 15.7, consensusPPG: 14.4, value: 76, trend: 'up', owned: true, rostered: false },
  { id: 'p14', name: 'James Cook', pos: 'RB', team: 'BUF', age: 25, avatar: 'https://a.espncdn.com/combiner/i?img=/i/headshots/nfl/players/full/4430734.png', injury: INJURY.HEALTHY, depth: 'RB1', snapShare: 61, routes: 36, touches: 15.8, adp: 26, sleeperPPG: 13.5, sportsbookPPG: 14.2, consensusPPG: 13.7, value: 74, trend: 'stable', owned: false },
  { id: 'p15', name: 'Isiah Pacheco', pos: 'RB', team: 'KC', age: 25, avatar: 'https://a.espncdn.com/combiner/i?img=/i/headshots/nfl/players/full/4426360.png', injury: INJURY.HEALTHY, depth: 'RB1', snapShare: 68, routes: 24, touches: 17.0, adp: 29, sleeperPPG: 12.8, sportsbookPPG: 13.9, consensusPPG: 13.1, value: 71, trend: 'up', owned: false },
  { id: 'p16', name: 'Tony Pollard', pos: 'RB', team: 'TEN', age: 27, avatar: 'https://a.espncdn.com/combiner/i?img=/i/headshots/nfl/players/full/4035004.png', injury: INJURY.HEALTHY, depth: 'RB1', snapShare: 64, routes: 31, touches: 16.5, adp: 42, sleeperPPG: 11.2, sportsbookPPG: 12.8, consensusPPG: 11.7, value: 62, trend: 'up', owned: false },
  { id: 'p58', name: 'Jonathon Brooks', pos: 'RB', team: 'CAR', age: 21, avatar: 'https://a.espncdn.com/combiner/i?img=/i/headshots/nfl/players/full/4430878.png', injury: INJURY.HEALTHY, depth: 'RB2', snapShare: 34, routes: 12, touches: 8.2, adp: 88, sleeperPPG: 7.2, sportsbookPPG: 10.4, consensusPPG: 8.0, value: 58, trend: 'up', owned: false },
  { id: 'p59', name: 'Bucky Irving', pos: 'RB', team: 'TB', age: 22, avatar: 'https://a.espncdn.com/combiner/i?img=/i/headshots/nfl/players/full/4432579.png', injury: INJURY.HEALTHY, depth: 'RB2', snapShare: 41, routes: 22, touches: 10.1, adp: 112, sleeperPPG: 8.9, sportsbookPPG: 11.3, consensusPPG: 9.4, value: 64, trend: 'up', owned: false },
  // WRs
  { id: 'p17', name: 'Justin Jefferson', pos: 'WR', team: 'MIN', age: 25, avatar: 'https://a.espncdn.com/combiner/i?img=/i/headshots/nfl/players/full/4262921.png', injury: INJURY.HEALTHY, depth: 'WR1', snapShare: 92, routes: 96, targetShare: 28.5, adp: 3, sleeperPPG: 18.6, sportsbookPPG: 19.4, consensusPPG: 18.9, value: 96, trend: 'stable', owned: true, rostered: true },
  { id: 'p18', name: 'Tyreek Hill', pos: 'WR', team: 'MIA', age: 30, avatar: 'https://a.espncdn.com/combiner/i?img=/i/headshots/nfl/players/full/3116406.png', injury: INJURY.QUESTIONABLE, depth: 'WR1', snapShare: 84, routes: 92, targetShare: 26.1, adp: 4, sleeperPPG: 17.9, sportsbookPPG: 15.2, consensusPPG: 17.1, value: 90, trend: 'down', owned: false },
  { id: 'p19', name: 'Ceedee Lamb', pos: 'WR', team: 'DAL', age: 25, avatar: 'https://a.espncdn.com/combiner/i?img=/i/headshots/nfl/players/full/4241389.png', injury: INJURY.HEALTHY, depth: 'WR1', snapShare: 91, routes: 95, targetShare: 29.2, adp: 6, sleeperPPG: 18.2, sportsbookPPG: 18.9, consensusPPG: 18.4, value: 94, trend: 'stable', owned: false },
  { id: 'p20', name: 'Ja\'Marr Chase', pos: 'WR', team: 'CIN', age: 24, avatar: 'https://a.espncdn.com/combiner/i?img=/i/headshots/nfl/players/full/4360310.png', injury: INJURY.HEALTHY, depth: 'WR1', snapShare: 89, routes: 93, targetShare: 27.8, adp: 8, sleeperPPG: 16.8, sportsbookPPG: 18.1, consensusPPG: 17.2, value: 90, trend: 'up', owned: false },
  { id: 'p21', name: 'Amon-Ra St. Brown', pos: 'WR', team: 'DET', age: 25, avatar: 'https://a.espncdn.com/combiner/i?img=/i/headshots/nfl/players/full/4374302.png', injury: INJURY.HEALTHY, depth: 'WR1', snapShare: 88, routes: 90, targetShare: 26.4, adp: 10, sleeperPPG: 16.2, sportsbookPPG: 16.0, consensusPPG: 16.1, value: 88, trend: 'stable', owned: true, rostered: true },
  { id: 'p22', name: 'Garrett Wilson', pos: 'WR', team: 'NYJ', age: 24, avatar: 'https://a.espncdn.com/combiner/i?img=/i/headshots/nfl/players/full/4426347.png', injury: INJURY.HEALTHY, depth: 'WR1', snapShare: 94, routes: 96, targetShare: 27.1, adp: 14, sleeperPPG: 14.1, sportsbookPPG: 16.4, consensusPPG: 14.9, value: 84, trend: 'up', owned: true, rostered: true },
  { id: 'p23', name: 'Puka Nacua', pos: 'WR', team: 'LAR', age: 23, avatar: 'https://a.espncdn.com/combiner/i?img=/i/headshots/nfl/players/full/4430905.png', injury: INJURY.QUESTIONABLE, depth: 'WR1', snapShare: 86, routes: 88, targetShare: 24.9, adp: 16, sleeperPPG: 15.5, sportsbookPPG: 13.8, consensusPPG: 14.9, value: 86, trend: 'down', owned: false },
  { id: 'p24', name: 'A.J. Brown', pos: 'WR', team: 'PHI', age: 27, avatar: 'https://a.espncdn.com/combiner/i?img=/i/headshots/nfl/players/full/4040715.png', injury: INJURY.HEALTHY, depth: 'WR1', snapShare: 87, routes: 91, targetShare: 25.3, adp: 11, sleeperPPG: 15.8, sportsbookPPG: 16.2, consensusPPG: 15.9, value: 87, trend: 'stable', owned: false },
  { id: 'p25', name: 'Marvin Harrison Jr.', pos: 'WR', team: 'ARI', age: 22, avatar: 'https://a.espncdn.com/combiner/i?img=/i/headshots/nfl/players/full/4430878.png', injury: INJURY.HEALTHY, depth: 'WR1', snapShare: 91, routes: 94, targetShare: 26.8, adp: 13, sleeperPPG: 14.8, sportsbookPPG: 16.9, consensusPPG: 15.4, value: 85, trend: 'up', owned: false },
  { id: 'p26', name: 'Drake London', pos: 'WR', team: 'ATL', age: 23, avatar: 'https://a.espncdn.com/combiner/i?img=/i/headshots/nfl/players/full/4426335.png', injury: INJURY.HEALTHY, depth: 'WR1', snapShare: 89, routes: 92, targetShare: 24.7, adp: 19, sleeperPPG: 13.9, sportsbookPPG: 15.1, consensusPPG: 14.2, value: 79, trend: 'up', owned: false },
  { id: 'p27', name: 'Nico Collins', pos: 'WR', team: 'HOU', age: 25, avatar: 'https://a.espncdn.com/combiner/i?img=/i/headshots/nfl/players/full/4241478.png', injury: INJURY.HEALTHY, depth: 'WR1', snapShare: 85, routes: 89, targetShare: 23.9, adp: 21, sleeperPPG: 14.2, sportsbookPPG: 13.5, consensusPPG: 14.0, value: 77, trend: 'stable', owned: false },
  { id: 'p28', name: 'DK Metcalf', pos: 'WR', team: 'PIT', age: 27, avatar: 'https://a.espncdn.com/combiner/i?img=/i/headshots/nfl/players/full/4047650.png', injury: INJURY.HEALTHY, depth: 'WR1', snapShare: 90, routes: 93, targetShare: 22.8, adp: 23, sleeperPPG: 13.4, sportsbookPPG: 12.1, consensusPPG: 13.0, value: 75, trend: 'down', owned: false },
  { id: 'p60', name: 'Malik Nabers', pos: 'WR', team: 'NYG', age: 21, avatar: 'https://a.espncdn.com/combiner/i?img=/i/headshots/nfl/players/full/4430878.png', injury: INJURY.HEALTHY, depth: 'WR1', snapShare: 88, routes: 91, targetShare: 27.5, adp: 17, sleeperPPG: 13.1, sportsbookPPG: 15.8, consensusPPG: 13.9, value: 83, trend: 'up', owned: true, rostered: false },
  { id: 'p61', name: 'Brian Thomas Jr.', pos: 'WR', team: 'JAX', age: 21, avatar: 'https://a.espncdn.com/combiner/i?img=/i/headshots/nfl/players/full/4432579.png', injury: INJURY.HEALTHY, depth: 'WR2', snapShare: 78, routes: 82, targetShare: 19.2, adp: 35, sleeperPPG: 11.8, sportsbookPPG: 14.0, consensusPPG: 12.4, value: 72, trend: 'up', owned: false },
  { id: 'p62', name: 'Jaxon Smith-Njigba', pos: 'WR', team: 'SEA', age: 22, avatar: 'https://a.espncdn.com/combiner/i?img=/i/headshots/nfl/players/full/4430878.png', injury: INJURY.HEALTHY, depth: 'WR2', snapShare: 72, routes: 78, targetShare: 21.4, adp: 38, sleeperPPG: 11.2, sportsbookPPG: 13.6, consensusPPG: 11.9, value: 70, trend: 'up', owned: true, rostered: true },
  { id: 'p63', name: 'Tank Dell', pos: 'WR', team: 'HOU', age: 24, avatar: 'https://a.espncdn.com/combiner/i?img=/i/headshots/nfl/players/full/4430878.png', injury: INJURY.OUT, depth: 'WR2', snapShare: 0, routes: 0, targetShare: 0, adp: 45, sleeperPPG: 10.5, sportsbookPPG: 9.8, consensusPPG: 10.2, value: 55, trend: 'down', owned: false },
  // TEs
  { id: 'p29', name: 'Sam LaPorta', pos: 'TE', team: 'DET', age: 23, avatar: 'https://a.espncdn.com/combiner/i?img=/i/headshots/nfl/players/full/4430878.png', injury: INJURY.HEALTHY, depth: 'TE1', snapShare: 84, routes: 68, targetShare: 19.2, adp: 30, sleeperPPG: 11.8, sportsbookPPG: 12.9, consensusPPG: 12.1, value: 78, trend: 'up', owned: false },
  { id: 'p30', name: 'Travis Kelce', pos: 'TE', team: 'KC', age: 35, avatar: 'https://a.espncdn.com/combiner/i?img=/i/headshots/nfl/players/full/15847.png', injury: INJURY.HEALTHY, depth: 'TE1', snapShare: 82, routes: 72, targetShare: 21.5, adp: 33, sleeperPPG: 10.9, sportsbookPPG: 10.2, consensusPPG: 10.7, value: 72, trend: 'down', owned: false },
  { id: 'p31', name: 'Mark Andrews', pos: 'TE', team: 'BAL', age: 29, avatar: 'https://a.espncdn.com/combiner/i?img=/i/headshots/nfl/players/full/3116365.png', injury: INJURY.HEALTHY, depth: 'TE1', snapShare: 78, routes: 65, targetShare: 18.4, adp: 40, sleeperPPG: 10.2, sportsbookPPG: 11.6, consensusPPG: 10.6, value: 70, trend: 'up', owned: true, rostered: true },
  { id: 'p32', name: 'Trey McBride', pos: 'TE', team: 'ARI', age: 25, avatar: 'https://a.espncdn.com/combiner/i?img=/i/headshots/nfl/players/full/4426348.png', injury: INJURY.HEALTHY, depth: 'TE1', snapShare: 88, routes: 74, targetShare: 22.1, adp: 44, sleeperPPG: 11.2, sportsbookPPG: 13.4, consensusPPG: 11.9, value: 76, trend: 'up', owned: false },
  { id: 'p33', name: 'Brock Bowers', pos: 'TE', team: 'LV', age: 21, avatar: 'https://a.espncdn.com/combiner/i?img=/i/headshots/nfl/players/full/4430878.png', injury: INJURY.HEALTHY, depth: 'TE1', snapShare: 81, routes: 70, targetShare: 20.3, adp: 48, sleeperPPG: 10.5, sportsbookPPG: 12.1, consensusPPG: 11.0, value: 74, trend: 'up', owned: false },
  { id: 'p64', name: 'Tucker Kraft', pos: 'TE', team: 'GB', age: 24, avatar: 'https://a.espncdn.com/combiner/i?img=/i/headshots/nfl/players/full/4429202.png', injury: INJURY.HEALTHY, depth: 'TE1', snapShare: 71, routes: 52, targetShare: 14.2, adp: 120, sleeperPPG: 7.8, sportsbookPPG: 9.6, consensusPPG: 8.2, value: 58, trend: 'up', owned: false },
  // Defenses / Kickers as bench depth (simplified)
  { id: 'p34', name: 'Dallas Cowboys DST', pos: 'DEF', team: 'DAL', age: null, avatar: '', injury: INJURY.HEALTHY, depth: 'DST1', sleeperPPG: 8.2, sportsbookPPG: 8.0, consensusPPG: 8.1, value: 40, trend: 'stable', owned: true, rostered: false },
  { id: 'p35', name: 'Justin Tucker', pos: 'K', team: 'BAL', age: 35, avatar: '', injury: INJURY.HEALTHY, depth: 'K1', sleeperPPG: 8.5, sportsbookPPG: 8.5, consensusPPG: 8.5, value: 30, trend: 'stable', owned: true, rostered: false },
];

export const leagueSeed = {
  id: 'lg1',
  name: 'Arena Championship League',
  season: 2024,
  avatar: 'https://sleepercdn.com/avatars/thumbs/1234567890123456789',
  scoring: 'PPR • 1QB / 2RB / 3WR / 1TE / 1FLEX • 12 Teams',
  rosterPositions: ['QB','RB','RB','WR','WR','WR','TE','FLEX','BN','BN','BN','BN','BN','BN','IR'],
  teamsCount: 12,
  entryFee: '$100',
  pot: '$1,200',
  commissioner: 'commish_arena',
  status: 'In Season • Week 7',
  waiverType: 'FAAB • $100 budget',
  tradeDeadline: 'Week 11'
};

export const teamsSeed = [
  { id: 't1', leagueId: 'lg1', owner: 'You', name: 'Gotham GMs', avatar: '🐺', record: '4-2', wins: 4, losses: 2, pointsFor: 842.6, pointsAgainst: 789.2, waiver: 3, faab: 67, streak: 'W2', playoffProb: 71.4, champProb: 14.2, rosterStrength: 82, rank: 4 },
  { id: 't2', leagueId: 'lg1', owner: 'mike_runs', name: 'The Chosen Ones', avatar: '👑', record: '5-1', wins: 5, losses: 1, pointsFor: 912.4, pointsAgainst: 721.5, waiver: 7, faab: 42, streak: 'W4', playoffProb: 89.2, champProb: 22.1, rosterStrength: 91, rank: 1 },
  { id: 't3', leagueId: 'lg1', owner: 'sarah_sleeper', name: 'Sarah\'s Smash', avatar: '⚡', record: '5-1', wins: 5, losses: 1, pointsFor: 889.1, pointsAgainst: 745.3, waiver: 9, faab: 81, streak: 'W1', playoffProb: 87.5, champProb: 18.4, rosterStrength: 88, rank: 2 },
  { id: 't4', leagueId: 'lg1', owner: 'draft_punk', name: 'Draft Punk', avatar: '🎸', record: '4-2', wins: 4, losses: 2, pointsFor: 856.2, pointsAgainst: 802.1, waiver: 2, faab: 55, streak: 'L1', playoffProb: 68.9, champProb: 12.8, rosterStrength: 79, rank: 3 },
  { id: 't5', leagueId: 'lg1', owner: 'waiver_wizard', name: 'Wire Wizards', avatar: '🧙', record: '3-3', wins: 3, losses: 3, pointsFor: 798.4, pointsAgainst: 812.5, waiver: 11, faab: 12, streak: 'W1', playoffProb: 44.2, champProb: 6.1, rosterStrength: 71, rank: 6 },
  { id: 't6', leagueId: 'lg1', owner: 'tradebot', name: 'Trade Machine', avatar: '🤖', record: '3-3', wins: 3, losses: 3, pointsFor: 802.1, pointsAgainst: 798.9, waiver: 5, faab: 33, streak: 'L2', playoffProb: 46.7, champProb: 7.4, rosterStrength: 73, rank: 5 },
  { id: 't7', leagueId: 'lg1', owner: 'injury_cursed', name: 'IR List FC', avatar: '🏥', record: '2-4', wins: 2, losses: 4, pointsFor: 712.3, pointsAgainst: 845.2, waiver: 1, faab: 94, streak: 'L3', playoffProb: 18.4, champProb: 1.2, rosterStrength: 58, rank: 10 },
  { id: 't8', leagueId: 'lg1', owner: 'zero_rb', name: 'Zero RB Heroes', avatar: '🦸', record: '2-4', wins: 2, losses: 4, pointsFor: 734.5, pointsAgainst: 821.4, waiver: 4, faab: 21, streak: 'W1', playoffProb: 22.1, champProb: 2.4, rosterStrength: 62, rank: 9 },
];

export const myRosterIds = ['p1','p5','p7','p8','p13','p17','p21','p22','p60','p62','p31','p34','p35','p59']; // curated IDs
export const myStartersIds = ['p1','p7','p8','p17','p21','p22','p31','p62','p13']; // QB,2RB,3WR,TE,FLEX (will map to slots)

export const scheduleSeed = [
  { week: 1, opponent: 'Draft Punk', result: 'W 142.3 - 128.1', proj: 132.1 },
  { week: 2, opponent: 'IR List FC', result: 'W 138.9 - 98.4', proj: 131.4 },
  { week: 3, opponent: 'The Chosen Ones', result: 'L 118.2 - 156.7', proj: 129.8 },
  { week: 4, opponent: 'Wire Wizards', result: 'L 121.4 - 134.2', proj: 130.2 },
  { week: 5, opponent: 'Zero RB Heroes', result: 'W 152.1 - 118.9', proj: 133.5 },
  { week: 6, opponent: 'Trade Machine', result: 'W 169.7 - 121.3', proj: 134.0 },
  { week: 7, opponent: 'Sarah\'s Smash', result: null, proj: 136.2, opponentProj: 141.5 },
  { week: 8, opponent: 'Draft Punk', result: null, proj: 138.1, opponentProj: 129.4 },
];

export const tradeSeed = [
  {
    id: 'tr1',
    type: 'buy-low',
    status: 'pending',
    partner: 'IR List FC',
    partnerAvatar: '🏥',
    give: ['p13','p60'],
    receive: ['p6'],
    deltaPPG: -4.2,
    sportsbookDelta: +2.4,
    champDelta: +2.1,
    reasoning: 'Sportsbook market underpricing CMC after questionable tag. Sleeper PPG inflated by early season. FanDuel rush yds prop 68.5 → 6.8 pts undervalued. You buy the dip, shed Kenneth Walker (sell-high spot vs SEA run funnel) + Nabers bench depth.',
    confidence: 87,
    expires: '6h left',
    risk: 'Medium',
    autoEligible: true
  },
  {
    id: 'tr2',
    type: 'sell-high',
    status: 'proposed',
    partner: 'Zero RB Heroes',
    partnerAvatar: '🦸',
    give: ['p22'],
    receive: ['p10','p61'],
    deltaPPG: +1.1,
    sportsbookDelta: +3.8,
    champDelta: +1.4,
    reasoning: 'Garrett Wilson sleeper projection (14.1) 2.3 pts below sportsbook (16.4) but his trade value peaked after 2 TD week. Flip for Barkley (Fanduel anytime TD -115 implies 0.42 TD) + Brian Thomas Jr who has +2.2 sportsbook edge & routes up 12% last 3 weeks.',
    confidence: 79,
    expires: 'Sent 2h ago',
    risk: 'Low',
    autoEligible: false
  },
  {
    id: 'tr3',
    type: 'buy-low',
    status: 'scanning',
    partner: 'Wire Wizards',
    partnerAvatar: '🧙',
    give: ['p34','p35'],
    receive: ['p32'],
    deltaPPG: +2.2,
    sportsbookDelta: +2.8,
    champDelta: +1.8,
    reasoning: 'Trey McBride TE1 route share 74% + 22% target share. FanDuel rec yards 52.5 & receptions 4.5 heavily juiced over. Sleeper still ranking him TE8 (10.6). DST/K are replaceable. Championship leverage +1.8% for a waiver-wire DST swap.',
    confidence: 91,
    expires: 'Ready to send',
    risk: 'Low',
    autoEligible: true
  },
  {
    id: 'tr4',
    type: 'arbitrage',
    status: 'scanning',
    partner: 'The Chosen Ones',
    partnerAvatar: '👑',
    give: ['p5','p62'],
    receive: ['p2'],
    deltaPPG: +0.4,
    sportsbookDelta: +2.4,
    champDelta: +0.9,
    reasoning: 'Jayden Daniels sportsbook overperformance (+2.3) priced in after rushing prop spike. Jalen Hurts tush-push TD equity mispriced by Sleeper (21.8 vs 23.9 book). Straight QB upgrade with JSN as throw-in — books see Hurts 42.5 rush yds vs your league street.',
    confidence: 74,
    expires: 'Scanning',
    risk: 'Medium',
    autoEligible: true
  },
];

export const waiverSeed = [
  { id: 'w1', playerId: 'p59', priority: 1, dropId: 'p34', faab: 14, claimed: false, reasoning: 'Bucky Irving: FanDuel rush attempt prop 11.5 → sportsbook PPG 11.3 vs Sleeper 8.9 (+2.4 edge). 41% snaps, Rachaad White efficiency collapsing (3.1 YPC). Champions win on RB3 arbitrage.', edge: 2.4, rosteredPct: 34, trending: 89 },
  { id: 'w2', playerId: 'p58', priority: 2, dropId: 'p35', faab: 8, claimed: false, reasoning: 'Jonathon Brooks: Activated, routes ramping. Sportsbook 10.4 vs Sleeper 7.2 edge +3.2 biggest on wire. Books pricing Carolina 18 touches/gm ROS — classic stashing window before value spike.', edge: 3.2, rosteredPct: 21, trending: 76 },
  { id: 'w3', playerId: 'p64', priority: 3, dropId: null, faab: 6, claimed: false, reasoning: 'Tucker Kraft: TE12 → TE7 implied move. FanDuel rec 34.5 & TD +180 pricing 0.36 TD vs Sleeper 0.22. Jordan Love aDOT up. Low-cost TE streaming leverage.', edge: 1.8, rosteredPct: 18, trending: 62 },
  { id: 'w4', playerId: 'p61', priority: 4, dropId: null, faab: 11, claimed: false, reasoning: 'Brian Thomas: Routes 82% → books see 14.0 PPG vs Sleeper 11.8. Trevor Lawrence target share trending 24% → 29% last 2. Market hasn\'t caught up.', edge: 2.2, rosteredPct: 41, trending: 71 },
];

export const newsSeed = [
  { id: 'n1', time: '12m ago', type: 'Injury', severity: 'medium', player: 'Christian McCaffrey', team: 'SF', title: 'CMC limited in practice — calf maintenance', body: 'Shanahan calls it "precautionary." FanDuel rush yards line moved 68.5 → 64.5, but TD prop held. Books still imply 16.2 PPG vs Sleeper 19.8 — buy-low window intact. AI GM flagged: HOLD valuation, do not sell.', impact: '-3.6 pts Sleeper vs Book', tag: 'BUY LOW' },
  { id: 'n2', time: '34m ago', type: 'Usage', severity: 'high', player: 'Jaxon Smith-Njigba', team: 'SEA', title: 'JSN: 78% routes, 28% target share Week 6', body: 'Per PFF: JSN ran 34 routes (season high), 9 targets. Next Gen: 2.4 y/route. Sleeper WR rank WR34 (11.2 PPG) vs Sportsbook 13.6 — +2.4 edge. AI: promoted to lineup optimizer FLEX pivot.', impact: '+2.4 sportsbook edge', tag: 'LINEUP BOOST' },
  { id: 'n3', time: '1h ago', type: 'Vegas', severity: 'high', player: 'Garrett Wilson', team: 'NYJ', title: 'Wilson FanDuel receiving yards 82.5 (juiced over -118)', body: 'Implied ~6.1 rec / 84 yds + TD equity. Sleeper projection 14.1 vs Book 16.4. Rodgers target share stable. AI Trade Finder re-ranked Wilson as SELL-HIGH at peak value.', impact: '+2.3 PPG delta', tag: 'SELL HIGH' },
  { id: 'n4', time: '2h ago', type: 'Depth Chart', severity: 'low', player: 'Bucky Irving', team: 'TB', title: 'Irving overtakes White in 2-min drill', body: 'Bowles: "Hot hand." Snap share 41% → expected 52% per beat reports. Books already moved: rushing attempts 11.5 over -110. Sleeper still 34% rostered — add now.', impact: 'Waiver priority #1', tag: 'WAIVER ALERT' },
  { id: 'n5', time: '4h ago', type: 'Breakout', severity: 'medium', player: 'Trey McBride', team: 'ARI', title: 'McBride: 22% target share, 74% routes', body: 'Trey has 74% route participation (TE1) and 3 straight 6+ target games. FanDuel alt line 62.5 yards +210 hammered. Sleeper TE rank lags 2.8 pts — AI proposing DST+K swap.', impact: '+2.8 PPG arbitrage', tag: 'TRADE TARGET' },
  { id: 'n6', time: '6h ago', type: 'Matchup', severity: 'low', player: 'Bijan Robinson', team: 'ATL', title: 'Bijan vs SEA: 28th vs RB, 4.9 YPC allowed', body: 'Seattle funnel: +12% rush efficiency over expected. Atlanta OL 3rd in rush success. FanDuel rush yds 78.5, TD -145. AI Lineup Optimizer: locked RB1.', impact: 'Elite matchup', tag: 'START' },
];

export const activitySeed = [
  { id: 'a1', ts: Date.now() - 1000*60*12, type: 'lineup', title: 'Lineup optimized for Week 7', desc: 'Benched Kenneth Walker (vs SF) for Jaxon Smith-Njigba (vs ATL). Book projects +2.1 pts, matchup delta +1.4.', reasoning: 'JSN 78% routes vs ATL slot funnel (30th vs slot). Walker faces SF front (-4.2 adj). Sportsbook PPG delta favored JSN by 2.4.', delta: '+2.1 PPG', status: 'done' },
  { id: 'a2', ts: Date.now() - 1000*60*34, type: 'trade', title: 'Trade scan: 4 advantageous deals flagged', desc: 'Flagged CMC buy-low (+2.1% champ), Wilson sell-high, McBride swap. 2 auto-eligible under risk limits.', reasoning: 'Simmed 10k seasons: CMC buy-low increases playoff odds 6.3% despite -4.2 PPG surface dip (health-adjusted).', delta: '+5.3% championship', status: 'scanning' },
  { id: 'a3', ts: Date.now() - 1000*60*68, type: 'waiver', title: 'Waiver claims queued (3)', desc: 'Bucky Irving ($14), Jonathon Brooks ($8), Tucker Kraft ($6). All clear FAAB limits and roster constraints.', reasoning: 'Edge >1.8 & rostered <45% threshold met. Drop candidates: DST/K streamers (replacement PPG 7.8 vs rostered 8.x).', delta: '+4.2 PPG bench', status: 'queued' },
  { id: 'a4', ts: Date.now() - 1000*60*120, type: 'news', title: 'Monitored news: CMC limited', desc: 'Parsed Shanahan comments, adjusted CMC value -2, but sportsbook anchor held at 16.2. No trade value change.', reasoning: 'NLP: "precautionary" + TD prop stable = noise, not signal. Depth chart unchanged.', delta: 'No action', status: 'monitoring' },
  { id: 'a5', ts: Date.now() - 1000*60*210, type: 'simulation', title: 'Season simulation: 10,000 runs', desc: 'Current roster: 71.4% playoffs, 14.2% championship. +0.4% since last waiver add (JSN promotion).', reasoning: 'Monte Carlo with sportsbook-implied PPG + variance (weather, injuries). Favorable schedule ROS (4 bottom-10 matchups).', delta: '+0.4% ring', status: 'done' },
  { id: 'a6', ts: Date.now() - 1000*60*320, type: 'trade', title: 'Auto-trade blocked — risk limit', desc: 'Wanted to send Wilson → Barkley swap but confidence 79% below auto-send 85% threshold (requires approval).', reasoning: 'User setting: min approval confidence 85%. Notified for manual approval.', delta: 'Needs approval', status: 'blocked' },
];

export const aiSettingsSeed = {
  autonomousMode: true,
  tradeApprovalRequired: true,
  waiverAutomation: true,
  lineupAutomation: true,
  newsMonitoring: true,
  riskTolerance: 'balanced', // conservative | balanced | aggressive
  maxDailyTransactions: 3,
  minChampProbImprovement: 0.8,
  minConfidenceAuto: 85,
  faabLimitPerClaim: 15,
  sportsbookWeight: 65, // % weight to books vs sleeper
};

export const simulationsSeed = {
  playoff: 71.4,
  champ: 14.2,
  expectedWins: 8.7,
  expectedPF: 1824,
  strengthOfSchedule: 'Easy (24th)',
  bestBall: 88.1
};
