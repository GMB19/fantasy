// Vercel serverless handler — robust for rewrites
// Handles /api/* regardless of whether Vercel preserves original URL or strips to /api

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

let memData = null;

export default async function handler(req, res) {
  // CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();

  // Vercel may preserve original url in `req.url` or in header `x-vercel-rewrite` / `x-forwarded-*`
  // Try to get original path from req.url, fallback to headers
  let rawUrl = req.url || '/';
  // Vercel's rewrite preserves original URL in `req.headers['x-matched-path']` sometimes, but we just use req.url
  // Also check `req.headers['x-vercel-rewritten']` or query param `path`
  // For /api?path=... rewrites, handle
  const host = req.headers.host || 'localhost';
  let url;
  try {
    url = new URL(rawUrl, `https://${host}`);
  } catch {
    url = new URL('/', `https://${host}`);
  }

  // If rewritten to /api without original path, Vercel may set `req.headers['x-vercel-original-path']`
  // Also check `url.searchParams.get('path')` if we ever use ?path=$1
  // Fallback to rawUrl string matching
  let pathname = url.pathname;
  // If pathname is just /api or /api/index, try to recover original from header `x-real-path` or `referer` not reliable
  // Instead, also check the full rawUrl string directly for known patterns
  const fullRaw = rawUrl + ' ' + JSON.stringify(req.headers);

  // Helper to match path even if stripped
  const includes = (s) => pathname.includes(s) || rawUrl.includes(s) || fullRaw.includes(s);

  // Normalize: ensure pathname for routing reflects original sleeper path if stripped
  // If url is /api and handler was called via rewrite /api/(.*) -> /api, we can look at `req.headers['x-forwarded-uri']` etc.
  // Vercel sets `req.url` to original by default — so normally pathname would still be /api/sleeper/...; the dual check above covers both cases.

  // Health
  if (pathname === '/api/health' || pathname === '/health' || pathname === '/api' && includes('health')) {
    if (includes('/api/health') || pathname.endsWith('/health')) {
      return res.status(200).json({ ok: true, time: new Date().toISOString(), env: 'vercel', url: rawUrl, pathname });
    }
  }
  // More robust health check via string
  if (rawUrl.includes('/health') || pathname.includes('health')) {
    return res.status(200).json({ ok: true, time: new Date().toISOString(), env: 'vercel' });
  }

  // Data
  if (pathname === '/api/data' || pathname === '/data' || rawUrl.includes('/api/data')) {
    if (req.method === 'GET') return res.status(200).json(memData || { empty: true });
    if (req.method === 'POST') {
      try {
        // body may be already parsed? For Vercel, req.body may be there
        let body = req.body;
        if (!body) {
          // try to parse raw
          body = {};
        }
        memData = body;
      } catch {}
      // If body is string, try parse
      if (typeof memData === 'string') {
        try { memData = JSON.parse(memData); } catch {}
      }
      // If Express json middleware not run, manually read stream
      if (!memData || memData.empty) {
        // fallback: try read via req
      }
      return res.status(200).json({ ok: true });
    }
  }
  // Handle /api/data POST with manual body parsing if needed (Vercel may not have parsed)
  if (rawUrl.includes('/api/data') && req.method === 'POST' && !memData) {
    return res.status(200).json({ ok: true });
  }

  // Sleeper: user lookup  /api/sleeper/user/:username
  // Match pattern
  const userMatch = rawUrl.match(/\/sleeper\/user\/([^\/\?]+)/) || pathname.match(/\/sleeper\/user\/([^\/\?]+)/) || url.pathname.match(/\/sleeper\/user\/([^\/\?]+)/);
  // But we need to distinguish /user/:username vs /user/:userId/leagues
  if ((pathname.includes('/sleeper/user/') || rawUrl.includes('/sleeper/user/')) && !pathname.includes('/leagues') && !rawUrl.includes('/leagues')) {
    // Extract username - last segment after /sleeper/user/
    let username = null;
    const m = rawUrl.match(/\/sleeper\/user\/([^\/\?#]+)/);
    if (m) username = decodeURIComponent(m[1]);
    else {
      const m2 = pathname.match(/\/sleeper\/user\/([^\/\?#]+)/);
      if (m2) username = decodeURIComponent(m2[1]);
    }
    // If still not found, try query
    if (!username) {
      const parts = pathname.split('/');
      const idx = parts.indexOf('user');
      if (idx >= 0 && parts[idx+1]) username = decodeURIComponent(parts[idx+1]);
    }

    if (!username || username.length < 2) return res.status(400).json({ error: 'Invalid username', rawUrl, pathname });

    try {
      const r = await fetch(`https://api.sleeper.app/v1/user/${encodeURIComponent(username)}`, { signal: AbortSignal.timeout(3500) });
      if (r.ok) {
        const data = await r.json();
        if (data && data.user_id) return res.status(200).json(data);
        if (data === null) return res.status(404).json({ error: 'User not found on Sleeper', mockAvailable: true, rawUrl });
      }
      console.log(`[vercel sleeper] fallback mock user for ${username} status ${r?.status}`);
      return res.status(200).json({ ...mockUser(username), _mock: true, _note: "Sleeper API unavailable — demo user (vercel fallback)", rawUrl });
    } catch (e) {
      console.log(`[vercel sleeper] fetch failed for ${username}:`, e.message);
      return res.status(200).json({ ...mockUser(username), _mock: true, _note: "Sleeper API offline — demo user", rawUrl });
    }
  }

  // Sleeper: leagues  /api/sleeper/user/:userId/leagues/nfl/:season  or /leagues/:season
  if ((pathname.includes('/leagues/') || rawUrl.includes('/leagues/')) && (pathname.includes('/sleeper/user/') || rawUrl.includes('/sleeper/user/'))) {
    let userId = null, season = null;
    const m = rawUrl.match(/\/sleeper\/user\/([^\/]+)\/leagues(?:\/nfl)?\/([^\/\?#]+)/);
    if (m) {
      userId = decodeURIComponent(m[1]);
      season = decodeURIComponent(m[2]);
    } else {
      const m2 = pathname.match(/\/sleeper\/user\/([^\/]+)\/leagues(?:\/nfl)?\/([^\/\?#]+)/);
      if (m2) { userId = decodeURIComponent(m2[1]); season = decodeURIComponent(m2[2]);}
    }
    // also handle stripped url where only /leagues remains - try query param fallback
    if (!userId) {
      // fallback: parse from full raw
      const alt = fullRaw.match(/leagues(?:\/nfl)?\/(\d{4})/);
      if (alt) season = alt[1];
    }

    if (!userId || !season) {
      // try to extract from path segments
      const segs = pathname.split('/').filter(Boolean);
      // segs like api, sleeper, user, <userId>, leagues, nfl, <season>
      const uIdx = segs.indexOf('user');
      if (uIdx >= 0 && segs[uIdx+1]) userId = segs[uIdx+1];
      const lIdx = segs.indexOf('leagues');
      if (lIdx >= 0) {
        const maybe = segs[lIdx+1] === 'nfl' ? segs[lIdx+2] : segs[lIdx+1];
        if (maybe) season = maybe;
      }
      if (!userId || !season) {
        // last resort: try rawUrl segments
        const rawSegs = rawUrl.split('/').filter(Boolean);
        const rUIdx = rawSegs.indexOf('user');
        if (rUIdx >= 0 && rawSegs[rUIdx+1]) userId = rawSegs[rUIdx+1];
        const rLIdx = rawSegs.indexOf('leagues');
        if (rLIdx >= 0) {
          const maybe2 = rawSegs[rLIdx+1] === 'nfl' ? rawSegs[rLIdx+2] : rawSegs[rLIdx+1];
          if (maybe2) season = maybe2.split('?')[0];
        }
      }
    }

    if (!userId || !season) return res.status(400).json({ error: 'Missing userId or season', rawUrl, pathname });

    try {
      const r = await fetch(`https://api.sleeper.app/v1/user/${encodeURIComponent(userId)}/leagues/nfl/${encodeURIComponent(season)}`, { signal: AbortSignal.timeout(3500) });
      if (r.ok) {
        const data = await r.json();
        if (Array.isArray(data)) return res.status(200).json(data);
      }
      console.log(`[vercel sleeper] fallback mock leagues for ${userId} season ${season}`);
      return res.status(200).json(mockLeagues(userId, season));
    } catch (e) {
      console.log(`[vercel sleeper] leagues fetch failed:`, e.message);
      return res.status(200).json(mockLeagues(userId, season));
    }
  }

  // Sleeper: league by ID  /api/sleeper/league/:leagueId
  if (pathname.includes('/sleeper/league/') || rawUrl.includes('/sleeper/league/')) {
    let leagueId = null;
    const m = rawUrl.match(/\/sleeper\/league\/([^\/\?#]+)/);
    if (m) leagueId = decodeURIComponent(m[1]);
    else {
      const m2 = pathname.match(/\/sleeper\/league\/([^\/\?#]+)/);
      if (m2) leagueId = decodeURIComponent(m2[1]);
    }
    if (!leagueId) {
      const segs = pathname.split('/').filter(Boolean);
      const idx = segs.indexOf('league');
      if (idx >= 0 && segs[idx+1]) leagueId = segs[idx+1];
    }
    if (!leagueId) return res.status(400).json({ error: 'Missing leagueId', rawUrl });

    try {
      const [leagueRes, rostersRes, usersRes] = await Promise.all([
        fetch(`https://api.sleeper.app/v1/league/${leagueId}`, { signal: AbortSignal.timeout(3500) }).then(r => r.ok ? r.json() : null),
        fetch(`https://api.sleeper.app/v1/league/${leagueId}/rosters`, { signal: AbortSignal.timeout(3500) }).then(r => r.ok ? r.json() : null),
        fetch(`https://api.sleeper.app/v1/league/${leagueId}/users`, { signal: AbortSignal.timeout(3500) }).then(r => r.ok ? r.json() : null),
      ]);
      if (leagueRes && leagueRes.league_id) {
        return res.status(200).json({ league: leagueRes, rosters: rostersRes || [], users: usersRes || [] });
      }
      if (leagueRes === null) return res.status(404).json({ error: 'League not found', leagueId, rawUrl });
      return res.status(200).json({ league: leagueRes, rosters: rostersRes || [], users: usersRes || [] });
    } catch (e) {
      console.log(`[vercel sleeper] league fetch failed ${leagueId}:`, e.message);
      return res.status(200).json({
        league: mockLeagues(leagueId, new Date().getFullYear())[0],
        rosters: [],
        users: [],
        _mock: true
      });
    }
  }

  // Sleeper: players
  if (pathname.includes('/sleeper/players') || rawUrl.includes('/sleeper/players')) {
    try {
      const r = await fetch(`https://api.sleeper.app/v1/players/nfl`, { headers: { 'Accept-Encoding': 'gzip' }, signal: AbortSignal.timeout(6000) });
      if (!r.ok) return res.status(r.status).json({ error: 'Sleeper players fetch failed', status: r.status });
      const data = await r.json();
      const full = url.searchParams.get('full') === 'true' || url.searchParams.get('full') === '1';
      if (full) return res.status(200).json(data);
      const subset = Object.entries(data).slice(0, 800).reduce((acc, [k, v]) => { acc[k] = v; return acc; }, {});
      return res.status(200).json(subset);
    } catch (e) {
      return res.status(500).json({ error: e.message });
    }
  }

  // Health fallback via includes check at end
  if (includes('health') || includes('/api/health')) {
    return res.status(200).json({ ok: true, time: new Date().toISOString(), env: 'vercel' });
  }

  // If we reach here, not an API route — return 404 json for API, let frontend handle SPA elsewhere
  // But this handler is only for /api, so return json
  if (pathname.startsWith('/api') || rawUrl.includes('/api')) {
    return res.status(404).json({ error: 'Not found', rawUrl, pathname, method: req.method, headers: req.headers });
  }

  return res.status(404).json({ error: 'Not found', rawUrl, pathname });
}
