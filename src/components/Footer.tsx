import Link from "next/link";

export function Footer() {
  return (
    <footer className="border-t border-black/10 dark:border-white/10 bg-white/60 dark:bg-black/30 backdrop-blur mt-12">
      <div className="max-w-6xl mx-auto px-4 py-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-sm">
        <div className="flex items-center gap-2">
          <span className="glow-accent inline-flex h-6 w-6 items-center justify-center rounded-md bg-gradient-to-br from-indigo-600 via-violet-600 to-cyan-500 text-white text-xs shadow-md">
            ✈
          </span>
          <span className="gradient-text font-semibold">Job Pilot</span>
          <span className="text-black/40 dark:text-white/40">
            — you don&apos;t need 100 applications, you need the one.
          </span>
        </div>

        <nav className="flex flex-wrap items-center gap-x-5 gap-y-2 text-black/60 dark:text-white/60">
          <Link href="/how-to-use" className="hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors">
            How to Use
          </Link>
          <Link href="/profile" className="hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors">
            Settings
          </Link>
          <a
            href="https://github.com/hermiones/JobPilot"
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors"
          >
            GitHub
          </a>
        </nav>

        <p className="text-xs text-black/40 dark:text-white/40">
          © {new Date().getFullYear()} Job Pilot · Built for job seekers, not job boards
        </p>
      </div>
    </footer>
  );
}
