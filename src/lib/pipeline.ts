import { prisma } from "@/lib/prisma";
import { aggregateJobs } from "@/lib/jobSources";
import { rescoreAndQueue } from "@/lib/rescore";
import { syncGmailForUser } from "@/lib/gmailSync";

// Refresh the shared job listing pool once, then rescore it for a single user.
// Used by the manual "Refresh jobs" button (scoped to whoever clicked it).
export async function runPipelineForUser(userId: string, threshold = 10) {
  const fetchResult = await aggregateJobs();
  const scoreResult = await rescoreAndQueue(userId, threshold);
  return { fetch: fetchResult, score: scoreResult };
}

// Auto-approve never submits anything anywhere — it only fast-forwards a
// user's own top-scoring matches from "queued" to "approved" so their queue
// stays warm without manual clicking. Actually applying still means opening
// the job and hitting Approve/Easy Apply.
async function autoApproveTopMatches(
  userId: string,
  minScore: number,
  maxPerRun: number
): Promise<number> {
  const candidates = await prisma.application.findMany({
    where: { userId, status: "queued" },
    select: { jobListingId: true },
  });
  if (candidates.length === 0) return 0;

  const matches = await prisma.match.findMany({
    where: {
      userId,
      jobListingId: { in: candidates.map((c) => c.jobListingId) },
      relevanceScore: { gte: minScore },
    },
    orderBy: { relevanceScore: "desc" },
    take: maxPerRun,
  });
  if (matches.length === 0) return 0;

  const jobListingIds = matches.map((m) => m.jobListingId);
  const result = await prisma.application.updateMany({
    where: { userId, status: "queued", jobListingId: { in: jobListingIds } },
    data: { status: "approved" },
  });
  return result.count;
}

// Refresh the shared job listing pool once, then rescore it for every user
// whose automation schedule is enabled. Used by the IST scheduler and the
// /api/cron/run endpoint (Vercel Cron), since job listings are shared across
// all users but matches/applications are per-user.
export async function runPipelineForScheduledUsers(threshold = 10) {
  const fetchResult = await aggregateJobs();

  const users = await prisma.user.findMany({
    where: { scheduleEnabled: true },
    select: {
      id: true,
      plan: true,
      autoApproveEnabled: true,
      autoApproveMinScore: true,
      autoApproveMaxPerRun: true,
      gmailConnected: true,
    },
  });

  const perUser: {
    userId: string;
    score: Awaited<ReturnType<typeof rescoreAndQueue>>;
    autoApproved: number;
    gmailUpdated: number;
  }[] = [];
  for (const u of users) {
    const score = await rescoreAndQueue(u.id, threshold);
    let autoApproved = 0;
    if (u.autoApproveEnabled && u.plan === "pro") {
      autoApproved = await autoApproveTopMatches(
        u.id,
        u.autoApproveMinScore,
        u.autoApproveMaxPerRun
      );
    }
    let gmailUpdated = 0;
    if (u.gmailConnected) {
      const gmailResult = await syncGmailForUser(u.id).catch(() => ({ updated: 0 }));
      gmailUpdated = gmailResult.updated;
    }
    perUser.push({ userId: u.id, score, autoApproved, gmailUpdated });
  }

  return { fetch: fetchResult, users: perUser };
}
