"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { ArrowRight, CheckCircle2, Download, Loader2, Sparkles, Users, Zap } from "lucide-react";
import { api } from "./data-provider";
import { Badge, EmptyState, Panel, ToastProvider, useToast } from "./ui";

function Wizard({ userName }: { userName: string }) {
  const router = useRouter();
  const { push } = useToast();
  const [username, setUsername] = useState("");
  const [teamName, setTeamName] = useState("Autonomous FC");
  const [connecting, setConnecting] = useState(false);
  const [importing, setImporting] = useState<string | null>(null);
  const [demoLoading, setDemoLoading] = useState(false);
  const [result, setResult] = useState<any>(null);

  const connect = async (e: React.FormEvent) => {
    e.preventDefault();
    setConnecting(true);
    try {
      const res = await api("/api/sleeper/connect", { method: "POST", body: { username } });
      setResult(res);
      push({
        tone: res.note ? "warn" : "success",
        title: res.note ? "Connected in simulation mode" : "Sleeper account connected",
        body: res.note ?? `Found ${res.leagues.length} league(s) for @${res.account.username}.`,
      });
    } catch (err: any) {
      push({ tone: "error", title: "Connection failed", body: err.message });
    } finally {
      setConnecting(false);
    }
  };

  const importLeague = async (sleeperLeagueId: string) => {
    setImporting(sleeperLeagueId);
    try {
      await api("/api/sleeper/import", { method: "POST", body: { sleeperLeagueId, teamName } });
      push({ tone: "success", title: "League imported", body: "The AI GM is running its first cycle now." });
      router.push("/dashboard");
      router.refresh();
    } catch (err: any) {
      push({ tone: "error", title: "Import failed", body: err.message });
      setImporting(null);
    }
  };

  const generateDemo = async () => {
    setDemoLoading(true);
    try {
      await api("/api/sleeper/demo", { method: "POST", body: { teamName } });
      push({ tone: "success", title: "Demo league ready", body: "12 teams, 6 played weeks and a live prop feed." });
      router.push("/dashboard");
      router.refresh();
    } catch (err: any) {
      push({ tone: "error", title: "Could not create demo league", body: err.message });
      setDemoLoading(false);
    }
  };

  return (
    <div className="mx-auto flex min-h-screen max-w-3xl flex-col justify-center px-5 py-12">
      <div className="mb-7 flex items-center gap-2.5">
        <span className="grid h-10 w-10 place-items-center rounded-xl bg-gradient-to-br from-turf-400 to-turf-600 text-ink-950">
          <Zap size={18} strokeWidth={2.6} />
        </span>
        <div>
          <h1 className="text-lg font-bold tracking-tight text-white">Welcome, {userName.split(" ")[0]}</h1>
          <p className="text-[12.5px] text-slate-400">Connect a league so your GM has something to run.</p>
        </div>
      </div>

      <Panel className="p-6">
        <div className="flex items-center gap-2">
          <Users size={15} className="text-turf-300" />
          <h2 className="text-sm font-semibold text-white">Connect your Sleeper account</h2>
        </div>
        <form onSubmit={connect} className="mt-4 flex flex-col gap-3 sm:flex-row">
          <input
            className="input flex-1"
            placeholder="Sleeper username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            required
          />
          <button type="submit" disabled={connecting} className="btn-primary shrink-0">
            {connecting ? <Loader2 size={15} className="animate-spin" /> : <ArrowRight size={15} />}
            {connecting ? "Looking up…" : "Find my leagues"}
          </button>
        </form>

        <div className="mt-3">
          <label className="label">Your team name in the app</label>
          <input className="input" value={teamName} onChange={(e) => setTeamName(e.target.value)} />
        </div>

        {result ? (
          <div className="mt-5">
            {result.note ? (
              <p className="mb-3 rounded-xl border border-amber-500/25 bg-amber-500/10 px-3.5 py-2.5 text-[12px] leading-relaxed text-amber-200">
                {result.note}
              </p>
            ) : (
              <p className="mb-3 flex items-center gap-2 text-[12px] text-turf-300">
                <CheckCircle2 size={13} /> Live Sleeper connection established for @{result.account.username}.
              </p>
            )}
            <p className="label">Available leagues</p>
            <div className="divide-row overflow-hidden rounded-xl border border-white/[0.07]">
              {result.leagues.length ? (
                result.leagues.map((l: any) => (
                  <div key={l.league_id} className="flex items-center justify-between gap-3 bg-white/[0.02] px-4 py-3">
                    <div className="min-w-0">
                      <p className="truncate text-[13px] font-semibold text-slate-100">{l.name}</p>
                      <p className="num mt-0.5 text-[11px] text-slate-500">
                        {l.total_rosters} teams · {l.season} · id {l.league_id}
                      </p>
                    </div>
                    {l.imported ? (
                      <Badge tone="green">Imported</Badge>
                    ) : (
                      <button
                        onClick={() => importLeague(l.league_id)}
                        disabled={!!importing}
                        className="btn-ghost shrink-0 !py-1.5 text-xs"
                      >
                        {importing === l.league_id ? (
                          <Loader2 size={13} className="animate-spin" />
                        ) : (
                          <Download size={13} />
                        )}
                        Import
                      </button>
                    )}
                  </div>
                ))
              ) : (
                <EmptyState title="No leagues found" body="Try a different username, or generate a demo league below." />
              )}
            </div>
          </div>
        ) : null}
      </Panel>

      <div className="my-5 flex items-center gap-3">
        <span className="h-px flex-1 bg-white/[0.08]" />
        <span className="text-[11px] uppercase tracking-widest text-slate-500">or</span>
        <span className="h-px flex-1 bg-white/[0.08]" />
      </div>

      <Panel className="p-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <Sparkles size={15} className="text-turf-300" />
              <h2 className="text-sm font-semibold text-white">Generate a demo league</h2>
            </div>
            <p className="mt-1.5 max-w-md text-[12.5px] leading-relaxed text-slate-400">
              A full 12-team PPR league at week 7: snake draft, six completed weeks, real records, FAAB spend,
              injuries, a live sportsbook prop feed and rival GMs with distinct trading personalities.
            </p>
          </div>
          <button onClick={generateDemo} disabled={demoLoading} className="btn-primary shrink-0">
            {demoLoading ? <Loader2 size={15} className="animate-spin" /> : <Sparkles size={15} />}
            {demoLoading ? "Building…" : "Build it"}
          </button>
        </div>
      </Panel>
    </div>
  );
}

export function ConnectWizard(props: { userName: string }) {
  return (
    <ToastProvider>
      <Wizard {...props} />
    </ToastProvider>
  );
}
