// Registry of AI providers users can bring their own API key for. Gemini is
// the recommended default since the app also has a server-side fallback key
// (env GEMINI_API_KEY) and a generous free tier — other providers require the
// user's own key with no fallback.
export const AI_PROVIDERS = [
  {
    id: "gemini",
    label: "Google Gemini",
    recommended: true,
    hint: "Recommended — free tier available, and falls back to the app's shared key if you don't set your own.",
  },
  {
    id: "openai",
    label: "OpenAI",
    recommended: false,
    hint: "Uses your own OpenAI key, billed to your OpenAI account.",
  },
  {
    id: "anthropic",
    label: "Anthropic Claude",
    recommended: false,
    hint: "Uses your own Anthropic key, billed to your Anthropic account.",
  },
] as const;

export type ProviderId = (typeof AI_PROVIDERS)[number]["id"];

export function isProviderId(v: string): v is ProviderId {
  return AI_PROVIDERS.some((p) => p.id === v);
}
