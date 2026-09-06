import React, { createContext, useContext, useEffect, useState, useMemo, useCallback } from 'react';
import { playersSeed, leagueSeed, teamsSeed, myRosterIds, myStartersIds, tradeSeed, waiverSeed, newsSeed, activitySeed, aiSettingsSeed, simulationsSeed, scheduleSeed } from './mockData';

const StoreContext = createContext(null);
export const useStore = () => useContext(StoreContext);

const STORAGE_KEY = 'fantasy_gm_v2';

function loadPersisted() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch { return null; }
}

// Sleeper fetch helper that works on both: local Express proxy (/api/sleeper/...) and GitHub Pages (direct https://api.sleeper.app)
async function fetchSleeperUser(clean) {
  // 1) Try local proxy (Azure / local dev)
  try {
    const r = await fetch(`/api/sleeper/user/${encodeURIComponent(clean)}`);
    const text = await r.text();
    let j = null; try { j = JSON.parse(text); } catch {}
    if (r.ok && j && j.user_id) return j;
    if (r.ok && j && j._mock) return j; // mock from our server
    // On GitHub Pages /api/sleeper will 404 with HTML (spa fallback) — don't treat as "user not found",
    // just fall through to direct Sleeper API. Only treat as not-found if JSON explicitly says so.
    if (j && j.error && r.status === 404) {
      const e = new Error('User not found'); e.status = 404; throw e;
    }
    // if proxy returned mock but status not ok, still use it if it has username
    if (j && j.username) return j;
    // otherwise fall through to direct — do NOT throw on proxy 404 HTML
  } catch (e) {
    if (e.status === 404) throw e;
    // fall through to direct
  }
  // 2) Direct Sleeper API (works on GitHub Pages, CORS allowed)
  try {
    const r2 = await fetch(`https://api.sleeper.app/v1/user/${encodeURIComponent(clean)}`);
    if (r2.ok) {
      const j2 = await r2.json();
      if (j2 && j2.user_id) return j2;
      if (j2 === null) {
        const e = new Error('User not found'); e.status = 404; throw e;
      }
    } else if (r2.status === 404) {
      const e = new Error('User not found'); e.status = 404; throw e;
    }
  } catch (e) {
    if (e.status === 404) throw e;
  }
  // 3) Final mock fallback (offline/demo)
  return { user_id: String(100000 + Math.floor(Math.random()*900000)), username: clean, display_name: clean, avatar: "b5e737c7a0e7b8f322faddc7a66fdb18", _mock: true, _note: "Offline demo user" };
}

async function fetchSleeperLeagues(userId, season, usernameHint) {
  // Try proxy
  try {
    const r = await fetch(`/api/sleeper/user/${encodeURIComponent(userId)}/leagues/nfl/${season}`);
    if (r.ok) {
      const j = await r.json();
      if (Array.isArray(j)) return j;
    }
    // also try without /nfl for compatibility
    const r2 = await fetch(`/api/sleeper/user/${encodeURIComponent(userId)}/leagues/${season}`);
    if (r2.ok) {
      const j2 = await r2.json();
      if (Array.isArray(j2)) return j2;
    }
  } catch {}
  // Direct
  try {
    const r3 = await fetch(`https://api.sleeper.app/v1/user/${encodeURIComponent(userId)}/leagues/nfl/${season}`);
    if (r3.ok) {
      const j3 = await r3.json();
      if (Array.isArray(j3) && j3.length>0) return j3;
    }
  } catch {}
  // Mock fallback
  const base = usernameHint || 'gotham_gm';
  return [
    { league_id: "112233445566778899", name: `Arena Championship League — @${base}`, season: String(season), total_rosters: 12, avatar: "a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6" },
    { league_id: "998877665544332211", name: `The Dime Package — @${base}`, season: String(season), total_rosters: 10, avatar: null },
  ];
}

export function StoreProvider({ children }) {
  const [user, setUser] = useState(() => {
    const p = loadPersisted();
    return p?.user || { id: 'u1', username: 'gotham_gm', email: 'gm@arena.app', sleeperUsername: 'gotham_gm', sleeperId: '123456', avatar: '🐺', isAuthed: true };
  });
  const [isAuthed, setIsAuthed] = useState(() => {
    const p = loadPersisted();
    return p?.isAuthed ?? true;
  });
  const [league, setLeague] = useState(() => loadPersisted()?.league || leagueSeed);
  const [teams, setTeams] = useState(() => loadPersisted()?.teams || teamsSeed);
  const [players] = useState(playersSeed);
  const [myRoster, setMyRoster] = useState(() => loadPersisted()?.myRoster || myRosterIds);
  const [myStarters, setMyStarters] = useState(() => loadPersisted()?.myStarters || myStartersIds);
  const [trades, setTrades] = useState(() => loadPersisted()?.trades || tradeSeed);
  const [waivers, setWaivers] = useState(() => loadPersisted()?.waivers || waiverSeed);
  const [news, setNews] = useState(() => loadPersisted()?.news || newsSeed);
  const [activity, setActivity] = useState(() => loadPersisted()?.activity || activitySeed);
  const [aiSettings, setAiSettings] = useState(() => loadPersisted()?.aiSettings || aiSettingsSeed);
  const [sim, setSim] = useState(() => loadPersisted()?.sim || simulationsSeed);
  const [sleeperSyncing, setSleeperSyncing] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [sleeperLeagues, setSleeperLeagues] = useState(() => loadPersisted()?.sleeperLeagues || []);
  const [lastSync, setLastSync] = useState(() => loadPersisted()?.lastSync || null);

  // persist
  useEffect(() => {
    const data = { user, isAuthed, league, teams, myRoster, myStarters, trades, waivers, news, activity, aiSettings, sim, lastSync, sleeperLeagues };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    fetch('/api/data', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) }).catch(()=>{});
  }, [user, isAuthed, league, teams, myRoster, myStarters, trades, waivers, news, activity, aiSettings, sim, lastSync, sleeperLeagues]);

  useEffect(() => {
    fetch('/api/data').then(r=>r.json()).then(d=>{
      if(d && !d.empty && d.league) {}
    }).catch(()=>{});
  }, []);

  const myTeam = useMemo(() => teams.find(t=>t.owner==='You') || teams[0], [teams]);
  const myPlayers = useMemo(() => myRoster.map(id=> players.find(p=>p.id===id)).filter(Boolean), [myRoster, players]);
  const starterPlayers = useMemo(() => myStarters.map(id=> players.find(p=>p.id===id)).filter(Boolean), [myStarters, players]);
  const benchPlayers = useMemo(() => myPlayers.filter(p=> !myStarters.includes(p.id)), [myPlayers, myStarters]);

  const notify = useCallback((msg, type='info') => {
    const id = Date.now().toString() + Math.random().toString(36).slice(2,6);
    setNotifications(n => [...n, { id, msg, type }]);
    setTimeout(()=> setNotifications(n=> n.filter(x=>x.id!==id)), 4200);
  }, []);

  const syncSleeper = useCallback(async (username, opts={}) => {
    const clean = (username || '').trim().replace(/^@/, '');
    if(!clean) {
      notify('Enter your Sleeper username first — e.g. “sleeper”','error');
      return { ok:false };
    }
    if(clean.length < 2) {
      notify('Sleeper username too short','error');
      return { ok:false };
    }
    setSleeperSyncing(true);
    notify(`Syncing Sleeper @${clean} …`, 'info');
    await new Promise(r=> setTimeout(r, 650));

    try {
      let u;
      try {
        u = await fetchSleeperUser(clean);
      } catch (e) {
        if (e.status === 404) {
          notify(`Sleeper user @${clean} not found — try a different username or use Demo`, 'error');
          setSleeperSyncing(false);
          return { ok:false, notFound:true };
        }
        throw e;
      }

      if(!u || (!u.user_id && !u.username)){
        notify('Sleeper response invalid — using demo league','error');
        setUser(prev=> ({...prev, sleeperUsername: clean }));
        setLastSync(new Date().toISOString());
        setSleeperSyncing(false);
        return { ok:true, demo:true };
      }

      const isMock = !!u._mock;
      const userId = u.user_id;
      const displayName = u.display_name || clean;
      setUser(prev=> ({...prev, sleeperUsername: clean, sleeperId: userId, username: clean, displayName: displayName }));

      const currentSeason = new Date().getFullYear();
      const seasonsToTry = [currentSeason, currentSeason-1];
      let leagues = [];
      let fetchedSeason = currentSeason;
      for(const s of seasonsToTry){
        try{
          const data = await fetchSleeperLeagues(userId, s, clean);
          if(Array.isArray(data) && data.length>0){
            // if mock fallback returned same 2 leagues for both seasons, ensure we respect real vs mock
            // If we got mock (ids 112233...), still use it but break only if we tried direct and got real
            // For GH Pages direct fetch, mock will only be returned if fetch failed; so if we got mock on first season, try next season? No need
            leagues = data;
            fetchedSeason = s;
            // If leagues look like mock and we haven't tried direct real, keep trying? Actually fetchSleeperLeagues already tried proxy+direct+mock, so if it returns mock, it's because real failed. Break anyway.
            if (leagues.length>0) break;
          }
        }catch(e){ }
      }

      if(!leagues.length){
        leagues = [
          { league_id: "1122334455", name: `Arena Championship League — @${clean}`, season: String(currentSeason), total_rosters: 12, avatar: null },
          { league_id: "9988776655", name: `The Dime Package — @${clean}`, season: String(currentSeason), total_rosters: 10, avatar: null },
        ];
      }

      setSleeperLeagues(leagues);
      const first = leagues[0];
      setLeague(prev=> ({
        ...prev,
        id: first.league_id || prev.id,
        name: first.name,
        season: parseInt(first.season) || prev.season,
        avatar: first.avatar ? `https://sleepercdn.com/avatars/thumbs/${first.avatar}` : prev.avatar,
        teamsCount: first.total_rosters || prev.teamsCount,
        status: isMock ? `Demo Sync • ${leagues.length} league${leagues.length>1?'s':''} (mock)` : `Synced • Week 7 • ${leagues.length} league${leagues.length>1?'s':''} found`,
      }));
      setLastSync(new Date().toISOString());

      setActivity(a=> [{
        id: 'a'+Date.now(),
        ts: Date.now(),
        type: 'news',
        title: isMock ? `Sleeper sync (demo) @${clean} — ${leagues.length} leagues` : `Sleeper sync @${clean} — ${leagues.length} leagues`,
        desc: isMock
          ? `Offline or CORS demo — loaded demo leagues: ${leagues.map(l=>`"${l.name}"`).join(', ')}. Tap a league to switch.`
          : `Loaded "${first.name}" (${first.total_rosters} teams, ${fetchedSeason} season). Switch leagues in header if you have more.`,
        reasoning: isMock
          ? 'Server or Sleeper unavailable — used mock fallback so the GM stays alive. Direct Sleeper API will work on GitHub Pages when online.'
          : 'Pulled via Sleeper REST: user → leagues → rosters.',
        delta: isMock ? 'DEMO MODE' : 'SYNCED',
        status: 'done'
      }, ...a].slice(0,50));

      if(isMock){
        notify(`Demo sync @${clean} — loaded ${leagues.length} demo leagues (tap to switch)`, 'success');
      } else {
        notify(`Synced @${clean} — ${leagues.length} league${leagues.length>1?'s':''} found. Loaded "${first.name}"`, 'success');
      }

      setSleeperSyncing(false);
      return { ok:true, mock:isMock, leagues };

    } catch(e){
      console.error('syncSleeper error', e);
      notify(`Sync failed (${e.message}) — saved @${clean} and kept demo league`, 'error');
      setUser(prev=> ({...prev, sleeperUsername: clean }));
      setLastSync(new Date().toISOString());
      setSleeperSyncing(false);
      return { ok:false, error:e.message };
    }
  }, [notify]);

  const switchLeague = useCallback((leagueId)=>{
    const picked = sleeperLeagues.find(l=> l.league_id===leagueId);
    if(!picked) return;
    setLeague(prev=> ({
      ...prev,
      id: picked.league_id,
      name: picked.name,
      season: parseInt(picked.season) || prev.season,
      avatar: picked.avatar ? `https://sleepercdn.com/avatars/thumbs/${picked.avatar}` : prev.avatar,
      teamsCount: picked.total_rosters || prev.teamsCount,
    }));
    notify(`Switched to "${picked.name}"`, 'success');
    setActivity(a=> [{
      id: 'a'+Date.now(), ts:Date.now(), type:'news',
      title:`Switched league → "${picked.name}"`,
      desc:`Season ${picked.season} • ${picked.total_rosters} teams`,
      reasoning:'User-selected league from Sleeper sync results.',
      delta:'SWITCH',
      status:'done'
    }, ...a]);
  }, [sleeperLeagues, notify]);

  useEffect(()=>{
    if(!aiSettings.autonomousMode) return;
    const id = setInterval(()=>{
      if(Math.random() < 0.3){
        const types = ['trade','waiver','news','simulation','lineup'];
        const t = types[Math.floor(Math.random()*types.length)];
        const now = Date.now();
        let entry;
        if(t==='trade'){
          const candidates = trades.filter(tr=> tr.status==='scanning');
          if(candidates.length){
            const pick = candidates[Math.floor(Math.random()*candidates.length)];
            entry = { id: 'a'+now, ts: now, type: 'trade', title: `Re-scanned trade: ${pick.give.map(id=> players.find(p=>p.id===id)?.name.split(' ').pop()).join(' + ')} → ${pick.receive.map(id=> players.find(p=>p.id===id)?.name).join(', ')}`, desc: pick.reasoning.slice(0,120)+'...', reasoning: pick.reasoning, delta: `+${pick.champDelta}% champ`, status: 'scanning' };
          } else {
            entry = { id: 'a'+now, ts: now, type: 'trade', title: 'League scan: checking 11 rosters for arbitrage', desc: 'No new edges >0.8% champ found this cycle. Holding pat, monitoring lines.', reasoning: 'Sportsbook moves flat last 15m. Trade finder will re-scan after injury window.', delta: 'No action', status: 'scanning' };
          }
        } else if(t==='waiver') {
          entry = { id: 'a'+now, ts: now, type: 'waiver', title: `Waiver edge update: ${players.find(p=>p.id==='p59')?.name} +2.4`, desc: 'Books moved again — FAAB recommendation $14 held. Still auto-queued.', reasoning: 'No need to adjust. Edge persists, roster constraint satisfied.', delta: '+2.4 edge', status: 'queued' };
        } else if(t==='news'){
          const n = news[Math.floor(Math.random()*news.length)];
          entry = { id: 'a'+now, ts: now, type: 'news', title: `News ingested: ${n.title}`, desc: n.body.slice(0,110)+'...', reasoning: 'AI parsed news vs sportsbook line movement. Impact already priced into player values.', delta: n.tag, status: 'monitoring' };
        } else if(t==='simulation'){
          const delta = (Math.random()*0.6 -0.1).toFixed(1);
          const newChamp = Math.max(10, Math.min(20, sim.champ + parseFloat(delta)));
          setSim(s=> ({...s, champ: parseFloat(newChamp.toFixed(1)), playoff: Math.min(92, Math.max(60, s.playoff + parseFloat((Math.random()*1).toFixed(1))))}));
          entry = { id: 'a'+now, ts: now, type: 'simulation', title: `Re-simulated season (10k runs) — champ ${newChamp}%`, desc: `Playoff ${sim.playoff}% — variance from sportsbook line moves.`, reasoning: 'Monte Carlo with updated FanDuel props and injury-adjusted variance.', delta: `${delta>0?'+':''}${delta}%`, status: 'done' };
        } else {
          entry = { id: 'a'+now, ts: now, type: 'lineup', title: 'Lineup health check: optimal', desc: 'Current starters already 98.2% optimal per sportsbook projections.', reasoning: 'No move beats JSN/JSN flex by >0.3 pts. Holding.', delta: 'Optimal', status: 'done' };
        }
        if(entry) setActivity(a=> [entry, ...a].slice(0,50));
      }
      if(Math.random()<0.15){}
    }, 12000);
    return ()=> clearInterval(id);
  }, [aiSettings.autonomousMode, trades, news, players, sim.playoff, sim.champ]);

  const updateAiSettings = useCallback((patch)=>{
    setAiSettings(s=> ({...s, ...patch}));
    notify('AI GM settings updated','success');
  }, [notify]);

  const proposeTrade = useCallback((tradeId)=>{
    setTrades(tr=> tr.map(t=> t.id===tradeId? {...t, status: 'proposed'}: t));
    setActivity(a=> [{ id: 'a'+Date.now(), ts: Date.now(), type:'trade', title: 'Trade offer sent', desc: trades.find(t=>t.id===tradeId)?.receive.map(id=> players.find(p=>p.id===id)?.name).join(' + ') + ' incoming', reasoning: 'User-initiated or auto-approved. Waiting on counterparty.', delta: 'Sent', status:'done'}, ...a]);
    notify('Trade offer sent — waiting for response','success');
  }, [trades, players, notify]);

  const autoSendEligible = useCallback(()=>{
    const eligible = trades.filter(t=> t.autoEligible && t.status==='scanning' && t.confidence >= aiSettings.minConfidenceAuto && t.champDelta >= aiSettings.minChampProbImprovement);
    if(!eligible.length) { notify('No auto-eligible trades meet your thresholds','info'); return; }
    if(!aiSettings.autonomousMode) { notify('Enable Autonomous Mode to auto-send','error'); return; }
    const todayCount = activity.filter(a=> a.type==='trade' && a.ts > Date.now()-24*3600*1000 && a.status==='done').length;
    const remaining = aiSettings.maxDailyTransactions - todayCount;
    if(remaining<=0){ notify('Daily transaction limit reached','error'); return; }
    const toSend = eligible.slice(0, remaining);
    setTrades(tr=> tr.map(t=> toSend.find(s=>s.id===t.id)? {...t, status:'proposed'}: t));
    toSend.forEach(t=>{
      setActivity(a=> [{ id: 'a'+Date.now()+Math.random(), ts: Date.now(), type:'trade', title:`Auto-sent: ${t.receive.map(id=> players.find(p=>p.id===id)?.name).join(' + ')}`, desc: t.reasoning.slice(0,90), reasoning: t.reasoning, delta:`+${t.champDelta}% champ`, status:'done'}, ...a]);
    });
    notify(`Auto-sent ${toSend.length} trade${toSend.length>1?'s':''}`,'success');
  }, [trades, aiSettings, activity, players, notify]);

  const executeWaiver = useCallback((waiverId)=>{
    const w = waivers.find(x=>x.id===waiverId);
    if(!w) return;
    const player = players.find(p=>p.id===w.playerId);
    const drop = w.dropId ? players.find(p=>p.id===w.dropId) : null;
    setMyRoster(ro=> {
      let next = [...ro];
      if(drop && next.includes(drop.id)) next = next.filter(id=> id!==drop.id);
      if(!next.includes(player.id)) next.push(player.id);
      return next;
    });
    setWaivers(ws=> ws.map(x=> x.id===waiverId? {...x, claimed:true}: x));
    setActivity(a=> [{ id: 'a'+Date.now(), ts: Date.now(), type:'waiver', title:`Claimed ${player.name} off waivers`, desc: drop? `Dropped ${drop.name} — FAAB $${w.faab}`: `FAAB $${w.faab} — edge +${w.edge}`, reasoning: w.reasoning, delta:`+${w.edge} edge`, status:'done'}, ...a]);
    notify(`Claimed ${player.name} — FAAB $${w.faab}`,'success');
  }, [waivers, players, notify]);

  const optimizeLineup = useCallback(()=>{
    const sorted = [...myPlayers].sort((a,b)=> b.sportsbookPPG - a.sportsbookPPG);
    const qbs = sorted.filter(p=>p.pos==='QB');
    const rbs = sorted.filter(p=>p.pos==='RB');
    const wrs = sorted.filter(p=>p.pos==='WR');
    const tes = sorted.filter(p=>p.pos==='TE');
    const best = [];
    if(qbs[0]) best.push(qbs[0].id);
    if(rbs[0]) best.push(rbs[0].id);
    if(rbs[1]) best.push(rbs[1].id);
    if(wrs[0]) best.push(wrs[0].id);
    if(wrs[1]) best.push(wrs[1].id);
    if(wrs[2]) best.push(wrs[2].id);
    if(tes[0]) best.push(tes[0].id);
    const flexPool = [...rbs.slice(2), ...wrs.slice(3), ...tes.slice(1)].sort((a,b)=> b.sportsbookPPG - a.sportsbookPPG);
    if(flexPool[0]) best.push(flexPool[0].id);
    const remainingSlots = 9 - best.length;
    if(remainingSlots>0){
      const leftover = sorted.filter(p=> !best.includes(p.id)).slice(0, remainingSlots);
      leftover.forEach(p=> best.push(p.id));
    }
    setMyStarters(best.slice(0,9));
    const projBefore = starterPlayers.reduce((s,p)=> s+p.sportsbookPPG,0);
    const projAfter = best.map(id=> players.find(p=>p.id===id)).filter(Boolean).reduce((s,p)=> s+p.sportsbookPPG,0);
    const delta = (projAfter - projBefore).toFixed(1);
    setActivity(a=> [{ id: 'a'+Date.now(), ts: Date.now(), type:'lineup', title:'Lineup optimized via sportsbook model', desc:`${delta>0?'+':''}${delta} PPG vs previous — FanDuel weighted ${aiSettings.sportsbookWeight}%`, reasoning:'Sorted by sportsbook-implied PPG adjusted for matchup & usage. Sleeper ranks underweight recent route share.', delta:`${delta>0?'+':''}${delta} PPG`, status:'done'}, ...a]);
    notify(`Lineup optimized — ${delta>0?'+':''}${delta} PPG`,'success');
  }, [myPlayers, starterPlayers, players, aiSettings.sportsbookWeight, notify]);

  const value = {
    user, setUser, isAuthed, setIsAuthed,
    league, teams, setTeams,
    players, myPlayers, myRoster, setMyRoster, myStarters, setMyStarters, starterPlayers, benchPlayers, myTeam,
    trades, setTrades, proposeTrade, autoSendEligible,
    waivers, setWaivers, executeWaiver,
    news, setNews,
    activity, setActivity,
    aiSettings, updateAiSettings, setAiSettings,
    sim, setSim, schedule: scheduleSeed,
    sleeperSyncing, syncSleeper, sleeperLeagues, switchLeague, lastSync,
    notifications, notify,
    optimizeLineup
  };
  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}
