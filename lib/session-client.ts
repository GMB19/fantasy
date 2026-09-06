"use client";

/**
 * Client-side copy of the session id.
 *
 * Cookies are the primary mechanism, but they are unavailable in some contexts
 * this app legitimately runs in — most notably when it is embedded in a
 * cross-site iframe and the browser blocks third-party cookies. In that case
 * the server can still authenticate us if we replay the session id as a
 * request header, so we keep a copy here and attach it to every API call.
 */

const KEY = "gm_session";

export function saveSessionToken(token?: string | null) {
  if (typeof window === "undefined" || !token) return;
  try {
    window.localStorage.setItem(KEY, token);
  } catch {
    /* storage disabled — cookies may still work */
  }
}

export function readSessionToken(): string | null {
  if (typeof window === "undefined") return null;
  try {
    return window.localStorage.getItem(KEY);
  } catch {
    return null;
  }
}

export function clearSessionToken() {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(KEY);
  } catch {
    /* ignore */
  }
}

/** Headers to merge into every authenticated request. */
export function authHeaders(): Record<string, string> {
  const token = readSessionToken();
  return token ? { "x-gm-session": token } : {};
}
