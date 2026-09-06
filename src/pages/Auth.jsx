import { useState } from 'react'
import { useStore } from '../lib/store'

export default function Auth(){
  const { setIsAuthed, setUser, user, syncSleeper, sleeperSyncing, notify } = useStore();
  const [email, setEmail] = useState('gm@arena.app');
  const [pass, setPass] = useState('password');
  const [sleeper, setSleeper] = useState(user.sleeperUsername || 'gotham_gm');

  return (
    <div className="min-h-[100dvh] grid place-items-center bg-[#f8fafb] p-4">
      <div className="w-full max-w-[980px] grid md:grid-cols-2 gap-6">
        <div className="bg-ink-900 text-white rounded-[28px] p-8 flex flex-col">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-white text-ink-900 grid place-items-center font-black text-xl">G</div>
            <div>
              <div className="font-black text-lg leading-none">GM</div>
              <div className="text-[11px] font-bold tracking-widest text-white/60">AUTONOMOUS • 24/7 • SLEEPER + FANDUEL</div>
            </div>
          </div>
          <h1 className="text-[32px] font-black leading-[0.95] mt-8">Your autonomous<br/>fantasy GM.<br/><span className="text-emerald-400">Built to win rings.</span></h1>
          <p className="text-sm font-medium text-white/70 mt-4 leading-relaxed">Sync Sleeper. GM scans FanDuel props as primary signal + injuries, routes, snaps, usage — then trades, waivers, and lineups autonomously to maximize championship probability.</p>
          <div className="mt-6 space-y-3">
            <div className="rounded-2xl bg-white/10 border border-white/10 p-3 flex items-center gap-3">
              <span className="w-8 h-8 rounded-xl bg-emerald-500 grid place-items-center font-black text-xs">24/7</span>
              <div className="text-sm font-bold">Scans every 12s • 10k season sims • explains every move</div>
            </div>
            <div className="grid grid-cols-3 gap-2 text-center">
              <div className="rounded-2xl bg-white text-ink-900 p-3"><div className="font-black text-lg">+2.4</div><div className="text-[11px] font-black tracking-widest text-ink-500">AVG EDGE</div></div>
              <div className="rounded-2xl bg-white text-ink-900 p-3"><div className="font-black text-lg">14.2%</div><div className="text-[11px] font-black tracking-widest text-ink-500">CHAMP PROB</div></div>
              <div className="rounded-2xl bg-white text-ink-900 p-3"><div className="font-black text-lg">4</div><div className="text-[11px] font-black tracking-widest text-ink-500">TRADES READY</div></div>
            </div>
          </div>
          <div className="mt-auto pt-8 text-xs font-semibold text-white/50">Demo seeded with Arena Championship League (12-team PPR) — feels alive on first load.</div>
        </div>

        <div className="bg-white rounded-[28px] border border-ink-200 p-6 md:p-8">
          <h2 className="font-black text-xl">Sign in</h2>
          <p className="text-sm font-medium text-ink-500 mt-1">Use any email — demo auth is instant. Then sync Sleeper.</p>

          <div className="mt-6 space-y-4">
            <div>
              <label className="text-xs font-black tracking-widest text-ink-500">EMAIL</label>
              <input value={email} onChange={e=> setEmail(e.target.value)} className="mt-1 w-full px-4 py-3 rounded-2xl bg-ink-50 border border-ink-200 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-ink-900/10" />
            </div>
            <div>
              <label className="text-xs font-black tracking-widest text-ink-500">PASSWORD</label>
              <input value={pass} onChange={e=> setPass(e.target.value)} type="password" className="mt-1 w-full px-4 py-3 rounded-2xl bg-ink-50 border border-ink-200 text-sm font-medium" />
            </div>
            <button onClick={()=> { setIsAuthed(true); setUser(u=> ({...u, email})); notify('Signed in — welcome back, GM','success'); }} className="w-full py-3 rounded-full bg-ink-900 text-white font-black">Continue →</button>

            <div className="relative py-2"><div className="h-px bg-ink-200" /><span className="absolute left-1/2 -translate-x-1/2 -top-1 bg-white px-3 text-xs font-black tracking-widest text-ink-400">SLEEPER SYNC</span></div>

            <div>
              <label className="text-xs font-black tracking-widest text-ink-500">SLEEPER USERNAME</label>
              <div className="mt-1 flex gap-2">
                <span className="px-3 py-3 rounded-2xl bg-ink-50 border border-ink-200 text-sm font-bold text-ink-500">@</span>
                <input value={sleeper} onChange={e=> setSleeper(e.target.value)} placeholder="your_sleeper_username" className="flex-1 px-4 py-3 rounded-2xl bg-ink-50 border border-ink-200 text-sm font-medium" />
              </div>
              <div className="text-xs font-medium text-ink-500 mt-1.5">We’ll pull your leagues, rosters, and scoring via Sleeper API. Demo keeps data if none found.</div>
            </div>

            <button disabled={sleeperSyncing} onClick={()=> syncSleeper(sleeper)} className="w-full py-3 rounded-full bg-emerald-600 text-white font-black flex items-center justify-center gap-2 disabled:opacity-60">
              {sleeperSyncing ? 'Syncing…' : 'Sync Sleeper League →'}
            </button>
            <button onClick={()=> { setIsAuthed(true); notify('Continuing with demo league — you can sync Sleeper later from header','info'); }} className="w-full py-3 rounded-full bg-white border border-ink-200 font-bold">Skip — Use Demo League</button>

            <div className="text-[11px] font-medium text-ink-400 text-center">By continuing you agree to autonomous trading within your risk limits. You can pause anytime.</div>
          </div>
        </div>
      </div>
    </div>
  )
}
