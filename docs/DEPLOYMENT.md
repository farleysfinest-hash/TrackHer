# TrackHer — Deployment & Testing Guide

This app is a **Vite React frontend** backed by **Supabase** (auth + PostgreSQL). You do not need a custom domain to start — free hosting gives you a URL like `trackher.vercel.app`.

## Architecture

```
Browser  →  Vercel (static React app)  →  Supabase (auth + database)
```

| Layer | Service | Cost to start |
|-------|---------|---------------|
| Frontend | [Vercel](https://vercel.com) | Free |
| Backend | [Supabase](https://supabase.com) | Free tier |
| Code | [GitHub](https://github.com) | Free (private repos OK) |

---

## Phase 1 — Let someone test now (no Supabase required)

Best for: quick UI review with mock data.

1. Push this repo to GitHub (see below).
2. Import the repo in [Vercel](https://vercel.com/new).
3. Set **one** environment variable in Vercel → Project → Settings → Environment Variables:

   | Name | Value | Environments |
   |------|-------|--------------|
   | `VITE_DEV_MODE` | `true` | Production, Preview, Development |

4. Deploy. Share the URL Vercel gives you (e.g. `https://trackher-xxx.vercel.app`).

The tester opens the link in any browser. They get mock data, no signup, and a **DEV MODE** badge. Each person's browser keeps its own local mock state.

**Local equivalent:**

```bash
cp .env.example .env
# Set VITE_DEV_MODE=true in .env
npm install
npm run dev
```

---

## Phase 2 — Real accounts for testers (shared test database)

Best for: two people testing signup, check-ins, medications, and labs with real persistence.

### 1. Create a Supabase project

1. Go to [supabase.com/dashboard](https://supabase.com/dashboard) → **New project** (name it e.g. `trackher-test`).
2. Wait for the project to finish provisioning.

### 2. Run the database migration

In Supabase → **SQL Editor**, paste and run the contents of:

`supabase/migrations/001_initial_schema.sql`

### 3. Get API keys

Supabase → **Project Settings → API**:

- **Project URL** → `VITE_SUPABASE_URL`
- **anon public** key → `VITE_SUPABASE_ANON_KEY`

Never put the **service_role** key in the frontend or in GitHub.

### 4. Configure auth URLs

Supabase → **Authentication → URL Configuration**:

| Setting | Local dev | Vercel test URL |
|---------|-----------|-----------------|
| Site URL | `http://localhost:5173` | `https://YOUR-APP.vercel.app` |
| Redirect URLs | `http://localhost:5173/reset-password` | `https://YOUR-APP.vercel.app/reset-password` |

Add **both** local and Vercel URLs so you and your tester can use either.

### 5. Update Vercel environment variables

| Name | Value | Environments |
|------|-------|--------------|
| `VITE_SUPABASE_URL` | your test project URL | Production |
| `VITE_SUPABASE_ANON_KEY` | your anon key | Production |
| `VITE_DEV_MODE` | `false` | Production |

Redeploy after changing env vars (Vercel → Deployments → ⋮ → Redeploy).

Each tester creates their own account. Row Level Security keeps data separate per user.

---

## Phase 3 — Production web app (when you launch)

Use a **separate Supabase project** for production (never share test and prod databases).

| | Test / staging | Production |
|--|----------------|------------|
| Supabase project | `trackher-test` | `trackher-prod` |
| Vercel | Preview branch or second project | Production domain |
| `VITE_DEV_MODE` | `false` | `false` |
| Custom domain | optional | recommended |

Suggested Vercel setup:

- **Production** branch: `main` → your custom domain or `trackher.vercel.app`
- **Preview** branches: every PR gets its own URL (good for review before merge)

Optional later steps:

- Custom domain (Namecheap, Cloudflare, etc.) → point DNS to Vercel
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
cd /Users/james/Desktop/PredictHer
git remote add origin https://github.com/YOUR_USERNAME/trackher.git
git push -u origin main
```

3. Invite your tester: GitHub repo → **Settings → Collaborators → Add people**.

After GitHub is connected, import the repo in Vercel with **Import Git Repository** — every push to `main` auto-deploys.

---

## Vercel setup (one time)

1. Sign up at [vercel.com](https://vercel.com) with your GitHub account.
2. **Add New → Project** → select the TrackHer repo.
3. Vercel auto-detects Vite. Defaults are fine:
   - Build command: `npm run build`
   - Output directory: `dist`
4. Add environment variables (Phase 1 or Phase 2 above).
5. Click **Deploy**.

The included `vercel.json` handles client-side routing (React Router) so `/dashboard`, `/checkin`, etc. work on refresh.

---

## Environment variable reference

| Variable | Required | Description |
|----------|----------|-------------|
| `VITE_SUPABASE_URL` | Phase 2+ | Supabase project URL |
| `VITE_SUPABASE_ANON_KEY` | Phase 2+ | Supabase anon (public) key |
| `VITE_DEV_MODE` | No | `true` = mock data, skip Supabase |

Copy `.env.example` to `.env` for local development. **Never commit `.env`.**

---

## Checklist before sharing with a tester

- [ ] Code pushed to GitHub
- [ ] Vercel project connected and deployed
- [ ] Env vars set for the phase you want (1 or 2)
- [ ] If Phase 2: Supabase migration run, auth URLs include Vercel URL
- [ ] Send tester the Vercel link (and `docs/TESTER.md` if they clone locally)

---

## Troubleshooting

**Blank page after deploy** — Check Vercel build logs. Run `npm run build` locally.

**Login redirect fails** — Supabase auth URLs must exactly match your deployed URL (including `https`).

**Works locally but not on Vercel** — Env vars must be set in Vercel dashboard, not only in local `.env`. Redeploy after changes.

**Routes 404 on refresh** — `vercel.json` rewrites should be in the repo; redeploy if missing.
