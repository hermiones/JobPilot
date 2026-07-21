"use client";

import { useCallback, useEffect, useState } from "react";
import type { BoardDTO } from "@/lib/apiTypes";

export function BoardsManager() {
  const [boards, setBoards] = useState<BoardDTO[]>([]);
  const [loading, setLoading] = useState(true);
  const [discovering, setDiscovering] = useState(false);
  const [customSlugs, setCustomSlugs] = useState("");
  const [message, setMessage] = useState<string | null>(null);

  const load = useCallback(async () => {
    const res = await fetch("/api/boards");
    const data = await res.json();
    setBoards(data.boards);
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function discover(useCustom: boolean) {
    setDiscovering(true);
    setMessage(null);
    const body = useCustom
      ? { slugs: customSlugs.split(/[\n,]/).map((s) => s.trim()).filter(Boolean) }
      : {};
    const res = await fetch("/api/boards/discover", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const data = await res.json();
    setMessage(
      `Discovered ${data.discovered.length} live board(s)` +
        (data.notFound.length ? ` · ${data.notFound.length} not found` : "")
    );
    if (useCustom) setCustomSlugs("");
    await load();
    setDiscovering(false);
  }

  async function toggle(id: string, active: boolean) {
    setBoards((arr) => arr.map((b) => (b.id === id ? { ...b, active } : b)));
    await fetch("/api/boards", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, active }),
    });
  }

  async function remove(id: string) {
    setBoards((arr) => arr.filter((b) => b.id !== id));
    await fetch(`/api/boards?id=${id}`, { method: "DELETE" });
  }

  const input =
    "w-full rounded-md border border-black/15 dark:border-white/15 bg-white/80 dark:bg-white/[0.06] backdrop-blur-md px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-500";

  return (
    <div className="card-surface rounded-xl border border-black/10 dark:border-white/10 bg-white/80 dark:bg-white/[0.06] backdrop-blur-md p-5 space-y-4">
      <div>
        <h2 className="font-medium">Job boards</h2>
        <p className="text-sm text-black/60 dark:text-white/60">
          Auto-discover public Greenhouse/Lever boards to pull jobs from. Only
          active boards are fetched.
        </p>
      </div>

      <div className="flex flex-wrap gap-2">
        <button
          onClick={() => discover(false)}
          disabled={discovering}
          className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-500 disabled:opacity-60"
        >
          {discovering ? "Discovering…" : "Auto-discover boards"}
        </button>
      </div>

      <div className="space-y-2">
        <label className="block text-sm font-medium">
          Add companies by name (comma or newline separated)
        </label>
        <textarea
          className={input}
          rows={2}
          value={customSlugs}
          onChange={(e) => setCustomSlugs(e.target.value)}
          placeholder="razorpay, swiggy, notion…"
        />
        <button
          onClick={() => discover(true)}
          disabled={discovering || !customSlugs.trim()}
          className="rounded-md border border-black/15 dark:border-white/15 px-4 py-2 text-sm font-medium hover:bg-black/5 dark:hover:bg-white/10 disabled:opacity-50"
        >
          Probe &amp; add
        </button>
      </div>

      {message && (
        <p className="text-sm text-indigo-600 dark:text-indigo-400">{message}</p>
      )}

      {loading ? (
        <p className="text-sm text-black/60 dark:text-white/60">Loading boards…</p>
      ) : boards.length === 0 ? (
        <p className="text-sm text-black/60 dark:text-white/60">
          No boards yet — click “Auto-discover boards”.
        </p>
      ) : (
        <ul className="divide-y divide-black/5 dark:divide-white/10">
          {boards.map((b) => (
            <li key={b.id} className="py-2 flex items-center justify-between gap-3">
              <div className="min-w-0">
                <span className="font-medium">{b.label ?? b.slug}</span>
                <span className="ml-2 text-xs uppercase text-black/40 dark:text-white/40">
                  {b.source}
                </span>
                <span className="ml-2 text-xs text-black/50 dark:text-white/50">
                  {b.lastJobCount} jobs
                </span>
              </div>
              <div className="flex items-center gap-3 shrink-0">
                <label className="inline-flex items-center gap-1.5 text-sm cursor-pointer">
                  <input
                    type="checkbox"
                    checked={b.active}
                    onChange={(e) => toggle(b.id, e.target.checked)}
                    className="h-4 w-4 accent-indigo-600"
                  />
                  Active
                </label>
                <button
                  onClick={() => remove(b.id)}
                  className="text-sm text-red-600 hover:underline"
                >
                  Remove
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
