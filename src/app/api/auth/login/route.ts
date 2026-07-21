import { NextResponse } from "next/server";
import { findUserByEmail } from "@/lib/user";
import { verifyPassword } from "@/lib/auth/password";
import { createSession } from "@/lib/auth/session";

// POST /api/auth/login
export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const email = typeof body.email === "string" ? body.email.trim() : "";
  const password = typeof body.password === "string" ? body.password : "";

  const user = await findUserByEmail(email);
  if (!user) {
    return NextResponse.json({ error: "Invalid email or password" }, { status: 401 });
  }

  const ok = await verifyPassword(password, user.passwordHash);
  if (!ok) {
    return NextResponse.json({ error: "Invalid email or password" }, { status: 401 });
  }

  await createSession(user.id);
  return NextResponse.json({ id: user.id, email: user.email });
}
