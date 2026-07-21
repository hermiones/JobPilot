import { prisma } from "@/lib/prisma";
import { parseUser, type ParsedProfile } from "@/lib/profile";
import { hashPassword } from "@/lib/auth/password";

// Demo/seed account — see prisma/seed.ts. Not special in the data model; any
// number of users can register alongside it.
export const DEFAULT_USER_EMAIL = "you@jobpilot.local";

export async function createUser(
  email: string,
  password: string
): Promise<ParsedProfile> {
  const passwordHash = await hashPassword(password);
  const user = await prisma.user.create({
    data: {
      email: email.trim().toLowerCase(),
      passwordHash,
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

export async function getProfileById(
  id: string
): Promise<ParsedProfile | null> {
  const user = await prisma.user.findUnique({ where: { id } });
  return user ? parseUser(user) : null;
}
