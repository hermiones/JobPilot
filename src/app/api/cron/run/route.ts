import { NextResponse } from "next/server";
import { runPipelineForScheduledUsers } from "@/lib/pipeline";

// POST or GET /api/cron/run — refreshes the shared job pool once, then rescores
// it for every user with automation enabled. Intended for Vercel Cron (or any
// external scheduler) — it is exempt from the session-cookie auth middleware
// (see src/middleware.ts) and instead protected by CRON_SECRET: set it and
// callers must send `Authorization: Bearer <CRON_SECRET>`.
export const maxDuration = 60;

async function handle(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (secret) {
    const auth = req.headers.get("authorization");
    if (auth !== `Bearer ${secret}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }
  const result = await runPipelineForScheduledUsers();
  return NextResponse.json({ ranAt: new Date().toISOString(), ...result });
}

export async function GET(req: Request) {
  return handle(req);
}
export async function POST(req: Request) {
  return handle(req);
}
