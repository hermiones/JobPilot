import { GoogleGenAI } from "@google/genai";

// Cached per API key so bring-your-own-key users each get their own client
// without re-instantiating one on every request.
const clients = new Map<string, GoogleGenAI>();

export function getGemini(apiKey?: string): GoogleGenAI {
  const key = apiKey || process.env.GEMINI_API_KEY;
  if (!key) {
    throw new Error("No Gemini API key available. Add one in Profile → API Keys, or set GEMINI_API_KEY.");
  }
  let client = clients.get(key);
  if (!client) {
    client = new GoogleGenAI({ apiKey: key });
    clients.set(key, client);
  }
  return client;
}

// Fast, cheap model is ideal for high-volume per-job tailoring (<10s target).
// "-latest" alias tracks the current stable Flash model without code changes.
export const GEMINI_MODEL = "gemini-flash-latest";

// Pull the first JSON object/array out of a model response that may be wrapped
// in markdown fences or prose.
export function extractJson<T>(text: string): T {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const candidate = fenced ? fenced[1] : text;
  const start = candidate.search(/[[{]/);
  if (start === -1) throw new Error("No JSON found in model response");
  const sliced = candidate.slice(start).trim();
  return JSON.parse(sliced) as T;
}
