import { withLeague } from "@/lib/api";
import { runCycle } from "@/lib/agent";

export async function POST(req: Request) {
  return withLeague(req, async (_user, league) => {
    const report = await runCycle(league.id, { trigger: "manual", force: true });
    return { report };
  });
}
