import { NextResponse } from "next/server";
import { jwtVerify } from "jose";
import { prisma } from "@/lib/prisma";
import { exchangeCodeForTokens, getGmailUserEmail } from "@/lib/gmail";

function getSecretKey(): Uint8Array {
  return new TextEncoder().encode(process.env.AUTH_SECRET || "dev-only-insecure-secret-set-AUTH_SECRET");
}

// GET /api/gmail/callback — Google redirects here after consent. Verifies
// the signed `state` to recover which user initiated this, exchanges the
// code for tokens, and stores the refresh token.
export async function GET(req: Request) {
  const url = new URL(req.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const error = url.searchParams.get("error");

  if (error) {
    return NextResponse.redirect(new URL(`/profile?gmail=error&reason=${error}`, req.url));
  }
  if (!code || !state) {
    return NextResponse.redirect(new URL("/profile?gmail=error&reason=missing_code", req.url));
  }

  let userId: string;
  try {
    const { payload } = await jwtVerify(state, getSecretKey());
    if (typeof payload.sub !== "string") throw new Error("bad state");
    userId = payload.sub;
  } catch {
    return NextResponse.redirect(new URL("/profile?gmail=error&reason=bad_state", req.url));
  }

  try {
    const redirectUri = new URL("/api/gmail/callback", req.url).toString();
    const tokens = await exchangeCodeForTokens(code, redirectUri);
    if (!tokens.refresh_token) {
      // Google only returns a refresh_token on first consent (or with
      // prompt=consent, which we always pass) — if it's still missing here,
      // something's off with the OAuth client config.
      return NextResponse.redirect(new URL("/profile?gmail=error&reason=no_refresh_token", req.url));
    }
    const email = await getGmailUserEmail(tokens.access_token);

    await prisma.user.update({
      where: { id: userId },
      data: {
        gmailConnected: true,
        gmailEmail: email,
        gmailRefreshToken: tokens.refresh_token,
      },
    });

    return NextResponse.redirect(new URL("/profile?gmail=connected", req.url));
  } catch (e) {
    return NextResponse.redirect(
      new URL(`/profile?gmail=error&reason=${encodeURIComponent((e as Error).message.slice(0, 100))}`, req.url)
    );
  }
}
