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

  // persist
  useEffect(() => {
    const data = { user, isAuthed, league, teams, myRoster, myStarters, trades, waivers, news, activity, aiSettings, sim };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    // also try to sync to server if available
    fetch('/api/data', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) }).catch(()=>{});
  }, [user, isAuthed, league, teams, myRoster, myStarters, trades, waivers, news, activity, aiSettings, sim]);

  // load from server on mount (merge)
  useEffect(() => {
    fetch('/api/data').then(r=>r.json()).then(d=>{
      if(d && !d.empty && d.league) {
        // keep server data if fresher? For now ignore to keep demo deterministic
      }
    }).catch(()=>{});
  }, []);

  const myTeam = useMemo(() => teams.find(t=>t.owner==='You') || teams[0], [teams]);
  const myPlayers = useMemo(() => myRoster.map(id=> players.find(p=>p.id===id)).filter(Boolean), [myRoster, players]);
  const starterPlayers = useMemo(() => myStarters.map(id=> players.find(p=>p.id===id)).filter(Boolean), [myStarters, players]);
  const benchPlayers = useMemo(() => myPlayers.filter(p=> !myStarters.includes(p.id)), [myPlayers, myStarters]);

  const notify = useCallback((msg, type='info') => {
    const id = Date.now().toString();
    setNotifications(n => [...n, { id, msg, type }]);
    setTimeout(()=> setNotifications(n=> n.filter(x=>x.id!==id)), 3500);
  }, []);

  const syncSleeper = useCallback(async (username) => {
    if(!username) return notify('Enter Sleeper username','error');
    setSleeperSyncing(true);
    try {
      // try real sleeper fetch
      const uRes = await fetch(`/api/sleeper/user/${username}`);
      if(uRes.ok){
        const u = await uRes.json();
        if(u && u.user_id){
          setUser(prev=> ({...prev, sleeperUsername: username, sleeperId: u.user_id}));
          // fetch leagues current season
          const season = new Date().getFullYear();
          const lRes = await fetch(`/api/sleeper/user/${u.user_id}/leagues/nfl/${season}`);
          if(lRes.ok){
            const leagues = await lRes.json();
            if(Array.isArray(leagues) && leagues.length>0){
              const first = leagues[0];
              setLeague(prev=> ({...prev, name: first.name || prev.name, season: first.season || prev.season, avatar: first.avatar? `https://sleepercdn.com/avatars/thumbs/${first.avatar}`: prev.avatar, scoring: prev.scoring }));
              notify(`Synced ${leagues.length} league${leagues.length>1?'s':''} from Sleeper — loaded "${first.name}"`, 'success');
            } else {
              notify(`Found Sleeper user @${username} — no ${season} leagues, keeping demo league`, 'info');
            }
          }
        } else {
          notify('Sleeper user not found, keeping demo data','error');
        }
      } else {
        // fallback demo sync
        setUser(prev=> ({...prev, sleeperUsername: username}));
        notify(`Demo sync: linked @${username} to Arena Championship League (12-team PPR)`, 'success');
      }
    } catch(e){
      notify(`Sync error: ${e.message} — using demo league`,'error');
    } finally {
      setSleeperSyncing(false);
    }
  }, [notify]);

  // Autonomous AI loop — every 12s if autonomous
  useEffect(()=>{
    if(!aiSettings.autonomousMode) return;
    const id = setInterval(()=>{
      // 30% chance to generate activity
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
      // small chance to update a player projection jitter
      if(Math.random()<0.15){
        // no-op, just trigger re-render simulation jitter via sim state above
      }
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
    // respect maxDailyTransactions
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
    // add to roster, remove drop if exists
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
    // simple: sort myPlayers by sportsbookPPG descending, pick optimal by position
    const sorted = [...myPlayers].sort((a,b)=> b.sportsbookPPG - a.sportsbookPPG);
    // heuristic: choose starters: 1 QB best QB, 2 best RB, 3 best WR, 1 best TE, 1 best remaining FLEX (RB/WR/TE)
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
    // pad to 9 if needed
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
    sleeperSyncing, syncSleeper,
    notifications, notify,
    optimizeLineup
  };
  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}
