import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth/requireUser";
import { serializeApplication } from "@/lib/serialize";

// POST /api/tailor/select — switch which variant is "active" for an
// application (shown in the review UI, and used if approved right now).
// Body: { applicationId, variantId }
export async function POST(req: Request) {
  const profile = await requireUser();
  if (!profile) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const { applicationId, variantId } = body as {
    applicationId?: string;
    variantId?: string;
  };
  if (!applicationId || !variantId) {
    return NextResponse.json(
      { error: "applicationId and variantId are required" },
      { status: 400 }
    );
  }

  const app = await prisma.application.findFirst({
    where: { id: applicationId, userId: profile.id },
  });
  if (!app) return NextResponse.json({ error: "Application not found" }, { status: 404 });

  const variant = await prisma.applicationVariant.findFirst({
    where: { id: variantId, applicationId },
  });
  if (!variant) return NextResponse.json({ error: "Variant not found" }, { status: 404 });

  const updated = await prisma.application.update({
    where: { id: applicationId },
    data: {
      selectedVariantId: variant.id,
      resumeVersion: variant.resumeVersion,
      coverLetterVersion: variant.coverLetterVersion,
    },
  });

  return NextResponse.json(serializeApplication(updated));
}
