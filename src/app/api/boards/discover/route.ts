import { NextResponse } from "next/server";
import { discoverBoards, CANDIDATE_POOL } from "@/lib/jobSources/discovery";
import { requireAdmin } from "@/lib/auth/requireAdmin";

const MAX_CUSTOM_SLUGS = 50;

// POST /api/boards/discover — probe candidate company slugs against the public
// Greenhouse/Lever APIs and save the live ones. Body (optional):
// { slugs?: string[] } — custom company names/slugs to probe. Falls back to the
// curated candidate pool when omitted. Admin-only: this mutates the shared
// board pool that every user's queue draws from.
export async function POST(req: Request) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  let candidates = CANDIDATE_POOL;
  try {
    const body = await req.json();
    if (Array.isArray(body.slugs) && body.slugs.length) {
      candidates = body.slugs
        .map((s: string) => String(s).trim())
        .filter(Boolean)
        .slice(0, MAX_CUSTOM_SLUGS)
        .map((slug: string) => ({ slug }));
    }
  } catch {
    // no body — use the pool
  }

  const result = await discoverBoards(candidates);
  return NextResponse.json(result);
}
