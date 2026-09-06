import express from 'express';
import cors from 'cors';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DATA_PATH = path.join(__dirname, 'data.json');
const PORT = 3001;

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

// Sleeper proxy
app.get('/api/sleeper/user/:username', async (req, res) => {
  try {
    const r = await fetch(`https://api.sleeper.app/v1/user/${req.params.username}`);
    const data = await r.json();
    if (!data) return res.status(404).json({ error: 'User not found' });
    res.json(data);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.get('/api/sleeper/user/:userId/leagues/:season', async (req, res) => {
  try {
    const r = await fetch(`https://api.sleeper.app/v1/user/${req.params.userId}/leagues/nfl/${req.params.season}`);
    const data = await r.json();
    res.json(data);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.get('/api/sleeper/league/:leagueId', async (req, res) => {
  try {
    const [league, rosters, users] = await Promise.all([
      fetch(`https://api.sleeper.app/v1/league/${req.params.leagueId}`).then(r => r.json()),
      fetch(`https://api.sleeper.app/v1/league/${req.params.leagueId}/rosters`).then(r => r.json()),
      fetch(`https://api.sleeper.app/v1/league/${req.params.leagueId}/users`).then(r => r.json()),
    ]);
    res.json({ league, rosters, users });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.get('/api/sleeper/players', async (req, res) => {
  try {
    const r = await fetch(`https://api.sleeper.app/v1/players/nfl`, { headers: { 'Accept-Encoding': 'gzip' } });
    const data = await r.json();
    // return top 300 for brevity
    const subset = Object.entries(data).slice(0, 800).reduce((acc, [k,v]) => { acc[k]=v; return acc; }, {});
    res.json(subset);
  } catch (e) {
    res.status(500).json({ error: e.message });
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
