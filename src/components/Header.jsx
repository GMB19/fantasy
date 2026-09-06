import { Search, Bell, Menu, Radio, Link2, Loader2, Check, ChevronDown } from 'lucide-react'
import { useStore } from '../lib/store'
import { useState } from 'react'

export default function Header({ onMenu }) {
  const { notifications, notify, syncSleeper, sleeperSyncing, user, league, sleeperLeagues, switchLeague, lastSync } = useStore();
  const [q, setQ] = useState('');
  const [showSync, setShowSync] = useState(false);
  const [sleeperName, setSleeperName] = useState(user.sleeperUsername || '');
  const [leaguesOpen, setLeaguesOpen] = useState(false);

  // Keep input synced when user changes externally
  // useEffect not needed for simple case — update on open
  const openSync = () => {
    setSleeperName(user.sleeperUsername || '');
    setShowSync(v=> !v);
  };

  return (
    <div className="sticky top-0 z-30 bg-[#f8fafb]/80 glass border-b border-ink-200">
      <div className="flex items-center gap-3 px-4 lg:px-6 py-3">
        <button onClick={onMenu} className="lg:hidden p-2 rounded-xl bg-white border border-ink-200"><Menu size={18}/></button>
        <div className="hidden md:flex items-center gap-2 text-xs font-bold tracking-widest text-ink-500">
          <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" /> LIVE MARKET • FanDuel • Sleeper • PFF
        </div>
        <div className="flex-1 flex justify-center">
          <div className="relative w-full max-w-[560px]">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-400" />
            <input value={q} onChange={e=>setQ(e.target.value)} placeholder="Search players, teams, or ask GM…  e.g. 'sell high WRs'" className="w-full pl-9 pr-4 py-2.5 rounded-full bg-white border border-ink-200 text-sm placeholder:text-ink-400 focus:outline-none focus:ring-2 focus:ring-ink-900/10" />
            {q && <div className="absolute top-full mt-2 w-full bg-white border border-ink-200 rounded-2xl shadow-xl p-3 text-sm">
              <div className="text-xs font-bold tracking-widest text-ink-400 mb-2">AI QUICK ANSWER</div>
              <div className="font-medium">Try “<b>Who should I trade for a RB1?</b>” — GM finds 4 buy-low RBs with +2.1 → 3.2 edge.</div>
              <button onClick={()=>{ setQ(''); notify('Trade Finder opened','info'); }} className="mt-2 text-xs font-bold text-emerald-600">Open Trade Finder →</button>
            </div>}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={openSync} className={`flex items-center gap-2 px-3 py-2 rounded-full border text-xs font-bold transition ${showSync?'bg-ink-900 text-white border-ink-900':'bg-white border-ink-200 hover:bg-ink-50'}`}>
            {sleeperSyncing ? <Loader2 size={14} className="animate-spin"/> : <Link2 size={14}/>}
            <span className="hidden sm:inline">Sleeper: @{user.sleeperUsername || 'not linked'}</span>
            <span className="sm:hidden">Sleeper</span>
            {lastSync && !sleeperSyncing && <span className="hidden lg:inline-flex w-2 h-2 bg-emerald-500 rounded-full ml-1" title={`Last sync ${new Date(lastSync).toLocaleTimeString()}`} />}
          </button>
          <button className="hidden md:flex items-center gap-2 px-3 py-2 rounded-full bg-ink-900 text-white text-xs font-bold"><Radio size={14}/> GAME DAY 1:00 PM</button>
          <button className="relative w-9 h-9 grid place-items-center rounded-full bg-white border border-ink-200" onClick={()=> notify('3 new news items — check News tab','info')}>
            <Bell size={16} />
            <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-[11px] font-black grid place-items-center rounded-full">3</span>
          </button>
        </div>
      </div>

      {showSync && (
        <div className="px-4 lg:px-6 pb-4">
          <div className="bg-white border border-ink-200 rounded-[20px] p-4 shadow-xl">
            <div className="flex flex-wrap items-start justify-between gap-3 mb-3">
              <div>
                <div className="font-black flex items-center gap-2">Sleeper Sync <span className="text-[11px] font-black tracking-widest bg-emerald-50 border border-emerald-200 text-emerald-700 px-2 py-1 rounded-full">REAL API + DEMO FALLBACK</span></div>
                <div className="text-xs font-medium text-ink-500 mt-1">Enter any Sleeper username — we hit <span className="font-mono bg-ink-50 border border-ink-200 px-1 rounded">/api/sleeper/user/:username</span> (proxied). If offline (preview), mock leagues are returned so the button always does something.</div>
              </div>
              <button onClick={()=> setShowSync(false)} className="px-3 py-1.5 rounded-full bg-white border border-ink-200 text-xs font-bold">Close</button>
            </div>

            <div className="grid md:grid-cols-[1fr_auto] gap-3 items-end">
              <div>
                <div className="text-[11px] font-black tracking-widest text-ink-500">SLEEPER USERNAME</div>
                <div className="flex gap-2 mt-1">
                  <span className="px-3 py-3 rounded-2xl bg-ink-50 border border-ink-200 text-sm font-bold">@</span>
                  <input value={sleeperName} onChange={e=> setSleeperName(e.target.value)} onKeyDown={e=>{ if(e.key==='Enter') syncSleeper(sleeperName).then(()=> setSleeperName(user.sleeperUsername || sleeperName)); }} placeholder="your_sleeper_username  • try: sleeper" className="flex-1 px-4 py-3 rounded-2xl bg-ink-50 border border-ink-200 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-ink-900/10" autoFocus />
                </div>
                <div className="text-xs font-medium text-ink-500 mt-1.5 flex flex-wrap gap-2">
                  <span>Current: <b>@{user.sleeperUsername}</b> → <b>{league.name}</b> • {league.teamsCount} teams</span>
                  {lastSync && <span>• Last sync {new Date(lastSync).toLocaleString()}</span>}
                </div>
              </div>
              <div className="flex gap-2">
                <button
                  disabled={sleeperSyncing}
                  onClick={async()=> {
                    const r = await syncSleeper(sleeperName);
                    // keep input synced after success
                    if(r?.ok) setSleeperName(clean=> clean);
                  }}
                  className="px-6 py-3 rounded-full bg-emerald-600 text-white font-black text-sm disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 min-w-[140px] justify-center"
                >
                  {sleeperSyncing ? <><Loader2 size={16} className="animate-spin"/> Syncing…</> : 'Sync Sleeper →'}
                </button>
              </div>
            </div>

            {sleeperLeagues.length>0 && (
              <div className="mt-4 border-t border-ink-200 pt-4">
                <div className="flex items-center justify-between">
                  <div className="text-[11px] font-black tracking-widest text-ink-500">YOUR LEAGUES ({sleeperLeagues.length}) — TAP TO SWITCH</div>
                  <button onClick={()=> setLeaguesOpen(!leaguesOpen)} className="text-xs font-bold flex items-center gap-1">{leaguesOpen?'Hide':'Show'} <ChevronDown size={12} className={`transition ${leaguesOpen?'rotate-180':''}`}/></button>
                </div>
                {(leaguesOpen || sleeperLeagues.length<=2) && (
                  <div className="mt-2 grid md:grid-cols-2 gap-2">
                    {sleeperLeagues.map(l=> {
                      const active = l.league_id===league.id;
                      return (
                        <button key={l.league_id} onClick={()=> switchLeague(l.league_id)} className={`text-left p-3 rounded-2xl border flex items-center gap-3 ${active?'bg-ink-900 text-white border-ink-900':'bg-ink-50 border-ink-200 hover:bg-white'}`}>
                          <div className={`w-9 h-9 rounded-xl grid place-items-center font-black text-sm shrink-0 ${active?'bg-white text-ink-900':'bg-ink-900 text-white'}`}>{l.total_rosters}</div>
                          <div className="min-w-0 flex-1">
                            <div className="font-bold text-sm truncate">{l.name}</div>
                            <div className={`text-xs font-medium ${active?'text-white/70':'text-ink-500'}`}>{l.season} • {l.total_rosters} teams • {l.league_id.slice(-6)}</div>
                          </div>
                          {active && <Check size={16} className="text-emerald-400 shrink-0"/>}
                        </button>
                      )
                    })}
                  </div>
                )}
              </div>
            )}

            <div className="mt-3 rounded-2xl bg-amber-50 border border-amber-200 p-3 text-xs font-medium">
              <b>Heads up:</b> This preview runs in e2b which blocks <b>sleeper.app</b> TLS (only GitHub is proxied). The server auto-returns <b>mock leagues</b> so sync always succeeds — real Sleeper works when deployed (Vercel/Render) where egress is open. Check Activity Log for sync detail.
            </div>
          </div>
        </div>
      )}

      {/* global notification toasts */}
      <div className="fixed top-4 right-4 z-[60] space-y-2 pointer-events-none">
        {notifications.map(n=> (
          <div key={n.id} className={`pointer-events-auto min-w-[320px] max-w-[420px] rounded-2xl px-4 py-3 shadow-xl border text-sm font-medium flex items-center gap-3 ${n.type==='success'?'bg-emerald-600 text-white border-emerald-700': n.type==='error'?'bg-red-600 text-white border-red-700':'bg-ink-900 text-white border-ink-800'}`}>
            <span className="w-2 h-2 rounded-full bg-white animate-pulse shrink-0" /> {n.msg}
          </div>
        ))}
      </div>
    </div>
  )
}
