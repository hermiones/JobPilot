import type { Application, JobListing, Match } from "@prisma/client";

export function serializeJob(job: JobListing) {
  return {
    id: job.id,
    source: job.source,
    title: job.title,
    company: job.company,
    location: job.location,
    url: job.url,
    description: job.description,
    postedDate: job.postedDate?.toISOString() ?? null,
    salaryRange: job.salaryRange,
    fetchedAt: job.fetchedAt.toISOString(),
  };
}

export function serializeMatch(match: Match) {
  let reasons: string[] = [];
  try {
    reasons = JSON.parse(match.reasons);
  } catch {
    reasons = [];
  }
  return {
    id: match.id,
    relevanceScore: match.relevanceScore,
    reasons,
  };
}

export function serializeApplication(app: Application) {
  return {
    id: app.id,
    status: app.status,
    resumeVersion: app.resumeVersion,
    coverLetterVersion: app.coverLetterVersion,
    appliedAt: app.appliedAt?.toISOString() ?? null,
    followUpDate: app.followUpDate?.toISOString() ?? null,
    lastUpdated: app.lastUpdated.toISOString(),
    createdAt: app.createdAt.toISOString(),
    notes: app.notes,
  };
}
