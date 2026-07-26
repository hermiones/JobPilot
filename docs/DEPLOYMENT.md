# Deployment Guide

Two setups: running it on your own machine (Local), and putting it on the internet so anyone can sign up and use it (Vercel). Follow whichever one you need — you don't have to do both.

---

## Expected infrastructure sizing

Job Pilot is intentionally lightweight — there's no heavy compute (no local ML models, no browser automation, no vector DB). Sizing below assumes a few dozen to a few hundred active users; re-evaluate if you're planning for thousands.

| Component | Recommendation | Why |
|---|---|---|
| **App hosting** | Vercel Hobby (free) to start; **Vercel Pro** ($20/mo) once you need >1 cron run/day, >10s function timeout, or a custom domain with team access | The app is a standard Next.js app — no special compute needs. Serverless functions here are I/O-bound (waiting on Greenhouse/Lever/AI provider responses), not CPU-bound. |
| **vCPU / memory per function** | Vercel's default (1 vCPU, 1024 MB) is enough for every route in this app, including the job-refresh aggregator and PDF generation | Nothing here does heavy in-memory processing; the biggest job is generating a Prisma raw query result set (~150 rows) or a small PDF (a few KB). |
| **Database** | **Neon Postgres** free tier (0.5 GB storage, autosuspend) is enough for dev/demo. For steady production use with a few hundred users and the full job pool (a few thousand `JobListing` rows), move to Neon's **Launch** tier (~$19/mo, 10 GB storage, no autosuspend) | Autosuspend on the free tier adds cold-start latency (the DB "wakes up" on first query after idling) — fine for a demo, annoying for real users. `JobListing` + `Match` are the biggest tables; a few thousand jobs × a few hundred users' worth of matches is still low tens of MB, well within Launch tier. |
| **Function timeout** | `maxDuration = 60` is already set on the cron/refresh route. Vercel Hobby caps most functions at 10s regardless of this setting — a refresh across 20+ boards can exceed that. This is one concrete reason to move to Pro (60s+ default) before relying on the scheduled refresh in production. | |
| **AI provider costs** | Variable, based on usage — Gemini Flash's free tier covers light usage; budget for it once you have real Pro users generating multiple cover-letter variants per job | Each cover letter generation is one LLM call with a resume + JD in the prompt — a few hundred to ~1k tokens in, a few hundred out. Cheap per-call, but multiply by users × variants × daily volume. |
| **Object/file storage** | None needed — resume files and generated PDFs are stored as base64 in Postgres (`bytea`-equivalent text columns), not in a separate blob store | Simplifies the stack for this scale; would need to move to Vercel Blob or S3 if resume files got large or numerous enough to bloat the Postgres plan. |

**Bottom line for a real (paying-users) launch**: Vercel Pro ($20/mo) + Neon Launch (~$19/mo) + your own AI provider spend ≈ **$40–60/mo fixed** before variable AI costs, comfortably covering a few hundred active users.

### Sizing for a 100 requests/minute target

That's roughly 1.7 req/s sustained — well inside what the stack below handles without changes, but three specific things are worth confirming before you actually hit that load:

| Concern | Current state | What to do at this scale |
|---|---|---|
| **Serverless function concurrency** | Vercel auto-scales function instances per request; there's no shared process, so 100 req/min spread across users is trivially parallel | No action needed — this is exactly what serverless is for. Fluid Compute (Vercel's default) also reuses warm instances, reducing cold starts under sustained load. |
| **Database connections** | The `DATABASE_URL` should already be Neon's **pooled** connection string (has `-pooler` in the hostname) — check `.env`, it determines whether many concurrent serverless functions can all reach Postgres without exhausting connections | If you're on the *unpooled* Neon connection string, switch to the pooled one before this load — otherwise you'll see "too many connections" errors under concurrent traffic. |
| **In-memory rate limiter** (`src/lib/auth/rateLimit.ts`) | Lives in a single function instance's memory — on Vercel, different concurrent requests can land on *different* instances, so the login/register rate limit is only a soft per-instance speed bump, not a hard global cap, once you're horizontally scaled across many instances | Fine for deterring casual brute-forcing today. For a hard guarantee at real scale, move this to a shared store (Upstash Redis, or Vercel Firewall's built-in rate limiting) — noted as a known limitation, not silently fixed. |
| **Job aggregation / scheduled refresh** | One refresh cycle hits ~22 external boards in parallel, then batches DB writes — this is the heaviest single operation in the app, but it's a scheduled background job, not a per-request path, so it doesn't scale with request rate | No change needed — this runs on a timer, not per-user-request. |

Net: 100 req/min needs the pooled DB connection string as the one non-negotiable check; everything else in the stack already scales horizontally by default because it's stateless serverless functions talking to a managed Postgres.

---

## Local setup

Use this to develop, test changes, or just run Job Pilot for yourself without deploying anywhere.

### 1. Prerequisites

- Node.js 20 or newer
- A Postgres database. The easiest option is a free [Neon](https://neon.tech) project — click "Create a project," copy the connection string it gives you, done. (SQLite is not used here because the app needs it available consistently for the scheduler.)
- A [Gemini API key](https://aistudio.google.com/apikey) (free tier is fine to start).

### 2. Install dependencies

```bash
npm install
```

### 3. Configure environment variables

```bash
cp .env.example .env
```

Open `.env` and fill in:

```
DATABASE_URL="postgresql://user:password@host/dbname?sslmode=require"
GEMINI_API_KEY="your-gemini-api-key-here"
AUTH_SECRET="a-random-64-character-string"
CRON_SECRET=""
GOOGLE_CLIENT_ID=""
GOOGLE_CLIENT_SECRET=""
```

- `DATABASE_URL` — your Neon (or other Postgres) connection string. Use the **pooled** one (hostname contains `-pooler`) — see the scaling note above.
- `GEMINI_API_KEY` — from Google AI Studio. This is the shared fallback key; users can also bring their own Gemini/OpenAI/Anthropic key in Profile.
- `AUTH_SECRET` — signs both the access-token and OAuth-state JWTs. Generate one with:
  ```bash
  node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
  ```
- `CRON_SECRET` — leave blank for local use. It's only needed if you expose `/api/cron/run` publicly (see the Vercel section).
- `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` — optional; only needed for the Gmail auto-status-detection feature (Profile → "Auto-detect replies"). Leave blank to disable it (the connect button will show a clear "not configured" error instead of crashing). To set it up:
  1. Go to [Google Cloud Console](https://console.cloud.google.com/) → create a project (or use an existing one).
  2. **APIs & Services → Library** → enable the **Gmail API**.
  3. **APIs & Services → OAuth consent screen** → set it up (External user type is fine for testing; add your own Google account as a test user while the app is unverified).
  4. **APIs & Services → Credentials → Create Credentials → OAuth client ID** → Application type: **Web application**.
  5. Add an **Authorized redirect URI**: `http://localhost:3000/api/gmail/callback` for local dev, and `https://your-domain.vercel.app/api/gmail/callback` for production.
  6. Copy the generated **Client ID** and **Client Secret** into `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET`.
  7. Note: while the OAuth consent screen is in "Testing" mode (the default, and fine for a personal/small deployment), only Google accounts you've explicitly added as test users can complete the connect flow — publish the app (Google's verification process) if you need it open to arbitrary users.

**Never commit `.env`.** It's already in `.gitignore`. `.env.example` is the template that's safe to commit — it has no real secrets.

### 4. Set up the database

```bash
npx prisma migrate deploy   # creates all the tables
npm run db:seed             # optional — adds a demo account + sample jobs
```

The seed script prints a demo login:
```
you@jobpilot.local / jobpilot123
```

### 5. Run it

```bash
npm run dev
```

Open **http://localhost:3000**. You'll be redirected to `/login` — either log in with the seeded demo account, or click "Create an account" to register your own.

### 6. (Optional) Automatic refresh while the server is running

If you turn on the schedule in **Profile → Automation schedule**, a background timer inside the running `npm run dev` / `npm start` process checks every minute and refreshes jobs at the times you picked (IST). This only works while the process is alive — closing the terminal stops it. For "always on" scheduling, see the Vercel Cron section below.

---

## Deploying to Vercel

This puts the app on the internet with a public URL, so multiple people can register and use it.

### 1. Push to GitHub

```bash
git push -u origin <your-branch>
```

Then go to [vercel.com/new](https://vercel.com/new) and import the repository.

### 2. Add environment variables

In **Project Settings → Environment Variables**, add the same variables as local:

| Variable | Value |
|---|---|
| `DATABASE_URL` | Your Neon (or other Postgres) connection string |
| `GEMINI_API_KEY` | Your Gemini API key |
| `AUTH_SECRET` | A random 64-character string (generate a **new one** for production — don't reuse your local dev secret) |
| `CRON_SECRET` | A random string — this protects the scheduled-refresh endpoint from being called by strangers |
| `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` | Optional — only if you want the Gmail auto-status-detection feature live in production. Remember to add the production callback URL as an authorized redirect URI in the Google Cloud OAuth client (see Local setup above). |

### 3. Apply migrations to the production database

Do this once, from your own machine, pointed at the **production** `DATABASE_URL`:

```bash
npx prisma migrate deploy
npm run db:seed   # optional — only if you want the demo account there too
```

### 4. Deploy

You have two options here — pick one:

- **Vercel's own Git integration** (simplest): once you've imported the repo in step 1, Vercel auto-builds and deploys on every push, with zero extra setup. `npm run postinstall` runs `prisma generate` automatically.
- **GitHub Actions pipeline** (this repo already has one): gives you a visible build/deploy log in the GitHub "Actions" tab, a build check on every pull request, and automatic **preview deployments** for PRs before they merge. Set this up as follows.

#### Setting up the GitHub Actions pipeline

The workflow file is already in the repo at [`.github/workflows/deploy.yml`](../.github/workflows/deploy.yml). It:
- Runs `npm run build` on every push and pull request, as a fast sanity check.
- Deploys a **preview** URL for every pull request.
- Deploys to **production** automatically whenever `main` is pushed.

It needs three secrets from Vercel, added to **GitHub → your repo → Settings → Secrets and variables → Actions**:

| Secret | How to get it |
|---|---|
| `VERCEL_TOKEN` | [vercel.com/account/tokens](https://vercel.com/account/tokens) → Create Token. Treat this like a password. |
| `VERCEL_ORG_ID` | Run `npx vercel link` once from the project folder on your machine (log in when prompted, select/create the project) — this writes `.vercel/project.json`, which contains `orgId`. |
| `VERCEL_PROJECT_ID` | Same file as above, `projectId`. |

`.vercel/` is gitignored on purpose — those IDs aren't exactly secret, but they shouldn't be committed as a matter of convention. You only need to run `vercel link` once, locally, to read the two IDs out of the generated file; you don't need to keep using the Vercel CLI after that.

Once the three secrets are set, either:
- **If you're also using Vercel's own Git integration**, disable it for this project (Vercel Project Settings → Git → disconnect) so you don't get double deploys — let the GitHub Actions pipeline be the only thing deploying.
- **If you skip Vercel's Git integration entirely** and rely only on the pipeline, that's the intended setup — just make sure the project exists in Vercel (via `vercel link`, which creates it if needed) and the environment variables from step 2 are set on it.

Push to `main` and check the **Actions** tab on GitHub to watch it build and deploy.

### 5. Set up Vercel Cron for automatic daily refresh

Vercel's servers are serverless — nothing stays running in the background the way the local `npm run dev` process does, so the in-app scheduler doesn't apply here. Instead, use **Vercel Cron** to call `/api/cron/run` on a schedule.

Create `vercel.json` in the project root:

```json
{
  "crons": [
    { "path": "/api/cron/run", "schedule": "30 3 * * *" }
  ]
}
```

Vercel Cron schedules always run in UTC. `30 3 * * *` is 3:30 AM UTC, which is **9:00 AM IST** — a reasonable "morning refresh" time.

> **Hobby plan limit.** Vercel's free Hobby tier allows **at most one cron run per day**, and it only guarantees the run happens sometime within the hour it's scheduled for (not the exact minute). An expression like `0 */6 * * *` (every 6 hours) will be **rejected** on Hobby — you'll see an error like *"Hobby accounts are limited to daily cron jobs."* Stick to one `crons` entry with a daily schedule (`X X * * *`) unless you're on **Vercel Pro**, which unlocks multiple daily runs and exact-time execution — at which point you can add more entries (e.g. `0 9,14,19 * * *` for three fixed UTC hours) to more closely match a user's chosen IST times.

Vercel automatically sends `Authorization: Bearer <value>` on every cron-triggered request, using whatever you've set the `CRON_SECRET` environment variable to — no extra configuration needed beyond setting that variable in step 2. `/api/cron/run` checks the header against it and rejects anything that doesn't match, so the endpoint stays safe even though it's publicly reachable.

`/api/cron/run` refreshes the shared job pool once and then re-scores it for **every user** who has "Automation schedule" turned on in their Profile — so one cron job serves everyone.

> **Note on the two schedulers.** They work differently:
> - **Local** (`npm run dev`/`npm start`): a timer inside the running process checks every minute and fires exactly at each user's chosen IST times (e.g. 09:00, 14:00, 19:00) — no plan limits apply since nothing runs through Vercel's cron system.
> - **Vercel**: there's no long-running process to host that timer, so a `vercel.json` cron entry fires on its own schedule instead — on Hobby, that's once a day, ignoring each user's specific HH:MM times and just re-running for everyone with the toggle on. Upgrade to Pro if you need it closer to multiple specific times per day.

### 6. Done

Visit your `*.vercel.app` URL, register an account, and start using it. Anyone who registers gets their own private profile, queue, and tracker — job listings themselves are shared across all users (they're public job postings, after all), but everyone's matches and applications stay separate.

---

## Troubleshooting

- **"Unauthorized" on every page** — your session cookie didn't get set. Check that `AUTH_SECRET` is set and hasn't changed since you logged in (changing it invalidates all existing sessions).
- **Job refresh is slow / times out on Vercel Hobby** — Vercel's Hobby plan caps serverless functions at ~10 seconds. A refresh across many job boards can take longer. Either reduce the number of active boards in **Profile → Job boards**, or upgrade to Vercel Pro (60s+ function limit — already configured via `maxDuration` on the cron route).
- **Gemini tailoring fails with a 404 about a model** — Google occasionally retires model names. Check `src/lib/ai/gemini.ts` and swap `GEMINI_MODEL` to a current one (see available models for your key at `https://generativelanguage.googleapis.com/v1beta/models?key=YOUR_KEY`).
