import { prisma } from "@/lib/prisma";
import { aggregateJobs } from "@/lib/jobSources";
import { rescoreAndQueue } from "@/lib/rescore";

// Refresh the shared job listing pool once, then rescore it for a single user.
// Used by the manual "Refresh jobs" button (scoped to whoever clicked it).
export async function runPipelineForUser(userId: string, threshold = 10) {
  const fetchResult = await aggregateJobs();
  const scoreResult = await rescoreAndQueue(userId, threshold);
  return { fetch: fetchResult, score: scoreResult };
}

// Refresh the shared job listing pool once, then rescore it for every user
// whose automation schedule is enabled. Used by the IST scheduler and the
// /api/cron/run endpoint (Vercel Cron), since job listings are shared across
// all users but matches/applications are per-user.
export async function runPipelineForScheduledUsers(threshold = 10) {
  const fetchResult = await aggregateJobs();

  const users = await prisma.user.findMany({
    where: { scheduleEnabled: true },
    select: { id: true },
  });

  const perUser: { userId: string; score: Awaited<ReturnType<typeof rescoreAndQueue>> }[] = [];
  for (const u of users) {
    const score = await rescoreAndQueue(u.id, threshold);
    perUser.push({ userId: u.id, score });
  }

  return { fetch: fetchResult, users: perUser };
}
