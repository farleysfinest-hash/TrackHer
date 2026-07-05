# TrackHer

HRT/BHRT symptom and wellness tracker for menopausal women. Batch 1 foundation: auth, onboarding, app shell, database schema, and static data catalogs.

## Tech Stack

- React 19 + TypeScript (strict) + Vite
- Tailwind CSS v4 (CSS-first config)
- Supabase (auth + PostgreSQL)
- React Router v7
- Zustand
- Lucide React

## Getting Started

### 1. Install dependencies

```bash
npm install
```

### 2. Configure Supabase

Copy the environment template and add your Supabase project credentials:

```bash
cp .env.example .env
```

Set `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` in `.env`.

### 3. Run database migration

Apply the initial schema in your Supabase project SQL editor or via CLI:

```bash
# Using Supabase CLI (if linked)
supabase db push
```

Or run `supabase/migrations/001_initial_schema.sql` manually in the Supabase dashboard.

### 4. Configure auth redirect URLs

In Supabase Dashboard → Authentication → URL Configuration, add:

- Site URL: `http://localhost:5173`
- Redirect URLs: `http://localhost:5173/reset-password`

### 5. Start dev server

```bash
npm run dev
```

## Project Structure

```
src/
├── components/   # UI, auth, onboarding, layout
├── data/         # Medication catalog, symptom catalog, lab ranges
├── hooks/        # useAuth, useProfile
├── lib/          # Supabase client, constants
├── pages/        # Route pages
├── stores/       # Zustand auth + onboarding state
├── types/        # TypeScript types for DB + domain
└── utils/        # Validation, formatters
```

## Batch 1 Features

- Email/password authentication (signup, login, forgot/reset password)
- 3-step onboarding wizard (profile → menopause stage → check-in frequency)
- Protected routes with onboarding gate
- App shell with sidebar (desktop) and bottom tabs (mobile)
- Settings page (profile edit, password change)
- Placeholder pages for Dashboard, Medications, Check-in, Labs, Insights
- Complete database schema with RLS policies
- Static data: 60+ medications, 55 symptoms, 28 lab biomarkers

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start development server |
| `npm run build` | Production build |
| `npm run preview` | Preview production build |
| `npm run lint` | Run oxlint |

## Medical Disclaimer

This app is for educational and personal record-keeping purposes only. It is not intended to provide medical advice or replace the guidance of your physician or healthcare provider.
