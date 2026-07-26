import { getGemini, GEMINI_MODEL, GEMINI_MODEL_QUALITY, extractJson } from "./gemini";
import { generateJsonWithOpenAI, OPENAI_MODEL, OPENAI_MODEL_QUALITY } from "./openai";
import { generateJsonWithAnthropic, ANTHROPIC_MODEL, ANTHROPIC_MODEL_QUALITY } from "./anthropic";
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
  // Pro plan gate: try the higher-quality model tier first, falling back to
  // the fast/default model if the quality model errors (e.g. unavailable id).
  quality?: boolean;
};

export type TailorResult = {
  matchedKeywords: string[];
  coverLetter: string;
  summary: string;
};

const SYSTEM = `You are an expert career coach and cover letter writer. You write a cover letter tailored to a specific job description, grounded strictly in the candidate's real resume. Never invent experience, employers, degrees, or skills the candidate does not already have.`;

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
  "matchedKeywords": string[],   // 5-12 important keywords/skills from the JD that the candidate genuinely has, for ATS
  "coverLetter": string,         // 150-220 word cover letter, JD-specific, in the requested tone, addressed to ${input.company}
  "summary": string              // one sentence explaining why this candidate fits this role
}
Do not include any commentary outside the JSON.`;

  async function generateGemini(model: string): Promise<string> {
    const ai = getGemini(input.apiKey);
    const response = await ai.models.generateContent({
      model,
      contents: prompt,
      config: {
        temperature: 0.6,
        responseMimeType: "application/json",
      },
    });
    return response.text ?? "";
  }

  let text: string;
  if (provider === "openai") {
    if (!input.apiKey) throw new Error("Add your OpenAI API key in Profile → API Keys.");
    const model = input.quality ? OPENAI_MODEL_QUALITY : OPENAI_MODEL;
    try {
      text = await generateJsonWithOpenAI(prompt, input.apiKey, model);
    } catch (e) {
      if (!input.quality) throw e;
      text = await generateJsonWithOpenAI(prompt, input.apiKey, OPENAI_MODEL);
    }
  } else if (provider === "anthropic") {
    if (!input.apiKey) throw new Error("Add your Anthropic API key in Profile → API Keys.");
    const model = input.quality ? ANTHROPIC_MODEL_QUALITY : ANTHROPIC_MODEL;
    try {
      text = await generateJsonWithAnthropic(prompt, input.apiKey, model);
    } catch (e) {
      if (!input.quality) throw e;
      text = await generateJsonWithAnthropic(prompt, input.apiKey, ANTHROPIC_MODEL);
    }
  } else {
    try {
      text = await generateGemini(input.quality ? GEMINI_MODEL_QUALITY : GEMINI_MODEL);
    } catch (e) {
      if (!input.quality) throw e;
      text = await generateGemini(GEMINI_MODEL);
    }
  }

  const parsed = extractJson<TailorResult>(text);

  return {
    matchedKeywords: Array.isArray(parsed.matchedKeywords)
      ? parsed.matchedKeywords
      : [],
    coverLetter: parsed.coverLetter ?? "",
    summary: parsed.summary ?? "",
  };
}
