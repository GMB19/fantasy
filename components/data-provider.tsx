"use client";

import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";

export interface SnapshotResponse {
  user: { id: string; name: string; email: string } | null;
  account: any;
  leagues: any[];
  snapshot: any;
  serverTime: number;
}

interface Ctx {
  data: SnapshotResponse | null;
  loading: boolean;
  error: string | null;
  refresh: (silent?: boolean) => Promise<void>;
  activeLeagueId: string | null;
  setActiveLeagueId: (id: string) => void;
  lastUpdated: number;
}

const AppCtx = createContext<Ctx>({
  data: null,
  loading: true,
  error: null,
  refresh: async () => {},
  activeLeagueId: null,
  setActiveLeagueId: () => {},
  lastUpdated: 0,
});

export function useApp() {
  return useContext(AppCtx);
}

export function AppDataProvider({
  children,
  initial,
}: {
  children: React.ReactNode;
  initial?: SnapshotResponse | null;
}) {
  const [data, setData] = useState<SnapshotResponse | null>(initial ?? null);
  const [loading, setLoading] = useState(!initial);
  const [error, setError] = useState<string | null>(null);
  const [activeLeagueId, setActive] = useState<string | null>(initial?.snapshot?.league?.id ?? null);
  const [lastUpdated, setLastUpdated] = useState(Date.now());
  const inflight = useRef(false);

  const refresh = useCallback(
    async (silent = true) => {
      if (inflight.current) return;
      inflight.current = true;
      if (!silent) setLoading(true);
      try {
        const qs = activeLeagueId ? `?leagueId=${activeLeagueId}` : "";
        const res = await fetch(`/api/snapshot${qs}`, { cache: "no-store" });
        if (!res.ok) throw new Error(`Snapshot failed (${res.status})`);
        const json = (await res.json()) as SnapshotResponse;
        setData(json);
        setError(null);
        setLastUpdated(Date.now());
        if (!activeLeagueId && json.snapshot?.league?.id) setActive(json.snapshot.league.id);
      } catch (err: any) {
        setError(err?.message ?? "Failed to load");
      } finally {
        inflight.current = false;
        setLoading(false);
      }
    },
    [activeLeagueId]
  );

  useEffect(() => {
    refresh(false);
  }, [refresh]);

  useEffect(() => {
    const t = setInterval(() => refresh(true), 6000);
    const onVis = () => document.visibilityState === "visible" && refresh(true);
    document.addEventListener("visibilitychange", onVis);
    return () => {
      clearInterval(t);
      document.removeEventListener("visibilitychange", onVis);
    };
  }, [refresh]);

  const setActiveLeagueId = useCallback(
    (id: string) => {
      setActive(id);
      fetch(`/api/leagues/${id}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ activate: true }),
      }).then(() => refresh(true));
    },
    [refresh]
  );

  return (
    <AppCtx.Provider value={{ data, loading, error, refresh, activeLeagueId, setActiveLeagueId, lastUpdated }}>
      {children}
    </AppCtx.Provider>
  );
}

/** Small fetch helper with JSON + error handling used by page-level actions. */
export async function api<T = any>(
  url: string,
  options: { method?: string; body?: any } = {}
): Promise<T> {
  const res = await fetch(url, {
    method: options.method ?? "GET",
    headers: options.body ? { "content-type": "application/json" } : undefined,
    body: options.body ? JSON.stringify(options.body) : undefined,
    cache: "no-store",
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(json?.error ?? `Request failed (${res.status})`);
  return json as T;
}

/** Poll any endpoint on an interval (used by the section pages). */
export function usePolling<T>(url: string | null, intervalMs = 8000, deps: any[] = []) {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(
    async (silent = true) => {
      if (!url) return;
      if (!silent) setLoading(true);
      try {
        const json = await api<T>(url);
        setData(json);
        setError(null);
      } catch (err: any) {
        setError(err?.message ?? "Failed");
      } finally {
        setLoading(false);
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [url, ...deps]
  );

  useEffect(() => {
    setLoading(true);
    load(false);
    if (!intervalMs) return;
    const t = setInterval(() => load(true), intervalMs);
    return () => clearInterval(t);
  }, [load, intervalMs]);

  return { data, loading, error, reload: load, setData };
}
