export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const { startScheduler } = await import("./lib/agent");
    const { ensurePlayerPool } = await import("./lib/seed");
    try {
      ensurePlayerPool();
    } catch (err) {
      console.error("[boot] player pool init failed", err);
    }
    startScheduler();
  }
}
