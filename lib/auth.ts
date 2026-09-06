import crypto from "node:crypto";
import { cookies } from "next/headers";
import { db } from "./db";
import { id, now } from "./ids";
import type { User } from "./types";

const SESSION_COOKIE = "gm_session";
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
  store.set(SESSION_COOKIE, sessionId, {
    httpOnly: true,
    sameSite: "lax",
    secure: false,
    path: "/",
    maxAge: SESSION_TTL / 1000,
  });
}

export async function clearSession() {
  const store = await cookies();
  const sid = store.get(SESSION_COOKIE)?.value;
  if (sid) db.prepare(`DELETE FROM sessions WHERE id = ?`).run(sid);
  store.delete(SESSION_COOKIE);
}

export async function getCurrentUser(): Promise<User | null> {
  const store = await cookies();
  const sid = store.get(SESSION_COOKIE)?.value;
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
