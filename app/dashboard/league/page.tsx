"use client";

import { useMemo, useState } from "react";
import { BarChart3, Loader2, Swords, Trophy, Users } from "lucide-react";
import { api, useApp, usePolling } from "@/components/data-provider";
import { PowerBarChart, PositionalRadarChart } from "@/components/charts";
import {
  Badge,
  Modal,
  Panel,
  Progress,
  SectionHeader,
  Skeleton,
  Stat,
  cn,
  fmt,
  pct,
  useToast,
} from "@/components/ui";

export default function LeagueAnalyzerPage() {
  const { data, refresh } = useApp();
  const { push } = useToast();
  const league = data?.snapshot?.league;
  const [editTeam, setEditTeam] = useState<any>(null);
  const [advancing, setAdvancing] = useState(false);

  const { data: analysis, loading, reload } = usePolling<any>(
    league ? `/api/league-analysis?leagueId=${league.id}` : null,
    12000,
    [league?.id]
  );

  const rows = analysis?.analysis?.rows ?? [];
  const myRow = rows.find((r: any) => r.team.is_user_team);

  const powerData = useMemo(
    () => rows.map((r: any) => ({ name: r.team.name, value: r.rosterStrength, isUser: !!r.team.is_user_team })),
    [rows]
  );

  const radarData = useMemo(() => {
    if (!myRow) return [];
    const avg = analysis?.analysis?.leagueAvg ?? {};
    return ["QB", "RB", "WR", "TE", "K", "DEF"].map((pos) => ({
      position: pos,
      team: myRow.positional?.[pos] ?? 0,
      league: avg[pos] ?? 0,
    }));
  }, [myRow, analysis]);

  const advanceWeek = async () => {
    if (!league) return;
    setAdvancing(true);
    try {
      const res = await api<{ results: string[]; league: any }>(`/api/leagues/${league.id}/advance`, {
        method: "POST",
        body: {},
      });
      push({
        tone: "success",
        title: `Week ${league.current_week} scored`,
        body: res.results?.[0] ? `${res.results.length} matchups played. Now week ${res.league.current_week}.` : "Season advanced.",
      });
      await Promise.all([reload(true), refresh(true)]);
    } catch (err: any) {
      push({ tone: "error", title: "Could not advance week", body: err.message });
    } finally {
      setAdvancing(false);
    }
  };

  if (!league) return <Skeleton className="h-96" />;

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold tracking-tight text-white">
            <Users size={22} className="text-turf-300" /> League Analyzer
          </h1>
          <p className="mt-1 text-[13px] text-slate-400">
            Roster strength, positional edges, playoff odds and schedule for all {league.total_rosters} teams.
          </p>
        </div>
        <button onClick={advanceWeek} disabled={advancing} className="btn-ghost text-[13px]">
          {advancing ? <Loader2 size={14} className="animate-spin" /> : <Swords size={14} />}
          Simulate week {league.current_week}
        </button>
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat
          label="Your rank"
          value={myRow ? `#${rows.findIndex((r: any) => r.team.is_user_team) + 1}` : "—"}
          sub={`of ${rows.length || league.total_rosters} by roster strength`}
          icon={Trophy}
        />
        <Stat label="Roster strength" value={fmt(myRow?.rosterStrength)} sub="starters ROS PPG" icon={BarChart3} />
        <Stat label="Playoff odds" value={pct(myRow?.team?.playoff_prob)} sub="Monte Carlo" icon={Users} />
        <Stat label="Title odds" value={pct(myRow?.team?.champ_prob)} sub="Monte Carlo" icon={Trophy} />
      </div>

      <div className="grid gap-4 xl:grid-cols-3">
        <Panel className="xl:col-span-2">
          <SectionHeader icon={BarChart3} title="Power rankings" subtitle="Projected starting-lineup strength" />
          <div className="p-3">
            {powerData.length ? <PowerBarChart data={powerData} height={Math.max(260, powerData.length * 27)} /> : <Skeleton className="h-64" />}
          </div>
        </Panel>
        <Panel>
          <SectionHeader icon={Trophy} title="Positional edges" subtitle="Your roster vs league average" />
          <div className="p-3">{radarData.length ? <PositionalRadarChart data={radarData} height={280} /> : <Skeleton className="h-64" />}</div>
        </Panel>
      </div>

      <Panel>
        <SectionHeader icon={Users} title="Standings & roster audit" subtitle="Click a team to edit its details" />
        <div className="scroll-thin overflow-x-auto">
          <table className="w-full min-w-[900px] text-left text-[12.5px]">
            <thead className="text-[10.5px] uppercase tracking-wider text-slate-500">
              <tr className="border-b border-white/[0.07]">
                <th className="px-4 py-2.5 font-semibold">Team</th>
                <th className="px-3 py-2.5 font-semibold">Record</th>
                <th className="px-3 py-2.5 text-right font-semibold">PF</th>
                <th className="px-3 py-2.5 text-right font-semibold">Strength</th>
                <th className="px-3 py-2.5 text-right font-semibold">Bench</th>
                <th className="px-3 py-2.5 text-right font-semibold">Playoff</th>
                <th className="px-3 py-2.5 text-right font-semibold">Title</th>
                <th className="px-3 py-2.5 text-right font-semibold">FAAB</th>
                <th className="px-3 py-2.5 text-right font-semibold">Inj</th>
                <th className="px-3 py-2.5 font-semibold">GM style</th>
              </tr>
            </thead>
            <tbody className="num divide-y divide-white/[0.05]">
              {loading && !rows.length
                ? Array.from({ length: 8 }).map((_, i) => (
                    <tr key={i}>
                      <td colSpan={10} className="px-4 py-2">
                        <Skeleton className="h-6 w-full" />
                      </td>
                    </tr>
                  ))
                : rows.map((r: any) => (
                    <tr
                      key={r.team.id}
                      onClick={() => setEditTeam(r.team)}
                      className={cn("cursor-pointer transition hover:bg-white/[0.03]", r.team.is_user_team && "bg-turf-500/[0.06]")}
                    >
                      <td className="px-4 py-2.5">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-slate-100">{r.team.name}</span>
                          {r.team.is_user_team ? <Badge tone="green">you</Badge> : null}
                        </div>
                        <span className="text-[11px] text-slate-500">{r.team.owner_name}</span>
                      </td>
                      <td className="px-3 py-2.5 text-slate-300">{r.record}</td>
                      <td className="px-3 py-2.5 text-right text-slate-300">{fmt(r.team.points_for, 0)}</td>
                      <td className="px-3 py-2.5 text-right font-semibold text-white">{fmt(r.rosterStrength)}</td>
                      <td className="px-3 py-2.5 text-right text-slate-400">{fmt(r.benchStrength)}</td>
                      <td className="px-3 py-2.5 text-right">
                        <span className="text-sky-300">{pct(r.team.playoff_prob, 0)}</span>
                      </td>
                      <td className="px-3 py-2.5 text-right">
                        <span className="text-turf-300">{pct(r.team.champ_prob, 1)}</span>
                      </td>
                      <td className="px-3 py-2.5 text-right text-slate-300">${r.faabLeft}</td>
                      <td className="px-3 py-2.5 text-right">
                        <span className={r.injuries ? "text-amber-300" : "text-slate-500"}>{r.injuries}</span>
                      </td>
                      <td className="px-3 py-2.5">
                        <Badge tone="slate">{String(r.team.gm_persona).replace("_", " ")}</Badge>
                      </td>
                    </tr>
                  ))}
            </tbody>
          </table>
        </div>
      </Panel>

      <Panel>
        <SectionHeader icon={Swords} title={`Week ${league.current_week} matchups`} subtitle="Projected scores from current rosters" />
        <div className="grid gap-px bg-white/[0.06] sm:grid-cols-2">
          {(analysis?.analysis?.upcoming ?? []).map((m: any) => {
            const homeWin = m.homeProj >= m.awayProj;
            return (
              <div key={m.id} className="bg-ink-950/40 p-4">
                <div className="flex items-center justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <p className={cn("truncate text-[13px] font-semibold", homeWin ? "text-white" : "text-slate-400")}>
                      {m.home?.name}
                    </p>
                    <p className="num text-[11px] text-slate-500">
                      {m.home?.wins}-{m.home?.losses}
                    </p>
                  </div>
                  <div className="num shrink-0 text-center">
                    <p className="text-[15px] font-bold text-white">
                      {fmt(m.homeProj, 1)} <span className="text-slate-600">–</span> {fmt(m.awayProj, 1)}
                    </p>
                    <p className="text-[10px] uppercase tracking-wider text-slate-500">projected</p>
                  </div>
                  <div className="min-w-0 flex-1 text-right">
                    <p className={cn("truncate text-[13px] font-semibold", !homeWin ? "text-white" : "text-slate-400")}>
                      {m.away?.name}
                    </p>
                    <p className="num text-[11px] text-slate-500">
                      {m.away?.wins}-{m.away?.losses}
                    </p>
                  </div>
                </div>
                <div className="mt-3">
                  <Progress value={(100 * m.homeProj) / Math.max(1, m.homeProj + m.awayProj)} />
                </div>
              </div>
            );
          })}
        </div>
      </Panel>

      <TeamEditModal team={editTeam} onClose={() => setEditTeam(null)} onSaved={() => Promise.all([reload(true), refresh(true)])} />
    </div>
  );
}

function TeamEditModal({ team, onClose, onSaved }: { team: any; onClose: () => void; onSaved: () => void }) {
  const { push } = useToast();
  const [form, setForm] = useState<any>({});
  const [saving, setSaving] = useState(false);

  const current = { ...team, ...form };

  const save = async () => {
    setSaving(true);
    try {
      await api(`/api/teams/${team.id}`, {
        method: "PATCH",
        body: {
          name: current.name,
          owner_name: current.owner_name,
          gm_persona: current.gm_persona,
          wins: Number(current.wins),
          losses: Number(current.losses),
          faab_spent: Number(current.faab_spent),
        },
      });
      push({ tone: "success", title: "Team updated" });
      setForm({});
      onSaved();
      onClose();
    } catch (err: any) {
      push({ tone: "error", title: "Update failed", body: err.message });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      open={!!team}
      onClose={onClose}
      title={team ? `Edit ${team.name}` : "Edit team"}
      subtitle="Team identity, record and GM personality (drives trade acceptance behaviour)."
      footer={
        <>
          <button onClick={onClose} className="btn-ghost text-xs">
            Cancel
          </button>
          <button onClick={save} disabled={saving} className="btn-primary text-xs">
            {saving ? <Loader2 size={13} className="animate-spin" /> : null} Save changes
          </button>
        </>
      }
    >
      {team ? (
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <label className="label">Team name</label>
            <input className="input" value={current.name ?? ""} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          </div>
          <div>
            <label className="label">Owner</label>
            <input className="input" value={current.owner_name ?? ""} onChange={(e) => setForm({ ...form, owner_name: e.target.value })} />
          </div>
          <div>
            <label className="label">GM personality</label>
            <select className="input" value={current.gm_persona} onChange={(e) => setForm({ ...form, gm_persona: e.target.value })}>
              {["analytics", "win_now", "rebuilder", "homer", "sharp", "casual", "autonomous"].map((p) => (
                <option key={p} value={p} className="bg-ink-900">
                  {p.replace("_", " ")}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="label">Wins</label>
            <input type="number" className="input" value={current.wins} onChange={(e) => setForm({ ...form, wins: e.target.value })} />
          </div>
          <div>
            <label className="label">Losses</label>
            <input type="number" className="input" value={current.losses} onChange={(e) => setForm({ ...form, losses: e.target.value })} />
          </div>
          <div>
            <label className="label">FAAB spent</label>
            <input type="number" className="input" value={current.faab_spent} onChange={(e) => setForm({ ...form, faab_spent: e.target.value })} />
          </div>
        </div>
      ) : null}
    </Modal>
  );
}
