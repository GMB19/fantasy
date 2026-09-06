"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  Activity,
  ArrowRight,
  BrainCircuit,
  CalendarClock,
  Flame,
  Gauge,
  LineChart as LineChartIcon,
  Shield,
  Swords,
  TrendingUp,
  Trophy,
  Users,
} from "lucide-react";
import { useApp } from "@/components/data-provider";
import { ChampProbChart, PositionalRadarChart } from "@/components/charts";
import { DecisionCard } from "@/components/decision";
import { PlayerDetailModal, PlayerRow } from "@/components/player";
import {
  Badge,
  EmptyState,
  Panel,
  Progress,
  SectionHeader,
  Skeleton,
  SkeletonRows,
  Stat,
  cn,
  fmt,
  pct,
  signed,
  timeAgo,
} from "@/components/ui";

export default function TeamOverviewPage() {
  const { data, loading, refresh } = useApp();
  const [detailId, setDetailId] = useState<string | null>(null);
  const s = data?.snapshot;

  const simSeries = useMemo(() => {
    const rows = s?.simHistory ?? [];
    return rows.map((r: any) => ({
      label: new Date(r.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      champ: r.champ_prob,
      playoff: r.playoff_prob,
    }));
  }, [s?.simHistory]);

  const radarData = useMemo(() => {
    if (!s?.roster?.length) return [];
    const positions = ["QB", "RB", "WR", "TE"];
    const byPos: Record<string, number[]> = {};
    for (const p of s.roster) {
      byPos[p.position] = byPos[p.position] ?? [];
      byPos[p.position].push(p.model_pts ?? 0);
    }
    return positions.map((pos) => {
      const list = (byPos[pos] ?? []).sort((a, b) => b - a);
      const take = pos === "RB" ? 3 : pos === "WR" ? 4 : 1;
      const team = list.slice(0, take).reduce((a, b) => a + b, 0);
      const leagueAvg = { QB: 18, RB: 26, WR: 34, TE: 10 }[pos] ?? 15;
      return { position: pos, team: Number(team.toFixed(1)), league: leagueAvg };
    });
  }, [s?.roster]);

  if (loading && !s) return <OverviewSkeleton />;
  if (!s)
    return (
      <Panel>
        <EmptyState
          icon={Users}
          title="No league connected"
          body="Connect a Sleeper account or generate a demo league to activate your autonomous GM."
          action={
            <Link href="/connect" className="btn-primary">
              Connect a league
            </Link>
          }
        />
      </Panel>
    );

  const { league, myTeam, teams, lineup, totals, settings } = s;
  const rank = teams.findIndex((t: any) => t.id === myTeam?.id) + 1;
  const starters = lineup?.slots ?? [];
  const record = `${myTeam?.wins}-${myTeam?.losses}${myTeam?.ties ? `-${myTeam.ties}` : ""}`;
  const champDelta = simSeries.length > 1 ? simSeries[simSeries.length - 1].champ - simSeries[0].champ : 0;

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight text-white">{myTeam?.name}</h1>
            <Badge tone="green">{record}</Badge>
            <Badge tone="slate">
              #{rank} of {teams.length}
            </Badge>
            {settings?.autonomous_mode ? <Badge tone="green">Autonomy on</Badge> : <Badge tone="amber">Manual mode</Badge>}
          </div>
          <p className="mt-1 text-[13px] text-slate-400">
            {league.name} · Week {league.current_week} · {league.scoring_type?.toUpperCase()} ·{" "}
            {settings?.last_run_at ? `AI last acted ${timeAgo(settings.last_run_at)}` : "awaiting first cycle"}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link href="/dashboard/lineup" className="btn-ghost text-[13px]">
            <Gauge size={14} /> Lineup
          </Link>
          <Link href="/dashboard/trades" className="btn-primary text-[13px]">
            <Swords size={14} /> Trade finder
          </Link>
        </div>
      </div>

      {/* KPI grid */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-6">
        <Stat
          label="Projected PPG"
          value={fmt(totals.projectedPpg)}
          sub="optimal starters"
          icon={TrendingUp}
        />
        <Stat
          label="Book-implied PPG"
          value={fmt(totals.bookPpg)}
          sub="FanDuel props"
          delta={Number((totals.bookPpg - totals.sleeperPpg).toFixed(2))}
          icon={LineChartIcon}
        />
        <Stat label="Sleeper PPG" value={fmt(totals.sleeperPpg)} sub="platform projection" icon={Shield} />
        <Stat label="Playoff odds" value={pct(myTeam?.playoff_prob)} sub={`${league.playoff_teams} spots`} icon={CalendarClock} />
        <Stat
          label="Championship"
          value={pct(myTeam?.champ_prob)}
          delta={Number(champDelta.toFixed(2))}
          sub="Monte Carlo"
          icon={Trophy}
        />
        <Stat label="Roster strength" value={fmt(myTeam?.power_score)} sub="starters ROS PPG" icon={Flame} />
      </div>

      <div className="grid gap-4 xl:grid-cols-3">
        {/* Championship probability */}
        <Panel className="xl:col-span-2">
          <SectionHeader
            icon={Trophy}
            title="Championship probability"
            subtitle="Recomputed every AI cycle from a full season + playoff simulation"
            right={
              <div className="flex items-center gap-3 text-[11px] text-slate-400">
                <span className="flex items-center gap-1.5">
                  <span className="h-2 w-2 rounded-full bg-turf-400" /> Title
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="h-2 w-2 rounded-full bg-sky-400" /> Playoffs
                </span>
              </div>
            }
          />
          <div className="p-4">
            {simSeries.length > 1 ? (
              <ChampProbChart data={simSeries} height={220} />
            ) : (
              <EmptyState
                icon={Trophy}
                title="Simulation history is building"
                body="Run an AI cycle to record championship-probability snapshots over time."
              />
            )}
          </div>
        </Panel>

        {/* This week */}
        <Panel>
          <SectionHeader icon={Swords} title={`Week ${league.current_week} matchup`} subtitle="Projected head-to-head" />
          {s.opponentTeam ? (
            <div className="p-4">
              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[13px] font-semibold text-white">{myTeam?.name}</p>
                  <p className="num text-[11px] text-slate-500">{record}</p>
                  <p className="num mt-2 text-2xl font-bold text-turf-300">{fmt(lineup?.currentTotal)}</p>
                </div>
                <span className="text-[11px] font-semibold uppercase tracking-widest text-slate-600">vs</span>
                <div className="min-w-0 flex-1 text-right">
                  <p className="truncate text-[13px] font-semibold text-white">{s.opponentTeam.name}</p>
                  <p className="num text-[11px] text-slate-500">
                    {s.opponentTeam.wins}-{s.opponentTeam.losses}
                  </p>
                  <p className="num mt-2 text-2xl font-bold text-slate-300">{fmt(s.opponentTeam.power_score)}</p>
                </div>
              </div>
              <div className="mt-4">
                <div className="mb-1.5 flex justify-between text-[11px] text-slate-400">
                  <span>Win probability</span>
                  <span className="num font-semibold text-white">
                    {pct(
                      (100 *
                        (lineup?.currentTotal ?? 0)) /
                        Math.max(1, (lineup?.currentTotal ?? 0) + (s.opponentTeam.power_score ?? 0))
                    )}
                  </span>
                </div>
                <Progress
                  value={
                    (100 * (lineup?.currentTotal ?? 0)) /
                    Math.max(1, (lineup?.currentTotal ?? 0) + (s.opponentTeam.power_score ?? 0))
                  }
                />
              </div>
              <div className="mt-4 space-y-2 rounded-xl border border-white/[0.07] bg-white/[0.02] p-3">
                <p className="text-[10.5px] font-semibold uppercase tracking-wider text-slate-500">Lineup health</p>
                <div className="num flex flex-wrap gap-x-4 gap-y-1 text-[11.5px] text-slate-300">
                  <span>{starters.filter((x: any) => x.player).length} slots filled</span>
                  <span className="text-amber-300">
                    {s.roster.filter((p: any) => p.injury_status).length} injury flags
                  </span>
                  <span className="text-sky-300">{lineup?.gain ? `+${fmt(lineup.gain)} available` : "optimal"}</span>
                </div>
              </div>
            </div>
          ) : (
            <EmptyState icon={Swords} title="No matchup scheduled" body="This week has no fixture for your team." />
          )}
        </Panel>
      </div>

      <div className="grid gap-4 xl:grid-cols-3">
        {/* Starting lineup */}
        <Panel className="xl:col-span-2">
          <SectionHeader
            icon={Gauge}
            title="Projected starting lineup"
            subtitle={`${fmt(lineup?.currentTotal)} projected · optimal ${fmt(lineup?.optimalTotal)}`}
            right={
              <Link href="/dashboard/lineup" className="btn-ghost !py-1.5 text-xs">
                Optimize <ArrowRight size={12} />
              </Link>
            }
          />
          <div className="divide-row">
            {starters.length ? (
              starters.map((slot: any) => (
                <div key={`${slot.slot}-${slot.slotIndex}`} className="flex items-center gap-3 px-4 py-2.5">
                  <span className="w-12 shrink-0 text-[10px] font-bold uppercase tracking-wider text-slate-500">
                    {slot.slotLabel}
                  </span>
                  {slot.player ? (
                    <div className="min-w-0 flex-1">
                      <PlayerRow player={slot.player} compact onClick={() => setDetailId(slot.player.id)} />
                    </div>
                  ) : (
                    <span className="flex-1 text-[12px] text-slate-500">Empty slot</span>
                  )}
                </div>
              ))
            ) : (
              <SkeletonRows rows={5} />
            )}
          </div>
        </Panel>

        {/* Positional strength */}
        <Panel>
          <SectionHeader icon={Shield} title="Positional strength" subtitle="Your starters vs league average" />
          <div className="p-3">
            {radarData.length ? (
              <PositionalRadarChart data={radarData} height={250} />
            ) : (
              <EmptyState title="No roster data" />
            )}
          </div>
        </Panel>
      </div>

      <div className="grid gap-4 xl:grid-cols-3">
        {/* Discrepancies */}
        <Panel>
          <SectionHeader
            icon={LineChartIcon}
            title="Sportsbook vs Sleeper"
            subtitle="Largest projection gaps on your roster"
          />
          <div className="divide-row">
            {s.discrepancies?.length ? (
              s.discrepancies.map((p: any) => (
                <div key={p.id} className="flex items-center justify-between gap-3 px-4 py-2.5">
                  <div className="min-w-0">
                    <p className="truncate text-[13px] font-semibold text-slate-100">{p.name}</p>
                    <p className="num text-[11px] text-slate-500">
                      book {fmt(p.book_pts)} · sleeper {fmt(p.sleeper_pts)}
                    </p>
                  </div>
                  <span
                    className={cn(
                      "num text-[13px] font-bold",
                      p.discrepancy > 0 ? "text-turf-300" : "text-red-300"
                    )}
                  >
                    {signed(p.discrepancy, 1)}
                  </span>
                </div>
              ))
            ) : (
              <EmptyState title="No major gaps" body="Book and platform projections currently agree on your roster." />
            )}
          </div>
        </Panel>

        {/* Recent decisions */}
        <Panel className="xl:col-span-2">
          <SectionHeader
            icon={BrainCircuit}
            title="Latest AI decisions"
            subtitle="Every action, with the reasoning behind it"
            right={
              <Link href="/dashboard/ai-gm" className="btn-ghost !py-1.5 text-xs">
                All decisions <ArrowRight size={12} />
              </Link>
            }
          />
          <div>
            {s.decisions?.length ? (
              s.decisions.slice(0, 5).map((d: any) => <DecisionCard key={d.id} decision={d} />)
            ) : (
              <EmptyState
                icon={BrainCircuit}
                title="No decisions yet"
                body="Run a cycle from the top bar and the GM will start scanning your league."
              />
            )}
          </div>
        </Panel>
      </div>

      {/* Activity strip */}
      <Panel>
        <SectionHeader
          icon={Activity}
          title="League activity"
          right={
            <Link href="/dashboard/activity" className="btn-ghost !py-1.5 text-xs">
              Full log <ArrowRight size={12} />
            </Link>
          }
        />
        <div className="divide-row">
          {(s.activity ?? []).slice(0, 6).map((a: any) => (
            <div key={a.id} className="flex items-start justify-between gap-4 px-4 py-2.5">
              <div className="min-w-0">
                <p className="truncate text-[12.5px] text-slate-200">{a.message}</p>
                {a.detail ? <p className="mt-0.5 truncate text-[11px] text-slate-500">{a.detail}</p> : null}
              </div>
              <span className="num shrink-0 text-[10.5px] text-slate-500">{timeAgo(a.created_at)}</span>
            </div>
          ))}
        </div>
      </Panel>

      <PlayerDetailModal
        playerId={detailId}
        leagueId={league.id}
        onClose={() => setDetailId(null)}
        onChanged={() => refresh(true)}
      />
    </div>
  );
}

function OverviewSkeleton() {
  return (
    <div className="space-y-5">
      <Skeleton className="h-10 w-72" />
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-6">
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="h-[104px]" />
        ))}
      </div>
      <div className="grid gap-4 xl:grid-cols-3">
        <Skeleton className="h-[300px] xl:col-span-2" />
        <Skeleton className="h-[300px]" />
      </div>
      <Skeleton className="h-[260px]" />
    </div>
  );
}
