import { getCurrentUser } from "@/lib/auth";
import { ConnectWizard } from "@/components/connect-wizard";

export const dynamic = "force-dynamic";

export default async function ConnectPage() {
  // No server-side redirect when the session isn't visible: a document
  // navigation cannot carry the `x-gm-session` header, so the wizard verifies
  // the session client-side and redirects to /login only if it is truly gone.
  const user = await getCurrentUser();
  return <ConnectWizard userName={user?.name ?? ""} />;
}
