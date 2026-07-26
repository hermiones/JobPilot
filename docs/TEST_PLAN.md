# Job Pilot — Test Plan

This is a test **plan**: what to test and how. It is not a report of tests already executed — the Functional and UI/UX suites below have not been run, and no pass/fail counts are claimed for them. The Security section is the one exception: those specific checks were run live against the dev server this session and are marked accordingly.

Grounded in the real codebase as of this writing: `src/app/api/**/route.ts` (25 routes), `prisma/schema.prisma`, `src/proxy.ts`, `src/lib/plan.ts`, `src/lib/theme.ts`, `docs/HOW_IT_WORKS.md`, `docs/PRD.md`.

## 0. Product shape (why the roles/flows below look the way they do)

Job Pilot has **no employer/recruiter side**. There is no job-posting flow, no payments/billing, no resume search by companies. Job listings are pulled read-only from public Greenhouse/Lever/RemoteOK APIs into one shared `JobListing` table; every other table is scoped per-user. Wherever a generic SDET template would ask for "Employer posts a job" or "Recruiter searches resumes" or "Payment checkout," this plan marks it **N/A — not part of current product** instead of inventing fictional coverage.

Real roles:
| Role | Definition |
|---|---|
| Guest | No session cookie |
| User — Free | `plan = "free"` |
| User — Pro | `plan = "pro"` (unlocked via referral, first-application auto-upgrade, or the manual profile toggle — no payment processor exists) |
| Admin | `isAdmin = true` (also just a User underneath — no separate account type) |

Real critical flows: register/login (rate-limited, refresh-token session), profile/resume setup, job aggregation + deterministic scoring, review queue, AI cover-letter generation (Gemini/OpenAI/Anthropic, BYO or shared key), A/B/C variants (Pro-gated), Easy Apply (single + bulk, 20-cap bulk-with-cover-letter), application tracker/status funnel, referral-to-Pro, first-application-to-Pro, auto-approve scheduler (status-only, Pro), admin panel (aggregate analytics, feedback inbox, board management), feedback widget, PDF export (Pro-gated), coding-profile links (stored only, unconsumed), CSV export, 6-theme system.

---

## 1. Smoke Suite (14 cases)

Make-or-break only — if any of these fail, the build should not ship.

| ID | Type | Module | Title | Preconditions | Steps | Expected | Priority | Automatable |
|---|---|---|---|---|---|---|---|---|
| SMK-01 | Functional | Auth | Register creates account and session | Guest, unique email | POST `/api/auth/register` with valid email/password | 200, session cookie set, user auto-logged-in | P0 | Y |
| SMK-02 | Functional | Auth | Login with valid credentials | Registered user | POST `/api/auth/login` | 200, session cookie set | P0 | Y |
| SMK-03 | Functional | Auth | `/api/auth/me` reflects session | Logged in | GET `/api/auth/me` | 200, correct `id`/`email`/`isAdmin` | P0 | Y |
| SMK-04 | Functional | Profile | Save master resume + target roles | Logged in | PUT `/api/profile` with `masterResume`, `targetRoles` | 200, fields persisted | P0 | Y |
| SMK-05 | Functional | Jobs | Refresh pulls listings into shared pool | Logged in, boards active | POST `/api/jobs/refresh` | 200, `JobListing` rows created/updated | P0 | N (external API dependency — smoke via mocked fixture) |
| SMK-06 | Functional | Scoring | Rescore queues matches above threshold | Profile + fresh listings exist | POST `/api/matches/rescore` | 200, `Match` rows created, `Application` rows created for score ≥ 10 | P0 | Y |
| SMK-07 | Functional | Queue | Review queue lists ranked matches | Queued applications exist | GET `/api/queue` | 200, items sorted by `relevanceScore` desc | P0 | Y |
| SMK-08 | Functional | Tailor | Generate cover letter (variant A) | Master resume set, application queued | POST `/api/tailor` `{applicationId}` | 200, cover letter text returned, variant A saved | P0 | N (real AI call — smoke via provider stub) |
| SMK-09 | Functional | Applications | Approve & mark applied | Queued application | PATCH `/api/applications/[id]` `{status:"applied"}` | 200, `appliedAt` set, `followUpDate` = +7d | P0 | Y |
| SMK-10 | Functional | Easy Apply | Single quick-apply | Queued application exists | Click ⚡ Apply on `/easy-apply` | Status → applied, job URL opens in new tab | P0 | Y (API) / N (tab-open, manual) |
| SMK-11 | Functional | Tracker | Applications list reflects status funnel | Mixed-status applications exist | GET `/api/applications` | 200, `counts` per status accurate | P0 | Y |
| SMK-12 | Security | Auth | Session survives access-token expiry via refresh | Logged in, access token near/at expiry | Background call to `/api/auth/refresh` | 200 `{ok:true}`, new access token minted, no forced logout | P0 | Y |
| SMK-13 | Security | Auth | Cross-user data isolation | Two users, User B has an application | User A requests `/api/applications/[B's id]` | 404 (not exposed as another user's data) | P0 | Y |
| SMK-14 | Functional | Admin | Non-admin blocked from admin insights | Logged in as non-admin | GET `/api/admin/insights` | 403 Forbidden | P0 | Y |

---

## 2. Sanity Suite — recently changed modules

Targets: A/B/C variants, Easy Apply, admin panel, referral, auto-approve, refresh tokens, themes/API-key management (per the most recent commits: "Add API key management and support for multiple AI providers," "Refactor resume processing... enhance ProfileForm").

| ID | Type | Module | Title | Preconditions | Steps | Expected | Priority | Automatable |
|---|---|---|---|---|---|---|---|---|
| SAN-01 | Functional | Variants | Free plan capped at 1 variant | Free user, application exists | POST `/api/tailor/variants` twice | 2nd call: 403 "Upgrade to Pro to generate A/B resume variants" | P0 | Y |
| SAN-02 | Functional | Variants | Pro plan can generate B and C | Pro user, variant A exists | POST `/api/tailor/variants` x2 | Both succeed, labels "B" then "C" assigned in order | P0 | Y |
| SAN-03 | Functional | Variants | 4th variant attempt blocked even for Pro | Pro user, A/B/C all exist | POST `/api/tailor/variants` | 403 "No more variant slots available" | P1 | Y |
| SAN-04 | Functional | Variants | Selecting a variant updates active resume/cover letter | 2+ variants exist | POST `/api/tailor/select` `{applicationId, variantId}` | 200, `resumeVersion`/`coverLetterVersion` match selected variant | P0 | Y |
| SAN-05 | Functional | Variants | Applied variant label freezes at apply time | Variant B selected, then applied | PATCH status → applied, then select variant C | `appliedVariantLabel` stays "B" after the swap | P0 | Y |
| SAN-06 | Functional | Easy Apply | Bulk apply respects 20-job cover-letter cap | 25 queued jobs selected with cover-letter toggle on | Trigger bulk apply with cover letters | Only first 20 get AI-tailored letters per batch (UI-enforced) | P1 | N (UI-level batching, manual + Playwright) |
| SAN-07 | Functional | Easy Apply | Bulk apply only updates caller's own, unapplied rows | `ids` list includes another user's application id and an already-applied id | POST `/api/applications/bulk-apply` | Only own not-yet-applied rows counted in `applied`; foreign/applied ids silently ignored (no error, no leak) | P0 | Y |
| SAN-08 | Functional | Admin | Board toggle requires admin | Non-admin session | PATCH `/api/boards` `{id, active:false}` | 403 Forbidden | P0 | Y |
| SAN-09 | Functional | Admin | Board discovery is admin-only and rejects >50 custom slugs silently capped | Admin session, 60-item `slugs` array | POST `/api/boards/discover` | Only first 50 probed (`MAX_CUSTOM_SLUGS`), 200 response | P1 | Y |
| SAN-10 | Functional | Admin | Insights numbers are aggregate-only, no per-user PII | Admin session, multiple users w/ data | GET `/api/admin/insights` | Response contains only counts/aggregates — no email, no resume text, no other user's application detail | P0 | Y |
| SAN-11 | Functional | Referral | 3rd successful referred signup auto-upgrades referrer to Pro | Referrer has 2 prior referred signups | Register 3rd user with `?ref=<code>` | Referrer's `plan` becomes "pro" server-side; new user unaffected | P0 | Y |
| SAN-12 | Functional | Referral | Referral count only counts real signups through the link | Referrer has referral code | Register a user with garbage `ref` value | 200 (registration still succeeds), no upgrade triggered, `findUserByReferralCode` returns null gracefully | P1 | Y |
| SAN-13 | Functional | Auto-approve | Free-plan user cannot enable auto-approve via crafted request | Free user | PUT `/api/profile` `{autoApproveEnabled:true}` (plan not changed in same call) | 200, but `autoApproveEnabled` persisted as `false` (server re-derives from effective plan) | P0 | Y |
| SAN-14 | Functional | Auto-approve | Auto-approve only changes status, never opens/submits externally | Pro user, auto-approve on, cron run triggers | POST `/api/cron/run` with valid `CRON_SECRET` | Top matches move queued→approved; no outbound POST to any employer URL; `appliedAt` NOT set | P0 | N (needs pipeline harness) |
| SAN-15 | Functional | Auto-approve | min/max bounds are clamped server-side | Pro user | PUT `/api/profile` `{autoApproveMinScore:500, autoApproveMaxPerRun:0}` | Persisted as `100` and `1` respectively (clamped, not rejected) | P1 | Y |
| SAN-16 | Security | Cron | `/api/cron/run` rejects missing/wrong bearer token | `CRON_SECRET` set in env | GET or POST without `Authorization` header, then with wrong value | 401 both times | P0 | Y |
| SAN-17 | Functional | Refresh tokens | Logout revokes refresh token server-side | Logged in, refresh token issued | POST `/api/auth/logout`, then POST `/api/auth/refresh` with old cookie | Refresh fails 401 (token revoked in `RefreshToken` table, not just cookie cleared) | P0 | Y |
| SAN-18 | Functional | API keys | BYO key stored and used for preferred provider | Logged in | PUT `/api/profile` `{apiKeys:[{provider:"openai",key:"sk-..."}], preferredProvider:"openai"}` | 200, key persisted (JSON-encoded), subsequent `/api/tailor` uses OpenAI path | P1 | Y |
| SAN-19 | Functional | API keys | Malformed apiKeys entries are filtered, not rejected | Logged in | PUT `/api/profile` `{apiKeys:[{label:"x"}, {provider:"gemini",key:"abc"}]}` | 200, only the well-formed entry (with `provider` and `key` as strings) is kept | P2 | Y |
| SAN-20 | Functional | Resume processing | PDF/DOCX/TXT text extraction round-trip | Valid small PDF, DOCX, TXT fixtures | POST `/api/profile/resume-text` for each | 200, non-empty `text` for each format | P0 | Y |
| SAN-21 | Functional | Resume processing | Legacy `.doc` and unsupported types rejected with actionable message | `.doc` file, `.png` file | POST `/api/profile/resume-text` | 422 with human-readable guidance (not a raw stack trace) | P1 | Y |
| SAN-22 | UI | Theme | All 6 themes + System apply and persist | Logged in, any page | Open theme switcher, select each of System/Light/Dark/Neon/Eye Comfort/Kawaii/Formal | `data-app-theme` attribute updates, `localStorage["jobpilot:app-theme"]` persists, background 3D palette changes to match `THEME_3D_PALETTES` | P1 | N (visual, Playwright screenshot diff) |

---

## 3. Functional Suite per Role

### 3.1 Guest

| ID | Type | Module | Title | Preconditions | Steps | Expected | Priority | Automatable |
|---|---|---|---|---|---|---|---|---|
| GST-01 | Functional | Auth | Guest redirected to login on protected page | Not logged in | Visit `/dashboard` | 302 redirect to `/login?next=/dashboard` | P0 | Y |
| GST-02 | Functional | Auth | Guest hitting protected API gets 401 JSON, not redirect | Not logged in | GET `/api/dashboard` | 401 `{error:"Unauthorized"}` (JSON, not HTML redirect — per `src/proxy.ts`) | P0 | Y |
| GST-03 | Functional | Auth | Public paths accessible without session | Not logged in | Visit `/login`, `/register`, `/how-to-use` | 200, no redirect | P0 | Y |
| GST-04 | Boundary | Auth | Register — email regex boundary | Guest | POST register with `a@b.c`, `a@b`, `a@.com`, `a@b..com` | `a@b.c` → 200 (valid per `/^[^\s@]+@[^\s@]+\.[^\s@]+$/`); others → 400 | P1 | Y |
| GST-05 | Boundary | Auth | Register — password length boundary | Guest | POST register with password length 7, 8, 9 chars | 7 → 400 "at least 8 characters"; 8 and 9 → 200 | P1 | Y |
| GST-06 | Negative | Auth | Register — duplicate email rejected | Existing user's email | POST `/api/auth/register` with same email | 409 "account with this email already exists" | P0 | Y |
| GST-07 | Security | Auth | Login rate limit triggers at 9th attempt in window | Guest | POST `/api/auth/login` with wrong password 9x within 10 min, same IP+email | 9th attempt → 429 with `retryAfterSeconds` (limit is 8 per `checkRateLimit(...,8,...)`) | P0 | Y |
| GST-08 | Security | Auth | Register rate limit triggers at 11th attempt per IP/hour | Guest | POST `/api/auth/register` 11x within 1 hour, same IP | 11th → 429 (limit is 10 per hour) | P1 | Y |
| GST-09 | Negative | Auth | Login with non-existent email | Guest | POST login, unregistered email | 401 "Invalid email or password" (no user-enumeration hint) | P1 | Y |
| GST-10 | Negative | Auth | Login with correct email, wrong password | Registered user | POST login, bad password | 401, identical error message to GST-09 (no enumeration) | P1 | Y |

### 3.2 User — Free plan

| ID | Type | Module | Title | Preconditions | Steps | Expected | Priority | Automatable |
|---|---|---|---|---|---|---|---|---|
| FRE-01 | Boundary | Profile | Resume upload at exactly 5 MB boundary | Free user | POST `/api/profile/resume-text` with file at 5,242,880 bytes vs 5,242,881 bytes | ≤5MB → processed; >5MB → 413 "File too large (max 5 MB)" | P0 | Y |
| FRE-02 | Boundary | Applications | Attached resume upload at 5 MB boundary | Free user, application exists | POST `/api/applications/[id]/resume` at/over cap | Same 413 boundary behavior as FRE-01 | P0 | Y |
| FRE-03 | Boundary | Profile | Salary floor — negative and non-numeric rejected/ignored | Free user | PUT `/api/profile` `{salaryFloor:"abc"}`, `{salaryFloor:-5}` | Non-number silently ignored (field untouched); negative number accepted as-is (no server-side floor validation observed — flag as a gap, see NOTES) | P2 | Y |
| FRE-04 | Functional | Scoring | Salary floor scoring bonus/penalty | Profile with `salaryFloor` set, jobs above/below floor | POST `/api/matches/rescore` | Jobs above floor get +5, below get −10 per `scoring.ts` weights | P1 | Y |
| FRE-05 | Functional | Scoring | Excluded company forces score to 0 | Company in `excludedCompanies` | Rescore | Match score = 0 regardless of title/skill match | P0 | Y |
| FRE-06 | Functional | Scoring | Duplicate detection skips near-identical postings | Two listings, same company, 90%+ similar title | Rescore | Second listing not re-queued (per `dedupe.ts` Levenshtein threshold) | P1 | N (needs fixture pair) |
| FRE-07 | Negative | Variants | Free user blocked from 2nd variant | Free user, variant A exists | POST `/api/tailor/variants` | 403 upgrade message | P0 | Y (dup of SAN-01, kept for role-suite completeness) |
| FRE-08 | Negative | PDF export | Free user blocked from cover-letter PDF | Free user, application with cover letter | GET `/api/applications/[id]/cover-letter/pdf` | 403 "Cover letter PDF export is a Pro feature" | P0 | Y |
| FRE-09 | Negative | Schedule | Free plan capped at 1 schedule slot | Free user | PUT `/api/profile` `{scheduleTimes:["09:00","13:00","18:00"]}` | Only first 1 time persisted (`maxScheduleTimes("free") = 1`) | P0 | Y |
| FRE-10 | Boundary | Applications | Status transition to invalid value rejected | Application exists | PATCH `/api/applications/[id]` `{status:"hired"}` | 400 "Invalid status" (not in `VALID_STATUS` enum) | P1 | Y |
| FRE-11 | Functional | Tailor | Tailoring blocked without master resume | Master resume empty string | POST `/api/tailor` | 400 "Add your master resume in Profile before tailoring" | P0 | Y |
| FRE-12 | Functional | AI errors | Provider failure returns classified, actionable error | Bad/expired API key configured | POST `/api/tailor` | 502 with human-readable classification (rate limit/quota/bad key/outage), not raw stack trace | P1 | N (needs provider mock) |
| FRE-13 | Functional | Export | CSV export escapes embedded quotes/commas/newlines | Application with notes containing `,`, `"`, newline | GET `/api/export` | Cell correctly quoted/escaped per `csvCell()`, valid CSV | P1 | Y |
| FRE-14 | Functional | Feedback | Submit feedback with only rating (no message) | Free user | POST `/api/feedback` `{rating:5}` | 200, id returned | P2 | Y |
| FRE-15 | Negative | Feedback | Reject empty feedback | Free user | POST `/api/feedback` `{}` | 400 "Add a rating or a message" | P2 | Y |
| FRE-16 | Boundary | Feedback | Message truncated at 2000 chars, rating outside 1–5 ignored | Free user | POST feedback with 3000-char message, `rating:9` | Message truncated to 2000; `rating` stored as `null` (out of 1–5 range) | P2 | Y |
| FRE-17 | Negative | Coding profiles | Max 10 coding-profile links enforced | Free user | PUT `/api/profile` `{codingProfiles:[...15 entries]}` | Only first 10 persisted | P2 | Y |
| FRE-18 | Functional | Coding profiles | Stored but not consumed anywhere else in the app | Coding profile links saved | Grep UI for any scoring/matching use of `codingProfiles` | Confirmed: field is display-only on profile, not read by `scoring.ts` or `tailor.ts` — document as known limitation, not a bug | P2 | N (code audit) |

### 3.3 User — Pro plan

| ID | Type | Module | Title | Preconditions | Steps | Expected | Priority | Automatable |
|---|---|---|---|---|---|---|---|---|
| PRO-01 | Functional | Variants | Generate all 3 variants (A/B/C) with distinct tones | Pro user | POST `/api/tailor` then `/api/tailor/variants` x2 | 3 variants with tones professional/enthusiastic/concise per `VARIANT_TONES` | P0 | Y |
| PRO-02 | Functional | PDF export | Download cover-letter PDF | Pro user, application has `coverLetterVersion` | GET `/api/applications/[id]/cover-letter/pdf` | 200, `application/pdf`, correct filename with sanitized company name | P0 | Y |
| PRO-03 | Negative | PDF export | PDF export fails gracefully with no cover letter yet | Pro user, application with empty `coverLetterVersion` | GET PDF endpoint | 400 "No cover letter generated for this application yet" | P1 | Y |
| PRO-04 | Functional | Schedule | Pro plan allows up to 8 schedule slots | Pro user | PUT `/api/profile` with 9 `scheduleTimes` | Only first 8 persisted (`maxScheduleTimes("pro") = 8`) | P1 | Y |
| PRO-05 | Functional | Auto-approve | Toggle auto-approve on/off | Pro user | PUT `/api/profile` `{autoApproveEnabled:true}` | Persisted `true` (allowed because plan is pro) | P0 | Y |
| PRO-06 | Functional | Analytics | Variant response-rate reflects real status changes only | Pro user, applications with different `appliedVariantLabel`, some moved to responded/interview/offer | GET `/api/analytics/variants` | `responseRate` = positive-status count / applied count, per label | P1 | Y |
| PRO-07 | Functional | Model tier | Pro gets higher-quality model tier for tailoring | Pro vs free user, same tailor request | Compare provider/model selection logic | `canUseQualityModel("pro") === true`, `("free") === false` | P2 | Y |
| PRO-08 | Boundary | Variants | Selecting a variant that belongs to a different application rejected | Two applications, each with variants | POST `/api/tailor/select` with mismatched `applicationId`/`variantId` pair | 404 "Variant not found" | P1 | Y |

### 3.4 Admin

| ID | Type | Module | Title | Preconditions | Steps | Expected | Priority | Automatable |
|---|---|---|---|---|---|---|---|---|
| ADM-01 | Functional | Insights | Full dashboard loads all aggregate sections | Admin, seeded data | GET `/api/admin/insights` | 200 with `totalUsers`, `planCounts`, `signupTrend` (14-day), `funnel`, `topCompanies` (top 5), `referral`, `variantPerformance`, `providerDistribution` | P0 | Y |
| ADM-02 | Functional | Boards | Add/discover a new board | Admin | POST `/api/boards/discover` `{slugs:["stripe"]}` | 200, board saved if Greenhouse/Lever responds | P1 | N (external dependency) |
| ADM-03 | Functional | Boards | Toggle board inactive stops it feeding the queue | Admin, active board | PATCH `/api/boards` `{id, active:false}`, then refresh | Board excluded from next `aggregateJobs()` run | P1 | Y |
| ADM-04 | Functional | Boards | Delete a board | Admin | DELETE `/api/boards?id=...` | 200, board removed | P2 | Y |
| ADM-05 | Functional | Feedback inbox | List recent feedback with resolved emails | Admin, feedback exists from multiple users | GET `/api/feedback` | 200, up to 100 entries, each with correct `email` looked up from `userId` | P1 | Y |
| ADM-06 | Functional | Jobs | Admin-only custom board override on refresh | Admin | POST `/api/jobs/refresh` `{greenhouseBoards:["custom"]}` | Custom list used instead of stored boards | P1 | Y |
| ADM-07 | Negative | Jobs | Non-admin refresh ignores board-override body | Free user | POST `/api/jobs/refresh` `{greenhouseBoards:["evil"]}` | Body silently ignored, default aggregation runs (per `if (profile.isAdmin)` gate) | P0 | Y |

### 3.5 Employer / Recruiter / Payments (template categories — not applicable)

N/A — not part of current product. Job Pilot has no employer/recruiter role, no job-posting-by-companies feature (job listings are aggregated read-only from public Greenhouse/Lever/RemoteOK APIs), and no payment/billing integration (`plan` upgrades are free — referral, first-application activation, or a manual demo toggle in Profile). No test cases are fabricated for these; if any of these become real features, this section should be expanded then.

---

## 4. UI/UX Suite

Real, app-specific cases — not generic cross-browser boilerplate.

| ID | Type | Module | Title | Preconditions | Steps | Expected | Priority | Automatable |
|---|---|---|---|---|---|---|---|---|
| UI-01 | UI | Nav | Hamburger menu opens/closes on mobile viewport | Logged in, viewport ≤768px | Tap hamburger icon in `NavBar.tsx` | Nav drawer opens with all links, tap-outside or link-click closes it | P0 | N (Playwright + viewport emulation) |
| UI-02 | UI | Nav | Desktop nav shows full horizontal links, no hamburger | Viewport ≥1024px | Load any authenticated page | Hamburger hidden, full nav visible | P1 | Y |
| UI-03 | UI | Responsive | Review queue cards reflow to single column on mobile | `/review`, mobile viewport | Load page | Grid collapses from multi-column to 1-column, no horizontal scroll/overflow | P0 | N (visual) |
| UI-04 | UI | Responsive | Tracker table remains usable on mobile (no clipped columns) | `/tracker`, mobile viewport | Load page | Table scrolls horizontally within its own container or reflows to cards; page itself doesn't scroll horizontally | P1 | N (visual) |
| UI-05 | UI | Theme | Theme selection persists across reload and across pages | Any theme selected | Select "Neon", reload, navigate to another page | Theme stays "Neon" on both (via `localStorage` + `data-app-theme`) | P0 | Y |
| UI-06 | UI | Theme | System theme follows OS light/dark preference | Theme = "System (Auto)" | Toggle OS dark mode | Page follows OS preference live | P1 | N (OS-level emulation) |
| UI-07 | UI | Theme | Each of the 6 explicit themes renders distinct 3D background palette | Each theme selected in turn | Visually inspect `Background3D` per `THEME_3D_PALETTES` | Colors/sparkle/glow match the theme's defined palette, no fallback-to-default leakage | P2 | N (visual regression) |
| UI-08 | UI | Accessibility | Theme switcher and hamburger are keyboard-operable | Any page | Tab to controls, operate with Enter/Space | Focus visible, controls activate without a mouse | P1 | N (a11y audit / Playwright + axe) |
| UI-09 | UI | Easy Apply | Bulk-select checkboxes and "select all" behave correctly | `/easy-apply`, 10+ queued jobs | Check individual rows, then "select all" | Count badge updates accurately; bulk apply button enables only when ≥1 selected | P1 | Y (Playwright) |
| UI-10 | UI | Variants | A/B/C tabs switch content without losing unsaved edits warning | Pro user, 2+ variants, edited text in tab A | Switch to tab B | Either edits persist per-tab or user is warned before switching (verify actual behavior — flag as exploratory) | P2 | N (exploratory) |
| UI-11 | UI | Feedback widget | Widget accessible from any authenticated page, submits without navigation | Any page | Open feedback widget, submit rating+message | Success confirmation shown inline, no full page reload | P1 | Y (Playwright) |
| UI-12 | UI | Forms | ProfileForm shows inline validation before submit | `/profile` | Enter password <8 chars equivalent field / bad email in relevant forms | Inline error shown before hitting network, matching server-side rule | P1 | N (manual + Playwright) |

---

## 5. Regression Suite & Automation Candidates

Stack: Next.js 16 (App Router) + TypeScript + Prisma + Postgres, React 19, deployed on Vercel with GitHub Actions already building on every push (`.github/workflows/deploy.yml`).

Recommended tooling:
- **API/integration**: a lightweight `fetch`-based test harness (e.g. Vitest + native `fetch` against a running `next dev`/test server, or `supertest`-style helper wrapping `fetch`) hitting the real route handlers against a seeded test Postgres DB (Docker or a scoped test schema). No Python/Selenium — doesn't match this stack.
- **UI E2E**: Playwright (TypeScript), since it has first-class Next.js App Router support, viewport emulation for the hamburger/responsive cases, and screenshot diffing for the theme suite.
- **Unit**: Vitest for pure logic — `src/lib/scoring.ts`, `src/lib/dedupe.ts`, `src/lib/plan.ts`, `src/lib/ist.ts` (schedule time math) — these are deterministic and cheap to fully cover.

All P0/P1 cases marked **Y** above are automation candidates. Priority order for building the suite:
1. Auth (register/login/refresh/logout/rate-limit) — highest risk, cheapest to automate, no AI dependency.
2. Plan-gating (variants, schedule, auto-approve, PDF) — pure server-side logic, no external calls.
3. Applications/tracker/bulk-apply — core data-integrity path.
4. Admin/board management — access-control regression.
5. AI tailoring — mock the provider layer (`generateVariant`) rather than calling real Gemini/OpenAI/Anthropic in CI (cost + flakiness).
6. Playwright UI suite last — nav, responsive, theme, feedback widget.

### Suggested folder layout

```
tests/
  api/
    auth.test.ts
    profile.test.ts
    applications.test.ts
    bulk-apply.test.ts
    variants.test.ts
    admin.test.ts
    referral.test.ts
    cron.test.ts
  unit/
    scoring.test.ts
    dedupe.test.ts
    plan.test.ts
    ist.test.ts
  e2e/
    auth.spec.ts
    nav-responsive.spec.ts
    theme.spec.ts
    easy-apply.spec.ts
    review-queue.spec.ts
  fixtures/
    resumes/ (sample.pdf, sample.docx, sample.txt, oversized.bin)
    jobListings.ts (seed data)
  helpers/
    testClient.ts (fetch wrapper with cookie jar)
    seedDb.ts / resetDb.ts
```

### CI hook idea

Add a `test` job to `.github/workflows/deploy.yml` parallel to the existing `build` job (or as a prerequisite for it): spin up a Postgres service container, run `prisma migrate deploy` against it, run `npm run test:api` and `npm run test:unit`, then run Playwright (`npm run test:e2e`) against a `next start` instance pointed at the test DB. Gate `deploy-preview`/`deploy-production` on this job passing, same as it currently gates on `build`.

---

## 6. Security

The following were **verified live against the running dev server this session** — confirmed pass, not a plan item:

| Check | Result |
|---|---|
| Cross-tenant IDOR (accessing another user's application/resume by ID) | CONFIRMED PASS — verified live, see session transcript (404/403) |
| SQLi in login | CONFIRMED PASS — verified live, see session transcript. Also confirmed by static grep: zero `$queryRawUnsafe`/`$executeRawUnsafe` in the codebase; the one raw-SQL usage (`src/app/api/queue/route.ts`) uses Prisma's tagged-template `$queryRaw` with interpolated values, which Prisma parameterizes safely — not string concatenation |
| Stored XSS | CONFIRMED PASS — verified live, see session transcript. Also confirmed by static grep: zero occurrences of `dangerouslySetInnerHTML` anywhere in `src/` — all output goes through JSX's default auto-escaping |
| Oversized/wrong-type file upload rejected | CONFIRMED PASS — verified live, see session transcript (413 over 5MB, 422 unsupported type) |
| Login rate limit triggers 429 after 8 attempts | CONFIRMED PASS — verified live, see session transcript |
| Board-mutation routes require admin | CONFIRMED PASS — verified live, see session transcript (403 for non-admin on PATCH/DELETE `/api/boards`, POST `/api/boards/discover`) |
| Header-injection in resume filename | CONFIRMED PASS — sanitization code present and verified: `src/app/api/applications/[id]/resume/route.ts` strips `[\r\n"]` and truncates to 200 chars before it reaches the `Content-Disposition` header |

Additional static checks performed this session (grep-based, own audit):

| Check | Result |
|---|---|
| `dangerouslySetInnerHTML` anywhere in `src/` | None found |
| `$queryRawUnsafe` / `$executeRawUnsafe` anywhere | None found. One legitimate `$queryRaw` tagged-template usage in `src/app/api/queue/route.ts` — parameterized, safe |
| `"use server"` (Next.js Server Actions) anywhere | None found — app is pure API routes, so Server-Actions-specific CVEs in the advisories below are not an exploitable surface |
| `next/image` usage anywhere | None found (only the routing matcher string `_next/image` in `src/proxy.ts`, not actual image-optimization usage) — so `next/image`-specific advisories are not an exploitable surface either |
| Mutating API routes missing `requireUser()`/`requireAdmin()` | None found among routes that should have one. The 4 routes without an explicit check (`auth/login`, `auth/register`, `auth/refresh`, `auth/logout`) are pre-session by design and correctly listed in `PUBLIC_API_PREFIXES` in `src/proxy.ts`. One observation (not a gap): `GET /api/boards` has no in-handler `requireUser()` call, but it's still covered by the global `src/proxy.ts` gate (any path not under `/api/auth/` or `/api/cron/` requires a valid session cookie or gets a 401) — the route comment's claim ("any authenticated user can see") holds, just enforced one layer up rather than in the handler itself. Worth a defense-in-depth follow-up (explicit `requireUser()` in the handler) but not a live gap today |

`npm audit` reported 3 high-severity advisories in transitive Next.js/PostCSS/sharp dependencies with no non-breaking fix currently available upstream. The app is already on `next@16.2.12` (latest patch at time of writing). As confirmed above, the app uses neither Server Actions nor `next/image`, so the specific exploitable code paths referenced by those advisories are not in use — residual risk is limited to the advisory's other surfaces, if any; re-check `npm audit` after the next upstream patch.

---

## 7. Test Data Matrix

| Data type | Valid example | Invalid/boundary examples |
|---|---|---|
| Email | `jane@company.com` | `jane@company` (no TLD), `jane@.com`, `jane company.com` (space), empty string |
| Password | 8+ chars, e.g. `Passw0rd!` | 7 chars (`Passw0r`), empty |
| Resume file | `.pdf`/`.docx`/`.txt` ≤5MB with extractable text | `.doc` (unsupported, 422), `.png` renamed to `.pdf`, exactly 5,242,881 bytes, scanned-image PDF with no text layer |
| Salary floor | `2000000` (INR) | `-1` (negative, currently unvalidated server-side — see FRE-03), `"abc"` (non-number, ignored) |
| Application status | `queued`,`approved`,`applied`,`responded`,`interview`,`rejected`,`offer` | `"hired"`, `""`, `null` |
| Plan | `free`, `pro` | `"premium"`, `"Pro"` (case-sensitive — `isPlan()` requires exact lowercase match) |
| Schedule times | `"09:00"` IST strings | array with >1 entry on free plan (silently truncated to 1), >8 on pro (truncated to 8) |
| Feedback rating | `1`–`5` | `0`, `6`, `4.7` (rounded), non-number |
| Feedback message | ≤2000 chars | 2500 chars (truncated, not rejected) |
| Bulk-apply `ids` | array of caller's own queued/approved application ids | empty array (400), ids belonging to another user (silently excluded from count), already-applied ids (excluded via `appliedAt: null` filter) |
| Referral code | valid `referralCode` (cuid) from an existing user | garbage string (treated as "no referrer", registration still succeeds) |
| Coding profile links | `{platform:"leetcode", url:"https://..."}` | 15 entries in one PUT (truncated to 10) |

---

## 8. Environment / Entry Checklist

Before executing any suite above:

- [ ] `DATABASE_URL` points at a disposable test Postgres instance, migrated (`prisma migrate deploy`) — never the shared/dev/prod DB
- [ ] `CRON_SECRET` set in test env (needed for SAN-14/SAN-16)
- [ ] At least one seeded Admin (`isAdmin: true`) and one seeded Free + one seeded Pro user
- [ ] At least one active Board seeded or Greenhouse/Lever calls mocked (job-refresh tests shouldn't depend on live third-party APIs being reachable)
- [ ] AI provider calls (`/api/tailor`, `/api/tailor/variants`) either use a test/sandbox key or the provider layer (`generateVariant`) is mocked — avoid burning real API quota in CI
- [ ] Resume fixtures present: valid small `.pdf`/`.docx`/`.txt`, an oversized (>5MB) file, a `.doc` file, an unsupported type (e.g. `.png`)
- [ ] Two distinct user sessions available for cross-tenant isolation tests (SMK-13, SAN-07)
- [ ] Browser matrix for the Playwright suite: Chromium + WebKit at minimum, at both a mobile viewport (≤768px, hamburger) and a desktop viewport (≥1024px)
- [ ] OS-level dark/light toggle available for UI-06 (System theme), or emulate via `prefers-color-scheme` in Playwright
- [ ] Confirm `npm audit` has been re-run against current `package-lock.json` before signing off the Security section for a release

---

## 9. Priority Legend

- **P0** — release-blocking; core data integrity, auth, plan-gating, or cross-tenant isolation
- **P1** — should-fix before release; degrades a real flow but has a workaround or is non-blocking
- **P2** — nice-to-have / cosmetic / low-traffic edge case

---

## 10. Results Report Template

Use this template when a suite is actually executed — do not pre-fill counts.

```
# Test Execution Report — Job Pilot

Date:
Environment (DB, deployed URL or local, git commit SHA):
Suite(s) run:
Tester / automation run link:

## Summary
Total cases run:
Passed:
Failed:
Blocked/skipped (with reason):

## Results by suite
| Suite | Total | Pass | Fail | Blocked |
|---|---|---|---|---|
| Smoke | | | | |
| Sanity | | | | |
| Functional — Guest | | | | |
| Functional — Free | | | | |
| Functional — Pro | | | | |
| Functional — Admin | | | | |
| UI/UX | | | | |
| Security | | | | |

## Failures / defects
| Case ID | Title | Severity | Repro steps | Actual vs expected | Bug ticket |
|---|---|---|---|---|---|

## Notes / flaky cases

## Sign-off
```
