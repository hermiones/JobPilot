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

export function Tracker() {
  const [items, setItems] = useState<QueueItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<Status | "all">("all");

  const load = useCallback(async () => {
    const res = await fetch("/api/applications");
    const data = await res.json();
    setItems(data.items);
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

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
    load();
  }

  if (loading) {
    return <p className="text-black/60 dark:text-white/60">Loading tracker…</p>;
  }

  const filtered =
    filter === "all"
      ? items
      : items.filter((x) => x.application.status === filter);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Tracker</h1>
          <p className="text-sm text-black/60 dark:text-white/60">
            {items.length} application{items.length === 1 ? "" : "s"} in your pipeline.
          </p>
        </div>
        <a
          href="/api/export"
          className="rounded-md border border-black/10 dark:border-white/15 px-4 py-2 text-sm font-medium hover:bg-black/5 dark:hover:bg-white/10"
        >
          Export CSV
        </a>
      </div>

      <div className="flex flex-wrap gap-1.5">
        <FilterChip active={filter === "all"} onClick={() => setFilter("all")}>
          All ({items.length})
        </FilterChip>
        {STATUS_ORDER.map((s) => {
          const count = items.filter((x) => x.application.status === s).length;
          return (
            <FilterChip
              key={s}
              active={filter === s}
              onClick={() => setFilter(s)}
            >
              {STATUS_LABEL[s]} ({count})
            </FilterChip>
          );
        })}
      </div>

      {filtered.length === 0 ? (
        <p className="text-sm text-black/60 dark:text-white/60 py-8 text-center">
          No applications{filter !== "all" ? ` with status “${STATUS_LABEL[filter]}”` : ""}.
        </p>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-black/10 dark:border-white/10">
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
              {filtered.map(({ application, job }) => (
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
      className={`rounded-full px-3 py-1 text-xs font-medium border transition-colors ${
        active
          ? "bg-indigo-600 text-white border-indigo-600"
          : "border-black/10 dark:border-white/15 hover:bg-black/5 dark:hover:bg-white/10"
      }`}
    >
      {children}
    </button>
  );
}
