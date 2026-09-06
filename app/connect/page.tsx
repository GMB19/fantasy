import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { ConnectWizard } from "@/components/connect-wizard";

export default async function ConnectPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  return <ConnectWizard userName={user.name} />;
}
