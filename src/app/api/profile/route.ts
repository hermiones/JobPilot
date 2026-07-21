import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth/requireUser";
import { parseUser } from "@/lib/profile";

export async function GET() {
  const profile = await requireUser();
  if (!profile) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  return NextResponse.json(profile);
}

export async function PUT(req: Request) {
  const profile = await requireUser();
  if (!profile) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();

  const data: Record<string, unknown> = {};
  if (typeof body.masterResume === "string")
    data.masterResume = body.masterResume;
  if (Array.isArray(body.coverLetterTemplates))
    data.coverLetterTemplates = JSON.stringify(body.coverLetterTemplates);
  if (Array.isArray(body.targetRoles))
    data.targetRoles = JSON.stringify(body.targetRoles);
  if (Array.isArray(body.targetLocations))
    data.targetLocations = JSON.stringify(body.targetLocations);
  if (Array.isArray(body.excludedCompanies))
    data.excludedCompanies = JSON.stringify(body.excludedCompanies);
  if (body.salaryFloor === null || typeof body.salaryFloor === "number")
    data.salaryFloor = body.salaryFloor;
  if (typeof body.dailyGoal === "number") data.dailyGoal = body.dailyGoal;
  if (typeof body.scheduleEnabled === "boolean")
    data.scheduleEnabled = body.scheduleEnabled;
  if (Array.isArray(body.scheduleTimes))
    data.scheduleTimes = JSON.stringify(
      body.scheduleTimes.filter((t: unknown) => typeof t === "string")
    );
  if (typeof body.masterResumeFileName === "string" || body.masterResumeFileName === null)
    data.masterResumeFileName = body.masterResumeFileName;
  if (typeof body.masterResumeFileData === "string" || body.masterResumeFileData === null)
    data.masterResumeFileData = body.masterResumeFileData;

  const updated = await prisma.user.update({
    where: { id: profile.id },
    data,
  });

  return NextResponse.json(parseUser(updated));
}
