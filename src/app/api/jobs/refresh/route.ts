import { NextResponse } from "next/server";
import { aggregateJobs } from "@/lib/jobSources";

// POST /api/jobs/refresh — pull fresh listings from configured public sources.
// Body (optional): { greenhouseBoards?: string[], leverHandles?: string[], includeRemoteOk?: boolean }
export async function POST(req: Request) {
  let opts = {};
  try {
    opts = await req.json();
  } catch {
    // empty body is fine — use defaults
  }

  try {
    const result = await aggregateJobs(opts);
    return NextResponse.json(result);
  } catch (e) {
    return NextResponse.json(
      { error: (e as Error).message },
      { status: 500 }
    );
  }
}
