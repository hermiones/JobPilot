import { NextResponse } from "next/server";
import { addDays } from "date-fns";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth/requireUser";
import { serializeApplication } from "@/lib/serialize";

const VALID_STATUS = [
  "queued",
  "approved",
  "applied",
  "responded",
  "interview",
  "rejected",
  "offer",
] as const;

type Status = (typeof VALID_STATUS)[number];

// PATCH /api/applications/[id] — update status/notes/follow-up. Moving to
// "applied" stamps appliedAt and a +7 day follow-up date if unset.
export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await req.json();
  const profile = await requireUser();
  if (!profile) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const existing = await prisma.application.findFirst({
    where: { id, userId: profile.id },
  });
  if (!existing) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const data: Record<string, unknown> = {};

  if (body.status !== undefined) {
    if (!VALID_STATUS.includes(body.status as Status)) {
      return NextResponse.json({ error: "Invalid status" }, { status: 400 });
    }
    data.status = body.status;
    if (body.status === "applied" && !existing.appliedAt) {
      data.appliedAt = new Date();
      if (!existing.followUpDate) {
        data.followUpDate = addDays(new Date(), 7);
      }
    }
  }

  if (typeof body.notes === "string") data.notes = body.notes;
  if (body.followUpDate !== undefined) {
    data.followUpDate = body.followUpDate ? new Date(body.followUpDate) : null;
  }

  const updated = await prisma.application.update({
    where: { id },
    data,
  });

  return NextResponse.json(serializeApplication(updated));
}

// DELETE /api/applications/[id] — remove an application (e.g. skip from queue).
export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const profile = await requireUser();
  if (!profile) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const existing = await prisma.application.findFirst({
    where: { id, userId: profile.id },
  });
  if (!existing) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  await prisma.application.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
