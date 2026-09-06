import { useStore } from '../lib/store'
import { Search, Plus, Trash2, Zap, TrendingUp } from 'lucide-react'
import { useState } from 'react'

export default function WaiverWire(){
  const { waivers, players, executeWaiver, myRoster, notify } = useStore();
  const [q, setQ] = useState('');
  const [filter, setFilter] = useState('all');
  const getP = id=> players.find(p=>p.id===id);

  const filtered = waivers.filter(w=>{
    const p = getP(w.playerId);
    if(q && !p.name.toLowerCase().includes(q.toLowerCase())) return false;
    if(filter!=='all' && p.pos!==filter) return false;
    return true;
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-[28px] font-black tracking-tight">Waiver Wire</h1>
          <p className="text-sm font-medium text-ink-500">Sportsbook edge + roster math + FAAB optimizer — auto-queued claims below.</p>
        </div>
        <div className="flex items-center gap-2">
          <span className="hidden md:inline-flex px-3 py-2 rounded-full bg-white border border-ink-200 text-xs font-bold">$67 FAAB remaining • $28 queued</span>
          <button onClick={()=> notify('FAAB optimizer: queued claims are FAAB-efficient — $14 > $8 > $6','info')} className="px-4 py-2.5 rounded-full bg-ink-900 text-white font-bold text-sm">Optimize FAAB</button>
        </div>
      </div>

      <div className="bg-white rounded-[20px] border border-ink-200 p-4 flex flex-wrap gap-3 items-center">
        <div className="relative flex-1 min-w-[220px]">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-400" />
          <input value={q} onChange={e=> setQ(e.target.value)} placeholder="Search waivers — e.g., Bucky Irving" className="w-full pl-9 pr-3 py-2.5 rounded-full bg-ink-50 border border-ink-200 text-sm focus:outline-none" />
        </div>
        <div className="flex gap-1.5">
          {['all','RB','WR','TE'].map(pos=> (
            <button key={pos} onClick={()=> setFilter(pos)} className={`px-3.5 py-2 rounded-full text-xs font-black ${filter===pos?'bg-ink-900 text-white':'bg-white border border-ink-200 text-ink-600'}`}>{pos.toUpperCase()}</button>
          ))}
        </div>
        <span className="text-xs font-semibold text-ink-500">{filtered.length} claims • edge ≥1.8</span>
      </div>

      <div className="grid gap-3">
        {filtered.map(w=>{
          const p = getP(w.playerId);
          const drop = w.dropId ? getP(w.dropId) : null;
          return (
            <div key={w.id} className={`bg-white rounded-[20px] border overflow-hidden flex flex-col md:flex-row ${w.claimed?'opacity-60':''} ${w.edge>=2.2?'border-emerald-200':'border-ink-200'}`}>
              <div className="flex-1 p-4 md:p-5 flex gap-4">
                <img src={p.avatar} alt="" className="w-14 h-14 rounded-2xl bg-ink-50 object-cover border border-ink-200" />
                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-[11px] font-black tracking-widest px-2 py-1 rounded-full bg-ink-900 text-white">PRIORITY #{w.priority}</span>
                    <span className={`text-xs font-black px-2 py-1 rounded-full border ${p.pos==='RB'?'bg-emerald-50 border-emerald-200 text-emerald-700': p.pos==='WR'?'bg-blue-50 border-blue-200 text-blue-700':'bg-amber-50 border-amber-200 text-amber-700'}`}>{p.pos} • {p.team}</span>
                    <span className="text-xs font-bold text-ink-500">{p.snapShare? `${p.snapShare}% snaps`: ''} {p.routes? `• ${p.routes} routes`: ''} • {p.adp} ADP</span>
                    <span className="ml-auto flex items-center gap-1 text-xs font-black text-emerald-600"><TrendingUp size={12}/> +{w.edge} edge</span>
                  </div>
                  <div className="font-black text-[18px] mt-1">{p.name} <span className="text-sm font-semibold text-ink-400">• {p.age ? `${p.age} y/o`: ''} • {w.rosteredPct}% rostered • 🔥 {w.trending}% trending</span></div>
                  <div className="flex flex-wrap gap-2 mt-2 text-xs font-bold">
                    <span className="px-2.5 py-1 rounded-full bg-ink-900 text-white">{p.sportsbookPPG.toFixed(1)} book</span>
                    <span className="px-2.5 py-1 rounded-full bg-white border border-ink-200">{p.sleeperPPG.toFixed(1)} Sleeper</span>
                    <span className="px-2.5 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-700">+{w.edge} arbitrage</span>
                    <span className="px-2.5 py-1 rounded-full bg-white border border-ink-200">FAAB ${w.faab}</span>
                  </div>
                  <div className="mt-3 rounded-2xl bg-ink-900 text-white p-3">
                    <div className="text-[11px] font-black tracking-widest text-white/60">AI REASONING</div>
                    <div className="text-sm font-medium leading-snug mt-1">{w.reasoning}</div>
                  </div>
                  {drop && (
                    <div className="mt-2 flex items-center gap-2 text-xs font-semibold text-ink-600">
                      <Trash2 size={12}/> Drop: <b>{drop.name}</b> ({drop.pos} • {drop.sleeperPPG.toFixed(1)} PPG) — replaceable streamer, 7.8 pts replacement level.
                    </div>
                  )}
                </div>
              </div>
              <div className="p-4 md:w-[220px] md:border-l border-ink-200 bg-ink-50/60 flex flex-col gap-2 justify-center">
                {w.claimed ? (
                  <span className="w-full py-3 rounded-full bg-emerald-600 text-white text-center font-black text-sm">✓ Claimed</span>
                ) : (
                  <>
                    <button onClick={()=> executeWaiver(w.id)} className="w-full py-3 rounded-full bg-ink-900 text-white font-black text-sm flex items-center justify-center gap-2"><Plus size={16}/> Claim for ${w.faab}</button>
                    <button onClick={()=> notify('Claim priority moved — reordering queue','info')} className="w-full py-2.5 rounded-full bg-white border border-ink-200 font-bold text-sm">Move Priority</button>
                    <div className="text-[11px] font-semibold text-ink-500 text-center">Auto-submits Tue 3:00 AM • within FAAB guardrails</div>
                  </>
                )}
              </div>
            </div>
          )
        })}
        {filtered.length===0 && (
          <div className="bg-white rounded-[20px] border border-ink-200 border-dashed p-12 text-center">
            <div className="w-12 h-12 rounded-2xl bg-ink-900 text-white grid place-items-center mx-auto"><Zap size={20}/></div>
            <div className="font-black mt-3">No waiver edges above 1.8 right now</div>
            <div className="text-sm font-medium text-ink-500">GM is tracking 147 props — will notify when an edge appears.</div>
          </div>
        )}
      </div>

      <div className="bg-white rounded-[20px] border border-ink-200 p-5">
        <h3 className="font-black">Waiver Automation Rules</h3>
        <div className="mt-3 grid md:grid-cols-3 gap-3 text-sm">
          <div className="rounded-2xl bg-ink-50 border border-ink-200 p-3"><div className="font-black">Edge &gt; 1.8 + Rostered &lt; 45%</div><div className="text-xs font-medium text-ink-600">Only arb opportunities clear threshold.</div></div>
          <div className="rounded-2xl bg-ink-50 border border-ink-200 p-3"><div className="font-black">Drop = Lowest Replacement</div><div className="text-xs font-medium text-ink-600">DST/K or bench &lt; 8.0 PPG.</div></div>
          <div className="rounded-2xl bg-ink-50 border border-ink-200 p-3"><div className="font-black">FAAB Guardrail</div><div className="text-xs font-medium text-ink-600">Max $15/claim, $28 queued, preserves 2/3 budget.</div></div>
        </div>
      </div>
    </div>
  )
}
