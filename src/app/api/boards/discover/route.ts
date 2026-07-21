import { NextResponse } from "next/server";
import { discoverBoards, CANDIDATE_POOL } from "@/lib/jobSources/discovery";

// POST /api/boards/discover — probe candidate company slugs against the public
// Greenhouse/Lever APIs and save the live ones. Body (optional):
// { slugs?: string[] } — custom company names/slugs to probe. Falls back to the
// curated candidate pool when omitted.
export async function POST(req: Request) {
  let candidates = CANDIDATE_POOL;
  try {
    const body = await req.json();
    if (Array.isArray(body.slugs) && body.slugs.length) {
      candidates = body.slugs
        .map((s: string) => String(s).trim())
        .filter(Boolean)
        .map((slug: string) => ({ slug }));
    }
  } catch {
    // no body — use the pool
  }

  const result = await discoverBoards(candidates);
  return NextResponse.json(result);
}
