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
    return (
      <div className="space-y-4">
        <div className="h-8 w-56 rounded-md shimmer" />
        <div className="h-96 rounded-xl shimmer" />
      </div>
    );
  }

  const remaining = items.length;

  if (remaining === 0) {
    return (
      <div className="fade-in-up text-center py-16 space-y-3">
        <div className="text-5xl mb-2">🏁</div>
        <h1 className="text-2xl font-bold tracking-tight gradient-text">
          Queue&apos;s clear
        </h1>
        <p className="text-black/60 dark:text-white/60">
          Nothing left to review right now. Hit refresh on the dashboard to
          summon more matches.
        </p>
        <Link
          href="/"
          className="glow-accent inline-block rounded-md bg-gradient-to-r from-indigo-600 to-violet-600 px-4 py-2 text-sm font-medium text-white hover:brightness-110"
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
      <div className="fade-in-up flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight gradient-text">
            The Queue
          </h1>
          <p className="text-sm text-black/60 dark:text-white/60">
            {safeIndex + 1} of {remaining} · ranked by relevance, best match first
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
