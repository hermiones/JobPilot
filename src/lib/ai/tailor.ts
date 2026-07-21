import { getGemini, GEMINI_MODEL, extractJson } from "./gemini";
import { generateJsonWithOpenAI } from "./openai";
import { generateJsonWithAnthropic } from "./anthropic";
import type { ProviderId } from "./providers";

export type TailorInput = {
  masterResume: string;
  coverLetterTone?: string;
  coverLetterTemplate?: string;
  jobTitle: string;
  company: string;
  jobDescription: string;
  applicantName?: string;
  provider?: ProviderId;
  apiKey?: string;
};

export type TailorResult = {
  tailoredBullets: string[];
  matchedKeywords: string[];
  coverLetter: string;
  summary: string;
};

const SYSTEM = `You are an expert career coach and resume writer. You tailor a candidate's existing resume to a specific job description to pass ATS keyword screening while staying strictly truthful. Never invent experience, employers, degrees, or skills the candidate does not already have. Only reorder, rephrase, and emphasize what is present in the master resume.`;

export async function tailorApplication(
  input: TailorInput
): Promise<TailorResult> {
  const provider = input.provider ?? "gemini";

  const prompt = `${SYSTEM}

## Master Resume
${input.masterResume}

## Target Job
Title: ${input.jobTitle}
Company: ${input.company}
Description:
${input.jobDescription}

## Cover Letter Style
Tone: ${input.coverLetterTone ?? "professional and concise"}
${input.coverLetterTemplate ? `Template to adapt:\n${input.coverLetterTemplate}` : ""}
Applicant name: ${input.applicantName ?? "the candidate"}

## Task
Return ONLY a JSON object with this exact shape:
{
  "tailoredBullets": string[],   // 4-6 resume bullet points, reordered/reworded for this JD, truthful to the master resume, each starting with a strong verb and including relevant keywords
  "matchedKeywords": string[],   // 5-12 important keywords/skills from the JD that the candidate genuinely has, for ATS
  "coverLetter": string,         // 150-220 word cover letter, JD-specific, in the requested tone, addressed to ${input.company}
  "summary": string              // one sentence explaining why this candidate fits this role
}
Do not include any commentary outside the JSON.`;

  let text: string;
  if (provider === "openai") {
    if (!input.apiKey) throw new Error("Add your OpenAI API key in Profile → API Keys.");
    text = await generateJsonWithOpenAI(prompt, input.apiKey);
  } else if (provider === "anthropic") {
    if (!input.apiKey) throw new Error("Add your Anthropic API key in Profile → API Keys.");
    text = await generateJsonWithAnthropic(prompt, input.apiKey);
  } else {
    const ai = getGemini(input.apiKey);
    const response = await ai.models.generateContent({
      model: GEMINI_MODEL,
      contents: prompt,
      config: {
        temperature: 0.6,
        responseMimeType: "application/json",
      },
    });
    text = response.text ?? "";
  }

  const parsed = extractJson<TailorResult>(text);

  return {
    tailoredBullets: Array.isArray(parsed.tailoredBullets)
      ? parsed.tailoredBullets
      : [],
    matchedKeywords: Array.isArray(parsed.matchedKeywords)
      ? parsed.matchedKeywords
      : [],
    coverLetter: parsed.coverLetter ?? "",
    summary: parsed.summary ?? "",
  };
}
