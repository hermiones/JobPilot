import { prisma } from "@/lib/prisma";
import { subDays } from "date-fns";
import {
  refreshAccessToken,
  searchCompanyMessages,
  classifyEmail,
  type EmailClassification,
} from "@/lib/gmail";
import type { ApplicationStatus } from "@prisma/client";

// Only ever moves an application FORWARD in the funnel — never re-downgrades
// e.g. an already-detected "interview" back to a generic "responded" if a
// later, less-specific email also matches.
const STATUS_RANK: Record<string, number> = {
  applied: 0,
  responded: 1,
  interview: 2,
  rejected: 2,
  offer: 3,
};

const LOOKBACK_DAYS = 45;

export type GmailSyncResult = { checked: number; updated: number; error?: string };

// Syncs one user's Gmail against their "applied" applications, auto-updating
// status when a matching email is found. Read-only against Gmail — never
// sends anything, never touches any other user's data.
export async function syncGmailForUser(userId: string): Promise<GmailSyncResult> {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user?.gmailConnected || !user.gmailRefreshToken) {
    return { checked: 0, updated: 0, error: "Gmail not connected" };
  }

  let accessToken: string;
  try {
    accessToken = await refreshAccessToken(user.gmailRefreshToken);
  } catch (e) {
    return { checked: 0, updated: 0, error: (e as Error).message };
  }

  const since = subDays(new Date(), LOOKBACK_DAYS);
  const applications = await prisma.application.findMany({
    where: {
      userId,
      status: { in: ["applied", "responded"] },
      appliedAt: { not: null, gte: since },
    },
    include: { jobListing: { select: { company: true } } },
  });

  let updated = 0;
  for (const app of applications) {
    const sinceDate = app.appliedAt ?? since;
    const messages = await searchCompanyMessages(accessToken, app.jobListing.company, sinceDate);
    if (messages.length === 0) continue;

    let best: EmailClassification = null;
    let bestRank = -1;
    for (const m of messages) {
      const classification = classifyEmail(m.subject, m.snippet);
      if (!classification) continue;
      const rank = STATUS_RANK[classification] ?? 0;
      if (rank > bestRank) {
        bestRank = rank;
        best = classification;
      }
    }
    if (!best) continue;

    const currentRank = STATUS_RANK[app.status] ?? -1;
    if (bestRank > currentRank) {
      await prisma.application.update({
        where: { id: app.id },
        data: { status: best as ApplicationStatus },
      });
      updated += 1;
    }
  }

  await prisma.user.update({ where: { id: userId }, data: { gmailLastSyncedAt: new Date() } });

  return { checked: applications.length, updated };
}
