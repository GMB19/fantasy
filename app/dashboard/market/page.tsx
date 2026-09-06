"use client";

import { useState } from "react";
import { ArrowDownRight, ArrowUpRight, Filter, LineChart, Loader2, Plus, Search, TrendingDown, TrendingUp } from "lucide-react";
import { api, useApp, usePolling } from "@/components/data-provider";
import { PlayerDetailModal, PlayerRow } from "@/components/player";
import { DiscrepancyChart } from "@/components/charts";
import {
  EmptyState,
  Modal,
  Panel,
  SectionHeader,
  Skeleton,
  Stat,
  cn,
  fmt,
  signed,
  useToast,
  PositionBadge,
} from "@/components/ui";

const POSITIONS = ["ALL", "QB", "RB", "WR", "TE", "K", "DEF"];
const AVAILABILITY = [
  { id: "all", label: "All players" },
  { id: "mine", label: "My roster" },
  { id: "free_agent", label: "Free agents" },
  { id: "rostered", label: "Rostered" },
  { id: "buy_low", label: "Buy low" },
  { id: "sell_high", label: "Sell high" },
];
const SORTS = [
  { id: "value", label: "Trade value" },
  { id: "projection", label: "Projection" },
  { id: "book", label: "Book projection" },
  { id: "discrepancy", label: "Book vs Sleeper" },
  { id: "trend", label: "Value trend" },
];

export default function PlayerMarketPage() {
  const { data, refresh } = useApp();
  const league = data?.snapshot?.league;
  const [position, setPosition] = useState("ALL");
  const [availability, setAvailability] = useState("all");
  const [sort, setSort] = useState("value");
  const [search, setSearch] = useState("");
  const [detailId, setDetailId] = useState<string | null>(null);
  const [addOpen, setAddOpen] = useState(false);

  const qs = league
    ? `/api/market?leagueId=${league.id}&position=${position}&availability=${availability}&sort=${sort}&search=${encodeURIComponent(search)}`
    : null;
  const { data: market, loading, reload } = usePolling<any>(qs, 12000, [position, availability, sort, search, league?.id]);

  if (!league) return <Skeleton className="h-96" />;

  const players = market?.players ?? [];
  const discrepancyData = (market?.discrepancies ?? []).slice(0, 10).map((p: any) => ({
    name: p.name.split(" ").slice(-1)[0],
    discrepancy: p.discrepancy,
  }));

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold tracking-tight text-white">
            <LineChart size={22} className="text-turf-300" /> Player Market
          </h1>
          <p className="mt-1 text-[13px] text-slate-400">
            Live trade values, sportsbook-vs-platform projection gaps, and buy-low / sell-high signals across the league.
          </p>
        </div>
        <button onClick={() => setAddOpen(true)} className="btn-ghost text-[13px]">
          <Plus size={14} /> Add custom player
        </button>
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label="Buy-low targets" value={market?.buyLow?.length ?? 0} sub="market lagging the books" icon={ArrowDownRight} />
        <Stat label="Sell-high assets" value={market?.sellHigh?.length ?? 0} sub="output outrunning the props" icon={ArrowUpRight} />
        <Stat label="Risers" value={market?.risers?.length ?? 0} sub="value up this cycle" icon={TrendingUp} />
        <Stat label="Fallers" value={market?.fallers?.length ?? 0} sub="value down this cycle" icon={TrendingDown} />
      </div>

      <div className="grid gap-4 xl:grid-cols-3">
        <Panel className="xl:col-span-2">
          <SectionHeader
            icon={LineChart}
            title="Biggest sportsbook vs Sleeper gaps"
            subtitle="Positive = the book projects more fantasy points than the platform"
          />
          <div className="p-3">
            {discrepancyData.length ? <DiscrepancyChart data={discrepancyData} height={300} /> : <Skeleton className="h-64" />}
          </div>
        </Panel>

        <div className="space-y-4">
          <SignalPanel title="Buy low" tone="green" players={market?.buyLow ?? []} onSelect={setDetailId} />
          <SignalPanel title="Sell high" tone="amber" players={market?.sellHigh ?? []} onSelect={setDetailId} />
        </div>
      </div>

      <Panel>
        <SectionHeader
          icon={Filter}
          title="Market board"
          subtitle={`${players.length} players`}
          right={
            <div className="flex flex-wrap items-center gap-2">
              <div className="relative">
                <Search size={13} className="absolute left-2.5 top-2.5 text-slate-500" />
                <input
                  className="input !w-40 !py-1.5 !pl-8 text-xs"
                  placeholder="Search"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
              <select className="input !w-auto !py-1.5 text-xs" value={position} onChange={(e) => setPosition(e.target.value)}>
                {POSITIONS.map((p) => (
                  <option key={p} value={p} className="bg-ink-900">
                    {p}
                  </option>
                ))}
              </select>
              <select className="input !w-auto !py-1.5 text-xs" value={availability} onChange={(e) => setAvailability(e.target.value)}>
                {AVAILABILITY.map((a) => (
                  <option key={a.id} value={a.id} className="bg-ink-900">
                    {a.label}
                  </option>
                ))}
              </select>
              <select className="input !w-auto !py-1.5 text-xs" value={sort} onChange={(e) => setSort(e.target.value)}>
                {SORTS.map((s) => (
                  <option key={s.id} value={s.id} className="bg-ink-900">
                    {s.label}
                  </option>
                ))}
              </select>
            </div>
          }
        />
        <div className="scroll-thin max-h-[720px] overflow-y-auto divide-row">
          {loading && !players.length ? (
            <div className="space-y-2 p-4">
              {Array.from({ length: 10 }).map((_, i) => (
                <Skeleton key={i} className="h-12" />
              ))}
            </div>
          ) : players.length ? (
            players.map((p: any) => <PlayerRow key={p.id} player={p} onClick={() => setDetailId(p.id)} />)
          ) : (
            <EmptyState icon={Search} title="No players match these filters" body="Try clearing the search or switching availability." />
          )}
        </div>
      </Panel>

      <CustomPlayerModal open={addOpen} onClose={() => setAddOpen(false)} leagueId={league.id} onCreated={() => Promise.all([reload(true), refresh(true)])} />
      <PlayerDetailModal playerId={detailId} leagueId={league.id} onClose={() => setDetailId(null)} onChanged={() => Promise.all([reload(true), refresh(true)])} />
    </div>
  );
}

function SignalPanel({
  title,
  tone,
  players,
  onSelect,
}: {
  title: string;
  tone: string;
  players: any[];
  onSelect: (id: string) => void;
}) {
  return (
    <Panel>
      <SectionHeader title={title} subtitle={tone === "green" ? "Acquire before the market corrects" : "Move while value is peaking"} />
      <div className="divide-row">
        {players.length ? (
          players.slice(0, 6).map((p) => (
            <button key={p.id} onClick={() => onSelect(p.id)} className="flex w-full items-center gap-2.5 px-4 py-2.5 text-left hover:bg-white/[0.04]">
              <PositionBadge position={p.position} />
              <span className="min-w-0 flex-1">
                <span className="block truncate text-[12.5px] font-semibold text-slate-100">{p.name}</span>
                <span className="num block text-[11px] text-slate-500">
                  {p.nfl_team} · value {fmt(p.value, 0)} · {p.is_free_agent ? "FA" : p.team_name}
                </span>
              </span>
              <span className={cn("num text-[12px] font-bold", p.discrepancy >= 0 ? "text-turf-300" : "text-red-300")}>
                {signed(p.discrepancy, 1)}
              </span>
            </button>
          ))
        ) : (
          <EmptyState title={`No ${title.toLowerCase()} signals`} body="Signals appear as the market diverges from the books." />
        )}
      </div>
    </Panel>
  );
}

function CustomPlayerModal({
  open,
  onClose,
  leagueId,
  onCreated,
}: {
  open: boolean;
  onClose: () => void;
  leagueId: string;
  onCreated: () => void;
}) {
  const { push } = useToast();
  const [form, setForm] = useState<any>({ name: "", position: "WR", nfl_team: "SF", season_ppg: 8, snap_pct: 45, targets_pg: 4 });
  const [saving, setSaving] = useState(false);

  const submit = async () => {
    setSaving(true);
    try {
      await api("/api/players", { method: "POST", body: { ...form, leagueId } });
      push({ tone: "success", title: "Player added", body: `${form.name} is now in the player pool.` });
      onCreated();
      onClose();
    } catch (err: any) {
      push({ tone: "error", title: "Could not add player", body: err.message });
    } finally {
      setSaving(false);
    }
  };

  const TEAMS = ["ARI","ATL","BAL","BUF","CAR","CHI","CIN","CLE","DAL","DEN","DET","GB","HOU","IND","JAX","KC","LAC","LAR","LV","MIA","MIN","NE","NO","NYG","NYJ","PHI","PIT","SEA","SF","TB","TEN","WAS"];

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Add a custom player"
      subtitle="Useful for practice-squad callups or players the feed hasn't picked up yet."
      footer={
        <>
          <button onClick={onClose} className="btn-ghost text-xs">
            Cancel
          </button>
          <button onClick={submit} disabled={saving || !form.name} className="btn-primary text-xs">
            {saving ? <Loader2 size={13} className="animate-spin" /> : <Plus size={13} />} Add player
          </button>
        </>
      }
    >
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <label className="label">Name</label>
          <input className="input" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Jalen Rivers" />
        </div>
        <div>
          <label className="label">Position</label>
          <select className="input" value={form.position} onChange={(e) => setForm({ ...form, position: e.target.value })}>
            {["QB", "RB", "WR", "TE", "K", "DEF"].map((p) => (
              <option key={p} value={p} className="bg-ink-900">
                {p}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="label">NFL team</label>
          <select className="input" value={form.nfl_team} onChange={(e) => setForm({ ...form, nfl_team: e.target.value })}>
            {TEAMS.map((t) => (
              <option key={t} value={t} className="bg-ink-900">
                {t}
              </option>
            ))}
          </select>
        </div>
        {[
          ["season_ppg", "Season PPG"],
          ["snap_pct", "Snap %"],
          ["targets_pg", "Targets/gm"],
          ["touches_pg", "Touches/gm"],
          ["adp", "ADP"],
          ["depth_chart_order", "Depth chart slot"],
        ].map(([key, label]) => (
          <div key={key}>
            <label className="label">{label}</label>
            <input
              type="number"
              step="0.1"
              className="input"
              value={form[key] ?? ""}
              onChange={(e) => setForm({ ...form, [key]: Number(e.target.value) })}
            />
          </div>
        ))}
      </div>
    </Modal>
  );
}
