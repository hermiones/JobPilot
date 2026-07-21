"use client";

import { useState } from "react";
import type { QueueItem, TailorResult } from "@/lib/apiTypes";
import { scoreColor } from "@/lib/statusMeta";

export function ReviewCard({
  item,
  onSkip,
  onApplied,
}: {
  item: QueueItem;
  onSkip: () => void;
  onApplied: () => void;
  onNext: () => void;
}) {
  const { job, match, application } = item;

  const [tailoring, setTailoring] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<TailorResult | null>(
    application.resumeVersion || application.coverLetterVersion
      ? {
          tailoredBullets: application.resumeVersion
            ? application.resumeVersion.split("\n").filter(Boolean)
            : [],
          matchedKeywords: [],
          coverLetter: application.coverLetterVersion ?? "",
          summary: "",
        }
      : null
  );
  const [bullets, setBullets] = useState("");
  const [coverLetter, setCoverLetter] = useState(
    application.coverLetterVersion ?? ""
  );
  const [busy, setBusy] = useState(false);

  async function tailor() {
    setTailoring(true);
    setError(null);
    try {
      const res = await fetch("/api/tailor", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ applicationId: application.id }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Tailoring failed");
        return;
      }
      const r = data as TailorResult;
      setResult(r);
      setBullets(r.tailoredBullets.join("\n"));
      setCoverLetter(r.coverLetter);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setTailoring(false);
    }
  }

  async function copy(text: string) {
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      /* clipboard may be unavailable */
    }
  }

  async function approveAndOpen() {
    setBusy(true);
    // Persist any edits as the versions used, then mark applied.
    await fetch(`/api/applications/${application.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "applied" }),
    });
    window.open(job.url, "_blank", "noopener,noreferrer");
    setBusy(false);
    onApplied();
  }

  async function skip() {
    setBusy(true);
    await fetch(`/api/applications/${application.id}`, { method: "DELETE" });
    setBusy(false);
    onSkip();
  }

  const inputClass =
    "w-full rounded-md border border-black/15 dark:border-white/15 bg-white dark:bg-white/5 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-500";

  const displayBullets =
    bullets || (result ? result.tailoredBullets.join("\n") : "");

  return (
    <div className="rounded-xl border border-black/10 dark:border-white/10 bg-white dark:bg-white/5 overflow-hidden">
      {/* Header */}
      <div className="p-5 border-b border-black/5 dark:border-white/10">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <h2 className="text-lg font-semibold truncate">{job.title}</h2>
            <p className="text-sm text-black/60 dark:text-white/60">
              {job.company}
              {job.location ? ` · ${job.location}` : ""}
              {job.salaryRange ? ` · ${job.salaryRange}` : ""}
            </p>
            <p className="text-xs text-black/40 dark:text-white/40 mt-0.5 uppercase tracking-wide">
              {job.source}
            </p>
          </div>
          {match && (
            <div className="text-right shrink-0">
              <div className={`text-2xl font-bold ${scoreColor(match.relevanceScore)}`}>
                {Math.round(match.relevanceScore)}
              </div>
              <div className="text-xs text-black/50 dark:text-white/50">
                relevance
              </div>
            </div>
          )}
        </div>
        {match && match.reasons.length > 0 && (
          <ul className="mt-3 flex flex-wrap gap-1.5">
            {match.reasons.map((r, i) => (
              <li
                key={i}
                className="rounded-full bg-black/5 dark:bg-white/10 px-2 py-0.5 text-xs text-black/70 dark:text-white/70"
              >
                {r}
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="grid lg:grid-cols-2 divide-y lg:divide-y-0 lg:divide-x divide-black/5 dark:divide-white/10">
        {/* JD */}
        <div className="p-5">
          <h3 className="text-sm font-medium mb-2">Job description</h3>
          <div className="max-h-72 overflow-y-auto text-sm text-black/75 dark:text-white/75 whitespace-pre-wrap leading-relaxed">
            {job.description || "No description provided."}
          </div>
        </div>

        {/* Tailored docs */}
        <div className="p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-medium">AI-tailored documents</h3>
            <button
              onClick={tailor}
              disabled={tailoring}
              className="rounded-md bg-indigo-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-indigo-500 disabled:opacity-60"
            >
              {tailoring
                ? "Generating…"
                : result
                ? "Regenerate"
                : "Generate with AI"}
            </button>
          </div>

          {error && (
            <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
          )}

          {!result && !tailoring && (
            <p className="text-sm text-black/50 dark:text-white/50">
              Click “Generate with AI” to tailor resume bullets and a cover letter
              to this job using Gemini.
            </p>
          )}

          {result && (
            <>
              {result.matchedKeywords.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {result.matchedKeywords.map((k, i) => (
                    <span
                      key={i}
                      className="rounded bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 px-1.5 py-0.5 text-xs"
                    >
                      {k}
                    </span>
                  ))}
                </div>
              )}

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-medium text-black/60 dark:text-white/60">
                    Tailored resume bullets
                  </label>
                  <button
                    onClick={() => copy(displayBullets)}
                    className="text-xs text-indigo-600 dark:text-indigo-400 hover:underline"
                  >
                    Copy
                  </button>
                </div>
                <textarea
                  className={`${inputClass} font-mono text-xs`}
                  rows={6}
                  value={displayBullets}
                  onChange={(e) => setBullets(e.target.value)}
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-medium text-black/60 dark:text-white/60">
                    Cover letter
                  </label>
                  <button
                    onClick={() => copy(coverLetter)}
                    className="text-xs text-indigo-600 dark:text-indigo-400 hover:underline"
                  >
                    Copy
                  </button>
                </div>
                <textarea
                  className={inputClass}
                  rows={7}
                  value={coverLetter}
                  onChange={(e) => setCoverLetter(e.target.value)}
                />
              </div>
            </>
          )}
        </div>
      </div>

      {/* Actions */}
      <div className="p-4 border-t border-black/5 dark:border-white/10 flex items-center justify-between gap-3 bg-black/[0.02] dark:bg-white/[0.02]">
        <button
          onClick={skip}
          disabled={busy}
          className="rounded-md border border-black/15 dark:border-white/15 px-4 py-2 text-sm font-medium hover:bg-black/5 dark:hover:bg-white/10 disabled:opacity-60"
        >
          Skip
        </button>
        <button
          onClick={approveAndOpen}
          disabled={busy}
          className="rounded-md bg-green-600 px-5 py-2 text-sm font-medium text-white hover:bg-green-500 disabled:opacity-60"
        >
          Approve &amp; Open →
        </button>
      </div>
    </div>
  );
}
