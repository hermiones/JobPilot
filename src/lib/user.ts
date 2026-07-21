import { prisma } from "@/lib/prisma";
import { parseUser, type ParsedProfile } from "@/lib/profile";

// Single-user MVP: we operate on one profile identified by this email. Auth can
// be layered on later without changing the data model.
export const DEFAULT_USER_EMAIL = "you@jobpilot.local";

const EMPTY_USER = {
  email: DEFAULT_USER_EMAIL,
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
};

export async function getOrCreateDefaultUser(): Promise<ParsedProfile> {
  const user = await prisma.user.upsert({
    where: { email: DEFAULT_USER_EMAIL },
    create: EMPTY_USER,
    update: {},
  });
  return parseUser(user);
}

export async function getDefaultUserId(): Promise<string> {
  const user = await getOrCreateDefaultUser();
  return user.id;
}
