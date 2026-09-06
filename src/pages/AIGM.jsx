import { useStore } from '../lib/store'
import { Bot, Shield, Zap, Clock, TrendingUp, AlertTriangle, Check, X, Pause, Play, Sliders } from 'lucide-react'

export default function AIGM(){
  const { aiSettings, updateAiSettings, activity, sim, notify, autoSendEligible } = useStore();

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-[28px] font-black tracking-tight flex items-center gap-3"><span className="w-9 h-9 rounded-xl bg-ink-900 text-white grid place-items-center"><Bot size={18}/></span> AI GM <span className="text-sm font-black tracking-widest bg-emerald-500 text-white px-2.5 py-1 rounded-full">AUTONOMOUS 24/7</span></h1>
          <p className="text-sm font-medium text-ink-500 mt-1">Continuously scanning Sleeper + FanDuel props, depth charts, usage, injuries, and news — optimizing for championship probability.</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={()=> updateAiSettings({autonomousMode: !aiSettings.autonomousMode})} className={`px-4 py-2.5 rounded-full font-bold text-sm flex items-center gap-2 ${aiSettings.autonomousMode?'bg-red-600 text-white':'bg-emerald-600 text-white'}`}>
            {aiSettings.autonomousMode ? <><Pause size={16}/> Pause Autonomy</> : <><Play size={16}/> Resume Autonomy</>}
          </button>
          <button onClick={autoSendEligible} className="px-4 py-2.5 rounded-full bg-ink-900 text-white font-bold text-sm">Run Now: Auto-Send</button>
        </div>
      </div>

      <div className="grid grid-cols-12 gap-4">
        <div className="col-span-12 xl:col-span-8 space-y-4">
          {/* controls */}
          <div className="bg-white rounded-[20px] border border-ink-200 p-5">
            <h3 className="font-black flex items-center gap-2"><Sliders size={16}/> Autonomy Controls</h3>
            <div className="mt-4 grid md:grid-cols-2 gap-4">
              <Toggle label="Autonomous Mode" desc="GM acts every 12s without asking" checked={aiSettings.autonomousMode} onChange={v=> updateAiSettings({autonomousMode:v})} />
              <Toggle label="Trade Approval Required" desc="If on, GM queues but waits for you when confidence < threshold" checked={aiSettings.tradeApprovalRequired} onChange={v=> updateAiSettings({tradeApprovalRequired:v})} />
              <Toggle label="Waiver Automation" desc="Auto-submit claims that clear FAAB + edge checks" checked={aiSettings.waiverAutomation} onChange={v=> updateAiSettings({waiverAutomation:v})} />
              <Toggle label="Lineup Automation" desc="Auto-optimize Thursday 11:59am if you haven’t set lineup" checked={aiSettings.lineupAutomation} onChange={v=> updateAiSettings({lineupAutomation:v})} />
              <Toggle label="News Monitoring" desc="Parse beat reports & injury news in real time" checked={aiSettings.newsMonitoring} onChange={v=> updateAiSettings({newsMonitoring:v})} />
              <div className="rounded-2xl bg-amber-50 border border-amber-200 p-3 flex items-center gap-3">
                <AlertTriangle className="text-amber-600" size={20}/>
                <div className="text-sm font-bold">“GM explains every decision — check Activity Log.”</div>
              </div>
            </div>

            <div className="mt-6 grid md:grid-cols-3 gap-4">
              <Range label="Risk Tolerance" value={aiSettings.riskTolerance} options={['conservative','balanced','aggressive']} onChange={v=> updateAiSettings({riskTolerance: v})} />
              <Number label="Max Daily Transactions" value={aiSettings.maxDailyTransactions} min={1} max={10} onChange={v=> updateAiSettings({maxDailyTransactions: v})} />
              <Number label="Min Champ Δ Required (%)" value={aiSettings.minChampProbImprovement} min={0.1} max={3} step={0.1} onChange={v=> updateAiSettings({minChampProbImprovement: v})} />
              <Number label="Auto-Send Min Confidence (%)" value={aiSettings.minConfidenceAuto} min={60} max={95} onChange={v=> updateAiSettings({minConfidenceAuto: v})} />
              <Number label="Sportsbook Weight (%)" value={aiSettings.sportsbookWeight} min={0} max={100} onChange={v=> updateAiSettings({sportsbookWeight: v})} />
              <Number label="Max FAAB / Claim" value={aiSettings.faabLimitPerClaim} min={1} max={50} onChange={v=> updateAiSettings({faabLimitPerClaim: v})} />
            </div>

            <div className="mt-4 rounded-2xl bg-ink-900 text-white p-4 flex flex-wrap items-center justify-between gap-3">
              <div className="text-sm font-bold">Current optimization: <span className="text-emerald-300">Maximize championship probability (14.2% → 18.5% target)</span> — not PPG.</div>
              <span className="text-xs font-black tracking-widest bg-white text-ink-900 px-2.5 py-1 rounded-full">10,000 SIMS / CYCLE</span>
            </div>
          </div>

          {/* why now */}
          <div className="bg-white rounded-[20px] border border-ink-200 p-5">
            <h3 className="font-black">How the GM Reasons — Sportsbook as Primary Signal</h3>
            <p className="text-sm font-medium text-ink-600 mt-2 leading-relaxed">
              FanDuel props are <b>real-money markets</b> — sharper than Sleeper/ESPN projections. GM converts each prop (pass yds, rec yds, attempts, TD odds) into fantasy points, then blends with injuries, depth charts, routes, snap shares, targets, touches, and matchup history. Example: Josh Allen rush yds 38.5 over -115 → +3.8 rush pts; Tyreek Hill 78.5 rec yds juiced over → Sleeper under by 2.7 pts.
            </p>
            <div className="grid md:grid-cols-3 gap-3 mt-4">
              {[
                {k:'FanDuel / Sportsbook', v:`${aiSettings.sportsbookWeight}% weight`, d:'Yards, receptions, TD odds'},
                {k:'Sleeper Projection', v:`${100-aiSettings.sportsbookWeight}% weight`, d:'Platform baseline'},
                {k:'Usage & Injuries', v:'Overlay', d:'Routes, snap%, depth, news'},
              ].map(x=> (
                <div key={x.k} className="rounded-2xl border border-ink-200 bg-ink-50 p-3">
                  <div className="text-[11px] font-black tracking-widest text-ink-500">{x.k.toUpperCase()}</div>
                  <div className="font-black mt-1">{x.v}</div>
                  <div className="text-xs font-medium text-ink-600">{x.d}</div>
                </div>
              ))}
            </div>
          </div>

          {/* recent decisions */}
          <div className="bg-white rounded-[20px] border border-ink-200 p-5">
            <h3 className="font-black">Recent Autonomous Decisions</h3>
            <div className="mt-3 space-y-2">
              {activity.slice(0,5).map(a=> (
                <div key={a.id} className="flex gap-3 p-3 rounded-2xl border border-ink-200 bg-ink-50/50">
                  <div className={`w-9 h-9 rounded-xl grid place-items-center shrink-0 ${a.type==='trade'?'bg-violet-600 text-white': a.type==='waiver'?'bg-emerald-600 text-white': a.type==='lineup'?'bg-blue-600 text-white':'bg-ink-900 text-white'}`}>
                    {a.type==='trade'?'⇄': a.type==='waiver'?'⦿': a.type==='lineup'?'◈':'◎'}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-bold text-sm leading-tight">{a.title}</div>
                    <div className="text-xs font-medium text-ink-600 mt-1">{a.desc}</div>
                    <div className="text-xs font-semibold text-ink-500 mt-1 flex items-center gap-2"><Clock size={12}/>{new Date(a.ts).toLocaleTimeString()} • <span className="px-1.5 py-0.5 rounded-full bg-white border border-ink-200 font-black text-[11px]">{a.delta}</span></div>
                  </div>
                  <span className={`h-fit px-2 py-1 rounded-full text-[11px] font-black ${a.status==='done'?'bg-emerald-100 text-emerald-700 border border-emerald-200': a.status==='blocked'?'bg-red-100 text-red-700 border border-red-200':'bg-amber-100 text-amber-700 border border-amber-200'}`}>{a.status.toUpperCase()}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="col-span-12 xl:col-span-4 space-y-4">
          <div className="bg-ink-900 text-white rounded-[20px] p-5">
            <div className="text-[11px] font-black tracking-widest text-white/60">CHAMPIONSHIP PROBABILITY ENGINE</div>
            <div className="text-3xl font-black mt-1">{sim.champ}% → 18.5%<span className="text-sm font-bold text-emerald-300"> +4.3% if you accept 2 trades</span></div>
            <div className="mt-3 h-2 bg-white/10 rounded-full overflow-hidden"><div className="h-full bg-emerald-500" style={{width:`${sim.champ*4}%`}} /></div>
            <div className="mt-3 grid grid-cols-2 gap-2 text-xs font-bold">
              <div className="rounded-xl bg-white text-ink-900 p-3"><div className="text-[10px] tracking-widest text-ink-500">PLAYOFFS</div><div className="text-lg font-black">{sim.playoff}%</div></div>
              <div className="rounded-xl bg-white text-ink-900 p-3"><div className="text-[10px] tracking-widest text-ink-500">EXPECTED WINS</div><div className="text-lg font-black">{sim.expectedWins}</div></div>
            </div>
            <div className="mt-3 rounded-xl bg-white/10 border border-white/10 p-3 text-xs font-medium">
              Sim: 10k seasons with sportsbook variance + injury risk + schedule. Updates every decision.
            </div>
          </div>

          <div className="bg-white rounded-[20px] border border-ink-200 p-5">
            <h3 className="font-black">Risk Guardrails</h3>
            <div className="mt-3 space-y-3 text-sm font-medium">
              <div className="flex justify-between"><span>Daily cap</span><b>{aiSettings.maxDailyTransactions} tx/day</b></div>
              <div className="flex justify-between"><span>Uses today</span><b>{activity.filter(a=> a.ts> Date.now()-24*3600*1000 && a.status==='done').length} / {aiSettings.maxDailyTransactions}</b></div>
              <div className="h-2 bg-ink-100 rounded-full overflow-hidden"><div className="h-full bg-ink-900" style={{width:`${(activity.filter(a=> a.ts> Date.now()-24*3600*1000).length / aiSettings.maxDailyTransactions)*100}%`}} /></div>
              <div className="rounded-xl bg-emerald-50 border border-emerald-200 p-3 text-xs font-bold">🛡️ GM will never send a trade worse than +{aiSettings.minChampProbImprovement}% championship without approval.</div>
            </div>
          </div>

          <div className="bg-white rounded-[20px] border border-ink-200 p-5">
            <h3 className="font-black">Live Market Pulse</h3>
            <div className="mt-3 space-y-2 text-sm">
              {[
                {k:'FanDuel props tracked', v:'147 players'},
                {k:'Avg book vs Sleeper gap', v:'1.4 pts'},
                {k:'Biggest edge', v:'J. Brooks +3.2'},
                {k:'Last line move', v:'CMC 68.5 → 64.5 (12m ago)'},
              ].map(r=> (
                <div key={r.k} className="flex justify-between py-2 border-b border-ink-100 last:border-0"><span className="font-medium text-ink-600">{r.k}</span><span className="font-black">{r.v}</span></div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

function Toggle({label, desc, checked, onChange}){
  return (
    <div className="flex items-start justify-between gap-3 rounded-2xl border border-ink-200 p-3 bg-ink-50/50">
      <div>
        <div className="font-bold text-sm">{label}</div>
        <div className="text-xs font-medium text-ink-500 mt-1 leading-snug">{desc}</div>
      </div>
      <button onClick={()=> onChange(!checked)} className={`shrink-0 w-12 h-7 rounded-full p-1 transition flex items-center ${checked?'bg-ink-900 justify-end':'bg-ink-200 justify-start'}`}>
        <span className="w-5 h-5 bg-white rounded-full shadow" />
      </button>
    </div>
  )
}
function Range({label, value, options, onChange}){
  return (
    <div className="rounded-2xl border border-ink-200 p-3 bg-white">
      <div className="text-[11px] font-black tracking-widest text-ink-500">{label.toUpperCase()}</div>
      <div className="mt-2 flex gap-1">
        {options.map(o=> (
          <button key={o} onClick={()=> onChange(o)} className={`flex-1 py-2 rounded-full text-xs font-black capitalize ${value===o?'bg-ink-900 text-white':'bg-ink-100 text-ink-600'}`}>{o}</button>
        ))}
      </div>
    </div>
  )
}
function Number({label, value, min, max, step=1, onChange}){
  return (
    <div className="rounded-2xl border border-ink-200 p-3 bg-white">
      <div className="text-[11px] font-black tracking-widest text-ink-500">{label.toUpperCase()}</div>
      <div className="flex items-center gap-2 mt-2">
        <button onClick={()=> onChange(Math.max(min, parseFloat((value-step).toFixed(1))))} className="w-8 h-8 grid place-items-center rounded-full bg-ink-900 text-white font-black">−</button>
        <div className="flex-1 text-center font-black">{value}{label.includes('%')?'%':''}</div>
        <button onClick={()=> onChange(Math.min(max, parseFloat((value+step).toFixed(1))))} className="w-8 h-8 grid place-items-center rounded-full bg-ink-900 text-white font-black">+</button>
      </div>
    </div>
  )
}
