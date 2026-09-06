"use client";

import { useEffect, useState } from "react";
import {
  Activity,
  BarChart3,
  Loader2,
  Pencil,
  Save,
  TrendingDown,
  TrendingUp,
} from "lucide-react";
import { api } from "./data-provider";
import {
  Badge,
  EmptyState,
  InjuryBadge,
  PositionBadge,
  Progress,
  Skeleton,
  cn,
  fmt,
  signed,
  timeAgo,
  useToast,
} from "./ui";

export interface PlayerLite {
  id: string;
  name: string;
  position: string;
  nfl_team: string;
  injury_status?: string | null;
  opponent?: string | null;
  model_pts?: number;
  book_pts?: number;
  sleeper_pts?: number;
  value?: number;
  trend_7d?: number;
  discrepancy?: number;
  market_signal?: string;
  owner_name?: string | null;
  team_name?: string | null;
  is_free_agent?: boolean;
  slot_status?: string;
  matchup_rating?: number;
  snap_pct?: number;
  targets_pg?: number;
  touches_pg?: number;
  tier?: number;
}

export const SIGNAL_LABEL: Record<string, { label: string; tone: string }> = {
  buy_low: { label: "Buy low", tone: "green" },
  sell_high: { label: "Sell high", tone: "amber" },
  rising: { label: "Rising", tone: "blue" },
  falling: { label: "Falling", tone: "red" },
  hold: { label: "Hold", tone: "slate" },
};

export function PlayerRow({
  player,
  onClick,
  right,
  compact,
  highlight,
}: {
  player: PlayerLite;
  onClick?: () => void;
  right?: React.ReactNode;
  compact?: boolean;
  highlight?: boolean;
}) {
  const signal = SIGNAL_LABEL[player.market_signal ?? "hold"] ?? SIGNAL_LABEL.hold;
  return (
    <div
      className={cn(
        "group flex items-center gap-3 px-4 py-2.5 transition",
        onClick && "cursor-pointer hover:bg-white/[0.04]",
        highlight && "bg-turf-500/[0.06]"
      )}
      onClick={onClick}
    >
      <PositionBadge position={player.position} />
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5">
          <span className="truncate text-[13px] font-semibold text-slate-100">{player.name}</span>
          <InjuryBadge status={player.injury_status} />
        </div>
        <div className="num mt-0.5 flex items-center gap-1.5 text-[11px] text-slate-500">
          <span>{player.nfl_team}</span>
          {player.opponent ? <span>vs {player.opponent}</span> : <span className="text-amber-400/80">BYE</span>}
          {!compact && player.owner_name ? (
            <>
              <span>·</span>
              <span className="truncate">{player.is_free_agent ? "Free agent" : player.team_name}</span>
            </>
          ) : null}
        </div>
      </div>

      {!compact ? (
        <div className="hidden w-[86px] shrink-0 text-right sm:block">
          <div className="num text-[13px] font-semibold text-white">{fmt(player.model_pts)}</div>
          <div className="text-[10px] uppercase tracking-wide text-slate-500">proj</div>
        </div>
      ) : null}

      <div className="hidden w-[92px] shrink-0 text-right md:block">
        <div className="num text-[13px] font-semibold text-turf-300">{fmt(player.book_pts)}</div>
        <div className="text-[10px] uppercase tracking-wide text-slate-500">book</div>
      </div>

      <div className="hidden w-[92px] shrink-0 text-right lg:block">
        <div className="num text-[13px] font-semibold text-sky-300">{fmt(player.sleeper_pts)}</div>
        <div className="text-[10px] uppercase tracking-wide text-slate-500">sleeper</div>
      </div>

      <div className="hidden w-[76px] shrink-0 text-right xl:block">
        <div
          className={cn(
            "num text-[13px] font-semibold",
            (player.discrepancy ?? 0) > 0 ? "text-turf-300" : (player.discrepancy ?? 0) < 0 ? "text-red-300" : "text-slate-400"
          )}
        >
          {signed(player.discrepancy ?? 0, 1)}
        </div>
        <div className="text-[10px] uppercase tracking-wide text-slate-500">edge</div>
      </div>

      <div className="hidden w-[70px] shrink-0 text-right sm:block">
        <div className="num text-[13px] font-semibold text-slate-200">{fmt(player.value, 0)}</div>
        <div className="text-[10px] uppercase tracking-wide text-slate-500">value</div>
      </div>

      <div className="hidden w-[86px] shrink-0 justify-end lg:flex">
        <Badge tone={signal.tone}>{signal.label}</Badge>
      </div>

      {right ? <div className="flex shrink-0 items-center gap-1.5">{right}</div> : null}
    </div>
  );
}

export function PlayerDetailModal({
  playerId,
  leagueId,
  onClose,
  onChanged,
}: {
  playerId: string | null;
  leagueId: string;
  onClose: () => void;
  onChanged?: () => void;
}) {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState<any>({});
  const [saving, setSaving] = useState(false);
  const { push } = useToast();

  useEffect(() => {
    if (!playerId) return;
    setLoading(true);
    setEditing(false);
    api(`/api/players/${playerId}?leagueId=${leagueId}`)
      .then((res) => {
        setData(res);
        setForm({
          injury_status: res.player.injury_status ?? "",
          injury_note: res.player.injury_note ?? "",
          snap_pct: res.player.snap_pct,
          target_share: res.player.target_share,
          targets_pg: res.player.targets_pg,
          touches_pg: res.player.touches_pg,
          depth_chart_order: res.player.depth_chart_order,
          season_ppg: res.player.season_ppg,
          last3_ppg: res.player.last3_ppg,
        });
      })
      .catch(() => setData(null))
      .finally(() => setLoading(false));
  }, [playerId, leagueId]);

  if (!playerId) return null;
  const p = data?.player;

  const save = async () => {
    setSaving(true);
    try {
      await api(`/api/players/${playerId}`, { method: "PATCH", body: { ...form, leagueId } });
      push({ tone: "success", title: "Player updated", body: "Projections and values were recomputed." });
      setEditing(false);
      onChanged?.();
      const res = await api(`/api/players/${playerId}?leagueId=${leagueId}`);
      setData(res);
    } catch (err: any) {
      push({ tone: "error", title: "Update failed", body: err.message });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/70 p-4 backdrop-blur-sm sm:p-8">
      <div className="panel animate-fade-in my-auto w-full max-w-3xl bg-ink-900/95">
        <div className="flex items-start justify-between gap-4 border-b border-white/[0.07] px-5 py-4">
          {loading || !p ? (
            <Skeleton className="h-8 w-52" />
          ) : (
            <div className="flex items-start gap-3">
              <PositionBadge position={p.position} />
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-base font-bold tracking-tight text-white">{p.name}</h3>
                  <InjuryBadge status={p.injury_status} />
                </div>
                <p className="num mt-0.5 text-xs text-slate-400">
                  {p.nfl_team} · {p.opponent ? `vs ${p.opponent}` : "BYE"} · age {p.age ?? "—"} · ADP {fmt(p.adp, 0)} · bye wk{" "}
                  {p.bye_week}
                </p>
              </div>
            </div>
          )}
          <div className="flex items-center gap-2">
            <button onClick={() => setEditing((v) => !v)} className="btn-ghost !py-1.5 text-xs">
              <Pencil size={13} /> {editing ? "Cancel" : "Edit"}
            </button>
            <button onClick={onClose} className="btn-ghost !px-2 !py-1.5 text-xs">
              ✕
            </button>
          </div>
        </div>

        <div className="scroll-thin max-h-[72vh] space-y-4 overflow-y-auto p-5">
          {loading || !p ? (
            <div className="space-y-3">
              <Skeleton className="h-24 w-full" />
              <Skeleton className="h-40 w-full" />
            </div>
          ) : (
            <>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                {[
                  { label: "AI projection", value: fmt(p.model_pts), tone: "text-white" },
                  { label: "Sportsbook", value: fmt(p.book_pts), tone: "text-turf-300" },
                  { label: "Sleeper", value: fmt(p.sleeper_pts), tone: "text-sky-300" },
                  { label: "Consensus", value: fmt(p.consensus_pts), tone: "text-violet-300" },
                ].map((s) => (
                  <div key={s.label} className="rounded-xl border border-white/[0.07] bg-white/[0.02] p-3">
                    <p className="text-[10px] uppercase tracking-wider text-slate-500">{s.label}</p>
                    <p className={cn("num mt-1 text-xl font-bold", s.tone)}>{s.value}</p>
                  </div>
                ))}
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <div className="rounded-xl border border-white/[0.07] bg-white/[0.02] p-4">
                  <p className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-slate-400">Usage profile</p>
                  <div className="space-y-2.5">
                    {[
                      { k: "Snap rate", v: p.snap_pct, max: 100, unit: "%" },
                      { k: "Target share", v: p.target_share, max: 35, unit: "%" },
                      { k: "Route participation", v: p.route_pct, max: 100, unit: "%" },
                      { k: "Red-zone share", v: p.red_zone_share, max: 60, unit: "%" },
                    ].map((row) => (
                      <div key={row.k}>
                        <div className="mb-1 flex items-center justify-between text-[11px]">
                          <span className="text-slate-400">{row.k}</span>
                          <span className="num font-semibold text-slate-200">
                            {fmt(row.v, 1)}
                            {row.unit}
                          </span>
                        </div>
                        <Progress value={(row.v / row.max) * 100} tone="blue" />
                      </div>
                    ))}
                    <div className="num flex gap-4 pt-1 text-[11px] text-slate-400">
                      <span>{fmt(p.targets_pg, 1)} tgt/gm</span>
                      <span>{fmt(p.touches_pg, 1)} touch/gm</span>
                      <span>depth #{p.depth_chart_order}</span>
                    </div>
                  </div>
                </div>

                <div className="rounded-xl border border-white/[0.07] bg-white/[0.02] p-4">
                  <p className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-slate-400">Market</p>
                  <div className="num space-y-1.5 text-[12px]">
                    <div className="flex justify-between">
                      <span className="text-slate-400">Trade value</span>
                      <span className="font-semibold text-white">{fmt(p.value, 1)} / 100</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">7-day trend</span>
                      <span className={cn("font-semibold", p.trend_7d >= 0 ? "text-turf-300" : "text-red-300")}>
                        {signed(p.trend_7d ?? 0, 1)}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Book vs Sleeper</span>
                      <span className={cn("font-semibold", p.discrepancy >= 0 ? "text-turf-300" : "text-red-300")}>
                        {signed(p.discrepancy ?? 0, 1)} pts
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Matchup rating</span>
                      <span className="font-semibold text-white">{fmt(p.matchup_rating, 0)}/100</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Rostered by</span>
                      <span className="font-semibold text-white">{p.is_free_agent ? "Free agent" : p.team_name}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">ROS PPG</span>
                      <span className="font-semibold text-white">{fmt(data.rosPpg)}</span>
                    </div>
                  </div>
                  <div className="mt-3">
                    <Badge tone={SIGNAL_LABEL[p.market_signal]?.tone ?? "slate"}>
                      {SIGNAL_LABEL[p.market_signal]?.label ?? "Hold"}
                    </Badge>
                  </div>
                </div>
              </div>

              {editing ? (
                <div className="rounded-xl border border-turf-500/20 bg-turf-500/[0.04] p-4">
                  <p className="mb-3 text-[11px] font-semibold uppercase tracking-wider text-turf-300">
                    Override player data
                  </p>
                  <div className="grid gap-3 sm:grid-cols-3">
                    <div>
                      <label className="label">Injury status</label>
                      <select
                        className="input"
                        value={form.injury_status}
                        onChange={(e) => setForm({ ...form, injury_status: e.target.value })}
                      >
                        <option value="">Healthy</option>
                        <option value="QUESTIONABLE">Questionable</option>
                        <option value="DOUBTFUL">Doubtful</option>
                        <option value="OUT">Out</option>
                        <option value="IR">IR</option>
                      </select>
                    </div>
                    {[
                      ["snap_pct", "Snap %"],
                      ["target_share", "Target share"],
                      ["targets_pg", "Targets/gm"],
                      ["touches_pg", "Touches/gm"],
                      ["depth_chart_order", "Depth chart"],
                      ["season_ppg", "Season PPG"],
                      ["last3_ppg", "Last 3 PPG"],
                    ].map(([key, label]) => (
                      <div key={key}>
                        <label className="label">{label}</label>
                        <input
                          type="number"
                          step="0.1"
                          className="input"
                          value={form[key] ?? 0}
                          onChange={(e) => setForm({ ...form, [key]: Number(e.target.value) })}
                        />
                      </div>
                    ))}
                    <div className="sm:col-span-3">
                      <label className="label">Injury note</label>
                      <input
                        className="input"
                        value={form.injury_note ?? ""}
                        onChange={(e) => setForm({ ...form, injury_note: e.target.value })}
                        placeholder="e.g. Limited in practice (hamstring)"
                      />
                    </div>
                  </div>
                  <div className="mt-3 flex justify-end">
                    <button onClick={save} disabled={saving} className="btn-primary !py-1.5 text-xs">
                      {saving ? <Loader2 size={13} className="animate-spin" /> : <Save size={13} />} Save & recompute
                    </button>
                  </div>
                </div>
              ) : null}

              <div>
                <p className="mb-2 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                  <BarChart3 size={12} /> FanDuel prop slate
                </p>
                <div className="space-y-3">
                  {data.weeks.map((w: any) => (
                    <div key={w.week} className="overflow-hidden rounded-xl border border-white/[0.07]">
                      <div className="flex items-center justify-between bg-white/[0.03] px-3 py-2">
                        <span className="text-xs font-semibold text-slate-200">
                          Week {w.week}
                          {w.projection?.opponent ? ` vs ${w.projection.opponent}` : " · BYE"}
                        </span>
                        <span className="num text-xs text-slate-400">
                          book {fmt(w.projection?.book_pts)} · model {fmt(w.projection?.model_pts)}
                        </span>
                      </div>
                      {w.props?.length ? (
                        <table className="w-full text-left text-[11.5px]">
                          <thead className="text-slate-500">
                            <tr className="border-b border-white/[0.06]">
                              <th className="px-3 py-1.5 font-medium">Market</th>
                              <th className="px-3 py-1.5 text-right font-medium">Line</th>
                              <th className="px-3 py-1.5 text-right font-medium">Over</th>
                              <th className="px-3 py-1.5 text-right font-medium">Under</th>
                              <th className="px-3 py-1.5 text-right font-medium">Move</th>
                              <th className="px-3 py-1.5 text-right font-medium">FP</th>
                            </tr>
                          </thead>
                          <tbody className="num divide-y divide-white/[0.05]">
                            {w.props.map((prop: any) => (
                              <tr key={prop.id} className="text-slate-300">
                                <td className="px-3 py-1.5 text-slate-200">{prop.market}</td>
                                <td className="px-3 py-1.5 text-right">{prop.line}</td>
                                <td className="px-3 py-1.5 text-right text-turf-300">
                                  {prop.over_odds > 0 ? `+${prop.over_odds}` : prop.over_odds}
                                </td>
                                <td className="px-3 py-1.5 text-right text-slate-400">
                                  {prop.under_odds > 0 ? `+${prop.under_odds}` : prop.under_odds}
                                </td>
                                <td
                                  className={cn(
                                    "px-3 py-1.5 text-right",
                                    prop.line_move > 0 ? "text-turf-300" : prop.line_move < 0 ? "text-red-300" : "text-slate-500"
                                  )}
                                >
                                  {prop.line_move ? signed(prop.line_move, 1) : "—"}
                                </td>
                                <td className="px-3 py-1.5 text-right text-slate-200">{fmt(prop.fantasy_pts)}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      ) : (
                        <p className="px-3 py-3 text-xs text-slate-500">No markets posted (bye week).</p>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <p className="mb-2 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                  <Activity size={12} /> Recent news
                </p>
                {data.news?.length ? (
                  <div className="space-y-2">
                    {data.news.map((n: any) => (
                      <div key={n.id} className="rounded-xl border border-white/[0.07] bg-white/[0.02] p-3">
                        <div className="flex items-start justify-between gap-3">
                          <p className="text-[12.5px] font-semibold text-slate-100">{n.headline}</p>
                          <span className="num shrink-0 text-[10px] text-slate-500">{timeAgo(n.published_at)}</span>
                        </div>
                        <p className="mt-1 text-[11.5px] leading-relaxed text-slate-400">{n.body}</p>
                        {n.ai_take ? (
                          <p className="mt-1.5 rounded-lg bg-turf-500/[0.07] px-2.5 py-1.5 text-[11.5px] text-turf-200">
                            AI take: {n.ai_take}
                          </p>
                        ) : null}
                      </div>
                    ))}
                  </div>
                ) : (
                  <EmptyState title="No news yet" body="The monitor will surface injury, usage and market events here." />
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export function ValueTrend({ value }: { value: number }) {
  if (!value) return <span className="text-[11px] text-slate-500">flat</span>;
  const Icon = value > 0 ? TrendingUp : TrendingDown;
  return (
    <span className={cn("num inline-flex items-center gap-1 text-[11px] font-semibold", value > 0 ? "text-turf-300" : "text-red-300")}>
      <Icon size={12} /> {signed(value, 1)}
    </span>
  );
}
