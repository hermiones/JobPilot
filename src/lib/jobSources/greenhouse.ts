import type { NormalizedJob } from "./types";
import { stripHtml, truncate } from "./util";

type GreenhouseJob = {
  id: number;
  title: string;
  absolute_url: string;
  updated_at: string;
  location?: { name?: string };
  content?: string;
};

// Greenhouse Job Board API — public, no auth. One board per company "token".
// Docs: https://developers.greenhouse.io/job-board.html
export async function fetchGreenhouse(boardToken: string): Promise<NormalizedJob[]> {
  const url = `https://boards-api.greenhouse.io/v1/boards/${encodeURIComponent(
    boardToken
  )}/jobs?content=true`;

  const res = await fetch(url, { headers: { Accept: "application/json" } });
  if (!res.ok) {
    throw new Error(`Greenhouse ${boardToken}: ${res.status} ${res.statusText}`);
  }
  const data = (await res.json()) as { jobs?: GreenhouseJob[] };

  return (data.jobs ?? []).map((j) => ({
    source: "greenhouse",
    externalId: `${boardToken}:${j.id}`,
    title: j.title,
    company: boardToken,
    location: j.location?.name ?? null,
    url: j.absolute_url,
    description: truncate(stripHtml(j.content ?? "")),
    postedDate: j.updated_at ? new Date(j.updated_at) : null,
    salaryRange: null,
  }));
}
