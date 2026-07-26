"use client";

import { useEffect, useState } from "react";
import type { VariantAnalyticsEntry } from "@/lib/apiTypes";
import { CountUp } from "@/components/CountUp";

const BAR_COLORS: Record<string, string> = {
  A: "from-indigo-600 to-violet-600",
  B: "from-cyan-500 to-blue-500",
  C: "from-fuchsia-500 to-pink-500",
};

export function VariantAnalytics() {
  const [entries, setEntries] = useState<VariantAnalyticsEntry[] | null>(null);

  useEffect(() => {
    fetch("/api/analytics/variants")
      .then((r) => r.json())
      .then((d) => setEntries(d.entries ?? []));
  }, []);

  if (entries === null) {
    return <div className="h-40 rounded-xl shimmer" />;
  }

  const totalApplied = entries.reduce((s, e) => s + e.applied, 0);
  const best =
    entries.length > 1
      ? entries.reduce((a, b) => (b.responseRate > a.responseRate ? b : a))
      : null;

  return (
    <section
      className="fade-in-up card-surface rounded-xl border border-black/10 dark:border-white/10 bg-white/80 dark:bg-white/[0.06] backdrop-blur-md p-5"
      style={{ ["--delay" as string]: "260ms" }}
    >
      <div className="flex items-center justify-between mb-1">
        <div>
          <h2 className="font-semibold">Which cover letter works best?</h2>
        </div>
        {best && entries.length > 1 && (
          <span className="rounded-full bg-emerald-100 text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-200 px-2 py-0.5 text-xs font-medium">
            &quot;{best.label}&quot; is winning
          </span>
        )}
      </div>
      <p className="text-sm text-black/60 dark:text-white/60 mb-3">
        When you write more than one cover letter for a job (Pro plan), we tag each one
        &quot;A&quot;, &quot;B&quot;, or &quot;C&quot; and track which ones actually get a
        reply — so you can see which style/tone works better for you.
      </p>

      {totalApplied === 0 ? (
        <p className="text-sm text-black/60 dark:text-white/60">
          Nothing to compare yet. In the review queue, generate a second cover
          letter for a job (Pro plan) — once you apply and hear back, it&apos;ll show up here.
        </p>
      ) : (
        <div className="space-y-3">
          {entries.map((e, i) => (
            <div
              key={e.label}
              className="fade-in-up"
              style={{ ["--delay" as string]: `${i * 80}ms` }}
            >
              <div className="flex items-center justify-between text-sm mb-1">
                <span className="font-medium">Version &quot;{e.label}&quot;</span>
                <span className="text-black/60 dark:text-white/60">
                  <CountUp value={e.responded} /> replied out of <CountUp value={e.applied} /> sent ·{" "}
                  {Math.round(e.responseRate * 100)}%
                </span>
              </div>
              <div className="h-2.5 w-full rounded-full bg-black/10 dark:bg-white/10 overflow-hidden">
                <div
                  className={`h-full rounded-full bg-gradient-to-r ${BAR_COLORS[e.label] ?? "from-indigo-600 to-violet-600"} transition-all duration-700 ease-out`}
                  style={{ width: `${Math.max(4, Math.round(e.responseRate * 100))}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
