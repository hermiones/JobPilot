# Roadmap & Vision

## Where things actually stand (v1 scope)

Job Pilot today is a **single-tenant-feeling, multi-user SaaS** for high-volume job applying: real job aggregation (Greenhouse/Lever/RemoteOK, 22 boards), deterministic relevance scoring, AI cover-letter generation (BYOK across 3 providers), A/B/C cover-letter testing, a fast "Easy Apply" lane, a Free/Pro plan with three no-payment unlock paths (manual toggle, referral, first-application), an admin analytics panel, and a real (if lightweight) security posture — rate limiting, revocable refresh tokens, IDOR/XSS/SQLi verified against the live app.

**What v1 explicitly is not**: it does not auto-submit applications on third-party sites, it has no employer/recruiter-facing product, and it has no real payment processor. Those are the three biggest gaps between "working app" and "real product with a business," and they're each substantial enough to warrant a deliberate build, not a bolt-on.

### v1 "done" definition

| Area | Status |
|---|---|
| Job aggregation (real sources, no scraping) | ✅ Done |
| Deterministic scoring + dedupe | ✅ Done |
| AI cover letters (multi-provider, A/B/C) | ✅ Done |
| Review Queue + Easy Apply | ✅ Done |
| Tracker + funnel + follow-ups | ✅ Done |
| Multi-user auth (rate-limited, refresh tokens) | ✅ Done |
| Free/Pro plan gating (no real billing yet) | ✅ Done |
| Admin analytics panel | ✅ Done |
| Security pass (IDOR/XSS/SQLi verified, deps patched) | ✅ Done |
| Real Stripe billing | ❌ Not started — needs your Stripe keys |
| Employer/recruiter platform | ❌ Not started — separate product surface |
| Real form-fill auto-submit | ❌ Not started — high effort, fragile, ToS-gray |

**Realistic v1 "ready to show real users" date: 2 weeks from today (2026-08-09)** — assuming that window is spent on: real Stripe billing (3–4 days), a short closed beta with 5–10 real job seekers to shake out UX rough edges (4–5 days), and fixing whatever that beta surfaces (remaining days). Everything currently built is functional and tested at the code level; what it hasn't had is real users clicking through it blind.

---

## 3-month vision

**Month 1 (weeks 1–4): Monetize what exists.**
- Wire real Stripe Checkout + webhooks for the Pro plan (replaces the referral/first-application unlock hacks with actual recurring revenue).
- Closed beta with real users; fix whatever breaks.
- Email-based status auto-detection (Gmail API read access) — auto-flag "responded"/"interview" from real inbox activity instead of manual status updates. High leverage, borrowed from the competitor analysis below.
- Profile completeness score/nudges (borrowed from Naukri) — cheap, improves scoring quality as a side effect.

**Month 2 (weeks 5–8): Employer-side v0.**
- Minimal employer account type + a job-posting form (paid listing or free during a launch period — business decision, not a technical one).
- Basic applicant view for employers (who applied, their cover letter, contact info) — this is the actual B2B revenue surface, distinct from the B2C Pro plan.
- Decide and scope: semantic/embedding-based matching as a v2 scoring layer (catches "ML Engineer" vs "AI Engineer" style near-misses that keyword scoring misses).

**Month 3 (weeks 9–12): Depth and retention.**
- Real form auto-fill for a small set of high-volume ATS platforms (Greenhouse's own apply form, specifically, since it's already the biggest data source) — narrowly scoped, not "auto-apply everywhere."
- Push notifications (service worker + subscription storage) for follow-up reminders and new high-score matches.
- Recruiter search: let employers search the coding-profile links (LeetCode/GitHub) and resume data that's already being collected but has no consumer yet.

This is a plan, not a commitment — each month's scope should be re-cut based on what real users actually ask for during the prior month's beta.

---

## Feature tracking vs. the market

| Feature | Job Pilot | Naukri | Indeed | Instahyre | kalpthakkar/JobPilot-AI (competitor) |
|---|---|---|---|---|---|
| Public-API job aggregation | ✅ | — (own listings) | — (own listings) | — (own listings) | ✅ (similar approach) |
| Deterministic relevance scoring | ✅ | Partial | Partial | ✅ (recruiter-facing match %) | ❌ |
| AI cover letter generation | ✅ (3 providers, A/B/C) | ❌ | ❌ | ❌ | ✅ (single LLM) |
| AI resume rewriting | ❌ (removed by design) | ❌ | ❌ | ❌ | ❌ (data extraction only) |
| Real form auto-submit | ❌ | N/A | N/A | N/A | ✅ (Selenium) |
| Email-based status tracking | ❌ (planned M1) | ❌ | ❌ | ❌ | ✅ (Gmail API) |
| Employer/recruiter product | ❌ (planned M2) | ✅ | ✅ | ✅ | ❌ |
| Resume database / recruiter search | ❌ (planned M2/M3) | ✅ | Partial | ✅ | ❌ |
| Referral-based free upgrade | ✅ | ❌ | ❌ | ❌ | ❌ |
| Admin analytics panel | ✅ | N/A (internal) | N/A | N/A | ❌ |
| Multi-theme UI | ✅ | ❌ | ❌ | ❌ | ❌ |

The honest reading of this table: Job Pilot is currently strongest on the **candidate-side AI tailoring and analytics** and weakest on **the two things that make a job board a two-sided marketplace** (employer product, real auto-submission) — which tracks with it having grown organically from a personal tool into a SaaS shape rather than being planned as a marketplace from day one.
