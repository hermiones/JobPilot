import type { Status } from "@/lib/statusMeta";

export type JobDTO = {
  id: string;
  source: string;
  title: string;
  company: string;
  location: string | null;
  url: string;
  description: string;
  postedDate: string | null;
  salaryRange: string | null;
  fetchedAt: string;
};

export type MatchDTO = {
  id: string;
  relevanceScore: number;
  reasons: string[];
};

export type ApplicationDTO = {
  id: string;
  status: Status;
  resumeVersion: string | null;
  coverLetterVersion: string | null;
  attachedResumeName: string | null;
  appliedAt: string | null;
  followUpDate: string | null;
  lastUpdated: string;
  createdAt: string;
  notes: string | null;
  selectedVariantId: string | null;
};

export type QueueItem = {
  application: ApplicationDTO;
  job: JobDTO;
  match: MatchDTO | null;
};

export type ProfileDTO = {
  id: string;
  email: string;
  masterResume: string;
  masterResumeFileName: string | null;
  coverLetterTemplates: { tone: string; body: string }[];
  targetRoles: string[];
  targetLocations: string[];
  salaryFloor: number | null;
  excludedCompanies: string[];
  dailyGoal: number;
  scheduleEnabled: boolean;
  scheduleTimes: string[];
  apiKeys: { provider: string; label: string; key: string }[];
  preferredProvider: string;
  plan: string;
  referralCode: string;
  autoApproveEnabled: boolean;
  autoApproveMinScore: number;
  autoApproveMaxPerRun: number;
  isAdmin: boolean;
  createdAt: string;
  codingProfiles: { platform: string; url: string }[];
  gmailConnected: boolean;
  gmailEmail: string | null;
  gmailLastSyncedAt: string | null;
};

export type ReferralDTO = {
  code: string;
  count: number;
  goal: number;
  plan: string;
};

export type ApplicationVariantDTO = {
  id: string;
  label: string;
  tone: string | null;
  resumeVersion: string;
  coverLetterVersion: string;
  createdAt: string;
};

export type VariantAnalyticsEntry = {
  label: string;
  applied: number;
  responded: number;
  responseRate: number;
};

export type FeedbackEntry = {
  id: string;
  email: string;
  rating: number | null;
  message: string;
  page: string | null;
  createdAt: string;
};

export type AdminInsights = {
  totalUsers: number;
  planCounts: Record<string, number>;
  signupTrend: { date: string; count: number }[];
  totalApplications: number;
  appliedToday: number;
  funnel: Record<Status, number>;
  totalJobListings: number;
  totalBoards: number;
  activeBoards: number;
  topCompanies: { company: string; count: number }[];
  referral: { referredSignups: number; proViaReferral: number };
  variantPerformance: VariantAnalyticsEntry[];
  providerDistribution: { provider: string; count: number }[];
};

export type BoardDTO = {
  id: string;
  source: string;
  slug: string;
  label: string | null;
  active: boolean;
  lastJobCount: number;
};

export type TailorResult = {
  matchedKeywords: string[];
  coverLetter: string;
  summary: string;
};

export type DashboardData = {
  dailyGoal: number;
  appliedToday: number;
  totalApplied: number;
  funnel: Record<Status, number>;
  followUps: {
    applicationId: string;
    job: JobDTO;
    followUpDate: string | null;
    appliedAt: string | null;
  }[];
  scheduleEnabled: boolean;
  scheduleTimes: string[];
  nextRun: string | null;
  daysSinceStart: number;
  weeklyApplied: number;
  communityAvgWeekly: number;
  streakDays: number;
};
