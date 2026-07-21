"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import type { QueueItem } from "@/lib/apiTypes";
import { ReviewCard } from "@/components/ReviewCard";

export function ReviewQueue() {
  const [items, setItems] = useState<QueueItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [index, setIndex] = useState(0);

  const load = useCallback(async () => {
    const res = await fetch("/api/queue");
    const data = await res.json();
    setItems(data.items);
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const advance = useCallback(() => {
    setIndex((i) => i + 1);
  }, []);

  // Remove the current item from the list after an action, keeping index stable.
  const removeCurrent = useCallback((id: string) => {
    setItems((arr) => arr.filter((x) => x.application.id !== id));
    setIndex((i) => Math.min(i, Math.max(0, items.length - 2)));
  }, [items.length]);

  if (loading) {
    return <p className="text-black/60 dark:text-white/60">Loading queue…</p>;
  }

  const remaining = items.length;

  if (remaining === 0) {
    return (
      <div className="text-center py-16 space-y-3">
        <h1 className="text-2xl font-semibold tracking-tight">Queue empty</h1>
        <p className="text-black/60 dark:text-white/60">
          No jobs to review. Refresh listings from the dashboard to fill the queue.
        </p>
        <Link
          href="/"
          className="inline-block rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-500"
        >
          Go to dashboard
        </Link>
      </div>
    );
  }

  const safeIndex = Math.min(index, remaining - 1);
  const current = items[safeIndex];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Review Queue</h1>
          <p className="text-sm text-black/60 dark:text-white/60">
            {safeIndex + 1} of {remaining} · ranked by relevance
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setIndex((i) => Math.max(0, i - 1))}
            disabled={safeIndex === 0}
            className="rounded-md border border-black/10 dark:border-white/15 px-3 py-1.5 text-sm disabled:opacity-40"
          >
            ← Prev
          </button>
          <button
            onClick={() => setIndex((i) => Math.min(remaining - 1, i + 1))}
            disabled={safeIndex >= remaining - 1}
            className="rounded-md border border-black/10 dark:border-white/15 px-3 py-1.5 text-sm disabled:opacity-40"
          >
            Next →
          </button>
        </div>
      </div>

      <ReviewCard
        key={current.application.id}
        item={current}
        onSkip={() => {
          removeCurrent(current.application.id);
        }}
        onApplied={() => {
          removeCurrent(current.application.id);
        }}
        onNext={advance}
      />
    </div>
  );
}
