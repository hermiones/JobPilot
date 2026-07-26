"use client";

import { useEffect, useState } from "react";
import type { ProfileDTO } from "@/lib/apiTypes";
import { AI_PROVIDERS } from "@/lib/ai/providers";
import { getBg3dEnabled, setBg3dEnabled as persistBg3dPref } from "@/lib/bg3dPref";
import { maxScheduleTimes } from "@/lib/plan";
import { ReferralCard } from "@/components/ReferralCard";
import { GmailCard } from "@/components/GmailCard";

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
  const [apiKeys, setApiKeys] = useState<
    { provider: string; label: string; key: string }[]
  >([]);
  const [preferredProvider, setPreferredProvider] = useState("gemini");
  const [bg3dEnabled, setBg3dEnabled] = useState(true);
  const [plan, setPlan] = useState("free");
  const [codingProfiles, setCodingProfiles] = useState<
    { platform: string; url: string }[]
  >([]);
  const [planSaving, setPlanSaving] = useState(false);
  const [autoApproveEnabled, setAutoApproveEnabled] = useState(false);
  const [autoApproveMinScore, setAutoApproveMinScore] = useState("50");
  const [autoApproveMaxPerRun, setAutoApproveMaxPerRun] = useState("20");

  useEffect(() => {
    setBg3dEnabled(getBg3dEnabled());
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
        setApiKeys(p.apiKeys);
        setPreferredProvider(p.preferredProvider || "gemini");
        setPlan(p.plan || "free");
        setAutoApproveEnabled(p.autoApproveEnabled);
        setAutoApproveMinScore(String(p.autoApproveMinScore));
        setAutoApproveMaxPerRun(String(p.autoApproveMaxPerRun));
        setCodingProfiles(p.codingProfiles);
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

  function toggleBg3d(checked: boolean) {
    setBg3dEnabled(checked);
    persistBg3dPref(checked);
  }

  async function switchPlan(next: string) {
    setPlan(next);
    setPlanSaving(true);
    await fetch("/api/profile", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ plan: next }),
    });
    setPlanSaving(false);
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
        apiKeys: apiKeys.filter((k) => k.key.trim()),
        preferredProvider,
        autoApproveEnabled,
        autoApproveMinScore: parseInt(autoApproveMinScore, 10) || 50,
        autoApproveMaxPerRun: parseInt(autoApproveMaxPerRun, 10) || 20,
        codingProfiles: codingProfiles.filter((c) => c.url.trim()),
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

      {/* Account */}
      <div className={`fade-in-up ${card} flex flex-wrap items-center justify-between gap-3`} style={{ ["--delay" as string]: "20ms" }}>
        <div className="min-w-0">
          <p className="font-medium truncate">{profile.email}</p>
          <p className="text-xs text-black/50 dark:text-white/50">
            Member since{" "}
            {new Date(profile.createdAt).toLocaleDateString(undefined, {
              month: "long",
              year: "numeric",
            })}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {profile.isAdmin && (
            <a
              href="/admin"
              className="rounded-full bg-black/80 dark:bg-white/20 text-white px-2.5 py-1 text-xs font-semibold hover:brightness-110 transition-all"
            >
              🛡️ Admin
            </a>
          )}
          <span
            className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
              plan === "pro"
                ? "bg-gradient-to-r from-indigo-600 to-violet-600 text-white"
                : "bg-black/10 dark:bg-white/10 text-black/70 dark:text-white/70"
            }`}
          >
            {plan === "pro" ? "✨ Pro user" : "Free user"}
          </span>
        </div>
      </div>

      {/* Plan */}
      <div
        className={`fade-in-up ${card} flex flex-wrap items-center justify-between gap-3 transition-all duration-300`}
        style={{ ["--delay" as string]: "40ms" }}
      >
        <div>
          <h2 className="font-medium flex items-center gap-2">
            Plan
            <span
              className={`rounded-full px-2 py-0.5 text-xs font-semibold transition-colors duration-300 ${
                plan === "pro"
                  ? "bg-gradient-to-r from-indigo-600 to-violet-600 text-white"
                  : "bg-black/10 dark:bg-white/10 text-black/70 dark:text-white/70"
              }`}
            >
              {plan === "pro" ? "✨ Pro" : "Free"}
            </span>
          </h2>
          <p className="text-sm text-black/60 dark:text-white/60">
            Pro unlocks up to 3 different cover letters per job (so you can see which style gets more replies), smarter/higher-quality AI writing, and up to 8 auto-apply times per day.
            {plan === "free"
              ? " (Demo toggle for now — billing isn't wired up yet.)"
              : ""}
          </p>
        </div>
        <div className="flex rounded-md border border-black/15 dark:border-white/15 overflow-hidden text-sm">
          <button
            onClick={() => switchPlan("free")}
            disabled={planSaving}
            className={`px-3 py-1.5 font-medium transition-colors duration-200 ${
              plan === "free"
                ? "bg-black/10 dark:bg-white/15"
                : "hover:bg-black/5 dark:hover:bg-white/10"
            }`}
          >
            Free
          </button>
          <button
            onClick={() => switchPlan("pro")}
            disabled={planSaving}
            className={`px-3 py-1.5 font-medium transition-colors duration-200 ${
              plan === "pro"
                ? "bg-gradient-to-r from-indigo-600 to-violet-600 text-white"
                : "hover:bg-black/5 dark:hover:bg-white/10"
            }`}
          >
            Pro
          </button>
        </div>
      </div>

      <ReferralCard />

      <GmailCard profile={profile} />

      {/* Coding profile links */}
      <div className={`fade-in-up ${card} space-y-3`} style={{ ["--delay" as string]: "70ms" }}>
        <div>
          <h2 className="font-medium">Coding profile</h2>
          <p className="text-sm text-black/60 dark:text-white/60">
            Link your LeetCode, GitHub, or other competitive-coding profiles. Not shown
            to anyone yet (there&apos;s no recruiter-facing side of the app), but they&apos;ll
            be ready to show once that exists.
          </p>
        </div>
        <div className="space-y-2">
          {codingProfiles.map((c, i) => (
            <div key={i} className="flex flex-wrap items-center gap-2">
              <input
                className={`${input} w-auto max-w-[10rem]`}
                placeholder="platform (e.g. LeetCode)"
                value={c.platform}
                onChange={(e) =>
                  setCodingProfiles((arr) =>
                    arr.map((x, j) => (j === i ? { ...x, platform: e.target.value } : x))
                  )
                }
              />
              <input
                className={`${input} w-auto flex-1 min-w-[14rem]`}
                placeholder="https://leetcode.com/u/yourname"
                value={c.url}
                onChange={(e) =>
                  setCodingProfiles((arr) =>
                    arr.map((x, j) => (j === i ? { ...x, url: e.target.value } : x))
                  )
                }
              />
              <button
                onClick={() => setCodingProfiles((arr) => arr.filter((_, j) => j !== i))}
                className="text-red-600 text-sm px-1 transition-transform duration-150 hover:scale-125"
                aria-label="Remove"
              >
                ✕
              </button>
            </div>
          ))}
          {codingProfiles.length < 10 && (
            <button
              onClick={() => setCodingProfiles((arr) => [...arr, { platform: "", url: "" }])}
              className="text-sm font-medium text-indigo-600 dark:text-indigo-400 hover:underline transition-transform duration-150 hover:translate-x-0.5"
            >
              + Add profile link
            </button>
          )}
        </div>
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

      {/* AI provider / API keys */}
      <div className={`fade-in-up ${card} space-y-4`} style={{ ["--delay" as string]: "110ms" }}>
        <div>
          <h2 className="font-medium">AI provider &amp; API keys</h2>
          <p className="text-sm text-black/60 dark:text-white/60">
            Bring your own key(s) for resume tailoring. Gemini is recommended
            and works out of the box even without a key here.
          </p>
        </div>

        <div>
          <label className={label}>Active provider (used for tailoring)</label>
          <select
            className={input}
            value={preferredProvider}
            onChange={(e) => setPreferredProvider(e.target.value)}
          >
            {AI_PROVIDERS.map((p) => (
              <option key={p.id} value={p.id}>
                {p.label}
                {p.recommended ? " — Recommended" : ""}
              </option>
            ))}
          </select>
          <p className="mt-1 text-xs text-black/50 dark:text-white/50">
            {AI_PROVIDERS.find((p) => p.id === preferredProvider)?.hint}
          </p>
        </div>

        <div className="space-y-3">
          {apiKeys.map((k, i) => {
            const providerInfo = AI_PROVIDERS.find((p) => p.id === k.provider);
            return (
              <div
                key={i}
                className="fade-in-up space-y-1.5 rounded-md border border-black/10 dark:border-white/10 p-2.5 transition-shadow duration-200 hover:shadow-sm"
              >
                <div className="flex flex-wrap items-center gap-2">
                  <select
                    className={`${input} w-auto`}
                    value={k.provider}
                    onChange={(e) =>
                      setApiKeys((arr) =>
                        arr.map((x, j) =>
                          j === i ? { ...x, provider: e.target.value } : x
                        )
                      )
                    }
                  >
                    {AI_PROVIDERS.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.label}
                        {p.recommended ? " ★" : ""}
                      </option>
                    ))}
                  </select>
                  <input
                    className={`${input} w-auto flex-1 min-w-[10rem]`}
                    placeholder="label (optional, e.g. personal key)"
                    value={k.label}
                    onChange={(e) =>
                      setApiKeys((arr) =>
                        arr.map((x, j) =>
                          j === i ? { ...x, label: e.target.value } : x
                        )
                      )
                    }
                  />
                  <input
                    className={`${input} w-auto flex-1 min-w-[14rem] font-mono`}
                    type="password"
                    placeholder="API key"
                    value={k.key}
                    onChange={(e) =>
                      setApiKeys((arr) =>
                        arr.map((x, j) =>
                          j === i ? { ...x, key: e.target.value } : x
                        )
                      )
                    }
                  />
                  <button
                    onClick={() =>
                      setApiKeys((arr) => arr.filter((_, j) => j !== i))
                    }
                    className="text-red-600 text-sm px-1 transition-transform duration-150 hover:scale-125"
                    aria-label="Remove key"
                  >
                    ✕
                  </button>
                </div>
                {providerInfo && (
                  <p className="text-xs text-black/50 dark:text-white/50">
                    {providerInfo.howTo}{" "}
                    <a
                      href={providerInfo.keyUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="font-medium text-indigo-600 dark:text-indigo-400 hover:underline whitespace-nowrap"
                    >
                      Get a free {providerInfo.label} key →
                    </a>
                  </p>
                )}
              </div>
            );
          })}
          <button
            onClick={() =>
              setApiKeys((arr) => [
                ...arr,
                { provider: "gemini", label: "", key: "" },
              ])
            }
            className="text-sm font-medium text-indigo-600 dark:text-indigo-400 hover:underline transition-transform duration-150 hover:translate-x-0.5 inline-block"
          >
            + Add API key
          </button>
        </div>
      </div>

      {/* Appearance */}
      <div className={`fade-in-up ${card}`} style={{ ["--delay" as string]: "115ms" }}>
        <div className="flex items-center justify-between">
          <div>
            <h2 className="font-medium">Appearance</h2>
            <p className="text-sm text-black/60 dark:text-white/60">
              Turn off the floating 3D background for a plain, distraction-free UI.
            </p>
          </div>
          <label className="inline-flex items-center gap-2 text-sm cursor-pointer">
            <input
              type="checkbox"
              checked={bg3dEnabled}
              onChange={(e) => toggleBg3d(e.target.checked)}
              className="h-4 w-4 accent-indigo-600"
            />
            3D background
          </label>
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
            <div key={i} className="fade-in-up flex items-center gap-1">
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
                className="text-red-600 text-sm px-1 transition-transform duration-150 hover:scale-125"
                aria-label="Remove time"
              >
                ✕
              </button>
            </div>
          ))}
          {scheduleTimes.length < maxScheduleTimes(plan) ? (
            <button
              onClick={() => setScheduleTimes((arr) => [...arr, "12:00"])}
              className="text-sm font-medium text-indigo-600 dark:text-indigo-400 hover:underline transition-transform duration-150 hover:translate-x-0.5"
            >
              + Add time
            </button>
          ) : (
            <span className="text-xs text-black/50 dark:text-white/50">
              {plan === "free"
                ? "Free plan: 1 run/day — upgrade to Pro above for up to 8."
                : `Max ${maxScheduleTimes(plan)} slots on Pro.`}
            </span>
          )}
        </div>
        <p className="text-xs text-black/50 dark:text-white/50">
          Runs via the app&apos;s in-process scheduler while the server is up. For
          Vercel, point a Vercel Cron at <code>/api/cron/run</code>.
        </p>

        <div className="border-t border-black/5 dark:border-white/10 pt-3 space-y-2">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-medium">Auto-approve top matches (Pro)</h3>
              <p className="text-xs text-black/50 dark:text-white/50">
                At each scheduled run, automatically move your best new matches from
                &quot;Queued&quot; to &quot;Approved&quot; so they&apos;re ready to go —
                this never submits anything on the employer&apos;s site by itself,
                it just pre-sorts your queue for you.
              </p>
            </div>
            <label className={`inline-flex items-center gap-2 text-sm shrink-0 ${plan === "pro" ? "cursor-pointer" : "cursor-not-allowed opacity-50"}`}>
              <input
                type="checkbox"
                checked={autoApproveEnabled}
                disabled={plan !== "pro"}
                onChange={(e) => setAutoApproveEnabled(e.target.checked)}
                className="h-4 w-4 accent-indigo-600"
              />
              Enabled
            </label>
          </div>
          {plan !== "pro" && (
            <p className="text-xs text-black/40 dark:text-white/40">🔒 Upgrade to Pro above to enable.</p>
          )}
          {autoApproveEnabled && plan === "pro" && (
            <div className="fade-in-up flex flex-wrap gap-4 text-sm">
              <label className="flex items-center gap-2">
                Min match score
                <input
                  type="number"
                  min={0}
                  max={100}
                  value={autoApproveMinScore}
                  onChange={(e) => setAutoApproveMinScore(e.target.value)}
                  className={`${input} w-20`}
                />
              </label>
              <label className="flex items-center gap-2">
                Max per run
                <input
                  type="number"
                  min={1}
                  max={50}
                  value={autoApproveMaxPerRun}
                  onChange={(e) => setAutoApproveMaxPerRun(e.target.value)}
                  className={`${input} w-20`}
                />
              </label>
            </div>
          )}
        </div>
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
    </div>
  );
}
