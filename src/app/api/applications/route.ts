import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth/requireUser";
import {
  serializeApplication,
  serializeJob,
  serializeMatch,
} from "@/lib/serialize";
import { STATUS_ORDER, type Status } from "@/lib/statusMeta";

const TRACKER_LIMIT = 300;

// GET /api/applications?status=applied — applications for the tracker, newest
// first. Filtering happens server-side (not by fetching everything into the
// browser) since the queue can hold thousands of rows once several boards are
// active. `counts` gives accurate per-status totals for the filter chips even
// though `items` is capped.
export async function GET(req: Request) {
  const profile = await requireUser();
  if (!profile) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const url = new URL(req.url);
  const statusParam = url.searchParams.get("status");
  const status =
    statusParam && (STATUS_ORDER as readonly string[]).includes(statusParam)
      ? (statusParam as Status)
      : null;
  const q = url.searchParams.get("q")?.trim().slice(0, 200) || null;

  const searchWhere = q
    ? {
        jobListing: {
          OR: [
            { title: { contains: q, mode: "insensitive" as const } },
            { company: { contains: q, mode: "insensitive" as const } },
          ],
        },
      }
    : {};

  const [apps, grouped, matchedTotal] = await Promise.all([
    prisma.application.findMany({
      where: { userId: profile.id, ...(status ? { status } : {}), ...searchWhere },
      include: { jobListing: true },
      orderBy: { lastUpdated: "desc" },
      take: TRACKER_LIMIT,
    }),
    // Unfiltered by `q` on purpose — the status chip counts (and the overall
    // "N applications" header) reflect everything, not just the current
    // search, so search doesn't make the surrounding context disappear.
    prisma.application.groupBy({
      by: ["status"],
      where: { userId: profile.id },
      _count: { _all: true },
    }),
    q
      ? prisma.application.count({
          where: { userId: profile.id, ...(status ? { status } : {}), ...searchWhere },
        })
      : Promise.resolve(null),
  ]);

  const counts = Object.fromEntries(
    STATUS_ORDER.map((s) => [s, 0])
  ) as Record<Status, number>;
  for (const g of grouped) counts[g.status] = g._count._all;
  const total = Object.values(counts).reduce((a, b) => a + b, 0);

  const jobIds = apps.map((a) => a.jobListingId);
  const matches = jobIds.length
    ? await prisma.match.findMany({
        where: { userId: profile.id, jobListingId: { in: jobIds } },
      })
    : [];
  const matchByJob = new Map(matches.map((m) => [m.jobListingId, m]));

  const items = apps.map((app) => ({
    application: serializeApplication(app),
    job: serializeJob(app.jobListing),
    match: matchByJob.has(app.jobListingId)
      ? serializeMatch(matchByJob.get(app.jobListingId)!)
      : null,
  }));

  return NextResponse.json({
    items,
    counts,
    total,
    limit: TRACKER_LIMIT,
    matchedTotal, // null when not searching; the true count of q-matching rows otherwise
  });
}
