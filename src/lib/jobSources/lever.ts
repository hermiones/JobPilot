import type { NormalizedJob } from "./types";
import { stripHtml, truncate } from "./util";

type LeverJob = {
  id: string;
  text: string;
  hostedUrl: string;
  createdAt?: number;
  categories?: { location?: string; team?: string; commitment?: string };
  descriptionPlain?: string;
  description?: string;
};

// Lever Postings API — public, no auth. One account per company handle.
// Docs: https://github.com/lever/postings-api
export async function fetchLever(handle: string): Promise<NormalizedJob[]> {
  const url = `https://api.lever.co/v0/postings/${encodeURIComponent(
    handle
  )}?mode=json`;

  const res = await fetch(url, { headers: { Accept: "application/json" } });
  if (!res.ok) {
    throw new Error(`Lever ${handle}: ${res.status} ${res.statusText}`);
  }
  const data = (await res.json()) as LeverJob[];

  return (data ?? []).map((j) => ({
    source: "lever",
    externalId: `${handle}:${j.id}`,
    title: j.text,
    company: handle,
    location: j.categories?.location ?? null,
    url: j.hostedUrl,
    description: truncate(
      j.descriptionPlain?.trim() || stripHtml(j.description ?? "")
    ),
    postedDate: j.createdAt ? new Date(j.createdAt) : null,
    salaryRange: null,
  }));
}
