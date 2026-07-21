# Job Pilot ✈

A high-volume job application assistant. Job Pilot aggregates listings from public job APIs, scores them against your profile, uses Gemini to tailor resume bullets and cover letters per job, and gives you a fast review-and-apply workflow with a pipeline tracker — all while keeping the final "Apply" click on the employer's real site (no bot login, no auto-submit).

Built with **Next.js (App Router) · TypeScript · Tailwind CSS · Prisma + Postgres (Neon) · Google Gemini**.

The full product spec lives in [docs/PRD.md](docs/PRD.md).

## Features (v1 / MVP)

- **Job aggregation** — pulls listings from Greenhouse, Lever, and RemoteOK (public APIs only).
- **Relevance scoring** — deterministic keyword / title / seniority / location / salary match against your profile.
- **AI resume tailoring** — reorders and rewords your master resume per JD via Gemini (truthful, ATS-oriented).
- **AI cover letter draft** — short, JD-specific cover letter in your chosen tone.
- **Review & approve queue** — ranked, navigable cards: read the JD, generate + edit docs, "Approve & Open".
- **Application tracker** — status pipeline (queued → applied → … → offer/reject), notes, dates, CSV export.
- **Daily goal dashboard** — progress toward your daily target, funnel counts, and 7-day follow-up reminders.
- **Duplicate detection** — fuzzy company+title matching so aggregator re-lists don't clutter the queue.

## Getting started

### 1. Install dependencies

```bash
npm install
```

### 2. Configure environment

Copy the example env and add your Gemini API key:

```bash
cp .env.example .env
```

Then edit `.env`:

```
DATABASE_URL="postgresql://user:password@host/dbname?sslmode=require"
GEMINI_API_KEY="your-gemini-api-key-here"
```

- `DATABASE_URL` — a Postgres connection string. Get one free from [Neon](https://neon.tech), [Supabase](https://supabase.com), or [Vercel Postgres](https://vercel.com/storage/postgres).
- `GEMINI_API_KEY` — get a key from [Google AI Studio](https://aistudio.google.com/apikey).

`.env` is gitignored — never commit it.

### 3. Set up the database

```bash
npx prisma migrate deploy   # applies the schema to your Postgres database
npm run db:seed             # loads a demo profile + a few mock jobs
```

### 4. Run

```bash
npm run dev
```

Open http://localhost:3000.

## Usage

1. **Profile** — paste your master resume, target roles, locations, salary floor, excluded companies, and daily goal.
2. **Dashboard → Refresh jobs** — fetches fresh listings from the public sources and scores them into your queue.
3. **Review Queue** — for each ranked job: read the JD, click *Generate with AI*, edit the tailored resume/cover letter, then *Approve & Open* to launch the employer's page and log the application.
4. **Tracker** — update statuses as you hear back; export the log as CSV anytime.

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
    api/           Route handlers (profile, jobs/refresh, matches/rescore,
                   queue, tailor, applications, dashboard, export)
    review/        Review queue page
    tracker/       Application tracker page
    profile/       Profile setup page
    page.tsx       Dashboard
  components/      NavBar, Dashboard, ReviewQueue, ReviewCard, Tracker, ProfileForm
  lib/
    jobSources/    Greenhouse / Lever / RemoteOK fetchers + aggregator
    ai/            Gemini client + tailoring prompt
    scoring.ts     Relevance scoring engine
    dedupe.ts      Fuzzy duplicate detection
    prisma.ts      Prisma client singleton
prisma/
  schema.prisma    User, JobListing, Application, Match models
  seed.ts          Demo data
```

## Deploying to Vercel

The app deploys to Vercel as-is — it already uses Postgres, and `npm run postinstall` runs `prisma generate` on every build.

1. Push the repo to GitHub and import it into Vercel.
2. In **Project Settings → Environment Variables**, add:
   - `DATABASE_URL` — your Neon/Postgres connection string
   - `GEMINI_API_KEY` — your Gemini key
3. Apply migrations to the production database once (from your machine, with the prod `DATABASE_URL`):
   ```bash
   npx prisma migrate deploy
   npm run db:seed   # optional — seeds the demo profile
   ```
4. Deploy.

Notes:
- **`/api/jobs/refresh` fetches 600+ listings** and can exceed the Hobby plan's ~10s function limit. For large refreshes, use a scheduled cron (see the PRD) or a plan with a longer timeout.
- Neon's **pooled** connection string (the `-pooler` host) is recommended for serverless.

## Notes & scope

- **Single-user MVP.** The app operates on one default profile; auth can be layered on later without schema changes (see the data model in the PRD).
- **Compliant by design.** Job Pilot never logs into third-party sites or auto-submits. It only opens the real application page for you to complete.
- **Sources.** Greenhouse/Lever fetch from a few well-known public company boards by default (configurable in `src/lib/jobSources/index.ts`). RemoteOK provides a broad public feed.
