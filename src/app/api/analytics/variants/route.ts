import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth/requireUser";

const POSITIVE_STATUSES = new Set(["responded", "interview", "offer"]);

// GET /api/analytics/variants — response rate per resume variant label (A/B/C)
// across all of this user's applications, attributed at the moment each was
// marked "applied" (see appliedVariantLabel).
export async function GET() {
  const profile = await requireUser();
  if (!profile) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const grouped = await prisma.application.groupBy({
    by: ["appliedVariantLabel", "status"],
    where: { userId: profile.id, appliedVariantLabel: { not: null } },
    _count: { _all: true },
  });

  const byLabel = new Map<string, { applied: number; responded: number }>();
  for (const g of grouped) {
    const label = g.appliedVariantLabel as string;
    const entry = byLabel.get(label) ?? { applied: 0, responded: 0 };
    entry.applied += g._count._all;
    if (POSITIVE_STATUSES.has(g.status)) entry.responded += g._count._all;
    byLabel.set(label, entry);
  }

  const entries = Array.from(byLabel.entries())
    .map(([label, v]) => ({
      label,
      applied: v.applied,
      responded: v.responded,
      responseRate: v.applied > 0 ? v.responded / v.applied : 0,
    }))
    .sort((a, b) => a.label.localeCompare(b.label));

  return NextResponse.json({ entries });
}
