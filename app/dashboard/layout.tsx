import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { getLeagues, getSnapshot } from "@/lib/queries";
import { getSleeperAccount } from "@/lib/sleeper";
import { AppDataProvider, type SnapshotResponse } from "@/components/data-provider";
import { AppShell } from "@/components/app-shell";
import { ToastProvider } from "@/components/ui";

export const dynamic = "force-dynamic";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  const leagues = getLeagues(user.id);
  if (!leagues.length) redirect("/connect");

  // Server-render the first snapshot so the dashboard paints with real numbers
  // instead of flashing skeletons while the client makes its first request.
  const initial = JSON.parse(
    JSON.stringify({
      user,
      account: getSleeperAccount(user.id) ?? null,
      leagues,
      snapshot: getSnapshot(user.id, null),
      serverTime: Date.now(),
    })
  ) as SnapshotResponse;

  return (
    <ToastProvider>
      <AppDataProvider initial={initial}>
        <AppShell>{children}</AppShell>
      </AppDataProvider>
    </ToastProvider>
  );
}
