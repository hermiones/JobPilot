"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { formatDistanceToNow } from "date-fns";
import type { DashboardData } from "@/lib/apiTypes";
import { STATUS_LABEL, STATUS_CLASS, STATUS_ORDER } from "@/lib/statusMeta";
import { CountUp } from "@/components/CountUp";

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
        `⚡ Fetched ${fetchData.created ?? 0} listings · queued ${
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
    return (
      <div className="space-y-4">
        <div className="h-8 w-48 rounded-md shimmer" />
        <div className="h-28 rounded-xl shimmer" />
        <div className="h-40 rounded-xl shimmer" />
      </div>
    );
  }

  const goalPct = Math.min(
    100,
    Math.round((data.appliedToday / Math.max(1, data.dailyGoal)) * 100)
  );

  return (
    <div className="space-y-6">
      <div
        className="fade-in-up flex flex-wrap items-center justify-between gap-3"
        style={{ ["--delay" as string]: "0ms" }}
      >
        <div>
          <h1 className="text-3xl font-bold tracking-tight gradient-text">
            Mission Control
          </h1>
          <p className="text-sm text-black/60 dark:text-white/60">
            Your daily flight plan toward {data.dailyGoal} applications.
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={refreshJobs}
            disabled={refreshing}
            className="glow-accent rounded-md bg-gradient-to-r from-indigo-600 to-violet-600 px-4 py-2 text-sm font-medium text-white hover:brightness-110 disabled:opacity-60 disabled:hover:brightness-100"
          >
            {refreshing ? "Scanning the job-verse…" : "🚀 Refresh jobs"}
          </button>
          <Link
            href="/review"
            className="rounded-md border border-black/10 dark:border-white/15 px-4 py-2 text-sm font-medium hover:bg-black/5 dark:hover:bg-white/10 hover:-translate-y-0.5"
          >
            Review queue →
          </Link>
        </div>
      </div>

      {message && (
        <div
          className="fade-in-up rounded-md bg-indigo-50 dark:bg-indigo-950/50 border border-indigo-200 dark:border-indigo-900 px-4 py-2 text-sm"
          style={{ ["--delay" as string]: "50ms" }}
        >
          {message}
        </div>
      )}

      <div
        className="fade-in-up text-sm text-black/60 dark:text-white/60"
        style={{ ["--delay" as string]: "80ms" }}
      >
        {data.scheduleEnabled ? (
          <>
            🕒 Autopilot <span className="font-medium text-green-600 dark:text-green-400">engaged</span>
            {data.scheduleTimes.length > 0 && (
              <> at {data.scheduleTimes.join(", ")} IST</>
            )}
            {data.nextRun && <> · next run {data.nextRun}</>}
          </>
        ) : (
          <>🕒 Autopilot off — flip it on in <a href="/profile" className="text-indigo-600 dark:text-indigo-400 hover:underline">Profile</a> and let the queue fill itself.</>
        )}
      </div>

      {/* Daily goal */}
      <section
        className="fade-in-up card-surface rounded-xl border border-black/10 dark:border-white/10 bg-white/80 dark:bg-white/[0.06] backdrop-blur-md p-5"
        style={{ ["--delay" as string]: "120ms" }}
      >
        <div className="flex items-baseline justify-between">
          <h2 className="font-semibold">Today&apos;s goal</h2>
          <span className="text-sm text-black/60 dark:text-white/60">
            <CountUp value={data.appliedToday} className="font-semibold text-black dark:text-white" /> / {data.dailyGoal} applied
          </span>
        </div>
        <div className="mt-3 h-3 w-full rounded-full bg-black/10 dark:bg-white/10 overflow-hidden">
          <div
            className="h-full rounded-full bg-gradient-to-r from-indigo-600 via-violet-600 to-cyan-400 transition-all duration-700 ease-out"
            style={{ width: `${goalPct}%` }}
          />
        </div>
        <p className="mt-2 text-sm text-black/60 dark:text-white/60">
          {data.appliedToday >= data.dailyGoal
            ? "🎉 Goal smashed — go touch some grass."
            : `${data.dailyGoal - data.appliedToday} to go — you've got this.`}
        </p>
      </section>

      {/* Funnel */}
      <section
        className="fade-in-up card-surface rounded-xl border border-black/10 dark:border-white/10 bg-white/80 dark:bg-white/[0.06] backdrop-blur-md p-5"
        style={{ ["--delay" as string]: "160ms" }}
      >
        <h2 className="font-semibold mb-3">Pipeline funnel</h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3">
          {STATUS_ORDER.map((s, i) => (
            <div
              key={s}
              className="fade-in-up rounded-lg border border-black/5 dark:border-white/10 p-3 text-center transition-transform hover:-translate-y-1 hover:border-indigo-400/40"
              style={{ ["--delay" as string]: `${180 + i * 40}ms` }}
            >
              <div className="text-2xl font-bold">
                <CountUp value={data.funnel[s]} />
              </div>
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
      <section
        className="fade-in-up card-surface rounded-xl border border-black/10 dark:border-white/10 bg-white/80 dark:bg-white/[0.06] backdrop-blur-md p-5"
        style={{ ["--delay" as string]: "220ms" }}
      >
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-semibold">Follow-up reminders</h2>
          {data.followUps.length > 0 && (
            <span className="rounded-full bg-amber-100 text-amber-700 dark:bg-amber-900/50 dark:text-amber-200 px-2 py-0.5 text-xs font-medium animate-pulse">
              {data.followUps.length} due
            </span>
          )}
        </div>
        {data.followUps.length === 0 ? (
          <p className="text-sm text-black/60 dark:text-white/60">
            All quiet. You&apos;ll get a nudge 7 days after applying if there&apos;s been radio silence.
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
