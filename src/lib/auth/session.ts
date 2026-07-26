import { randomBytes, createHash } from "crypto";
import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";

export const SESSION_COOKIE = "jobpilot_session";
export const REFRESH_COOKIE = "jobpilot_refresh";

// Access token (JWT) is short-lived by design — it's a stateless, unrevokable
// credential, so keeping its blast radius small matters. The refresh token
// is the long-lived one, but it's a random opaque value backed by a DB row
// (RefreshToken), so it CAN be revoked (logout, admin action) unlike the JWT.
const ACCESS_DURATION_SECONDS = 60 * 60; // 1 hour
const REFRESH_DURATION_SECONDS = 60 * 60 * 24 * 30; // 30 days

function getSecretKey(): Uint8Array {
  const secret = process.env.AUTH_SECRET;
  if (!secret) {
    // Dev fallback so the app still runs without extra setup, but sessions
    // won't survive a server restart and this must never reach production.
    console.warn(
      "[auth] AUTH_SECRET is not set — using an insecure dev-only fallback. " +
        "Set AUTH_SECRET in .env before deploying."
    );
    return new TextEncoder().encode("dev-only-insecure-secret-set-AUTH_SECRET");
  }
  return new TextEncoder().encode(secret);
}

function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

async function signAccessToken(userId: string): Promise<string> {
  return new SignJWT({ sub: userId })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${ACCESS_DURATION_SECONDS}s`)
    .sign(getSecretKey());
}

async function issueRefreshToken(userId: string): Promise<string> {
  const plaintext = randomBytes(32).toString("hex");
  await prisma.refreshToken.create({
    data: {
      userId,
      tokenHash: hashToken(plaintext),
      expiresAt: new Date(Date.now() + REFRESH_DURATION_SECONDS * 1000),
    },
  });
  return plaintext;
}

// Creates a fresh access + refresh token pair on login/register and sets both
// cookies.
export async function createSession(userId: string): Promise<void> {
  const [accessToken, refreshToken] = await Promise.all([
    signAccessToken(userId),
    issueRefreshToken(userId),
  ]);

  const store = await cookies();
  store.set(SESSION_COOKIE, accessToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: ACCESS_DURATION_SECONDS,
  });
  store.set(REFRESH_COOKIE, refreshToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: REFRESH_DURATION_SECONDS,
  });
}

// Logout: revokes the refresh token server-side (so it can't be replayed even
// if it leaked) and clears both cookies.
export async function destroySession(): Promise<void> {
  const store = await cookies();
  const refreshToken = store.get(REFRESH_COOKIE)?.value;
  if (refreshToken) {
    await prisma.refreshToken
      .updateMany({
        where: { tokenHash: hashToken(refreshToken), revokedAt: null },
        data: { revokedAt: new Date() },
      })
      .catch(() => {
        /* best-effort — cookie clearing below still logs the user out locally */
      });
  }
  store.delete(SESSION_COOKIE);
  store.delete(REFRESH_COOKIE);
}

// Rotates the refresh token (revokes the old one, issues a new one) and mints
// a fresh access token — called by /api/auth/refresh. Rotation means a stolen
// refresh token that gets used by an attacker invalidates the legitimate
// user's copy too, which is a detectable signal of theft.
export async function refreshSession(): Promise<boolean> {
  const store = await cookies();
  const refreshToken = store.get(REFRESH_COOKIE)?.value;
  if (!refreshToken) return false;

  const record = await prisma.refreshToken.findUnique({
    where: { tokenHash: hashToken(refreshToken) },
  });
  if (!record || record.revokedAt || record.expiresAt < new Date()) {
    return false;
  }

  await prisma.refreshToken.update({
    where: { id: record.id },
    data: { revokedAt: new Date() },
  });

  await createSession(record.userId);
  return true;
}

// Returns the logged-in user's id from the session cookie, or null if there
// is none / it's invalid or expired. Safe to call from Server Components,
// Route Handlers, and Server Actions.
export async function getSessionUserId(): Promise<string | null> {
  const store = await cookies();
  const token = store.get(SESSION_COOKIE)?.value;
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, getSecretKey());
    return typeof payload.sub === "string" ? payload.sub : null;
  } catch {
    return null;
  }
}

// Edge-safe variant for middleware: verifies a raw token string without the
// next/headers cookies() API (middleware reads cookies off the request itself).
export async function verifySessionToken(token: string): Promise<string | null> {
  try {
    const { payload } = await jwtVerify(token, getSecretKey());
    return typeof payload.sub === "string" ? payload.sub : null;
  } catch {
    return null;
  }
}
