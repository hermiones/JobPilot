import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth/requireUser";
import { parseUser } from "@/lib/profile";
import { isPlan, maxScheduleTimes } from "@/lib/plan";

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
  if (typeof body.plan === "string" && isPlan(body.plan)) data.plan = body.plan;

  if (Array.isArray(body.scheduleTimes)) {
    const effectivePlan =
      typeof data.plan === "string" ? data.plan : profile.plan;
    data.scheduleTimes = JSON.stringify(
      body.scheduleTimes
        .filter((t: unknown) => typeof t === "string")
        .slice(0, maxScheduleTimes(effectivePlan))
    );
  }
  if (typeof body.masterResumeFileName === "string" || body.masterResumeFileName === null)
    data.masterResumeFileName = body.masterResumeFileName;
  if (typeof body.masterResumeFileData === "string" || body.masterResumeFileData === null)
    data.masterResumeFileData = body.masterResumeFileData;
  if (Array.isArray(body.apiKeys))
    data.apiKeys = JSON.stringify(
      body.apiKeys
        .filter(
          (k: unknown): k is { provider: string; label?: string; key: string } =>
            !!k &&
            typeof (k as { provider?: unknown }).provider === "string" &&
            typeof (k as { key?: unknown }).key === "string"
        )
        .map((k: { provider: string; label?: string; key: string }) => ({
          provider: k.provider,
          label: k.label ?? "",
          key: k.key,
        }))
    );
  if (typeof body.preferredProvider === "string")
    data.preferredProvider = body.preferredProvider;

  // Auto-approve is a Pro-only automation gate — a free-plan account can't
  // enable it even if it sneaks a truthy value into the request body.
  const effectivePlanForAutoApprove =
    typeof data.plan === "string" ? data.plan : profile.plan;
  if (typeof body.autoApproveEnabled === "boolean") {
    data.autoApproveEnabled =
      body.autoApproveEnabled && effectivePlanForAutoApprove === "pro";
  }
  if (typeof body.autoApproveMinScore === "number")
    data.autoApproveMinScore = Math.max(0, Math.min(100, body.autoApproveMinScore));
  if (typeof body.autoApproveMaxPerRun === "number")
    data.autoApproveMaxPerRun = Math.max(1, Math.min(50, body.autoApproveMaxPerRun));

  if (Array.isArray(body.codingProfiles))
    data.codingProfiles = JSON.stringify(
      body.codingProfiles
        .filter(
          (p: unknown): p is { platform: string; url: string } =>
            !!p &&
            typeof (p as { platform?: unknown }).platform === "string" &&
            typeof (p as { url?: unknown }).url === "string"
        )
        .slice(0, 10)
        .map((p: { platform: string; url: string }) => ({
          platform: p.platform,
          url: p.url,
        }))
    );

  const updated = await prisma.user.update({
    where: { id: profile.id },
    data,
  });

  return NextResponse.json(parseUser(updated));
}
