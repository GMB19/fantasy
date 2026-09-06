import { NextResponse } from "next/server";
import { getCurrentUser } from "./auth";
import { getLeague } from "./queries";
import type { League, User } from "./types";

export function json(data: unknown, status = 200) {
  return NextResponse.json(data, { status });
}

export function badRequest(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status });
}

export async function withUser<T>(
  handler: (user: User) => Promise<T> | T
): Promise<NextResponse> {
  const user = await getCurrentUser();
  if (!user) return badRequest("Not authenticated", 401);
  try {
    const result = await handler(user);
    if (result instanceof NextResponse) return result;
    return NextResponse.json(result ?? { ok: true });
  } catch (err: any) {
    console.error("[api]", err);
    return NextResponse.json({ error: err?.message ?? "Server error" }, { status: 500 });
  }
}

export async function withLeague<T>(
  req: Request,
  handler: (user: User, league: League) => Promise<T> | T,
  explicitLeagueId?: string
): Promise<NextResponse> {
  return withUser(async (user) => {
    const url = new URL(req.url);
    let leagueId = explicitLeagueId ?? url.searchParams.get("leagueId");
    if (!leagueId && (req.method === "POST" || req.method === "PATCH" || req.method === "PUT")) {
      try {
        const clone = req.clone();
        const body = await clone.json();
        leagueId = body?.leagueId ?? null;
        (req as any).__body = body;
      } catch {
        /* no body */
      }
    }
    const league = getLeague(user.id, leagueId);
    if (!league) return badRequest("No league found. Connect a Sleeper league first.", 404);
    return handler(user, league);
  });
}

export async function readBody<T = any>(req: Request): Promise<T> {
  if ((req as any).__body) return (req as any).__body as T;
  try {
    return (await req.json()) as T;
  } catch {
    return {} as T;
  }
}
