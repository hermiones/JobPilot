"use client";

import { useEffect, useState } from "react";
import type { ReferralDTO } from "@/lib/apiTypes";

export function ReferralCard() {
  const [data, setData] = useState<ReferralDTO | null>(null);
  const [copied, setCopied] = useState(false);
  const [origin, setOrigin] = useState("");

  useEffect(() => {
    setOrigin(window.location.origin);
    fetch("/api/referral")
      .then((r) => r.json())
      .then(setData);
  }, []);

  const card =
    "card-surface rounded-xl border border-black/10 dark:border-white/10 bg-white/80 dark:bg-white/[0.06] backdrop-blur-md p-5";

  if (!data) return <div className={`${card} h-40 shimmer`} />;

  const link = `${origin}/register?ref=${data.code}`;
  const shareText = `I've been using Job Pilot to auto-tailor and track my job applications — genuinely useful. Sign up with my link and we both get closer to Pro:`;
  const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(`${shareText} ${link}`)}`;
  const linkedinUrl = `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(link)}`;

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(link);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* clipboard may be unavailable */
    }
  }

  const remaining = Math.max(0, data.goal - data.count);
  const pct = Math.min(100, Math.round((data.count / data.goal) * 100));

  return (
    <div className={`fade-in-up ${card} space-y-4`} style={{ ["--delay" as string]: "125ms" }}>
      <div>
        <h2 className="font-medium flex items-center gap-2">
          🎁 Refer 3 friends, get Pro free
          {data.plan === "pro" && (
            <span className="rounded-full bg-gradient-to-r from-indigo-600 to-violet-600 text-white px-2 py-0.5 text-xs font-semibold">
              Unlocked
            </span>
          )}
        </h2>
        <p className="text-sm text-black/60 dark:text-white/60">
          Share your link on LinkedIn or WhatsApp — once {data.goal} people create an
          account through it, your plan auto-upgrades to Pro. No payment needed.
        </p>
      </div>

      <div className="space-y-1.5">
        <div className="flex items-center justify-between text-xs text-black/60 dark:text-white/60">
          <span>
            {data.count} / {data.goal} joined
          </span>
          {remaining > 0 ? (
            <span>{remaining} more to go</span>
          ) : (
            <span className="text-emerald-600 dark:text-emerald-400 font-medium">
              Goal reached 🎉
            </span>
          )}
        </div>
        <div className="h-2.5 w-full rounded-full bg-black/10 dark:bg-white/10 overflow-hidden">
          <div
            className="h-full rounded-full bg-gradient-to-r from-indigo-600 via-violet-600 to-cyan-400 transition-all duration-700 ease-out"
            style={{ width: `${Math.max(4, pct)}%` }}
          />
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <input
          readOnly
          value={link}
          className="flex-1 min-w-[14rem] rounded-md border border-black/15 dark:border-white/15 bg-white/80 dark:bg-white/[0.06] px-3 py-2 text-xs font-mono outline-none"
          onFocus={(e) => e.currentTarget.select()}
        />
        <button
          onClick={copyLink}
          className="rounded-md border border-black/15 dark:border-white/15 px-3 py-2 text-xs font-medium hover:bg-black/5 dark:hover:bg-white/10 transition-colors duration-150"
        >
          {copied ? "Copied ✓" : "Copy link"}
        </button>
        <a
          href={whatsappUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="rounded-md bg-[#25D366] px-3 py-2 text-xs font-semibold text-white hover:brightness-105 transition-transform duration-150 hover:-translate-y-0.5"
        >
          Share on WhatsApp
        </a>
        <a
          href={linkedinUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="rounded-md bg-[#0A66C2] px-3 py-2 text-xs font-semibold text-white hover:brightness-105 transition-transform duration-150 hover:-translate-y-0.5"
        >
          Share on LinkedIn
        </a>
      </div>
    </div>
  );
}
