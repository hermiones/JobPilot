import { NextResponse } from "next/server";
import { aggregateJobs } from "@/lib/jobSources";
import { requireUser } from "@/lib/auth/requireUser";

const MAX_CUSTOM_BOARDS = 50;

// POST /api/jobs/refresh — pull fresh listings from configured public sources.
// Body (optional, admin-only): { greenhouseBoards?: string[], leverHandles?: string[], includeRemoteOk?: boolean }
// Any signed-in user can trigger a refresh (it benefits the shared job pool),
// but only admins may override which boards get hit — otherwise this would
// let any account pass an unbounded slug list and fan out unlimited outbound
// requests against Greenhouse/Lever on every click.
export async function POST(req: Request) {
  const profile = await requireUser();
  if (!profile) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let opts: {
    greenhouseBoards?: string[];
    leverHandles?: string[];
    includeRemoteOk?: boolean;
  } = {};
  try {
    const body = await req.json();
    if (profile.isAdmin) {
      opts = {
        greenhouseBoards: Array.isArray(body.greenhouseBoards)
          ? body.greenhouseBoards.slice(0, MAX_CUSTOM_BOARDS)
          : undefined,
        leverHandles: Array.isArray(body.leverHandles)
          ? body.leverHandles.slice(0, MAX_CUSTOM_BOARDS)
          : undefined,
        includeRemoteOk:
          typeof body.includeRemoteOk === "boolean" ? body.includeRemoteOk : undefined,
      };
    }
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
