import { prisma } from "@/lib/prisma";
import type { NormalizedJob } from "./types";
import { fetchGreenhouse } from "./greenhouse";
import { fetchLever } from "./lever";
import { fetchRemoteOk } from "./remoteok";

export type { NormalizedJob };

// Default sources to scan. Greenhouse/Lever need a company board token/handle;
// these are well-known public boards used as sensible defaults for the MVP.
export const DEFAULT_GREENHOUSE_BOARDS = ["stripe", "airbnb", "gitlab"];
export const DEFAULT_LEVER_HANDLES = ["netflix", "plaid"];

export type FetchResult = {
  fetched: number;
  created: number;
  errors: { source: string; message: string }[];
};

export async function aggregateJobs(opts?: {
  greenhouseBoards?: string[];
  leverHandles?: string[];
  includeRemoteOk?: boolean;
}): Promise<FetchResult> {
  const greenhouseBoards = opts?.greenhouseBoards ?? DEFAULT_GREENHOUSE_BOARDS;
  const leverHandles = opts?.leverHandles ?? DEFAULT_LEVER_HANDLES;
  const includeRemoteOk = opts?.includeRemoteOk ?? true;

  const errors: { source: string; message: string }[] = [];
  const tasks: Promise<NormalizedJob[]>[] = [];

  for (const board of greenhouseBoards) {
    tasks.push(
      fetchGreenhouse(board).catch((e: Error) => {
        errors.push({ source: `greenhouse:${board}`, message: e.message });
        return [];
      })
    );
  }
  for (const handle of leverHandles) {
    tasks.push(
      fetchLever(handle).catch((e: Error) => {
        errors.push({ source: `lever:${handle}`, message: e.message });
        return [];
      })
    );
  }
  if (includeRemoteOk) {
    tasks.push(
      fetchRemoteOk().catch((e: Error) => {
        errors.push({ source: "remoteok", message: e.message });
        return [];
      })
    );
  }

  const results = await Promise.all(tasks);
  const jobs = results.flat();

  let created = 0;
  for (const job of jobs) {
    try {
      await prisma.jobListing.upsert({
        where: {
          source_externalId: { source: job.source, externalId: job.externalId },
        },
        create: job,
        update: {
          title: job.title,
          company: job.company,
          location: job.location,
          url: job.url,
          description: job.description,
          postedDate: job.postedDate,
          salaryRange: job.salaryRange,
          fetchedAt: new Date(),
        },
      });
      created++;
    } catch (e) {
      errors.push({
        source: `${job.source}:${job.externalId}`,
        message: (e as Error).message,
      });
    }
  }

  return { fetched: jobs.length, created, errors };
}
