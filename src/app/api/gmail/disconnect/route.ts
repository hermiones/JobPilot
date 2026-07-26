import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth/requireUser";

// POST /api/gmail/disconnect — forgets the stored refresh token. Doesn't
// revoke it with Google (the user can do that themselves at
// myaccount.google.com/permissions if they want a hard revoke).
export async function POST() {
  const profile = await requireUser();
  if (!profile) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  await prisma.user.update({
    where: { id: profile.id },
    data: { gmailConnected: false, gmailEmail: null, gmailRefreshToken: null },
  });

  return NextResponse.json({ ok: true });
}
