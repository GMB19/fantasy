import { getCurrentUser } from "@/lib/auth";
import { getLeagues, getSnapshot } from "@/lib/queries";
import { getSleeperAccount } from "@/lib/sleeper";
import { AppDataProvider, type SnapshotResponse } from "@/components/data-provider";
import { AppShell } from "@/components/app-shell";
import { ToastProvider } from "@/components/ui";

export const dynamic = "force-dynamic";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();
  const leagues = user ? getLeagues(user.id) : [];

  // Server-render the first snapshot so the dashboard paints with real numbers
  // instead of flashing skeletons while the client makes its first request.
  //
  // When the server cannot see a session we deliberately do NOT redirect. A
  // document navigation cannot carry the `x-gm-session` header, so a browser
  // that blocks cookies (embedded iframe, strict privacy settings) would be
  // stuck in a sign-in loop even though it holds a perfectly valid session.
  // Instead we render the shell and let AppDataProvider settle it: it calls
  // /api/snapshot with the header and redirects to /login or /connect itself.
  const initial =
    user && leagues.length
      ? (JSON.parse(
          JSON.stringify({
            user,
            account: getSleeperAccount(user.id) ?? null,
            leagues,
            snapshot: getSnapshot(user.id, null),
            serverTime: Date.now(),
          })
        ) as SnapshotResponse)
      : null;

  return (
    <ToastProvider>
      <AppDataProvider initial={initial}>
        <AppShell>{children}</AppShell>
      </AppDataProvider>
    </ToastProvider>
  );
}
