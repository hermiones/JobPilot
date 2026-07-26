// Minimal OpenAI Chat Completions caller — no SDK dependency needed for a
// single JSON-mode prompt/response round trip.
export const OPENAI_MODEL = "gpt-4o-mini";
export const OPENAI_MODEL_QUALITY = "gpt-4o";

export async function generateJsonWithOpenAI(
  prompt: string,
  apiKey: string,
  model: string = OPENAI_MODEL
): Promise<string> {
  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      messages: [{ role: "user", content: prompt }],
      temperature: 0.6,
      response_format: { type: "json_object" },
    }),
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`OpenAI API error (${res.status}): ${body.slice(0, 300)}`);
  }

  const data = await res.json();
  const text = data.choices?.[0]?.message?.content;
  if (typeof text !== "string") {
    throw new Error("OpenAI response missing message content");
  }
  return text;
}
