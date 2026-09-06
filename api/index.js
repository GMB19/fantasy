import express from 'express';
import cors from 'cors';

const app = express();
app.use(cors());
app.use(express.json());

// --- Mock helpers (same as server/index.js) for fallback when Sleeper offline in preview ---
function mockUser(username) {
  return {
    user_id: String(100000 + Math.floor(Math.random() * 900000)),
    username,
    display_name: username,
    avatar: "b5e737c7a0e7b8f322faddc7a66fdb18",
    is_bot: false,
  };
}
function mockLeagues(userId, season, usernameHint) {
  const base = usernameHint || 'gotham_gm';
  return [
    {
      league_id: "112233445566778899",
      name: `Arena Championship League — @${base}`,
      season: String(season),
      season_type: "regular",
      total_rosters: 12,
      status: "in_season",
      sport: "nfl",
      scoring_settings: { rec: 1, rush_yd: 0.1 },
      roster_positions: ["QB","RB","RB","WR","WR","WR","TE","FLEX","BN","BN","BN","BN","BN","BN","IR"],
      avatar: "a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6",
      settings: { playoff_week_start: 15, trade_deadline: 11 }
    },
    {
      league_id: "998877665544332211",
      name: `The Dime Package — @${base}`,
      season: String(season),
      season_type: "regular",
      total_rosters: 10,
      status: "in_season",
      sport: "nfl",
      scoring_settings: { rec: 0.5 },
      roster_positions: ["QB","RB","RB","WR","WR","TE","FLEX","BN","BN","BN","IR"],
      avatar: null,
      settings: { playoff_week_start: 15 }
    }
  ];
}

// In-memory data store for /api/data (Vercel serverless is ephemeral — real persistence is localStorage, this is just echo)
let memData = null;

// Health — support both /api/health and /health (Vercel rewrite may strip prefix)
app.get(['/api/health', '/health'], (req, res) => res.json({ ok: true, time: new Date().toISOString(), env: 'vercel' }));

// Data persistence (ephemeral on Vercel — frontend also mirrors to localStorage)
app.get(['/api/data', '/data'], (req, res) => res.json(memData || { empty: true }));
app.post(['/api/data', '/data'], (req, res) => {
  memData = req.body;
  res.json({ ok: true });
});

// Sleeper: user lookup (support both prefix variants)
app.get(['/api/sleeper/user/:username', '/sleeper/user/:username'], async (req, res) => {
  const { username } = req.params;
  if (!username || username.length < 2) return res.status(400).json({ error: 'Invalid username' });
  try {
    const r = await fetch(`https://api.sleeper.app/v1/user/${encodeURIComponent(username)}`, { signal: AbortSignal.timeout(3500) });
    if (r.ok) {
      const data = await r.json();
      if (data && data.user_id) return res.json(data);
      if (data === null) return res.status(404).json({ error: 'User not found on Sleeper', mockAvailable: true });
    }
    console.log(`[Sleeper vercel] fallback mock user for ${username} (status ${r.status})`);
    return res.json({ ...mockUser(username), _mock: true, _note: "Sleeper API unavailable — demo user returned (vercel fallback)" });
  } catch (e) {
    console.log(`[Sleeper vercel] fetch failed for ${username}:`, e.message);
    return res.json({ ...mockUser(username), _mock: true, _note: "Sleeper API offline — demo user" });
  }
});

// Sleeper: leagues
async function handleLeagues(req, res) {
  const { userId, season } = req.params;
  try {
    const r = await fetch(`https://api.sleeper.app/v1/user/${encodeURIComponent(userId)}/leagues/nfl/${encodeURIComponent(season)}`, { signal: AbortSignal.timeout(3500) });
    if (r.ok) {
      const data = await r.json();
      if (Array.isArray(data)) return res.json(data);
    }
    console.log(`[Sleeper vercel] fallback mock leagues for ${userId} season ${season}`);
    return res.json(mockLeagues(userId, season));
  } catch (e) {
    console.log(`[Sleeper vercel] leagues fetch failed:`, e.message);
    return res.json(mockLeagues(userId, season));
  }
}
app.get(['/api/sleeper/user/:userId/leagues/nfl/:season', '/sleeper/user/:userId/leagues/nfl/:season'], handleLeagues);
app.get(['/api/sleeper/user/:userId/leagues/:season', '/sleeper/user/:userId/leagues/:season'], handleLeagues);

// Sleeper: league by ID
app.get(['/api/sleeper/league/:leagueId', '/sleeper/league/:leagueId'], async (req, res) => {
  const id = req.params.leagueId;
  try {
    const [leagueRes, rostersRes, usersRes] = await Promise.all([
      fetch(`https://api.sleeper.app/v1/league/${id}`, { signal: AbortSignal.timeout(3500) }).then(r => r.ok ? r.json() : null),
      fetch(`https://api.sleeper.app/v1/league/${id}/rosters`, { signal: AbortSignal.timeout(3500) }).then(r => r.ok ? r.json() : null),
      fetch(`https://api.sleeper.app/v1/league/${id}/users`, { signal: AbortSignal.timeout(3500) }).then(r => r.ok ? r.json() : null),
    ]);
    if (leagueRes && leagueRes.league_id) {
      return res.json({ league: leagueRes, rosters: rostersRes || [], users: usersRes || [] });
    }
    // if Sleeper returned null/404
    if (leagueRes === null) return res.status(404).json({ error: 'League not found', leagueId: id });
    return res.json({ league: leagueRes, rosters: rostersRes || [], users: usersRes || [] });
  } catch (e) {
    console.log(`[Sleeper vercel] league fetch failed ${id}:`, e.message);
    return res.status(200).json({
      league: mockLeagues(id, new Date().getFullYear())[0],
      rosters: [],
      users: [],
      _mock: true
    });
  }
});

// Sleeper: players
app.get(['/api/sleeper/players', '/sleeper/players'], async (req, res) => {
  try {
    const r = await fetch(`https://api.sleeper.app/v1/players/nfl`, { headers: { 'Accept-Encoding': 'gzip' }, signal: AbortSignal.timeout(6000) });
    if (!r.ok) return res.status(r.status).json({ error: 'Sleeper players fetch failed' });
    const data = await r.json();
    // return subset to keep payload small for Vercel (frontend can handle full but 10k players is heavy)
    // If ?full=true requested, return all
    const full = req.query.full === 'true' || req.query.full === '1';
    if (full) return res.json(data);
    const subset = Object.entries(data).slice(0, 800).reduce((acc, [k, v]) => { acc[k] = v; return acc; }, {});
    return res.json(subset);
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
});

// export for Vercel
export default app;

// Local dev support: if run directly (node api/index.js)
if (process.env.VERCEL !== '1') {
  const PORT = process.env.PORT || 3001;
  // Only listen if this file is the entrypoint and not imported by server/index.js
  // Check if being run via `node api/index.js` — in that case, start server
  const isMain = import.meta.url === `file://${process.argv[1]}`;
  if (isMain) {
    app.listen(PORT, '0.0.0.0', () => console.log(`[GM Vercel API] listening on ${PORT}`));
  }
}
