"use client";

import { useState } from "react";
import { AlertTriangle, Loader2, Newspaper, Radio, Sparkles } from "lucide-react";
import { api, useApp, usePolling } from "@/components/data-provider";
import { PlayerDetailModal } from "@/components/player";
import { Badge, EmptyState, Panel, SectionHeader, Skeleton, Stat, Tabs, cn, fmt, signed, timeAgo, useToast } from "@/components/ui";

const CATEGORIES = [
  { id: "all", label: "All" },
  { id: "injury", label: "Injuries" },
  { id: "usage", label: "Usage" },
  { id: "depth_chart", label: "Depth chart" },
  { id: "market", label: "Market" },
  { id: "practice", label: "Practice" },
];

const SEVERITY_TONE: Record<string, string> = {
  critical: "red",
  major: "amber",
  moderate: "blue",
  info: "slate",
};

export default function NewsPage() {
  const { data, refresh } = useApp();
  const { push } = useToast();
  const league = data?.snapshot?.league;
  const [category, setCategory] = useState("all");
  const [detailId, setDetailId] = useState<string | null>(null);
  const [injecting, setInjecting] = useState(false);

  const { data: newsData, loading, reload } = usePolling<{ news: any[] }>(
    league ? `/api/news?leagueId=${league.id}&category=${category}` : null,
    8000,
    [category, league?.id]
  );

  const news = newsData?.news ?? [];

  const inject = async () => {
    if (!league) return;
    setInjecting(true);
    try {
      const res = await api<{ news: any }>("/api/news/simulate", { method: "POST", body: { leagueId: league.id } });
      push({ tone: "info", title: "Breaking news", body: res.news?.headline ?? "Wire updated" });
      await Promise.all([reload(true), refresh(true)]);
    } catch (err: any) {
      push({ tone: "error", title: "Could not fetch news", body: err.message });
    } finally {
      setInjecting(false);
    }
  };

  if (!league) return <Skeleton className="h-96" />;

  const critical = news.filter((n) => n.severity === "critical" || n.severity === "major").length;

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold tracking-tight text-white">
            <Newspaper size={22} className="text-turf-300" /> News & Player Monitor
          </h1>
          <p className="mt-1 text-[13px] text-slate-400">
            Injury reports, usage changes, depth-chart moves and line movement — each with the GM's read and the action taken.
          </p>
        </div>
        <button onClick={inject} disabled={injecting} className="btn-ghost text-[13px]">
          {injecting ? <Loader2 size={14} className="animate-spin" /> : <Sparkles size={14} />} Pull latest wire
        </button>
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label="Items tracked" value={news.length} sub="last 60 events" icon={Radio} />
        <Stat label="Major / critical" value={critical} sub="required action" icon={AlertTriangle} />
        <Stat
          label="Avg projection impact"
          value={fmt(news.reduce((s, n) => s + Math.abs(n.projection_delta), 0) / Math.max(1, news.length), 2)}
          sub="points per event"
          icon={Newspaper}
        />
        <Stat label="Monitoring" value={data?.snapshot?.settings?.news_monitoring ? "On" : "Off"} sub="continuous" icon={Radio} />
      </div>

      <Panel>
        <SectionHeader
          icon={Newspaper}
          title="Live wire"
          subtitle="Every item is scored for value and projection impact"
          right={<Tabs tabs={CATEGORIES} active={category} onChange={setCategory} />}
        />
        {loading && !news.length ? (
          <div className="space-y-2 p-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-24" />
            ))}
          </div>
        ) : news.length ? (
          <div className="divide-row">
            {news.map((n) => (
              <div key={n.id} className="px-4 py-3.5">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge tone={SEVERITY_TONE[n.severity] ?? "slate"}>{n.severity}</Badge>
                      <span className="text-[13.5px] font-semibold text-white">{n.headline}</span>
                    </div>
                    <p className="mt-1 text-[12px] leading-relaxed text-slate-400">{n.body}</p>
                  </div>
                  <span className="num shrink-0 text-[10.5px] text-slate-500">{timeAgo(n.published_at)}</span>
                </div>

                <div className="num mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px]">
                  <span className="text-slate-500">{n.source}</span>
                  {n.player_name ? (
                    <button onClick={() => setDetailId(n.player_id)} className="font-semibold text-sky-300 hover:text-sky-200">
                      {n.player_name} ({n.position} · {n.nfl_team})
                    </button>
                  ) : null}
                  <span className={cn(n.value_delta >= 0 ? "text-turf-300" : "text-red-300")}>
                    value {signed(n.value_delta, 1)}
                  </span>
                  <span className={cn(n.projection_delta >= 0 ? "text-turf-300" : "text-red-300")}>
                    projection {signed(n.projection_delta, 1)} pts
                  </span>
                </div>

                {n.ai_take ? (
                  <p className="mt-2 rounded-lg border border-turf-500/20 bg-turf-500/[0.06] px-3 py-2 text-[12px] leading-relaxed text-turf-100">
                    <span className="font-semibold text-turf-300">AI GM read: </span>
                    {n.ai_take}
                  </p>
                ) : null}
              </div>
            ))}
          </div>
        ) : (
          <EmptyState
            icon={Newspaper}
            title="No news in this category"
            body="The monitor runs on every AI cycle — pull the wire to force a refresh."
            action={
              <button onClick={inject} className="btn-primary text-[13px]">
                <Sparkles size={14} /> Pull latest wire
              </button>
            }
          />
        )}
      </Panel>

      <PlayerDetailModal playerId={detailId} leagueId={league.id} onClose={() => setDetailId(null)} onChanged={() => refresh(true)} />
    </div>
  );
}
