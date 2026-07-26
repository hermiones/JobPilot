import { NextResponse } from "next/server";
import { refreshSession } from "@/lib/auth/session";

// POST /api/auth/refresh — rotates the refresh token and mints a new
// short-lived access token. Called silently in the background by
// SessionRefresher.tsx while the app is open, so users don't get logged out
// mid-session just because the 1-hour access token expired.
export async function POST() {
  const ok = await refreshSession();
  if (!ok) return NextResponse.json({ error: "Invalid or expired refresh token" }, { status: 401 });
  return NextResponse.json({ ok: true });
}
