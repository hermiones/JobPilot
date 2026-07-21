# How Job Pilot Works (Plain-English Guide)

This document explains what happens under the hood, in everyday language — no prior knowledge of the codebase assumed. Each section answers one question: "where does X actually happen?"

---

## 1. Where do the jobs come from?

Job Pilot does **not** scrape LinkedIn, Indeed, or any site that forbids it. It only calls **public, official APIs** that companies themselves publish:

| Source | What it is | File |
|---|---|---|
| **Greenhouse** | Many companies use "Greenhouse" software to host their careers page. Greenhouse offers a public API — anyone can ask "show me all of company X's open jobs" without logging in. | [`src/lib/jobSources/greenhouse.ts`](../src/lib/jobSources/greenhouse.ts) |
| **Lever** | Same idea as Greenhouse, different company/software. | [`src/lib/jobSources/lever.ts`](../src/lib/jobSources/lever.ts) |
| **RemoteOK** | A job board that publishes one big public list of remote jobs from many companies at once. | [`src/lib/jobSources/remoteok.ts`](../src/lib/jobSources/remoteok.ts) |

**The catch:** Greenhouse and Lever don't let you ask "show me every job everywhere" — you have to ask company-by-company (e.g. "show me Stripe's jobs," "show me Groww's jobs"). So Job Pilot keeps a list of company names to ask, called **boards**, stored in the `Board` table.

### How does Job Pilot know which companies to ask?

This is **auto-discovery** ([`src/lib/jobSources/discovery.ts`](../src/lib/jobSources/discovery.ts)). Since there's no "list every company" button, Job Pilot instead:

1. Takes a candidate company name (either from a built-in starter list, or one you type in on the Profile page).
2. "Knocks on the door" of both Greenhouse's and Lever's APIs for that name — literally just tries the URL and sees if it responds with real job data.
3. If one of them answers, that company gets saved as an active **board**. If neither answers, it's reported as "not found."

You can add or remove boards any time from **Profile → Job boards**. Only *active* boards get fetched.

### Putting it together — a "refresh"

When you click **Refresh jobs** (or the scheduler runs), Job Pilot:
1. Asks every active Greenhouse/Lever board, plus RemoteOK, for their current job list — all at once, in parallel.
2. Saves every listing into one shared `JobListing` table. "Shared" means every user of the app sees the same pool of raw listings — makes sense, since these are public job postings, not private data.
3. If a listing already exists (same company + same job ID), it's updated in place rather than duplicated.

---

## 2. How does it decide which jobs are relevant to *you*?

This is **scoring**, in [`src/lib/scoring.ts`](../src/lib/scoring.ts). It's a plain point system — no AI involved here, just simple rules, so it's fast and predictable:

| What it checks | Points | Example |
|---|---|---|
| Does the job title match one of your target roles? | up to 45 | You want "Software Engineer," the job is titled "Senior Software Engineer" → strong match |
| Does the job description mention skills from your resume? | up to 30 | Your resume says "React, TypeScript" and the job description says "React, TypeScript" → points for each overlapping skill |
| Does the location match what you want? | up to 15 | You want "Remote," the job says "Remote (India)" → match |
| Does the seniority level match? | up to 10 | You're looking for "Senior" roles, the job title says "Senior" → match |
| Does the salary meet your floor? | +5 or −10 | You set a ₹20,00,000 floor; a ₹35,00,000 job gets a small bonus, a ₹8,00,000 job gets penalized |

Everything adds up to a score from 0–100. Anything you've listed as an **excluded company** gets a hard 0, no matter what.

Every job also gets a plain-English list of **reasons** (e.g. "Title matches target role", "3 resume keywords in JD") so you can see *why* it scored the way it did — this shows up as little tags on each card in the Review Queue.

Jobs scoring **25 or higher** (the default threshold) get automatically added to your review queue as a new "queued" application.

### Duplicate detection

Aggregators (and even the same company posting to multiple boards) sometimes list the same job twice with slightly different wording. [`src/lib/dedupe.ts`](../src/lib/dedupe.ts) compares company + title using a "how different are these two strings" measure (called Levenshtein distance — basically counts the minimum number of letter changes to turn one string into the other). If a job is 90%+ similar to one you've already acted on, it's skipped instead of cluttering your queue again.

---

## 3. How does the AI tailoring work?

This is **Gemini** (Google's AI model), in [`src/lib/ai/tailor.ts`](../src/lib/ai/tailor.ts). When you click "Generate with AI" on a job in the Review Queue:

1. Job Pilot sends Gemini a prompt containing: your master resume (the one you pasted in Profile), the job title, company, and full job description.
2. Gemini is instructed to **only reorder and reword what's already true** in your resume — it's told never to invent skills, employers, or experience you don't have.
3. Gemini sends back:
   - 4–6 tailored resume bullet points, reordered to lead with what matters most for *this* job
   - A list of keywords from the job description that you genuinely have (useful for beating automated resume scanners)
   - A short, JD-specific cover letter in the tone you picked (e.g. "professional" or "enthusiastic")
4. You can edit any of this before using it — nothing is sent to the employer automatically.

The generated text is saved on the application record so it's still there if you come back to it later.

---

## 4. What happens when you click "Approve & Open"?

Job Pilot **never submits anything on your behalf.** Clicking this button:
1. Marks the application as "applied" in your tracker (and records today's date).
2. Automatically sets a follow-up reminder for **7 days later**.
3. Opens the employer's real job posting page in a new browser tab.

You then paste in your tailored resume/cover letter and click the employer's own "Submit" button yourself. This keeps everything compliant with each job board's terms of service — the app speeds up the tedious parts (finding, reading, tailoring) but the final submission is always a deliberate human action.

---

## 5. How does the scheduler work?

You can turn on **Automation** in Profile and pick times of day (in IST — India Standard Time) for Job Pilot to refresh and re-score jobs automatically, without you lifting a finger.

There are two different mechanisms depending on how you're running the app — see [`docs/DEPLOYMENT.md`](DEPLOYMENT.md) for exact setup:

- **Running locally** ([`src/lib/scheduler.ts`](../src/lib/scheduler.ts)): while the app's server process is running, a timer checks every minute — "is it 9:00 AM IST right now, and does any user want a refresh at 9:00 AM?" — and if so, runs the refresh for them.
- **Deployed on Vercel** ([`src/app/api/cron/run/route.ts`](../src/app/api/cron/run/route.ts)): Vercel doesn't keep a process running in the background, so instead an external "Vercel Cron" trigger calls this one URL on its own schedule (e.g. every 6 hours), and it refreshes + re-scores for every user who has automation turned on.

Either way, the shared job pool (step 1, "where do jobs come from") is only fetched **once per run**, then scored separately for each user — since the raw job listings are the same for everyone, only your personal matches differ.

---

## 6. How does login work, and is my data private from other users?

Job Pilot supports multiple people using the same deployed app, each with their own private account:

- **Passwords** are never stored in plain text — they go through a one-way scrambling function called **bcrypt** ([`src/lib/auth/password.ts`](../src/lib/auth/password.ts)) before being saved. Even if the database were leaked, the original passwords couldn't be recovered from it.
- **Sessions**: after you log in, the server gives your browser a small signed token (a cookie) that proves who you are on future requests — this is checked by [`src/lib/auth/session.ts`](../src/lib/auth/session.ts) and a gatekeeper file called [`src/proxy.ts`](../src/proxy.ts) that runs before every page/API request and redirects you to `/login` if you're not signed in.
- **Data separation**: your resume, target roles, applications, and tracker are all tagged with your account's unique ID in the database. Every API route checks that ID before returning or changing anything, so one user can never see or affect another user's data — even though everyone shares the same pool of public job listings.

---

## 7. The data model, in one paragraph

There are five kinds of records in the database:
- **User** — your account: login info, resume, target roles, salary floor, schedule preferences.
- **JobListing** — a single job posting, shared by everyone (pulled from Greenhouse/Lever/RemoteOK).
- **Match** — one user's relevance score + reasons for one job listing.
- **Application** — one user's tracked status for one job (queued → applied → interview → offer/rejected, etc.), plus any tailored resume/cover letter and attached files for that specific application.
- **Board** — a company name Job Pilot knows to ask Greenhouse/Lever for jobs from.

Everything else in the app (the dashboard numbers, the review queue, the tracker table) is just a different view over these five tables.
