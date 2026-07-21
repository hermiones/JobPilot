import { prisma } from "@/lib/prisma";
import { aggregateJobs } from "@/lib/jobSources";
import { rescoreAndQueue } from "@/lib/rescore";
import { istHHMM } from "@/lib/ist";

// In-process scheduler for local/self-hosted runs: every minute it checks the
// current IST time against every user's saved schedule and runs the pipeline
// for whichever ones match. On Vercel (serverless), use Vercel Cron →
// /api/cron/run instead; this loop only runs in a long-lived Node server.
//
// A module-level guard ensures a single loop across hot reloads.
const g = globalThis as unknown as {
  __jobPilotScheduler?: { timer: NodeJS.Timeout; lastRunKey: string | null };
};

async function tick() {
  try {
    const users = await prisma.user.findMany({
      where: { scheduleEnabled: true },
    });
    if (users.length === 0) return;

    const nowHHMM = istHHMM();
    const dateKey = new Date().toISOString().slice(0, 10);

    const due = users.filter((u) => {
      let times: string[] = [];
      try {
        times = JSON.parse(u.scheduleTimes);
      } catch {
        times = [];
      }
      return Array.isArray(times) && times.includes(nowHHMM);
    });
    if (due.length === 0) return;

    // Run at most once per (date+time) slot overall — avoids re-fetching the
    // shared job pool multiple times within the same minute on hot reloads.
    const runKey = `${dateKey} ${nowHHMM}`;
    if (g.__jobPilotScheduler?.lastRunKey === runKey) return;
    if (g.__jobPilotScheduler) g.__jobPilotScheduler.lastRunKey = runKey;

    console.log(
      `[scheduler] Running scheduled pipeline at ${nowHHMM} IST for ${due.length} user(s)`
    );
    const fetchResult = await aggregateJobs();
    for (const u of due) {
      const result = await rescoreAndQueue(u.id);
      console.log(
        `[scheduler]   ${u.email}: queued ${result.queued} (of ${fetchResult.created} fetched)`
      );
    }
  } catch (e) {
    console.error("[scheduler] tick error:", (e as Error).message);
  }
}

export function startScheduler() {
  if (g.__jobPilotScheduler) return; // already running
  const timer = setInterval(tick, 60_000);
  // Don't keep the process alive solely for the scheduler.
  if (typeof timer.unref === "function") timer.unref();
  g.__jobPilotScheduler = { timer, lastRunKey: null };
  console.log("[scheduler] Started (checks every 60s against IST schedule)");
}
