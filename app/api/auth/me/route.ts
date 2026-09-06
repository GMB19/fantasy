import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { getLeagues } from "@/lib/queries";
import { getSleeperAccount } from "@/lib/sleeper";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ user: null });
  return NextResponse.json({
    user,
    account: getSleeperAccount(user.id) ?? null,
    leagues: getLeagues(user.id),
  });
}
