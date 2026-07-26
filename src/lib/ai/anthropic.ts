// Minimal Anthropic Messages API caller — no SDK dependency needed for a
// single JSON-mode prompt/response round trip.
export const ANTHROPIC_MODEL = "claude-haiku-4-5-20251001";
export const ANTHROPIC_MODEL_QUALITY = "claude-sonnet-5";

export async function generateJsonWithAnthropic(
  prompt: string,
  apiKey: string,
  model: string = ANTHROPIC_MODEL
): Promise<string> {
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model,
      max_tokens: 2048,
      temperature: 0.6,
      messages: [{ role: "user", content: prompt }],
    }),
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Anthropic API error (${res.status}): ${body.slice(0, 300)}`);
  }

  const data = await res.json();
  const text = data.content?.[0]?.text;
  if (typeof text !== "string") {
    throw new Error("Anthropic response missing message content");
  }
  return text;
}
