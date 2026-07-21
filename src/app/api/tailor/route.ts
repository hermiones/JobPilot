import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth/requireUser";
import { tailorApplication } from "@/lib/ai/tailor";
import { isProviderId } from "@/lib/ai/providers";

// POST /api/tailor — generate tailored resume bullets + cover letter for an
// application via Gemini and persist snapshots. Body: { applicationId, tone? }
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

  const template =
    profile.coverLetterTemplates.find((t) => t.tone === tone) ??
    profile.coverLetterTemplates[0];

  const provider = isProviderId(profile.preferredProvider)
    ? profile.preferredProvider
    : "gemini";
  const apiKey = profile.apiKeys.find((k) => k.provider === provider)?.key;

  try {
    const result = await tailorApplication({
      masterResume: profile.masterResume,
      coverLetterTone: tone ?? template?.tone,
      coverLetterTemplate: template?.body,
      jobTitle: app.jobListing.title,
      company: app.jobListing.company,
      jobDescription: app.jobListing.description,
      provider,
      apiKey,
    });

    const resumeVersion = result.tailoredBullets.join("\n");

    await prisma.application.update({
      where: { id: app.id },
      data: {
        resumeVersion,
        coverLetterVersion: result.coverLetter,
      },
    });

    return NextResponse.json(result);
  } catch (e) {
    return NextResponse.json(
      { error: `AI tailoring failed: ${(e as Error).message}` },
      { status: 502 }
    );
  }
}
