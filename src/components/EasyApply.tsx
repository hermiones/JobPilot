"use client";

import { useCallback, useEffect, useState } from "react";
import type { QueueItem } from "@/lib/apiTypes";
import { scoreColor } from "@/lib/statusMeta";

// Fast lane for high-volume applying: no AI tailoring wait, no per-job review
// screen — just skim the ranked queue and fire off applications one click
// (or a whole batch) at a time, using whatever resume/cover letter each
// application already has (falling back to the master resume as-is).
export function EasyApply() {
  const [items, setItems] = useState<QueueItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [busyId, setBusyId] = useState<string | null>(null);
  const [bulkBusy, setBulkBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [withCoverLetter, setWithCoverLetter] = useState(false);
  const MAX_BULK_WITH_COVER_LETTER = 20;

  const load = useCallback(async () => {
    const res = await fetch("/api/queue");
    const data = await res.json();
    setItems(data.items);
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  function toggle(id: string) {
    setSelected((s) => {
      const next = new Set(s);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleAll() {
    setSelected((s) =>
      s.size === items.length ? new Set() : new Set(items.map((i) => i.application.id))
    );
  }

  async function quickApply(item: QueueItem) {
    setBusyId(item.application.id);
    if (withCoverLetter) {
      await fetch("/api/tailor", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ applicationId: item.application.id }),
      }).catch(() => {});
    }
    await fetch(`/api/applications/${item.application.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "applied" }),
    });
    window.open(item.job.url, "_blank", "noopener,noreferrer");
    setItems((arr) => arr.filter((x) => x.application.id !== item.application.id));
    setBusyId(null);
  }

  async function bulkApply() {
    if (selected.size === 0) return;
    setBulkBusy(true);
    const ids = Array.from(selected);

    if (withCoverLetter) {
      const capped = ids.slice(0, MAX_BULK_WITH_COVER_LETTER);
      setMessage(`✉️ Writing ${capped.length} cover letter(s)…`);
      for (const id of capped) {
        await fetch("/api/tailor", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ applicationId: id }),
        }).catch(() => {});
      }
    }

    const res = await fetch("/api/applications/bulk-apply", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ids }),
    });
    const data = await res.json();
    setMessage(
      `⚡ Marked ${data.applied ?? 0} applications as applied.` +
        (withCoverLetter && ids.length > MAX_BULK_WITH_COVER_LETTER
          ? ` Cover letters written for the first ${MAX_BULK_WITH_COVER_LETTER} only (to keep this fast).`
          : "")
    );
    setItems((arr) => arr.filter((x) => !selected.has(x.application.id)));
    setSelected(new Set());
    setBulkBusy(false);
  }

  if (loading) {
    return (
      <div className="space-y-3">
        <div className="h-8 w-56 rounded-md shimmer" />
        <div className="h-96 rounded-xl shimmer" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="fade-in-up flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold tracking-tight gradient-text">
            Easy Apply
          </h1>
          <p className="text-sm text-black/60 dark:text-white/60">
            Skip the review screen — one click per job, or batch-apply many at once.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <label className="flex items-center gap-2 text-sm cursor-pointer">
            <input
              type="checkbox"
              checked={withCoverLetter}
              onChange={(e) => setWithCoverLetter(e.target.checked)}
              className="h-4 w-4 accent-indigo-600"
            />
            ✉️ Also write a cover letter
          </label>
          <button
            onClick={bulkApply}
            disabled={selected.size === 0 || bulkBusy}
            className="glow-accent rounded-md bg-gradient-to-r from-indigo-600 to-violet-600 px-4 py-2 text-sm font-medium text-white hover:brightness-110 disabled:opacity-50 disabled:hover:brightness-100 transition-transform duration-150 hover:-translate-y-0.5"
          >
            {bulkBusy ? "Applying…" : `⚡ Bulk apply (${selected.size})`}
          </button>
        </div>
      </div>
      {withCoverLetter && (
        <p className="fade-in-up text-xs text-black/50 dark:text-white/50">
          Each apply will take a few extra seconds to write a cover letter first (uses your active AI provider from Profile). Bulk apply caps this at {MAX_BULK_WITH_COVER_LETTER} jobs per batch.
        </p>
      )}

      {message && (
        <div className="fade-in-up rounded-md bg-indigo-50 dark:bg-indigo-950/50 border border-indigo-200 dark:border-indigo-900 px-4 py-2 text-sm">
          {message}
        </div>
      )}

      {items.length === 0 ? (
        <div className="fade-in-up text-center py-16 space-y-2 card-surface rounded-xl border border-black/10 dark:border-white/10">
          <div className="text-4xl mb-1">🏁</div>
          <p className="text-black/60 dark:text-white/60">
            Queue&apos;s clear — refresh jobs from the Dashboard for more.
          </p>
        </div>
      ) : (
        <div className="card-surface rounded-xl border border-black/10 dark:border-white/10 bg-white/80 dark:bg-white/[0.06] backdrop-blur-md overflow-hidden">
          <div className="flex items-center gap-3 px-4 py-2 border-b border-black/5 dark:border-white/10 text-xs font-medium text-black/50 dark:text-white/50">
            <input
              type="checkbox"
              checked={selected.size === items.length && items.length > 0}
              onChange={toggleAll}
              className="h-4 w-4 accent-indigo-600"
            />
            <span>{selected.size > 0 ? `${selected.size} selected` : "Select all"}</span>
            <span className="ml-auto">{items.length} in queue</span>
          </div>
          <ul className="divide-y divide-black/5 dark:divide-white/10 max-h-[65vh] overflow-y-auto">
            {items.map((item, i) => (
              <li
                key={item.application.id}
                className="fade-in-up flex flex-wrap items-center gap-2 sm:gap-3 px-4 py-3 hover:bg-black/[0.02] dark:hover:bg-white/[0.03] transition-colors duration-150"
                style={{ ["--delay" as string]: `${Math.min(i, 12) * 25}ms` }}
              >
                <input
                  type="checkbox"
                  checked={selected.has(item.application.id)}
                  onChange={() => toggle(item.application.id)}
                  className="h-4 w-4 accent-indigo-600 shrink-0"
                />
                {item.match && (
                  <span
                    className={`w-10 shrink-0 text-right text-sm font-bold tabular-nums ${scoreColor(item.match.relevanceScore)}`}
                  >
                    {Math.round(item.match.relevanceScore)}
                  </span>
                )}
                <div className="min-w-0 flex-1 basis-full sm:basis-auto order-last sm:order-none">
                  <p className="font-medium truncate">{item.job.title}</p>
                  <p className="text-xs text-black/60 dark:text-white/60 truncate">
                    {item.job.company}
                    {item.job.location ? ` · ${item.job.location}` : ""}
                    {item.job.salaryRange ? ` · ${item.job.salaryRange}` : ""}
                  </p>
                </div>
                <a
                  href={item.job.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="shrink-0 text-xs text-indigo-600 dark:text-indigo-400 hover:underline hidden sm:inline"
                >
                  View →
                </a>
                <button
                  onClick={() => quickApply(item)}
                  disabled={busyId === item.application.id}
                  className="shrink-0 ml-auto sm:ml-0 rounded-md bg-gradient-to-r from-green-600 to-emerald-500 px-3 py-1.5 text-xs font-semibold text-white hover:brightness-110 disabled:opacity-60 transition-transform duration-150 hover:-translate-y-0.5"
                >
                  {busyId === item.application.id ? "…" : "⚡ Apply"}
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
