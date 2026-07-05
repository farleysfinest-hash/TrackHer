# TrackHer — Tester Quick Start

Thanks for helping test TrackHer. You can try it **in your browser** (easiest) or **run it locally**.

## Option A — Just open the link (recommended)

Your collaborator will send you a URL like:

`https://trackher-xxxxx.vercel.app`

Open it in Chrome, Safari, or Firefox on any computer. No install needed.

### If you see a DEV MODE badge

The app is using sample data. You can click around the dashboard, medications, check-ins, labs, and insights without creating an account. Data is stored in your browser session only.

### If there is no DEV MODE badge

Create an account with email and password. Your data is saved to the shared test database. Use a real email if you want to test password reset.

---

## Option B — Run on your computer

Requires Node.js 20+ ([nodejs.org](https://nodejs.org)).

```bash
git clone https://github.com/YOUR_ORG/trackher.git
cd trackher
npm install
cp .env.example .env
```

Edit `.env`:

- For quick demo: set `VITE_DEV_MODE=true`
- For real backend: ask the project owner for Supabase URL and anon key, set `VITE_DEV_MODE=false`

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

## Medical note

TrackHer is for personal tracking and education only. It is not medical advice. Always consult your healthcare provider about hormone therapy decisions.
