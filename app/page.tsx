import Link from "next/link";
import { redirect } from "next/navigation";
import {
  ArrowLeftRight,
  ArrowRight,
  BrainCircuit,
  Gauge,
  LineChart,
  Radar,
  ShieldCheck,
  Trophy,
  Zap,
} from "lucide-react";
import { getCurrentUser } from "@/lib/auth";

const FEATURES = [
  {
    icon: LineChart,
    title: "Sportsbook-first projections",
    body: "FanDuel-style player props (yards, receptions, TDs, attempts) are de-vigged and converted into fantasy points, then blended with consensus and Sleeper projections.",
  },
  {
    icon: ArrowLeftRight,
    title: "Autonomous trade offers",
    body: "Every rival roster is scanned for 1-for-1, 2-for-1 and consolidation packages, scored by acceptance probability and championship impact — then sent inside your risk limits.",
  },
  {
    icon: Radar,
    title: "Automated waiver claims",
    body: "Free agents are ranked by the lineup points they actually add. FAAB bids are priced against modelled rival demand and submitted automatically.",
  },
  {
    icon: Gauge,
    title: "Lineup optimisation",
    body: "Optimal starters are re-solved on every cycle with injuries, byes, matchup ratings and live line movement applied.",
  },
  {
    icon: Trophy,
    title: "Championship optimisation",
    body: "A Monte Carlo engine simulates the rest of the season and the playoff bracket thousands of times — every decision is judged by its effect on title odds.",
  },
  {
    icon: BrainCircuit,
    title: "Explained decisions",
    body: "Each action is logged with the exact inputs: market edge, usage, snap rate, injury news, matchup and the simulated probability delta.",
  },
];

export default async function LandingPage() {
  const user = await getCurrentUser();
  if (user) redirect("/dashboard");

  return (
    <div className="min-h-screen">
      <header className="mx-auto flex max-w-6xl items-center justify-between px-6 py-6">
        <div className="flex items-center gap-2.5">
          <span className="grid h-9 w-9 place-items-center rounded-xl bg-gradient-to-br from-turf-400 to-turf-600 text-ink-950">
            <Zap size={17} strokeWidth={2.6} />
          </span>
          <span>
            <span className="block text-[14px] font-bold leading-tight text-white">Gridiron GM</span>
            <span className="block text-[10px] font-semibold uppercase tracking-widest text-turf-400">
              Autonomous fantasy GM
            </span>
          </span>
        </div>
        <div className="flex items-center gap-2">
          <Link href="/login" className="btn-ghost text-[13px]">
            Sign in
          </Link>
          <Link href="/signup" className="btn-primary text-[13px]">
            Start free
          </Link>
        </div>
      </header>

      <section className="mx-auto max-w-6xl px-6 pb-10 pt-8 sm:pt-16">
        <div className="chip mb-5 border-turf-500/25 bg-turf-500/10 text-turf-300">
          <span className="live-dot mr-1 h-1.5 w-1.5 rounded-full bg-turf-400" />
          Runs 24/7 on your Sleeper league
        </div>
        <h1 className="max-w-3xl text-4xl font-bold leading-[1.08] tracking-tight text-white sm:text-6xl">
          An autonomous GM that actually{" "}
          <span className="bg-gradient-to-r from-turf-300 to-sky-300 bg-clip-text text-transparent">
            runs your fantasy team
          </span>
          .
        </h1>
        <p className="mt-5 max-w-2xl text-[15px] leading-relaxed text-slate-400">
          Connect Sleeper and hand over the wheel. Gridiron GM prices every player off sportsbook props, simulates the
          season thousands of times per cycle, and then trades, claims, drops and sets lineups on its own — inside the
          risk limits you define.
        </p>
        <div className="mt-7 flex flex-wrap items-center gap-3">
          <Link href="/signup" className="btn-primary">
            Connect a league <ArrowRight size={15} />
          </Link>
          <Link href="/login" className="btn-ghost">
            I already have an account
          </Link>
        </div>

        <div className="mt-12 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {[
            { k: "Projection source", v: "Sportsbook props", d: "de-vigged & converted to fantasy points" },
            { k: "Simulations", v: "1,200+ / cycle", d: "season + playoff bracket Monte Carlo" },
            { k: "Autonomy", v: "Trades · waivers · lineups", d: "with approval gates and daily caps" },
            { k: "Explainability", v: "Every decision logged", d: "inputs, deltas and rationale" },
          ].map((s) => (
            <div key={s.k} className="panel p-4">
              <p className="text-[10.5px] font-semibold uppercase tracking-wider text-slate-500">{s.k}</p>
              <p className="mt-1.5 text-[15px] font-bold text-white">{s.v}</p>
              <p className="mt-1 text-[11.5px] text-slate-400">{s.d}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-6 py-10">
        <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map((f) => (
            <div key={f.title} className="panel panel-hover p-5">
              <span className="grid h-9 w-9 place-items-center rounded-xl bg-turf-500/12 text-turf-300">
                <f.icon size={16} />
              </span>
              <h3 className="mt-3.5 text-[14px] font-semibold text-white">{f.title}</h3>
              <p className="mt-1.5 text-[12.5px] leading-relaxed text-slate-400">{f.body}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-6 pb-16">
        <div className="panel flex flex-col items-start justify-between gap-5 p-7 sm:flex-row sm:items-center">
          <div>
            <h2 className="text-xl font-bold tracking-tight text-white">Spin up a live league in 15 seconds</h2>
            <p className="mt-1.5 max-w-xl text-[13px] text-slate-400">
              Create an account and either link your Sleeper username or generate a fully-simulated 12-team mid-season
              league — complete with a draft, six played weeks, FAAB spend, injuries and a live prop feed.
            </p>
          </div>
          <Link href="/signup" className="btn-primary shrink-0">
            Get started <ArrowRight size={15} />
          </Link>
        </div>
        <p className="mt-5 flex items-center gap-2 text-[11px] text-slate-500">
          <ShieldCheck size={12} /> Illustrative player data and a simulated sportsbook feed are used for demo leagues.
          Not affiliated with Sleeper or FanDuel. No wagering.
        </p>
      </section>
    </div>
  );
}
