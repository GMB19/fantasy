import { db } from "@/lib/db";
import { readBody, withUser } from "@/lib/api";

export async function POST(req: Request) {
  return withUser(async (user) => {
    const body = await readBody<{ id?: string }>(req);
    if (body.id) db.prepare(`UPDATE notifications SET is_read = 1 WHERE id = ? AND user_id = ?`).run(body.id, user.id);
    else db.prepare(`UPDATE notifications SET is_read = 1 WHERE user_id = ?`).run(user.id);
    return { ok: true };
  });
}
