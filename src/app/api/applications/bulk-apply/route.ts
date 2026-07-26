import { NextResponse } from "next/server";
import { addDays } from "date-fns";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth/requireUser";
import { maybeActivateProOnFirstApplication } from "@/lib/user";

// POST /api/applications/bulk-apply — mark many queued/approved applications
// as "applied" in one shot, for the Easy Apply fast lane (no per-job AI
// tailoring review needed). Body: { ids: string[] }
export async function POST(req: Request) {
  const profile = await requireUser();
  if (!profile) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const ids = Array.isArray(body.ids)
    ? body.ids.filter((id: unknown): id is string => typeof id === "string")
    : [];
  if (ids.length === 0) {
    return NextResponse.json({ error: "ids is required" }, { status: 400 });
  }

  const now = new Date();
  const followUpDate = addDays(now, 7);

  const result = await prisma.application.updateMany({
    where: { id: { in: ids }, userId: profile.id, appliedAt: null },
    data: { status: "applied", appliedAt: now, followUpDate },
  });

  if (result.count > 0) {
    await maybeActivateProOnFirstApplication(profile.id);
  }

  return NextResponse.json({ applied: result.count });
}
