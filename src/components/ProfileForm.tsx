"use client";

import { useEffect, useState } from "react";
import type { ProfileDTO } from "@/lib/apiTypes";

function toLines(arr: string[]): string {
  return arr.join("\n");
}
function fromLines(text: string): string[] {
  return text
    .split("\n")
    .map((s) => s.trim())
    .filter(Boolean);
}

export function ProfileForm() {
  const [profile, setProfile] = useState<ProfileDTO | null>(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const [masterResume, setMasterResume] = useState("");
  const [targetRoles, setTargetRoles] = useState("");
  const [targetLocations, setTargetLocations] = useState("");
  const [excludedCompanies, setExcludedCompanies] = useState("");
  const [salaryFloor, setSalaryFloor] = useState("");
  const [dailyGoal, setDailyGoal] = useState("50");
  const [templates, setTemplates] = useState<{ tone: string; body: string }[]>(
    []
  );

  useEffect(() => {
    fetch("/api/profile")
      .then((r) => r.json())
      .then((p: ProfileDTO) => {
        setProfile(p);
        setMasterResume(p.masterResume);
        setTargetRoles(toLines(p.targetRoles));
        setTargetLocations(toLines(p.targetLocations));
        setExcludedCompanies(toLines(p.excludedCompanies));
        setSalaryFloor(p.salaryFloor ? String(p.salaryFloor) : "");
        setDailyGoal(String(p.dailyGoal));
        setTemplates(
          p.coverLetterTemplates.length
            ? p.coverLetterTemplates
            : [{ tone: "professional", body: "" }]
        );
      });
  }, []);

  async function save() {
    setSaving(true);
    setSaved(false);
    const res = await fetch("/api/profile", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        masterResume,
        targetRoles: fromLines(targetRoles),
        targetLocations: fromLines(targetLocations),
        excludedCompanies: fromLines(excludedCompanies),
        salaryFloor: salaryFloor ? parseInt(salaryFloor, 10) : null,
        dailyGoal: parseInt(dailyGoal, 10) || 50,
        coverLetterTemplates: templates.filter((t) => t.tone.trim()),
      }),
    });
    if (res.ok) {
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    }
    setSaving(false);
  }

  if (!profile) {
    return <p className="text-black/60 dark:text-white/60">Loading profile…</p>;
  }

  const label = "block text-sm font-medium mb-1";
  const input =
    "w-full rounded-md border border-black/15 dark:border-white/15 bg-white dark:bg-white/5 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-500";

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Profile</h1>
        <p className="text-sm text-black/60 dark:text-white/60">
          Set once — used to score jobs and tailor every application.
        </p>
      </div>

      <div className="rounded-xl border border-black/10 dark:border-white/10 bg-white dark:bg-white/5 p-5 space-y-4">
        <div>
          <label className={label}>Master resume</label>
          <textarea
            className={`${input} font-mono text-xs`}
            rows={12}
            value={masterResume}
            onChange={(e) => setMasterResume(e.target.value)}
            placeholder="Paste your full resume here — experience, skills, education…"
          />
        </div>

        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <label className={label}>Target roles (one per line)</label>
            <textarea
              className={input}
              rows={4}
              value={targetRoles}
              onChange={(e) => setTargetRoles(e.target.value)}
              placeholder={"Software Engineer\nFull Stack Engineer"}
            />
          </div>
          <div>
            <label className={label}>Target locations (one per line)</label>
            <textarea
              className={input}
              rows={4}
              value={targetLocations}
              onChange={(e) => setTargetLocations(e.target.value)}
              placeholder={"Remote\nNew York"}
            />
          </div>
        </div>

        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <label className={label}>Excluded companies (one per line)</label>
            <textarea
              className={input}
              rows={3}
              value={excludedCompanies}
              onChange={(e) => setExcludedCompanies(e.target.value)}
            />
          </div>
          <div className="space-y-4">
            <div>
              <label className={label}>Salary floor (USD)</label>
              <input
                className={input}
                type="number"
                value={salaryFloor}
                onChange={(e) => setSalaryFloor(e.target.value)}
                placeholder="120000"
              />
            </div>
            <div>
              <label className={label}>Daily application goal</label>
              <input
                className={input}
                type="number"
                value={dailyGoal}
                onChange={(e) => setDailyGoal(e.target.value)}
              />
            </div>
          </div>
        </div>
      </div>

      <div className="rounded-xl border border-black/10 dark:border-white/10 bg-white dark:bg-white/5 p-5 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="font-medium">Cover letter tones</h2>
          <button
            onClick={() =>
              setTemplates((t) => [...t, { tone: "", body: "" }])
            }
            className="text-sm font-medium text-indigo-600 dark:text-indigo-400 hover:underline"
          >
            + Add tone
          </button>
        </div>
        {templates.map((t, i) => (
          <div key={i} className="space-y-2 border-t border-black/5 dark:border-white/10 pt-3 first:border-0 first:pt-0">
            <div className="flex items-center gap-2">
              <input
                className={`${input} max-w-xs`}
                value={t.tone}
                placeholder="tone (e.g. professional)"
                onChange={(e) =>
                  setTemplates((arr) =>
                    arr.map((x, j) =>
                      j === i ? { ...x, tone: e.target.value } : x
                    )
                  )
                }
              />
              {templates.length > 1 && (
                <button
                  onClick={() =>
                    setTemplates((arr) => arr.filter((_, j) => j !== i))
                  }
                  className="text-sm text-red-600 hover:underline"
                >
                  Remove
                </button>
              )}
            </div>
            <textarea
              className={input}
              rows={3}
              value={t.body}
              placeholder="Optional template / notes for this tone…"
              onChange={(e) =>
                setTemplates((arr) =>
                  arr.map((x, j) =>
                    j === i ? { ...x, body: e.target.value } : x
                  )
                )
              }
            />
          </div>
        ))}
      </div>

      <div className="flex items-center gap-3">
        <button
          onClick={save}
          disabled={saving}
          className="rounded-md bg-indigo-600 px-5 py-2 text-sm font-medium text-white hover:bg-indigo-500 disabled:opacity-60"
        >
          {saving ? "Saving…" : "Save profile"}
        </button>
        {saved && (
          <span className="text-sm text-green-600 dark:text-green-400">
            Saved ✓
          </span>
        )}
      </div>
    </div>
  );
}
