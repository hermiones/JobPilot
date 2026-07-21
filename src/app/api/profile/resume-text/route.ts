import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth/requireUser";

const MAX_BYTES = 5 * 1024 * 1024; // 5 MB

// POST /api/profile/resume-text — extract plain text from an uploaded resume
// file (PDF/DOCX/TXT) so scoring and AI tailoring — which only read the plain
// text master resume field — actually see what the user uploaded, instead of
// silently working off an empty field.
export async function POST(req: Request) {
  const user = await requireUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const form = await req.formData();
  const file = form.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "No file provided" }, { status: 400 });
  }
  if (file.size > MAX_BYTES) {
    return NextResponse.json({ error: "File too large (max 5 MB)" }, { status: 413 });
  }

  const buf = Buffer.from(await file.arrayBuffer());
  const name = file.name.toLowerCase();

  try {
    let text = "";

    if (name.endsWith(".pdf")) {
      // unpdf runs pdfjs-dist's worker inline in the main thread instead of
      // dynamically importing a separate worker file — pdf-parse's approach
      // to that dynamic import doesn't survive Turbopack's bundling.
      const { extractText, getDocumentProxy } = await import("unpdf");
      const pdf = await getDocumentProxy(new Uint8Array(buf));
      const { text: pages } = await extractText(pdf, { mergePages: true });
      text = Array.isArray(pages) ? pages.join("\n") : pages;
    } else if (name.endsWith(".docx")) {
      const mammoth = await import("mammoth");
      const result = await mammoth.extractRawText({ buffer: buf });
      text = result.value;
    } else if (name.endsWith(".txt")) {
      text = buf.toString("utf-8");
    } else if (name.endsWith(".doc")) {
      return NextResponse.json(
        {
          error:
            "Legacy .doc files can't be parsed automatically — please save it as .docx or .pdf and re-upload, or paste the text in manually.",
        },
        { status: 422 }
      );
    } else {
      return NextResponse.json(
        { error: "Unsupported file type for text extraction." },
        { status: 422 }
      );
    }

    text = text.trim();
    if (!text) {
      return NextResponse.json(
        { error: "Couldn't find any text in that file — it may be a scanned image. Paste your resume text manually instead." },
        { status: 422 }
      );
    }

    return NextResponse.json({ text });
  } catch (e) {
    return NextResponse.json(
      { error: `Couldn't read that file: ${(e as Error).message}` },
      { status: 422 }
    );
  }
}
