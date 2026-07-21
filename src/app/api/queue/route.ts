import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth/requireUser";
import type { Status } from "@/lib/statusMeta";

// A queue can realistically hold thousands of matched listings once several
// boards are active. Rather than fetching every row (job descriptions included)
// and sorting in JS, sort and cap at the DB level with a single joined query.
const QUEUE_LIMIT = 150;

type QueueRow = {
  appId: string;
  status: Status;
  resumeVersion: string | null;
  coverLetterVersion: string | null;
  attachedResumeName: string | null;
  appliedAt: Date | null;
  lastUpdated: Date;
  notes: string | null;
  followUpDate: Date | null;
  appCreatedAt: Date;
  jobId: string;
  source: string;
  title: string;
  company: string;
  location: string | null;
  url: string;
  description: string;
  postedDate: Date | null;
  salaryRange: string | null;
  fetchedAt: Date;
  relevanceScore: number | null;
  reasons: string | null;
};

// GET /api/queue — ranked review queue: queued/approved applications joined
// with their listing and match score, highest relevance first.
export async function GET() {
  const profile = await requireUser();
  if (!profile) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const rows = await prisma.$queryRaw<QueueRow[]>`
    SELECT
      a.id AS "appId", a.status, a."resumeVersion", a."coverLetterVersion",
      a."attachedResumeName", a."appliedAt", a."lastUpdated", a.notes,
      a."followUpDate", a."createdAt" AS "appCreatedAt",
      jl.id AS "jobId", jl.source, jl.title, jl.company, jl.location, jl.url,
      jl.description, jl."postedDate", jl."salaryRange", jl."fetchedAt",
      m."relevanceScore", m.reasons
    FROM "Application" a
    JOIN "JobListing" jl ON jl.id = a."jobListingId"
    LEFT JOIN "Match" m ON m."jobListingId" = a."jobListingId" AND m."userId" = a."userId"
    WHERE a."userId" = ${profile.id} AND a.status IN ('queued', 'approved')
    ORDER BY m."relevanceScore" DESC NULLS LAST
    LIMIT ${QUEUE_LIMIT}
  `;

  const items = rows.map((r) => {
    let reasons: string[] = [];
    try {
      reasons = r.reasons ? JSON.parse(r.reasons) : [];
    } catch {
      reasons = [];
    }
    return {
      application: {
        id: r.appId,
        status: r.status,
        resumeVersion: r.resumeVersion,
        coverLetterVersion: r.coverLetterVersion,
        attachedResumeName: r.attachedResumeName,
        appliedAt: r.appliedAt?.toISOString() ?? null,
        followUpDate: r.followUpDate?.toISOString() ?? null,
        lastUpdated: r.lastUpdated.toISOString(),
        createdAt: r.appCreatedAt.toISOString(),
        notes: r.notes,
      },
      job: {
        id: r.jobId,
        source: r.source,
        title: r.title,
        company: r.company,
        location: r.location,
        url: r.url,
        description: r.description,
        postedDate: r.postedDate?.toISOString() ?? null,
        salaryRange: r.salaryRange,
        fetchedAt: r.fetchedAt.toISOString(),
      },
      match:
        r.relevanceScore != null
          ? { id: "", relevanceScore: r.relevanceScore, reasons }
          : null,
    };
  });

  return NextResponse.json({ items, limit: QUEUE_LIMIT });
}
