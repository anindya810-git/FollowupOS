@AGENTS.md

# DEPLOYMENT — READ THIS FIRST

**Vercel production deploys from branch: `claude/build-from-prd-ZjpeZ`**

- ALL commits must be pushed to `claude/build-from-prd-ZjpeZ`
- `main` is NOT the deployment branch — do NOT push to it, do NOT sync to it
- Never add a GitHub Actions workflow to sync branches
- When the user asks "why isn't it deployed", check that you pushed to `claude/build-from-prd-ZjpeZ`

# DATABASE SCHEMA CHANGES — READ THIS FIRST

**Never use `prisma db push` in the build script — it times out on Vercel.**

- The build script is `next build` only — do NOT add `prisma db push` back
- For ALL schema changes (new tables, new columns, removed columns, renamed columns, new indexes), tell the user to apply them manually in **Supabase → SQL Editor** and provide the exact SQL to run
- Example: adding a nullable column → `ALTER TABLE "ModelName" ADD COLUMN IF NOT EXISTS "fieldName" TEXT;`
- Prisma Client only needs the columns to exist at runtime — it does not care how they got there
