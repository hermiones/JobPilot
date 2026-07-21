"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const LINKS = [
  { href: "/", label: "Dashboard" },
  { href: "/review", label: "Review Queue" },
  { href: "/tracker", label: "Tracker" },
  { href: "/profile", label: "Profile" },
];

export function NavBar() {
  const pathname = usePathname();

  return (
    <header className="sticky top-0 z-10 border-b border-black/10 dark:border-white/10 bg-white/80 dark:bg-black/40 backdrop-blur">
      <nav className="max-w-6xl mx-auto px-4 h-14 flex items-center gap-6">
        <Link href="/" className="font-semibold tracking-tight flex items-center gap-2">
          <span className="inline-flex h-6 w-6 items-center justify-center rounded bg-indigo-600 text-white text-sm">
            ✈
          </span>
          Job Pilot
        </Link>
        <ul className="flex items-center gap-1 text-sm">
          {LINKS.map((l) => {
            const active =
              l.href === "/" ? pathname === "/" : pathname.startsWith(l.href);
            return (
              <li key={l.href}>
                <Link
                  href={l.href}
                  className={`px-3 py-1.5 rounded-md transition-colors ${
                    active
                      ? "bg-indigo-600 text-white"
                      : "text-black/70 dark:text-white/70 hover:bg-black/5 dark:hover:bg-white/10"
                  }`}
                >
                  {l.label}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
    </header>
  );
}
