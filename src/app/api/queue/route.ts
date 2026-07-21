import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getOrCreateDefaultUser } from "@/lib/user";
import {
  serializeApplication,
  serializeJob,
  serializeMatch,
} from "@/lib/serialize";

// GET /api/queue — ranked review queue: queued/approved applications joined
// with their listing and match score, highest relevance first.
export async function GET() {
  const profile = await getOrCreateDefaultUser();

  const apps = await prisma.application.findMany({
    where: { userId: profile.id, status: { in: ["queued", "approved"] } },
    include: { jobListing: true },
  });

  const matches = await prisma.match.findMany({
    where: { userId: profile.id },
  });
  const matchByJob = new Map(matches.map((m) => [m.jobListingId, m]));

  const items = apps
    .map((app) => {
      const match = matchByJob.get(app.jobListingId);
      return {
        application: serializeApplication(app),
        job: serializeJob(app.jobListing),
        match: match ? serializeMatch(match) : null,
      };
    })
    .sort(
      (a, b) =>
        (b.match?.relevanceScore ?? 0) - (a.match?.relevanceScore ?? 0)
    );

  return NextResponse.json({ items });
}
