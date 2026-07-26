"use client";

import { useCallback, useEffect, useState } from "react";
import { format } from "date-fns";
import type { QueueItem } from "@/lib/apiTypes";
import {
  STATUS_ORDER,
  STATUS_LABEL,
  STATUS_CLASS,
  type Status,
} from "@/lib/statusMeta";

type Counts = Record<Status, number>;

export function Tracker() {
  const [items, setItems] = useState<QueueItem[]>([]);
  const [counts, setCounts] = useState<Counts | null>(null);
  const [total, setTotal] = useState(0);
  const [matchedTotal, setMatchedTotal] = useState<number | null>(null);
  const [limit, setLimit] = useState(0);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<Status | "all">("all");
  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");

  // Debounce the search box so we're not hitting the API on every keystroke.
  useEffect(() => {
    const id = setTimeout(() => setDebouncedQuery(query.trim()), 300);
    return () => clearTimeout(id);
  }, [query]);

  // Filtering happens server-side — with thousands of queued matches possible,
  // fetching everything into the browser just to filter client-side doesn't scale.
  const load = useCallback(async (f: Status | "all", q: string) => {
    setLoading(true);
    const params = new URLSearchParams();
    if (f !== "all") params.set("status", f);
    if (q) params.set("q", q);
    const qs = params.toString();
    const res = await fetch(`/api/applications${qs ? `?${qs}` : ""}`);
    const data = await res.json();
    setItems(data.items);
    setCounts(data.counts);
    setTotal(data.total);
    setMatchedTotal(data.matchedTotal);
    setLimit(data.limit);
    setLoading(false);
  }, []);

  useEffect(() => {
    load(filter, debouncedQuery);
  }, [load, filter, debouncedQuery]);

  async function updateStatus(id: string, status: Status) {
    setItems((arr) =>
      arr.map((x) =>
        x.application.id === id
          ? { ...x, application: { ...x.application, status } }
          : x
      )
    );
    await fetch(`/api/applications/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    load(filter, debouncedQuery);
  }

  return (
    <div className="space-y-4">
      <div className="fade-in-up flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold tracking-tight gradient-text">
            The Paper Trail
          </h1>
          <p className="text-sm text-black/60 dark:text-white/60">
            {total} application{total === 1 ? "" : "s"} and counting — every one, receipts included.
          </p>
        </div>
        <a
          href="/api/export"
          className="rounded-md border border-black/10 dark:border-white/15 px-4 py-2 text-sm font-medium hover:bg-black/5 dark:hover:bg-white/10 hover:-translate-y-0.5"
        >
          📤 Export CSV
        </a>
      </div>

      <div className="fade-in-up relative max-w-sm">
        <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-black/40 dark:text-white/40">
          🔍
        </span>
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search by role or company…"
          className="w-full rounded-md border border-black/15 dark:border-white/15 bg-white/80 dark:bg-white/[0.06] backdrop-blur-md pl-9 pr-8 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-500 transition-shadow duration-200"
        />
        {query && (
          <button
            onClick={() => setQuery("")}
            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-black/40 dark:text-white/40 hover:text-black dark:hover:text-white"
            aria-label="Clear search"
          >
            ✕
          </button>
        )}
      </div>

      <div className="flex flex-wrap gap-1.5">
        <FilterChip active={filter === "all"} onClick={() => setFilter("all")}>
          All ({total})
        </FilterChip>
        {STATUS_ORDER.map((s) => (
          <FilterChip key={s} active={filter === s} onClick={() => setFilter(s)}>
            {STATUS_LABEL[s]} ({counts?.[s] ?? 0})
          </FilterChip>
        ))}
      </div>

      {items.length > 0 && (matchedTotal ?? total) > limit && (
        <p className="text-xs text-black/50 dark:text-white/50">
          Showing the {limit} most recently updated of {matchedTotal ?? total}
          {matchedTotal !== null ? " matching" : ""} — narrow with a status
          filter{matchedTotal === null ? " or search" : ""} to see more.
        </p>
      )}

      {loading ? (
        <div className="space-y-2">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="h-12 rounded-lg shimmer" style={{ ["--delay" as string]: `${i * 60}ms` }} />
          ))}
        </div>
      ) : items.length === 0 ? (
        <p className="fade-in-up text-sm text-black/60 dark:text-white/60 py-8 text-center">
          {debouncedQuery
            ? `No matches for "${debouncedQuery}"${filter !== "all" ? ` in ${STATUS_LABEL[filter]}` : ""}.`
            : `Nothing here yet${filter !== "all" ? ` with status “${STATUS_LABEL[filter]}”` : ""} — go make it happen in the Review Queue.`}
        </p>
      ) : (
        <div className="fade-in-up overflow-x-auto rounded-xl border border-black/10 dark:border-white/10 card-surface">
          <table className="w-full text-sm">
            <thead className="bg-black/[0.03] dark:bg-white/[0.03] text-left">
              <tr>
                <th className="px-4 py-2 font-medium">Role</th>
                <th className="px-4 py-2 font-medium">Company</th>
                <th className="px-4 py-2 font-medium">Applied</th>
                <th className="px-4 py-2 font-medium">Follow-up</th>
                <th className="px-4 py-2 font-medium">Status</th>
                <th className="px-4 py-2 font-medium"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-black/5 dark:divide-white/10">
              {items.map(({ application, job }) => (
                <tr key={application.id} className="hover:bg-black/[0.02] dark:hover:bg-white/[0.03]">
                  <td className="px-4 py-2.5 max-w-xs">
                    <div className="font-medium truncate">{job.title}</div>
                    <div className="text-xs text-black/50 dark:text-white/50 uppercase">
                      {job.source}
                    </div>
                  </td>
                  <td className="px-4 py-2.5">{job.company}</td>
                  <td className="px-4 py-2.5 whitespace-nowrap text-black/70 dark:text-white/70">
                    {application.appliedAt
                      ? format(new Date(application.appliedAt), "MMM d")
                      : "—"}
                  </td>
                  <td className="px-4 py-2.5 whitespace-nowrap text-black/70 dark:text-white/70">
                    {application.followUpDate
                      ? format(new Date(application.followUpDate), "MMM d")
                      : "—"}
                  </td>
                  <td className="px-4 py-2.5">
                    <select
                      value={application.status}
                      onChange={(e) =>
                        updateStatus(application.id, e.target.value as Status)
                      }
                      className={`rounded-full px-2 py-1 text-xs font-medium border-0 outline-none cursor-pointer ${STATUS_CLASS[application.status]}`}
                    >
                      {STATUS_ORDER.map((s) => (
                        <option key={s} value={s}>
                          {STATUS_LABEL[s]}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td className="px-4 py-2.5 text-right">
                    <a
                      href={job.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-indigo-600 dark:text-indigo-400 hover:underline"
                    >
                      Open
                    </a>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function FilterChip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={`rounded-full px-3 py-1 text-xs font-medium border transition-all ${
        active
          ? "bg-gradient-to-r from-indigo-600 to-violet-600 text-white border-transparent shadow-sm"
          : "border-black/10 dark:border-white/15 hover:bg-black/5 dark:hover:bg-white/10 hover:-translate-y-0.5"
      }`}
    >
      {children}
    </button>
  );
}
