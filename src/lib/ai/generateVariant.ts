import { prisma } from "@/lib/prisma";
import type { ParsedProfile } from "@/lib/profile";
import type { Application, JobListing } from "@prisma/client";
import { tailorApplication, type TailorResult } from "@/lib/ai/tailor";
import { isProviderId } from "@/lib/ai/providers";
import { canUseQualityModel } from "@/lib/plan";

// Generates (or regenerates) one labeled cover-letter variant for an
// application, persists it, and marks it as the currently selected variant —
// shared by the single-variant /api/tailor route and the multi-variant
// (Pro plan A/B/C) /api/tailor/variants route. resumeVersion is kept as an
// empty string — tailoring only writes cover letters now, not resume text.
export async function generateVariant(
  profile: ParsedProfile,
  app: Application & { jobListing: JobListing },
  opts: { label: string; tone?: string }
): Promise<{ result: TailorResult; variantId: string }> {
  const template =
    profile.coverLetterTemplates.find((t) => t.tone === opts.tone) ??
    profile.coverLetterTemplates[0];

  const provider = isProviderId(profile.preferredProvider)
    ? profile.preferredProvider
    : "gemini";
  const apiKey = profile.apiKeys.find((k) => k.provider === provider)?.key;

  const result = await tailorApplication({
    masterResume: profile.masterResume,
    coverLetterTone: opts.tone ?? template?.tone,
    coverLetterTemplate: template?.body,
    jobTitle: app.jobListing.title,
    company: app.jobListing.company,
    jobDescription: app.jobListing.description,
    provider,
    apiKey,
    quality: canUseQualityModel(profile.plan),
  });

  const variant = await prisma.applicationVariant.upsert({
    where: { applicationId_label: { applicationId: app.id, label: opts.label } },
    create: {
      applicationId: app.id,
      label: opts.label,
      tone: opts.tone ?? template?.tone ?? null,
      resumeVersion: "",
      coverLetterVersion: result.coverLetter,
    },
    update: {
      tone: opts.tone ?? template?.tone ?? null,
      coverLetterVersion: result.coverLetter,
    },
  });

  await prisma.application.update({
    where: { id: app.id },
    data: {
      selectedVariantId: variant.id,
      coverLetterVersion: result.coverLetter,
    },
  });

  return { result, variantId: variant.id };
}
