import { NextResponse } from "next/server";
import { startOfDay, isBefore } from "date-fns";
import { prisma } from "@/lib/prisma";
import { getOrCreateDefaultUser } from "@/lib/user";
import { serializeJob } from "@/lib/serialize";

// GET /api/dashboard — daily goal progress, status funnel, and follow-up nudges.
export async function GET() {
  const profile = await getOrCreateDefaultUser();

  const apps = await prisma.application.findMany({
    where: { userId: profile.id },
    include: { jobListing: true },
  });

  const todayStart = startOfDay(new Date());
  const appliedToday = apps.filter(
    (a) => a.appliedAt && !isBefore(a.appliedAt, todayStart)
  ).length;

  const funnel = {
    queued: 0,
    approved: 0,
    applied: 0,
    responded: 0,
    interview: 0,
    rejected: 0,
    offer: 0,
  };
  for (const a of apps) funnel[a.status] += 1;

  const now = new Date();
  const followUps = apps
    .filter(
      (a) =>
        a.status === "applied" &&
        a.followUpDate &&
        !isBefore(now, a.followUpDate) // followUpDate <= now
    )
    .map((a) => ({
      applicationId: a.id,
      job: serializeJob(a.jobListing),
      followUpDate: a.followUpDate?.toISOString() ?? null,
      appliedAt: a.appliedAt?.toISOString() ?? null,
    }));

  // Applied but not yet responded/interview/rejected/offer, funnel-wise.
  const totalApplied =
    funnel.applied +
    funnel.responded +
    funnel.interview +
    funnel.rejected +
    funnel.offer;

  return NextResponse.json({
    dailyGoal: profile.dailyGoal,
    appliedToday,
    totalApplied,
    funnel,
    followUps,
  });
}
