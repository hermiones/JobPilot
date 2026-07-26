import { NextResponse } from "next/server";
import {
  createUser,
  findUserByEmail,
  findUserByReferralCode,
  maybeUpgradeReferrer,
} from "@/lib/user";
import { createSession } from "@/lib/auth/session";
import { checkRateLimit, clientIp } from "@/lib/auth/rateLimit";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// POST /api/auth/register — create a new account and log them in immediately.
export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const email = typeof body.email === "string" ? body.email.trim() : "";
  const password = typeof body.password === "string" ? body.password : "";
  const ref = typeof body.ref === "string" ? body.ref.trim() : "";

  const rl = checkRateLimit(`register:${clientIp(req)}`, 10, 60 * 60 * 1000);
  if (!rl.allowed) {
    return NextResponse.json(
      { error: `Too many signups from this network. Try again in ${rl.retryAfterSeconds}s.` },
      { status: 429 }
    );
  }

  if (!EMAIL_RE.test(email)) {
    return NextResponse.json({ error: "Enter a valid email" }, { status: 400 });
  }
  if (password.length < 8) {
    return NextResponse.json(
      { error: "Password must be at least 8 characters" },
      { status: 400 }
    );
  }

  const existing = await findUserByEmail(email);
  if (existing) {
    return NextResponse.json(
      { error: "An account with this email already exists" },
      { status: 409 }
    );
  }

  const referrer = ref ? await findUserByReferralCode(ref) : null;
  const profile = await createUser(email, password, referrer?.id ?? null);
  await createSession(profile.id);

  if (referrer) {
    await maybeUpgradeReferrer(referrer.id);
  }

  return NextResponse.json({ id: profile.id, email: profile.email });
}
