// The app is INR-first. Amounts the user owns (salary floor, seeded jobs) are
// stored directly in INR. Some external sources (e.g. RemoteOK) report USD; we
// convert those to INR at a fixed reference rate so the whole UI reads in ₹.
// Adjust as needed — this is a static approximation, not a live FX feed.
export const USD_TO_INR = 83;

// Format a whole-rupee amount with Indian digit grouping, e.g. 1250000 → ₹12,50,000.
export function formatINR(amount: number): string {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(amount);
}

// Compact INR for tight spaces, e.g. 1250000 → ₹12.5L, 25000000 → ₹2.5Cr.
export function formatINRCompact(amount: number): string {
  if (amount >= 1_00_00_000) return `₹${(amount / 1_00_00_000).toFixed(1)}Cr`;
  if (amount >= 1_00_000) return `₹${(amount / 1_00_000).toFixed(1)}L`;
  if (amount >= 1_000) return `₹${(amount / 1_000).toFixed(0)}K`;
  return `₹${amount}`;
}

export function usdToInr(usd: number): number {
  return Math.round(usd * USD_TO_INR);
}
