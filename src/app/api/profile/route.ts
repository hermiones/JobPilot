import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getOrCreateDefaultUser, DEFAULT_USER_EMAIL } from "@/lib/user";

export async function GET() {
  const profile = await getOrCreateDefaultUser();
  return NextResponse.json(profile);
}

export async function PUT(req: Request) {
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

  await prisma.user.update({
    where: { email: DEFAULT_USER_EMAIL },
    data,
  });

  const profile = await getOrCreateDefaultUser();
  return NextResponse.json(profile);
}
