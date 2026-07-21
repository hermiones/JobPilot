"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

export function AuthForm({ mode }: { mode: "login" | "register" }) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const res = await fetch(`/api/auth/${mode}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error ?? "Something went wrong");
      setBusy(false);
      return;
    }
    router.push("/");
    router.refresh();
  }

  const input =
    "w-full rounded-md border border-black/15 dark:border-white/15 bg-white/80 dark:bg-white/[0.06] backdrop-blur-md px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-500";

  return (
    <div className="min-h-[70vh] flex items-center justify-center">
      <div className="w-full max-w-sm card-surface rounded-xl border border-black/10 dark:border-white/10 bg-white/80 dark:bg-white/[0.06] backdrop-blur-md p-6 space-y-5">
        <div className="text-center">
          <div className="inline-flex h-10 w-10 items-center justify-center rounded-lg bg-indigo-600 text-white text-lg mb-2">
            ✈
          </div>
          <h1 className="text-xl font-semibold tracking-tight">
            {mode === "login" ? "Log in to Job Pilot" : "Create your account"}
          </h1>
          <p className="text-sm text-black/60 dark:text-white/60 mt-1">
            {mode === "login"
              ? "Welcome back — pick up your application queue."
              : "Set up your profile and start applying faster."}
          </p>
        </div>

        <form onSubmit={submit} className="space-y-3">
          <div>
            <label className="block text-sm font-medium mb-1">Email</label>
            <input
              className={input}
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Password</label>
            <input
              className={input}
              type="password"
              required
              minLength={8}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete={mode === "login" ? "current-password" : "new-password"}
            />
            {mode === "register" && (
              <p className="mt-1 text-xs text-black/50 dark:text-white/50">
                At least 8 characters.
              </p>
            )}
          </div>

          {error && (
            <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
          )}

          <button
            type="submit"
            disabled={busy}
            className="w-full rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-500 disabled:opacity-60"
          >
            {busy
              ? "Please wait…"
              : mode === "login"
              ? "Log in"
              : "Create account"}
          </button>
        </form>

        <p className="text-center text-sm text-black/60 dark:text-white/60">
          {mode === "login" ? (
            <>
              New here?{" "}
              <Link href="/register" className="text-indigo-600 dark:text-indigo-400 hover:underline">
                Create an account
              </Link>
            </>
          ) : (
            <>
              Already have an account?{" "}
              <Link href="/login" className="text-indigo-600 dark:text-indigo-400 hover:underline">
                Log in
              </Link>
            </>
          )}
        </p>
      </div>
    </div>
  );
}
