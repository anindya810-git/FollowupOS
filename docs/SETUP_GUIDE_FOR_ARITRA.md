# Pendingly — Setup Guide for Aritra

Hi Aritra! This document walks you through getting Pendingly running on
your laptop so you can show it to me. Follow the steps in order. If
anything fails, scroll to the **Troubleshooting** section at the bottom.

**Total time:** about 30 minutes (most of which is creating Google/Anthropic
accounts if you don't already have them).

---

## What you're installing

Pendingly is a Next.js web app. You'll:
1. Install the tools you need (Node, Git, GitHub access)
2. Clone the code from GitHub
3. Set up some API keys (Google for Gmail login, Anthropic for AI)
4. Run the app locally
5. Open it in your browser

---

## Step 1 — Install the tools

You need three things installed on your computer.

### 1a. Node.js (version 20 or higher)

- Go to **https://nodejs.org**
- Download the **LTS** version (currently 20.x or 22.x — either works)
- Run the installer with default settings

**To verify**, open Terminal (Mac) or PowerShell (Windows) and type:

```bash
node --version
```

You should see something like `v20.18.0`. If you see `command not found`,
restart your terminal and try again.

### 1b. Git

- **Mac:** It's already installed. Open Terminal and type `git --version`
  to confirm. If prompted, install the Xcode Command Line Tools.
- **Windows:** Download from **https://git-scm.com/download/win** and
  install with default settings.

To verify:
```bash
git --version
```

### 1c. A code editor (optional but helpful)

I recommend **VS Code** from **https://code.visualstudio.com**. You don't
need it to run Pendingly, but it's useful if you want to look at the code.

---

## Step 2 — Get access to the GitHub repository

The repository is private. You need a GitHub account, and I need to add
you as a collaborator.

### 2a. Create or sign in to GitHub

- Go to **https://github.com** and sign in (or create an account).
- Tell me your GitHub username. I'll add you as a collaborator to the
  `anindya810-git/FollowupOS` repository.
- You'll get an email invite — accept it.

### 2b. Set up Git on your machine

Tell Git who you are (use the same email as your GitHub account):

```bash
git config --global user.name "Aritra"
git config --global user.email "your-email@example.com"
```

### 2c. Authenticate with GitHub

When you clone or push, GitHub will ask for credentials. The easiest way
is **GitHub CLI**:

- Install from **https://cli.github.com**
- After installing, run:
  ```bash
  gh auth login
  ```
- Choose: `GitHub.com` → `HTTPS` → `Login with a web browser`.
- Copy the one-time code, hit Enter, paste it in the browser tab that
  opens, authorise.

(Alternative without GitHub CLI: when Git asks for a password during clone,
generate a **Personal Access Token** at
`https://github.com/settings/tokens` with `repo` scope and paste that as
the password.)

---

## Step 3 — Clone the repository

Pick a folder where you want the code. For example, your home directory:

```bash
cd ~
git clone https://github.com/anindya810-git/FollowupOS.git
cd FollowupOS
```

You should now be inside a folder called `FollowupOS` with files like
`package.json`, `README.md`, etc.

### 3a. Switch to the latest branch

The latest code lives on a branch called `claude/build-from-prd-ZjpeZ`,
not `main`. Switch to it:

```bash
git checkout claude/build-from-prd-ZjpeZ
git pull
```

To confirm you're on the right branch:
```bash
git branch --show-current
```
Should print `claude/build-from-prd-ZjpeZ`.

---

## Step 4 — Install dependencies

From inside the `FollowupOS` folder:

```bash
npm install --legacy-peer-deps
```

This takes 2-5 minutes. The `--legacy-peer-deps` flag is needed because
one of the dependencies (NextAuth beta) has a peer-dep conflict that's
safe to ignore.

If you see warnings, that's fine. If you see **errors** (in red),
screenshot them and send to me.

---

## Step 5 — Set up environment variables

Pendingly needs some secret keys to talk to Google and Anthropic.

### 5a. Copy the example file

```bash
cp .env.example .env.local
```

This creates `.env.local` — open it in any text editor (VS Code, Notepad,
TextEdit, whatever). You'll see lines like `GOOGLE_CLIENT_ID=` with blank
values. We're going to fill in the important ones.

### 5b. Generate the random secrets

In your terminal, run these two commands and copy the output of each:

```bash
openssl rand -base64 32
openssl rand -base64 32
```

Each runs once and prints a random string like `kY8h9p...=`. Paste the
**first** output after `NEXTAUTH_SECRET=` in `.env.local`, and the
**second** after `ENCRYPTION_KEY=`.

**On Windows without openssl:** use PowerShell instead:
```powershell
[Convert]::ToBase64String((1..32 | ForEach-Object {Get-Random -Maximum 256}))
```
Run it twice, paste each output.

Also set:
```
DATABASE_URL=file:./prisma/dev.db
NEXTAUTH_URL=http://localhost:3000
```

(These two should already be in the file — leave them as-is.)

### 5c. Get an Anthropic API key

- Go to **https://console.anthropic.com**
- Sign up / sign in
- Top-right → **API Keys** → **Create Key**
- Give it any name (e.g. "Pendingly local")
- Copy the key (starts with `sk-ant-...`) and paste it after
  `ANTHROPIC_API_KEY=` in `.env.local`

**Note:** Anthropic gives free trial credit. If you run out, signing in
with a payment method costs about $0.30 per inbox scanned. You can also
ask me for a key.

### 5d. Get Google OAuth credentials (for Gmail login)

This is the longest step but it's a one-time thing.

1. Go to **https://console.cloud.google.com**
2. Top-left dropdown → **New Project** → name it `Pendingly Local` → Create
3. Wait 30 seconds for it to provision, then select the project from the dropdown
4. Left menu → **APIs & Services** → **Enabled APIs** → **+ Enable APIs and Services**
5. Search for **Gmail API**, click it, hit **Enable**
6. Go back and search for **Google Calendar API**, click it, hit **Enable**
7. Left menu → **APIs & Services** → **OAuth consent screen**
   - User Type: **External** → Create
   - App name: `Pendingly Local`
   - User support email: your email
   - Developer contact: your email
   - Save and continue through all screens with defaults
   - On the **Test users** screen, click **+ Add Users** and add your own
     Gmail address (you can only sign in with users you list here)
8. Left menu → **Credentials** → **+ Create Credentials** → **OAuth client ID**
   - Application type: **Web application**
   - Name: `Pendingly Local`
   - **Authorized redirect URIs** → click **+ Add URI** and paste:
     ```
     http://localhost:3000/api/auth/callback/google
     ```
   - Also add a second one:
     ```
     http://localhost:3000/api/integrations/gmail/callback
     ```
   - Hit **Create**
9. A box pops up showing **Client ID** and **Client Secret**. Copy both
   into `.env.local`:
   ```
   GOOGLE_CLIENT_ID=<paste the client ID>
   GOOGLE_CLIENT_SECRET=<paste the client secret>
   ```

You can leave the **Outlook**, **VAPID**, and **CRON_SECRET** variables
blank — those are only needed if you want to test Outlook login, push
notifications, or scheduled jobs. The app will run fine without them.

### 5e. Save `.env.local`

Make sure your editor saved the file. The filename must be exactly
`.env.local` (with the dot at the start).

---

## Step 6 — Set up the database

Pendingly uses SQLite, which is just a file on disk. Run:

```bash
npx prisma db push
```

This creates `prisma/dev.db`. If it asks "Are you sure?", answer yes.

You should see a success message ending with
`The database is now in sync with your Prisma schema.`

---

## Step 7 — Run the app

```bash
npm run dev
```

After 10-30 seconds you'll see:

```
✓ Ready in ...
- Local: http://localhost:3000
```

Open **http://localhost:3000** in Chrome or Safari. You should see the
Pendingly landing page (orange chevron logo, "Never miss a follow-up
again").

Leave this terminal window open — closing it stops the app.

---

## Step 8 — Sign in and connect your inbox

1. Click **Sign in** on the landing page.
2. Choose your Google account (the one you added as a test user in step 5d).
3. Google will warn you the app is unverified — click **Advanced** →
   **Go to Pendingly Local (unsafe)**. This warning is normal for any
   un-published OAuth app; it's perfectly safe because you built it.
4. Approve the Gmail + Calendar permissions.
5. You'll land on a "Connect your inbox" page. Click **Connect Gmail**.
6. Approve again.
7. Watch the scan progress page — it takes 1-3 minutes depending on inbox size.
8. When complete, you'll land on the dashboard with the guided onboarding
   tour. Walk through the 6 steps.
9. Show me!

---

## Things to show me

Click around and see:

- **Dashboard** — your daily summary, top priorities
- **All Items** (queue) — the full list with filters and bulk select
- **Analytics** — health score, TAT, volume trends, top contacts
- **Settings** — connected inboxes, automation toggles
- **Help** — the FAQ search

Open any action item to see the AI's reasoning and try **Generate Reply**
in a few different tones. (Don't hit Send Reply unless you actually want
to send an email!)

On your phone, point your phone's camera at this URL:
**`http://<your-laptop-IP>:3000`** (you need to be on the same Wi-Fi).
Add it to your home screen — Pendingly works as a PWA on mobile.

---

## Stopping the app

In the terminal where you ran `npm run dev`, press **Ctrl+C** (or
**Cmd+C** on Mac). To restart later: `cd FollowupOS && npm run dev`.

---

## Troubleshooting

### "command not found: npm" or "node"
You didn't install Node, or your terminal hasn't picked it up yet.
Close and reopen the terminal. If still broken, reinstall Node from
nodejs.org.

### "Permission denied" on macOS
Try the install command with `sudo`:
```bash
sudo npm install --legacy-peer-deps
```
But the better fix is to set npm's prefix to a user-writable directory.
Google "npm permission denied macOS fix" — the first answer works.

### `git: command not found`
Install Git from `https://git-scm.com/downloads`.

### Authentication failed when cloning
You don't have GitHub access yet, or you skipped step 2c. Run
`gh auth login` and try again. Or generate a Personal Access Token.

### `Error: Missing environment variable: ANTHROPIC_API_KEY`
You didn't fill in `.env.local`, or you saved it with the wrong filename.
The file must be `.env.local` (note the leading dot) in the project root.

### "Access blocked: Pendingly Local has not completed the Google
verification process"
Click **Advanced** → **Go to Pendingly Local (unsafe)** at the bottom of
that page. The warning is because the OAuth app is in test mode — only
emails you added in the **Test users** screen (step 5d.7) can sign in.

### The page is blank / says "Error"
Look at the terminal where `npm run dev` is running. The error message
will be there. Screenshot it and send to me.

### `EADDRINUSE: port 3000 already in use`
Something else is using port 3000. Either kill it or run:
```bash
PORT=3001 npm run dev
```
Then open `http://localhost:3001`.

### Scan starts but never finishes
Open the browser developer console (right-click → Inspect → Console tab).
Look for red errors. Most often: Anthropic key wrong / out of credit, or
Gmail OAuth scope missing.

### "Database is locked"
Close all browser tabs of Pendingly, stop the dev server (Ctrl+C), and
restart with `npm run dev`. SQLite occasionally complains about
concurrent writes; usually self-heals.

---

## What to do after you've seen it

If everything works:
1. Sign out
2. Stop the server (Ctrl+C)
3. Delete `prisma/dev.db` if you don't want your scan data sitting around:
   `rm prisma/dev.db`
4. Send me a screenshot or recording of what you saw 🎉

If you ran into something not covered above, just send me a screenshot of
the error and the step you got stuck on. I'll sort it out.

Thanks Aritra!
— Anindya

---

## Quick reference (for future runs)

After everything is set up, running Pendingly again is just:

```bash
cd ~/FollowupOS
git pull                  # get latest code
npm install --legacy-peer-deps   # only if package.json changed
npx prisma db push        # only if schema changed
npm run dev
```

Open `http://localhost:3000`.
