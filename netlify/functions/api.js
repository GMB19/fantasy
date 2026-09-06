// Netlify Function — Sleeper proxy + mock fallback (mirrors api/index.js for Vercel)
// Path: /.netlify/functions/api  (rewritten from /api/* via netlify.toml)
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

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Content-Type': 'application/json'
};

export const handler = async (event, context) => {
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers: corsHeaders, body: '' };
  }

  // Netlify gives event.path as the function path (/.netlify/functions/api/...) but with redirect
  // event.rawUrl has full original URL, event.path has rewritten path. Try both.
  const rawUrl = event.rawUrl || event.path || '';
  // event.path may be "/api/sleeper/user/GMB4" (preserved) or "/.netlify/functions/api/sleeper/user/GMB4"
  // Normalize to a path that always starts with /api
  let pathname = event.path || '/';
  try {
    const u = new URL(rawUrl, `https://${event.headers?.host || 'localhost'}`);
    // Prefer rawUrl's pathname if it contains /api
    if (u.pathname.includes('/api')) pathname = u.pathname;
    else if (event.path.includes('/api')) pathname = event.path;
    else if (u.pathname.includes('/sleeper')) pathname = '/api' + u.pathname;
  } catch {}
  // If pathname is function-internal, map it: /.netlify/functions/api/sleeper/... -> /api/sleeper/...
  if (pathname.startsWith('/.netlify/functions/api')) {
    pathname = pathname.replace('/.netlify/functions/api', '/api') || '/api';
    if (pathname === '/api') {
      // try to recover splat from rawUrl
      const m = rawUrl.match(/\/api\/[^?#]*/);
      if (m) pathname = m[0];
    }
  }
  const fullRaw = rawUrl + ' ' + pathname + ' ' + JSON.stringify(event.headers || {});

  const json = (code, obj) => ({
    statusCode: code,
    headers: corsHeaders,
    body: JSON.stringify(obj)
  });

  // Health
  if (pathname.includes('/health') || rawUrl.includes('/health')) {
    return json(200, { ok: true, time: new Date().toISOString(), env: 'netlify', path: pathname, rawUrl });
  }

  // Data
  if (pathname === '/api/data' || pathname === '/data' || rawUrl.includes('/api/data')) {
    if (event.httpMethod === 'GET') return json(200, memData || { empty: true });
    if (event.httpMethod === 'POST') {
      try {
        let body = event.body;
        if (body) {
          if (event.isBase64Encoded) body = Buffer.from(body, 'base64').toString();
          try { memData = JSON.parse(body); } catch { memData = body; }
        }
      } catch {}
      return json(200, { ok: true });
    }
  }

  // Sleeper: user lookup  /api/sleeper/user/:username  (without /leagues)
  if ((pathname.includes('/sleeper/user/') || rawUrl.includes('/sleeper/user/')) && !pathname.includes('/leagues') && !rawUrl.includes('/leagues')) {
    let username = null;
    const m = rawUrl.match(/\/sleeper\/user\/([^\/\?#&]+)/) || pathname.match(/\/sleeper\/user\/([^\/\?#&]+)/);
    if (m) username = decodeURIComponent(m[1]);
    else {
      const parts = pathname.split('/').filter(Boolean);
      const idx = parts.indexOf('user');
      if (idx >= 0 && parts[idx+1]) username = decodeURIComponent(parts[idx+1]);
    }
    if (!username || username.length < 2) return json(400, { error: 'Invalid username', rawUrl, pathname });
    try {
      const r = await fetch(`https://api.sleeper.app/v1/user/${encodeURIComponent(username)}`, { signal: AbortSignal.timeout(3500) });
      if (r.ok) {
        const data = await r.json();
        if (data && data.user_id) return json(200, data);
        if (data === null) return json(404, { error: 'User not found on Sleeper', mockAvailable: true, rawUrl });
      }
      return json(200, { ...mockUser(username), _mock: true, _note: "Sleeper API unavailable — demo user (netlify fallback)", rawUrl });
    } catch (e) {
      return json(200, { ...mockUser(username), _mock: true, _note: "Sleeper API offline — demo user", rawUrl, error: e.message });
    }
  }

  // Sleeper: leagues  /api/sleeper/user/:userId/leagues/nfl/:season
  if ((pathname.includes('/leagues/') || rawUrl.includes('/leagues/')) && (pathname.includes('/sleeper/user/') || rawUrl.includes('/sleeper/user/'))) {
    let userId = null, season = null;
    const m = rawUrl.match(/\/sleeper\/user\/([^\/]+)\/leagues(?:\/nfl)?\/([^\/\?#&]+)/) || pathname.match(/\/sleeper\/user\/([^\/]+)\/leagues(?:\/nfl)?\/([^\/\?#&]+)/);
    if (m) {
      userId = decodeURIComponent(m[1]);
      season = decodeURIComponent(m[2]);
    } else {
      const segs = pathname.split('/').filter(Boolean);
      const uIdx = segs.indexOf('user');
      if (uIdx >= 0 && segs[uIdx+1]) userId = segs[uIdx+1];
      const lIdx = segs.indexOf('leagues');
      if (lIdx >= 0) {
        const maybe = segs[lIdx+1] === 'nfl' ? segs[lIdx+2] : segs[lIdx+1];
        if (maybe) season = maybe;
      }
    }
    if (!userId || !season) return json(400, { error: 'Missing userId or season', rawUrl, pathname });
    try {
      const r = await fetch(`https://api.sleeper.app/v1/user/${encodeURIComponent(userId)}/leagues/nfl/${encodeURIComponent(season)}`, { signal: AbortSignal.timeout(3500) });
      if (r.ok) {
        const data = await r.json();
        if (Array.isArray(data)) return json(200, data);
      }
      return json(200, mockLeagues(userId, season));
    } catch (e) {
      return json(200, mockLeagues(userId, season));
    }
  }

  // Sleeper: league by ID  /api/sleeper/league/:leagueId
  if (pathname.includes('/sleeper/league/') || rawUrl.includes('/sleeper/league/')) {
    let leagueId = null;
    const m = rawUrl.match(/\/sleeper\/league\/([^\/\?#&]+)/) || pathname.match(/\/sleeper\/league\/([^\/\?#&]+)/);
    if (m) leagueId = decodeURIComponent(m[1]);
    else {
      const segs = pathname.split('/').filter(Boolean);
      const idx = segs.indexOf('league');
      if (idx >= 0 && segs[idx+1]) leagueId = segs[idx+1];
    }
    if (!leagueId) return json(400, { error: 'Missing leagueId', rawUrl });
    try {
      const [leagueRes, rostersRes, usersRes] = await Promise.all([
        fetch(`https://api.sleeper.app/v1/league/${leagueId}`, { signal: AbortSignal.timeout(3500) }).then(r => r.ok ? r.json() : null),
        fetch(`https://api.sleeper.app/v1/league/${leagueId}/rosters`, { signal: AbortSignal.timeout(3500) }).then(r => r.ok ? r.json() : null),
        fetch(`https://api.sleeper.app/v1/league/${leagueId}/users`, { signal: AbortSignal.timeout(3500) }).then(r => r.ok ? r.json() : null),
      ]);
      if (leagueRes && leagueRes.league_id) {
        return json(200, { league: leagueRes, rosters: rostersRes || [], users: usersRes || [] });
      }
      if (leagueRes === null) return json(404, { error: 'League not found', leagueId, rawUrl });
      return json(200, { league: leagueRes, rosters: rostersRes || [], users: usersRes || [] });
    } catch (e) {
      return json(200, {
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
      if (!r.ok) return json(r.status, { error: 'Sleeper players fetch failed', status: r.status });
      const data = await r.json();
      const urlObj = new URL(rawUrl, 'https://localhost');
      const full = urlObj.searchParams.get('full') === 'true' || urlObj.searchParams.get('full') === '1';
      if (full) return json(200, data);
      const subset = Object.entries(data).slice(0, 800).reduce((acc, [k, v]) => { acc[k] = v; return acc; }, {});
      return json(200, subset);
    } catch (e) {
      return json(500, { error: e.message });
    }
  }

  // Fallback — if under /api, return debug 404
  if (pathname.startsWith('/api') || rawUrl.includes('/api')) {
    return json(404, { error: 'Not found', rawUrl, pathname, method: event.httpMethod });
  }
  return json(404, { error: 'Not found', rawUrl, pathname });
};
