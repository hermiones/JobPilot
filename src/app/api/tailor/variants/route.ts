import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth/requireUser";
import { generateVariant } from "@/lib/ai/generateVariant";
import { serializeVariant } from "@/lib/serialize";
import { maxVariants, VARIANT_LABELS, VARIANT_TONES } from "@/lib/plan";
import { classifyAiError, PROVIDER_LABELS } from "@/lib/ai/errors";
import { isProviderId } from "@/lib/ai/providers";

// GET /api/tailor/variants?applicationId=... — list a Pro-plan application's
// A/B/C resume variants, plus how many more the user's plan allows.
export async function GET(req: Request) {
  const profile = await requireUser();
  if (!profile) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const applicationId = new URL(req.url).searchParams.get("applicationId");
  if (!applicationId) {
    return NextResponse.json({ error: "applicationId is required" }, { status: 400 });
  }

  const app = await prisma.application.findFirst({
    where: { id: applicationId, userId: profile.id },
  });
  if (!app) return NextResponse.json({ error: "Application not found" }, { status: 404 });

  const variants = await prisma.applicationVariant.findMany({
    where: { applicationId },
    orderBy: { label: "asc" },
  });

  return NextResponse.json({
    variants: variants.map(serializeVariant),
    selectedVariantId: app.selectedVariantId,
    maxVariants: maxVariants(profile.plan),
    plan: profile.plan,
  });
}

// POST /api/tailor/variants — generate the next labeled variant (B, C, …) for
// an application, up to the user's plan limit. Body: { applicationId, tone? }
export async function POST(req: Request) {
  const profile = await requireUser();
  if (!profile) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const { applicationId, tone } = body as { applicationId?: string; tone?: string };
  if (!applicationId) {
    return NextResponse.json({ error: "applicationId is required" }, { status: 400 });
  }

  const app = await prisma.application.findFirst({
    where: { id: applicationId, userId: profile.id },
    include: { jobListing: true },
  });
  if (!app) return NextResponse.json({ error: "Application not found" }, { status: 404 });

  if (!profile.masterResume.trim()) {
    return NextResponse.json(
      { error: "Add your master resume in Profile before tailoring." },
      { status: 400 }
    );
  }

  const existing = await prisma.applicationVariant.findMany({
    where: { applicationId },
    orderBy: { label: "asc" },
  });

  const limit = maxVariants(profile.plan);
  if (existing.length >= limit) {
    return NextResponse.json(
      {
        error:
          limit === 1
            ? "Upgrade to Pro to generate A/B resume variants."
            : `Your plan allows up to ${limit} variants per application. Upgrade to Pro for more.`,
      },
      { status: 403 }
    );
  }

  const usedLabels = new Set(existing.map((v) => v.label));
  const nextLabel = VARIANT_LABELS.find((l) => !usedLabels.has(l));
  if (!nextLabel) {
    return NextResponse.json({ error: "No more variant slots available." }, { status: 403 });
  }
  const labelIndex = VARIANT_LABELS.indexOf(nextLabel);
  const defaultTone = VARIANT_TONES[labelIndex] ?? VARIANT_TONES[0];

  try {
    await generateVariant(profile, app, { label: nextLabel, tone: tone ?? defaultTone });
  } catch (e) {
    const provider = isProviderId(profile.preferredProvider) ? profile.preferredProvider : "gemini";
    return NextResponse.json(
      { error: classifyAiError(e, PROVIDER_LABELS[provider] ?? provider) },
      { status: 502 }
    );
  }

  const variants = await prisma.applicationVariant.findMany({
    where: { applicationId },
    orderBy: { label: "asc" },
  });
  const updatedApp = await prisma.application.findUnique({ where: { id: applicationId } });

  return NextResponse.json({
    variants: variants.map(serializeVariant),
    selectedVariantId: updatedApp?.selectedVariantId ?? null,
    maxVariants: limit,
    plan: profile.plan,
  });
}
