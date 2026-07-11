# TrackHer — Deployment & Testing Guide

This app is a **Vite React frontend** backed by **Supabase** (auth + PostgreSQL). You do not need a custom domain to start — free hosting gives you a URL like `trackher.pages.dev`.

## Architecture

```
Browser  →  Cloudflare Pages / Vercel (static React app)  →  Supabase (auth + database)
```

| Layer | Service | Cost to start |
|-------|---------|---------------|
| Frontend | [Cloudflare Pages](https://pages.cloudflare.com) or [Vercel](https://vercel.com) | Free |
| Backend | [Supabase](https://supabase.com) | Free tier |
| Code | [GitHub](https://github.com) | Free (private repos OK) |

---

## Phase 1 — Shared test database (recommended)

Best for: testers using signup, check-ins, medications, and labs with real persistence.

### 1. Create a Supabase project

1. Go to [supabase.com/dashboard](https://supabase.com/dashboard) → **New project** (name it e.g. `trackher-test`).
2. Wait for the project to finish provisioning.

### 2. Run the database migration

In Supabase → **SQL Editor**, paste and run the contents of:

`supabase/migrations/001_initial_schema.sql`

(Apply any later migrations in order as well.)

### 3. Get API keys

Supabase → **Project Settings → API**:

- **Project URL** → `VITE_SUPABASE_URL`
- **anon public** key → `VITE_SUPABASE_ANON_KEY`

Never put the **service_role** key in the frontend or in GitHub.

### 4. Configure auth URLs

Supabase → **Authentication → URL Configuration**:

| Setting | Local dev | Deployed URL |
|---------|-----------|--------------|
| Site URL | `http://localhost:5173` | `https://YOUR-APP.pages.dev` |
| Redirect URLs | `http://localhost:5173/reset-password` | `https://YOUR-APP.pages.dev/reset-password` |

Add **both** local and deployed URLs so you and your tester can use either.

### 5. Set hosting environment variables

| Name | Value | Environments |
|------|-------|--------------|
| `VITE_SUPABASE_URL` | your test project URL | Production |
| `VITE_SUPABASE_ANON_KEY` | your anon key | Production |

Redeploy after changing env vars.

Each tester creates their own account (or uses the seeded test account). Row Level Security keeps data separate per user.

**Local equivalent:**

```bash
cp .env.example .env
# Fill in VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY
npm install
npm run dev
```

---

## Phase 2 — Production web app (when you launch)

Use a **separate Supabase project** for production (never share test and prod databases).

| | Test / staging | Production |
|--|----------------|------------|
| Supabase project | `trackher-test` | `trackher-prod` |
| Hosting | Preview branch or second project | Production domain |
| Custom domain | optional | recommended |

Suggested hosting setup:

- **Production** branch: `main` → your custom domain or default pages URL
- **Preview** branches: every PR gets its own URL (good for review before merge)

Optional later steps:

- Custom domain (Namecheap, Cloudflare, etc.) → point DNS to your host
- Supabase Pro if you outgrow free tier
- Error monitoring (Sentry)
- Analytics

---

## GitHub setup (one time)

If you have not pushed this repo yet:

1. Create a new repository on GitHub (private recommended).
   - Do **not** initialize with README (you already have one).
2. In Terminal:

```bash
cd /path/to/PredictHer
git remote add origin https://github.com/YOUR_USERNAME/trackher.git
git push -u origin main
```

3. Invite your tester: GitHub repo → **Settings → Collaborators → Add people**.

After GitHub is connected, import the repo in your host with **Import Git Repository** — every push to `main` auto-deploys.

---

## Cloudflare Pages / Vercel setup (one time)

1. Sign up and connect your GitHub account.
2. **Add New → Project** → select the TrackHer repo.
3. Build settings (auto-detected for Vite):
   - Build command: `npm run build`
   - Output directory: `dist`
4. Add `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` environment variables.
5. Click **Deploy**.

The included routing config handles client-side routing (React Router) so `/dashboard`, `/checkin`, etc. work on refresh.

---

## Environment variable reference

| Variable | Required | Description |
|----------|----------|-------------|
| `VITE_SUPABASE_URL` | Yes | Supabase project URL |
| `VITE_SUPABASE_ANON_KEY` | Yes | Supabase anon (public) key |

Copy `.env.example` to `.env` for local development. **Never commit `.env`.**

---

## Checklist before sharing with a tester

- [ ] Code pushed to GitHub
- [ ] Hosting project connected and deployed
- [ ] Supabase env vars set in hosting dashboard
- [ ] Supabase migration run, auth URLs include deployed URL
- [ ] Send tester the live link (and `docs/TESTER.md` if they clone locally)

---

## Troubleshooting

**Blank page after deploy** — Check build logs. Run `npm run build` locally.

**Login redirect fails** — Supabase auth URLs must exactly match your deployed URL (including `https`).

**Works locally but not on deploy** — Env vars must be set in the hosting dashboard, not only in local `.env`. Redeploy after changes.

**Routes 404 on refresh** — Ensure SPA rewrites are configured; redeploy if missing.
