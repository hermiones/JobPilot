"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";

const AUTH_PAGES = ["/login", "/register"];

export function FeedbackWidget() {
  const pathname = usePathname();
  const [loggedIn, setLoggedIn] = useState(false);
  const [open, setOpen] = useState(false);
  const [rating, setRating] = useState(0);
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [sent, setSent] = useState(false);

  useEffect(() => {
    fetch("/api/auth/me")
      .then((r) => r.json())
      .then((d) => setLoggedIn(!!d.user))
      .catch(() => setLoggedIn(false));
  }, [pathname]);

  if (AUTH_PAGES.includes(pathname) || !loggedIn) return null;

  async function submit() {
    if (rating === 0 && !message.trim()) return;
    setSubmitting(true);
    await fetch("/api/feedback", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        rating: rating || undefined,
        message: message.trim(),
        page: pathname,
      }),
    });
    setSubmitting(false);
    setSent(true);
    setTimeout(() => {
      setOpen(false);
      setSent(false);
      setRating(0);
      setMessage("");
    }, 1500);
  }

  return (
    <div className="fixed bottom-5 right-5 z-40">
      {open && (
        <div className="fade-in-up mb-3 w-72 card-surface rounded-xl border border-black/10 dark:border-white/10 bg-white/95 dark:bg-black/80 backdrop-blur-md p-4 shadow-xl space-y-3">
          {sent ? (
            <p className="text-sm text-center text-emerald-600 dark:text-emerald-400 py-4">
              Thanks — got it! 🙏
            </p>
          ) : (
            <>
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold">Got feedback?</h3>
                <button
                  onClick={() => setOpen(false)}
                  className="text-black/40 dark:text-white/40 hover:text-black dark:hover:text-white"
                  aria-label="Close"
                >
                  ✕
                </button>
              </div>
              <div className="flex gap-1 justify-center">
                {[1, 2, 3, 4, 5].map((n) => (
                  <button
                    key={n}
                    onClick={() => setRating(n)}
                    className={`text-2xl transition-transform duration-150 hover:scale-125 ${
                      n <= rating ? "opacity-100" : "opacity-30"
                    }`}
                    aria-label={`${n} star${n === 1 ? "" : "s"}`}
                  >
                    ⭐
                  </button>
                ))}
              </div>
              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                rows={3}
                placeholder="What should we build, fix, or change?"
                className="w-full rounded-md border border-black/15 dark:border-white/15 bg-white/80 dark:bg-white/[0.06] px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-500"
              />
              <button
                onClick={submit}
                disabled={submitting || (rating === 0 && !message.trim())}
                className="w-full glow-accent rounded-md bg-gradient-to-r from-indigo-600 to-violet-600 px-3 py-2 text-sm font-medium text-white hover:brightness-110 disabled:opacity-50"
              >
                {submitting ? "Sending…" : "Send feedback"}
              </button>
            </>
          )}
        </div>
      )}
      <button
        onClick={() => setOpen((o) => !o)}
        className="glow-accent flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br from-indigo-600 to-violet-600 text-white text-xl shadow-lg hover:brightness-110 transition-transform duration-200 hover:scale-110"
        aria-label="Give feedback"
        title="Give feedback"
      >
        💬
      </button>
    </div>
  );
}
