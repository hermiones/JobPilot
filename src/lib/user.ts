import { prisma } from "@/lib/prisma";
import { parseUser, type ParsedProfile } from "@/lib/profile";
import { hashPassword } from "@/lib/auth/password";
import { REFERRAL_GOAL } from "@/lib/plan";

// Demo/seed account — see prisma/seed.ts. Not special in the data model; any
// number of users can register alongside it.
export const DEFAULT_USER_EMAIL = "you@jobpilot.local";

export async function createUser(
  email: string,
  password: string,
  referredById?: string | null
): Promise<ParsedProfile> {
  const passwordHash = await hashPassword(password);
  const user = await prisma.user.create({
    data: {
      email: email.trim().toLowerCase(),
      passwordHash,
      referredById: referredById ?? null,
      masterResume: "",
      coverLetterTemplates: JSON.stringify([
        { tone: "professional", body: "" },
        { tone: "enthusiastic", body: "" },
      ]),
      targetRoles: JSON.stringify([]),
      targetLocations: JSON.stringify([]),
      salaryFloor: null,
      excludedCompanies: JSON.stringify([]),
      dailyGoal: 50,
      scheduleEnabled: false,
      scheduleTimes: JSON.stringify(["09:00", "14:00", "19:00"]),
    },
  });
  return parseUser(user);
}

export async function findUserByEmail(email: string) {
  return prisma.user.findUnique({
    where: { email: email.trim().toLowerCase() },
  });
}

export async function findUserByReferralCode(code: string) {
  return prisma.user.findUnique({ where: { referralCode: code } });
}

// Auto-upgrades a referrer to Pro once they've brought in enough signups.
// Called after a new referred account is created.
export async function maybeUpgradeReferrer(referrerId: string) {
  const count = await prisma.user.count({ where: { referredById: referrerId } });
  if (count >= REFERRAL_GOAL) {
    await prisma.user.updateMany({
      where: { id: referrerId, plan: "free" },
      data: { plan: "pro" },
    });
  }
}

// Growth activation: the first time a user's application actually gets
// marked "applied" (via Review Queue approve, Easy Apply, or bulk apply),
// auto-upgrade them to Pro. Temporary "for now" onboarding hook — no
// referral or payment needed, just proof they used the core flow once.
export async function maybeActivateProOnFirstApplication(userId: string) {
  const appliedCount = await prisma.application.count({
    where: { userId, appliedAt: { not: null } },
  });
  if (appliedCount === 1) {
    await prisma.user.updateMany({
      where: { id: userId, plan: "free" },
      data: { plan: "pro" },
    });
  }
}

export async function getProfileById(
  id: string
): Promise<ParsedProfile | null> {
  const user = await prisma.user.findUnique({ where: { id } });
  return user ? parseUser(user) : null;
}
