"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { formatDistanceToNow } from "date-fns";
import type { DashboardData } from "@/lib/apiTypes";
import { STATUS_LABEL, STATUS_CLASS, STATUS_ORDER } from "@/lib/statusMeta";

export function Dashboard() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const load = useCallback(async () => {
    const res = await fetch("/api/dashboard");
    setData(await res.json());
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function refreshJobs() {
    setRefreshing(true);
    setMessage(null);
    try {
      const fetchRes = await fetch("/api/jobs/refresh", { method: "POST" });
      const fetchData = await fetchRes.json();
      const scoreRes = await fetch("/api/matches/rescore", { method: "POST" });
      const scoreData = await scoreRes.json();
      setMessage(
        `Fetched ${fetchData.created ?? 0} listings · queued ${
          scoreData.queued ?? 0
        } new matches` +
          (fetchData.errors?.length
            ? ` · ${fetchData.errors.length} source error(s)`
            : "")
      );
      await load();
    } catch (e) {
      setMessage(`Refresh failed: ${(e as Error).message}`);
    } finally {
      setRefreshing(false);
    }
  }

  if (loading || !data) {
    return <p className="text-black/60 dark:text-white/60">Loading dashboard…</p>;
  }

  const goalPct = Math.min(
    100,
    Math.round((data.appliedToday / Math.max(1, data.dailyGoal)) * 100)
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Dashboard</h1>
          <p className="text-sm text-black/60 dark:text-white/60">
            Track your daily application goal and pipeline.
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={refreshJobs}
            disabled={refreshing}
            className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-500 disabled:opacity-60"
          >
            {refreshing ? "Refreshing…" : "Refresh jobs"}
          </button>
          <Link
            href="/review"
            className="rounded-md border border-black/10 dark:border-white/15 px-4 py-2 text-sm font-medium hover:bg-black/5 dark:hover:bg-white/10"
          >
            Review queue →
          </Link>
        </div>
      </div>

      {message && (
        <div className="rounded-md bg-indigo-50 dark:bg-indigo-950/50 border border-indigo-200 dark:border-indigo-900 px-4 py-2 text-sm">
          {message}
        </div>
      )}

      {/* Daily goal */}
      <section className="rounded-xl border border-black/10 dark:border-white/10 bg-white dark:bg-white/5 p-5">
        <div className="flex items-baseline justify-between">
          <h2 className="font-medium">Today&apos;s goal</h2>
          <span className="text-sm text-black/60 dark:text-white/60">
            {data.appliedToday} / {data.dailyGoal} applied
          </span>
        </div>
        <div className="mt-3 h-3 w-full rounded-full bg-black/10 dark:bg-white/10 overflow-hidden">
          <div
            className="h-full rounded-full bg-indigo-600 transition-all"
            style={{ width: `${goalPct}%` }}
          />
        </div>
        <p className="mt-2 text-sm text-black/60 dark:text-white/60">
          {data.appliedToday >= data.dailyGoal
            ? "🎉 Daily goal reached!"
            : `${data.dailyGoal - data.appliedToday} to go — keep it up.`}
        </p>
      </section>

      {/* Funnel */}
      <section className="rounded-xl border border-black/10 dark:border-white/10 bg-white dark:bg-white/5 p-5">
        <h2 className="font-medium mb-3">Pipeline funnel</h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3">
          {STATUS_ORDER.map((s) => (
            <div
              key={s}
              className="rounded-lg border border-black/5 dark:border-white/10 p-3 text-center"
            >
              <div className="text-2xl font-semibold">{data.funnel[s]}</div>
              <span
                className={`mt-1 inline-block rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_CLASS[s]}`}
              >
                {STATUS_LABEL[s]}
              </span>
            </div>
          ))}
        </div>
      </section>

      {/* Follow-ups */}
      <section className="rounded-xl border border-black/10 dark:border-white/10 bg-white dark:bg-white/5 p-5">
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-medium">Follow-up reminders</h2>
          {data.followUps.length > 0 && (
            <span className="rounded-full bg-amber-100 text-amber-700 dark:bg-amber-900/50 dark:text-amber-200 px-2 py-0.5 text-xs font-medium">
              {data.followUps.length} due
            </span>
          )}
        </div>
        {data.followUps.length === 0 ? (
          <p className="text-sm text-black/60 dark:text-white/60">
            Nothing to follow up on. Applications get a nudge 7 days after applying.
          </p>
        ) : (
          <ul className="divide-y divide-black/5 dark:divide-white/10">
            {data.followUps.map((f) => (
              <li key={f.applicationId} className="py-2 flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="font-medium truncate">{f.job.title}</p>
                  <p className="text-sm text-black/60 dark:text-white/60 truncate">
                    {f.job.company} · applied{" "}
                    {f.appliedAt
                      ? formatDistanceToNow(new Date(f.appliedAt), {
                          addSuffix: true,
                        })
                      : "—"}
                  </p>
                </div>
                <a
                  href={f.job.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="shrink-0 text-sm font-medium text-indigo-600 dark:text-indigo-400 hover:underline"
                >
                  Open →
                </a>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
