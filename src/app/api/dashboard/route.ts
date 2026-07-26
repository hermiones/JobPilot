import { NextResponse } from "next/server";
import { startOfDay, subDays, differenceInCalendarDays } from "date-fns";
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

  const daysSinceStart = Math.max(
    0,
    differenceInCalendarDays(new Date(), profile.createdAt)
  );

  const weekAgo = subDays(new Date(), 7);
  const weeklyApplied = await prisma.application.count({
    where: { userId: profile.id, appliedAt: { gte: weekAgo } },
  });

  // Community benchmark: platform-wide applications in the last 7 days,
  // spread across everyone who has ever applied to at least one job — a
  // rough "how does my pace compare" signal, no other user's data exposed.
  const [platformWeeklyApplied, activeJobSeekers] = await Promise.all([
    prisma.application.count({ where: { appliedAt: { gte: weekAgo } } }),
    prisma.application
      .groupBy({ by: ["userId"], where: { appliedAt: { not: null } } })
      .then((g) => g.length),
  ]);
  const communityAvgWeekly =
    activeJobSeekers > 0 ? Math.round(platformWeeklyApplied / activeJobSeekers) : 0;

  // Application streak: consecutive days (walking back from today) with at
  // least one application. Breaks on the first gap day.
  const recentApplied = await prisma.application.findMany({
    where: { userId: profile.id, appliedAt: { not: null } },
    select: { appliedAt: true },
    orderBy: { appliedAt: "desc" },
    take: 500,
  });
  const appliedDays = new Set(
    recentApplied.map((a) => startOfDay(a.appliedAt as Date).getTime())
  );
  let streakDays = 0;
  const cursor = startOfDay(new Date());
  // Today doesn't have to have an application yet for the streak to still be
  // "alive" — only check from yesterday backward if today is empty.
  if (!appliedDays.has(cursor.getTime())) {
    cursor.setDate(cursor.getDate() - 1);
  }
  while (appliedDays.has(cursor.getTime())) {
    streakDays += 1;
    cursor.setDate(cursor.getDate() - 1);
  }

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
    daysSinceStart,
    weeklyApplied,
    communityAvgWeekly,
    streakDays,
  });
}
