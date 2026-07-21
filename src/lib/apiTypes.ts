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
  tailoredBullets: string[];
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
};
