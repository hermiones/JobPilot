import { GoogleGenAI } from "@google/genai";

let client: GoogleGenAI | null = null;

export function getGemini(): GoogleGenAI {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY is not set. Add it to .env");
  }
  if (!client) {
    client = new GoogleGenAI({ apiKey });
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
