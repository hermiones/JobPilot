import type { User } from "@prisma/client";

export type CoverLetterTemplate = { tone: string; body: string };
export type ApiKeyEntry = { provider: string; label: string; key: string };
export type CodingProfileEntry = { platform: string; url: string };

export type ParsedProfile = {
  id: string;
  email: string;
  createdAt: Date;
  masterResume: string;
  masterResumeFileName: string | null;
  coverLetterTemplates: CoverLetterTemplate[];
  targetRoles: string[];
  targetLocations: string[];
  salaryFloor: number | null;
  excludedCompanies: string[];
  dailyGoal: number;
  scheduleEnabled: boolean;
  scheduleTimes: string[];
  apiKeys: ApiKeyEntry[];
  preferredProvider: string;
  plan: string;
  referralCode: string;
  isAdmin: boolean;
  autoApproveEnabled: boolean;
  autoApproveMinScore: number;
  autoApproveMaxPerRun: number;
  codingProfiles: CodingProfileEntry[];
  gmailConnected: boolean;
  gmailEmail: string | null;
  gmailLastSyncedAt: Date | null;
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
    createdAt: user.createdAt,
    masterResume: user.masterResume,
    masterResumeFileName: user.masterResumeFileName,
    coverLetterTemplates: safeArray<CoverLetterTemplate>(
      user.coverLetterTemplates,
      []
    ),
    targetRoles: safeArray<string>(user.targetRoles, []),
    targetLocations: safeArray<string>(user.targetLocations, []),
    salaryFloor: user.salaryFloor,
    excludedCompanies: safeArray<string>(user.excludedCompanies, []),
    dailyGoal: user.dailyGoal,
    scheduleEnabled: user.scheduleEnabled,
    scheduleTimes: safeArray<string>(user.scheduleTimes, []),
    apiKeys: safeArray<ApiKeyEntry>(user.apiKeys, []),
    preferredProvider: user.preferredProvider,
    plan: user.plan,
    referralCode: user.referralCode,
    isAdmin: user.isAdmin,
    autoApproveEnabled: user.autoApproveEnabled,
    autoApproveMinScore: user.autoApproveMinScore,
    autoApproveMaxPerRun: user.autoApproveMaxPerRun,
    codingProfiles: safeArray<CodingProfileEntry>(user.codingProfiles, []),
    gmailConnected: user.gmailConnected,
    gmailEmail: user.gmailEmail,
    gmailLastSyncedAt: user.gmailLastSyncedAt,
  };
}
