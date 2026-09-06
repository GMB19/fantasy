import { useStore } from '../lib/store'
import { Trophy, TrendingUp, Users, Calendar, AlertTriangle } from 'lucide-react'
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Tooltip, RadarChart, PolarGrid, PolarAngleAxis, Radar } from 'recharts'

export default function LeagueAnalyzer(){
  const { teams, sim, players } = useStore();
  const power = [...teams].sort((a,b)=> b.rosterStrength - a.rosterStrength);
  const scheduleDifficulty = [
    { team:'Gotham GMs', diff: 24, label:'Easy' },
    { team:'Chosen Ones', diff: 8, label:'Hard' },
    { team:'Sarah\'s Smash', diff: 15, label:'Mid' },
    { team:'Draft Punk', diff: 22, label:'Easy' },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-[28px] font-black tracking-tight">League Analyzer</h1>
          <p className="text-sm font-medium text-ink-500">Power rankings • playoff simulator • matchup edges • trade leverage map.</p>
        </div>
        <span className="px-3 py-2 rounded-full bg-white border border-ink-200 text-xs font-black">SIM: 10,000 seasons • FanDuel-anchored</span>
      </div>

      <div className="grid grid-cols-12 gap-4">
        <div className="col-span-12 lg:col-span-8 space-y-4">
          <div className="bg-white rounded-[20px] border border-ink-200 p-5">
            <h3 className="font-black flex items-center gap-2"><Trophy size={16}/> Power Rankings — Roster Strength + Book PPG</h3>
            <div className="mt-4 space-y-2">
              {power.map((t,idx)=> (
                <div key={t.id} className={`flex items-center gap-3 p-3 rounded-2xl border ${t.owner==='You'?'bg-ink-900 text-white border-ink-900':'bg-white border-ink-200'}`}>
                  <span className={`w-7 h-7 grid place-items-center rounded-full font-black text-sm ${idx===0?'bg-amber-400 text-ink-900': idx===1?'bg-zinc-300 text-ink-900': idx===2?'bg-amber-700 text-white':'bg-ink-100 text-ink-700'}`}>{idx+1}</span>
                  <span className="text-lg">{t.avatar}</span>
                  <div className="flex-1 min-w-0">
                    <div className="font-black text-sm">{t.name} {t.owner==='You' && <span className="ml-1 px-1.5 py-0.5 rounded-full bg-white text-ink-900 text-[10px]">YOU</span>}</div>
                    <div className={`text-xs font-semibold ${t.owner==='You'?'text-white/70':'text-ink-500'}`}>{t.record} • {t.pointsFor.toFixed(1)} PF • {t.playoffProb}% playoffs</div>
                  </div>
                  <div className="text-right">
                    <div className={`text-sm font-black ${t.owner==='You'?'text-white':'text-ink-900'}`}>{t.rosterStrength}/100</div>
                    <div className={`text-xs font-bold ${t.owner==='You'?'text-white/60':'text-ink-500'}`}>{t.champProb}% champ</div>
                  </div>
                  <div className="hidden md:block w-24 h-2 bg-ink-100 rounded-full overflow-hidden"><div className="h-full bg-emerald-500 rounded-full" style={{width:`${t.rosterStrength}%`}} /></div>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-white rounded-[20px] border border-ink-200 p-5">
            <h3 className="font-black">Projected Standings (Sim Median)</h3>
            <div className="mt-3 h-[220px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={power.slice(0,6).map(t=> ({name: t.name.split(' ')[0], wins: t.wins + Math.round(t.playoffProb/30), pf: Math.round(t.pointsFor)}))}>
                  <XAxis dataKey="name" tick={{fontSize:11, fontWeight:700}} axisLine={false} tickLine={false} />
                  <YAxis hide />
                  <Tooltip contentStyle={{borderRadius:12, fontWeight:700}} />
                  <Bar dataKey="wins" fill="#0f172a" radius={[8,8,0,0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
            <div className="text-xs font-semibold text-ink-500">Median wins after 10k sims — your path: 8.7 wins, 71.4% playoffs.</div>
          </div>

          <div className="bg-white rounded-[20px] border border-ink-200 p-5">
            <h3 className="font-black">Roster Construction vs League</h3>
            <div className="mt-3 h-[220px]">
              <ResponsiveContainer width="100%" height="100%">
                <RadarChart data={[
                  {pos:'QB', you:88, avg:72},
                  {pos:'RB', you:84, avg:74},
                  {pos:'WR', you:91, avg:78},
                  {pos:'TE', you:76, avg:70},
                  {pos:'Depth', you:82, avg:69},
                ]}>
                  <PolarGrid stroke="#e2e8f0" />
                  <PolarAngleAxis dataKey="pos" tick={{fontSize:12, fontWeight:800}} />
                  <Radar dataKey="you" stroke="#0f172a" fill="#0f172a" fillOpacity={0.9} />
                  <Radar dataKey="avg" stroke="#94a3b8" fill="#94a3b8" fillOpacity={0.3} />
                  <Tooltip />
                </RadarChart>
              </ResponsiveContainer>
            </div>
            <div className="flex gap-2 text-xs font-bold justify-center"><span className="flex items-center gap-1"><span className="w-3 h-3 bg-ink-900 rounded-full"/> You</span><span className="flex items-center gap-1"><span className="w-3 h-3 bg-ink-300 rounded-full"/> League Avg</span></div>
          </div>
        </div>

        <div className="col-span-12 lg:col-span-4 space-y-4">
          <div className="bg-ink-900 text-white rounded-[20px] p-5">
            <div className="text-[11px] font-black tracking-widest text-white/60">YOUR PLAYOFF PATH</div>
            <div className="text-2xl font-black mt-1">{sim.playoff}% playoffs • {sim.champ}% ring</div>
            <div className="mt-3 space-y-2 text-sm font-medium">
              <div className="flex justify-between bg-white/10 rounded-xl px-3 py-2"><span>Win Week 7 vs Sarah</span><span className="font-black">+18.3% playoffs</span></div>
              <div className="flex justify-between bg-white/10 rounded-xl px-3 py-2"><span>Lose Week 7</span><span className="font-black">-14.1%</span></div>
              <div className="text-xs text-white/60">Next 3 opponents: Sarah (5-1), Draft Punk (4-2), Wire (3-3) — leverage week now.</div>
            </div>
          </div>

          <div className="bg-white rounded-[20px] border border-ink-200 p-5">
            <h3 className="font-black flex items-center gap-2"><Calendar size={16}/> Schedule Difficulty (ROS)</h3>
            <div className="mt-3 space-y-2">
              {scheduleDifficulty.map(s=> (
                <div key={s.team} className="flex items-center gap-3 p-2.5 rounded-2xl border border-ink-200">
                  <div className="flex-1">
                    <div className="font-bold text-sm">{s.team}</div>
                    <div className="h-2 bg-ink-100 rounded-full mt-1 overflow-hidden"><div className={`h-full ${s.diff<12?'bg-red-500': s.diff>20?'bg-emerald-500':'bg-amber-500'}`} style={{width:`${(32-s.diff)/32*100}%`}} /></div>
                  </div>
                  <span className={`px-2.5 py-1 rounded-full text-xs font-black border ${s.label==='Easy'?'bg-emerald-50 border-emerald-200 text-emerald-700': s.label==='Hard'?'bg-red-50 border-red-200 text-red-700':'bg-amber-50 border-amber-200 text-amber-700'}`}>{s.label} • #{s.diff}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-white rounded-[20px] border border-ink-200 p-5">
            <h3 className="font-black">Trade Leverage Map</h3>
            <div className="mt-3 space-y-2 text-sm">
              <div className="rounded-2xl bg-emerald-50 border border-emerald-200 p-3"><div className="font-black text-emerald-800">Buy from: IR List FC (2-4)</div><div className="text-xs font-medium text-ink-600">Desperate for WR depth — will overpay Picks. CMC available.</div></div>
              <div className="rounded-2xl bg-blue-50 border border-blue-200 p-3"><div className="font-black text-blue-800">Sell to: Zero RB Heroes</div><div className="text-xs font-medium text-ink-600">0 RB depth, 4 WRs — wants Garrett Wilson.</div></div>
              <div className="rounded-2xl bg-amber-50 border border-amber-200 p-3"><div className="font-black">Avoid: Chosen Ones (5-1)</div><div className="text-xs font-medium text-ink-600">No incentive to deal — would need overpay.</div></div>
            </div>
          </div>

          <div className="rounded-[20px] bg-amber-50 border border-amber-200 p-4">
            <div className="font-black text-sm flex items-center gap-2"><AlertTriangle size={14}/> GM Insight</div>
            <div className="text-sm font-medium mt-1">Your WR strength (91) is league-best — convert 1 WR into RB1/TE1 for +2.1% champ. Market says Wilson → Barkley + Thomas is the move.</div>
          </div>
        </div>
      </div>
    </div>
  )
}
