# TrackHer code audit — post outstanding-fixes pass

**Date:** 26 July 2026  
**Commit base:** `ea6379f` (Remember-me / heatmap commit) + this working tree  
**Scope:** Outstanding six from `docs/OUTSTANDING_CHANGES.md`, reconciled with the 22-finding bug report triage.

## How to read this

Findings are ordered by severity. Each states what was verified in the repository. SQL was
read from migration files only — no live Supabase project was queried. Items marked **FIXED**
were changed in this pass.

**Verification:** 427 tests passing, `tsc -b` clean, oxlint 0 errors (9 pre-existing warnings).

---

## Critical / High

### H4 — Provider PDF omitted dose administrations · **FIXED (needs SQL apply)**

**Verified:** Dashboard `useInsights` passes real `administrations` into `runPatternEngine`. The
PDF path hard-coded `administrations: []`. The engine consumes administrations only in
`wellbeingSignal.ts` trough-timing insights. App and provider document could contradict each
other about the patient's own data.

**Changed:**

- Migration `029_provider_report_administrations.sql` extends `get_provider_report_snapshot`
  with an `administrations` key filtered by `(taken_at AT TIME ZONE p_timezone)::DATE`.
- Table fallback in `providerReportData.ts` loads `medication_administrations` with the same
  pad-then-narrow pattern as quick logs (both paths — not fallback-only).
- `ProviderReportData` / executive summary now thread administrations into the engine.
- Tests cover RPC payload, table filters, and blob assembly.

**Action for you:** apply `029` in the SQL editor (and the `NOTIFY pgrst` at the bottom). Until
then the RPC returns no `administrations` key; the client treats that as `[]` (no crash), so
trough insights stay absent on the RPC path until the migration lands. The table fallback
already returns real rows when the RPC is missing or declines.

### False-confidence CI · **FIXED (with explicit caveats)**

**Verified:** No `.github/` directory previously. `supabase.ts` throws at *module load* when
env vars are missing; `vite build` never executes that guard.

**Changed:** `.github/workflows/ci.yml` runs lint, tests, and build. Build uses
placeholder-shaped `VITE_SUPABASE_*` that pass the guard so the job can typecheck and emit a
bundle. Comments in the workflow state plainly: green CI ≠ deployable without real host
secrets.

---

## Medium

### Favicon 181KB · **FIXED**

**Verified:** `public/favicon.png` was 512×512 / 181KB. Artwork uses cream negative space
(same family as `LogoMark`).

**Changed:** Re-encoded to 48×48 RGBA (~4KB). Pixel audit confirmed cream opaque pixels
survived (1848 cream-family pixels). Header `LogoMark` untouched — git history already grew
the avatar to 36px to match the mark.

### CSV export / formula injection · **FIXED**

**Verified:** Settings already had full JSON export across fifteen tables. No CSV. Convenience
gap, not a lock-out.

**Changed:** Combined CSV export for the clinical tables, with `escapeCsvCell` prefixing
`= + - @` so Excel/Sheets will not execute free-text notes as formulas. Unit tests cover the
escaping.

### Onboarding avatar · **FIXED**

**Verified:** Settings had the full Storage flow; `StepProfile` collected name only.

**Changed:** Optional picture picker on the profile step. Upload failures soft-note and never
disable Continue. Reuses `uploadProfileAvatar` / `setUiValue(AVATAR_STAMP_KEY)`.

---

## Closed as not defects (this pass)

| Item | Why |
|---|---|
| Header logo sizing | Avatar grew to 36px to meet the mark; mark never shrank. |
| M2 dose-toast off-by-one (prior report) | Pre-tap arithmetic is correct; “fixing” it would introduce the bug. |
| Remember-me as a product choice | Sessions always persist; checkbox removed and committed in `ea6379f`. |

---

## Still open (not in the six; still real)

1. **Apply migrations `028` and `029`** on the live project if not already applied. Without
   `029`, trough insights remain missing on the RPC report path.
2. **M8 — focus trap** on QuickLogSheet / CheckinFlow / LabEntryForm / MedicationEntryWizard.
3. **M5 / CODE_AUDIT M3 — unbounded reads** as a class (extract `dataExport` paging).
4. **M1 — client `user_id` filters** on mutations (defence-in-depth; RLS already enforces).
5. **No component-test / jsdom setup** — vitest is node-only `*.test.ts`.
6. **`docs/education/`** remains untracked / undecided — not part of this pass.

---

## Files touched this pass

```
.github/workflows/ci.yml
supabase/migrations/029_provider_report_administrations.sql
src/hooks/providerReportData.ts
src/utils/pdfReport.ts
src/utils/report/sections/executiveSummary.ts
src/utils/dataExport.ts
src/pages/SettingsPage.tsx
src/components/onboarding/StepProfile.tsx
public/favicon.png
src/hooks/__tests__/providerReport*.test.ts
src/utils/__tests__/dataExportCsv.test.ts
docs/OUTSTANDING_CHANGES.md
docs/BUG_REPORT_TRIAGE.md
docs/CODE_AUDIT.md (this file supersedes the 25 Jul audit for outstanding items)
```
