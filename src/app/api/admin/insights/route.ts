import { NextResponse } from "next/server";
import { startOfDay, subDays, format } from "date-fns";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth/requireAdmin";
import { STATUS_ORDER, type Status } from "@/lib/statusMeta";

const POSITIVE_STATUSES = new Set(["responded", "interview", "offer"]);

// GET /api/admin/insights — app-wide analytics for the admin panel. All
// queries are aggregate-only (counts/groupBy), never per-row data dumps.
export async function GET() {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const [
    totalUsers,
    usersByPlan,
    totalApplications,
    applicationsByStatus,
    totalJobListings,
    totalBoards,
    activeBoards,
    topCompanies,
    referredSignups,
    proViaReferral,
    variantsByLabelStatus,
    providerDistribution,
  ] = await Promise.all([
    prisma.user.count(),
    prisma.user.groupBy({ by: ["plan"], _count: { _all: true } }),
    prisma.application.count(),
    prisma.application.groupBy({ by: ["status"], _count: { _all: true } }),
    prisma.jobListing.count(),
    prisma.board.count(),
    prisma.board.count({ where: { active: true } }),
    prisma.jobListing.groupBy({
      by: ["company"],
      _count: { _all: true },
      orderBy: { _count: { company: "desc" } },
      take: 5,
    }),
    prisma.user.count({ where: { referredById: { not: null } } }),
    prisma.user.count({
      where: { plan: "pro", referrals: { some: {} } },
    }),
    prisma.application.groupBy({
      by: ["appliedVariantLabel", "status"],
      where: { appliedVariantLabel: { not: null } },
      _count: { _all: true },
    }),
    prisma.user.groupBy({ by: ["preferredProvider"], _count: { _all: true } }),
  ]);

  // Signups per day, last 14 days.
  const since = startOfDay(subDays(new Date(), 13));
  const recentUsers = await prisma.user.findMany({
    where: { createdAt: { gte: since } },
    select: { createdAt: true },
  });
  const dayBuckets = new Map<string, number>();
  for (let i = 0; i < 14; i++) {
    dayBuckets.set(format(subDays(new Date(), 13 - i), "MMM d"), 0);
  }
  for (const u of recentUsers) {
    const key = format(u.createdAt, "MMM d");
    if (dayBuckets.has(key)) dayBuckets.set(key, (dayBuckets.get(key) ?? 0) + 1);
  }
  const signupTrend = Array.from(dayBuckets.entries()).map(([date, count]) => ({
    date,
    count,
  }));

  const funnel = Object.fromEntries(STATUS_ORDER.map((s) => [s, 0])) as Record<
    Status,
    number
  >;
  for (const g of applicationsByStatus) funnel[g.status] = g._count._all;

  const planCounts = { free: 0, pro: 0 } as Record<string, number>;
  for (const g of usersByPlan) planCounts[g.plan] = g._count._all;

  const variantByLabel = new Map<string, { applied: number; responded: number }>();
  for (const g of variantsByLabelStatus) {
    const label = g.appliedVariantLabel as string;
    const entry = variantByLabel.get(label) ?? { applied: 0, responded: 0 };
    entry.applied += g._count._all;
    if (POSITIVE_STATUSES.has(g.status)) entry.responded += g._count._all;
    variantByLabel.set(label, entry);
  }
  const variantPerformance = Array.from(variantByLabel.entries())
    .map(([label, v]) => ({
      label,
      applied: v.applied,
      responded: v.responded,
      responseRate: v.applied > 0 ? v.responded / v.applied : 0,
    }))
    .sort((a, b) => a.label.localeCompare(b.label));

  const today = startOfDay(new Date());
  const appliedToday = await prisma.application.count({
    where: { appliedAt: { gte: today } },
  });

  return NextResponse.json({
    totalUsers,
    planCounts,
    signupTrend,
    totalApplications,
    appliedToday,
    funnel,
    totalJobListings,
    totalBoards,
    activeBoards,
    topCompanies: topCompanies.map((c) => ({
      company: c.company,
      count: c._count._all,
    })),
    referral: {
      referredSignups,
      proViaReferral,
    },
    variantPerformance,
    providerDistribution: providerDistribution.map((p) => ({
      provider: p.preferredProvider,
      count: p._count._all,
    })),
  });
}
