@AGENTS.md

# DEPLOYMENT — READ THIS FIRST

**Vercel production deploys from branch: `claude/build-from-prd-ZjpeZ`**

- ALL commits must be pushed to `claude/build-from-prd-ZjpeZ`
- `main` is NOT the deployment branch — do NOT push to it, do NOT sync to it
- Never add a GitHub Actions workflow to sync branches
- When the user asks "why isn't it deployed", check that you pushed to `claude/build-from-prd-ZjpeZ`
