import type { NormalizedJob } from "./types";
import { stripHtml, truncate } from "./util";

type RemoteOkJob = {
  id?: string | number;
  slug?: string;
  position?: string;
  company?: string;
  location?: string;
  url?: string;
  description?: string;
  date?: string;
  salary_min?: number;
  salary_max?: number;
  tags?: string[];
};

// RemoteOK API — public JSON feed. First element is a legal/attribution notice.
// Docs: https://remoteok.com/api
export async function fetchRemoteOk(): Promise<NormalizedJob[]> {
  const res = await fetch("https://remoteok.com/api", {
    headers: { Accept: "application/json", "User-Agent": "JobPilot/1.0" },
  });
  if (!res.ok) {
    throw new Error(`RemoteOK: ${res.status} ${res.statusText}`);
  }
  const data = (await res.json()) as RemoteOkJob[];

  return (data ?? [])
    .filter((j) => j.id && j.position && j.company)
    .map((j) => {
      const salary =
        j.salary_min && j.salary_max
          ? `$${j.salary_min.toLocaleString()} – $${j.salary_max.toLocaleString()}`
          : null;
      const desc = stripHtml(j.description ?? "");
      const tags = j.tags?.length ? ` Tags: ${j.tags.join(", ")}.` : "";
      return {
        source: "remoteok",
        externalId: String(j.id),
        title: j.position!,
        company: j.company!,
        location: j.location || "Remote",
        url: j.url ?? `https://remoteok.com/l/${j.slug ?? j.id}`,
        description: truncate((desc + tags).trim()),
        postedDate: j.date ? new Date(j.date) : null,
        salaryRange: salary,
      } satisfies NormalizedJob;
    });
}
