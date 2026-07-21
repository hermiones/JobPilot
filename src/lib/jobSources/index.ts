import { randomUUID } from "crypto";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import type { NormalizedJob } from "./types";
import { fetchGreenhouse } from "./greenhouse";
import { fetchLever } from "./lever";
import { fetchRemoteOk } from "./remoteok";

export type { NormalizedJob };

export type FetchResult = {
  fetched: number;
  created: number;
  errors: { source: string; message: string }[];
};

// Pull the active, auto-discovered boards from the DB and aggregate them along
// with RemoteOK. Boards are managed via the discovery flow, not hardcoded.
export async function aggregateJobs(opts?: {
  greenhouseBoards?: string[];
  leverHandles?: string[];
  includeRemoteOk?: boolean;
}): Promise<FetchResult> {
  let greenhouseBoards = opts?.greenhouseBoards;
  let leverHandles = opts?.leverHandles;
  const includeRemoteOk = opts?.includeRemoteOk ?? true;

  if (!greenhouseBoards || !leverHandles) {
    const boards = await prisma.board.findMany({ where: { active: true } });
    greenhouseBoards =
      greenhouseBoards ??
      boards.filter((b) => b.source === "greenhouse").map((b) => b.slug);
    leverHandles =
      leverHandles ??
      boards.filter((b) => b.source === "lever").map((b) => b.slug);
  }

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

  const created = await bulkUpsertJobListings(jobs, errors);

  return { fetched: jobs.length, created, errors };
}

// Neon (and any remote Postgres) charges real network latency per round trip,
// so upserting hundreds of listings one row at a time is far too slow for a
// job meant to run several times a day. Batch them into chunked multi-row
// `INSERT ... ON CONFLICT DO UPDATE` statements instead.
const UPSERT_CHUNK_SIZE = 200;

async function bulkUpsertJobListings(
  jobs: NormalizedJob[],
  errors: { source: string; message: string }[]
): Promise<number> {
  let created = 0;

  for (let i = 0; i < jobs.length; i += UPSERT_CHUNK_SIZE) {
    const chunk = jobs.slice(i, i + UPSERT_CHUNK_SIZE);
    if (chunk.length === 0) continue;

    const now = new Date();
    const rows = chunk.map(
      (job) =>
        Prisma.sql`(${randomUUID()}, ${job.source}, ${job.externalId}, ${job.title}, ${job.company}, ${job.location}, ${job.url}, ${job.description}, ${job.postedDate}, ${job.salaryRange}, ${now})`
    );

    try {
      await prisma.$executeRaw`
        INSERT INTO "JobListing"
          (id, source, "externalId", title, company, location, url, description, "postedDate", "salaryRange", "fetchedAt")
        VALUES ${Prisma.join(rows)}
        ON CONFLICT (source, "externalId") DO UPDATE SET
          title = EXCLUDED.title,
          company = EXCLUDED.company,
          location = EXCLUDED.location,
          url = EXCLUDED.url,
          description = EXCLUDED.description,
          "postedDate" = EXCLUDED."postedDate",
          "salaryRange" = EXCLUDED."salaryRange",
          "fetchedAt" = EXCLUDED."fetchedAt"
      `;
      created += chunk.length;
    } catch (e) {
      errors.push({ source: "bulk-upsert", message: (e as Error).message });
    }
  }

  return created;
}
