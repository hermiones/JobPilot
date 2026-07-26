import { NextResponse } from "next/server";
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth/requireUser";

const PAGE_WIDTH = 612; // US Letter, points
const PAGE_HEIGHT = 792;
const MARGIN = 64;
const FONT_SIZE = 11;
const LINE_HEIGHT = 16;

function wrapLine(text: string, font: import("pdf-lib").PDFFont, maxWidth: number): string[] {
  const words = text.split(" ");
  const lines: string[] = [];
  let current = "";
  for (const word of words) {
    const candidate = current ? `${current} ${word}` : word;
    if (font.widthOfTextAtSize(candidate, FONT_SIZE) > maxWidth && current) {
      lines.push(current);
      current = word;
    } else {
      current = candidate;
    }
  }
  lines.push(current);
  return lines;
}

// GET /api/applications/[id]/cover-letter/pdf — Pro-only: render the cover
// letter snapshot for this application as a downloadable PDF.
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const profile = await requireUser();
  if (!profile) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  if (profile.plan !== "pro") {
    return NextResponse.json(
      { error: "Cover letter PDF export is a Pro feature. Upgrade in Profile." },
      { status: 403 }
    );
  }

  const app = await prisma.application.findFirst({
    where: { id, userId: profile.id },
    include: { jobListing: true },
  });
  if (!app) return NextResponse.json({ error: "Application not found" }, { status: 404 });
  if (!app.coverLetterVersion?.trim()) {
    return NextResponse.json(
      { error: "No cover letter generated for this application yet." },
      { status: 400 }
    );
  }

  const pdf = await PDFDocument.create();
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  const maxWidth = PAGE_WIDTH - MARGIN * 2;

  const paragraphs = app.coverLetterVersion.split("\n");
  const lines = paragraphs.flatMap((p) => (p.trim() ? wrapLine(p, font, maxWidth) : [""]));

  let page = pdf.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
  let y = PAGE_HEIGHT - MARGIN;

  for (const line of lines) {
    if (y < MARGIN) {
      page = pdf.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
      y = PAGE_HEIGHT - MARGIN;
    }
    page.drawText(line, {
      x: MARGIN,
      y,
      size: FONT_SIZE,
      font,
      color: rgb(0.1, 0.1, 0.12),
    });
    y -= LINE_HEIGHT;
  }

  const bytes = await pdf.save();
  const filename = `cover-letter-${app.jobListing.company.replace(/[^a-z0-9]+/gi, "-")}.pdf`;

  return new NextResponse(Buffer.from(bytes), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
