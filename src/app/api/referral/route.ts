import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth/requireUser";
import { REFERRAL_GOAL } from "@/lib/plan";

// GET /api/referral — the current user's referral code + how many of the
// signups through it have landed, toward the free Pro unlock.
export async function GET() {
  const profile = await requireUser();
  if (!profile) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const count = await prisma.user.count({ where: { referredById: profile.id } });

  return NextResponse.json({
    code: profile.referralCode,
    count,
    goal: REFERRAL_GOAL,
    plan: profile.plan,
  });
}
