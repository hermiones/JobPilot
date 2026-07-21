PRD: JobBlast — High-Volume Job Application Assistant
1. Summary
JobBlast helps a job seeker apply to ~50 relevant jobs/day by combining job aggregation, AI-tailored resume/cover-letter generation, and a fast review-and-submit workflow — without violating job board terms of service or spamming employers with generic copies.
Core assumption (please confirm/adjust): This is a semi-automated tool. The app never logs into LinkedIn/Indeed on the user's behalf or auto-submits without a human click. It automates the slow parts (finding jobs, tailoring documents, tracking status) and leaves a single "Apply" click per job so submission stays compliant and the user stays in control.
2. Problem Statement
Manually applying to 50 jobs/day is impossible because each application requires: finding the listing, reading the JD, tailoring a resume/cover letter, filling the form, and tracking status. Job seekers either burn hours per application or spam identical resumes that get filtered by ATS keyword matching.
3. Goals
Cut time-per-application from ~15 min to <2 min
Maintain per-job tailoring (keywords, tone) to survive ATS screening
Track every application's status in one place (no spreadsheet)
Surface only relevant, non-duplicate, non-expired listings
Non-Goals (v1)
No fully unattended auto-submit / bot login to third-party sites
No email/LinkedIn scraping that violates platform ToS
No guarantee of interview/offer outcomes
4. Target User
Active job seeker doing a high-volume search (e.g., post-layoff, career switch, new grad) applying across multiple platforms daily.
5. Core User Flow
User sets up profile once: master resume, 2–3 cover letter tones, target roles, locations, salary floor, excluded companies.
App pulls new matching listings daily from job board APIs / RSS feeds.
For each listing, app scores relevance (keyword + title + seniority match) and shows a ranked queue.
User taps a card → sees JD + AI-tailored resume bullets + AI-drafted cover letter (editable).
User clicks "Approve & Open" → app opens the job's real application page in a new tab with the tailored resume/cover letter ready to paste/upload; user does the final click on the employer's site.
App logs the application (company, role, date, documents used, status = Applied).
Dashboard shows daily count toward the 50/day goal, funnel (Applied → Response → Interview → Offer/Reject), and follow-up reminders (e.g., nudge at day 7 with no response).
6. Feature List (v1 / MVP)
Feature
Description
Priority
Job aggregation
Pull listings via official APIs/RSS (e.g., Greenhouse, Lever, RemoteOK, Adzuna API) — no scraping sites that forbid it
P0
Relevance scoring
Simple keyword/title/seniority match against user profile
P0
AI resume tailoring
Rewrite bullet order/wording per JD using an LLM, from one master resume
P0
AI cover letter draft
Generate short, JD-specific cover letter from template + user tone
P0
Review & approve UI
Fast keyboard-driven review screen (swipe/approve/skip)
P0
Application tracker
Status pipeline, notes, dates, document version used
P0
Daily goal dashboard
Progress bar toward daily target, streaks
P1
Follow-up reminders
Auto-flag applications with no response after N days
P1
Duplicate detection
Prevent re-applying to same company/role
P1
Export
CSV export of application log
P2
Browser extension
Autofill helper for ATS forms (Workday, Greenhouse) using stored profile data — user still clicks submit
P2
7. Data Model (high-level)
User
 - id, email, master_resume, cover_letter_templates[], target_roles[], target_locations[], salary_floor, excluded_companies[]
JobListing
 - id, source, title, company, location, url, description, posted_date, salary_range, fetched_at
Application
 - id, user_id, job_listing_id, status (queued|approved|applied|responded|interview|rejected|offer)
 - resume_version, cover_letter_version, applied_at, last_updated, notes, follow_up_date
Match
 - id, user_id, job_listing_id, relevance_score, reasons[]
8. Tech Stack (Replit-friendly)
Frontend: React + Tailwind CSS (single-page dashboard + review queue)
Backend: Node.js/Express or Next.js API routes
Database: Replit DB or Postgres (Supabase/Neon) for structured data
AI: Anthropic API (Claude) for resume tailoring + cover letter generation
Job data sources: Public/official APIs only — Greenhouse Job Board API, Lever Postings API, RemoteOK API, Adzuna API (all allow programmatic access)
Auth: Simple email/password or magic link (single-user tool, no need for OAuth complexity in v1)
Scheduling: Cron job (daily) to refresh listings
9. Non-Functional Requirements
Daily job fetch completes in <2 min for ~500 listings scanned
AI tailoring response <10 sec per job
All third-party API calls respect rate limits and published ToS
User's resume/personal data never sent to third parties beyond the LLM call itself
10. Success Metrics
Median time per application ≤ 2 minutes
≥40 applications/day sustained by an active user
≥30% of listings shown are marked "relevant" by user (proxy for scoring quality)
11. Risks / Open Questions
ToS risk: Any job board without a public API (most consumer job boards) cannot be scraped for listings — v1 scope limited to sources with official APIs/feeds.
Application quality vs. volume: Tailoring quality may degrade if AI over-optimizes for speed; needs a quick "diff view" so user can sanity-check before sending.
Duplicate/stale listings: Aggregators often re-list the same job — need company+title fuzzy matching.
Scope decision needed: Should v2 include the browser-extension autofill for ATS forms (Workday/Greenhouse), or stay purely a tracker + doc generator? This changes engineering complexity significantly.
12. Suggested Build Order for Replit
Data model + basic CRUD (profile, job listings, applications) with mock data
Job aggregation from 1–2 real API sources
Relevance scoring (simple weighted keyword match)
Claude API integration for resume/cover letter tailoring
Review & approve UI + daily goal dashboard
Application tracker with status pipeline
Follow-up reminders + duplicate detection
