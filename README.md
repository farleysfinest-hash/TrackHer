# TrackHer

HRT/BHRT symptom and wellness tracker for menopausal women. Track medications, symptoms, and lab results — then surface patterns showing what's helping and what's hurting.

## Tech Stack

- React 19 + TypeScript + Vite
- Tailwind CSS v4
- Supabase (auth + PostgreSQL)
- React Router v7
- Zustand
- Recharts

## Features (current)

- Auth, onboarding, and settings
- Medication management with dose change history
- Symptom check-ins (MRS core + extended + wellbeing)
- Lab results with reference ranges and trends
- Dashboard with charts, heatmaps, and drill-down
- Rule-based insights (pattern engine)
- PDF provider report export

## Quick start (local)

```bash
npm install
cp .env.example .env
```

Add your Supabase URL and anon key to `.env`, then:

```bash
npm run dev
```

Open `http://localhost:5173`

See [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md) for deployment and the seeded test account.

## Share with a tester

You do **not** need your own domain. Deploy to Vercel and send a link.

| Goal | Guide |
|------|-------|
| Deploy + test URL + production path | [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md) |
| Instructions for your tester | [docs/TESTER.md](docs/TESTER.md) |

**Fast path:** GitHub → Cloudflare Pages (or Vercel) → set Supabase env vars → share the URL.

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start development server |
| `npm run build` | Production build |
| `npm run preview` | Preview production build locally |
| `npm run lint` | Run oxlint |

## Project structure

```
src/
├── components/   # UI, pages, dashboard, insights
├── engine/       # Rule-based pattern recognition (Batch 6)
├── data/         # Medication, symptom, lab catalogs
├── hooks/        # Data fetching and business logic
├── lib/          # Supabase client and shared utilities
├── pages/        # Route pages
├── stores/       # Zustand state
└── utils/        # Helpers, formatters, PDF

supabase/migrations/   # Database schema
docs/                  # Deployment and tester guides
```

## Medical disclaimer

This app is for educational and personal record-keeping purposes only. It is not intended to provide medical advice or replace the guidance of your physician or healthcare provider.
