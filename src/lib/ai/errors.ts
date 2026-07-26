// Turns a raw provider error (Gemini SDK error, or our fetch-based OpenAI/
// Anthropic wrappers) into a message a user can actually act on, instead of a
// raw stack trace or JSON blob. This is what shows up as the tailoring error
// banner in the review queue.
export function classifyAiError(e: unknown, providerLabel: string): string {
  const raw = e instanceof Error ? e.message : String(e);
  const lower = raw.toLowerCase();

  const isRateLimit =
    lower.includes("429") ||
    lower.includes("rate limit") ||
    lower.includes("resource_exhausted") ||
    lower.includes("too many requests");
  if (isRateLimit) {
    return `${providerLabel} is rate-limiting requests right now (too many requests / quota hit). Wait a minute and try again, or switch providers in Profile → API Keys.`;
  }

  const isQuota =
    lower.includes("insufficient_quota") ||
    lower.includes("quota exceeded") ||
    lower.includes("billing");
  if (isQuota) {
    return `${providerLabel} says its usage quota/billing limit is exhausted. Check that account's billing, or switch providers in Profile → API Keys.`;
  }

  const isAuth =
    lower.includes("401") ||
    lower.includes("403") ||
    lower.includes("unauthorized") ||
    lower.includes("invalid api key") ||
    lower.includes("permission_denied") ||
    lower.includes("api key not valid");
  if (isAuth) {
    return `${providerLabel} rejected the API key. Double-check it in Profile → API Keys.`;
  }

  const isServerError =
    lower.includes("500") || lower.includes("502") || lower.includes("503") || lower.includes("unavailable");
  if (isServerError) {
    return `${providerLabel} is having issues on its end right now (server error). Try again shortly, or switch providers in Profile → API Keys.`;
  }

  return `${providerLabel} request failed: ${raw}`;
}

export const PROVIDER_LABELS: Record<string, string> = {
  gemini: "Gemini",
  openai: "OpenAI",
  anthropic: "Anthropic",
};
