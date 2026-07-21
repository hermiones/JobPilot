import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth/requireUser";

// GET /api/auth/me — current session's user, or { user: null } if logged out.
export async function GET() {
  const user = await requireUser();
  return NextResponse.json({
    user: user ? { id: user.id, email: user.email } : null,
  });
}
