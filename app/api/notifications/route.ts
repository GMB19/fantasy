import { withUser } from "@/lib/api";
import { getNotifications } from "@/lib/queries";

export async function GET() {
  return withUser((user) => ({ notifications: getNotifications(user.id, 30) }));
}
