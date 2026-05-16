# Pendingly

Your follow-up radar. Connects to Gmail, Outlook, Zoho, Apple Mail, and generic
IMAP inboxes; uses AI to surface who needs a reply, who owes you one, and what's
overdue.

## Stack

- Next.js 16 (App Router) + TypeScript
- Tailwind CSS v4
- Prisma v7 + SQLite (swap to Postgres for prod)
- NextAuth v5 (Google OAuth)
- Anthropic Claude (`claude-sonnet-4-6`) for thread classification + draft generation
- Web Push, PWA, nodemailer, web-push, googleapis, imapflow

## Local dev

```bash
npm install
cp .env.example .env.local      # fill in keys (see below)
npx prisma db push              # create local SQLite schema
npm run dev                     # http://localhost:3000
```

### Minimum env vars for local dev

```
DATABASE_URL=file:./prisma/dev.db
NEXTAUTH_URL=http://localhost:3000
APP_BASE_URL=http://localhost:3000
NEXTAUTH_SECRET=<openssl rand -base64 32>
ENCRYPTION_KEY=<openssl rand -base64 32>
ANTHROPIC_API_KEY=<from console.anthropic.com>
GOOGLE_CLIENT_ID=<from console.cloud.google.com>
GOOGLE_CLIENT_SECRET=
```

Everything else is optional for first-run. Add Outlook / VAPID / CRON_SECRET
when you wire those features up.

## Production deploy (Vercel)

1. Push this repo to GitHub, import on Vercel.
2. Set all env vars in Vercel project settings (see `.env.example`).
3. Swap SQLite for a hosted Postgres — change `provider = "postgresql"` in
   `prisma/schema.prisma` and point `DATABASE_URL` at Neon / Supabase / RDS.
4. Run `npx prisma migrate deploy` on first deploy (Vercel build script).
5. Crons run automatically — `vercel.json` registers three jobs:
   - `0 9 * * *` daily Slack digest
   - `0 9 * * *` daily push notifications
   - `0 10 * * *` daily auto-follow-up sends
6. Generate VAPID keys for push: `npx web-push generate-vapid-keys` →
   put the public key in `NEXT_PUBLIC_VAPID_PUBLIC_KEY`, private in
   `VAPID_PRIVATE_KEY`.

### Self-hosted / non-Vercel cron

Hit the cron endpoints from any scheduler (GitHub Actions, Upstash QStash,
cron-job.org). Send `x-cron-secret: $CRON_SECRET` header:

```
POST https://your-domain.com/api/cron/digest          # 9am daily
POST https://your-domain.com/api/cron/push-digest     # 9am daily
POST https://your-domain.com/api/cron/auto-followup   # 10am daily
```

## OAuth scopes

Existing users who connected Gmail/Outlook before calendar awareness shipped
need to reconnect — the new scopes (`calendar.readonly` and `Calendars.Read`)
aren't granted retroactively.

## Project layout

```
src/
├── app/
│   ├── (dashboard)/       # authenticated app shell + pages
│   │   ├── dashboard/     # daily summary + top priority
│   │   ├── queue/         # all action items, filters, bulk actions
│   │   ├── analytics/     # health score, TAT, trends, top contacts
│   │   └── settings/      # inboxes, automation, notifications, Slack
│   ├── api/
│   │   ├── action-items/  # CRUD, status changes, generate draft, send, bulk
│   │   ├── analytics/     # summary, trends, tat, breakdown
│   │   ├── calendar/      # upcoming meetings aggregator
│   │   ├── contacts/      # build directory from email headers
│   │   ├── cron/          # digest, push-digest, auto-followup
│   │   ├── integrations/  # gmail/outlook/imap/slack connect+disconnect
│   │   └── push/          # web push subscribe/unsubscribe
│   ├── connect/           # OAuth + IMAP connect wizard
│   ├── scan/              # initial inbox scan progress page
│   └── page.tsx           # landing
├── components/
│   ├── action/            # ActionCard, ActionDrawer, SnoozeMenu
│   ├── charts/            # LineChart, BarChart, DonutChart, StatCard
│   ├── layout/            # Sidebar, Header
│   └── ui/                # Button, Logo, Select, etc.
└── lib/
    ├── ai.ts              # Anthropic Claude client
    ├── auth.ts            # NextAuth config
    ├── contacts.ts        # contact directory upsert + lookup
    ├── crypto.ts          # AES-256-GCM for tokens
    ├── gmail.ts           # Gmail API + Calendar
    ├── outlook.ts         # Microsoft Graph: mail + calendar + send
    ├── imap.ts            # imapflow read
    ├── smtp.ts            # nodemailer send for IMAP providers
    ├── prisma.ts          # Prisma client (better-sqlite3 adapter)
    ├── push.ts            # web-push wrapper
    ├── scanner.ts         # AI-powered thread → action item pipeline
    ├── slack.ts           # webhook digest builder
    ├── sounds.ts          # Web Audio API chimes
    └── templates.ts       # auto-follow-up template renderer
```

## Brand

Four colors only: Ink `#0B1220`, Paper `#F6F2EA`, Action `#F25A3C`,
Done `#1A8F5E`. Hanken Grotesk for UI; JetBrains Mono for tags and labels.
Tokens live in `src/app/globals.css` under `@theme`.
