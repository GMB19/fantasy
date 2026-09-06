import { NextResponse } from "next/server";
import { createSession, createUser, findUserByEmail, setSessionCookie } from "@/lib/auth";
import { ensurePlayerPool } from "@/lib/seed";

export async function POST(req: Request) {
  const { email, name, password } = await req.json();
  if (!email || !password || !name) {
    return NextResponse.json({ error: "Name, email and password are required" }, { status: 400 });
  }
  if (String(password).length < 6) {
    return NextResponse.json({ error: "Password must be at least 6 characters" }, { status: 400 });
  }
  if (findUserByEmail(email)) {
    return NextResponse.json({ error: "An account with that email already exists" }, { status: 409 });
  }
  ensurePlayerPool();
  const user = createUser(email, name, password);
  const session = createSession(user.id);
  await setSessionCookie(session);
  return NextResponse.json({ user });
}
