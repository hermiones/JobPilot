// Simple, deterministic relevance scoring: title match + role keywords +
// location + seniority + salary. Returns a 0–100 score and human reasons.

export type ScoringProfile = {
  targetRoles: string[];
  targetLocations: string[];
  salaryFloor: number | null;
  excludedCompanies: string[];
  masterResume: string;
};

export type ScorableJob = {
  title: string;
  company: string;
  location: string | null;
  description: string;
  salaryRange: string | null;
};

export type ScoreResult = {
  score: number; // 0–100
  reasons: string[];
  excluded: boolean;
};

const SENIORITY_TERMS = [
  "intern",
  "junior",
  "entry",
  "associate",
  "mid",
  "senior",
  "sr",
  "staff",
  "principal",
  "lead",
  "manager",
  "director",
];

function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9+#. ]/g, " ")
    .split(/\s+/)
    .filter((t) => t.length > 1);
}

function detectSeniority(text: string): string | null {
  const tokens = new Set(tokenize(text));
  for (const term of SENIORITY_TERMS) {
    if (tokens.has(term)) return term === "sr" ? "senior" : term;
  }
  return null;
}

// Extract candidate keywords from the master resume (skills/tech). We keep
// tokens of length >= 2 and drop common filler.
const STOPWORDS = new Set([
  "and","the","for","with","that","this","from","have","has","was","were",
  "our","your","you","are","will","all","can","who","into","per","via","etc",
  "team","teams","work","working","years","year","experience","using","use",
  "used","build","built","developed","development","engineer","engineering",
]);

function resumeKeywords(resume: string): Set<string> {
  const kws = new Set<string>();
  for (const tok of tokenize(resume)) {
    if (tok.length >= 2 && !STOPWORDS.has(tok)) kws.add(tok);
  }
  return kws;
}

export function scoreJob(
  profile: ScoringProfile,
  job: ScorableJob
): ScoreResult {
  const reasons: string[] = [];

  // Hard exclude by company.
  const companyLc = job.company.toLowerCase();
  const excluded = profile.excludedCompanies.some(
    (c) => c.trim() && companyLc.includes(c.trim().toLowerCase())
  );
  if (excluded) {
    return { score: 0, reasons: [`Excluded company: ${job.company}`], excluded: true };
  }

  const titleLc = job.title.toLowerCase();
  let score = 0;

  // 1. Title / role match (max 45).
  let roleHit = false;
  for (const role of profile.targetRoles) {
    const r = role.trim().toLowerCase();
    if (!r) continue;
    if (titleLc.includes(r)) {
      score += 45;
      reasons.push(`Title matches target role "${role}"`);
      roleHit = true;
      break;
    }
    // partial: any word of the role present in title
    const roleWords = r.split(/\s+/).filter((w) => w.length > 2);
    const hits = roleWords.filter((w) => titleLc.includes(w));
    if (hits.length > 0) {
      const partial = Math.round((hits.length / roleWords.length) * 30);
      score += partial;
      reasons.push(
        `Title partially matches "${role}" (${hits.join(", ")})`
      );
      roleHit = true;
      break;
    }
  }
  if (!roleHit && profile.targetRoles.some((r) => r.trim())) {
    reasons.push("Title does not match any target role");
  }

  // 2. Resume keyword overlap in JD (max 30).
  const kws = resumeKeywords(profile.masterResume);
  if (kws.size > 0) {
    const jdTokens = new Set(tokenize(job.description + " " + job.title));
    let overlap = 0;
    const matched: string[] = [];
    for (const kw of kws) {
      if (jdTokens.has(kw)) {
        overlap++;
        if (matched.length < 8) matched.push(kw);
      }
    }
    const kwScore = Math.min(30, overlap * 3);
    if (kwScore > 0) {
      score += kwScore;
      reasons.push(
        `${overlap} resume keyword${overlap === 1 ? "" : "s"} in JD` +
          (matched.length ? ` (${matched.join(", ")})` : "")
      );
    }
  }

  // 3. Location match (max 15).
  if (profile.targetLocations.some((l) => l.trim())) {
    const loc = (job.location ?? "").toLowerCase();
    const remoteWanted = profile.targetLocations.some((l) =>
      l.toLowerCase().includes("remote")
    );
    if (remoteWanted && loc.includes("remote")) {
      score += 15;
      reasons.push("Remote role matches location preference");
    } else {
      const locHit = profile.targetLocations.some((l) => {
        const t = l.trim().toLowerCase();
        return t && loc.includes(t);
      });
      if (locHit) {
        score += 15;
        reasons.push(`Location matches "${job.location}"`);
      } else if (loc) {
        reasons.push(`Location "${job.location}" outside preferences`);
      }
    }
  }

  // 4. Seniority sanity (max 10). Reward when JD seniority matches a target role's.
  const jobSeniority = detectSeniority(job.title);
  const roleSeniority = detectSeniority(profile.targetRoles.join(" "));
  if (jobSeniority && roleSeniority) {
    if (jobSeniority === roleSeniority) {
      score += 10;
      reasons.push(`Seniority match (${jobSeniority})`);
    } else {
      reasons.push(
        `Seniority differs (job: ${jobSeniority}, want: ${roleSeniority})`
      );
    }
  }

  // 5. Salary floor bonus (small).
  if (profile.salaryFloor && job.salaryRange) {
    const nums = job.salaryRange.match(/\d[\d,]*/g)?.map((n) =>
      parseInt(n.replace(/,/g, ""), 10)
    );
    const maxSalary = nums?.length ? Math.max(...nums) : null;
    if (maxSalary && maxSalary >= profile.salaryFloor) {
      score = Math.min(100, score + 5);
      reasons.push(
        `Salary up to $${maxSalary.toLocaleString()} meets floor`
      );
    } else if (maxSalary && maxSalary < profile.salaryFloor) {
      score = Math.max(0, score - 10);
      reasons.push(
        `Salary below floor ($${maxSalary.toLocaleString()} < $${profile.salaryFloor.toLocaleString()})`
      );
    }
  }

  return {
    score: Math.max(0, Math.min(100, Math.round(score))),
    reasons,
    excluded: false,
  };
}
