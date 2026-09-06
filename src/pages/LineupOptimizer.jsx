import { useStore } from '../lib/store'
import { Zap, TrendingUp, Check, AlertTriangle, ArrowUpRight } from 'lucide-react'

export default function LineupOptimizer(){
  const { starterPlayers, benchPlayers, myPlayers, optimizeLineup, aiSettings, players } = useStore();
  const projectedBook = starterPlayers.reduce((s,p)=> s+p.sportsbookPPG,0);
  const projectedSleeper = starterPlayers.reduce((s,p)=> s+p.sleeperPPG,0);
  // compute optimal suggestion
  const sorted = [...myPlayers].sort((a,b)=> b.sportsbookPPG - a.sportsbookPPG);
  const suggested = sorted.slice(0,9);
  const suggestedBook = suggested.reduce((s,p)=> s+p.sportsbookPPG,0);
  const delta = (suggestedBook - projectedBook).toFixed(1);
  const isOptimal = Math.abs(parseFloat(delta)) < 0.4;

  const slots = [
    { slot:'QB', p: starterPlayers.find(p=>p.pos==='QB') },
    { slot:'RB', p: starterPlayers.filter(p=>p.pos==='RB')[0] },
    { slot:'RB', p: starterPlayers.filter(p=>p.pos==='RB')[1] },
    { slot:'WR', p: starterPlayers.filter(p=>p.pos==='WR')[0] },
    { slot:'WR', p: starterPlayers.filter(p=>p.pos==='WR')[1] },
    { slot:'WR', p: starterPlayers.filter(p=>p.pos==='WR')[2] },
    { slot:'TE', p: starterPlayers.find(p=>p.pos==='TE') },
    { slot:'FLEX', p: starterPlayers.find(p=> !['QB','TE'].includes(p.pos) && !starterPlayers.slice(0,6).includes(p)) || starterPlayers[7] },
    { slot:'FLEX', p: starterPlayers[8] || benchPlayers[0] },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-[28px] font-black tracking-tight">Lineup Optimizer</h1>
          <p className="text-sm font-medium text-ink-500">FanDuel-implied projections • matchup adjustments • usage trends — one-click optimize.</p>
        </div>
        <button onClick={optimizeLineup} className="px-5 py-3 rounded-full bg-emerald-600 text-white font-black text-sm flex items-center gap-2"><Zap size={16}/> Optimize to {suggestedBook.toFixed(1)} book PPG {delta>0?`(+${delta})`:''}</button>
      </div>

      <div className="grid grid-cols-12 gap-4">
        <div className="col-span-12 lg:col-span-7 space-y-4">
          <div className="bg-white rounded-[20px] border border-ink-200 p-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h3 className="font-black">Week 7 Starters</h3>
              <div className="flex gap-2 text-xs font-black">
                <span className="px-3 py-1.5 rounded-full bg-ink-900 text-white">{projectedBook.toFixed(1)} book PPG</span>
                <span className="px-3 py-1.5 rounded-full bg-white border border-ink-200">{projectedSleeper.toFixed(1)} Sleeper</span>
                <span className={`px-3 py-1.5 rounded-full border ${parseFloat(delta)>=0?'bg-emerald-50 border-emerald-200 text-emerald-700':'bg-red-50 border-red-200 text-red-700'}`}>{delta>0?'+':''}{delta} delta</span>
              </div>
            </div>

            <div className="mt-4 space-y-2">
              {slots.map((s,i)=>{
                const p = s.p;
                if(!p) return <div key={i} className="p-3 rounded-2xl border border-dashed border-ink-200 text-sm font-bold text-ink-400 flex items-center gap-3"><span className="w-10 h-10 rounded-xl bg-ink-100 grid place-items-center text-xs font-black">{s.slot}</span> Empty — add from bench</div>;
                const edge = (p.sportsbookPPG - p.sleeperPPG).toFixed(1);
                const matchup = p.team==='ATL'?'vs SEA (28th vs RB) — elite': p.team==='SEA'?'vs ATL (30th vs SLOT) — boost': p.team==='BAL'?'vs TB — neutral':'vs OPP —';
                return (
                  <div key={i} className="flex gap-3 p-3 rounded-2xl border border-ink-200 bg-white">
                    <div className="w-10 h-10 rounded-xl bg-ink-900 text-white grid place-items-center text-[11px] font-black">{s.slot}</div>
                    <img src={p.avatar} alt="" className="w-10 h-10 rounded-full bg-ink-50 object-cover border border-ink-200" />
                    <div className="flex-1 min-w-0">
                      <div className="font-bold text-sm">{p.name} <span className="text-ink-400 font-semibold">{p.pos} • {p.team}</span> {p.injury!=='Healthy' && <span className="ml-1 text-[10px] font-black bg-amber-100 text-amber-700 border border-amber-200 px-1.5 py-0.5 rounded-full">{p.injury}</span>}</div>
                      <div className="text-xs font-medium text-ink-600">{p.sportsbookPPG.toFixed(1)} book • {p.sleeperPPG.toFixed(1)} sleeper • <span className={parseFloat(edge)>0?'text-emerald-600 font-black':'text-red-600 font-black'}>{edge>0?'+':''}{edge}</span> • {p.snapShare? `${p.snapShare}% snaps`: ''} {p.targetShare? `• ${p.targetShare}% tgt`: ''}</div>
                      <div className="text-xs font-semibold text-ink-500 mt-1">{matchup}</div>
                    </div>
                    <span className={`hidden md:inline h-fit px-2 py-1 rounded-full text-xs font-black border ${parseFloat(edge)>0.8?'bg-emerald-50 border-emerald-200 text-emerald-700':'bg-white border-ink-200 text-ink-600'}`}>{parseFloat(edge)>0.8?'BOOK EDGE': parseFloat(edge)<-0.8?'SLEEPER HIGH':'NEUTRAL'}</span>
                  </div>
                )
              })}
            </div>

            {isOptimal ? (
              <div className="mt-4 rounded-2xl bg-emerald-50 border border-emerald-200 p-3 flex items-center gap-2 text-sm font-bold text-emerald-800"><Check size={16}/> Lineup is 98.2% optimal — no move beats current by &gt;0.3 pts.</div>
            ) : (
              <div className="mt-4 rounded-2xl bg-amber-50 border border-amber-200 p-3 text-sm font-bold text-amber-800 flex items-center gap-2"><AlertTriangle size={16}/> Suggested swap gains +{delta} — click Optimize to apply sportsbook model.</div>
            )}
          </div>

          <div className="bg-ink-900 text-white rounded-[20px] p-5">
            <h3 className="font-black">Why This Lineup?</h3>
            <div className="mt-3 space-y-2 text-sm font-medium">
              <div className="rounded-2xl bg-white/10 border border-white/10 p-3">• <b>JSN over Walker:</b> 78% routes vs ATL slot funnel (30th) — +2.4 book edge outweighs Walker’s SF matchup (-4.2 adj).</div>
              <div className="rounded-2xl bg-white/10 border border-white/10 p-3">• <b>Garrett Wilson WR2:</b> FanDuel 82.5 yds juiced over → 16.4 book vs 14.1 Sleeper — market sees breakout.</div>
              <div className="rounded-2xl bg-white/10 border border-white/10 p-3">• <b>Bijan locked RB1:</b> 78.5 rush yds prop, TD -145, SEA 28th vs RB.</div>
            </div>
          </div>
        </div>

        <div className="col-span-12 lg:col-span-5 space-y-4">
          <div className="bg-white rounded-[20px] border border-ink-200 p-5">
            <h3 className="font-black">Book vs Sleeper — Starters</h3>
            <div className="mt-4 space-y-3">
              {starterPlayers.map(p=>{
                const delta = p.sportsbookPPG - p.sleeperPPG;
                const width = 50 + delta*8;
                return (
                  <div key={p.id} className="flex items-center gap-3">
                    <img src={p.avatar} className="w-8 h-8 rounded-full border border-ink-200" alt="" />
                    <div className="flex-1">
                      <div className="flex justify-between text-xs font-bold"><span>{p.name}</span><span className={delta>0?'text-emerald-600':'text-red-600'}>{delta>0?'+':''}{delta.toFixed(1)}</span></div>
                      <div className="h-2 bg-ink-100 rounded-full mt-1 overflow-hidden flex">
                        <div className="h-full bg-ink-300" style={{width:'50%'}} />
                        <div className={`h-full ${delta>0?'bg-emerald-500':'bg-red-500'}`} style={{width:`${Math.abs(delta)*6}%`}} />
                      </div>
                      <div className="flex justify-between text-[11px] font-semibold text-ink-500"><span>{p.sleeperPPG.toFixed(1)} Sleeper</span><span>{p.sportsbookPPG.toFixed(1)} Book</span></div>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          <div className="bg-white rounded-[20px] border border-ink-200 p-5">
            <h3 className="font-black">Bench — Next Man Up</h3>
            <div className="mt-3 space-y-2">
              {benchPlayers.map(p=> {
                const d = (p.sportsbookPPG - p.sleeperPPG).toFixed(1);
                return (
                  <div key={p.id} className="flex items-center gap-3 p-2.5 rounded-2xl border border-ink-200">
                    <img src={p.avatar} className="w-9 h-9 rounded-full border border-ink-200" alt="" />
                    <div className="flex-1 min-w-0">
                      <div className="font-bold text-sm truncate">{p.name} <span className="text-ink-400 text-xs">{p.pos}</span></div>
                      <div className="text-xs font-medium text-ink-500">{p.sportsbookPPG.toFixed(1)} book • {p.sleeperPPG.toFixed(1)} sleeper <span className={parseFloat(d)>0?'text-emerald-600 font-black':'text-red-600 font-black'}>{d>0?'+':''}{d}</span></div>
                    </div>
                    <button onClick={optimizeLineup} className="px-3 py-1.5 rounded-full bg-ink-900 text-white text-xs font-black">Start</button>
                  </div>
                )
              })}
              <button onClick={()=> optimizeLineup()} className="w-full py-2.5 rounded-full bg-white border border-ink-200 font-bold text-sm flex items-center justify-center gap-1">Swap best bench in <ArrowUpRight size={14}/></button>
            </div>
          </div>

          <div className="rounded-[20px] bg-amber-50 border border-amber-200 p-4">
            <div className="text-xs font-black tracking-widest text-amber-700">AUTOMATION</div>
            <div className="text-sm font-bold mt-1">If you don’t set lineup by Thu 11:59am, GM auto-optimizes with {aiSettings.sportsbookWeight}% book weight.</div>
            <div className="text-xs font-medium text-ink-600 mt-1">Uses injuries + inactives + late line moves.</div>
          </div>
        </div>
      </div>
    </div>
  )
}
