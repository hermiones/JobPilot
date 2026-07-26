"use client";

import { useEffect, useState } from "react";
import type { AdminInsights, FeedbackEntry } from "@/lib/apiTypes";
import { STATUS_LABEL, STATUS_CLASS, STATUS_ORDER } from "@/lib/statusMeta";
import { CountUp } from "@/components/CountUp";
import { BoardsManager } from "@/components/BoardsManager";

const card =
  "card-surface rounded-xl border border-black/10 dark:border-white/10 bg-white/80 dark:bg-white/[0.06] backdrop-blur-md p-5";

export function AdminPanel() {
  const [data, setData] = useState<AdminInsights | null>(null);
  const [feedback, setFeedback] = useState<FeedbackEntry[] | null>(null);
  const [forbidden, setForbidden] = useState(false);

  useEffect(() => {
    fetch("/api/admin/insights").then(async (r) => {
      if (r.status === 403) {
        setForbidden(true);
        return;
      }
      setData(await r.json());
    });
    fetch("/api/feedback").then(async (r) => {
      if (r.ok) setFeedback((await r.json()).entries);
    });
  }, []);

  if (forbidden) {
    return (
      <div className="fade-in-up text-center py-16 space-y-3">
        <div className="text-5xl mb-2">🔒</div>
        <h1 className="text-2xl font-bold tracking-tight gradient-text">
          Admins only
        </h1>
        <p className="text-black/60 dark:text-white/60">
          This account doesn&apos;t have admin access.
        </p>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="space-y-4">
        <div className="h-8 w-64 rounded-md shimmer" />
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-24 rounded-xl shimmer" />
          ))}
        </div>
        <div className="h-56 rounded-xl shimmer" />
      </div>
    );
  }

  const maxSignups = Math.max(1, ...data.signupTrend.map((d) => d.count));
  const maxCompany = Math.max(1, ...data.topCompanies.map((c) => c.count));
  const proPct = Math.round(
    (data.planCounts.pro / Math.max(1, data.totalUsers)) * 100
  );

  return (
    <div className="space-y-6">
      <div className="fade-in-up">
        <h1 className="text-3xl font-bold tracking-tight gradient-text">
          Admin Insights
        </h1>
        <p className="text-sm text-black/60 dark:text-white/60">
          App-wide analytics — every user, every application, every job.
        </p>
      </div>

      {/* KPI row */}
      <div
        className="fade-in-up grid sm:grid-cols-2 lg:grid-cols-4 gap-4"
        style={{ ["--delay" as string]: "60ms" }}
      >
        {[
          { label: "Total users", value: data.totalUsers, sub: `${data.planCounts.pro ?? 0} Pro (${proPct}%)` },
          { label: "Applications", value: data.totalApplications, sub: `${data.appliedToday} applied today` },
          { label: "Job listings", value: data.totalJobListings, sub: `${data.activeBoards}/${data.totalBoards} boards active` },
          { label: "Referred signups", value: data.referral.referredSignups, sub: `${data.referral.proViaReferral} Pro via referral` },
        ].map((k, i) => (
          <div
            key={k.label}
            className={`fade-in-up ${card} transition-transform duration-200 hover:-translate-y-1`}
            style={{ ["--delay" as string]: `${80 + i * 40}ms` }}
          >
            <div className="text-3xl font-black tabular-nums">
              <CountUp value={k.value} />
            </div>
            <div className="text-sm font-medium mt-1">{k.label}</div>
            <div className="text-xs text-black/50 dark:text-white/50 mt-0.5">{k.sub}</div>
          </div>
        ))}
      </div>

      {/* Signup trend */}
      <section className={`fade-in-up ${card}`} style={{ ["--delay" as string]: "220ms" }}>
        <h2 className="font-semibold mb-4">Signups — last 14 days</h2>
        <div className="flex items-end gap-1.5 h-32">
          {data.signupTrend.map((d, i) => (
            <div
              key={d.date}
              className="fade-in-up flex-1 flex flex-col items-center justify-end gap-1"
              style={{ ["--delay" as string]: `${i * 30}ms` }}
              title={`${d.date}: ${d.count}`}
            >
              <div
                className="w-full rounded-t bg-gradient-to-t from-indigo-600 to-violet-500 transition-all duration-500"
                style={{ height: `${Math.max(4, (d.count / maxSignups) * 100)}%` }}
              />
              <span className="text-[10px] text-black/40 dark:text-white/40 rotate-0 whitespace-nowrap">
                {d.date.split(" ")[1]}
              </span>
            </div>
          ))}
        </div>
      </section>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Application funnel */}
        <section className={`fade-in-up ${card}`} style={{ ["--delay" as string]: "260ms" }}>
          <h2 className="font-semibold mb-3">Application funnel (all users)</h2>
          <div className="grid grid-cols-2 gap-3">
            {STATUS_ORDER.map((s, i) => (
              <div
                key={s}
                className="fade-in-up rounded-lg border border-black/5 dark:border-white/10 p-3 text-center"
                style={{ ["--delay" as string]: `${280 + i * 30}ms` }}
              >
                <div className="text-xl font-bold">
                  <CountUp value={data.funnel[s]} />
                </div>
                <span className={`mt-1 inline-block rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_CLASS[s]}`}>
                  {STATUS_LABEL[s]}
                </span>
              </div>
            ))}
          </div>
        </section>

        {/* Top companies */}
        <section className={`fade-in-up ${card}`} style={{ ["--delay" as string]: "260ms" }}>
          <h2 className="font-semibold mb-3">Top companies by job volume</h2>
          <div className="space-y-2.5">
            {data.topCompanies.map((c, i) => (
              <div key={c.company} className="fade-in-up" style={{ ["--delay" as string]: `${i * 40}ms` }}>
                <div className="flex items-center justify-between text-sm mb-1">
                  <span className="font-medium truncate">{c.company}</span>
                  <span className="text-black/60 dark:text-white/60"><CountUp value={c.count} /></span>
                </div>
                <div className="h-2 w-full rounded-full bg-black/10 dark:bg-white/10 overflow-hidden">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-cyan-500 to-indigo-600 transition-all duration-700"
                    style={{ width: `${Math.max(4, (c.count / maxCompany) * 100)}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* System-wide A/B performance */}
        <section className={`fade-in-up ${card}`} style={{ ["--delay" as string]: "300ms" }}>
          <h2 className="font-semibold mb-1">Cover letter A/B/C performance (all users)</h2>
          <p className="text-xs text-black/50 dark:text-white/50 mb-3">
            When any user writes multiple cover letters for a job, each gets tagged A/B/C —
            this shows which version tends to get more replies across everyone.
          </p>
          {data.variantPerformance.length === 0 ? (
            <p className="text-sm text-black/60 dark:text-white/60">
              No applied variants recorded yet across any account.
            </p>
          ) : (
            <div className="space-y-3">
              {data.variantPerformance.map((v) => (
                <div key={v.label}>
                  <div className="flex items-center justify-between text-sm mb-1">
                    <span className="font-medium">Variant {v.label}</span>
                    <span className="text-black/60 dark:text-white/60">
                      {v.responded}/{v.applied} · {Math.round(v.responseRate * 100)}%
                    </span>
                  </div>
                  <div className="h-2.5 w-full rounded-full bg-black/10 dark:bg-white/10 overflow-hidden">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-indigo-600 to-violet-600 transition-all duration-700"
                      style={{ width: `${Math.max(4, Math.round(v.responseRate * 100))}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Provider distribution */}
        <section className={`fade-in-up ${card}`} style={{ ["--delay" as string]: "300ms" }}>
          <h2 className="font-semibold mb-3">AI provider preference</h2>
          <div className="space-y-2.5">
            {data.providerDistribution.map((p) => (
              <div key={p.provider} className="flex items-center justify-between text-sm">
                <span className="capitalize font-medium">{p.provider}</span>
                <span className="text-black/60 dark:text-white/60">
                  <CountUp value={p.count} /> user{p.count === 1 ? "" : "s"}
                </span>
              </div>
            ))}
          </div>
        </section>
      </div>

      {/* User feedback */}
      <section className={`fade-in-up ${card}`} style={{ ["--delay" as string]: "320ms" }}>
        <h2 className="font-semibold mb-3">Recent feedback</h2>
        {!feedback || feedback.length === 0 ? (
          <p className="text-sm text-black/60 dark:text-white/60">
            No feedback submitted yet — the 💬 button on every page sends here.
          </p>
        ) : (
          <ul className="divide-y divide-black/5 dark:divide-white/10 max-h-96 overflow-y-auto">
            {feedback.map((f) => (
              <li key={f.id} className="py-2.5 space-y-1">
                <div className="flex items-center justify-between text-xs text-black/50 dark:text-white/50">
                  <span>{f.email}{f.page ? ` · ${f.page}` : ""}</span>
                  <span>{new Date(f.createdAt).toLocaleDateString()}</span>
                </div>
                {f.rating && <div>{"⭐".repeat(f.rating)}</div>}
                {f.message && <p className="text-sm">{f.message}</p>}
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* Job boards (shared infra — admin-managed) */}
      <BoardsManager />
    </div>
  );
}
