import crypto from "node:crypto";
import { cookies, headers } from "next/headers";
import { db } from "./db";
import { id, now } from "./ids";
import type { User } from "./types";

/**
 * The session id travels three ways, because no single mechanism survives
 * every environment this app gets viewed in:
 *
 *  1. `gm_session`     — SameSite=None; Secure; Partitioned. Required when the
 *                        app is embedded in a cross-site iframe (hosted
 *                        previews). Rejected by browsers over plain HTTP.
 *  2. `gm_session_lax` — SameSite=Lax. The ordinary first-party cookie, and the
 *                        one that works on plain-HTTP local development.
 *  3. `x-gm-session`   — a request header the client sends from localStorage.
 *                        The escape hatch for browsers that block third-party
 *                        cookies outright (Safari, hardened privacy settings),
 *                        where neither cookie can ever be stored.
 *
 * We always write both cookies and always accept any of the three, instead of
 * trying to detect the environment — detection is exactly what kept failing.
 */
const SESSION_COOKIE = "gm_session";
const SESSION_COOKIE_LAX = "gm_session_lax";
const SESSION_HEADER = "x-gm-session";
const SESSION_TTL = 1000 * 60 * 60 * 24 * 30;

export function hashPassword(password: string, salt?: string): string {
  const s = salt ?? crypto.randomBytes(16).toString("hex");
  const derived = crypto.scryptSync(password, s, 64).toString("hex");
  return `${s}:${derived}`;
}

export function verifyPassword(password: string, stored: string): boolean {
  const [salt, key] = stored.split(":");
  if (!salt || !key) return false;
  const derived = crypto.scryptSync(password, salt, 64).toString("hex");
  try {
    return crypto.timingSafeEqual(Buffer.from(key, "hex"), Buffer.from(derived, "hex"));
  } catch {
    return false;
  }
}

export function createUser(email: string, name: string, password: string): User {
  const user = {
    id: id("usr"),
    email: email.toLowerCase().trim(),
    name: name.trim(),
    password_hash: hashPassword(password),
    created_at: now(),
  };
  db.prepare(
    `INSERT INTO users (id, email, name, password_hash, created_at) VALUES (@id, @email, @name, @password_hash, @created_at)`
  ).run(user);
  return { id: user.id, email: user.email, name: user.name, created_at: user.created_at };
}

export function findUserByEmail(email: string) {
  return db
    .prepare(`SELECT * FROM users WHERE email = ?`)
    .get(email.toLowerCase().trim()) as (User & { password_hash: string }) | undefined;
}

export function createSession(userId: string): string {
  const sessionId = id("ses");
  db.prepare(
    `INSERT INTO sessions (id, user_id, created_at, expires_at) VALUES (?, ?, ?, ?)`
  ).run(sessionId, userId, now(), now() + SESSION_TTL);
  return sessionId;
}

export async function setSessionCookie(sessionId: string) {
  const store = await cookies();
  const base = { httpOnly: true, path: "/", maxAge: SESSION_TTL / 1000 } as const;
  // Cross-site-iframe capable. Browsers on plain HTTP ignore this one.
  store.set(SESSION_COOKIE, sessionId, {
    ...base,
    sameSite: "none",
    secure: true,
    partitioned: true,
  });
  // Plain first-party cookie. Dropped inside a third-party frame, kept locally.
  store.set(SESSION_COOKIE_LAX, sessionId, { ...base, sameSite: "lax", secure: false });
}

export async function clearSession() {
  const store = await cookies();
  const sid = await getSessionId();
  if (sid) db.prepare(`DELETE FROM sessions WHERE id = ?`).run(sid);
  // Overwrite with matching attributes; delete() can miss a Secure/Partitioned
  // cookie, which would leave the browser looking signed in.
  const base = { httpOnly: true, path: "/", maxAge: 0 } as const;
  store.set(SESSION_COOKIE, "", { ...base, sameSite: "none", secure: true, partitioned: true });
  store.set(SESSION_COOKIE_LAX, "", { ...base, sameSite: "lax", secure: false });
}

/** Resolve the session id from either cookie, or the client-sent header. */
export async function getSessionId(): Promise<string | null> {
  const store = await cookies();
  const fromCookie =
    store.get(SESSION_COOKIE)?.value ?? store.get(SESSION_COOKIE_LAX)?.value ?? null;
  if (fromCookie) return fromCookie;
  try {
    const h = await headers();
    const header = h.get(SESSION_HEADER);
    if (header) return header;
    const auth = h.get("authorization");
    if (auth?.toLowerCase().startsWith("bearer ")) return auth.slice(7).trim();
  } catch {
    /* headers() unavailable in this context */
  }
  return null;
}

export async function getCurrentUser(): Promise<User | null> {
  const sid = await getSessionId();
  if (!sid) return null;
  const row = db
    .prepare(
      `SELECT u.id, u.email, u.name, u.created_at, s.expires_at
       FROM sessions s JOIN users u ON u.id = s.user_id WHERE s.id = ?`
    )
    .get(sid) as (User & { expires_at: number }) | undefined;
  if (!row) return null;
  if (row.expires_at < now()) {
    db.prepare(`DELETE FROM sessions WHERE id = ?`).run(sid);
    return null;
  }
  return { id: row.id, email: row.email, name: row.name, created_at: row.created_at };
}

export async function requireUser(): Promise<User> {
  const user = await getCurrentUser();
  if (!user) throw new AuthError();
  return user;
}

export class AuthError extends Error {
  constructor() {
    super("Not authenticated");
    this.name = "AuthError";
  }
}
