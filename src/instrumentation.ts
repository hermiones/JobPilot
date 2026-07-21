// Next.js runs this once when the server starts. We use it to boot the
// in-process IST scheduler, but only in the Node.js runtime (not Edge) and not
// during the build phase.
export async function register() {
  if (
    process.env.NEXT_RUNTIME === "nodejs" &&
    process.env.NEXT_PHASE !== "phase-production-build"
  ) {
    const { startScheduler } = await import("@/lib/scheduler");
    startScheduler();
  }
}
