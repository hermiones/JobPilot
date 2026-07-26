"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { THEMES, getAppTheme, setAppTheme, type ThemeId } from "@/lib/theme";
import { getBg3dEnabled, setBg3dEnabled } from "@/lib/bg3dPref";

const LINKS = [
  { href: "/", label: "Dashboard" },
  { href: "/review", label: "Review Queue" },
  { href: "/easy-apply", label: "Easy Apply" },
  { href: "/tracker", label: "Tracker" },
  { href: "/profile", label: "Profile" },
  { href: "/how-to-use", label: "How to Use" },
];

const AUTH_PAGES = ["/login", "/register"];

export function NavBar() {
  const pathname = usePathname();
  const router = useRouter();
  const [email, setEmail] = useState<string | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [themeOpen, setThemeOpen] = useState(false);
  const [theme, setTheme] = useState<ThemeId>("default");
  const [bg3d, setBg3d] = useState(false);

  useEffect(() => {
    setTheme(getAppTheme());
    setBg3d(getBg3dEnabled());
  }, []);

  function pickTheme(id: ThemeId) {
    setTheme(id);
    setAppTheme(id);
  }

  function toggleBg3d(checked: boolean) {
    setBg3d(checked);
    setBg3dEnabled(checked);
  }

  useEffect(() => {
    fetch("/api/auth/me")
      .then((r) => r.json())
      .then((d) => {
        setEmail(d.user?.email ?? null);
        setIsAdmin(!!d.user?.isAdmin);
      })
      .catch(() => {
        setEmail(null);
        setIsAdmin(false);
      });
  }, [pathname]);

  useEffect(() => {
    setMenuOpen(false);
  }, [pathname]);

  if (AUTH_PAGES.includes(pathname)) return null;

  const links = isAdmin ? [...LINKS, { href: "/admin", label: "Admin" }] : LINKS;

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  }

  return (
    <header className="sticky top-0 z-10 border-b border-black/10 dark:border-white/10 bg-white/80 dark:bg-black/40 backdrop-blur">
      <nav className="max-w-6xl mx-auto px-4 h-14 flex items-center gap-4 md:gap-6">
        <Link href="/" className="font-semibold tracking-tight flex items-center gap-2 group shrink-0">
          <span className="glow-accent inline-flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-br from-indigo-600 via-violet-600 to-cyan-500 text-white text-sm shadow-md transition-transform group-hover:scale-110 group-hover:rotate-6">
            ✈
          </span>
          <span className="gradient-text text-base">Job Pilot</span>
        </Link>

        <ul className="hidden md:flex items-center gap-1 text-sm">
          {links.map((l) => {
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

        <div className="ml-auto flex items-center gap-2 sm:gap-3 text-sm">
          <div className="relative">
            <button
              onClick={() => setThemeOpen((o) => !o)}
              className="flex h-9 w-9 items-center justify-center rounded-md border border-black/10 dark:border-white/15 text-base hover:bg-black/5 dark:hover:bg-white/10 transition-transform duration-150 hover:scale-105"
              aria-label="Change theme"
              title="Change theme"
            >
              {THEMES.find((t) => t.id === theme)?.emoji ?? "🎨"}
            </button>
            {themeOpen && (
              <div className="fade-in-up absolute right-0 mt-2 w-52 rounded-md border border-black/10 dark:border-white/15 bg-white/95 dark:bg-black/90 backdrop-blur-md shadow-lg py-1 z-20">
                {THEMES.map((t) => (
                  <button
                    key={t.id}
                    onClick={() => pickTheme(t.id)}
                    className={`w-full flex items-center gap-2 px-3 py-1.5 text-sm text-left hover:bg-black/5 dark:hover:bg-white/10 ${
                      theme === t.id ? "font-semibold text-indigo-600 dark:text-indigo-400" : ""
                    }`}
                  >
                    <span>{t.emoji}</span> {t.label}
                  </button>
                ))}
                <div className="my-1 border-t border-black/5 dark:border-white/10" />
                <label className="w-full flex items-center justify-between gap-2 px-3 py-1.5 text-sm cursor-pointer hover:bg-black/5 dark:hover:bg-white/10">
                  <span className="flex items-center gap-2">🌌 3D background</span>
                  <input
                    type="checkbox"
                    checked={bg3d}
                    onChange={(e) => toggleBg3d(e.target.checked)}
                    className="h-4 w-4 accent-indigo-600"
                  />
                </label>
              </div>
            )}
          </div>
          {email && (
            <>
              <span className="text-black/50 dark:text-white/50 hidden lg:inline">
                {email}
              </span>
              <button
                onClick={logout}
                className="hidden md:inline-block rounded-md border border-black/10 dark:border-white/15 px-3 py-1.5 hover:bg-black/5 dark:hover:bg-white/10"
              >
                Log out
              </button>
            </>
          )}
          <button
            onClick={() => setMenuOpen((o) => !o)}
            className="md:hidden flex h-9 w-9 items-center justify-center rounded-md border border-black/10 dark:border-white/15 text-lg"
            aria-label="Toggle menu"
          >
            {menuOpen ? "✕" : "☰"}
          </button>
        </div>
      </nav>

      {menuOpen && (
        <div className="md:hidden border-t border-black/10 dark:border-white/10 bg-white/95 dark:bg-black/90 backdrop-blur px-4 py-3 space-y-1">
          {links.map((l) => {
            const active =
              l.href === "/" ? pathname === "/" : pathname.startsWith(l.href);
            return (
              <Link
                key={l.href}
                href={l.href}
                className={`block px-3 py-2 rounded-md text-sm ${
                  active
                    ? "bg-gradient-to-r from-indigo-600 to-violet-600 text-white"
                    : "text-black/70 dark:text-white/70 hover:bg-black/5 dark:hover:bg-white/10"
                }`}
              >
                {l.label}
              </Link>
            );
          })}
          {email && (
            <div className="pt-2 mt-2 border-t border-black/5 dark:border-white/10 flex items-center justify-between">
              <span className="text-xs text-black/50 dark:text-white/50 truncate">{email}</span>
              <button
                onClick={logout}
                className="rounded-md border border-black/10 dark:border-white/15 px-3 py-1.5 text-sm hover:bg-black/5 dark:hover:bg-white/10"
              >
                Log out
              </button>
            </div>
          )}
        </div>
      )}
    </header>
  );
}
