"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import type { ProfileDTO } from "@/lib/apiTypes";

export function GmailCard({ profile }: { profile: ProfileDTO }) {
  const searchParams = useSearchParams();
  const [connected, setConnected] = useState(profile.gmailConnected);
  const [email, setEmail] = useState(profile.gmailEmail);
  const [lastSynced, setLastSynced] = useState(profile.gmailLastSyncedAt);
  const [syncing, setSyncing] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    const gmailParam = searchParams.get("gmail");
    if (gmailParam === "connected") {
      setConnected(true);
      setMessage("✅ Gmail connected — it'll check for replies on your applied jobs during scheduled runs.");
    } else if (gmailParam === "error") {
      setMessage(`⚠️ Couldn't connect Gmail (${searchParams.get("reason") ?? "unknown error"}).`);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function disconnect() {
    await fetch("/api/gmail/disconnect", { method: "POST" });
    setConnected(false);
    setEmail(null);
    setMessage(null);
  }

  async function syncNow() {
    setSyncing(true);
    setMessage(null);
    try {
      const res = await fetch("/api/gmail/sync", { method: "POST" });
      const data = await res.json();
      if (!res.ok) {
        setMessage(`⚠️ ${data.error ?? "Sync failed"}`);
      } else {
        setMessage(`✉️ Checked ${data.checked} applied job(s), updated ${data.updated}.`);
        setLastSynced(new Date().toISOString());
      }
    } catch (e) {
      setMessage(`⚠️ ${(e as Error).message}`);
    } finally {
      setSyncing(false);
    }
  }

  const card =
    "card-surface rounded-xl border border-black/10 dark:border-white/10 bg-white/80 dark:bg-white/[0.06] backdrop-blur-md p-5";

  return (
    <div className={`fade-in-up ${card} space-y-3`} style={{ ["--delay" as string]: "75ms" }}>
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h2 className="font-medium">📧 Auto-detect replies (Gmail)</h2>
          <p className="text-sm text-black/60 dark:text-white/60">
            Connect your Gmail (read-only) and Job Pilot will automatically flag applications as
            &quot;Responded,&quot; &quot;Interview,&quot; &quot;Offer,&quot; or &quot;Rejected&quot;
            when it spots a matching reply — no manual status updates needed. Nothing is ever sent
            on your behalf.
          </p>
        </div>
        {connected ? (
          <button
            onClick={disconnect}
            className="rounded-md border border-black/15 dark:border-white/15 px-3 py-1.5 text-sm hover:bg-black/5 dark:hover:bg-white/10 transition-colors duration-150"
          >
            Disconnect
          </button>
        ) : (
          <a
            href="/api/gmail/connect"
            className="glow-accent rounded-md bg-gradient-to-r from-indigo-600 to-violet-600 px-3 py-1.5 text-sm font-medium text-white hover:brightness-110 transition-transform duration-150 hover:-translate-y-0.5"
          >
            Connect Gmail
          </a>
        )}
      </div>

      {connected && (
        <div className="flex flex-wrap items-center gap-3 text-sm">
          <span className="text-black/60 dark:text-white/60">
            Connected: <span className="font-medium">{email ?? "unknown"}</span>
          </span>
          <button
            onClick={syncNow}
            disabled={syncing}
            className="rounded-md border border-black/15 dark:border-white/15 px-2.5 py-1 text-xs hover:bg-black/5 dark:hover:bg-white/10 disabled:opacity-60"
          >
            {syncing ? "Checking…" : "Check now"}
          </button>
          {lastSynced && (
            <span className="text-xs text-black/40 dark:text-white/40">
              Last checked {new Date(lastSynced).toLocaleString()}
            </span>
          )}
        </div>
      )}

      {message && (
        <p className="fade-in-up text-xs text-black/60 dark:text-white/60">{message}</p>
      )}
    </div>
  );
}
