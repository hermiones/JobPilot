import { prisma } from "@/lib/prisma";
import { getOrCreateDefaultUser } from "@/lib/user";

function csvCell(value: unknown): string {
  const s = value == null ? "" : String(value);
  if (/[",\n]/.test(s)) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

// GET /api/export — CSV of the full application log.
export async function GET() {
  const profile = await getOrCreateDefaultUser();
  const apps = await prisma.application.findMany({
    where: { userId: profile.id },
    include: { jobListing: true },
    orderBy: { createdAt: "desc" },
  });

  const header = [
    "company",
    "role",
    "location",
    "source",
    "status",
    "applied_at",
    "follow_up_date",
    "url",
    "notes",
  ];

  const rows = apps.map((a) =>
    [
      a.jobListing.company,
      a.jobListing.title,
      a.jobListing.location ?? "",
      a.jobListing.source,
      a.status,
      a.appliedAt?.toISOString() ?? "",
      a.followUpDate?.toISOString() ?? "",
      a.jobListing.url,
      a.notes ?? "",
    ]
      .map(csvCell)
      .join(",")
  );

  const csv = [header.join(","), ...rows].join("\n");

  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="job-pilot-applications.csv"`,
    },
  });
}
