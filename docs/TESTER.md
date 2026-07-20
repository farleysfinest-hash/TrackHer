# TrackHer — Tester Quick Start

Thanks for helping test TrackHer. You can try it **in your browser** (easiest) or **run it locally**.

## Option A — Just open the link (recommended)

Your collaborator will send you a URL like:

`https://trackher-xxxxx.pages.dev`

Open it in Chrome, Safari, or Firefox on any computer. No install needed.

Create an account with email and password, or use the seeded test account credentials your collaborator provides. Your data is saved to the shared test database. Use a real email if you want to test password reset.

---

## Option B — Run on your computer

Requires Node.js 20+ ([nodejs.org](https://nodejs.org)).

```bash
git clone https://github.com/YOUR_ORG/trackher.git
cd trackher
npm install
cp .env.example .env
```

Edit `.env` — ask the project owner for `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`.

```bash
npm run dev
```

Open `http://localhost:5173`

---

## What to try

1. **Dashboard** — charts, insights, score cards
2. **Check-in** — log symptoms (full or quick mode)
3. **Medications** — add or view HRT medications
4. **Labs** — enter lab results, see color-coded ranges
5. **Insights** — pattern detection from your data (needs enough check-ins)

---

## Reporting issues

Note:

- What page you were on
- What you clicked
- What you expected vs what happened
- Screenshot if possible

Send feedback to the project owner via whatever channel they prefer (text, email, GitHub Issues).

---

## Maintainer: seed the Patterns test fixture

The one-off history fixture defaults to a safe dry run and never stores credentials in source. It
rebuilds weekly MRS assessments and realistic personal-symptom histories, including sparse and
zero-severity observations for chart edge-case coverage.
Put these variable names in `.env.local`:

```dotenv
SUPABASE_URL=...
SUPABASE_SERVICE_ROLE_KEY=...
SEED_USER_EMAIL=...
```

Then run:

```bash
npx tsx scripts/seed-pattern-history.ts --dry-run
npx tsx scripts/seed-pattern-history.ts --apply
```

Optional configuration: `SEED_DAYS` (default `180`). Keep service-role credentials only in
`.env.local` or the invoking process environment; never commit them.

---

## Medical note

TrackHer is for personal tracking and education only. It is not medical advice. Always consult your healthcare provider about hormone therapy decisions.
