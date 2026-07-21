import { NextResponse } from "next/server";
import { startOfDay } from "date-fns";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth/requireUser";
import { serializeJob } from "@/lib/serialize";
import { nextRunLabel } from "@/lib/ist";
import { STATUS_ORDER, type Status } from "@/lib/statusMeta";

// GET /api/dashboard — daily goal progress, status funnel, and follow-up nudges.
// Uses aggregate counts rather than fetching every application row — the
// pipeline can queue thousands of listings, and pulling them all (with joined
// job descriptions) into JSON on every dashboard load doesn't scale.
export async function GET() {
  const profile = await requireUser();
  if (!profile) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const grouped = await prisma.application.groupBy({
    by: ["status"],
    where: { userId: profile.id },
    _count: { _all: true },
  });

  const funnel = Object.fromEntries(
    STATUS_ORDER.map((s) => [s, 0])
  ) as Record<Status, number>;
  for (const g of grouped) funnel[g.status] = g._count._all;

  const todayStart = startOfDay(new Date());
  const appliedToday = await prisma.application.count({
    where: { userId: profile.id, appliedAt: { gte: todayStart } },
  });

  const dueFollowUps = await prisma.application.findMany({
    where: {
      userId: profile.id,
      status: "applied",
      followUpDate: { lte: new Date() },
    },
    include: { jobListing: true },
    orderBy: { followUpDate: "asc" },
    take: 50,
  });
  const followUps = dueFollowUps.map((a) => ({
    applicationId: a.id,
    job: serializeJob(a.jobListing),
    followUpDate: a.followUpDate?.toISOString() ?? null,
    appliedAt: a.appliedAt?.toISOString() ?? null,
  }));

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
    scheduleEnabled: profile.scheduleEnabled,
    scheduleTimes: profile.scheduleTimes,
    nextRun: profile.scheduleEnabled
      ? nextRunLabel(profile.scheduleTimes)
      : null,
  });
}
