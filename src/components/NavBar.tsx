"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";

const LINKS = [
  { href: "/", label: "Dashboard" },
  { href: "/review", label: "Review Queue" },
  { href: "/tracker", label: "Tracker" },
  { href: "/profile", label: "Profile" },
  { href: "/how-to-use", label: "How to Use" },
];

const AUTH_PAGES = ["/login", "/register"];

export function NavBar() {
  const pathname = usePathname();
  const router = useRouter();
  const [email, setEmail] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/auth/me")
      .then((r) => r.json())
      .then((d) => setEmail(d.user?.email ?? null))
      .catch(() => setEmail(null));
  }, [pathname]);

  if (AUTH_PAGES.includes(pathname)) return null;

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  }

  return (
    <header className="sticky top-0 z-10 border-b border-black/10 dark:border-white/10 bg-white/80 dark:bg-black/40 backdrop-blur">
      <nav className="max-w-6xl mx-auto px-4 h-14 flex items-center gap-6">
        <Link href="/" className="font-semibold tracking-tight flex items-center gap-2 group">
          <span className="glow-accent inline-flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-br from-indigo-600 via-violet-600 to-cyan-500 text-white text-sm shadow-md transition-transform group-hover:scale-110 group-hover:rotate-6">
            ✈
          </span>
          <span className="gradient-text text-base">Job Pilot</span>
        </Link>
        <ul className="flex items-center gap-1 text-sm">
          {LINKS.map((l) => {
            const active =
              l.href === "/" ? pathname === "/" : pathname.startsWith(l.href);
            return (
              <li key={l.href}>
                <Link
                  href={l.href}
                  className={`px-3 py-1.5 rounded-md transition-all ${
                    active
                      ? "bg-gradient-to-r from-indigo-600 to-violet-600 text-white shadow-sm"
                      : "text-black/70 dark:text-white/70 hover:bg-black/5 dark:hover:bg-white/10 hover:-translate-y-0.5"
                  }`}
                >
                  {l.label}
                </Link>
              </li>
            );
          })}
        </ul>
        <div className="ml-auto flex items-center gap-3 text-sm">
          {email && (
            <>
              <span className="text-black/50 dark:text-white/50 hidden sm:inline">
                {email}
              </span>
              <button
                onClick={logout}
                className="rounded-md border border-black/10 dark:border-white/15 px-3 py-1.5 hover:bg-black/5 dark:hover:bg-white/10"
              >
                Log out
              </button>
            </>
          )}
        </div>
      </nav>
    </header>
  );
}
