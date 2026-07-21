export const STATUS_ORDER = [
  "queued",
  "approved",
  "applied",
  "responded",
  "interview",
  "offer",
  "rejected",
] as const;

export type Status = (typeof STATUS_ORDER)[number];

export const STATUS_LABEL: Record<Status, string> = {
  queued: "Queued",
  approved: "Approved",
  applied: "Applied",
  responded: "Responded",
  interview: "Interview",
  offer: "Offer",
  rejected: "Rejected",
};

export const STATUS_CLASS: Record<Status, string> = {
  queued: "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-200",
  approved: "bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-200",
  applied:
    "bg-indigo-100 text-indigo-700 dark:bg-indigo-900/50 dark:text-indigo-200",
  responded:
    "bg-amber-100 text-amber-700 dark:bg-amber-900/50 dark:text-amber-200",
  interview:
    "bg-purple-100 text-purple-700 dark:bg-purple-900/50 dark:text-purple-200",
  offer:
    "bg-green-100 text-green-700 dark:bg-green-900/50 dark:text-green-200",
  rejected: "bg-red-100 text-red-700 dark:bg-red-900/50 dark:text-red-200",
};

export function scoreColor(score: number): string {
  if (score >= 60) return "text-green-600 dark:text-green-400";
  if (score >= 35) return "text-amber-600 dark:text-amber-400";
  return "text-slate-500 dark:text-slate-400";
}
