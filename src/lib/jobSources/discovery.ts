import { prisma } from "@/lib/prisma";

// Neither Greenhouse nor Lever exposes a "list every company" endpoint, so
// discovery works by probing a candidate company slug against both public APIs
// and keeping whichever resolves to a live board. This lets a user add a
// company by name without knowing which ATS it uses.

export type ProbeResult = {
  slug: string;
  source: "greenhouse" | "lever";
  jobCount: number;
} | null;

async function probeGreenhouse(slug: string): Promise<number | null> {
  try {
    const res = await fetch(
      `https://boards-api.greenhouse.io/v1/boards/${encodeURIComponent(
        slug
      )}/jobs`,
      { headers: { Accept: "application/json" } }
    );
    if (!res.ok) return null;
    const data = (await res.json()) as { jobs?: unknown[] };
    return Array.isArray(data.jobs) ? data.jobs.length : null;
  } catch {
    return null;
  }
}

async function probeLever(slug: string): Promise<number | null> {
  try {
    const res = await fetch(
      `https://api.lever.co/v0/postings/${encodeURIComponent(
        slug
      )}?mode=json&limit=1`,
      { headers: { Accept: "application/json" } }
    );
    if (!res.ok) return null;
    const data = await res.json();
    // Lever returns an array; a valid board returns 200 with (possibly empty) array.
    return Array.isArray(data) ? data.length : null;
  } catch {
    return null;
  }
}

// Probe a single slug; prefers whichever ATS returns more postings.
export async function probeSlug(slug: string): Promise<ProbeResult> {
  const clean = slug.trim().toLowerCase();
  if (!clean) return null;

  const [gh, lv] = await Promise.all([
    probeGreenhouse(clean),
    probeLever(clean),
  ]);

  if (gh !== null && (lv === null || gh >= lv)) {
    return { slug: clean, source: "greenhouse", jobCount: gh };
  }
  if (lv !== null) {
    return { slug: clean, source: "lever", jobCount: lv };
  }
  return null;
}

export type DiscoverResult = {
  discovered: { slug: string; source: string; label: string; jobCount: number }[];
  notFound: string[];
};

// Probe a list of candidate company slugs and upsert the live ones as Boards.
export async function discoverBoards(
  candidates: { slug: string; label?: string }[]
): Promise<DiscoverResult> {
  const discovered: DiscoverResult["discovered"] = [];
  const notFound: string[] = [];

  // Small concurrency to stay polite to the public APIs.
  const CONCURRENCY = 5;
  for (let i = 0; i < candidates.length; i += CONCURRENCY) {
    const batch = candidates.slice(i, i + CONCURRENCY);
    const results = await Promise.all(
      batch.map(async (c) => ({ candidate: c, result: await probeSlug(c.slug) }))
    );
    for (const { candidate, result } of results) {
      if (!result) {
        notFound.push(candidate.slug);
        continue;
      }
      const label = candidate.label ?? candidate.slug;
      await prisma.board.upsert({
        where: { source_slug: { source: result.source, slug: result.slug } },
        create: {
          source: result.source,
          slug: result.slug,
          label,
          lastJobCount: result.jobCount,
          lastCheckedAt: new Date(),
        },
        update: {
          label,
          active: true,
          lastJobCount: result.jobCount,
          lastCheckedAt: new Date(),
        },
      });
      discovered.push({
        slug: result.slug,
        source: result.source,
        label,
        jobCount: result.jobCount,
      });
    }
  }

  return { discovered, notFound };
}

// A curated pool of well-known companies (India-heavy) to auto-probe when the
// user just clicks "Discover boards" without supplying their own list.
export const CANDIDATE_POOL: { slug: string; label?: string }[] = [
  { slug: "groww", label: "Groww" },
  { slug: "postman", label: "Postman" },
  { slug: "phonepe", label: "PhonePe" },
  { slug: "druva", label: "Druva" },
  { slug: "cred", label: "CRED" },
  { slug: "freshworks", label: "Freshworks" },
  { slug: "meesho", label: "Meesho" },
  { slug: "razorpay", label: "Razorpay" },
  { slug: "zerodha", label: "Zerodha" },
  { slug: "swiggy", label: "Swiggy" },
  { slug: "zomato", label: "Zomato" },
  { slug: "flipkart", label: "Flipkart" },
  { slug: "dream11", label: "Dream11" },
  { slug: "sprinklr", label: "Sprinklr" },
  { slug: "hasura", label: "Hasura" },
  { slug: "chargebee", label: "Chargebee" },
  { slug: "browserstack", label: "BrowserStack" },
  { slug: "innovaccer", label: "Innovaccer" },
  { slug: "gitlab", label: "GitLab" },
  { slug: "stripe", label: "Stripe" },
  { slug: "airbnb", label: "Airbnb" },
  { slug: "figma", label: "Figma" },
  { slug: "databricks", label: "Databricks" },
  { slug: "notion", label: "Notion" },
];
