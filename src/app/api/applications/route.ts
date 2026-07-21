import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getOrCreateDefaultUser } from "@/lib/user";
import {
  serializeApplication,
  serializeJob,
  serializeMatch,
} from "@/lib/serialize";

// GET /api/applications — every application for the tracker, newest first.
export async function GET() {
  const profile = await getOrCreateDefaultUser();

  const apps = await prisma.application.findMany({
    where: { userId: profile.id },
    include: { jobListing: true },
    orderBy: { lastUpdated: "desc" },
  });

  const matches = await prisma.match.findMany({
    where: { userId: profile.id },
  });
  const matchByJob = new Map(matches.map((m) => [m.jobListingId, m]));

  const items = apps.map((app) => ({
    application: serializeApplication(app),
    job: serializeJob(app.jobListing),
    match: matchByJob.has(app.jobListingId)
      ? serializeMatch(matchByJob.get(app.jobListingId)!)
      : null,
  }));

  return NextResponse.json({ items });
}
