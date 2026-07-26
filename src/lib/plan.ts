export type Plan = "free" | "pro";

export function isPlan(v: string): v is Plan {
  return v === "free" || v === "pro";
}

// Max A/B/C resume variants a plan can generate per application.
const VARIANT_LIMITS: Record<Plan, number> = { free: 1, pro: 3 };
export function maxVariants(plan: string): number {
  return VARIANT_LIMITS[isPlan(plan) ? plan : "free"];
}

// Max daily schedule slots (IST run times) a plan can save.
const SCHEDULE_LIMITS: Record<Plan, number> = { free: 1, pro: 8 };
export function maxScheduleTimes(plan: string): number {
  return SCHEDULE_LIMITS[isPlan(plan) ? plan : "free"];
}

// Whether a plan can use the higher-quality (slower/pricier) model tier for
// AI tailoring instead of the fast default.
export function canUseQualityModel(plan: string): boolean {
  return plan === "pro";
}

export const VARIANT_LABELS = ["A", "B", "C"] as const;
export const VARIANT_TONES = ["professional", "enthusiastic", "concise"] as const;

// Successful referred signups needed to auto-unlock Pro for free.
export const REFERRAL_GOAL = 3;
