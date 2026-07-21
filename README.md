# Job Pilot ✈

A high-volume job application assistant. Job Pilot aggregates listings from public job APIs, scores them against your profile, uses Gemini to tailor resume bullets and cover letters per job, and gives you a fast review-and-apply workflow with a pipeline tracker — all while keeping the final "Apply" click on the employer's real site (no bot login, no auto-submit).

Built with **Next.js (App Router) · TypeScript · Tailwind CSS · Prisma + Postgres (Neon) · Google Gemini**. Multi-user with email/password login — everyone gets their own private profile, queue, and tracker.

📄 The full product spec lives in [docs/PRD.md](docs/PRD.md).
🛠️ Setting it up? See [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md) for local + Vercel instructions.
🧭 New to the codebase? [docs/HOW_IT_WORKS.md](docs/HOW_IT_WORKS.md) explains every moving part in plain English.

## Features (v1 / MVP)

- **Multi-user accounts** — email/password registration and login; every user's resume, matches, and applications are private to them.
- **Job aggregation** — pulls listings from Greenhouse, Lever, and RemoteOK (public APIs only), with **auto-discovery** to find live company boards by name.
- **Relevance scoring** — deterministic keyword / title / seniority / location / salary match against your profile (salaries in ₹ INR).
- **AI resume tailoring** — reorders and rewords your master resume per JD via Gemini (truthful, ATS-oriented).
- **AI cover letter draft** — short, JD-specific cover letter in your chosen tone.
- **Review & approve queue** — ranked, navigable cards: read the JD, generate + edit docs, attach a resume file, "Approve & Open".
- **Application tracker** — status pipeline (queued → applied → … → offer/reject), notes, dates, CSV export.
- **Daily goal dashboard** — progress toward your daily target, funnel counts, and 7-day follow-up reminders.
- **Automation schedule** — pick IST times to auto-refresh and re-score jobs, several times a day, with no manual clicks.
- **Duplicate detection** — fuzzy company+title matching so aggregator re-lists don't clutter the queue.

## Quick start

```bash
npm install
cp .env.example .env   # fill in DATABASE_URL, GEMINI_API_KEY, AUTH_SECRET
npx prisma migrate deploy
npm run db:seed         # optional demo account: you@jobpilot.local / jobpilot123
npm run dev
```

Open http://localhost:3000 — you'll land on `/login`. Log in with the seeded demo account or register your own. Full details (including generating `AUTH_SECRET`, choosing a Postgres provider, and deploying to Vercel) are in [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md).

## Usage

1. **Register / Log in** — each account is private; your data never mixes with anyone else's.
2. **Profile** — paste your master resume, target roles, locations, salary floor (₹), excluded companies, daily goal, and (optionally) an automation schedule.
3. **Job boards** — auto-discover public Greenhouse/Lever company boards, or add specific companies by name.
4. **Dashboard → Refresh jobs** — fetches fresh listings from the public sources and scores them into your queue (or let the schedule do it automatically).
5. **Review Queue** — for each ranked job: read the JD, click *Generate with AI*, edit the tailored resume/cover letter, optionally attach a resume file, then *Approve & Open* to launch the employer's page and log the application.
6. **Tracker** — update statuses as you hear back; export the log as CSV anytime.

## Scripts

| Script | Description |
| --- | --- |
| `npm run dev` | Start the dev server |
| `npm run build` / `npm start` | Production build / serve |
| `npm run db:seed` | Seed demo data |
| `npm run db:reset` | Drop, re-migrate, and re-seed the DB |
| `npm run db:studio` | Open Prisma Studio |

## Architecture

```
src/
  app/
    api/           Route handlers (auth, profile, jobs/refresh, matches/rescore,
                   queue, tailor, applications, dashboard, export, boards, cron)
    login/ register/  Auth pages
    review/        Review queue page
    tracker/       Application tracker page
    profile/       Profile setup page (resume, schedule, job boards)
    page.tsx       Dashboard
  components/      NavBar, Dashboard, ReviewQueue, ReviewCard, Tracker,
                   ProfileForm, BoardsManager, AuthForm, Background3D
  lib/
    auth/          Password hashing, session cookies, requireUser guard
    jobSources/    Greenhouse / Lever / RemoteOK fetchers, aggregator, discovery
    ai/            Gemini client + tailoring prompt
    scoring.ts     Relevance scoring engine
    dedupe.ts      Fuzzy duplicate detection
    rescore.ts     Batched scoring + queueing (per user)
    pipeline.ts    Refresh + rescore orchestration (manual and scheduled)
    scheduler.ts   In-process IST scheduler (local/self-hosted runs)
    prisma.ts      Prisma client singleton
  proxy.ts         Next.js middleware — protects pages/APIs behind login
prisma/
  schema.prisma    User, JobListing, Application, Match, Board models
  seed.ts          Demo data
```

For a plain-language walkthrough of how each piece works — where jobs come from, how scoring works, how the AI tailoring prompt is built, how the scheduler and login system work — see [docs/HOW_IT_WORKS.md](docs/HOW_IT_WORKS.md).

## Notes & scope

- **Multi-user, shared job pool.** Job listings (`JobListing`, `Board`) are shared across everyone — they're public postings. Profiles, matches, and applications are private per account.
- **Compliant by design.** Job Pilot never logs into third-party sites or auto-submits. It only opens the real application page for you to complete.
- **Currency.** All salary figures are shown in ₹ INR; RemoteOK's USD figures are converted at a fixed reference rate (see `src/lib/currency.ts`).
