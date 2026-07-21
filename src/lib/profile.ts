import type { User } from "@prisma/client";

export type CoverLetterTemplate = { tone: string; body: string };

export type ParsedProfile = {
  id: string;
  email: string;
  masterResume: string;
  coverLetterTemplates: CoverLetterTemplate[];
  targetRoles: string[];
  targetLocations: string[];
  salaryFloor: number | null;
  excludedCompanies: string[];
  dailyGoal: number;
};

function safeArray<T>(json: string, fallback: T[]): T[] {
  try {
    const v = JSON.parse(json);
    return Array.isArray(v) ? v : fallback;
  } catch {
    return fallback;
  }
}

export function parseUser(user: User): ParsedProfile {
  return {
    id: user.id,
    email: user.email,
    masterResume: user.masterResume,
    coverLetterTemplates: safeArray<CoverLetterTemplate>(
      user.coverLetterTemplates,
      []
    ),
    targetRoles: safeArray<string>(user.targetRoles, []),
    targetLocations: safeArray<string>(user.targetLocations, []),
    salaryFloor: user.salaryFloor,
    excludedCompanies: safeArray<string>(user.excludedCompanies, []),
    dailyGoal: user.dailyGoal,
  };
}
