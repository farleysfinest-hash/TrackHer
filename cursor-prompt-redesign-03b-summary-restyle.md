# Redesign 3b — Merge date range + score summary into one calm surface

## Context
On the dashboard, the date-range selector and the four stat cards render as FIVE sibling boxes for what is conceptually one unit ("your numbers for this period"). The preset chips wrap unevenly on narrow screens, and two stat values break the palette (green `--color-success` on Days logged, moss on Symptom burden). Merge into ONE card, make the selector a full-width segmented control that never wraps, and pull the colors back into the rose/plum family.

## Preconditions
- Prompt 03 merged. Clean tree, new branch.
- Files (verified): `src/components/dashboard/DateRangeSelector.tsx`, `src/components/dashboard/ScoreSummaryCards.tsx`, `src/components/ui/StatCard.tsx`, `src/components/dashboard/scoreSummary.ts`, `src/components/dashboard/DashboardLayout.tsx`.

## Part A — One surface
Create the merged component inside `ScoreSummaryCards.tsx` (keep the export name `ScoreSummaryCards` so `DashboardLayout` needs minimal change):
1. One `Card variant="elevated"` containing, top to bottom:
   - a single quiet header line: eyebrow-style "This period" + the formatted range (`formatChartDateLong(dateRange.start)` – `…end`) in `text-sm text-sage-500`. Drop the big `DashboardCardHeader` (icon, title, "Scopes your averages…" description) — the segmented control is self-explanatory.
   - the segmented control (Part B)
   - the 2×2 metric grid (Part C)
2. `DateRangeSelector.tsx`: move its preset logic into the merged component (it's all from `useDashboardStore`: `datePreset`, `dateRange`, `setDatePreset`). Keep the `useDashboardDateRange` export — grep for its consumers before deleting anything. Delete the standalone `DateRangeSelector` component and its render in `DashboardLayout` once merged.

## Part B — Segmented control that never wraps
Replace the `flex flex-wrap` chip row with: `grid grid-cols-5` (equal columns, full width), labels shortened so they can never wrap at 320pt: `30d`, `90d`, `6mo`, `1yr`, `All`. Selected: `bg-sage-500 text-on-accent rounded-md`; unselected: `text-sage-600`. Container keeps the existing `rounded-lg border border-sand-200 bg-sand-50/80 p-1` track look. Test at 320pt and 430pt — one even row at both.

## Part C — Metric grid, no inner boxes
1. In `StatCard.tsx`, add a `variant?: 'card' | 'cell'` prop (default `'card'` so other consumers — grep for `StatCard` usages first — are untouched). `'cell'` renders WITHOUT border/background/shadow/rounding: just label, value, subtext with padding.
2. Grid: `grid grid-cols-2` with hairline dividers (`divide-x divide-y divide-sand-200` or per-cell borders — whichever renders clean corners) inside the parent card. On `lg:` keep 2×2 (it lives in a card now; four-across is no longer needed — simpler and even).
3. Long string values ("Worth watching") currently render at `text-3xl` and dominate. In `StatCard`, when `value` is a non-numeric string longer than ~8 chars, step down to `text-xl` — numbers stay `text-3xl`.

## Part D — Palette discipline
1. `ScoreSummaryCards.tsx`: REMOVE `color={... 'var(--color-success)'}` from Days logged and `color={... 'var(--color-moss-600)'}` from Symptom burden. All four values render `text-sage-800`.
2. Positive signals move to the SUBTEXT: when `summary.burdenImproving`, show the improving detail in `text-moss-600`; same treatment if a positive trend note exists for days logged. Small green accent text is fine — a giant green number is not.
3. The Energy card shows a red dot next to the sleep value (visible on device). `StatCard` renders subtext as plain text, so the dot comes from elsewhere — grep `ScoreSummaryCards`/`scoreSummary.ts`/`StatCard` consumers for `danger`, `bg-red`, `dot`, `•`, or an absolutely-positioned span, find its source, and either remove it or restyle it to `bg-sage-400`. Do not leave a `--color-danger` element inside the summary card. If the source turns out to be outside these files, fix it where it lives and note the location in the PR description.

## Verify
`npm run lint && npm run test && npm run build`. On simulator at 320pt and 430pt: ONE card for the whole section; selector is a single even row; all four values plum; no green numbers, no red dot; hairlines align cleanly in the 2×2 grid.

## Commit
```
git add src/components/dashboard/ScoreSummaryCards.tsx src/components/dashboard/DateRangeSelector.tsx src/components/ui/StatCard.tsx src/components/dashboard/DashboardLayout.tsx
git add -u
git commit -m "redesign: merge date range and score summary into one surface, palette cleanup"
```
