import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth/requireUser";
import { generateVariant } from "@/lib/ai/generateVariant";
import { classifyAiError, PROVIDER_LABELS } from "@/lib/ai/errors";
import { isProviderId } from "@/lib/ai/providers";

// POST /api/tailor — generate (or regenerate) the primary "A" variant for an
// application and mark it selected. Body: { applicationId, tone? }
export async function POST(req: Request) {
  const profile = await requireUser();
  if (!profile) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const { applicationId, tone } = body as {
    applicationId?: string;
    tone?: string;
  };

  if (!applicationId) {
    return NextResponse.json(
      { error: "applicationId is required" },
      { status: 400 }
    );
  }

  const app = await prisma.application.findFirst({
    where: { id: applicationId, userId: profile.id },
    include: { jobListing: true },
  });
  if (!app) {
    return NextResponse.json({ error: "Application not found" }, { status: 404 });
  }

  if (!profile.masterResume.trim()) {
    return NextResponse.json(
      { error: "Add your master resume in Profile before tailoring." },
      { status: 400 }
    );
  }

  try {
    const { result } = await generateVariant(profile, app, { label: "A", tone });
    return NextResponse.json(result);
  } catch (e) {
    const provider = isProviderId(profile.preferredProvider) ? profile.preferredProvider : "gemini";
    return NextResponse.json(
      { error: classifyAiError(e, PROVIDER_LABELS[provider] ?? provider) },
      { status: 502 }
    );
  }
}
