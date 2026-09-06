import { useStore } from '../lib/store'
import { TrendingUp, TrendingDown, Zap, Trophy, Target, Users, Calendar, ArrowUpRight, Shield, AlertTriangle, Check } from 'lucide-react'
import { AreaChart, Area, ResponsiveContainer, BarChart, Bar, XAxis, Tooltip } from 'recharts'

export default function TeamOverview(){
  const { myTeam, myPlayers, starterPlayers, benchPlayers, players, sim, league, schedule, aiSettings, notify, setMyStarters, syncSleeper, sleeperSyncing, user } = useStore();
  const ppg = {
    sleeve: (starterPlayers.reduce((s,p)=> s+p.sleeperPPG,0)).toFixed(1),
    book: (starterPlayers.reduce((s,p)=> s+p.sportsbookPPG,0)).toFixed(1),
    consensus: (starterPlayers.reduce((s,p)=> s+p.consensusPPG,0)).toFixed(1),
  }
  const edge = (parseFloat(ppg.book)-parseFloat(ppg.sleeve)).toFixed(1);
  const rosterStrengthByPos = [
    { pos:'QB', val: 88, book: 23.1 },
    { pos:'RB', val: 84, book: 18.2 },
    { pos:'WR', val: 91, book: 19.8 },
    { pos:'TE', val: 76, book: 12.9 },
  ]
  const spark = [{v:128},{v:138},{v:118},{v:121},{v:152},{v:169}].map((d,i)=> ({...d, w:`W${i+1}`}))

  return (
    <div className="space-y-6">
      {/* title */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-[28px] font-black tracking-tight leading-none">Team Overview</h1>
          <p className="text-sm text-ink-500 font-medium mt-1">Welcome back — GM has made <b>8 autonomous decisions</b> today. Championship probability +2.1%.</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="hidden md:flex items-center gap-2 px-3 py-2 rounded-full bg-white border border-ink-200 text-xs font-bold">
            <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" /> SYNCED TO SLEEPER • {league.name} • @{user.sleeperUsername}
          </div>
          <button disabled={sleeperSyncing} onClick={()=> syncSleeper(user.sleeperUsername || 'gotham_gm')} className="px-4 py-2 rounded-full bg-ink-900 text-white text-sm font-bold disabled:opacity-50 flex items-center gap-2">
            {sleeperSyncing ? 'Syncing…' : 'Sync Sleeper'}
          </button>
        </div>
      </div>

      {/* top metrics */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Metric title="SPORTSBOOK-IMPLIED PPG" value={ppg.book} sub={`${edge>0?'+':''}${edge} vs Sleeper`} trend={edge>0?'up':'down'} />
        <Metric title="SLEEPER PPG" value={ppg.sleeve} sub="Sleeper projection" trend="neutral" />
        <Metric title="PLAYOFF PROBABILITY" value={`${sim.playoff}%`} sub={`${sim.expectedWins} expected wins`} trend="up" />
        <Metric title="CHAMPIONSHIP PROB" value={`${sim.champ}%`} sub="14.2% → 16.3% after trades" trend="up" highlight />
      </div>

      <div className="grid grid-cols-12 gap-4">
        {/* left */}
        <div className="col-span-12 xl:col-span-8 space-y-4">
          {/* Record + next matchup */}
          <div className="bg-white rounded-[20px] border border-ink-200 p-4 md:p-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-ink-900 text-white grid place-items-center text-xl">🐺</div>
                <div>
                  <div className="font-black text-[18px] leading-none">{myTeam.name} • {myTeam.record}</div>
                  <div className="text-xs font-semibold text-ink-500">Rank #{myTeam.rank} • {myTeam.pointsFor.toFixed(1)} PF • {rosterStrengthByPos.map(r=> `${r.pos} ${r.val}`).join(' • ')}</div>
                </div>
                <span className="hidden md:inline-flex ml-2 px-2.5 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-black tracking-widest">W2 STREAK</span>
              </div>
              <div className="flex items-center gap-2 text-xs font-bold">
                <span className="px-3 py-1.5 rounded-full bg-ink-900 text-white">Week 7 vs Sarah's Smash</span>
                <span className="px-3 py-1.5 rounded-full bg-amber-100 text-amber-800 border border-amber-200">Projected L 136.2 - 141.5</span>
              </div>
            </div>

            {/* mini chart */}
            <div className="mt-4 h-[84px]">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={spark}>
                  <Area type="monotone" dataKey="v" stroke="#16a34a" strokeWidth={2.5} fill="#22c55e" fillOpacity={0.14} dot={false} />
                  <Tooltip contentStyle={{borderRadius:12, border:'1px solid #e2e8f0', fontSize:12, fontWeight:700}} />
                </AreaChart>
              </ResponsiveContainer>
            </div>

            {/* pos strength bars */}
            <div className="grid grid-cols-4 gap-2 mt-3">
              {rosterStrengthByPos.map(r=> (
                <div key={r.pos} className="rounded-2xl bg-ink-50 border border-ink-200 p-3">
                  <div className="text-[10px] font-black tracking-widest text-ink-500">{r.pos} STRENGTH</div>
                  <div className="text-lg font-black">{r.val}<span className="text-ink-400 font-bold text-sm">/100</span></div>
                  <div className="h-1.5 bg-ink-200 rounded-full mt-1.5 overflow-hidden"><div className="h-full bg-ink-900 rounded-full" style={{width: `${r.val}%`}} /></div>
                  <div className="text-[11px] font-semibold text-ink-500 mt-1">{r.book} book PPG</div>
                </div>
              ))}
            </div>
          </div>

          {/* Roster */}
          <div className="bg-white rounded-[20px] border border-ink-200 overflow-hidden">
            <div className="px-5 py-4 flex items-center justify-between border-b border-ink-100">
              <h3 className="font-black">Roster • {myPlayers.length} players</h3>
              <div className="flex items-center gap-2 text-xs font-bold">
                <span className="px-2.5 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-700">SPORTSBOOK EDGE SORTED</span>
                <span className="hidden md:inline text-ink-400 font-medium">Sleeper vs FanDuel delta</span>
              </div>
            </div>

            {/* starters */}
            <div className="p-3 md:p-4">
              <div className="text-[11px] font-black tracking-widest text-ink-400 mb-2">STARTERS • {ppg.book} book PPG • {ppg.sleeve} sleeper PPG</div>
              <div className="grid md:grid-cols-2 gap-2.5">
                {starterPlayers.map(p=> <PlayerRow key={p.id} p={p} starter />)}
              </div>
              <div className="text-[11px] font-black tracking-widest text-ink-400 mt-4 mb-2">BENCH</div>
              <div className="grid md:grid-cols-2 gap-2.5">
                {benchPlayers.map(p=> <PlayerRow key={p.id} p={p} />)}
              </div>
            </div>
          </div>

          {/* schedule */}
          <div className="bg-white rounded-[20px] border border-ink-200 p-5">
            <h3 className="font-black flex items-center gap-2"><Calendar size={16}/> Schedule & Projections</h3>
            <div className="mt-3 grid grid-cols-12 text-[11px] font-black tracking-widest text-ink-400 px-2">
              <div className="col-span-1">WK</div><div className="col-span-5">OPPONENT</div><div className="col-span-3">RESULT</div><div className="col-span-3 text-right">PROJ</div>
            </div>
            <div className="mt-2 space-y-1">
              {schedule.map(s=> (
                <div key={s.week} className={`grid grid-cols-12 items-center px-2 py-2.5 rounded-xl text-sm font-medium ${s.result? 'bg-ink-50':'bg-amber-50 border border-amber-200'}`}>
                  <div className="col-span-1 font-black">W{s.week}</div>
                  <div className="col-span-5 flex items-center gap-2"><span className="w-6 h-6 rounded-full bg-white border border-ink-200 grid place-items-center text-xs">🏈</span> {s.opponent}</div>
                  <div className="col-span-3"><span className={`px-2 py-1 rounded-full text-xs font-black ${s.result?.startsWith('W')?'bg-emerald-100 text-emerald-700': s.result?.startsWith('L')?'bg-red-100 text-red-700':'bg-ink-900 text-white'}`}>{s.result || 'UPCOMING'}</span></div>
                  <div className="col-span-3 text-right font-bold">{s.proj.toFixed(1)} {s.opponentProj? <span className="text-ink-400">vs {s.opponentProj.toFixed(1)}</span>:null}</div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* right */}
        <div className="col-span-12 xl:col-span-4 space-y-4">
          {/* AI GM summary */}
          <div className="bg-ink-900 text-white rounded-[20px] p-5">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-white text-ink-900 grid place-items-center font-black">AI</div>
              <div className="font-black">AI GM • Autonomous</div>
              <span className="ml-auto text-[10px] font-black tracking-widest bg-emerald-500 px-2 py-1 rounded-full">LIVE 24/7</span>
            </div>
            <div className="mt-4 space-y-3">
              <div className="rounded-2xl bg-white/[0.08] border border-white/10 p-3">
                <div className="text-xs font-bold text-white/70">NEXT AUTONOMOUS ACTION</div>
                <div className="font-bold mt-1">Re-scan waivers & trade market in 12s</div>
                <div className="text-xs text-white/60 mt-1">Will auto-send if edge ≥0.8% champ & confidence ≥85%</div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div className="rounded-2xl bg-white text-ink-900 p-3">
                  <div className="text-[10px] font-black tracking-widest text-ink-500">TRADES SCANNING</div>
                  <div className="text-xl font-black">4 edges</div>
                  <div className="text-xs font-semibold text-emerald-600">2 auto-eligible</div>
                </div>
                <div className="rounded-2xl bg-white text-ink-900 p-3">
                  <div className="text-[10px] font-black tracking-widest text-ink-500">WAIVERS QUEUED</div>
                  <div className="text-xl font-black">3 claims</div>
                  <div className="text-xs font-semibold text-ink-500">$28 FAAB queued</div>
                </div>
              </div>
              <div className="flex gap-2">
                <button onClick={()=> notify('Opening AI GM controls','info')} className="flex-1 py-2.5 rounded-full bg-white text-ink-900 font-bold text-sm">Open AI Controls</button>
                <button onClick={()=> notify('Paused autonomous for 1h','info')} className="px-4 py-2.5 rounded-full bg-white/10 border border-white/15 text-white font-bold text-sm">Pause</button>
              </div>
            </div>
          </div>

          {/* discrepancies */}
          <div className="bg-white rounded-[20px] border border-ink-200 p-5">
            <h3 className="font-black flex items-center gap-2"><Zap size={16} className="text-amber-500"/> Biggest Sportsbook Discrepancies</h3>
            <p className="text-xs font-medium text-ink-500 mt-1">FanDuel props vs Sleeper — where the market disagrees with fantasy.</p>
            <div className="mt-3 space-y-2">
              {[...players].sort((a,b)=> Math.abs(b.sportsbookPPG-b.sleeperPPG) - Math.abs(a.sportsbookPPG-a.sleeperPPG)).slice(0,5).map(p=>{
                const delta = (p.sportsbookPPG - p.sleeperPPG).toFixed(1);
                const up = parseFloat(delta) > 0;
                return (
                  <div key={p.id} className="flex items-center gap-3 p-2.5 rounded-2xl border border-ink-200 bg-ink-50/60">
                    <img src={p.avatar || 'https://a.espncdn.com/combiner/i?img=/i/headshots/nfl/players/full/1.png'} className="w-9 h-9 rounded-full bg-white object-cover border border-ink-200" alt="" />
                    <div className="flex-1 min-w-0">
                      <div className="font-bold text-sm leading-none truncate">{p.name} <span className="text-ink-400 font-semibold">{p.pos} • {p.team}</span></div>
                      <div className="text-xs font-medium text-ink-500">{p.sleeperPPG} Sleeper → {p.sportsbookPPG} book</div>
                    </div>
                    <span className={`px-2.5 py-1 rounded-full text-xs font-black ${up?'bg-emerald-100 text-emerald-700 border border-emerald-200':'bg-red-100 text-red-700 border border-red-200'}`}>{up?'+':''}{delta}</span>
                  </div>
                )
              })}
            </div>
            <button onClick={()=> notify('Market view: 12 players with >+1.5 edge','info')} className="w-full mt-3 py-2.5 rounded-full bg-ink-900 text-white font-bold text-sm">View Player Market</button>
          </div>

          {/* playoff picture */}
          <div className="bg-white rounded-[20px] border border-ink-200 p-5">
            <h3 className="font-black flex items-center gap-2"><Trophy size={16}/> Playoff Picture</h3>
            <div className="mt-3 space-y-2">
              {[
                {label:'Make Playoffs', v:sim.playoff},
                {label:'Win Division', v:42.1},
                {label:'Championship', v:sim.champ},
              ].map(r=> (
                <div key={r.label} className="flex items-center gap-3">
                  <div className="flex-1">
                    <div className="flex justify-between text-xs font-black"><span>{r.label.toUpperCase()}</span><span>{r.v}%</span></div>
                    <div className="h-2 bg-ink-100 rounded-full mt-1 overflow-hidden"><div className="h-full bg-ink-900 rounded-full" style={{width:`${r.v}%`}} /></div>
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-4 rounded-2xl bg-emerald-50 border border-emerald-200 p-3">
              <div className="text-xs font-black tracking-widest text-emerald-700">CHAMPIONSHIP LEVERAGE</div>
              <div className="text-sm font-bold text-ink-900 mt-1">Your +0.8% champ threshold = +1.1 expected FAAB value per move.</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

function Metric({title, value, sub, trend, highlight}){
  return (
    <div className={`rounded-[20px] border p-4 ${highlight?'bg-ink-900 text-white border-ink-900':'bg-white border-ink-200'}`}>
      <div className={`text-[10px] font-black tracking-widest ${highlight?'text-white/60':'text-ink-400'}`}>{title}</div>
      <div className="text-[24px] font-black leading-none mt-1">{value}</div>
      <div className={`text-xs font-semibold mt-1 flex items-center gap-1 ${highlight?'text-emerald-300': trend==='up'?'text-emerald-600':'text-ink-500'}`}>
        {trend==='up' && <TrendingUp size={12}/>} {trend==='down' && <TrendingDown size={12}/>} {sub}
      </div>
    </div>
  )
}
function PlayerRow({p, starter}){
  const delta = (p.sportsbookPPG - p.sleeperPPG);
  const posColor = p.pos==='QB'?'bg-violet-100 text-violet-700 border-violet-200': p.pos==='RB'?'bg-emerald-100 text-emerald-700 border-emerald-200': p.pos==='WR'?'bg-blue-100 text-blue-700 border-blue-200':'bg-amber-100 text-amber-700 border-amber-200';
  return (
    <div className={`flex items-center gap-3 p-3 rounded-2xl border ${starter?'bg-white border-ink-200':'bg-ink-50 border-ink-200/70'}`}>
      <img src={p.avatar || 'https://via.placeholder.com/80'} alt="" className="w-10 h-10 rounded-full bg-white object-cover border border-ink-200" />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5">
          <span className={`text-[10px] font-black tracking-widest px-1.5 py-0.5 rounded border ${posColor}`}>{p.pos}</span>
          <span className="font-bold text-sm truncate">{p.name}</span>
          <span className="text-xs font-semibold text-ink-400">{p.team}</span>
          {p.injury!=='Healthy' && <span className="ml-1 text-[10px] font-black px-1.5 py-0.5 rounded-full bg-amber-100 text-amber-700 border border-amber-200 flex items-center gap-1"><AlertTriangle size={10}/>{p.injury}</span>}
          {starter && <span className="ml-auto hidden md:inline-flex text-[10px] font-black tracking-widest bg-ink-900 text-white px-2 py-1 rounded-full">STARTER</span>}
        </div>
        <div className="flex items-center gap-2 mt-1 text-xs font-medium">
          <span className="px-2 py-1 rounded-full bg-ink-900 text-white font-bold">{p.sportsbookPPG.toFixed(1)} book</span>
          <span className="text-ink-500">{p.sleeperPPG.toFixed(1)} Sleeper</span>
          <span className={`font-black ${delta>0?'text-emerald-600':'text-red-600'}`}>{delta>0?'+':''}{delta.toFixed(1)}</span>
          <span className="hidden md:inline text-ink-400">• {p.snapShare? `${p.snapShare}% snaps`: ''} {p.targetShare? `• ${p.targetShare}% tgt`: ''} {p.touches? `• ${p.touches} touches`: ''}</span>
        </div>
      </div>
    </div>
  )
}
