import express from 'express';
import cors from 'cors';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DATA_PATH = path.join(__dirname, 'data.json');
// Azure Web Apps sets PORT env var (e.g. 8080); fallback for local dev
const PORT = process.env.PORT || 3001;

const app = express();
app.use(cors());
app.use(express.json());

// Serve static frontend in production
const distPath = path.join(__dirname, '../dist');
if (fs.existsSync(distPath)) {
  app.use(express.static(distPath));
}

// Helper: load/save
function loadData() {
  try {
    if (!fs.existsSync(DATA_PATH)) return null;
    return JSON.parse(fs.readFileSync(DATA_PATH, 'utf-8'));
  } catch (e) { return null; }
}
function saveData(data) {
  fs.writeFileSync(DATA_PATH, JSON.stringify(data, null, 2));
}

// --- Mock Sleeper data for offline/demo (e2b network blocks external) ---
function mockUser(username) {
  return {
    user_id: String(100000 + Math.floor(Math.random()*900000)),
    username: username,
    display_name: username,
    avatar: "b5e737c7a0e7b8f322faddc7a66fdb18",
    is_bot: false
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

// Sleeper proxy with offline fallback
app.get('/api/sleeper/user/:username', async (req, res) => {
  const { username } = req.params;
  if(!username || username.length < 2) return res.status(400).json({ error: 'Invalid username' });
  try {
    const r = await fetch(`https://api.sleeper.app/v1/user/${encodeURIComponent(username)}`, { signal: AbortSignal.timeout(3500) });
    if(r.ok){
      const data = await r.json();
      if(data && data.user_id) return res.json(data);
      // Sleeper returns null for not found -> return 404 so client can show error
      if(data === null) return res.status(404).json({ error: 'User not found on Sleeper', mockAvailable: true });
    }
    // non-ok -> fallback to mock but tell client it's demo
    console.log(`[Sleeper] fallback mock user for ${username} (status ${r.status})`);
    return res.json({ ...mockUser(username), _mock: true, _note: "Sleeper API unavailable — demo user returned (e2b offline)" });
  } catch (e) {
    console.log(`[Sleeper] fetch failed for ${username}:`, e.message, "=> mock fallback");
    return res.json({ ...mockUser(username), _mock: true, _note: "Sleeper API offline — demo user (network blocked)" });
  }
});

async function handleLeagues(req, res){
  const { userId, season } = req.params;
  try {
    const r = await fetch(`https://api.sleeper.app/v1/user/${encodeURIComponent(userId)}/leagues/nfl/${encodeURIComponent(season)}`, { signal: AbortSignal.timeout(3500) });
    if(r.ok){
      const data = await r.json();
      if(Array.isArray(data)) return res.json(data);
    }
    console.log(`[Sleeper] fallback mock leagues for ${userId} season ${season}`);
    return res.json(mockLeagues(userId, season));
  } catch (e) {
    console.log(`[Sleeper] leagues fetch failed:`, e.message, "=> mock");
    return res.json(mockLeagues(userId, season));
  }
}
app.get('/api/sleeper/user/:userId/leagues/nfl/:season', handleLeagues);
app.get('/api/sleeper/user/:userId/leagues/:season', handleLeagues);

app.get('/api/sleeper/league/:leagueId', async (req, res) => {
  try {
    const [league, rosters, users] = await Promise.all([
      fetch(`https://api.sleeper.app/v1/league/${req.params.leagueId}`, { signal: AbortSignal.timeout(3500) }).then(r => r.json()),
      fetch(`https://api.sleeper.app/v1/league/${req.params.leagueId}/rosters`, { signal: AbortSignal.timeout(3500) }).then(r => r.json()),
      fetch(`https://api.sleeper.app/v1/league/${req.params.leagueId}/users`, { signal: AbortSignal.timeout(3500) }).then(r => r.json()),
    ]);
    res.json({ league, rosters, users });
  } catch (e) {
    res.status(200).json({ 
      league: mockLeagues(req.params.leagueId, new Date().getFullYear())[0],
      rosters: [],
      users: [],
      _mock: true
    });
  }
});

app.get('/api/sleeper/players', async (req, res) => {
  try {
    const r = await fetch(`https://api.sleeper.app/v1/players/nfl`, { headers: { 'Accept-Encoding': 'gzip' }, signal: AbortSignal.timeout(5000) });
    const data = await r.json();
    const subset = Object.entries(data).slice(0, 800).reduce((acc, [k,v]) => { acc[k]=v; return acc; }, {});
    res.json(subset);
  } catch (e) {
    res.status(500).json({ error: e.message, _mock: false });
  }
});

// Persistence endpoints
app.get('/api/data', (req, res) => {
  const data = loadData();
  res.json(data || { empty: true });
});

app.post('/api/data', (req, res) => {
  saveData(req.body);
  res.json({ ok: true });
});

app.get('/api/health', (req, res) => res.json({ ok: true, time: new Date().toISOString() }));

// Fallback to index.html for SPA
app.get('*', (req, res) => {
  const indexPath = path.join(distPath, 'index.html');
  if (fs.existsSync(indexPath)) return res.sendFile(indexPath);
  res.json({ ok: true, msg: 'GM API running. Build frontend with npm run build or run vite dev server.' });
});

app.listen(PORT, '0.0.0.0', () => console.log(`[GM] Server running on http://0.0.0.0:${PORT}`));
