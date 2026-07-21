// Fuzzy duplicate detection for job listings: aggregators re-list the same
// role, so we compare on a normalized company+title key.

function normalize(s: string): string {
  return s
    .toLowerCase()
    .replace(/\(.*?\)/g, " ")
    .replace(/[^a-z0-9 ]/g, " ")
    .replace(
      /\b(remote|hybrid|onsite|full[- ]?time|part[- ]?time|contract|us|usa|emea|apac)\b/g,
      " "
    )
    .replace(/\s+/g, " ")
    .trim();
}

export function dedupeKey(company: string, title: string): string {
  return `${normalize(company)}::${normalize(title)}`;
}

function levenshtein(a: string, b: string): number {
  const m = a.length;
  const n = b.length;
  if (m === 0) return n;
  if (n === 0) return m;
  const dp = Array.from({ length: n + 1 }, (_, i) => i);
  for (let i = 1; i <= m; i++) {
    let prev = dp[0];
    dp[0] = i;
    for (let j = 1; j <= n; j++) {
      const tmp = dp[j];
      dp[j] = Math.min(
        dp[j] + 1,
        dp[j - 1] + 1,
        prev + (a[i - 1] === b[j - 1] ? 0 : 1)
      );
      prev = tmp;
    }
  }
  return dp[n];
}

// Returns similarity 0..1 between two company+title strings.
export function similarity(
  aCompany: string,
  aTitle: string,
  bCompany: string,
  bTitle: string
): number {
  const a = dedupeKey(aCompany, aTitle);
  const b = dedupeKey(bCompany, bTitle);
  if (a === b) return 1;
  const dist = levenshtein(a, b);
  const maxLen = Math.max(a.length, b.length) || 1;
  return 1 - dist / maxLen;
}

export function isDuplicate(
  aCompany: string,
  aTitle: string,
  bCompany: string,
  bTitle: string,
  threshold = 0.9
): boolean {
  return similarity(aCompany, aTitle, bCompany, bTitle) >= threshold;
}
