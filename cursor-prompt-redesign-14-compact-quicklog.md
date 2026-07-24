# Redesign 14 — Compact quick-log, move recent logs to Check In

## Context
On the dashboard, Quick Log and Recent Logs render as TWO full-width cards stacked vertically. Together they push the real dashboard content (score summary, charts, insights) below the fold on every phone. Quick Log alone needs a card — it's the primary action. Recent Logs is review/history and belongs on the Check In tab alongside `CheckinHistory`.

## Preconditions
- Branch: `redesign/03b-summary-restyle` (or wherever HEAD is). Clean tree.
- Files (verified):
  - `src/components/dashboard/QuickLogWidget.tsx` — renders `Card variant="elevated"` with `DashboardCardHeader` (icon, eyebrow, title, description) + symptom chips.
  - `src/components/dashboard/RecentLogs.tsx` — renders `Card variant="elevated"` with collapsible log list. Only imported by `DashboardLayout.tsx`.
  - `src/components/dashboard/DashboardLayout.tsx` — renders `<QuickLogWidget />` then `<RecentLogs />` in both `full` and `early` dashboard modes (lines ~143–145 and ~207–209).
  - `src/pages/CheckinPage.tsx` — renders `WeeklyCheckinPromptCard`, `PulsePromptCard`, backdate UI, then `CheckinHistory`. Has no quick-log references today.

## Part A — Slim down QuickLogWidget

In `QuickLogWidget.tsx`:

1. **Replace the `DashboardCardHeader`** with a single inline header row. Remove the `DashboardCardHeader` import and its render. Replace with:
   ```tsx
   <div className="flex items-center gap-2">
     <Zap className="h-[18px] w-[18px] shrink-0 text-sage-500" aria-hidden />
     <p className="text-xs font-medium uppercase tracking-wide text-sage-500">Quick log</p>
     <span className="ml-auto text-sm text-sage-400">in the moment · ~5 sec</span>
   </div>
   ```
   Keep the `Zap` import from `lucide-react` (already imported). This puts icon + eyebrow left, description hint right, all on one line.

2. **Change `mt-4`** on the chip container `div` to `mt-2.5` so the chips sit tighter under the header.

3. **Add `flex: 1 0 auto` and `text-center`** to each chip button so chips stretch to fill available row width instead of leaving ragged gaps. Change the chip `className` from:
   ```
   inline-flex items-center gap-2 rounded-full border border-sage-200 bg-sage-50 px-3 py-1.5 text-sm font-medium text-sage-700 transition-colors hover:border-sage-400 hover:bg-sage-100 active:scale-[0.98]
   ```
   to:
   ```
   inline-flex flex-1 items-center justify-center gap-2 rounded-full border border-sage-200 bg-sage-50 px-3 py-1.5 text-sm font-medium text-sage-700 transition-colors hover:border-sage-400 hover:bg-sage-100 active:scale-[0.98]
   ```
   (Added `flex-1` and `justify-center`; changed `inline-flex` stays so they still wrap.)

4. Everything else stays: the `Card variant="elevated"` wrapper, the `QuickLogSheet`.

Net effect: the card goes from icon + eyebrow + title + description + chips (5 visual rows) to one header line + balanced chip rows (2–3 visual rows).

## Part B — Remove RecentLogs from the dashboard

In `DashboardLayout.tsx`:

1. Remove the `import { RecentLogs } from './RecentLogs';` line.
2. Remove both `<RecentLogs />` renders (one in the `isFullDashboard` block, one in the `isEarlyDashboard` block).

Do NOT delete `RecentLogs.tsx` — it moves to Check In in Part C.

## Part C — Add RecentLogs to the Check In tab

In `CheckinPage.tsx`:

1. Add the import:
   ```ts
   import { RecentLogs } from '../components/checkin/RecentLogs';
   ```
   Wait — the file currently lives at `../components/dashboard/RecentLogs`. Two options: move the file or import from the current path. **Move the file** to `src/components/checkin/RecentLogs.tsx` so it lives with its new page. Update the import path in `CheckinPage.tsx` accordingly. After moving, grep the entire `src/` tree for any remaining imports of `dashboard/RecentLogs` and fix them (there should be none after Part B, but verify).

2. Render `<RecentLogs />` as the **first item** inside the return's `<div>`, before the header and prompt cards:
   ```tsx
   <div className="min-w-0 space-y-10 overflow-x-hidden">
     <RecentLogs />

     <div className="min-w-0">
       <h1 className="font-display text-3xl text-sage-800">Check In</h1>
       ...
   ```
   Quick-log history mirrors the dashboard: quick-log chips are first there, their history is first here.

## Part D — Clean up unused imports

After Parts A–C, check:
- `QuickLogWidget.tsx`: remove `DashboardCardHeader` import if no longer used.
- `DashboardLayout.tsx`: remove `RecentLogs` import (done in Part B).
- If `DashboardCardHeader` is now unused anywhere (unlikely — other cards use it), leave it.

## Verify
`npm run lint && npm run test && npm run build`. On simulator at 375pt:
- Dashboard: Quick Log card is compact (eyebrow + chips, no title/description block). No Recent Logs card anywhere on the dashboard.
- Check In tab: Recent Logs card appears at the top (above the page header), expands/collapses as before.
- Quick-log sheet still opens from a chip tap on the dashboard.

## Commit
```
git mv src/components/dashboard/RecentLogs.tsx src/components/checkin/RecentLogs.tsx
git add src/components/dashboard/QuickLogWidget.tsx src/components/dashboard/DashboardLayout.tsx src/pages/CheckinPage.tsx src/components/checkin/RecentLogs.tsx
git add -u
git commit -m "redesign: compact quick-log card, move recent logs to Check In tab"
```
