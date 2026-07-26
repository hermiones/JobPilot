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
    keyUrl: "https://aistudio.google.com/apikey",
    howTo: "Google AI Studio → \"Create API key\" → pick a project → copy the key. Free tier included, no card required.",
  },
  {
    id: "openai",
    label: "OpenAI",
    recommended: false,
    hint: "Uses your own OpenAI key, billed to your OpenAI account.",
    keyUrl: "https://platform.openai.com/api-keys",
    howTo: "OpenAI Platform → API keys → \"Create new secret key\" → copy it immediately (shown once). Requires a funded account.",
  },
  {
    id: "anthropic",
    label: "Anthropic Claude",
    recommended: false,
    hint: "Uses your own Anthropic key, billed to your Anthropic account.",
    keyUrl: "https://console.anthropic.com/settings/keys",
    howTo: "Anthropic Console → Settings → API Keys → \"Create Key\" → copy it. New accounts get a small free credit grant.",
  },
] as const;

export type ProviderId = (typeof AI_PROVIDERS)[number]["id"];

export function isProviderId(v: string): v is ProviderId {
  return AI_PROVIDERS.some((p) => p.id === v);
}
