import { randomUUID } from "crypto";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getProfileById } from "@/lib/user";
import { scoreJob, type ScoringProfile } from "@/lib/scoring";
import { isDuplicate } from "@/lib/dedupe";

export type RescoreResult = {
  scored: number;
  queued: number;
  skippedDuplicate: number;
  threshold: number;
};

const CHUNK_SIZE = 200;

// Score every listing against one user's profile and queue new applications
// above threshold. Scoring itself is pure/in-memory; writes are batched into
// chunked multi-row upserts/inserts so this stays fast against a remote
// Postgres (Neon) even with thousands of listings — a hard requirement since
// this runs several times a day via the IST scheduler / cron, for every user.
export async function rescoreAndQueue(
  userId: string,
  threshold = 25
): Promise<RescoreResult> {
  const profile = await getProfileById(userId);
  if (!profile) throw new Error(`User ${userId} not found`);

  const scoringProfile: ScoringProfile = {
    targetRoles: profile.targetRoles,
    targetLocations: profile.targetLocations,
    salaryFloor: profile.salaryFloor,
    excludedCompanies: profile.excludedCompanies,
    masterResume: profile.masterResume,
  };

  const listings = await prisma.jobListing.findMany();
  const existingApps = await prisma.application.findMany({
    where: { userId: profile.id },
    include: { jobListing: true },
  });
  const engaged = existingApps.filter((a) => a.status !== "queued");
  const alreadyHasApp = new Set(existingApps.map((a) => a.jobListingId));

  type Scored = {
    jobId: string;
    score: number;
    reasons: string[];
  };
  const toUpsert: Scored[] = [];
  const toQueue: string[] = [];
  let skippedDuplicate = 0;

  for (const job of listings) {
    const { score, reasons, excluded } = scoreJob(scoringProfile, {
      title: job.title,
      company: job.company,
      location: job.location,
      description: job.description,
      salaryRange: job.salaryRange,
    });
    if (excluded) continue;

    toUpsert.push({ jobId: job.id, score, reasons });

    if (score < threshold) continue;
    if (alreadyHasApp.has(job.id)) continue;

    const dup = engaged.find((a) =>
      isDuplicate(a.jobListing.company, a.jobListing.title, job.company, job.title)
    );
    if (dup) {
      skippedDuplicate++;
      continue;
    }

    toQueue.push(job.id);
  }

  // Batch-upsert Match rows.
  for (let i = 0; i < toUpsert.length; i += CHUNK_SIZE) {
    const chunk = toUpsert.slice(i, i + CHUNK_SIZE);
    if (chunk.length === 0) continue;
    const now = new Date();
    const rows = chunk.map(
      (m) =>
        Prisma.sql`(${randomUUID()}, ${profile.id}, ${m.jobId}, ${m.score}, ${JSON.stringify(m.reasons)}, ${now})`
    );
    await prisma.$executeRaw`
      INSERT INTO "Match" (id, "userId", "jobListingId", "relevanceScore", reasons, "createdAt")
      VALUES ${Prisma.join(rows)}
      ON CONFLICT ("userId", "jobListingId") DO UPDATE SET
        "relevanceScore" = EXCLUDED."relevanceScore",
        reasons = EXCLUDED.reasons
    `;
  }

  // Batch-create new queued Applications (skipDuplicates guards against races).
  let queued = 0;
  if (toQueue.length > 0) {
    const result = await prisma.application.createMany({
      data: toQueue.map((jobId) => ({
        userId: profile.id,
        jobListingId: jobId,
        status: "queued" as const,
      })),
      skipDuplicates: true,
    });
    queued = result.count;
  }

  return { scored: toUpsert.length, queued, skippedDuplicate, threshold };
}
