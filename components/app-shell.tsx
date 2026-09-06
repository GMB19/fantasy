"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import {
  Activity,
  ArrowLeftRight,
  Bell,
  BrainCircuit,
  ChevronDown,
  Gauge,
  LayoutDashboard,
  LineChart,
  LogOut,
  Menu,
  Newspaper,
  PlayCircle,
  Radar,
  RefreshCw,
  Settings,
  ShieldCheck,
  Users,
  X,
  Zap,
} from "lucide-react";
import { api, useApp } from "./data-provider";
import { clearSessionToken } from "@/lib/session-client";
import { Badge, cn, timeAgo, useToast } from "./ui";

const NAV = [
  { href: "/dashboard", label: "Team Overview", icon: LayoutDashboard },
  { href: "/dashboard/ai-gm", label: "AI GM", icon: BrainCircuit },
  { href: "/dashboard/trades", label: "Trade Finder", icon: ArrowLeftRight },
  { href: "/dashboard/waivers", label: "Waiver Wire", icon: Radar },
  { href: "/dashboard/lineup", label: "Lineup Optimizer", icon: Gauge },
  { href: "/dashboard/league", label: "League Analyzer", icon: Users },
  { href: "/dashboard/market", label: "Player Market", icon: LineChart },
  { href: "/dashboard/news", label: "News", icon: Newspaper },
  { href: "/dashboard/activity", label: "Activity Log", icon: Activity },
  { href: "/dashboard/settings", label: "AI Settings", icon: Settings },
];

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { data, refresh, setActiveLeagueId, lastUpdated } = useApp();
  const { push } = useToast();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [bellOpen, setBellOpen] = useState(false);
  const [running, setRunning] = useState(false);
  const [tick, setTick] = useState(0);

  const snapshot = data?.snapshot;
  const league = snapshot?.league;
  const settings = snapshot?.settings;
  const notifications = snapshot?.notifications ?? [];
  const unread = snapshot?.unreadCount ?? 0;

  useEffect(() => {
    const t = setInterval(() => setTick((x) => x + 1), 1000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => setSidebarOpen(false), [pathname]);

  const paused = settings?.paused_until && settings.paused_until > Date.now();
  const nextRunIn = useMemo(() => {
    if (!settings?.last_run_at) return null;
    const next = settings.last_run_at + settings.scan_interval_sec * 1000;
    return Math.max(0, Math.round((next - Date.now()) / 1000));
  }, [settings?.last_run_at, settings?.scan_interval_sec, tick]);

  const runNow = async () => {
    if (!league) return;
    setRunning(true);
    try {
      const res = await api<{ report: any }>("/api/ai/run", { method: "POST", body: { leagueId: league.id } });
      const r = res.report;
      push({
        tone: "success",
        title: "AI GM cycle complete",
        body: r
          ? `${r.tradesScanned} trade constructions · ${r.waiverTargets} waiver targets · title odds ${r.champProb?.toFixed(1)}%`
          : "Cycle finished.",
      });
      await refresh(true);
    } catch (err: any) {
      push({ tone: "error", title: "Cycle failed", body: err.message });
    } finally {
      setRunning(false);
    }
  };

  const markRead = async () => {
    await api("/api/notifications/read", { method: "POST", body: {} });
    refresh(true);
  };

  const logout = async () => {
    await api("/api/auth/logout", { method: "POST", body: {} });
    clearSessionToken();
    window.location.assign("/login");
  };

  return (
    <div className="min-h-screen lg:grid lg:grid-cols-[248px_1fr]">
      {/* Sidebar */}
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-40 w-[248px] shrink-0 border-r border-white/[0.07] bg-ink-950/95 backdrop-blur-xl transition-transform lg:static lg:translate-x-0",
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        <div className="flex h-full flex-col">
          <div className="flex items-center justify-between px-4 py-4">
            <Link href="/dashboard" className="flex items-center gap-2.5">
              <span className="grid h-9 w-9 place-items-center rounded-xl bg-gradient-to-br from-turf-400 to-turf-600 text-ink-950 shadow-[0_8px_24px_-10px_rgba(0,207,114,0.8)]">
                <Zap size={17} strokeWidth={2.6} />
              </span>
              <span>
                <span className="block text-[13px] font-bold leading-tight tracking-tight text-white">Gridiron GM</span>
                <span className="block text-[10px] font-medium uppercase tracking-widest text-turf-400">Autonomous</span>
              </span>
            </Link>
            <button className="rounded-lg p-1 text-slate-400 hover:text-white lg:hidden" onClick={() => setSidebarOpen(false)}>
              <X size={16} />
            </button>
          </div>

          <nav className="scroll-thin flex-1 space-y-0.5 overflow-y-auto px-2.5 pb-4">
            {NAV.map((item) => {
              const active = pathname === item.href;
              const badge =
                item.href === "/dashboard/trades"
                  ? snapshot?.pendingTrades
                  : item.href === "/dashboard/waivers"
                    ? snapshot?.pendingClaims
                    : 0;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "group flex items-center gap-2.5 rounded-xl px-3 py-2 text-[13px] font-medium transition",
                    active
                      ? "bg-turf-500/12 text-white shadow-[inset_0_0_0_1px_rgba(0,207,114,0.18)]"
                      : "text-slate-400 hover:bg-white/[0.04] hover:text-slate-100"
                  )}
                >
                  <item.icon size={15} className={active ? "text-turf-300" : "text-slate-500 group-hover:text-slate-300"} />
                  <span className="flex-1 truncate">{item.label}</span>
                  {badge ? (
                    <span className="num rounded-full bg-turf-500/20 px-1.5 py-0.5 text-[10px] font-bold text-turf-200">
                      {badge}
                    </span>
                  ) : null}
                </Link>
              );
            })}
          </nav>

          <div className="border-t border-white/[0.07] p-3">
            <div className="rounded-xl border border-white/[0.07] bg-white/[0.02] p-3">
              <div className="flex items-center gap-2">
                <span className={cn("live-dot h-2 w-2 rounded-full", paused ? "bg-amber-400" : settings?.autonomous_mode ? "bg-turf-400" : "bg-slate-500")} />
                <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-300">
                  {paused ? "Paused" : settings?.autonomous_mode ? "Autonomous" : "Manual"}
                </span>
              </div>
              <p className="num mt-2 text-[11px] text-slate-400">
                {settings?.last_run_at ? `Last cycle ${timeAgo(settings.last_run_at)}` : "Awaiting first cycle"}
              </p>
              {nextRunIn !== null && !paused ? (
                <p className="num text-[11px] text-slate-500">Next scan in {nextRunIn}s</p>
              ) : null}
            </div>
            <button onClick={logout} className="mt-2 flex w-full items-center gap-2 rounded-xl px-3 py-2 text-[13px] font-medium text-slate-400 transition hover:bg-white/[0.04] hover:text-slate-100">
              <LogOut size={15} className="text-slate-500" />
              Sign out
            </button>
          </div>
        </div>
      </aside>

      {sidebarOpen ? (
        <div className="fixed inset-0 z-30 bg-black/60 lg:hidden" onClick={() => setSidebarOpen(false)} />
      ) : null}

      {/* Main */}
      <div className="flex min-h-screen min-w-0 flex-col">
        <header className="sticky top-0 z-20 border-b border-white/[0.07] bg-ink-950/80 backdrop-blur-xl">
          <div className="flex flex-wrap items-center gap-2 px-4 py-3 sm:gap-3 sm:px-6">
            <button className="rounded-lg border border-white/10 p-1.5 text-slate-300 lg:hidden" onClick={() => setSidebarOpen(true)}>
              <Menu size={16} />
            </button>

            {/* League switcher */}
            <div className="relative min-w-0 flex-1 sm:flex-none">
              <select
                value={league?.id ?? ""}
                onChange={(e) => setActiveLeagueId(e.target.value)}
                className="w-full max-w-[260px] appearance-none rounded-xl border border-white/10 bg-white/[0.03] py-1.5 pl-3 pr-8 text-[13px] font-semibold text-slate-100 outline-none hover:bg-white/[0.06]"
              >
                {(data?.leagues ?? []).map((l: any) => (
                  <option key={l.id} value={l.id} className="bg-ink-900">
                    {l.name}
                  </option>
                ))}
                {!data?.leagues?.length ? <option value="">No leagues</option> : null}
              </select>
              <ChevronDown size={14} className="pointer-events-none absolute right-2.5 top-2.5 text-slate-500" />
            </div>

            {league ? (
              <div className="hidden items-center gap-2 md:flex">
                <Badge tone="slate">Week {league.current_week}</Badge>
                <Badge tone="slate">{league.scoring_type?.toUpperCase()}</Badge>
                <Badge tone={league.source === "live" ? "green" : "violet"}>
                  {league.source === "live" ? "Sleeper live" : "Sleeper sim feed"}
                </Badge>
              </div>
            ) : null}

            <div className="ml-auto flex items-center gap-2">
              <span className="num hidden text-[11px] text-slate-500 xl:block">
                synced {timeAgo(lastUpdated)}
              </span>
              <button
                onClick={() => refresh(false)}
                className="rounded-xl border border-white/10 bg-white/[0.03] p-2 text-slate-300 transition hover:bg-white/[0.08] hover:text-white"
                title="Refresh data"
              >
                <RefreshCw size={14} />
              </button>

              <div className="relative">
                <button
                  onClick={() => {
                    setBellOpen((v) => !v);
                    if (!bellOpen && unread) markRead();
                  }}
                  className="relative rounded-xl border border-white/10 bg-white/[0.03] p-2 text-slate-300 transition hover:bg-white/[0.08] hover:text-white"
                >
                  <Bell size={14} />
                  {unread ? (
                    <span className="num absolute -right-1 -top-1 grid h-4 min-w-4 place-items-center rounded-full bg-turf-500 px-1 text-[9px] font-bold text-ink-950">
                      {unread}
                    </span>
                  ) : null}
                </button>
                {bellOpen ? (
                  <>
                    <div className="fixed inset-0 z-30" onClick={() => setBellOpen(false)} />
                    <div className="panel absolute right-0 z-40 mt-2 max-h-[420px] w-[340px] overflow-y-auto bg-ink-900/95 p-2 scroll-thin">
                      <p className="px-2 py-1.5 text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                        Notifications
                      </p>
                      {notifications.length ? (
                        notifications.map((n: any) => (
                          <div key={n.id} className="rounded-lg p-2.5 hover:bg-white/[0.04]">
                            <div className="flex items-start justify-between gap-2">
                              <p className="text-[13px] font-semibold text-slate-100">{n.title}</p>
                              <span className="num shrink-0 text-[10px] text-slate-500">{timeAgo(n.created_at)}</span>
                            </div>
                            <p className="mt-0.5 text-[11.5px] leading-relaxed text-slate-400">{n.body}</p>
                          </div>
                        ))
                      ) : (
                        <p className="px-2 py-6 text-center text-xs text-slate-500">No notifications yet.</p>
                      )}
                    </div>
                  </>
                ) : null}
              </div>

              <button onClick={runNow} disabled={running || !league} className="btn-primary !py-2 text-[13px]">
                {running ? <RefreshCw size={14} className="animate-spin" /> : <PlayCircle size={14} />}
                <span className="hidden sm:inline">{running ? "Running…" : "Run AI cycle"}</span>
              </button>
            </div>
          </div>
        </header>

        <main className="mx-auto w-full max-w-[1500px] flex-1 px-4 py-5 sm:px-6 sm:py-6">{children}</main>

        <footer className="border-t border-white/[0.06] px-6 py-4">
          <p className="flex flex-wrap items-center gap-2 text-[11px] text-slate-500">
            <ShieldCheck size={12} />
            Projections blend sportsbook-implied outcomes with consensus and platform sources. Demo leagues use a
            simulated Sleeper + sportsbook feed when live APIs are unreachable.
          </p>
        </footer>
      </div>
    </div>
  );
}
