# Deployment Guide

Two setups: running it on your own machine (Local), and putting it on the internet so anyone can sign up and use it (Vercel). Follow whichever one you need — you don't have to do both.

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
```

- `DATABASE_URL` — your Neon (or other Postgres) connection string.
- `GEMINI_API_KEY` — from Google AI Studio.
- `AUTH_SECRET` — signs login session cookies. Generate one with:
  ```bash
  node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
  ```
- `CRON_SECRET` — leave blank for local use. It's only needed if you expose `/api/cron/run` publicly (see the Vercel section).

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
