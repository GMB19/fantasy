import { NextResponse } from "next/server";
import { createSession, findUserByEmail, setSessionCookie, verifyPassword } from "@/lib/auth";

export async function POST(req: Request) {
  const { email, password } = await req.json();
  const user = findUserByEmail(email ?? "");
  if (!user || !verifyPassword(password ?? "", user.password_hash)) {
    return NextResponse.json({ error: "Invalid email or password" }, { status: 401 });
  }
  const session = createSession(user.id);
  await setSessionCookie(session);
  return NextResponse.json({ user: { id: user.id, email: user.email, name: user.name } });
}
