"use client";

import Link from "next/link";
import { useState } from "react";
import { ArrowRight, Loader2, Zap } from "lucide-react";

export function AuthForm({ mode }: { mode: "login" | "signup" }) {
  const [form, setForm] = useState({ name: "", email: "", password: "" });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/auth/${mode}`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(form),
        // Make sure the Set-Cookie response is honoured even when the app is
        // running inside a cross-site iframe.
        credentials: "same-origin",
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Something went wrong");

      // Cross an auth boundary with a full document navigation rather than a
      // client-side push: it guarantees the brand-new session cookie is used
      // and that no cached RSC payload from the logged-out state is replayed.
      window.location.assign(mode === "signup" ? "/connect" : "/dashboard");
    } catch (err: any) {
      setError(err.message);
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center px-4 py-10">
      <div className="w-full max-w-[400px]">
        <Link href="/" className="mb-7 flex items-center justify-center gap-2.5">
          <span className="grid h-10 w-10 place-items-center rounded-xl bg-gradient-to-br from-turf-400 to-turf-600 text-ink-950">
            <Zap size={18} strokeWidth={2.6} />
          </span>
          <span className="text-[15px] font-bold tracking-tight text-white">Gridiron GM</span>
        </Link>

        <div className="panel p-6">
          <h1 className="text-lg font-bold tracking-tight text-white">
            {mode === "signup" ? "Create your GM account" : "Welcome back"}
          </h1>
          <p className="mt-1 text-[12.5px] text-slate-400">
            {mode === "signup"
              ? "Connect Sleeper next, or generate a demo league instantly."
              : "Sign in to your autonomous GM command centre."}
          </p>

          <form onSubmit={submit} className="mt-5 space-y-3.5">
            {mode === "signup" ? (
              <div>
                <label className="label">Name</label>
                <input
                  className="input"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="Alex Morgan"
                  required
                />
              </div>
            ) : null}
            <div>
              <label className="label">Email</label>
              <input
                type="email"
                className="input"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                placeholder="you@example.com"
                required
              />
            </div>
            <div>
              <label className="label">Password</label>
              <input
                type="password"
                className="input"
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                placeholder="••••••••"
                required
                minLength={6}
              />
            </div>

            {error ? (
              <p className="rounded-lg border border-red-500/25 bg-red-500/10 px-3 py-2 text-[12px] text-red-300">{error}</p>
            ) : null}

            <button type="submit" disabled={loading} className="btn-primary w-full">
              {loading ? <Loader2 size={15} className="animate-spin" /> : null}
              {mode === "signup" ? "Create account" : "Sign in"}
              {!loading ? <ArrowRight size={15} /> : null}
            </button>
          </form>

          <p className="mt-4 text-center text-[12px] text-slate-400">
            {mode === "signup" ? (
              <>
                Already have an account?{" "}
                <Link href="/login" className="font-semibold text-turf-300 hover:text-turf-200">
                  Sign in
                </Link>
              </>
            ) : (
              <>
                New here?{" "}
                <Link href="/signup" className="font-semibold text-turf-300 hover:text-turf-200">
                  Create an account
                </Link>
              </>
            )}
          </p>
        </div>
      </div>
    </div>
  );
}
