import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth/requireUser";

const MAX_BYTES = 5 * 1024 * 1024; // 5 MB

// POST /api/applications/[id]/resume — attach a resume file to this application.
// Accepts multipart/form-data with a `file` field.
export async function POST(
  req: Request,
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

  const form = await req.formData();
  const file = form.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "No file provided" }, { status: 400 });
  }
  if (file.size > MAX_BYTES) {
    return NextResponse.json(
      { error: "File too large (max 5 MB)" },
      { status: 413 }
    );
  }

  const buf = Buffer.from(await file.arrayBuffer());
  await prisma.application.update({
    where: { id },
    data: {
      attachedResumeName: file.name,
      attachedResumeData: buf.toString("base64"),
    },
  });

  return NextResponse.json({ attachedResumeName: file.name });
}

// GET /api/applications/[id]/resume — download the attached resume.
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const profile = await requireUser();
  if (!profile) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const app = await prisma.application.findFirst({
    where: { id, userId: profile.id },
  });
  if (!app || !app.attachedResumeData) {
    return NextResponse.json({ error: "No resume attached" }, { status: 404 });
  }

  const buf = Buffer.from(app.attachedResumeData, "base64");
  const name = app.attachedResumeName ?? "resume";
  return new Response(new Uint8Array(buf), {
    headers: {
      "Content-Type": "application/octet-stream",
      "Content-Disposition": `attachment; filename="${name}"`,
    },
  });
}

// DELETE /api/applications/[id]/resume — remove the attached resume.
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
  await prisma.application.update({
    where: { id },
    data: { attachedResumeName: null, attachedResumeData: null },
  });
  return NextResponse.json({ ok: true });
}
