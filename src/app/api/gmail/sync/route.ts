import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth/requireUser";
import { syncGmailForUser } from "@/lib/gmailSync";

// POST /api/gmail/sync — manually trigger a Gmail check for the current
// user's applied jobs (also runs automatically on the scheduler if
// automation is enabled — see src/lib/pipeline.ts).
export async function POST() {
  const profile = await requireUser();
  if (!profile) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const result = await syncGmailForUser(profile.id);
  if (result.error) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }
  return NextResponse.json(result);
}
