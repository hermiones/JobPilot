import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getOrCreateDefaultUser } from "@/lib/user";
import { scoreJob, type ScoringProfile } from "@/lib/scoring";
import { isDuplicate } from "@/lib/dedupe";

// POST /api/matches/rescore — score every listing against the profile, store
// Match rows, and auto-queue Applications above the threshold. Body (optional):
// { threshold?: number } (default 25)
export async function POST(req: Request) {
  let threshold = 25;
  try {
    const body = await req.json();
    if (typeof body.threshold === "number") threshold = body.threshold;
  } catch {
    // default threshold
  }

  const profile = await getOrCreateDefaultUser();
  const scoringProfile: ScoringProfile = {
    targetRoles: profile.targetRoles,
    targetLocations: profile.targetLocations,
    salaryFloor: profile.salaryFloor,
    excludedCompanies: profile.excludedCompanies,
    masterResume: profile.masterResume,
  };

  const listings = await prisma.jobListing.findMany();

  // Jobs the user already engaged with (approved/applied/etc.) — used to skip
  // fuzzy duplicates so aggregator re-lists don't clutter the queue.
  const existingApps = await prisma.application.findMany({
    where: { userId: profile.id },
    include: { jobListing: true },
  });
  const engaged = existingApps.filter((a) => a.status !== "queued");

  let scored = 0;
  let queued = 0;
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

    await prisma.match.upsert({
      where: {
        userId_jobListingId: { userId: profile.id, jobListingId: job.id },
      },
      create: {
        userId: profile.id,
        jobListingId: job.id,
        relevanceScore: score,
        reasons: JSON.stringify(reasons),
      },
      update: {
        relevanceScore: score,
        reasons: JSON.stringify(reasons),
      },
    });
    scored++;

    if (score < threshold) continue;

    // Duplicate guard against already-engaged applications.
    const dup = engaged.find((a) =>
      isDuplicate(
        a.jobListing.company,
        a.jobListing.title,
        job.company,
        job.title
      )
    );
    if (dup) {
      skippedDuplicate++;
      continue;
    }

    // Create a queued application if none exists yet.
    const existing = await prisma.application.findUnique({
      where: {
        userId_jobListingId: { userId: profile.id, jobListingId: job.id },
      },
    });
    if (!existing) {
      await prisma.application.create({
        data: {
          userId: profile.id,
          jobListingId: job.id,
          status: "queued",
        },
      });
      queued++;
    }
  }

  return NextResponse.json({ scored, queued, skippedDuplicate, threshold });
}
