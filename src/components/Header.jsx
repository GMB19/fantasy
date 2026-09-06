import { Search, Bell, Menu, Radio, Link2 } from 'lucide-react'
import { useStore } from '../lib/store'
import { useState } from 'react'

export default function Header({ onMenu }) {
  const { notifications, notify, syncSleeper, sleeperSyncing, user } = useStore();
  const [q, setQ] = useState('');
  const [showSync, setShowSync] = useState(false);
  const [sleeperName, setSleeperName] = useState(user.sleeperUsername || '');
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
          <button onClick={()=> setShowSync(!showSync)} className="hidden md:flex items-center gap-2 px-3 py-2 rounded-full bg-white border border-ink-200 text-xs font-bold hover:bg-ink-50"><Link2 size={14}/> Sleeper: @{user.sleeperUsername || 'not linked'}</button>
          <button className="hidden md:flex items-center gap-2 px-3 py-2 rounded-full bg-ink-900 text-white text-xs font-bold"><Radio size={14}/> GAME DAY 1:00 PM</button>
          <button className="relative w-9 h-9 grid place-items-center rounded-full bg-white border border-ink-200" onClick={()=> notify('3 new news items — check News tab','info')}>
            <Bell size={16} />
            <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-[11px] font-black grid place-items-center rounded-full">3</span>
          </button>
        </div>
      </div>

      {showSync && (
        <div className="px-4 lg:px-6 pb-3">
          <div className="bg-white border border-ink-200 rounded-2xl p-4 flex flex-wrap gap-3 items-end shadow-lg">
            <div className="flex-1 min-w-[220px]">
              <div className="text-[11px] font-black tracking-widest text-ink-500">SLEEPER USERNAME</div>
              <div className="flex gap-2 mt-1">
                <span className="px-3 py-2.5 rounded-xl bg-ink-50 border border-ink-200 text-sm font-bold">@</span>
                <input value={sleeperName} onChange={e=> setSleeperName(e.target.value)} placeholder="your_sleeper_username" className="flex-1 px-3 py-2.5 rounded-xl bg-ink-50 border border-ink-200 text-sm font-medium" />
              </div>
              <div className="text-xs font-medium text-ink-500 mt-1">Real Sleeper API: we call /v1/user/username → leagues → rosters. Falls back to demo if not found.</div>
            </div>
            <button disabled={sleeperSyncing} onClick={async()=> { await syncSleeper(sleeperName); setShowSync(false); }} className="px-5 py-3 rounded-full bg-emerald-600 text-white font-black text-sm disabled:opacity-60">{sleeperSyncing?'Syncing…':'Sync Sleeper →'}</button>
            <button onClick={()=> setShowSync(false)} className="px-4 py-3 rounded-full bg-white border border-ink-200 font-bold text-sm">Close</button>
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
