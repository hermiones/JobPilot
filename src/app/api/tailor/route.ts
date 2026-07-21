import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getOrCreateDefaultUser } from "@/lib/user";
import { tailorApplication } from "@/lib/ai/tailor";

// POST /api/tailor — generate tailored resume bullets + cover letter for an
// application via Gemini and persist snapshots. Body: { applicationId, tone? }
export async function POST(req: Request) {
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

  const profile = await getOrCreateDefaultUser();

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

  try {
    const result = await tailorApplication({
      masterResume: profile.masterResume,
      coverLetterTone: tone ?? template?.tone,
      coverLetterTemplate: template?.body,
      jobTitle: app.jobListing.title,
      company: app.jobListing.company,
      jobDescription: app.jobListing.description,
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
      { error: `Gemini tailoring failed: ${(e as Error).message}` },
      { status: 502 }
    );
  }
}
