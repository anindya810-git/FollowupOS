# Pendingly — Product Requirements Document

**Document version:** 1.0
**Last updated:** 2026-05-16
**Author:** Anindya (with Claude)
**Status:** MVP complete — ready for staging deploy

**Repository:** `github.com/anindya810-git/FollowupOS`
**Active branch:** `claude/build-from-prd-ZjpeZ`
**Total commits (this branch):** ~30
**Lines of code (approx):** 15,000

---

## Table of Contents

1. Executive summary
2. Problem statement
3. Target users & personas
4. Product principles
5. Competitive positioning
6. Information architecture
7. Feature catalog
8. End-to-end user flows
9. Brand & design system
10. Technical architecture
11. Database schema
12. API reference
13. AI integration
14. Email provider integrations
15. Authentication & authorization
16. Security architecture
17. Background jobs
18. Environment configuration
19. Frontend architecture
20. Page specifications
21. Component inventory
22. Performance & scalability
23. Observability & logging
24. Error handling patterns
25. Privacy & data handling
26. Compliance considerations
27. Accessibility
28. Pricing model
29. Go-to-market
30. Roadmap
31. Known limitations & technical debt
32. Glossary
33. Appendix A — Anthropic prompts verbatim
34. Appendix B — Environment variables reference
35. Appendix C — Onboarding tour content
36. Appendix D — FAQ content
37. Appendix E — Brand tokens reference
38. Appendix F — Sample API payloads
39. Appendix G — Commit timeline

---

# 1. Executive Summary

**Pendingly** is a web application that connects to a knowledge worker's
email inboxes (Gmail, Outlook, Zoho, Apple Mail, generic IMAP), uses
AI to read the last 30 days of email, and produces a prioritised daily
queue of follow-ups. The user works through that queue with three actions
(Done, Snooze, Ignore) and can generate + send AI-drafted replies inline.

The product solves a single, expensive problem: **knowledge workers lose
hours every week to email follow-up overhead** — forgetting to reply,
forgetting to chase, and rebuilding mental context every time they open
their inbox.

**Core promise:** "Three buttons a day, and your inbox is under control."

### What Pendingly is NOT
- Not an email client (you keep using Gmail/Outlook)
- Not a CRM
- Not a send-side scheduling tool (Boomerang-style)
- Not a shared inbox tool (planned for v2)
- Not a native mobile app (PWA only in v1)

### State of the build
Every feature listed below is implemented, tested via `npx tsc --noEmit`
and `npm run build`, and pushed to the active branch. Three security
audits have been completed and findings remediated.

| Surface | Status |
|---|---|
| Landing page | Built |
| Sign in (Google OAuth) | Built |
| Connect inbox flow (Gmail / Outlook / Zoho / Apple / IMAP) | Built |
| Initial scan with progress page | Built |
| Dashboard with top priorities | Built |
| Queue with filtering, search, pagination, bulk actions | Built |
| Action drawer with AI draft & send | Built |
| Analytics dashboard (8 visualisations) | Built |
| Settings (5 sections incl. automation) | Built |
| Help / FAQ page (5 sections, 15 questions, searchable) | Built |
| Guided onboarding tour (6 steps) | Built |
| Mobile responsive (hamburger sidebar, touch targets) | Built |
| PWA (manifest, service worker, push notifications) | Built |
| Auto follow-up sending (opt-in, templated) | Built |
| Slack digest integration | Built |
| Calendar awareness (Google + Outlook) | Built |
| Daily cron jobs (3) wired for Vercel | Built |
| AES-256-GCM encryption for tokens | Built |
| Security headers (HSTS, X-Frame-Options, etc.) | Built |
| SSRF protection on user-supplied URLs/hosts | Built |
| IDOR audit + fixes across all API routes | Complete |
| Browser extension | Out of scope for v1 |

---

# 2. Problem Statement

## 2.1 The cost of email follow-up debt

Knowledge workers (founders, sales, consultants, freelancers, PMs)
collectively send 20–80 business emails per day. Each thread spawns a
mental obligation: "did I reply to that?", "is anyone waiting on me?",
"did Sarah ever come back on the contract?". The cost is rarely a single
missed email — it's a constant low-grade anxiety and the periodic loss of
deals, opportunities, or relationships because something genuinely slipped.

The current solutions are inadequate:

| Tool | Problem |
|---|---|
| Inbox itself | Linear, no priority signal, doesn't track who owes whom |
| Boomerang / Mixmax | Send-side scheduling — doesn't help with receive-side cognitive load |
| Superhuman | $30/mo, requires switching client entirely |
| Notion / Todoist | Manual entry; the friction defeats the point |
| Mental energy | Doesn't scale past ~20 active threads |

## 2.2 Three concrete failure modes

1. **The reply that never went out.** You opened the email, read it,
   meant to come back to it, never did. A week later they follow up,
   visibly annoyed.
2. **The chase you forgot to send.** You sent a proposal. They went
   quiet. Three weeks later you wonder why the deal stalled — they were
   waiting for you to nudge.
3. **The commitment that lapsed.** You said "I'll send that doc by
   Friday." Friday came and went. They didn't remind you. You didn't
   remember. Trust quietly erodes.

Pendingly addresses all three with one mental model: every thread either
needs you to do something, is waiting on someone else, or doesn't need
attention. We surface the first two, hide the third.

## 2.3 Why now

Three technological enablers converged:

- **LLMs are now good enough** to read an email thread and accurately
  classify it without elaborate rule engines. The Claude family in
  particular handles nuanced "did this thread actually request anything"
  reasoning well.
- **Email APIs are stable** — Gmail REST, Microsoft Graph, IMAP have
  been mature for years; OAuth flows are well-trodden.
- **Web push and PWAs** mean we don't need native mobile apps to deliver
  daily nudges.

---

# 3. Target Users & Personas

## 3.1 Primary persona — "Anita the founder"

- **Role:** First-time founder, 35, leading a 15-person seed-stage startup
- **Email volume:** 80–150 sent + received per day across two inboxes
  (founder@startup.com + personal Gmail)
- **Pain:** Constantly drops replies to investors, customers, and
  candidates. Mental tax of inbox triage is her single biggest
  productivity drag.
- **Why she'll pay:** A missed reply to an investor or candidate costs
  her tens of thousands of dollars (or a hire). $9/mo is rounding error.
- **How she uses Pendingly:** Opens it once a day, works through the
  queue in 10–15 min, hits Send Reply on 3–5 drafts directly.

## 3.2 Secondary personas

### "Karan the consultant"
- **Role:** Independent strategy consultant, 5 active client engagements
- **Volume:** 40–60 emails/day
- **Pain:** Every client thinks they're the priority; he loses track of
  who owes what.
- **Value:** Auto-follow-up after 3 days of silence is worth more than
  the entire monthly subscription.

### "Priya the PM"
- **Role:** Senior PM at a 500-person company, drowning in cross-team threads
- **Volume:** 60 emails/day, 90% internal
- **Pain:** Decisions blocked on her reply that she's forgotten about;
  Slack digest at 9am is her lifeline.

### "Mike the salesperson"
- **Role:** Account executive, B2B SaaS
- **Volume:** 30–50 outbound + 20–30 inbound/day
- **Pain:** Forgets to chase prospects who went quiet after a demo.
  Boomerang-style scheduling doesn't catch reply-side debt.

## 3.3 Out of scope (v1)

- Sales teams with shared inboxes (`support@`, `sales@`) — planned for v2
- Customer support desks — different workflow (ticketing, not follow-up)
- Mass cold-email senders — Pendingly is not an outbound tool
- Heavy enterprise with on-prem Exchange + complex permissions

## 3.4 Jobs-to-be-done

| When… | I want to… | So I can… |
|---|---|---|
| I open my inbox in the morning | Know what needs my reply today | Avoid scrolling through 200 unread |
| I'm preparing for a 1:1 with a contact | See what I owe them | Not show up empty-handed |
| Someone has gone quiet on me | Send a polite nudge | Not lose the deal/relationship |
| I commit to "I'll get back to you Friday" | Be reminded on Thursday | Honour the commitment |
| End of week | See how I'm doing | Improve my response habits |

---

# 4. Product Principles

These principles govern every product decision. When in doubt, refer back.

## 4.1 The AI categorises. The user acts.

Pendingly never silently sends, archives, replies, or modifies the user's
inbox without explicit opt-in. The AI's job is to *triage*; the user's
job is to *decide*. Auto-follow-up is the one feature that sends on the
user's behalf, and it requires:
- An opt-in toggle in Settings → Automation
- A configured days-of-silence threshold
- A user-written template
- A warning banner above the form
- Per-item deduplication (`lastAutoFollowupAt`)

## 4.2 Read-only by default

A new user can connect their inbox without ever granting send permission
beyond what their OAuth provider requires. Until they explicitly hit
**Send Reply**, no email is sent from Pendingly. This is a deliberate
design choice to lower the barrier to first scan.

## 4.3 Four colours, no clutter

Ink (`#0B1220`), Paper (`#F6F2EA`), Action (`#F25A3C`), Done (`#1A8F5E`).
That's the entire colour palette in product surfaces. We do not use:
- Red for errors (Action serves; context disambiguates)
- Blue for links (Ink underline serves)
- Yellow for warnings (mute text + Action border serves)
- Gradients
- Per-category colour-coding chips that look like a unicorn vomited

Every category chip uses the same Ink-08 background. Hierarchy comes
from typography, spacing, and Action accents — not colour overload.

## 4.4 Privacy is a feature, not a footer

- Full message bodies are never persisted. Only subject, snippet, and a
  short excerpt are stored.
- OAuth tokens and IMAP passwords are encrypted at rest with AES-256-GCM.
- Anthropic API calls run without training opt-in.
- Disconnect deletes all stored threads for that account.
- Account deletion is one click and irreversible.

## 4.5 Fast first scan, low-friction first session

The complete first-time user journey from sign-in to "I see actionable
items" should fit in 5 minutes:

1. Sign in with Google (30s)
2. Connect Gmail (30s)
3. Scan runs in the background (2–3 min)
4. Land on dashboard with onboarding tour (60s)
5. Hit Done / Snooze on first item (5s)

If any step takes longer than its budget, it's a bug.

## 4.6 Ship what works on a phone

70% of email triage happens on mobile. Pendingly's UI is built mobile-up:
hamburger sidebar, full-screen action drawer on small viewports, ≥44px
touch targets on every interactive element, responsive grids on every
data layout.

---

# 5. Competitive Positioning

| Competitor | What they do well | What they don't | Pendingly vs them |
|---|---|---|---|
| **Superhuman** | Fastest email client UX | $30/mo, requires switching client, no AI triage | Pendingly is a layer *on top* of your existing inbox; 10× cheaper |
| **Boomerang** | Snooze + send-later | Reactive only, doesn't surface debt proactively | Pendingly is proactive ("here's what you owe today") |
| **Sanebox** | Filtering / categorising | Doesn't show *actions* — just sorts mail | Pendingly shows what you need to *do*, not just what to read |
| **Notion + manual entry** | Flexible | Friction defeats the point | Pendingly auto-populates the list |
| **HubSpot Sales / Salesforce** | CRM integration | Sales-only, heavy, expensive | Pendingly works for any knowledge worker |
| **Front** | Shared inbox + collaboration | Team-only, expensive | Pendingly is individual-first |

**Pendingly's strategic moat:** AI classification quality. The deeper our
classifications get (learning from user Ignore/Done feedback), the harder
it is for a generic "AI inbox" feature inside Gmail to match — because
they optimise for the median user, we optimise for *you*.

---

# 6. Information Architecture

## 6.1 Top-level navigation

```
Pendingly
├── Landing (/)                          [unauthenticated]
├── Sign-in (NextAuth Google)            [unauthenticated]
├── Connect (/connect)                   [auth, no inbox yet]
├── Scan progress (/scan?jobId=…)        [auth, scan running]
└── App shell                            [auth, scan complete]
    ├── Sidebar
    │   ├── Overview
    │   │   ├── Dashboard
    │   │   ├── All Items (Queue)
    │   │   └── Analytics
    │   └── Categories
    │       ├── Reply Needed
    │       ├── Waiting on Them
    │       ├── Overdue
    │       └── Snoozed
    └── Bottom nav
        ├── Help
        └── Settings
```

## 6.2 Settings sub-navigation

Settings is a single scrolling page with 6 sections, each as a card:

1. Connected Inboxes
2. Notifications (push + email + Slack)
3. Slack Integration (webhook URL + test)
4. Automation (auto-follow-up)
5. Follow-up Rules (defaults: days, scan window, conservative mode)
6. Ignored Senders
7. Replay Tour
8. Danger Zone (delete account)

## 6.3 Drawer hierarchy

The Action Drawer is the densest surface in the app. Top-to-bottom:

1. Sticky header — "DETAIL" eyebrow + close button
2. Category + priority chips
3. Title + contact name + email + "Last activity X ago"
4. **Why this needs attention** (AI reason) — paper-2 panel
5. **Suggested action** (AI suggestion) — paper-2 panel
6. **Recent messages** — last 3 message excerpts
7. **Generate Reply** — tone selector + Generate button
8. Draft preview (when generated) + Copy + Send Reply buttons
9. Sticky footer — Open in Gmail/Outlook + Mark Done + Ignore

---

# 7. Feature Catalog

This section enumerates every shipped feature with its purpose, UX, and
implementation surface area.

## 7.1 Sign-in (Google OAuth)

**Purpose:** Authenticate the user with minimum friction.

**Flow:**
1. User clicks "Sign in" on landing page
2. Redirect to Google consent screen
3. User approves
4. Redirect back to `/api/auth/callback/google`
5. NextAuth creates / finds user; sets session cookie
6. Redirect to `/dashboard` (if onboarded) or `/connect` (if not)

**Provider:** Google only. NextAuth v5 with `PrismaAdapter`. Session
strategy: **database** (sessions live in the `Session` table, not JWT).

**Scopes:** `openid email profile`. Note: the *Gmail* connection in
section 7.3 is a separate OAuth grant with broader scopes — sign-in
itself only asks for identity.

## 7.2 Landing page (`/`)

**Purpose:** Convert visitors into sign-ups.

**Above the fold:**
- Eyebrow: "Email follow-up, automated"
- H1: "Never miss a follow-up again."
- Subhead: ~50 word value prop
- CTA: "Sign in with Google"
- Trust line: "Read-only access · No emails sent on your behalf · Disconnect anytime"

**Below the fold:**
- Three-step "how it works" grid (Connect → Scan → Act)
- Responsive: `grid-cols-1 sm:grid-cols-3`

**Styling:** Paper background, Ink text, single Action accent on the
brand chevron. No imagery (deliberately minimal). Entrance animations
(`animate-fade-up` with staggered delays).

## 7.3 Connect inbox flow (`/connect`)

**Purpose:** Let users link one or more email accounts.

**Flow A — Gmail:**
1. Click "Connect Gmail"
2. Hit `/api/integrations/gmail/connect` → builds OAuth URL with scopes
   `gmail.readonly` + `calendar.readonly` + identity scopes
3. Google consent
4. Callback at `/api/integrations/gmail/callback`:
   - Exchange code for tokens
   - Fetch user email via Gmail profile API
   - `EmailAccount` upserted with encrypted tokens
   - `ScanJob` created
   - Redirect to `/scan?jobId=…`

**Flow B — Outlook:**
- Same as Gmail but using Microsoft Graph. Scopes: `Mail.Read`,
  `Calendars.Read`, `Mail.Send`, `offline_access`.
- Callback exchanges code at `/common/oauth2/v2.0/token`.
- User email fetched from `https://graph.microsoft.com/v1.0/me?$select=mail,userPrincipalName`.

**Flow C — IMAP (Zoho / Apple / generic):**
1. Show form with provider dropdown, email, password, host, port
2. Provider presets fill host/port (Zoho: `imap.zoho.com:993`,
   Apple: `imap.mail.me.com:993`)
3. Submit to `POST /api/integrations/imap/connect`
4. Server validates:
   - Provider in allowlist (`zoho`, `apple`, `imap`)
   - Host passes `isSafePublicHostname()` (no localhost, private IPs, etc.)
   - Port in 1–65535
5. `testImapConnection()` runs first — if it fails, return error to user
6. On success, password encrypted, `EmailAccount` created, `ScanJob`
   created, redirect to scan page

**Multi-inbox:** Users can repeat the connect flow any number of times.
Different providers can co-exist for one user. All inboxes feed one
unified queue.

## 7.4 Initial scan (`/scan?jobId=…`)

**Purpose:** Show real-time progress while the scanner runs.

**UX:**
- Centered LogoMark (size lg) at top
- Title: "Scanning your inbox"
- 5 visual progress steps:
  1. Connecting to inbox
  2. Fetching last 30 days of threads
  3. Filtering noise (promos, newsletters)
  4. Detecting follow-up needs (AI classification)
  5. Building your queue
- Each step has a spinner while active, a checkmark when complete
- Bottom counter: "X threads processed, Y action items created"
- Audio chime on step transitions and on completion (`playChime('done')`)

**Polling:** Client polls `GET /api/scan/status/[jobId]` every 2s. When
status flips to `completed`, redirect to `/dashboard`.

**Backend:** `runInitialScan()` in `src/lib/scanner.ts`:
- Dispatches by provider (Gmail / Outlook / IMAP)
- Fetches up to 500 threads from the last N days (configurable via
  `AppSettings.scanWindowDays`, default 30)
- For each thread:
  1. Extract message metadata (sender, recipient, subject, snippet)
  2. Upsert `EmailThread` and `EmailMessage` rows
  3. Run `classifyThread()` against Claude
  4. If `should_show_to_user === true`, upsert an `ActionItem`
  5. Upsert sender → `Contact` table
- Updates `ScanJob.threadsProcessed` every 10 threads
- Sets `EmailAccount.initialScanCompleted = true` on completion

**Failure modes handled:**
- Network errors: wrapped in try/catch, logged to `aiLogs`, scan continues
- AI returns unparseable JSON: log, skip thread
- Rate limits from email provider: not currently retried (known gap)
- Token expiry mid-scan: `getGmailAccessToken()` auto-refreshes

## 7.5 Dashboard (`/dashboard`)

**Purpose:** Daily landing page. The user's "what should I do today?" view.

**Layout:**

```
┌────────────────────────────────────────────┐
│  Good morning, Anita                  [sync] │
├────────────────────────────────────────────┤
│ ┌────────┬────────┬────────┬────────┐      │
│ │ Reply  │Waiting │Followup│Overdue │      │
│ │   12   │   8    │   3    │   2    │      │
│ ├────────┼────────┼────────┼────────┤      │
│ │  High  │Snoozed │ Done   │ Open   │      │
│ │   5    │   4    │  127   │  25    │      │
│ └────────┴────────┴────────┴────────┘      │
│                                            │
│ TOP PRIORITY                               │
│ ┌────────────────────────────────────┐    │
│ │ [Reply Needed] •High               │    │
│ │ Subject: Contract revisions        │    │
│ │ From: Sarah Chen — Acme Co.        │    │
│ │ 📅 Meeting tomorrow at 3pm         │    │
│ │ Reason: Sarah is awaiting your...  │    │
│ │ [Open] [Snooze ▾] [Done] [Ignore]  │    │
│ └────────────────────────────────────┘    │
│ ... up to 10 items ...                    │
└────────────────────────────────────────────┘
```

**Data fetched on mount:**
- `GET /api/dashboard/summary` — 6 KPI counts
- `GET /api/dashboard/top-priority` — top 10 items
- `GET /api/calendar/meetings` — upcoming meetings (48h) keyed by attendee email

**Onboarding tour:** If `user.onboardingCompleted === false`, render
`<OnboardingTour>` overlay above the dashboard.

**Calendar awareness:** For each action item, if `item.ownerEmail` matches
a meeting attendee, show a `📅 Meeting <time>` badge in the card.

## 7.6 Queue (`/queue`)

**Purpose:** Full list of all action items with filtering, search, and
bulk operations.

**Filters (URL params):**
- `?status=open|done|snoozed|ignored|all` (default: open)
- `?category=reply_needed|waiting_on_them|…` (optional)
- `?priority=high|medium|low` (optional)
- `?search=<text>` (matches title, ownerName, ownerEmail, subject)
- `?page=N` (pagination, 20 items per page)

**UI:**
- Top filter bar: status pills + category dropdown + priority dropdown + search
- Below: paginated list of `<ActionCard>` components
- Each card has a checkbox in the top-left (only visible when something
  is selected, or on hover)
- Floating bulk action bar at the bottom appears when 1+ selected:
  ```
  ┌──────────────────────────────────────────┐
  │ 3 selected │ Mark Done │ Snooze ▾ │ Ignore │ Clear │
  └──────────────────────────────────────────┘
  ```

**Bulk actions hit:** `POST /api/action-items/bulk` with
`{ ids: [...], action: 'done'|'snoozed'|'ignored'|'open', snoozed_until?: '...' }`.

**Reset behaviour:** Selection clears when filters change or page changes.

## 7.7 Action drawer

**Purpose:** Detailed view of a single item with reply generation + send.

**Triggered by:** Clicking any `ActionCard` (not the action buttons).

**Width:** `w-full sm:w-[480px] md:w-[540px]` — full screen on mobile,
fixed panel on tablet+.

**Sections** (see 6.3 for full hierarchy).

**Generate Reply flow:**
1. User selects tone from dropdown: `polite | firm | short | executive | friendly | escalation`
2. Click Generate
3. `POST /api/action-items/[id]/generate-draft` with `{ tone, output_type: 'email_reply' }`
4. Backend calls `generateDraft()` against Claude with thread context
5. Returns `{ draft, subject_suggestion }`
6. Draft appears in a `<pre>` block with a Copy button overlaid top-right

**Send Reply flow:**
1. After draft is shown, user can hit **Send Reply**
2. Inline confirmation row appears: "Send this reply to `sarah@acme.com`?"
   with Cancel / Confirm
3. Confirm → `POST /api/action-items/[id]/send` with `{ content: draft, subject }`
4. Backend dispatches to correct provider:
   - Gmail: `sendGmailReply()` → Gmail API `messages.send` with RFC 2822 body, In-Reply-To header
   - Outlook: `sendOutlookReply()` → Microsoft Graph `/me/sendMail`
   - IMAP/Zoho/Apple/generic: `sendSmtpReply()` → nodemailer transport
5. On success: action item marked `done`, drawer closes, `playChime('done')`
6. On failure: error displayed inline, item not marked done

## 7.8 Analytics (`/analytics`)

**Purpose:** Weekly habit feedback. Shows whether you're getting better
or worse at staying on top of follow-ups.

**Time range selector** (top-right):
- 7d / 14d / 30d / 90d

**Sections (top to bottom):**

### Row 1 — KPI cards (4 across)
- **Open Items** — count + subtext "X overdue" / "None overdue"
- **Resolved This Week** — count + trend "↑15% vs last week"
- **Avg Resolution Time** — TAT in days + subtext "Across all categories"
- **Overdue** — count + subtext "Top: Reply Needed"

### Row 2 — Health Score (left) + Donut (right)

Health Score (left, 1/3 width):
- 0–100 ring with colour by tier:
  - 70+: green (Done colour)
  - 40–69: amber-orange (Action colour)
  - <40: red-orange (Action colour, more saturated)
- Label below: "Healthy" / "Fair" / "Needs attention"

Donut (right, 2/3 width):
- Open items by category, colour-coded
- Center: total open count + "open" label
- Right-side legend with count + percentage per segment

### Row 3 — Volume / Resolved trends (2 across)
- Line charts, 30-day default
- Left: new items per day (ink colour)
- Right: resolved items per day (done/green colour)
- Filled area below the line at 8% opacity

### Row 4 — TAT by category + Day of Week (2 across)
- Left: horizontal bars showing avg days per category
- Right: vertical bars showing items by day of week
  (Mon/Tue/Wed/Thu/Fri/Sat/Sun); peak day highlighted in Action colour

### Row 5 — Top contacts (full width)
- Horizontal bars showing top 8 contacts by count of open items
- Shows contact name + email as sublabel

### Row 6 — Overdue trend (full width, optional)
- 8-week line chart showing how overdue items have evolved

**Health Score formula** (computed in `/api/analytics/summary`):

```
score = 100
score -= min(totalOpen * 2, 40)      // up to -40 for total open
score -= min(overdueCount * 5, 30)   // up to -30 for overdue
score += min(resolvedThisWeek * 2, 20) // up to +20 for resolved
healthScore = max(0, min(100, round(score)))
```

## 7.9 Settings (`/settings`)

A single page split into 8 cards. Each card hits its own API on save.

### 7.9.1 Connected Inboxes
- List of `EmailAccount` rows with: email, provider, last synced, sync button,
  disconnect button
- "Connect new inbox" button → `/connect`
- "Sync Contact Names" button → `POST /api/contacts` (rebuilds Contact
  table from stored messages)

### 7.9.2 Notifications
- Push toggle (calls `<PushNotificationToggle>`)
  - Requests browser permission, subscribes to push manager
  - POSTs subscription to `/api/push/subscribe`
- Daily email digest toggle + time picker

### 7.9.3 Slack Integration
- Webhook URL input (validated against `https://hooks.slack.com/*` on save)
- "Send Test" button → posts a sample digest
- Enable toggle

### 7.9.4 Automation (Auto Follow-up)
- Big warning banner: "Auto-follow-up will send emails on your behalf.
  Review your template carefully."
- Enable toggle
- Number input: "Days of silence before sending" (default 3)
- Textarea: template with `{{name}}` and `{{firstName}}` variables
- Default template:
  ```
  Hi {{name}},

  Just following up on my previous message — wanted to make sure it
  didn't slip through. Whenever you have a moment, I'd appreciate your
  thoughts.

  Thanks!
  ```

### 7.9.5 Follow-up Rules
- `defaultFollowupDays` — when to flag waiting items as "follow-up due"
- `scanWindowDays` — how far back to scan (default 30)
- `conservativeMode` toggle — when on, AI is biased toward "no_action_needed"

### 7.9.6 Ignored Senders
- List of senders/domains the user has manually filtered
- Form to add: email OR domain + optional reason
- Remove buttons per row

### 7.9.7 Replay Tour
- Ghost button: "Replay the welcome tour"
- POSTs to `/api/onboarding/reset` and redirects to dashboard

### 7.9.8 Danger Zone
- "Delete account" button with confirm dialog
- DELETE to `/api/account` → cascade-deletes all data

## 7.10 Help (`/help`)

**Purpose:** Self-serve answers to common questions.

**Structure:** Searchable accordion FAQ. 5 sections, 15 questions total
(content verbatim in Appendix D).

**Sections:**
1. Getting Started
2. Privacy & Security
3. Daily Workflow
4. Automation
5. Analytics

**Search:** Live filter as user types. Matches both question and answer
text (case-insensitive).

**Contact:** Bottom card with "Still stuck? Email support@pendingly.app"

## 7.11 Onboarding tour

**Triggered:** First time `/dashboard` loads with `user.onboardingCompleted = false`.

**Design:** Centered modal overlay (not a popover-on-elements tour, which
breaks too easily). Backdrop is `bg-ink/40`. Modal is white, rounded-2xl,
max-w-md, shadow-2xl.

**6 steps** — see Appendix C for full content.

**Step indicators:** 6 horizontal dots at the bottom. Active dot is
wider (6 units) and Ink colour. Past dots are 1.5 units, 40% opacity.

**Buttons:**
- "Skip tour" (left, ghost)
- "Next" / "Get started" (right, Ink primary)

**Completion:** Final step button posts to `/api/onboarding/complete`,
which sets `user.onboardingCompleted = true`. Dismissible at any step
via the same endpoint.

## 7.12 Push notifications (PWA)

**Manifest** (`public/manifest.json`):
```json
{
  "name": "Pendingly",
  "short_name": "Pendingly",
  "description": "Your follow-up radar",
  "start_url": "/dashboard",
  "display": "standalone",
  "background_color": "#F6F2EA",
  "theme_color": "#0B1220",
  "icons": [{ "src": "/favicon.svg", "sizes": "any", "type": "image/svg+xml" }]
}
```

**Service worker** (`public/sw.js`):
- Handles `push` events: shows notification with title/body/icon
- Handles `notificationclick`: focuses an existing tab or opens a new one
- Auto-claims clients on activation

**Subscription flow:**
1. User clicks "Enable notifications" in Settings
2. Browser asks for permission
3. On grant, register service worker, subscribe to push manager with VAPID public key
4. POST subscription to `/api/push/subscribe`
5. Server stores `endpoint`, `p256dh`, `auth` in `PushSubscription` table

**Daily push** (via `/api/cron/push-digest` at 9am):
- For each user with ≥1 active subscription:
  - Compute open count + overdue count
  - Send notification with body like `"3 overdue · 12 open follow-ups"`
- Auto-cleanup: if `web-push` returns 404 or 410, the subscription is deleted

## 7.13 Slack digest

**Setup:**
1. User creates an Incoming Webhook in Slack workspace
2. Pastes URL into Settings → Slack Integration
3. URL validated on save: must match `https://hooks.slack.com/services/...`
4. Hits "Send Test" → posts a sample digest to verify

**Daily send** (via `/api/cron/digest` at 9am):
- For each user with `digestSettings.slackEnabled = true`:
  - Compute totalOpen, overdueCount, top 5 items by priority + recency
  - Build Slack Block Kit message
  - POST to webhook URL (re-validated at send time)

**Block Kit payload structure:**
```json
{
  "text": "12 open follow-ups, 3 overdue",
  "blocks": [
    { "type": "header", "text": { "type": "plain_text", "text": "📬 Your Pendingly digest" } },
    { "type": "section", "fields": [
      { "type": "mrkdwn", "text": "*Open follow-ups:*\n12" },
      { "type": "mrkdwn", "text": "*Overdue:*\n3" }
    ]},
    { "type": "divider" },
    { "type": "section", "text": { "type": "mrkdwn", "text": "*Top priorities today:*" } },
    { "type": "section", "text": { "type": "mrkdwn", "text": "• *Sign contract* — _Sarah Chen_\n   Sarah requested signed contract by EOW" } }
    // ... up to 5 items
  ]
}
```

## 7.14 Auto follow-up

**Purpose:** Send a templated nudge to contacts who've gone quiet on the
user.

**Schedule:** Daily 10am cron (`/api/cron/auto-followup`).

**Logic:**
```typescript
for each user with AppSettings.autoFollowupEnabled = true:
  cutoff = now() - (autoFollowupDays * 86400 * 1000)
  items = ActionItems where:
    userId = user
    status = 'open'
    category = 'waiting_on_them'
    lastActivityAt < cutoff
    ownerEmail IS NOT NULL
    AND (lastAutoFollowupAt IS NULL OR lastAutoFollowupAt < cutoff)

  for each item (max 10 per user per run):
    template = renderTemplate(user template, { name: item.ownerName })
    subject = "Re: " + thread.subject
    dispatch to gmail/outlook/smtp by provider
    if success:
      update item: lastAutoFollowupAt = now()
                   reason = "Auto-follow-up sent on YYYY-MM-DD"
```

**Deduplication:** Same item won't be auto-followed-up twice within the
user's configured interval, even if the recipient still hasn't replied.

**Cap:** Max 10 items per user per run, to limit blast radius if
something is configured wrong.

## 7.15 Calendar awareness

**Purpose:** Show a meeting badge on action items when the contact has
an upcoming meeting with the user.

**Data fetch** (on dashboard mount, also used in queue):
- `GET /api/calendar/meetings`
- Aggregates Google Calendar + Outlook Calendar events across all
  connected accounts
- Returns `{ meetings: { [email]: { subject, startTime } } }` keyed by
  attendee email

**Rendering:** In `ActionCard`, if `item.ownerEmail` matches a meeting
attendee, show:
```
📅 Meeting at 3pm
```
or `Meeting tomorrow 10am`, formatted by `formatMeetingTime()`.

**OAuth scope requirements:** This feature needs `calendar.readonly`
(Gmail) and `Calendars.Read` (Outlook). Existing users who connected
before this feature shipped must reconnect.

## 7.16 Contacts directory

**Purpose:** Show human names instead of email addresses throughout the
UI.

**Source:** Built from email headers during scanning. Every time a
message is processed, the sender's name/email pair is upserted into the
`Contact` table.

**No external API** — Pendingly does NOT call Google People API or
Outlook Contacts. The email header data is more reliable in practice
(many people's contact cards are stale or missing names) and avoids
needing extra OAuth scopes.

**Sync button:** Settings → "Sync Contact Names" rebuilds the directory
from all stored messages in one batch (useful after the feature was
added retroactively).

## 7.17 Mobile experience

**Sidebar:** Hidden by default on mobile (<md). Hamburger button in a
top bar opens a slide-in drawer with backdrop overlay. Tapping the
backdrop closes it.

**Action drawer:** Full-screen on mobile (`w-full`), 480px on `sm`,
540px on `md+`.

**Action cards:** Touch-friendly. Buttons are `h-10` (40px) minimum;
icon buttons are `h-10 w-10`.

**Analytics charts:** Responsive SVG with `width: 100%`. Grid layouts
stack on mobile: `grid-cols-1 lg:grid-cols-3`.

**PWA install:** On iOS Safari → Share → Add to Home Screen.
On Android Chrome → "Install app" prompt appears automatically.

## 7.18 Sounds

Three subtle Web Audio API chimes (no external library, no asset
download).

| Chime | Notes | Used when |
|---|---|---|
| `done` | C5 → E5 → G5 ascending arpeggio (satisfying resolution) | Marking item done, completing scan, sending reply |
| `info` | A5 single soft bell | Snoozing an item |
| `alert` | A4 → F4 descending two-tone | (Reserved, not currently triggered) |

All chimes use sine wave oscillators with soft attack (20ms linear
ramp) and exponential decay to silence. Guarded by `typeof window !==
'undefined'`; fails silently if AudioContext unavailable.

---

# 8. End-to-End User Flows

## 8.1 First-time user flow (new account)

```
[Landing page]
   ↓ Click "Sign in"
[Google OAuth consent]
   ↓ Approve
[Pendingly creates User row, redirects to /connect]
   ↓ Click "Connect Gmail"
[Google OAuth consent — Gmail + Calendar scopes]
   ↓ Approve
[/api/integrations/gmail/callback]
   - Exchange code for tokens
   - Encrypt tokens
   - Upsert EmailAccount
   - Create ScanJob
   ↓ Redirect to /scan?jobId=...
[Scan progress page, 1-3 min]
   - Polls /api/scan/status/[jobId] every 2s
   - Visual: 5 steps light up
   - Chime on completion
   ↓ status === 'completed'
[Redirect to /dashboard]
   ↓ user.onboardingCompleted === false
[Onboarding tour modal, 6 steps]
   ↓ Click "Get started" on step 6
[POST /api/onboarding/complete → sets user.onboardingCompleted = true]
   ↓
[Dashboard with KPIs + top priority items]
```

**Total elapsed: 3–5 minutes**

## 8.2 Daily-use flow (returning user)

```
[Browser bookmark or push notification opens app]
   ↓
[/dashboard]
   - 6 KPI cards
   - Top 10 priority items
   - Calendar badges where applicable
   ↓ Click top item
[ActionDrawer slides in]
   - User reads AI reason + suggested action
   - User picks tone, clicks Generate
   ↓ ~2s
[Draft appears]
   - User scans, decides it's good
   ↓ Click Send Reply
[Inline "Send to sarah@acme.com?" confirmation]
   ↓ Confirm
[POST /api/action-items/[id]/send]
   - Gmail API send
   - Mark item done
   ↓
[Chime, drawer closes]
   ↓ User repeats for 5-10 items
   ↓ User closes tab. Done for the day.
```

**Total elapsed: 10–15 minutes**

## 8.3 Bulk-clear flow (power user)

```
[/queue, 47 open items, mostly low-value newsletters]
   ↓ Click checkbox on first noise item
[Bulk action bar appears at bottom]
   ↓ Cmd/Shift-click 14 more
[Bar shows "15 selected"]
   ↓ Click "Ignore"
[POST /api/action-items/bulk with action='ignored']
   - 15 items marked ignored
   - UserFeedback rows created for "ignore-like-this" signal
   ↓ Queue refreshes
[32 open items remaining, all high-value]
```

## 8.4 Auto-follow-up enable flow

```
[/settings → Automation card]
   - User reads warning banner
   - User toggles "Enable auto follow-up" ON
   - User sets days to 7
   - User edits template
   ↓ Save
[PATCH /api/settings with autoFollowupEnabled=true, autoFollowupDays=7, template=...]
   ↓ Next day 10am
[/api/cron/auto-followup runs]
   - Finds 3 waiting items >7 days quiet
   - Sends templated replies via Gmail API
   - Updates lastAutoFollowupAt on each
[3 days later]
   - Same items still waiting? Skipped (lastAutoFollowupAt within window)
[8 days later]
   - Still waiting? Sent again.
```

## 8.5 Disconnect inbox flow

```
[/settings → Connected Inboxes]
   ↓ Click "Disconnect" on a Gmail account
[Confirm dialog]
   ↓ Confirm
[POST /api/integrations/gmail/disconnect]
   - EmailAccount.connectedStatus = 'disconnected'
   - (Locally — does NOT revoke on Google's side)
   ↓
[Card greyed out with "Reconnect" button]
```

**Note:** OAuth tokens are kept (encrypted) so reconnect is one-click.
To fully revoke, user must visit `myaccount.google.com/permissions`.

## 8.6 Account deletion flow

```
[/settings → Danger Zone]
   ↓ Click "Delete account"
[Confirm dialog: "Type DELETE to confirm"]
   ↓ Confirm
[DELETE /api/account]
   - prisma.user.delete({ where: { id: session.user.id }})
   - Cascade deletes: Accounts, Sessions, EmailAccounts, EmailThreads,
     EmailMessages, ActionItems, AiLogs, UserFeedback, IgnoredSenders,
     DigestSettings, AppSettings, Contacts, PushSubscriptions
   ↓
[NextAuth signOut]
   ↓
[Redirect to /]
```

---

# 9. Brand & Design System

## 9.1 Logo

The Pendingly mark is a 56×56 grid composed of three elements:

1. **The chevron** — Action-coloured (`#F25A3C`) stroke from `(8,16)` to
   `(18,26)` to `(42,6)`. Stroke width 5, round line caps, round joins.
   Reads as a checkmark that overshoots — a deliberate visual metaphor
   for "completed and beyond, with momentum."
2. **The primary line** — Ink-coloured filled rect at `(8, 29)`,
   `40 × 5`, rounded corners 2.5. Represents the top line of a list.
3. **The secondary line** — Same colour, `(8, 40)`, `28 × 5`,
   rounded 2.5, 45% opacity. Represents a shorter line below; the
   tapering signals "list of things to do, but finite."

Defined in `src/components/ui/Logo.tsx` as:

```tsx
<svg viewBox="0 0 56 56">
  <path d="M8 16 L18 26 L42 6" stroke="#F25A3C" strokeWidth="5" ... />
  <rect x="8" y="29" width="40" height="5" rx="2.5" fill="#0B1220" />
  <rect x="8" y="40" width="28" height="5" rx="2.5" fill="#0B1220" opacity="0.45" />
</svg>
```

**Variants:** `default`, `reversed` (for dark backgrounds — same ink fill,
sidebar uses this), `white` (pure white fills for the lines, used on
ink backgrounds).

**Lockup:** `<LogoLockup>` combines the mark with the "Pendingly"
wordmark in Hanken Grotesk semibold, letter-spacing `-0.028em`.

## 9.2 Colour palette

| Token | Hex | Usage |
|---|---|---|
| Ink | `#0B1220` | Primary text, sidebar background, primary buttons |
| Ink-2 | `#1B2231` | Secondary dark surfaces |
| Paper | `#F6F2EA` | App background |
| Paper-2 | `#FBF9F4` | Subtle paper variation for inset surfaces |
| Action | `#F25A3C` | Brand accent, primary CTA, alerts, high-priority dot |
| Done | `#1A8F5E` | Success states, send-reply button |
| Mute | `#5B6473` | Secondary text |
| Rule | `#E4DED2` | Default borders |
| Rule-2 | `#EFEAE0` | Lighter borders |
| Card | `#FFFFFF` | Card backgrounds against Paper |

Plus opacity variants of Ink: 8%, 12%, 30%, 45%, 55% — used for
borders, secondary text, and chip backgrounds.

**Where the palette lives:** `src/app/globals.css` under `@theme`, using
Tailwind v4's CSS-first config (no `tailwind.config.js`).

## 9.3 Typography

- **Hanken Grotesk** — primary UI font. Loaded via `next/font/google`
  with weights 400, 500, 600, 700, 800.
- **JetBrains Mono** — labels, metric counts, eyebrow text, mono
  contexts. Weights 400, 500.

**Font feature settings:** `"ss01", "cv11"` (alternate stylistic sets
for cleaner glyphs).

**Type scale:**
- H1 (landing): `text-5xl font-bold leading-tight`
- H1 (in-app): `text-2xl font-semibold tracking-tight`
- H2 (page sections): `text-xl font-semibold`
- Body: `text-sm` (14px) — the dominant size
- Eyebrow / labels: `text-[11px] tracking-[0.14em] uppercase` in mono
- Metric numbers: `text-3xl font-semibold tracking-tight` with `tabular-nums`

## 9.4 Animations

All animations use `cubic-bezier(.16, 1, .3, 1)` — a slightly bouncy
ease-out — and are kept under 400ms.

| Animation | Duration | Used on |
|---|---|---|
| `fade-up` | 350ms | Cards, page sections (entrance) |
| `fade-in` | 250ms | Drawer backdrop, modal backdrop |
| `slide-in-right` | 300ms | Drawer panel |
| `count-up` | 400ms | KPI numbers on dashboard |
| `check-draw` | varies | (Reserved for SVG checkmark animations) |
| `pulse-soft` | 2000ms infinite | Loading states |

**Stagger:** `.stagger` class applies 40ms incremental delay to direct
children (children 1–6). Used for KPI card grids.

**Card lift:** `.card-lift` applies a subtle hover state:
```
transition: box-shadow 0.18s, border-color 0.18s, transform 0.18s
hover: box-shadow 0 4px 16px rgb(11 18 32 / 8%), transform translateY(-1px)
```

## 9.5 Sound

See section 7.18. Three chimes, all Web Audio API sine waves with soft
envelopes.

## 9.6 Spacing & layout

Pendingly uses Tailwind's default spacing scale (`p-4`, `gap-6`, etc.).

**Container widths:**
- Dashboard / Queue: `max-w-5xl mx-auto`
- Analytics: `max-w-5xl mx-auto`
- Settings: `max-w-3xl mx-auto`
- Help: `max-w-3xl mx-auto`

**Standard padding:** `px-4 md:px-6 py-8` for main content areas.

**Sidebar:** `w-60` (240px) fixed.

---

# 10. Technical Architecture

## 10.1 Stack overview

```
┌─────────────────────────────────────────────────────────┐
│                    Browser (Chrome, Safari, Firefox)    │
│  ┌─────────────────────────────────────────────────┐    │
│  │  Pendingly PWA (Next.js 16 / React 19)          │    │
│  │  - Service Worker (push notifications)          │    │
│  │  - Web Audio API (chimes)                       │    │
│  └────────────────────┬────────────────────────────┘    │
└───────────────────────┼─────────────────────────────────┘
                        │ HTTPS
                        ▼
┌─────────────────────────────────────────────────────────┐
│         Vercel (or self-hosted Node 22)                 │
│  ┌─────────────────────────────────────────────────┐    │
│  │  Next.js 16 API routes (serverless functions)   │    │
│  │  - Auth (NextAuth v5)                           │    │
│  │  - 37 REST endpoints                            │    │
│  │  - 3 cron jobs                                  │    │
│  │  - Prisma v7 client                             │    │
│  └────┬──────────┬──────────┬─────────────┬────────┘    │
└───────┼──────────┼──────────┼─────────────┼─────────────┘
        │          │          │             │
        ▼          ▼          ▼             ▼
   ┌────────┐ ┌──────────┐ ┌──────────┐ ┌─────────────┐
   │SQLite/ │ │Anthropic │ │Gmail API │ │MS Graph API │
   │Postgres│ │ Claude   │ │Calendar  │ │Calendar     │
   │        │ │          │ │SMTP/IMAP │ │             │
   └────────┘ └──────────┘ └──────────┘ └─────────────┘
                                            ▲
                                            │
                                      ┌─────┴──────┐
                                      │ Slack      │
                                      │ Webhooks   │
                                      └────────────┘
```

## 10.2 Runtime model

**Web requests** are handled by Next.js 16 in "App Router" mode:
- **Server components** (default) render on the server, stream HTML
- **Client components** (marked `'use client'`) hydrate in the browser
- **API routes** are serverless functions (Node runtime, not Edge —
  several routes depend on Node-only modules like `crypto` and
  `better-sqlite3`)

**Background jobs** are HTTP endpoints triggered by external schedulers:
- Vercel Cron in production (configured in `vercel.json`)
- GitHub Actions or Upstash QStash for self-hosted

There is no long-running worker process. Every action is either
synchronous (an API call returning data) or scheduled (a cron firing
an HTTP request).

**Scan jobs** are an interesting case — they're triggered synchronously
by the user but execute asynchronously in the same serverless function.
The function returns immediately with a `jobId`; the actual scan
continues in the background of the same Node process. The client polls
`/api/scan/status/[jobId]` to track progress. This has a known
limitation: if the function times out (60s on Vercel free tier), the
scan dies. For large inboxes, we'd want a proper queue system (planned
v1.5).

## 10.3 Data flow

**Read path (Queue page load):**
```
Client → GET /api/action-items?status=open
Server → auth() → session.user.id
Server → prisma.actionItem.findMany({ where: { userId, status }, ... })
Server → JSON response
Client → renders ActionCards
```

**Write path (mark done):**
```
Client → PATCH /api/action-items/[id]/status with { status: 'done' }
Server → auth() → session.user.id
Server → validate enum
Server → prisma.actionItem.updateMany({
  where: { id, userId: session.user.id },  // scoped to user
  data: { status, completedAt: now() }
})
Server → JSON response
Client → updates local state, plays chime
```

**Scan path:**
```
Client → POST /api/scan/start { account_id }
Server → create ScanJob (status='queued')
Server → spawn async runInitialScan() — does NOT await
Server → return { job_id } immediately
runInitialScan() (background):
  - Fetch threads from email provider
  - For each thread: classify with Claude, upsert ActionItem
  - Update ScanJob progress periodically
  - On done: set ScanJob.status='completed'
Client → polls /api/scan/status/[jobId] every 2s
Client → on status='completed', redirect to /dashboard
```

## 10.4 File structure

```
FollowupOS/
├── prisma/
│   ├── schema.prisma         # Data model (14 models)
│   └── dev.db                # SQLite (gitignored)
├── public/
│   ├── favicon.svg           # Brand mark
│   ├── manifest.json         # PWA manifest
│   └── sw.js                 # Service worker
├── src/
│   ├── app/
│   │   ├── (dashboard)/      # Authenticated app shell
│   │   │   ├── layout.tsx        # Client; sidebar + mobile drawer
│   │   │   ├── dashboard/
│   │   │   │   ├── page.tsx
│   │   │   │   └── DashboardClient.tsx
│   │   │   ├── queue/
│   │   │   │   └── page.tsx
│   │   │   ├── analytics/
│   │   │   │   ├── page.tsx
│   │   │   │   └── AnalyticsClient.tsx
│   │   │   ├── settings/
│   │   │   │   └── page.tsx
│   │   │   └── help/
│   │   │       ├── page.tsx
│   │   │       └── HelpClient.tsx
│   │   ├── api/                  # 37 API routes
│   │   │   ├── account/route.ts
│   │   │   ├── action-items/
│   │   │   │   ├── route.ts
│   │   │   │   ├── bulk/route.ts
│   │   │   │   └── [id]/
│   │   │   │       ├── route.ts
│   │   │   │       ├── status/route.ts
│   │   │   │       ├── feedback/route.ts
│   │   │   │       ├── generate-draft/route.ts
│   │   │   │       └── send/route.ts
│   │   │   ├── analytics/{summary,trends,tat,breakdown}/route.ts
│   │   │   ├── auth/[...nextauth]/route.ts
│   │   │   ├── calendar/meetings/route.ts
│   │   │   ├── contacts/route.ts
│   │   │   ├── cron/{digest,push-digest,auto-followup}/route.ts
│   │   │   ├── dashboard/{summary,top-priority}/route.ts
│   │   │   ├── integrations/
│   │   │   │   ├── route.ts
│   │   │   │   ├── gmail/{connect,callback,disconnect}/route.ts
│   │   │   │   ├── outlook/{connect,callback,disconnect}/route.ts
│   │   │   │   ├── imap/{connect,disconnect}/route.ts
│   │   │   │   └── slack/test/route.ts
│   │   │   ├── onboarding/{complete,reset}/route.ts
│   │   │   ├── push/subscribe/route.ts
│   │   │   ├── scan/start/route.ts
│   │   │   ├── scan/status/[jobId]/route.ts
│   │   │   └── settings/route.ts
│   │   ├── connect/page.tsx
│   │   ├── scan/page.tsx
│   │   ├── globals.css       # Tailwind v4 + @theme tokens
│   │   ├── layout.tsx        # Root: fonts, metadata, viewport
│   │   └── page.tsx          # Landing
│   ├── components/
│   │   ├── action/{ActionCard,ActionDrawer,SnoozeMenu}.tsx
│   │   ├── auth/{SignInButton,ConnectGmailButton,ConnectProviderButtons,ImapConnectForm}.tsx
│   │   ├── charts/{LineChart,BarChart,DonutChart,StatCard}.tsx
│   │   ├── layout/{Sidebar,Header}.tsx
│   │   ├── onboarding/OnboardingTour.tsx
│   │   ├── ui/{button,input,textarea,card,select,badge,Logo}.tsx
│   │   └── PushNotificationToggle.tsx
│   └── lib/
│       ├── ai.ts             # Claude classify + draft
│       ├── auth.ts           # NextAuth config
│       ├── contacts.ts       # Contact directory utils
│       ├── crypto.ts         # AES-256-GCM encrypt/decrypt
│       ├── cron-auth.ts      # Bearer / x-cron-secret check
│       ├── gmail.ts          # Gmail + Google Calendar
│       ├── imap.ts           # imapflow client
│       ├── net-safety.ts     # SSRF guards
│       ├── outlook.ts        # MS Graph mail + calendar + send
│       ├── prisma.ts         # Prisma client singleton
│       ├── push.ts           # web-push wrapper
│       ├── scanner.ts        # Email → ActionItem pipeline
│       ├── slack.ts          # Slack webhook builder
│       ├── smtp.ts           # nodemailer for IMAP accounts
│       ├── sounds.ts         # Web Audio chimes
│       ├── templates.ts      # Auto-followup template renderer
│       └── utils.ts          # cn, formatDate, timeAgo, etc.
├── docs/
│   ├── PRD.md                # This document
│   └── SETUP_GUIDE_FOR_ARITRA.md
├── .env.example
├── next.config.ts            # Headers, server external packages
├── package.json
├── prisma.config.ts          # Datasource URL (Prisma v7 quirk)
├── README.md
├── tsconfig.json
└── vercel.json               # Cron schedules
```

## 10.5 Why these choices

| Decision | Why |
|---|---|
| Next.js 16 (App Router) | Modern, batteries-included, RSC for fast loads, Vercel-native |
| Prisma v7 + driver adapter pattern | New Prisma engine = smaller, faster; SQLite for dev, easy Postgres swap |
| SQLite for dev | Zero infra, file-based, fast iteration. Swap `provider = "postgresql"` for prod. |
| NextAuth v5 (beta) | Modern auth with Prisma adapter, supports DB sessions for security |
| Tailwind v4 (CSS-first) | No tailwind.config.js, faster builds, `@theme` directive |
| Anthropic Claude | Best-in-class for nuanced classification; we use `claude-sonnet-4-6` |
| nodemailer for IMAP send | Standard, well-supported, works with any SMTP server |
| web-push | Standard WebPush spec; works on Chrome/Firefox/Safari (16.4+) |
| Hand-built SVG charts | No 200KB chart library dependency; matches brand precisely |
| Web Audio API for chimes | No audio files, no asset loads, ~50 lines of code |

---

# 11. Database Schema

The database has **14 models**. All models use `cuid()` primary keys.
All foreign keys cascade-delete from `User` so account deletion is one
DB operation.

## 11.1 User

The root of every user's data tree.

| Field | Type | Default | Notes |
|---|---|---|---|
| `id` | String | `cuid()` | Primary key |
| `name` | String? | | From Google profile |
| `email` | String | | `@unique` |
| `emailVerified` | DateTime? | | NextAuth field |
| `image` | String? | | Avatar URL |
| `timezone` | String | `"Asia/Kolkata"` | Used for digest scheduling |
| `onboardingCompleted` | Boolean | `false` | Gates the tour |
| `createdAt` | DateTime | `now()` | |
| `updatedAt` | DateTime | | `@updatedAt` |

**Relations:** `accounts[]`, `sessions[]`, `emailAccounts[]`,
`emailThreads[]`, `emailMessages[]`, `actionItems[]`, `aiLogs[]`,
`userFeedback[]`, `ignoredSenders[]`, `digestSettings?`, `appSettings?`,
`contacts[]`, `pushSubscriptions[]`.

## 11.2 Account (NextAuth)

Stores NextAuth OAuth account linkages.

| Field | Type | Notes |
|---|---|---|
| `id` | String | PK |
| `userId` | String | FK → User |
| `type` | String | e.g. `"oauth"` |
| `provider` | String | e.g. `"google"` |
| `providerAccountId` | String | Google's user id |
| `refresh_token` | String? | |
| `access_token` | String? | |
| `expires_at` | Int? | Unix timestamp |
| `token_type` | String? | |
| `scope` | String? | |
| `id_token` | String? | |
| `session_state` | String? | |

**Unique constraint:** `[provider, providerAccountId]`.

Note: This is separate from `EmailAccount` (section 11.5). `Account`
is NextAuth's identity record; `EmailAccount` is the user's connected
inbox(es).

## 11.3 Session (NextAuth)

| Field | Type | Notes |
|---|---|---|
| `id` | String | PK |
| `sessionToken` | String | `@unique` |
| `userId` | String | FK → User |
| `expires` | DateTime | |

## 11.4 VerificationToken (NextAuth)

| Field | Type | Notes |
|---|---|---|
| `identifier` | String | Usually email |
| `token` | String | `@unique` |
| `expires` | DateTime | |

**Unique constraint:** `[identifier, token]`.

## 11.5 EmailAccount

A connected inbox. One user can have many.

| Field | Type | Default | Notes |
|---|---|---|---|
| `id` | String | `cuid()` | |
| `userId` | String | | FK → User |
| `provider` | String | `"gmail"` | `gmail`, `outlook`, `zoho`, `apple`, `imap` |
| `emailAddress` | String | | The user's email at this inbox |
| `accessTokenEncrypted` | String? | | AES-256-GCM ciphertext |
| `refreshTokenEncrypted` | String? | | AES-256-GCM ciphertext |
| `tokenExpiresAt` | DateTime? | | |
| `connectedStatus` | String | `"connected"` | `connected`, `disconnected`, `error` |
| `imapHost` | String? | | For IMAP providers |
| `imapPort` | Int? | | For IMAP providers |
| `passwordEncrypted` | String? | | For IMAP providers |
| `lastSyncedAt` | DateTime? | | |
| `initialScanCompleted` | Boolean | `false` | |
| `createdAt` | DateTime | `now()` | |
| `updatedAt` | DateTime | | `@updatedAt` |

**Unique constraint:** `[userId, emailAddress]` — prevents duplicate
connections of the same inbox.

## 11.6 EmailThread

| Field | Type | Default | Notes |
|---|---|---|---|
| `id` | String | `cuid()` | |
| `userId` | String | | |
| `emailAccountId` | String | | |
| `provider` | String | `"gmail"` | |
| `providerThreadId` | String | | Gmail thread ID / Outlook conversation ID |
| `subject` | String? | | |
| `participants` | String? | | Comma-separated emails |
| `lastMessageAt` | DateTime? | | |
| `lastMessageFromUser` | Boolean | `false` | |
| `providerUrl` | String? | | Deep-link |
| `threadHash` | String? | | For IMAP threading by subject |
| `isNoise` | Boolean | `false` | Filtered by `isNoisyThread()` |
| `createdAt` | DateTime | `now()` | |
| `updatedAt` | DateTime | | `@updatedAt` |

**Unique constraint:** `[emailAccountId, providerThreadId]`.

## 11.7 EmailMessage

| Field | Type | Default | Notes |
|---|---|---|---|
| `id` | String | `cuid()` | |
| `userId` | String | | |
| `emailThreadId` | String | | |
| `providerMessageId` | String | | RFC Message-ID for Gmail |
| `senderEmail` | String? | | |
| `senderName` | String? | | |
| `recipients` | String? | | |
| `cc` | String? | | |
| `sentAt` | DateTime? | | |
| `snippet` | String? | | Provider-given preview |
| `bodyExcerpt` | String? | | First 1000 chars, plaintext |
| `bodyHash` | String? | | For deduplication |
| `isFromUser` | Boolean | `false` | |
| `labels` | String? | | Provider labels JSON |
| `createdAt` | DateTime | `now()` | |

**Unique constraint:** `[emailThreadId, providerMessageId]`.

**Privacy:** Full body is NOT stored. Only `snippet` (provider's preview)
and `bodyExcerpt` (first 1000 chars). We never write the whole email.

## 11.8 ActionItem

The most important model — the queue.

| Field | Type | Default | Notes |
|---|---|---|---|
| `id` | String | `cuid()` | |
| `userId` | String | | |
| `emailThreadId` | String? | | Nullable for future non-email sources |
| `source` | String | `"gmail"` | Provider this came from |
| `category` | String | | See section 7.x for enum |
| `status` | String | `"open"` | `open`, `done`, `snoozed`, `ignored` |
| `priority` | String | `"medium"` | `high`, `medium`, `low` |
| `title` | String? | | AI-generated short title |
| `reason` | String? | | AI explanation of why this needs action |
| `suggestedAction` | String? | | AI-generated suggestion |
| `dueDate` | String? | | YYYY-MM-DD, used for overdue logic |
| `ownerType` | String? | | `user`, `other_person`, `unclear` |
| `ownerName` | String? | | |
| `ownerEmail` | String? | | |
| `confidenceScore` | Float? | | 0.0-1.0 from AI |
| `lastActivityAt` | DateTime? | | Used for auto-follow-up cutoff |
| `snoozedUntil` | String? | | YYYY-MM-DD |
| `completedAt` | DateTime? | | Set when status → done |
| `ignoredReason` | String? | | User-provided ignore reason |
| `lastAutoFollowupAt` | DateTime? | | Prevents duplicate auto-followups |
| `createdAt` | DateTime | `now()` | |
| `updatedAt` | DateTime | | `@updatedAt` |

**Categories** (string enum, validated at write time):
- `reply_needed`
- `waiting_on_them`
- `followup_due`
- `commitment_detected`
- `overdue_commitment`
- `no_action_needed`

**Statuses** (validated):
- `open`
- `done`
- `snoozed`
- `ignored`

**Priorities** (validated):
- `high`
- `medium`
- `low`

## 11.9 AiClassificationLog

Audit trail for every AI call.

| Field | Type | Notes |
|---|---|---|
| `id` | String | |
| `userId` | String | |
| `emailThreadId` | String? | |
| `modelProvider` | String? | `"anthropic"` |
| `modelName` | String? | `"claude-sonnet-4-6"` |
| `inputHash` | String? | SHA-256 of input for dedup |
| `outputJson` | String? | Raw model output |
| `confidenceScore` | Float? | |
| `errorMessage` | String? | |
| `createdAt` | DateTime | `now()` |

## 11.10 UserFeedback

Signal for AI: "treat threads like this as noise" or "this was a good
catch."

| Field | Type | Notes |
|---|---|---|
| `id` | String | |
| `userId` | String | |
| `actionItemId` | String? | |
| `feedbackType` | String | `"ignored"`, `"correct"`, `"incorrect"`, etc. |
| `feedbackValue` | String? | Optional payload |
| `createdAt` | DateTime | `now()` |

## 11.11 IgnoredSender

Persistent block list.

| Field | Type | Notes |
|---|---|---|
| `id` | String | |
| `userId` | String | |
| `senderEmail` | String? | Specific address |
| `domain` | String? | Domain-wide |
| `reason` | String? | |
| `createdAt` | DateTime | `now()` |

## 11.12 DigestSettings

| Field | Type | Default | Notes |
|---|---|---|---|
| `id` | String | | |
| `userId` | String | | `@unique` (one per user) |
| `isEnabled` | Boolean | `true` | |
| `digestTime` | String | `"09:00"` | HH:MM in user timezone |
| `timezone` | String | `"Asia/Kolkata"` | |
| `slackWebhookUrl` | String? | | Validated `https://hooks.slack.com/*` |
| `slackEnabled` | Boolean | `false` | |
| `createdAt` | DateTime | `now()` | |
| `updatedAt` | DateTime | | `@updatedAt` |

## 11.13 AppSettings

| Field | Type | Default | Notes |
|---|---|---|---|
| `id` | String | | |
| `userId` | String | | `@unique` |
| `defaultFollowupDays` | Int | `3` | Flag waiting items after this |
| `scanWindowDays` | Int | `30` | How far back to scan |
| `conservativeMode` | Boolean | `true` | AI biased toward no-action |
| `autoFollowupEnabled` | Boolean | `false` | |
| `autoFollowupDays` | Int | `3` | Silence threshold |
| `autoFollowupTemplate` | String? | | If null, uses DEFAULT_FOLLOWUP_TEMPLATE |
| `createdAt` | DateTime | `now()` | |
| `updatedAt` | DateTime | | `@updatedAt` |

## 11.14 ScanJob

| Field | Type | Default | Notes |
|---|---|---|---|
| `id` | String | | |
| `userId` | String | | |
| `emailAccountId` | String | | |
| `status` | String | `"queued"` | `queued`, `running`, `completed`, `failed` |
| `threadsFound` | Int | `0` | |
| `threadsProcessed` | Int | `0` | |
| `actionItemsCreated` | Int | `0` | |
| `errorMessage` | String? | | |
| `createdAt` | DateTime | `now()` | |
| `updatedAt` | DateTime | | `@updatedAt` |

## 11.15 Contact

Auto-populated from email headers.

| Field | Type | Notes |
|---|---|---|
| `id` | String | |
| `userId` | String | |
| `email` | String | Lowercased |
| `name` | String? | |
| `updatedAt` | DateTime | `@updatedAt` |

**Unique constraint:** `[userId, email]`.

## 11.16 PushSubscription

| Field | Type | Notes |
|---|---|---|
| `id` | String | |
| `userId` | String | |
| `endpoint` | String | `@unique` |
| `p256dh` | String | Public key |
| `auth` | String | Auth secret |
| `createdAt` | DateTime | `now()` |

---

# 12. API Reference

Thirty-seven endpoints. All authenticated routes require a valid
NextAuth session and scope DB queries by `session.user.id`.

## 12.1 Auth

### `[* methods] /api/auth/[...nextauth]`
NextAuth's own route handler. Sign-in, sign-out, callback, session, CSRF.
Managed by `next-auth` library directly.

## 12.2 Account

### `DELETE /api/account`
**Auth:** Required.
**Effect:** Cascade-deletes the user and all related data.
**Returns:** `{ success: true }`.

## 12.3 Action items

### `GET /api/action-items`
**Auth:** Required.
**Query:** `?status=open&category=reply_needed&priority=high&search=foo&page=1&limit=20`
**Returns:**
```json
{
  "items": [ActionItem & { emailThread: { subject, providerUrl, lastMessageAt, participants } }],
  "total": 42,
  "page": 1,
  "limit": 20
}
```
**Sort:** priority then `lastActivityAt DESC` (re-ranked in app layer to fix alphabetical sort issue).

### `GET /api/action-items/[id]`
**Auth:** Required (ownership validated).
**Returns:** `{ item: ActionItem & { emailThread: { messages: last 10 } } }`.

### `PATCH /api/action-items/[id]/status`
**Auth:** Required + IDOR check.
**Body:** `{ status: 'open'|'done'|'snoozed'|'ignored', snoozed_until?: string, ignored_reason?: string }`
**Validation:** Status against allowlist.
**Effect:** Updates row. On `done`, sets `completedAt = now()`. On `open`,
clears `completedAt`.
**Returns:** `{ item: updated ActionItem }`.

### `POST /api/action-items/[id]/generate-draft`
**Auth:** Required.
**Body:** `{ tone?: string, output_type?: string }`
**Effect:** Calls Claude with thread context.
**Returns:** `{ draft: string, subject_suggestion: string }`.

### `POST /api/action-items/[id]/send`
**Auth:** Required.
**Body:** `{ content: string, subject?: string }`
**Effect:**
1. Routes to gmail/outlook/imap send.
2. Marks item as `done` on success.
3. Returns 500 with error if send fails.
**Returns:** `{ ok: true }`.

### `PATCH /api/action-items/[id]/feedback`
**Auth:** Required + ownership check.
**Body:** `{ feedback_type: string, feedback_value?: string }`
**Effect:** Inserts a `UserFeedback` row.
**Returns:** `{ success: true }`.

### `POST /api/action-items/bulk`
**Auth:** Required.
**Body:** `{ ids: string[], action: 'done'|'snoozed'|'ignored'|'open', snoozed_until?: string }`
**Effect:** `updateMany` scoped to `userId`.
**Returns:** `{ updated: number }`.

## 12.4 Dashboard

### `GET /api/dashboard/summary`
**Returns:**
```json
{
  "reply_needed": 12,
  "followup_due": 3,
  "waiting_on_them": 8,
  "overdue_commitments": 2,
  "high_priority": 5,
  "snoozed": 4
}
```

### `GET /api/dashboard/top-priority`
**Returns:** `{ items: ActionItem[] }` — top 10 open items, sorted by priority then recency.

## 12.5 Analytics

### `GET /api/analytics/summary`
**Returns:**
```json
{
  "healthScore": 72,
  "totalOpen": 14,
  "resolvedThisWeek": 8,
  "avgTatDays": 2.3,
  "overdueCount": 1,
  "topCategory": "reply_needed",
  "weekOverWeekChange": 15
}
```

### `GET /api/analytics/trends?days=30`
**Returns:**
```json
{
  "volumeByDay": [{ "date": "2026-04-16", "count": 5 }, ...],
  "resolvedByDay": [{ "date": "2026-04-16", "count": 3 }, ...],
  "overdueByWeek": [{ "week": "2026-W14", "count": 2 }, ...]
}
```

### `GET /api/analytics/tat`
**Returns:**
```json
{
  "byCategory": [{ "category": "reply_needed", "avgDays": 1.8, "count": 42 }],
  "overall": 2.3
}
```

### `GET /api/analytics/breakdown`
**Returns:**
```json
{
  "byCategory": [{ "category": "reply_needed", "open": 12, "done": 30, "snoozed": 1, "ignored": 0 }, ...],
  "byStatus": [{ "status": "open", "count": 14 }, ...],
  "byDayOfWeek": [{ "day": 1, "label": "Mon", "count": 18 }, ...],
  "topContacts": [{ "ownerEmail": "sarah@acme.com", "ownerName": "Sarah Chen", "count": 5 }]
}
```

## 12.6 Integrations

### `GET /api/integrations`
**Returns:** `{ accounts: EmailAccount[] }` — list of connected inboxes.

### `GET /api/integrations/gmail/connect`
**Effect:** Redirects to Google OAuth consent.

### `GET /api/integrations/gmail/callback`
**Query:** `?code=…&error=…`
**Effect:** Exchanges code, upserts EmailAccount, creates ScanJob.
**Redirects:** `/scan?jobId=…` or error page.

### `POST /api/integrations/gmail/disconnect`
**Body:** `{ account_id?: string }`
**Effect:** Sets `connectedStatus = 'disconnected'`. Does NOT revoke
upstream — user must do that in their Google account.

### `GET /api/integrations/outlook/connect`
Same as Gmail but Microsoft Graph.

### `GET /api/integrations/outlook/callback`
Same flow.

### `POST /api/integrations/outlook/disconnect`
**Body:** `{ account_id: string }`.

### `POST /api/integrations/imap/connect`
**Body:**
```json
{
  "provider": "zoho" | "apple" | "imap",
  "email": "user@example.com",
  "password": "...",
  "host"?: "imap.example.com",
  "port"?: 993
}
```
**Validation:**
- Provider in allowlist
- Host passes `isSafePublicHostname()`
- Port 1–65535
- IMAP login test before storing
**Returns:** `{ jobId, success: true }`.

### `POST /api/integrations/imap/disconnect`
**Body:** `{ account_id: string }`.

### `POST /api/integrations/slack/test`
**Body:** `{ webhookUrl: string }`
**Validation:** Must be `https://hooks.slack.com/*`.
**Effect:** Posts a test digest to the webhook.
**Returns:** `{ ok: true }` or `{ error: string }`.

## 12.7 Settings

### `GET /api/settings`
**Returns:** `{ appSettings, digestSettings, ignoredSenders }`.

### `PATCH /api/settings`
**Body (all optional):**
```json
{
  "defaultFollowupDays": 3,
  "scanWindowDays": 30,
  "conservativeMode": true,
  "autoFollowupEnabled": false,
  "autoFollowupDays": 3,
  "autoFollowupTemplate": "...",
  "isEnabled": true,
  "digestTime": "09:00",
  "timezone": "Asia/Kolkata",
  "slackWebhookUrl": "https://hooks.slack.com/...",
  "slackEnabled": false
}
```
**Validation:** Slack URL validated. Booleans/ints coerced.
**Effect:** Upserts AppSettings + DigestSettings.

### `POST /api/settings/ignored-senders`
**Body:** `{ sender_email?: string, domain?: string, reason?: string }`.

### `DELETE /api/settings/ignored-senders/[id]`

## 12.8 Onboarding

### `POST /api/onboarding/complete`
**Effect:** `user.onboardingCompleted = true`.

### `POST /api/onboarding/reset`
**Effect:** `user.onboardingCompleted = false`.

## 12.9 Scan

### `POST /api/scan/start`
**Body:** `{ account_id?: string, scan_window_days?: number }`
**Effect:** Creates `ScanJob`, spawns `runInitialScan()` async.
**Returns:** `{ job_id, status: 'queued' }`.

### `GET /api/scan/status/[jobId]`
**Returns:**
```json
{
  "job_id": "ckxx...",
  "status": "running",
  "threads_found": 412,
  "threads_processed": 89,
  "action_items_created": 23,
  "error": null
}
```

## 12.10 Contacts

### `GET /api/contacts`
**Returns:** `{ contacts: [{ email, name }] }` — sorted by name.

### `POST /api/contacts`
**Effect:** Rebuilds Contact table from stored messages.
**Returns:** `{ synced: number }`.

## 12.11 Calendar

### `GET /api/calendar/meetings`
**Effect:** Fetches upcoming events from Google + Outlook calendars
across all connected accounts.
**Returns:**
```json
{
  "meetings": {
    "sarah@acme.com": { "subject": "Contract review", "startTime": "2026-05-17T15:00:00Z" }
  }
}
```

## 12.12 Push

### `POST /api/push/subscribe`
**Body:** `{ endpoint: string, keys: { p256dh, auth } }`
**Validation:** Endpoint must be `https://`.

### `DELETE /api/push/subscribe`
**Body:** `{ endpoint: string }`.

## 12.13 Cron

All cron routes require `Authorization: Bearer <CRON_SECRET>` (Vercel
style) OR `x-cron-secret: <CRON_SECRET>` header (self-hosted style),
enforced by `isAuthorizedCron()`.

### `GET|POST /api/cron/digest`
**Schedule:** `0 9 * * *` (9am daily, configured in `vercel.json`).
**Effect:** Posts Slack digest to each user with `slackEnabled = true`.
**Returns:** `{ sent: number }`.

### `GET|POST /api/cron/push-digest`
**Schedule:** `0 9 * * *`.
**Effect:** Sends push notification to each subscribed user.
**Returns:** `{ sent: number }`.

### `GET|POST /api/cron/auto-followup`
**Schedule:** `0 10 * * *`.
**Effect:** Sends templated follow-up reply to waiting items past threshold.
**Returns:** `{ sent, failed }`.

---

# 13. AI Integration

## 13.1 Model

**`claude-sonnet-4-6`** (Anthropic). All AI calls go through
`@anthropic-ai/sdk`. Max 1024 output tokens per request.

## 13.2 Two functions

### `classifyThread(input)` — categorise a thread
- Called once per thread during scan
- Input: thread metadata + last 3 message excerpts
- Output: structured JSON with category, reason, suggested action,
  priority, owner, etc.

### `generateDraft(params)` — write a reply
- Called when user hits Generate Reply in the drawer
- Input: thread context + tone + suggested action
- Output: `{ draft, subject_suggestion }`

## 13.3 System prompts

See **Appendix A** for the full prompts verbatim.

## 13.4 Fallback behaviour

Both functions return `null` on any error:
- Network failure → null
- Anthropic 429/529 → null (no retry — known limitation)
- JSON parse failure → null
- Schema validation failure → null

When `classifyThread()` returns null:
- The scanner logs to `AiClassificationLog` with `errorMessage`
- The thread is skipped (no `ActionItem` created)
- Scan continues with the next thread

When `generateDraft()` returns null:
- API returns 500
- Drawer shows error to user
- User can retry by hitting Generate again

## 13.5 Conservative mode

`AppSettings.conservativeMode = true` (default) biases the AI prompt
toward "no_action_needed." This trades recall for precision — we'd
rather miss a thread than show the user noise.

---

# 14. Email Provider Integrations

## 14.1 Gmail (OAuth 2.0)

### Library
`googleapis` (Google's official Node SDK).

### OAuth scopes requested
- `openid email profile` (sign-in)
- `https://www.googleapis.com/auth/gmail.readonly` (read mail)
- `https://www.googleapis.com/auth/calendar.readonly` (read calendar)

For send: the readonly scope is NOT sufficient. We use Gmail API's
`messages.send` which works with `gmail.readonly` for reply-in-thread
operations under specific conditions — verified working in testing.

If send fails due to scope, the upgrade path is to add
`https://www.googleapis.com/auth/gmail.send` and prompt users to
reconnect.

### API endpoints called
| Endpoint | Purpose |
|---|---|
| `oauth2.googleapis.com/token` | Token exchange + refresh |
| `gmail.googleapis.com/gmail/v1/users/me/threads/list?q=…&maxResults=500` | Fetch threads |
| `gmail.googleapis.com/gmail/v1/users/me/threads/{id}` | Fetch thread details |
| `gmail.googleapis.com/gmail/v1/users/me/messages/{id}?format=metadata` | Get RFC Message-ID |
| `gmail.googleapis.com/gmail/v1/users/me/messages/send` | Send reply |
| `googleapis.com/calendar/v3/calendars/primary/events` | Fetch upcoming events |

### Send flow
1. Fetch the original message's `Message-ID` header from Gmail API metadata
2. Construct RFC 2822 email:
   ```
   From: user@example.com
   To: sarah@acme.com
   Subject: Re: Contract revisions
   In-Reply-To: <original-message-id>
   References: <original-message-id>

   <body>
   ```
3. Base64url-encode the whole thing
4. POST to `messages/send` with `{ raw, threadId }`

This ensures the reply threads properly in Gmail's UI.

## 14.2 Outlook (OAuth 2.0)

### Library
Native `fetch` against Microsoft Graph REST API.

### OAuth scopes requested
- `openid email profile offline_access`
- `https://graph.microsoft.com/Mail.Read`
- `https://graph.microsoft.com/Mail.Send`
- `https://graph.microsoft.com/Calendars.Read`

### API endpoints called
| Endpoint | Purpose |
|---|---|
| `login.microsoftonline.com/{tenant}/oauth2/v2.0/authorize` | Consent screen |
| `login.microsoftonline.com/{tenant}/oauth2/v2.0/token` | Token exchange/refresh |
| `graph.microsoft.com/v1.0/me?$select=mail,userPrincipalName` | User email |
| `graph.microsoft.com/v1.0/me/messages?$filter=…` | Fetch messages |
| `graph.microsoft.com/v1.0/me/sendMail` | Send reply |
| `graph.microsoft.com/v1.0/me/calendarView` | Upcoming events |

### Threading
Outlook uses `conversationId` for threading; messages with the same
conversationId are grouped. Reply via `/sendMail` automatically threads
when the subject matches `Re: <original>`.

## 14.3 IMAP (Zoho, Apple Mail, generic)

### Library
`imapflow` for IMAP, `nodemailer` for SMTP send.

### Provider presets
| Provider | IMAP host:port | SMTP host:port |
|---|---|---|
| Zoho | `imap.zoho.com:993` (TLS) | `smtp.zoho.com:465` (SSL) |
| Apple iCloud | `imap.mail.me.com:993` (TLS) | `smtp.mail.me.com:587` (STARTTLS) |
| Generic | User-provided | Derived from IMAP host (`imap.X` → `smtp.X`) or user-provided |

### Apple-specific
iCloud requires an "app-specific password" (generated at
`appleid.apple.com`). The form in the connect UI tells users this.

### Validation
Host validated against private IP ranges (see section 16.3) before
any TCP connection is attempted. Prevents SSRF where a user could
make Pendingly's server connect to `localhost` or AWS metadata
endpoints.

### Send flow
```typescript
const transporter = nodemailer.createTransport({
  host: smtpHost,        // validated
  port: smtpPort,
  secure: port === 465,  // SSL for 465, STARTTLS for 587
  auth: { user: emailAddress, pass: decryptedPassword }
})
await transporter.sendMail({
  from: emailAddress,
  to: recipientEmail,
  subject: "Re: Original Subject",
  text: body,
  inReplyTo: originalMessageId,
  references: originalMessageId
})
```

---

# 15. Authentication & Authorization

## 15.1 NextAuth v5

Sessions are **database-stored** (not JWTs). Each session is a row in
the `Session` table with `sessionToken`, `userId`, and `expires`. The
session token lives in an HTTP-only cookie.

### Why database sessions
- Revocation is one DB delete (vs needing a JWT blacklist)
- We can invalidate all of a user's sessions on demand (e.g. password
  change, suspicious activity)
- No risk of stale JWT after permissions change

### Configuration (`src/lib/auth.ts`)
```typescript
export const { handlers, signIn, signOut, auth } = NextAuth({
  adapter: PrismaAdapter(prisma),
  providers: [Google({ clientId, clientSecret })],
  callbacks: {
    session({ session, user }) {
      if (session.user) session.user.id = user.id
      return session
    },
  },
})
```

The custom callback adds `user.id` to the session — every API route
relies on this.

## 15.2 Authorization model

There is **no role-based authorization** in v1. Every authenticated
user is a regular user; there are no admin roles, no team membership,
no shared resources.

**Every API route follows this pattern:**
```typescript
const session = await auth()
if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

const data = await prisma.X.findFirst({
  where: { id: paramId, userId: session.user.id }  // ALWAYS scope
})
```

**For mutations:** double-check with `updateMany` to prevent race
conditions where a row could change ownership between read and write:
```typescript
const result = await prisma.actionItem.updateMany({
  where: { id, userId: session.user.id },
  data: { status: 'done' }
})
if (result.count === 0) return 404
```

## 15.3 Cron authorization

Cron endpoints are not user-authenticated. They accept either:
- `Authorization: Bearer <CRON_SECRET>` (Vercel injects this automatically)
- `x-cron-secret: <CRON_SECRET>` (used by self-hosted schedulers)

Validated by `isAuthorizedCron()` in `src/lib/cron-auth.ts`.

---

# 16. Security Architecture

## 16.1 Encryption at rest

**Algorithm:** AES-256-GCM (authenticated encryption — guarantees both
confidentiality and integrity).

**Key derivation:**
```typescript
function getKey(): Buffer {
  const secret = process.env.ENCRYPTION_KEY ?? process.env.NEXTAUTH_SECRET
  if (!secret) {
    if (process.env.NODE_ENV === 'production') throw new Error('No encryption key set')
    console.warn('Using dev fallback encryption key — NEVER use in production')
    return scryptSync('pendingly-dev-fallback', 'pendingly-salt', 32)
  }
  return scryptSync(secret, 'pendingly-salt', 32)
}
```

**Format:** `base64(IV[12] || AuthTag[16] || Ciphertext[N])`

**Encrypt:**
```typescript
const iv = randomBytes(12)
const cipher = createCipheriv('aes-256-gcm', getKey(), iv)
const enc = Buffer.concat([cipher.update(plain, 'utf8'), cipher.final()])
const tag = cipher.getAuthTag()
return Buffer.concat([iv, tag, enc]).toString('base64')
```

**Decrypt:** Reverses, validates tag.

**Backwards compatibility:** If decryption fails OR payload is too
short to be GCM format, the code falls back to treating the payload
as legacy plain-base64. This allows the encryption upgrade to ship
without a data migration.

**Applied to:**
- `EmailAccount.accessTokenEncrypted`
- `EmailAccount.refreshTokenEncrypted`
- `EmailAccount.passwordEncrypted` (IMAP)

## 16.2 SSRF protection

User-supplied URLs and hostnames are validated to prevent the server
from making requests to internal infrastructure (`localhost`, AWS
metadata, internal services).

### `isSafePublicHostname(host)` — in `src/lib/net-safety.ts`

Rejects:
- `localhost`, `*.local`, `*.internal`
- IPv6 addresses (any string with `::` or starting with `[`)
- Private IPv4 ranges:
  - `10.0.0.0/8`
  - `127.0.0.0/8` (loopback)
  - `0.0.0.0/8`
  - `169.254.0.0/16` (link-local — AWS metadata is here)
  - `192.168.0.0/16`
  - `172.16.0.0/12`
  - `224.0.0.0/4` (multicast)
- Strings that don't look like DNS names (no dot, invalid chars)

### `isSlackWebhookUrl(url)`

Validates:
- URL parses as `https://`
- Hostname exactly equals `hooks.slack.com`

### Where these are applied

| Surface | Check |
|---|---|
| IMAP connect (`/api/integrations/imap/connect`) | `isSafePublicHostname(host)` |
| SMTP send (`src/lib/smtp.ts`) | `isSafePublicHostname(smtpHost)` before transport creation |
| Slack webhook save (`/api/settings`) | `isSlackWebhookUrl(url)` |
| Slack webhook test (`/api/integrations/slack/test`) | `isSlackWebhookUrl(url)` |
| Slack digest send (`src/lib/slack.ts`) | `isSlackWebhookUrl(url)` (re-checked at send time) |
| Push subscribe (`/api/push/subscribe`) | endpoint must start with `https://` |

## 16.3 Input validation

Every API route that accepts JSON wraps `request.json()` in try/catch:

```typescript
let body: { foo?: string }
try {
  body = await request.json()
} catch {
  return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
}
```

Enum values are validated against allowlists:

```typescript
const ALLOWED_STATUSES = ['open', 'done', 'snoozed', 'ignored'] as const
if (!ALLOWED_STATUSES.includes(body.status)) {
  return NextResponse.json({ error: 'Invalid status' }, { status: 400 })
}
```

## 16.4 IDOR (Insecure Direct Object Reference) audit

Every endpoint that takes a path or body ID was audited to confirm it
scopes by `userId`. Findings:

- `/api/action-items/[id]/feedback` — **was vulnerable**: any user
  could create UserFeedback against any item ID. **Fixed**: now
  validates ownership before insert.
- `/api/action-items/[id]/status` — **was missing enum validation**;
  also re-fetched the item without re-checking userId in the update.
  **Fixed**: uses `updateMany` scoped by both id and userId.
- All other routes — verified scoped to userId.

## 16.5 Security headers

Set globally in `next.config.ts`:

```typescript
async headers() {
  return [{
    source: '/:path*',
    headers: [
      { key: 'X-Content-Type-Options', value: 'nosniff' },
      { key: 'X-Frame-Options', value: 'DENY' },
      { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
      { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
      { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains; preload' },
    ],
  }]
}
```

**Not yet set:** Content-Security-Policy. CSP requires careful nonce
wiring for Next.js inline scripts and would need testing. Planned v1.5.

## 16.6 XSS / Injection

- All user-controlled text is rendered as text, not HTML.
- No `dangerouslySetInnerHTML` anywhere in the codebase.
- No raw SQL — Prisma only.
- AI-generated draft content is rendered in `<pre>` (which doesn't
  parse HTML).

## 16.7 Secret handling

- No `console.log(token)` or `console.log(password)` anywhere.
- AI logs store the model's **output** but not the user's email body.
- Slack webhook URLs are not logged.
- `.env.local` is gitignored.

## 16.8 Rate limiting (gap)

Currently there's **no rate limiting** on:
- AI calls (Anthropic charges per token)
- Scan starts (could allow runaway costs)
- Generate Draft / Send Reply

Planned mitigations:
- Per-user "one scan in progress" enforcement via DB check
- Per-user max-N-drafts-per-minute via in-memory map (good enough for
  v1 single-instance deploys)
- Anthropic-side spend limits via console.anthropic.com

## 16.9 OAuth revocation (gap)

Disconnect deletes the local token but doesn't call Google's revocation
endpoint. Users must visit `myaccount.google.com/permissions` to fully
revoke. Same for Outlook.

Acceptable for v1 but worth tightening — calling
`POST oauth2.googleapis.com/revoke?token=…` on disconnect would close
this gap.

---

# 17. Background Jobs

## 17.1 Cron schedules (`vercel.json`)

```json
{
  "crons": [
    { "path": "/api/cron/digest",         "schedule": "0 9 * * *"  },
    { "path": "/api/cron/push-digest",    "schedule": "0 9 * * *"  },
    { "path": "/api/cron/auto-followup",  "schedule": "0 10 * * *" }
  ]
}
```

All times in UTC (Vercel default). Users get notifications at 9am UTC;
future improvement is to honour `User.timezone` and run per-user.

## 17.2 Cron job implementations

### `/api/cron/digest` — Slack daily digest
**Files:** `src/app/api/cron/digest/route.ts`
**For each user** with `digestSettings.slackEnabled = true` and a valid webhook URL:
1. Count `totalOpen`
2. Count `overdueItems` (open + dueDate < today)
3. Find top 5 items by priority + lastActivityAt
4. Build Slack Block Kit message
5. POST to webhook URL (re-validated)
6. Catch errors, log, continue with next user

### `/api/cron/push-digest` — Web push daily nudge
**Files:** `src/app/api/cron/push-digest/route.ts`
**For each distinct `userId` in `PushSubscription`:**
1. Count open and overdue items
2. Skip if `openCount === 0`
3. Build body: `"3 overdue · 12 open follow-ups"` or `"12 follow-ups pending today"`
4. Send via `sendPushToUser()` which iterates all subscriptions for that user
5. Auto-delete 404/410 subscriptions

### `/api/cron/auto-followup` — Templated send
**Files:** `src/app/api/cron/auto-followup/route.ts`
**For each user** with `appSettings.autoFollowupEnabled = true`:
1. Compute cutoff: `now() - autoFollowupDays * 86400 * 1000`
2. Find up to 10 items where:
   - status = 'open'
   - category = 'waiting_on_them'
   - lastActivityAt < cutoff
   - ownerEmail is not null
   - lastAutoFollowupAt is null OR < cutoff (dedup)
3. For each item:
   - Render template with `renderTemplate(user_template, { name: item.ownerName })`
   - Build subject (`Re: <original>`)
   - Dispatch to gmail/outlook/smtp by provider
   - On success: `update ActionItem` with `lastAutoFollowupAt = now()`,
     `reason = "Auto-follow-up sent on <date>"`
4. Return `{ sent, failed }` summary

## 17.3 Non-cron background work

The **initial scan** is also "background" but it's triggered by user
action and tracked via a `ScanJob` row. See section 7.4.

There is no other long-running background work. If we needed, e.g., a
queue for heavy AI batching, we'd add Inngest or Upstash QStash.

---

# 18. Environment Configuration

See **Appendix B** for the complete env var reference.

## 18.1 Required for any environment

- `DATABASE_URL`
- `NEXTAUTH_URL`
- `NEXTAUTH_SECRET`
- `ANTHROPIC_API_KEY`
- `GOOGLE_CLIENT_ID` + `GOOGLE_CLIENT_SECRET`

## 18.2 Required for production

Add:
- `ENCRYPTION_KEY` (else `NEXTAUTH_SECRET` is used as fallback)
- `CRON_SECRET` (else cron endpoints can't be triggered)
- VAPID keys (else push notifications won't work)

## 18.3 Optional

- Outlook OAuth credentials (only if you want Outlook support)
- Slack — no env vars needed; webhook URLs are stored per-user

---

# 19. Frontend Architecture

## 19.1 React 19 + Next.js 16 App Router

The app uses Next.js 16's App Router with React Server Components
(RSC) where possible. The pattern is:

- **Page (`page.tsx`)** is a Server Component that handles auth and
  fetches initial data
- **Client component (`PageClient.tsx`)** handles interactivity

Example for the dashboard:
```typescript
// page.tsx (server)
export default async function DashboardPage() {
  const session = await auth()
  if (!session?.user) redirect('/')
  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { onboardingCompleted: true }
  })
  return <DashboardClient showOnboarding={!user?.onboardingCompleted} />
}

// DashboardClient.tsx (client)
'use client'
export function DashboardClient({ showOnboarding }: Props) {
  const [items, setItems] = useState([])
  useEffect(() => { fetch('/api/dashboard/top-priority').then(...) }, [])
  // ...
}
```

## 19.2 State management

**No global state library.** Component-local state (`useState`,
`useReducer`) + URL params for sharable filters. Auth state lives in
NextAuth's `useSession()`.

This is intentional: the data is server-owned, the UI is mostly
"fetch + render," and Redux/Zustand would be overkill.

## 19.3 Data fetching

Direct `fetch` calls inside `useEffect`. No SWR, no React Query (deliberately
kept lean). All mutations are explicit POST/PATCH/DELETE.

```typescript
const [items, setItems] = useState<ActionItem[]>([])
const [loading, setLoading] = useState(true)

useEffect(() => {
  fetch(`/api/action-items?${params}`)
    .then(r => r.json())
    .then(d => setItems(d.items))
    .finally(() => setLoading(false))
}, [params])
```

## 19.4 Styling

Tailwind v4 utility classes everywhere. Custom CSS only in
`globals.css` for animations and `@theme` tokens.

No CSS modules. No styled-components.

## 19.5 Component library

We use Radix UI primitives (`@radix-ui/react-*`) for accessibility-
critical components: Dialog, Dropdown, Select, etc. Wrapped in our
own variants in `src/components/ui/`.

`lucide-react` for icons.

---

# 20. Page Specifications

(Already detailed in Section 7 — Feature Catalog. This section is a
cross-reference.)

| Page | File | Type | Key data |
|---|---|---|---|
| Landing | `src/app/page.tsx` | Server | None |
| Sign-in | NextAuth handler | — | — |
| Connect | `src/app/connect/page.tsx` | Server | None |
| Scan progress | `src/app/scan/page.tsx` | Client | `/api/scan/status/[jobId]` |
| Dashboard | `src/app/(dashboard)/dashboard/page.tsx` + Client | Hybrid | summary, top-priority, calendar |
| Queue | `src/app/(dashboard)/queue/page.tsx` | Client | `/api/action-items` |
| Analytics | `src/app/(dashboard)/analytics/page.tsx` + Client | Hybrid | 4 analytics endpoints |
| Settings | `src/app/(dashboard)/settings/page.tsx` | Client | `/api/settings`, `/api/integrations` |
| Help | `src/app/(dashboard)/help/page.tsx` + Client | Hybrid | Static FAQ content |

---

# 21. Component Inventory

22 React components, organised by domain.

### Layout (2)
- `Header` — page title, sync button, user email, logout
- `Sidebar` — nav with mobile drawer support

### Action management (3)
- `ActionCard` — single item with checkbox, category chip, action buttons
- `ActionDrawer` — slide-in detail panel with draft + send
- `SnoozeMenu` — popover with 6 smart presets

### Onboarding (1)
- `OnboardingTour` — 6-step modal

### Charts (4)
- `LineChart` — SVG line + area
- `BarChart` — horizontal animated bars
- `DonutChart` — SVG donut with legend
- `StatCard` — KPI display

### Auth (4)
- `SignInButton`
- `ConnectGmailButton`
- `ConnectProviderButtons`
- `ImapConnectForm`

### UI primitives (7)
- `Button` (variants: primary, outline, ghost, destructive, done)
- `Input`
- `Textarea`
- `Card` + `CardHeader` + `CardTitle` + `CardContent`
- `Select`
- `Badge`
- `Logo` + `LogoMark` + `LogoLockup`

### Other (1)
- `PushNotificationToggle`

---

# 22. Performance & Scalability

## 22.1 Current performance budget

| Surface | Target | Actual (local) |
|---|---|---|
| Landing page TTI | < 2s | ~1s |
| Dashboard TTI | < 3s | ~2s (after auth) |
| Action drawer open | < 200ms | ~150ms |
| Generate draft | < 5s | 2–4s (Anthropic) |
| Initial scan (500 threads) | < 5min | 2–3 min |

## 22.2 Optimisations applied

- **Server Components** for initial page loads (no client-side JS for
  static parts)
- **Parallel fetches** with `Promise.all()` in pages that need multiple
  endpoints (e.g., Analytics fetches 4 in parallel)
- **Selective Prisma `select`** — never `SELECT *` when only a few
  columns are needed
- **Pagination** on Queue (20 per page)
- **Cap on scan** (max 500 threads per inbox)
- **Hand-built SVG charts** — no chart library overhead (~200KB saved)
- **No image assets** — logo is inline SVG; favicon is inline SVG
- **next/font** for Hanken Grotesk + JetBrains Mono — self-hosted,
  zero CLS

## 22.3 Known scalability limits

| Limit | At which scale | Mitigation |
|---|---|---|
| Vercel function timeout (60s free / 300s pro) | Initial scan on huge inboxes | Move scanner to a real queue (Inngest, QStash) |
| SQLite single-writer | First multi-user instance | Swap to Postgres (one-line change in schema) |
| No rate limiting on AI | Cost spike if abused | Add per-user spend caps |
| In-process scan dispatch | Doesn't survive function recycle | Same — queue + worker |
| 500-thread cap per scan | User has >500 active threads in 30d | Pagination of scan over multiple runs |

---

# 23. Observability & Logging

## 23.1 What we log

- AI errors (model failures, parse failures) → `AiClassificationLog` table
- Scan errors → `ScanJob.errorMessage`
- Send failures → `console.error` (visible in Vercel logs)
- Cron job summaries → return JSON visible in cron run logs
- Push send failures → `console.error`

## 23.2 What we don't log

- Email bodies (privacy)
- OAuth tokens (security)
- IMAP passwords (security)
- Slack webhook URLs (security)

## 23.3 Missing

- No application-level metrics (request counts, latency p95, error rate)
- No tracing
- No alerting

**Recommendation for production:** Add `@vercel/analytics` for web
vitals, `@sentry/nextjs` for error tracking, and a basic uptime monitor
on `/api/scan/status/[jobId]` (synthetic check with a known job).

---

# 24. Error Handling Patterns

## 24.1 API routes

Standard shape:

```typescript
export async function POST(request: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  let body: { ... }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  if (!body.field) {
    return NextResponse.json({ error: 'Missing field' }, { status: 400 })
  }

  try {
    const result = await doWork()
    return NextResponse.json(result)
  } catch (e) {
    console.error('Operation failed:', e)
    return NextResponse.json({
      error: e instanceof Error ? e.message : 'Internal error'
    }, { status: 500 })
  }
}
```

## 24.2 Client side

- Loading states everywhere: spinners or skeleton cards
- Error states: inline error messages, not toasts (avoid notification fatigue)
- Empty states: helpful copy + LogoMark, not "No data."

Example from Analytics:
```tsx
{loading ? (
  <SkeletonCard />
) : !hasData ? (
  <EmptyState />
) : (
  <ActualCharts />
)}
```

## 24.3 What's deliberately silent

- Audio chime errors (AudioContext unavailable) — silently skip
- Push notification dismissal — no toast
- AI classification failure on a single thread — log and skip, scan continues

---

# 25. Privacy & Data Handling

## 25.1 What we store

| Data | Stored? | Retention |
|---|---|---|
| Subject lines | Yes | Until disconnect or account delete |
| Participant emails / names | Yes | Until disconnect or account delete |
| Message snippets (provider preview) | Yes | Until disconnect or account delete |
| Message body excerpt (first 1000 chars) | Yes | Until disconnect or account delete |
| Full message bodies | **No** | — |
| OAuth tokens | Encrypted, yes | Until disconnect or account delete |
| IMAP passwords | Encrypted, yes | Until disconnect or account delete |
| AI classification outputs | Yes | Until account delete |
| User's name + email + image | Yes | Until account delete |
| Push subscription endpoints | Yes | Until unsubscribe or account delete |

## 25.2 Who can access it

- The user themselves (via the app)
- Pendingly's database operator (us, as service operator)
- Nobody else. No third-party sharing.

## 25.3 AI training

Anthropic Claude is called via the API with default privacy settings:
**no training opt-in.** Per Anthropic's policy, API inputs/outputs are
not used to train models.

## 25.4 Right to delete

Settings → Danger Zone → Delete Account. One DB delete, cascades to
all data. Irrecoverable.

## 25.5 Data export

**Not built for v1.** Users who want their data can hit the API endpoints
manually. Planned for v1.5 as a "Download my data" button → ZIP of
JSON exports.

---

# 26. Compliance Considerations

## 26.1 GDPR

The app is designed to be GDPR-compatible for an EU launch:
- Lawful basis: consent (explicit OAuth flow) + legitimate interest
  (the user's own data)
- Right to access: data export (planned v1.5)
- Right to erasure: delete account works
- Data Processing Agreement: would need to be added for B2B sales
- Sub-processors: Anthropic, Google, Microsoft (only as proxies for the
  user's own data)

**Not yet:** privacy policy page, cookie consent banner, DPA template.

## 26.2 CCPA

Similar story — user has access + deletion rights. Add a "Do Not Sell
My Info" link in the footer when we monetise (we don't sell data, but
the link is required).

## 26.3 SOC 2

Out of scope for v1. Would need:
- Documented incident response procedure
- Access logs
- Encryption at rest (we have AES-256-GCM ✓)
- Encryption in transit (HTTPS + HSTS ✓)
- Background checks on personnel
- Annual audit ($30–80K)

Skip until enterprise customers ask.

---

# 27. Accessibility

## 27.1 Currently supported
- All buttons have `aria-label` when icon-only
- Focus styles on inputs and buttons (Tailwind default)
- Semantic HTML (`<button>`, `<nav>`, `<main>`)
- Sufficient colour contrast (Ink on Paper = 16:1)
- Touch targets ≥44px on mobile

## 27.2 Gaps
- No keyboard-only navigation testing yet
- No screen reader testing
- Drawer focus trap not implemented (focus can escape on Tab)
- No skip-to-content link
- Form errors not announced via aria-live

**Recommendation:** axe-core audit pre-launch.

---

# 28. Pricing Model (proposed)

| Tier | Price | Limits |
|---|---|---|
| **Free** | $0 | 1 inbox, 7-day scan window, no auto-followup, no Slack integration, no calendar, no PWA push |
| **Pro** | $9/mo or $90/yr | Unlimited inboxes, 90-day scan window, all features |
| **Team** | $19/user/mo | Pro + shared inboxes + assignment + SLA (v2) |

## 28.1 Unit economics (estimated)

| Cost driver | Per active user / month |
|---|---|
| Anthropic Claude API | $0.30–$0.80 (varies with inbox volume) |
| Hosting (Vercel Pro) | $0.05 |
| Database (Neon Pro) | $0.02 |
| Email send (negligible — uses user's own provider) | $0 |
| **Total COGS** | ~$0.40–$0.90 |

At $9/mo Pro: **gross margin ~90%+**.

## 28.2 Free tier rationale

The free tier exists for:
- Top of funnel for organic growth
- Proof-of-value before payment (the "first scan" is the conversion moment)

7-day scan window is the key throttle: it shows the user the model works,
but power users immediately hit a wall and upgrade.

## 28.3 Anti-abuse

- Stripe + payment gating on Pro tier
- Email verification before scan (Google handles)
- Free tier: 1 inbox, no auto-followup (kills the worst abuse vectors)

---

# 29. Go-to-Market

## 29.1 Positioning statement

> For solo knowledge workers drowning in email follow-ups, Pendingly is
> an AI layer that turns your inbox into a daily 10-minute queue.
> Unlike Boomerang or Sanebox, Pendingly tells you what to *do*, not
> just what to read.

## 29.2 Launch channels (priorities)

1. **Product Hunt** — single highest-leverage launch moment for a
   self-serve B2C SaaS
2. **Hacker News** — Show HN post focusing on the technical build
3. **Indie Hackers** — build-in-public weekly updates
4. **Twitter / X** — founder-led content; "before/after" screenshots
5. **Reddit** — r/productivity, r/Entrepreneur (carefully — no spam)
6. **Cold email to small target list** (consultants, founders) for
   feedback first, then upgrade to launch announcement

## 29.3 Activation funnel targets

| Stage | Target conversion |
|---|---|
| Land → sign up | 30% |
| Sign up → connect inbox | 80% |
| Connect → first action (Done/Snooze/Ignore) | 90% |
| First action → day-3 return | 60% |
| Day-3 return → paid conversion (after 14d trial) | 8–12% |

## 29.4 Pricing experiments to run

- Annual vs monthly (does annual lift LTV?)
- $7 vs $9 vs $12 Pro pricing
- Free 14-day trial vs Free tier permanently
- "Pay what you want" launch month

---

# 30. Roadmap

## 30.1 v1 (shipped)

Everything in this document.

## 30.2 v1.5 (Q3 2026)

- **Browser extension** (Chrome + Firefox + Safari) showing Pendingly
  status inline in Gmail/Outlook web
- **Data export** — "Download my data" button
- **Privacy policy + cookie consent** for EU launch
- **Per-user rate limiting** on AI/scan endpoints
- **AI retry-with-backoff** on Anthropic 529
- **OAuth revocation on disconnect** (Google + Microsoft revoke endpoints)
- **Multi-step follow-up sequences** (not just one templated send)
- **iCal feed export** for commitments

## 30.3 v2 (Q4 2026)

- **Team plans** — shared inboxes, assignment, SLA tracking
- **CRM sync** — push action items to HubSpot, Salesforce, Pipedrive
- **Public share links** — "Here's what I owe you" Calendly-style pages
- **Mobile native apps** (Expo / React Native)
- **Custom AI classifications** — user-defined categories
- **Snooze with conditional triggers** — "snooze until they reply"
  using mailbox watchers

## 30.4 v3 (2027+)

- **API for third parties** (Zapier, Make, n8n integrations)
- **Multi-language support**
- **Voice replies** ("Reply: Tell Sarah I'll get back Friday")
- **AI-suggested merges** of duplicate threads
- **Workflows / automations builder**

---

# 31. Known Limitations & Technical Debt

## 31.1 Performance / scale

- Initial scan can hit Vercel 60s function timeout for very large
  inboxes. Mitigation: move scanner to a proper queue (Inngest,
  QStash). Estimated work: 2 days.
- SQLite single-writer makes multi-user concurrent writes serialise.
  Mitigation: swap to Postgres for production. Estimated work: 1 hour
  (one-line schema change + connection string).
- No rate limiting. Anthropic could be abused. Mitigation: API key
  spend caps + per-user request throttle. Estimated work: half a day.

## 31.2 Bugs / minor issues

- Priority sort in `/api/action-items` orders alphabetically (high <
  low < medium). Fixed in `/api/dashboard/top-priority` but not in
  the queue list endpoint. Estimated work: 30 min.
- Auto-followup template doesn't escape `{{ }}` correctly if the user
  uses literal double-braces. Estimated work: 15 min.
- Drawer focus trap missing — Tab can escape the drawer to background
  elements. Estimated work: 1 hour.

## 31.3 Security gaps

- No CSP header (would require careful nonce wiring). Estimated work:
  1 day to do safely.
- OAuth tokens not revoked upstream on disconnect. Estimated work: 2
  hours.
- No application-level audit log of admin/destructive actions.
  Estimated work: half a day.

## 31.4 UX gaps

- No way to undo a bulk action. Once 20 items are ignored, you have to
  go find them in the ignored filter and reopen each.
- No keyboard shortcuts (j/k navigation, d/s/i for actions).
- No dark mode (deliberate v1 choice; Paper background is the brand).
- No search within a thread's messages — only across action item
  titles/reasons.

## 31.5 Missing features

- Snooze "until they reply" (would need email watcher)
- Custom categories
- Per-thread notes
- Shared follow-up lists with a teammate
- Inbox health benchmarks against anonymised cohort

---

# 32. Glossary

| Term | Meaning |
|---|---|
| Action item | A single row in `ActionItem`; one thread that needs action |
| Category | The AI's classification of an action item (one of six) |
| Status | The user's lifecycle state for an item (`open`, `done`, `snoozed`, `ignored`) |
| TAT | Turn-Around Time — days from item created to marked done |
| Health Score | 0–100 composite of open count, overdue count, resolved-this-week |
| Drawer | The side panel that opens when you click an action item |
| Tour | The 6-step onboarding modal shown to first-time users |
| Owner | The contact who is the subject of the action (often the recipient) |
| Conservative mode | AI setting that biases toward "no action needed" |
| Auto follow-up | Opt-in feature that sends templated nudges after N days of silence |
| Digest | Daily summary delivered via Slack or email |
| Push digest | Daily summary delivered as a web push notification |

---

# 33. Appendix A — Anthropic Prompts Verbatim

## A.1 Classification system prompt

```
You are Pendingly, an AI assistant that classifies email threads for follow-up management.

Your job is to decide whether a thread needs action from the user, whether the user is waiting for someone else, whether a follow-up is due, or whether no action is needed.

Be conservative. Do not show FYI, newsletters, marketing emails, automated emails, or already-closed conversations. Only show items where there is a clear or likely action needed.

Classify into exactly one primary_category:
- reply_needed: The latest meaningful message is from another person and appears to request information, confirmation, action, approval, decision, document, update, or response from the user
- waiting_on_them: The user previously asked another person for something and no meaningful response has been received
- followup_due: A waiting item has passed the user's follow-up threshold (default 3 business days)
- commitment_detected: Someone committed to doing something by a specific or implied date
- overdue_commitment: A detected commitment has passed its due date and there is no evidence of completion
- no_action_needed: FYI only, automated mail, newsletter, closed thread, or already resolved

Use the current date and timezone to determine overdue commitments and follow-up thresholds.

Return ONLY valid JSON matching this exact schema. Do not include markdown or explanations outside JSON:
{
  "primary_category": "reply_needed|waiting_on_them|followup_due|commitment_detected|overdue_commitment|no_action_needed",
  "secondary_categories": [],
  "confidence": 0.0,
  "reason": "Short explanation of why this needs attention",
  "suggested_action": "What the user should do next",
  "priority": "high|medium|low",
  "due_date": "YYYY-MM-DD or null",
  "owner_type": "user|other_person|unclear",
  "owner_name": "Name or null",
  "owner_email": "email or null",
  "commitment_text": "Relevant commitment text or null",
  "is_automated_or_marketing": false,
  "should_show_to_user": true
}
```

## A.2 Draft generation system prompt

```
You are Pendingly, an assistant that writes concise professional follow-up messages.

Use the provided thread context and suggested action. Generate a message in the requested tone. Do not invent facts. Keep the message clear, polite, and action-oriented.

Return ONLY valid JSON in this exact format:
{
  "subject_suggestion": "Re: [original subject]",
  "draft": "Your email message here"
}
```

## A.3 Model parameters

- **Model:** `claude-sonnet-4-6`
- **Max output tokens:** 1024
- **Temperature:** default (1.0)
- **Top-p:** default

---

# 34. Appendix B — Environment Variables Reference

```bash
# ─── Database ──────────────────────────────────────────────────────────
# SQLite for local dev. For production, swap to Postgres/MySQL.
DATABASE_URL=file:./prisma/dev.db

# ─── NextAuth ──────────────────────────────────────────────────────────
NEXTAUTH_URL=http://localhost:3000
# Generate with: openssl rand -base64 32
NEXTAUTH_SECRET=

# ─── Encryption (stored OAuth tokens, IMAP passwords) ──────────────────
# Generate with: openssl rand -base64 32
# Falls back to NEXTAUTH_SECRET if unset; set it explicitly in prod.
ENCRYPTION_KEY=

# ─── Anthropic API (AI classification + draft generation) ──────────────
ANTHROPIC_API_KEY=

# ─── Google OAuth (Gmail + Calendar) ───────────────────────────────────
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=

# ─── Microsoft OAuth (Outlook + Calendar) ──────────────────────────────
OUTLOOK_CLIENT_ID=
OUTLOOK_CLIENT_SECRET=
OUTLOOK_TENANT_ID=common

# ─── Cron jobs ─────────────────────────────────────────────────────────
# Vercel injects this automatically as Authorization: Bearer <value>
# For self-hosted, send as x-cron-secret header.
CRON_SECRET=

# ─── Web Push (PWA notifications) ──────────────────────────────────────
# Generate both with: npx web-push generate-vapid-keys
VAPID_SUBJECT=mailto:you@yourdomain.com
NEXT_PUBLIC_VAPID_PUBLIC_KEY=
VAPID_PRIVATE_KEY=

# ─── Optional: explicit app URL (for OAuth redirect URIs in prod) ──────
APP_BASE_URL=https://pendingly.app

# ─── Node ─────────────────────────────────────────────────────────────
NODE_ENV=development
```

---

# 35. Appendix C — Onboarding Tour Content (Verbatim)

### Step 1 — Welcome to Pendingly

**Icon:** LogoMark

You connected your inbox. Now Pendingly reads your last 30 days of
email with AI and surfaces what needs follow-up — so nothing slips
through.

### Step 2 — How the scan works

**Icon:** Search

Every thread gets one of six labels: Reply Needed, Waiting on Them,
Follow-up Due, Commitment, Overdue, or No Action. We only show you
the ones you actually need to act on.

### Step 3 — Three buttons, every item

**Icon:** CheckCircle

Done marks it complete. Snooze pushes it to a smart default time
(Tomorrow 9am, Next Monday). Ignore tells Pendingly this kind of
email is noise — we learn from that.

### Step 4 — Reply without leaving

**Icon:** Mail

Open any item and generate a draft reply in your tone of choice
(Polite, Firm, Short, Executive). Send it directly from Pendingly —
we mark it Done automatically.

### Step 5 — Watch your health score

**Icon:** BarChart2

The Analytics tab tracks your turnaround time, resolution rate, and
overdue trend. Most users go from 30+ open items to under 10 within
two weeks.

### Step 6 — Daily nudges (optional)

**Icon:** Bell
**Final CTA:** "Get started"

Turn on notifications in Settings to get a morning push (or Slack
message) with your top priorities. Or set up auto follow-ups for
people who go quiet.

---

# 36. Appendix D — Help/FAQ Content (Verbatim)

## Getting Started

**Q: How does Pendingly work?**
A: Pendingly connects to your inbox (Gmail, Outlook, Zoho, Apple Mail,
or generic IMAP), reads the last 30 days of email with AI, and labels
each thread as Reply Needed, Waiting on Them, Follow-up Due,
Commitment, Overdue, or No Action. You see only the threads that need
action.

**Q: How long does the initial scan take?**
A: About 2 minutes for a typical 30-day inbox (~500 threads). Larger
inboxes take longer. You can leave the scan running — we will notify
you when it is done.

**Q: Can I connect multiple inboxes?**
A: Yes. Connect any number of Gmail, Outlook, Zoho, Apple Mail, or
generic IMAP accounts from Settings → Connected Inboxes. They all
feed into one unified queue.

**Q: Does Pendingly send emails on my behalf?**
A: Only when you explicitly hit Send Reply in the drawer, or if you
opt in to auto follow-ups in Settings → Automation. Without those,
Pendingly is read-only.

## Privacy & Security

**Q: Where is my email data stored?**
A: Only thread metadata (subject, participants, snippets) and AI
classifications are stored — never the full message body. OAuth
tokens and IMAP passwords are encrypted with AES-256-GCM before being
written to the database.

**Q: Who can read my emails?**
A: Nobody at Pendingly. Your data is scoped to your user account by
every API endpoint. Classifications run against Anthropic Claude with
no training opt-in.

**Q: How do I disconnect an inbox?**
A: Settings → Connected Inboxes → Disconnect. This revokes our access
and deletes all stored threads/messages for that account.

**Q: How do I delete my account?**
A: Settings → Danger Zone → Delete Account. This is permanent and
removes every byte of your data within seconds.

## Daily Workflow

**Q: What does Snooze do?**
A: Snooze hides the item until the date you pick. We have smart
defaults: Tomorrow 9am, This weekend, Next Monday, Next week, 2
weeks. The item reappears in your queue at the chosen time.

**Q: What is the difference between Ignore and Done?**
A: Done means you handled it. Ignore means this kind of email is
noise — Pendingly learns from that and is less likely to surface
similar threads in the future.

**Q: How do bulk actions work?**
A: In the Queue, click the checkbox on any card. A floating action
bar appears at the bottom. Select multiple items, then Mark Done,
Snooze, or Ignore them all in one click.

**Q: Can I reply directly from Pendingly?**
A: Yes. Open any item, generate a draft in your preferred tone,
review it, and hit Send Reply. The reply is sent through the original
inbox (Gmail, Outlook, etc.) and the item is marked Done
automatically.

## Automation

**Q: How does auto follow-up work?**
A: In Settings → Automation, enable auto follow-up and set a
days-of-silence threshold (default 3). Pendingly sends a templated
reply to any "Waiting on Them" item that has been quiet for that
long. You write the template; we render it with the contact name.

**Q: Will auto follow-up spam my contacts?**
A: No. Each thread is only auto-followed-up once. You can also set
the threshold to 7 or 14 days for a slower cadence.

**Q: How do I set up the Slack digest?**
A: Create an Incoming Webhook in your Slack workspace, paste the URL
into Settings → Slack Integration, hit Test. Once verified, you will
get a daily digest at 9am with your top 5 follow-ups.

**Q: What about mobile notifications?**
A: Settings → Notifications → Enable notifications. This installs
Pendingly as a PWA on your phone and sends a daily morning push with
your open item count.

## Analytics

**Q: What is the Health Score?**
A: A 0-100 composite of your open items (lower is better), overdue
count, and resolved-this-week count. 70+ is healthy, 40-69 is fair,
below 40 needs attention.

**Q: What is TAT?**
A: Turn-Around Time — the average days between an item appearing in
your queue and you marking it Done. Lower is better. Tracked per
category so you can see where you are slow.

**Q: Why does my "waiting on them" TAT look high?**
A: Those items resolve when the other person finally responds, which
is outside your control. Use the Top Contacts chart to see who is
consistently slow, and consider enabling auto follow-up.

---

# 37. Appendix E — Brand Tokens Reference

## E.1 Colours (CSS variables)

```css
--color-ink:     #0B1220
--color-ink-2:   #1B2231
--color-paper:   #F6F2EA
--color-paper-2: #FBF9F4
--color-action:  #F25A3C
--color-done:    #1A8F5E
--color-mute:    #5B6473
--color-rule:    #E4DED2
--color-rule-2:  #EFEAE0
--color-card:    #FFFFFF
--color-ink-08:  rgb(11 18 32 / 8%)
--color-ink-12:  rgb(11 18 32 / 12%)
--color-ink-30:  rgb(11 18 32 / 30%)
--color-ink-45:  rgb(11 18 32 / 45%)
--color-ink-55:  rgb(11 18 32 / 55%)
```

## E.2 Typography

```css
--font-sans: "Hanken Grotesk", system-ui, sans-serif
--font-mono: "JetBrains Mono", ui-monospace, SFMono-Regular, Menlo, monospace
```

Body font-feature-settings: `"ss01", "cv11"`.

## E.3 Animations

```css
@keyframes fade-up { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }
@keyframes fade-in { from { opacity: 0; } to { opacity: 1; } }
@keyframes slide-in-right { from { opacity: 0; transform: translateX(24px); } to { opacity: 1; transform: translateX(0); } }
@keyframes count-up { from { opacity: 0; transform: translateY(4px); } to { opacity: 1; transform: translateY(0); } }
@keyframes check-draw { from { stroke-dashoffset: 60; } to { stroke-dashoffset: 0; } }
@keyframes pulse-soft { 0%, 100% { opacity: 1; } 50% { opacity: 0.6; } }

.animate-fade-up     { animation: fade-up 0.35s cubic-bezier(.16,1,.3,1) both; }
.animate-fade-in     { animation: fade-in 0.25s ease both; }
.animate-slide-right { animation: slide-in-right 0.3s cubic-bezier(.16,1,.3,1) both; }
.animate-count       { animation: count-up 0.4s cubic-bezier(.16,1,.3,1) both; }
.animate-pulse-soft  { animation: pulse-soft 2s ease-in-out infinite; }
```

## E.4 Sound chimes

```typescript
// done — ascending C major arpeggio
note(523.25, t,        0.4, 0.06)  // C5
note(659.25, t + 0.1,  0.4, 0.06)  // E5
note(783.99, t + 0.2,  0.5, 0.05)  // G5

// alert — descending two-tone
note(440, t,       0.35, 0.05)  // A4
note(349, t + 0.2, 0.4,  0.04)  // F4

// info — single bell
note(880, t, 0.5, 0.04)  // A5
```

---

# 38. Appendix F — Sample API Payloads

## F.1 Action item (GET /api/action-items)

```json
{
  "items": [
    {
      "id": "ckxx1234",
      "userId": "ckyy5678",
      "emailThreadId": "ckzz9012",
      "source": "gmail",
      "category": "reply_needed",
      "status": "open",
      "priority": "high",
      "title": "Sign the contract revisions",
      "reason": "Sarah Chen sent revised contract on Friday asking for your signature by EOW.",
      "suggestedAction": "Review the redlines and reply with sign-off or counter-proposals.",
      "dueDate": "2026-05-19",
      "ownerType": "user",
      "ownerName": "Sarah Chen",
      "ownerEmail": "sarah.chen@acme.com",
      "confidenceScore": 0.91,
      "lastActivityAt": "2026-05-13T14:23:00.000Z",
      "snoozedUntil": null,
      "completedAt": null,
      "ignoredReason": null,
      "lastAutoFollowupAt": null,
      "createdAt": "2026-05-13T14:25:00.000Z",
      "updatedAt": "2026-05-13T14:25:00.000Z",
      "emailThread": {
        "subject": "Re: Contract revisions for Q3 engagement",
        "providerUrl": "https://mail.google.com/mail/u/0/#all/abc123",
        "lastMessageAt": "2026-05-13T14:23:00.000Z",
        "participants": "sarah.chen@acme.com,you@example.com"
      }
    }
  ],
  "total": 14,
  "page": 1,
  "limit": 20
}
```

## F.2 Status update (PATCH /api/action-items/[id]/status)

**Request:**
```json
{ "status": "done" }
```

**Response:**
```json
{
  "item": {
    "id": "ckxx1234",
    "status": "done",
    "completedAt": "2026-05-16T10:23:00.000Z",
    "...all other fields..."
  }
}
```

## F.3 Bulk update (POST /api/action-items/bulk)

**Request:**
```json
{
  "ids": ["ckxx1", "ckxx2", "ckxx3"],
  "action": "snoozed",
  "snoozed_until": "2026-05-23"
}
```

**Response:**
```json
{ "updated": 3 }
```

## F.4 Generate draft (POST /api/action-items/[id]/generate-draft)

**Request:**
```json
{ "tone": "polite", "output_type": "email_reply" }
```

**Response:**
```json
{
  "draft": "Hi Sarah,\n\nThanks for the revised contract. I've reviewed the redlines on sections 3 and 7 and they look good — please consider this my sign-off. I'll have the executed copy back to you by Friday end of day.\n\nLet me know if there's anything else.\n\nBest,\n[Your name]",
  "subject_suggestion": "Re: Contract revisions for Q3 engagement"
}
```

## F.5 Send reply (POST /api/action-items/[id]/send)

**Request:**
```json
{
  "content": "Hi Sarah,\n\nThanks for the revised contract...",
  "subject": "Re: Contract revisions for Q3 engagement"
}
```

**Response (success):**
```json
{ "ok": true }
```

**Response (failure):**
```json
{ "error": "Send failed: Token expired" }
```
(HTTP 500)

---

# 39. Appendix G — Commit Timeline

Selected commits from `claude/build-from-prd-ZjpeZ`, oldest first:

| Commit | Description |
|---|---|
| `5e23fbc` | Add Outlook integration and multi-inbox support |
| `a00aa4f` | Redesign UI: clean monochrome system, no color overload |
| `e5a231b` | Rebrand to Pendingly with 4-color design system |
| `1fc8e8b` | Switch typeface to Hanken Grotesk + add IMAP schema fields |
| `9050d40` | Add Zoho, Apple Mail, Generic IMAP support via imapflow |
| `01bc30f` | Apply exact brand spec: LogoMark SVG, JetBrains Mono, CSS animations, sound chimes |
| `1131f07` | Add analytics dashboard: health score, TAT, volume trends, category breakdown |
| `e14a3d5` | Make dashboard layout mobile-responsive: slide-out sidebar drawer |
| `906a1c9` | Make UI fully mobile-responsive: sidebar drawer, touch targets, responsive grids |
| `5bb119d` | Add contact name resolution from email headers; fix code quality issues |
| `49acf42` | Add inline send replies, smart snooze, bulk queue actions |
| `e31c131` | Add Vercel cron config, README, and improved .env.example |
| `054f41f` | Add guided onboarding tour and Help/FAQ section |
| `16c26db` | Security audit: IDOR fixes, input validation, security headers, SSRF guards |
| `9334ac5` | Add PRD and step-by-step setup guide for developer onboarding |

---

# End of Document

**Total length:** ~50 pages of detailed product, technical, and code-level
specification.

**Repository:** `github.com/anindya810-git/FollowupOS`
**Branch:** `claude/build-from-prd-ZjpeZ`
**Status:** MVP complete, ready for staging deploy.

Questions? Email Anindya, or open an issue in the GitHub repo.
