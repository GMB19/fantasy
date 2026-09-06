import { useStore } from '../lib/store'
import { ArrowRight, Shield, Zap, TrendingUp, Clock, Check, Send } from 'lucide-react'

export default function TradeFinder(){
  const { trades, players, proposeTrade, autoSendEligible, aiSettings, notify } = useStore();
  const getPlayer = id=> players.find(p=>p.id===id);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-[28px] font-black tracking-tight">Trade Finder</h1>
            <p className="text-sm font-medium text-ink-500">Sportsbook-anchored scanning — buy low where books beat Sleeper, sell high where Sleeper beats books.</p>
        </div>
        <div className="flex items-center gap-2">
          <span className="hidden md:inline-flex items-center gap-2 px-3 py-2 rounded-full bg-white border border-ink-200 text-xs font-bold"><span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" /> SCANNING 11 ROSTERS • 10k SIMS</span>
          <button onClick={autoSendEligible} className="px-4 py-2.5 rounded-full bg-emerald-600 text-white font-bold text-sm flex items-center gap-2"><Send size={14}/> Auto-Send Eligible ({trades.filter(t=> t.autoEligible && t.status==='scanning').length})</button>
        </div>
      </div>

      {/* filters */}
      <div className="flex flex-wrap gap-2">
        <span className="px-3 py-1.5 rounded-full bg-ink-900 text-white text-xs font-black">ALL • 4</span>
        <span className="px-3 py-1.5 rounded-full bg-white border border-ink-200 text-xs font-bold">BUY LOW • 2</span>
        <span className="px-3 py-1.5 rounded-full bg-white border border-ink-200 text-xs font-bold">SELL HIGH • 1</span>
        <span className="px-3 py-1.5 rounded-full bg-white border border-ink-200 text-xs font-bold">ARBITRAGE • 1</span>
        <span className="ml-auto text-xs font-semibold text-ink-500">Threshold: ≥{aiSettings.minChampProbImprovement}% champ • ≥{aiSettings.minConfidenceAuto}% conf</span>
      </div>

      <div className="grid lg:grid-cols-2 gap-4">
        {trades.map(t=>{
          const give = t.give.map(getPlayer).filter(Boolean);
          const rec = t.receive.map(getPlayer).filter(Boolean);
          const isAuto = t.autoEligible && t.confidence >= aiSettings.minConfidenceAuto && t.champDelta >= aiSettings.minChampProbImprovement;
          return (
            <div key={t.id} className="bg-white rounded-[20px] border border-ink-200 overflow-hidden flex flex-col">
              <div className={`px-4 py-3 flex items-center justify-between text-xs font-black tracking-widest ${t.type==='buy-low'?'bg-emerald-50 text-emerald-700 border-b border-emerald-200': t.type==='sell-high'?'bg-blue-50 text-blue-700 border-b border-blue-200':'bg-violet-50 text-violet-700 border-b border-violet-200'}`}>
                <span>{t.type.toUpperCase().replace('-',' ')} • {t.confidence}% CONFIDENCE</span>
                <span className="flex items-center gap-1.5"><Clock size={12}/>{t.expires}</span>
              </div>

              <div className="p-4 flex-1">
                <div className="flex items-center gap-2 text-xs font-bold text-ink-500"><span className="w-6 h-6 rounded-full bg-ink-100 grid place-items-center">{t.partnerAvatar}</span> With {t.partner} • <span className={`${t.risk==='Low'?'text-emerald-600': t.risk==='Medium'?'text-amber-600':'text-red-600'}`}>Risk {t.risk}</span> {isAuto && <span className="ml-auto px-2 py-0.5 rounded-full bg-emerald-600 text-white text-[10px] font-black">AUTO-ELIGIBLE</span>}</div>

                <div className="mt-3 grid grid-cols-[1fr_auto_1fr] items-center gap-2">
                  <div className="space-y-2">
                    <div className="text-[11px] font-black tracking-widest text-ink-400">YOU GIVE</div>
                    {give.map(p=> <MiniP key={p.id} p={p} />)}
                  </div>
                  <div className="w-9 h-9 rounded-full bg-ink-900 text-white grid place-items-center"><ArrowRight size={16}/></div>
                  <div className="space-y-2">
                    <div className="text-[11px] font-black tracking-widest text-ink-400">YOU RECEIVE</div>
                    {rec.map(p=> <MiniP key={p.id} p={p} highlight />)}
                  </div>
                </div>

                <div className="mt-4 grid grid-cols-3 gap-2">
                  <Kpi label="PPG DELTA" value={`${t.deltaPPG>0?'+':''}${t.deltaPPG}`} sub="Sleeper" />
                  <Kpi label="BOOK DELTA" value={`${t.sportsbookDelta>0?'+':''}${t.sportsbookDelta}`} sub="FanDuel" highlight />
                  <Kpi label="CHAMP Δ" value={`+${t.champDelta}%`} sub="10k sims" highlight />
                </div>

                <div className="mt-3 rounded-2xl bg-ink-900 text-white p-3">
                  <div className="text-[11px] font-black tracking-widest text-white/60">AI REASONING</div>
                  <div className="text-sm font-medium leading-snug mt-1">{t.reasoning}</div>
                </div>
              </div>

              <div className="px-4 py-3 bg-ink-50 border-t border-ink-200 flex items-center gap-2">
                {t.status==='proposed' ? (
                  <span className="flex-1 py-2.5 rounded-full bg-white border border-ink-200 text-center font-black text-sm flex items-center justify-center gap-2"><Check size={16} className="text-emerald-600"/> Offer Sent — Awaiting Response</span>
                ) : t.status==='scanning' ? (
                  <>
                    <button onClick={()=> proposeTrade(t.id)} className="flex-1 py-2.5 rounded-full bg-ink-900 text-white font-black text-sm">Send Offer</button>
                    <button onClick={()=> notify('Trade details expanded — seeing full prop breakdown','info')} className="px-4 py-2.5 rounded-full bg-white border border-ink-200 font-bold text-sm">Details</button>
                    {isAuto && aiSettings.autonomousMode && <span className="hidden md:inline-flex items-center gap-1 text-xs font-bold text-emerald-700"><Zap size={12}/> Will auto-send</span>}
                    {!isAuto && <span className="hidden md:inline text-xs font-semibold text-ink-500">Needs approval (conf {t.confidence}%)</span>}
                  </>
                ) : (
                  <span className="flex-1 py-2.5 rounded-full bg-amber-100 border border-amber-200 text-center font-black text-sm">Pending Review</span>
                )}
              </div>
            </div>
          )
        })}
      </div>

      <div className="bg-white rounded-[20px] border border-ink-200 p-5">
        <h3 className="font-black">How Trades Are Scored</h3>
        <div className="mt-3 grid md:grid-cols-4 gap-3 text-sm">
          <div className="rounded-2xl border border-ink-200 p-3"><div className="font-black">1. Sportsbook Conversion</div><div className="text-xs font-medium text-ink-600 mt-1">Props → PPG (e.g., CMC rush yds 64.5, rec 24.5, TD -140).</div></div>
          <div className="rounded-2xl border border-ink-200 p-3"><div className="font-black">2. Usage Check</div><div className="text-xs font-medium text-ink-600 mt-1">Routes, snap%, target share, depth chart.</div></div>
          <div className="rounded-2xl border border-ink-200 p-3"><div className="font-black">3. Championship Sim</div><div className="text-xs font-medium text-ink-600 mt-1">10k season sims — only +{aiSettings.minChampProbImprovement}% deals surface.</div></div>
          <div className="rounded-2xl border border-ink-200 p-3"><div className="font-black">4. Risk Gate</div><div className="text-xs font-medium text-ink-600 mt-1">Auto-send only if confidence ≥{aiSettings.minConfidenceAuto}% & under daily cap.</div></div>
        </div>
      </div>
    </div>
  )
}
function MiniP({p, highlight}){
  return (
    <div className={`flex items-center gap-2 p-2 rounded-2xl border ${highlight?'bg-emerald-50 border-emerald-200':'bg-white border-ink-200'}`}>
      <img src={p.avatar} alt="" className="w-8 h-8 rounded-full bg-white object-cover border border-ink-200" />
      <div className="flex-1 min-w-0">
        <div className="font-bold text-xs leading-none truncate">{p.name} <span className="font-semibold text-ink-400">{p.pos}</span></div>
        <div className="text-[11px] font-medium text-ink-500">{p.sportsbookPPG.toFixed(1)} book • {p.sleeperPPG.toFixed(1)} sleeper</div>
      </div>
    </div>
  )
}
function Kpi({label, value, sub, highlight}){
  return (
    <div className={`rounded-2xl border p-2.5 text-center ${highlight?'bg-ink-900 text-white border-ink-900':'bg-white border-ink-200'}`}>
      <div className={`text-[10px] font-black tracking-widest ${highlight?'text-white/60':'text-ink-400'}`}>{label}</div>
      <div className="font-black">{value}</div>
      <div className={`text-[11px] font-semibold ${highlight?'text-white/60':'text-ink-500'}`}>{sub}</div>
    </div>
  )
}
