"use client";

import { useEffect, useState } from "react";
import type { ApplicationVariantDTO, QueueItem, TailorResult } from "@/lib/apiTypes";
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
  const [matchedKeywords, setMatchedKeywords] = useState<string[]>([]);
  const [coverLetter, setCoverLetter] = useState(
    application.coverLetterVersion ?? ""
  );
  const [busy, setBusy] = useState(false);
  const [resumeName, setResumeName] = useState<string | null>(
    application.attachedResumeName
  );
  const [uploading, setUploading] = useState(false);

  // A/B/C cover letter variants (Pro plan feature)
  const [variants, setVariants] = useState<ApplicationVariantDTO[]>([]);
  const [selectedVariantId, setSelectedVariantId] = useState<string | null>(
    application.selectedVariantId
  );
  const [maxVar, setMaxVar] = useState(1);
  const [plan, setPlanState] = useState("free");
  const [generatingVariant, setGeneratingVariant] = useState(false);

  function hydrateFromVariant(v: ApplicationVariantDTO) {
    setCoverLetter(v.coverLetterVersion);
  }

  async function fetchVariants() {
    const res = await fetch(`/api/tailor/variants?applicationId=${application.id}`);
    if (!res.ok) return;
    const data = await res.json();
    setVariants(data.variants);
    setMaxVar(data.maxVariants);
    setPlanState(data.plan);
    setSelectedVariantId(data.selectedVariantId);
    const sel =
      data.variants.find(
        (v: ApplicationVariantDTO) => v.id === data.selectedVariantId
      ) ?? data.variants[0];
    if (sel) hydrateFromVariant(sel);
  }

  useEffect(() => {
    fetchVariants();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [application.id]);

  async function attachResume(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    const form = new FormData();
    form.append("file", file);
    const res = await fetch(`/api/applications/${application.id}/resume`, {
      method: "POST",
      body: form,
    });
    if (res.ok) {
      const data = await res.json();
      setResumeName(data.attachedResumeName);
    }
    setUploading(false);
  }

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
        setError(data.error ?? "Cover letter generation failed");
        return;
      }
      const r = data as TailorResult;
      setCoverLetter(r.coverLetter);
      setMatchedKeywords(r.matchedKeywords);
      await fetchVariants();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setTailoring(false);
    }
  }

  async function addVariant() {
    setGeneratingVariant(true);
    setError(null);
    try {
      const res = await fetch("/api/tailor/variants", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ applicationId: application.id }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Couldn't generate that variant.");
        return;
      }
      setVariants(data.variants);
      setMaxVar(data.maxVariants);
      setPlanState(data.plan);
      setSelectedVariantId(data.selectedVariantId);
      const sel = data.variants.find(
        (v: ApplicationVariantDTO) => v.id === data.selectedVariantId
      );
      if (sel) hydrateFromVariant(sel);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setGeneratingVariant(false);
    }
  }

  function selectVariant(v: ApplicationVariantDTO) {
    if (v.id === selectedVariantId) return;
    setSelectedVariantId(v.id);
    hydrateFromVariant(v);
    fetch("/api/tailor/select", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ applicationId: application.id, variantId: v.id }),
    });
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
    "w-full rounded-md border border-black/15 dark:border-white/15 bg-white/80 dark:bg-white/[0.06] backdrop-blur-md px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-500 transition-shadow duration-200";

  return (
    <div className="fade-in-up card-surface rounded-xl border border-black/10 dark:border-white/10 bg-white/80 dark:bg-white/[0.06] backdrop-blur-md overflow-hidden">
      {/* Header */}
      <div className="p-4 sm:p-5 border-b border-black/5 dark:border-white/10">
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
              <div className={`text-2xl sm:text-3xl font-black tabular-nums ${scoreColor(match.relevanceScore)}`}>
                {Math.round(match.relevanceScore)}
                <span className="text-sm font-medium opacity-60">%</span>
              </div>
              <div className="text-xs text-black/50 dark:text-white/50 uppercase tracking-wide">
                match score
              </div>
            </div>
          )}
        </div>
        {match && match.reasons.length > 0 && (
          <ul className="mt-3 flex flex-wrap gap-1.5">
            {match.reasons.map((r, i) => (
              <li
                key={i}
                className="fade-in-up rounded-full bg-black/5 dark:bg-white/10 px-2 py-0.5 text-xs text-black/70 dark:text-white/70"
                style={{ ["--delay" as string]: `${i * 40}ms` }}
              >
                {r}
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="grid lg:grid-cols-2 divide-y lg:divide-y-0 lg:divide-x divide-black/5 dark:divide-white/10">
        {/* JD */}
        <div className="p-4 sm:p-5">
          <h3 className="text-sm font-medium mb-2">Job description</h3>
          <div className="max-h-56 sm:max-h-72 overflow-y-auto text-sm text-black/75 dark:text-white/75 whitespace-pre-wrap leading-relaxed">
            {job.description || "No description provided."}
          </div>
        </div>

        {/* Cover letter */}
        <div className="p-4 sm:p-5 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-medium">✉️ AI cover letter</h3>
          </div>

          {/* Variant tabs — A/B/C testing (Pro plan) */}
          {variants.length > 0 && (
            <div className="space-y-1">
              {variants.length > 1 && (
                <p className="text-xs text-black/50 dark:text-white/50">
                  Each letter below (A, B, C) is a different version — same job, different wording/tone. Send different ones to similar jobs and see which gets more replies.
                </p>
              )}
            <div className="flex flex-wrap items-center gap-1.5">
              {variants.map((v) => (
                <button
                  key={v.id}
                  onClick={() => selectVariant(v)}
                  className={`rounded-full px-3 py-1 text-xs font-semibold transition-all duration-200 ${
                    v.id === selectedVariantId
                      ? "bg-gradient-to-r from-indigo-600 to-violet-600 text-white shadow-sm scale-105"
                      : "bg-black/5 dark:bg-white/10 text-black/60 dark:text-white/60 hover:bg-black/10 dark:hover:bg-white/15 hover:-translate-y-0.5"
                  }`}
                  title={v.tone ? `Tone: ${v.tone}` : undefined}
                >
                  Variant {v.label}
                </button>
              ))}
              {variants.length < maxVar && (
                <button
                  onClick={addVariant}
                  disabled={generatingVariant}
                  className="rounded-full border border-dashed border-indigo-400/50 px-3 py-1 text-xs font-medium text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 transition-colors duration-200 disabled:opacity-50"
                >
                  {generatingVariant ? "✨ Generating…" : "+ Variant"}
                </button>
              )}
              {variants.length >= maxVar && plan === "free" && (
                <a
                  href="/profile"
                  className="rounded-full border border-black/10 dark:border-white/10 px-3 py-1 text-xs text-black/50 dark:text-white/50 hover:text-indigo-600 dark:hover:text-indigo-400 hover:border-indigo-400/50 transition-colors duration-200"
                  title="Upgrade to Pro in Profile for A/B/C variant testing"
                >
                  🔒 Upgrade for A/B testing
                </a>
              )}
            </div>
            </div>
          )}

          {error && (
            <p className="fade-in-up text-sm text-red-600 dark:text-red-400">{error}</p>
          )}

          {matchedKeywords.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {matchedKeywords.map((k, i) => (
                <span
                  key={i}
                  className="rounded bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 px-1.5 py-0.5 text-xs"
                >
                  {k}
                </span>
              ))}
            </div>
          )}

          <div className="rounded-lg border border-black/10 dark:border-white/10 p-3 space-y-2">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <label className="text-xs font-medium text-black/60 dark:text-white/60">
                Cover letter
              </label>
              {coverLetter && (
                <div className="flex items-center gap-3">
                  {plan === "pro" ? (
                    <a
                      href={`/api/applications/${application.id}/cover-letter/pdf`}
                      className="rounded-md border border-indigo-400/40 px-2 py-1 text-xs font-medium text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 transition-colors duration-150"
                    >
                      ⬇ Download PDF
                    </a>
                  ) : (
                    <a
                      href="/profile"
                      title="Upgrade to Pro to download cover letters as PDF"
                      className="rounded-md border border-black/15 dark:border-white/15 px-2 py-1 text-xs text-black/50 dark:text-white/50 hover:text-indigo-600 dark:hover:text-indigo-400 hover:border-indigo-400/50 transition-colors duration-150"
                    >
                      🔒 Download PDF
                    </a>
                  )}
                  <button
                    onClick={() => copy(coverLetter)}
                    className="text-xs text-indigo-600 dark:text-indigo-400 hover:underline"
                  >
                    Copy
                  </button>
                </div>
              )}
            </div>

            {!coverLetter ? (
              <div className="space-y-2">
                <p className="text-xs text-black/50 dark:text-white/50">
                  Generates a cover letter matched to this job description and your master resume.
                </p>
                <button
                  onClick={tailor}
                  disabled={tailoring}
                  className="glow-accent rounded-md bg-gradient-to-r from-indigo-600 to-violet-600 px-3 py-1.5 text-xs font-medium text-white hover:brightness-110 disabled:opacity-60 transition-transform duration-150 hover:-translate-y-0.5"
                >
                  {tailoring ? "✉️ Writing…" : "✉️ Create Cover Letter"}
                </button>
              </div>
            ) : (
              <>
                <textarea
                  className={`${inputClass} fade-in-up`}
                  rows={9}
                  value={coverLetter}
                  onChange={(e) => setCoverLetter(e.target.value)}
                />
                <button
                  onClick={tailor}
                  disabled={tailoring}
                  className="text-xs font-medium text-indigo-600 dark:text-indigo-400 hover:underline disabled:opacity-60"
                >
                  {tailoring ? "✉️ Rewriting…" : "🔁 Regenerate this variant"}
                </button>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Resume attachment */}
      <div className="px-4 py-3 border-t border-black/5 dark:border-white/10 flex flex-wrap items-center gap-3">
        <span className="text-sm font-medium">Resume for this job:</span>
        <label className="cursor-pointer rounded-md border border-black/15 dark:border-white/15 px-3 py-1.5 text-sm hover:bg-black/5 dark:hover:bg-white/10 transition-colors duration-150">
          {uploading ? "Uploading…" : resumeName ? "Replace file" : "Attach file"}
          <input
            type="file"
            accept=".pdf,.doc,.docx,.txt"
            onChange={attachResume}
            className="hidden"
          />
        </label>
        {resumeName && (
          <a
            href={`/api/applications/${application.id}/resume`}
            className="text-sm text-indigo-600 dark:text-indigo-400 hover:underline"
          >
            📎 {resumeName}
          </a>
        )}
      </div>

      {/* Actions */}
      <div className="p-4 border-t border-black/5 dark:border-white/10 flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-black/[0.02] dark:bg-white/[0.02]">
        <button
          onClick={skip}
          disabled={busy}
          className="rounded-md border border-black/15 dark:border-white/15 px-4 py-2 text-sm font-medium hover:bg-black/5 dark:hover:bg-white/10 disabled:opacity-60 transition-transform duration-150 sm:hover:-translate-y-0.5"
        >
          ✋ Skip
        </button>
        <button
          onClick={approveAndOpen}
          disabled={busy}
          className="glow-accent rounded-md bg-gradient-to-r from-green-600 to-emerald-500 px-5 py-2 text-sm font-semibold text-white hover:brightness-110 disabled:opacity-60 disabled:hover:brightness-100 transition-transform duration-150 sm:hover:-translate-y-0.5"
        >
          🚀 Approve &amp; Open →
        </button>
      </div>
    </div>
  );
}
