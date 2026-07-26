import { NextResponse } from "next/server";
import { SignJWT } from "jose";
import { requireUser } from "@/lib/auth/requireUser";
import { getGmailAuthUrl, isGmailConfigured } from "@/lib/gmail";

function getSecretKey(): Uint8Array {
  return new TextEncoder().encode(process.env.AUTH_SECRET || "dev-only-insecure-secret-set-AUTH_SECRET");
}

// GET /api/gmail/connect — redirects to Google's OAuth consent screen. The
// `state` param is a short-lived signed JWT carrying the user id, so the
// callback can't be tricked into connecting Gmail to the wrong account.
export async function GET(req: Request) {
  const profile = await requireUser();
  if (!profile) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  if (!isGmailConfigured()) {
    return NextResponse.json(
      { error: "Gmail integration isn't configured on this deployment yet." },
      { status: 501 }
    );
  }

  const state = await new SignJWT({ sub: profile.id })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("10m")
    .sign(getSecretKey());

  const redirectUri = new URL("/api/gmail/callback", req.url).toString();
  const authUrl = getGmailAuthUrl(redirectUri, state);
  return NextResponse.redirect(authUrl);
}
