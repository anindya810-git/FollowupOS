# Pendingly — Product Requirements Document

**Status:** Built (MVP complete, ready for staging deploy)
**Last updated:** 2026-05-16
**Repo:** `anindya810-git/FollowupOS`
**Active branch:** `claude/build-from-prd-ZjpeZ`

---

## 1. Problem

Knowledge workers lose hours every week to email follow-up overhead:

- Forgetting to reply to important threads buried under noise.
- Forgetting to chase someone who never replied to *them*.
- Re-reading the same threads to figure out whether anything is owed.
- No visibility into how their follow-up hygiene compares week-over-week.

Existing tools (Superhuman, Boomerang, Hubspot Sales) either cost too much,
require switching email clients, or focus on send-side scheduling rather than
the receive-side cognitive load.

## 2. Solution

Pendingly is a separate web app that connects to a user's existing inboxes,
reads the last 30 days of email, and uses AI to produce a prioritised daily
queue of follow-ups. The user works through that queue with three buttons
(Done, Snooze, Ignore) and can reply inline.

Core promise: **"Three buttons a day, and your inbox is under control."**

## 3. Target users

- **Primary:** Founders, sales people, freelancers, consultants — anyone who
  sends 20+ business emails a day and is the bottleneck on threads.
- **Secondary:** Knowledge workers (PMs, engineering managers) drowning in
  cross-team threads.
- **Out of scope for v1:** Sales teams with shared inboxes, support desks,
  CRM-integrated workflows (planned for v2).

## 4. Core principles

1. **AI does the categorisation, the user does the action.** Pendingly never
   silently sends, archives, or replies on the user's behalf without explicit
   opt-in.
2. **Read-only by default.** Send and auto-follow-up are opt-in features.
3. **Four colours, no clutter.** Ink, Paper, Action, Done — that's it. No
   rainbow tags. No information theatre.
4. **Privacy is a feature.** Only thread metadata + AI classifications stored;
   full message bodies never persisted.

---

## 5. Feature set (what's built)

### 5.1 Inbox connections

| Provider | Auth | Scope |
|---|---|---|
| Gmail | OAuth 2.0 | `gmail.readonly` + `calendar.readonly` |
| Outlook / Microsoft 365 | OAuth 2.0 | `Mail.Read` + `Calendars.Read` + `Mail.Send` |
| Zoho Mail | IMAP + password | encrypted at rest |
| Apple Mail (iCloud) | IMAP + app password | encrypted at rest |
| Generic IMAP | IMAP + host + password | encrypted at rest |

A user can connect **any number of accounts of any combination**. All feed
into one unified queue.

### 5.2 AI classification

Every thread in the last 30 days is sent to Anthropic Claude
(`claude-sonnet-4-6`) with the participants, subject, and last 3 message
excerpts. The model returns one of six categories:

| Category | Meaning |
|---|---|
| `reply_needed` | Someone is waiting on the user to respond |
| `waiting_on_them` | User sent the last message, awaiting a response |
| `followup_due` | Soft commitment, user said they'd circle back |
| `commitment_detected` | User promised to do something with a deadline |
| `overdue_commitment` | A commitment past its due date |
| `no_action_needed` | FYI, automated, or already resolved |

Plus a structured output with: `title`, `reason`, `suggestedAction`,
`ownerName`, `ownerEmail`, `priority`, `confidenceScore`, `dueDate`.

The "no action" classifications are stored but hidden from the queue.

### 5.3 Daily queue (the main workflow)

The Queue page shows every open action item with filters by category,
status, priority, and free-text search. Each item has:

- Category chip, priority dot, title, contact name, reason
- **Done** — marks the item complete
- **Snooze** — popover with smart defaults (Later today 3pm, Tomorrow 9am,
  This weekend, Next Monday, Next week, 2 weeks)
- **Ignore** — hides the item *and* trains the model to deprioritise similar
  threads (via `UserFeedback` rows)
- **Open** — slides out a detail drawer

**Bulk actions:** every card has a checkbox. Selecting one or more reveals
a floating action bar at the bottom of the page with Mark Done / Snooze /
Ignore / Clear, all hitting one batched API call.

### 5.4 Action drawer

A side panel that opens on click. Shows:

- Why this needs attention (AI reasoning)
- Suggested action (AI-generated)
- Recent 3 messages from the thread (preview, not full body)
- **Generate Reply** — drafts a reply in 6 tones (Polite, Firm, Short,
  Executive, Friendly, Escalation) using Claude
- **Send Reply** — sends the draft directly through the user's inbox
  (Gmail API, Microsoft Graph, or SMTP via nodemailer for IMAP). Marks the
  item Done on success.
- **Open in Gmail/Outlook** — deep-link to the original thread

### 5.5 Dashboard

Daily landing page. Shows:
- Six metric cards (open, overdue, reply needed, waiting on them, done today, snoozed)
- Top 5 priority items with one-click actions
- Calendar awareness — each card shows a "📅 Meeting tomorrow 3pm" badge
  if the contact has an upcoming meeting on the user's calendar

### 5.6 Analytics

A separate page with:
- **Health Score (0-100)** — composite of open count, overdue count, and
  resolved-this-week. 70+ green, 40-69 amber, <40 red.
- **Open items by category** — donut chart
- **Volume & resolution trends** — 7/14/30/90-day line charts
- **Avg TAT by category** — horizontal bars
- **Activity by day of week** — vertical bars (highlights peak day)
- **Top contacts** — who you're waiting on the most
- **Resolution funnel** — created → done / snoozed / ignored / open

All charts are hand-built SVG (no chart library dependency).

### 5.7 Notifications & automation

**Slack digest** — paste an Incoming Webhook URL in Settings → Slack
Integration. Daily 9am block-kit message with open count, overdue count,
and top 5 items. URL is validated against `https://hooks.slack.com/*`
before any fetch (no SSRF surface).

**PWA push notifications** — installable on iOS/Android/desktop via the
manifest. Daily morning push: "3 overdue · 12 open follow-ups". Requires
VAPID keys; subscriptions cleaned up automatically on 404/410.

**Auto follow-up** — opt-in. User sets days-of-silence threshold (default
3) and writes a template (`{{name}}`, `{{firstName}}` variables). Cron
finds `waiting_on_them` items past the threshold and sends a templated
reply through the original inbox. Guarded by `lastAutoFollowupAt` so the
same item is never followed up twice within the interval.

### 5.8 Onboarding & help

**6-step guided tour** appears the first time a user lands on the
dashboard. Centered modal with: welcome → how scan works → three buttons
→ reply inline → analytics → notifications. Tour state persists in
`User.onboardingCompleted`; a "Replay tour" button in Settings resets it.

**Help & FAQ page** at `/help` — 5 sections (Getting Started, Privacy &
Security, Daily Workflow, Automation, Analytics), 20 FAQs total, searchable.

### 5.9 Settings

- **Connected Inboxes** — list, reconnect, disconnect, sync, build contacts
- **Notifications** — enable/disable push, enable/disable digest, digest time
- **Slack Integration** — webhook URL, enable toggle, send test
- **Automation** — auto-follow-up toggle, days threshold, template editor
- **Follow-up Rules** — default follow-up days, scan window days,
  conservative-mode toggle
- **Ignored Senders** — add domains or specific senders to filter from scans
- **Replay Tour** — re-run the onboarding tour
- **Danger Zone** — delete account (cascade-deletes all data)

### 5.10 Contacts directory

A `Contact` model auto-populates as emails are scanned (sender name/email
pairs are upserted from message headers). Used to display human names
instead of email addresses throughout the UI. A "Sync Contact Names"
button in Settings rebuilds the directory from all stored messages.

No external contacts API (Google People / Outlook Contacts) was wired —
the email-header data is more reliable in practice and requires no extra
OAuth scopes.

---

## 6. Brand system

Four colours. No exceptions in product surfaces:

- **Ink** `#0B1220` — text, sidebar, primary buttons
- **Paper** `#F6F2EA` — background
- **Action** `#F25A3C` — orange accent (CTA, alerts, brand chevron)
- **Done** `#1A8F5E` — success states

Typography:
- **Hanken Grotesk** — UI, headings, body
- **JetBrains Mono** — labels, metric counts, eyebrow text

Logo: orange chevron stroke + two ink fill rects on a 56-unit grid.
Defined in `src/components/ui/Logo.tsx`.

Sound: subtle Web Audio chimes (`done` = C-E-G arpeggio, `info` = soft
A5 bell). Fires on Done and Snooze actions.

---

## 7. Architecture

### 7.1 Stack

- **Frontend:** Next.js 16 App Router, React Server Components, Tailwind v4
- **Backend:** Next.js API routes (Node runtime)
- **Database:** Prisma v7 → SQLite (local) / Postgres (prod swap)
- **Auth:** NextAuth v5 with Google OAuth
- **AI:** Anthropic Claude (`claude-sonnet-4-6`)
- **Email APIs:** Gmail REST, Microsoft Graph, imapflow (IMAP), nodemailer (SMTP)
- **Push:** web-push (VAPID)

### 7.2 Data model (key tables)

```
User
 ├── EmailAccount[]      (one per connected inbox)
 │    └── EmailThread[]
 │         └── EmailMessage[]
 ├── ActionItem[]        (the queue — one per thread that needs action)
 ├── Contact[]           (auto-populated name directory)
 ├── DigestSettings      (email/Slack digest config)
 ├── AppSettings         (follow-up rules + auto-followup config)
 ├── PushSubscription[]  (web push endpoints)
 ├── IgnoredSender[]     (sender/domain blocklist)
 ├── UserFeedback[]      (signal for AI: "ignore items like this")
 └── AiClassificationLog[] (audit trail)
```

### 7.3 Security

- **At rest encryption:** OAuth tokens and IMAP passwords encrypted with
  AES-256-GCM. Key derived via scrypt from `ENCRYPTION_KEY` env var (falls
  back to `NEXTAUTH_SECRET`). Throws in production if neither is set.
- **Authorization:** every API route scopes queries by `session.user.id`.
  IDOR audit complete — no cross-tenant data exposure.
- **Input validation:** every `request.json()` wrapped in try/catch with
  400 response on bad JSON. Status/feedback enums validated.
- **SSRF protection:** Slack webhook URLs validated against
  `https://hooks.slack.com/*`. SMTP hosts validated against private/loopback
  IP ranges via `isSafePublicHostname()`.
- **Security headers:** HSTS, X-Content-Type-Options, X-Frame-Options=DENY,
  Referrer-Policy, Permissions-Policy. Set globally in `next.config.ts`.
- **No raw SQL** — Prisma only. No `dangerouslySetInnerHTML`.

### 7.4 Background jobs

Three crons. Configured in `vercel.json` for Vercel Cron; also accept
`x-cron-secret` header from any external scheduler (GitHub Actions, Upstash).

| Path | Schedule | Purpose |
|---|---|---|
| `/api/cron/digest` | `0 9 * * *` | Daily Slack digest |
| `/api/cron/push-digest` | `0 9 * * *` | Daily push notification |
| `/api/cron/auto-followup` | `0 10 * * *` | Auto-follow-up sends |

---

## 8. Non-goals (v1)

- Native iOS/Android apps (PWA covers this for v1)
- Browser extension (separate codebase, planned v1.5)
- Shared inboxes / team accounts
- CRM integration (HubSpot, Salesforce, Pipedrive)
- Send-side scheduling (Boomerang-style)
- Calendar event creation
- Full message body storage / search

## 9. Success metrics

| Metric | Target (v1, first 90 days) |
|---|---|
| User connects ≥1 inbox during onboarding | 80% |
| User returns ≥3 times in first week | 50% |
| Median open items 14 days after signup | <10 |
| % of users with Health Score 70+ after 30 days | 60% |
| Daily active / weekly active ratio | 0.55+ |

## 10. Future roadmap (v1.5 → v2)

- Browser extension surfacing Pendingly status inline in Gmail/Outlook web
- Team / shared inbox support with assignment + SLA tracking
- CRM sync (push action items to HubSpot/Salesforce/Pipedrive)
- Per-user rate limiting on AI / scan / draft / send endpoints
- AI retry-with-backoff on Anthropic 529 errors
- OAuth revocation API call on disconnect (Google + Microsoft)
- Calendar event creation ("Schedule a follow-up call")
- Public "follow-up status" share links (Calendly-style)
- Mobile native apps (React Native or Expo)

## 11. Known limitations

- Scan can take 2-3 minutes for large inboxes (no progress queue —
  user sits on `/scan` page).
- Auto follow-up sends one templated message per thread per interval.
  No multi-step sequences yet.
- No retry/backoff on AI rate limits — failed classifications log and skip.
- Multiple parallel scans for the same user are not prevented (no
  "single-in-progress" guard).
- IMAP password auth requires app-specific passwords for Gmail/iCloud
  users — we don't validate that proactively.
- OAuth disconnect deletes local tokens but doesn't revoke access on
  Google/Microsoft side; users must do that manually in their account
  settings if they want full revocation.

## 12. Pricing (proposed, not built)

| Tier | Price | Limits |
|---|---|---|
| Free | $0 | 1 inbox, 7-day scan window, no auto-followup, no Slack |
| Pro | $9/mo | Unlimited inboxes, 90-day window, all features |
| Team | $19/user/mo | Pro + shared inboxes (v2) |

Anthropic cost per active user: ~$0.30–$0.80/mo at current pricing.
Gross margin at Pro tier: ~90%+.

---

## 13. Appendix — feature commits

This branch (`claude/build-from-prd-ZjpeZ`) contains the full build,
~25 commits. Key landmarks:

- `Rebrand to Pendingly with 4-color design system`
- `Apply exact brand spec: LogoMark SVG, JetBrains Mono, animations, chimes`
- `Add Zoho, Apple Mail, Generic IMAP support`
- `Add analytics dashboard: health score, TAT, volume trends`
- `Add contact name resolution from email headers`
- `Make UI fully mobile-responsive: sidebar drawer, touch targets`
- `Add inline send replies, smart snooze, bulk queue actions`
- `Add AES-256 token encryption, Slack digest, calendar awareness`
- `Add PWA push notifications and auto follow-up sending`
- `Add Vercel cron config, README, .env.example`
- `Add guided onboarding tour and Help/FAQ section`
- `Security audit: IDOR fixes, input validation, security headers, SSRF guards`
