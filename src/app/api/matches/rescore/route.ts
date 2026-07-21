import { NextResponse } from "next/server";
import { rescoreAndQueue } from "@/lib/rescore";
import { requireUser } from "@/lib/auth/requireUser";

// POST /api/matches/rescore — score every listing against the logged-in user's
// profile, store Match rows, and auto-queue Applications above the threshold.
// Body (optional): { threshold?: number } (default 25)
export async function POST(req: Request) {
  const user = await requireUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let threshold = 25;
  try {
    const body = await req.json();
    if (typeof body.threshold === "number") threshold = body.threshold;
  } catch {
    // default threshold
  }

  const result = await rescoreAndQueue(user.id, threshold);
  return NextResponse.json(result);
}
