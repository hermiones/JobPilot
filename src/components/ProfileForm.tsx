"use client";

import { useEffect, useState } from "react";
import type { ProfileDTO } from "@/lib/apiTypes";
import { BoardsManager } from "@/components/BoardsManager";

function toLines(arr: string[]): string {
  return arr.join("\n");
}
function fromLines(text: string): string[] {
  return text
    .split("\n")
    .map((s) => s.trim())
    .filter(Boolean);
}

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      resolve(result.split(",")[1] ?? "");
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export function ProfileForm() {
  const [profile, setProfile] = useState<ProfileDTO | null>(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const [masterResume, setMasterResume] = useState("");
  const [resumeFileName, setResumeFileName] = useState<string | null>(null);
  const [resumeFileData, setResumeFileData] = useState<string | null>(null);
  const [targetRoles, setTargetRoles] = useState("");
  const [targetLocations, setTargetLocations] = useState("");
  const [excludedCompanies, setExcludedCompanies] = useState("");
  const [salaryFloor, setSalaryFloor] = useState("");
  const [dailyGoal, setDailyGoal] = useState("50");
  const [templates, setTemplates] = useState<{ tone: string; body: string }[]>(
    []
  );
  const [scheduleEnabled, setScheduleEnabled] = useState(false);
  const [scheduleTimes, setScheduleTimes] = useState<string[]>([]);
  const [extracting, setExtracting] = useState(false);
  const [extractError, setExtractError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/profile")
      .then((r) => r.json())
      .then((p: ProfileDTO) => {
        setProfile(p);
        setMasterResume(p.masterResume);
        setResumeFileName(p.masterResumeFileName);
        setTargetRoles(toLines(p.targetRoles));
        setTargetLocations(toLines(p.targetLocations));
        setExcludedCompanies(toLines(p.excludedCompanies));
        setSalaryFloor(p.salaryFloor ? String(p.salaryFloor) : "");
        setDailyGoal(String(p.dailyGoal));
        setScheduleEnabled(p.scheduleEnabled);
        setScheduleTimes(p.scheduleTimes.length ? p.scheduleTimes : ["09:00"]);
        setTemplates(
          p.coverLetterTemplates.length
            ? p.coverLetterTemplates
            : [{ tone: "professional", body: "" }]
        );
      });
  }, []);

  async function onResumeFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setResumeFileName(file.name);
    setResumeFileData(await fileToBase64(file));

    // Scoring and AI tailoring only ever read the plain-text field below —
    // uploading a file alone doesn't feed them anything. Extract the text
    // server-side and drop it in automatically so that's not a silent trap.
    setExtracting(true);
    setExtractError(null);
    try {
      const form = new FormData();
      form.append("file", file);
      const res = await fetch("/api/profile/resume-text", {
        method: "POST",
        body: form,
      });
      const data = await res.json();
      if (!res.ok) {
        setExtractError(data.error ?? "Couldn't extract text from that file.");
      } else {
        setMasterResume(data.text);
      }
    } catch (err) {
      setExtractError((err as Error).message);
    } finally {
      setExtracting(false);
    }
  }

  async function save() {
    setSaving(true);
    setSaved(false);
    const res = await fetch("/api/profile", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        masterResume,
        masterResumeFileName: resumeFileName,
        ...(resumeFileData ? { masterResumeFileData: resumeFileData } : {}),
        targetRoles: fromLines(targetRoles),
        targetLocations: fromLines(targetLocations),
        excludedCompanies: fromLines(excludedCompanies),
        salaryFloor: salaryFloor ? parseInt(salaryFloor, 10) : null,
        dailyGoal: parseInt(dailyGoal, 10) || 50,
        scheduleEnabled,
        scheduleTimes: scheduleTimes.filter((t) => /^\d{2}:\d{2}$/.test(t)),
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
    "w-full rounded-md border border-black/15 dark:border-white/15 bg-white/80 dark:bg-white/[0.06] backdrop-blur-md px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-500";
  const card =
    "card-surface rounded-xl border border-black/10 dark:border-white/10 bg-white/80 dark:bg-white/[0.06] backdrop-blur-md p-5";

  return (
    <div className="space-y-6 max-w-3xl">
      <div className="fade-in-up">
        <h1 className="text-3xl font-bold tracking-tight gradient-text">
          Your Command Center
        </h1>
        <p className="text-sm text-black/60 dark:text-white/60">
          Set it once — everything downstream (matching, tailoring, scheduling) runs off this.
        </p>
      </div>

      <div className={`fade-in-up ${card} space-y-4`} style={{ ["--delay" as string]: "80ms" }}>
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

        <div>
          <label className={label}>Resume file (PDF/DOCX/TXT)</label>
          <div className="flex items-center gap-3">
            <input
              type="file"
              accept=".pdf,.doc,.docx,.txt"
              onChange={onResumeFile}
              className="text-sm file:mr-3 file:rounded-md file:border-0 file:bg-indigo-600 file:px-3 file:py-1.5 file:text-white file:text-sm hover:file:bg-indigo-500"
            />
            {resumeFileName && (
              <span className="text-sm text-black/60 dark:text-white/60">
                📎 {resumeFileName}
              </span>
            )}
          </div>
          {extracting && (
            <p className="mt-1 text-xs text-indigo-600 dark:text-indigo-400">
              Reading your resume and filling in the text field above…
            </p>
          )}
          {extractError && (
            <p className="mt-1 text-xs text-red-600 dark:text-red-400">
              {extractError}
            </p>
          )}
          {!extracting && !extractError && (
            <p className="mt-1 text-xs text-black/50 dark:text-white/50">
              Uploading a file automatically fills the text field above — that&apos;s
              the only thing scoring and AI tailoring actually read, so double-check
              it looks right (uploading alone won&apos;t do anything without it).
            </p>
          )}
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
              placeholder={"Remote\nBengaluru"}
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
              <label className={label}>Salary floor (₹ INR, per year)</label>
              <input
                className={input}
                type="number"
                value={salaryFloor}
                onChange={(e) => setSalaryFloor(e.target.value)}
                placeholder="2000000"
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

      {/* Automation schedule */}
      <div className={`fade-in-up ${card} space-y-4`} style={{ ["--delay" as string]: "140ms" }}>
        <div className="flex items-center justify-between">
          <div>
            <h2 className="font-medium">Automation schedule (IST)</h2>
            <p className="text-sm text-black/60 dark:text-white/60">
              Auto-fetch &amp; score jobs at these times each day.
            </p>
          </div>
          <label className="inline-flex items-center gap-2 text-sm cursor-pointer">
            <input
              type="checkbox"
              checked={scheduleEnabled}
              onChange={(e) => setScheduleEnabled(e.target.checked)}
              className="h-4 w-4 accent-indigo-600"
            />
            Enabled
          </label>
        </div>

        <div className="flex flex-wrap gap-2 items-center">
          {scheduleTimes.map((t, i) => (
            <div key={i} className="flex items-center gap-1">
              <input
                type="time"
                value={t}
                onChange={(e) =>
                  setScheduleTimes((arr) =>
                    arr.map((x, j) => (j === i ? e.target.value : x))
                  )
                }
                className={`${input} w-auto`}
              />
              <button
                onClick={() =>
                  setScheduleTimes((arr) => arr.filter((_, j) => j !== i))
                }
                className="text-red-600 text-sm px-1"
                aria-label="Remove time"
              >
                ✕
              </button>
            </div>
          ))}
          <button
            onClick={() => setScheduleTimes((arr) => [...arr, "12:00"])}
            className="text-sm font-medium text-indigo-600 dark:text-indigo-400 hover:underline"
          >
            + Add time
          </button>
        </div>
        <p className="text-xs text-black/50 dark:text-white/50">
          Runs via the app&apos;s in-process scheduler while the server is up. For
          Vercel, point a Vercel Cron at <code>/api/cron/run</code>.
        </p>
      </div>

      {/* Cover letter tones */}
      <div className={`fade-in-up ${card} space-y-4`} style={{ ["--delay" as string]: "200ms" }}>
        <div className="flex items-center justify-between">
          <h2 className="font-medium">Cover letter tones</h2>
          <button
            onClick={() => setTemplates((t) => [...t, { tone: "", body: "" }])}
            className="text-sm font-medium text-indigo-600 dark:text-indigo-400 hover:underline"
          >
            + Add tone
          </button>
        </div>
        {templates.map((t, i) => (
          <div
            key={i}
            className="space-y-2 border-t border-black/5 dark:border-white/10 pt-3 first:border-0 first:pt-0"
          >
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
                  arr.map((x, j) => (j === i ? { ...x, body: e.target.value } : x))
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
          className="glow-accent rounded-md bg-gradient-to-r from-indigo-600 to-violet-600 px-5 py-2 text-sm font-semibold text-white hover:brightness-110 disabled:opacity-60 disabled:hover:brightness-100"
        >
          {saving ? "Saving…" : "💾 Save profile"}
        </button>
        {saved && (
          <span className="text-sm text-green-600 dark:text-green-400 fade-in-up">
            Locked in ✓
          </span>
        )}
      </div>

      {/* Job boards (auto-discovery) */}
      <BoardsManager />
    </div>
  );
}
