# TrackHer code audit

**Date:** 25 July 2026
**Commit audited:** `2811ec4` (`fix: keep personal-symptom edits and smooth chart scrub haptics`)
**Scope:** `src/**`, `supabase/migrations/**`, build and test configuration.

## How to read this

Findings are ordered by severity. Each one states what was verified and how. Where a claim
could not be verified from the repository alone, that is said explicitly rather than assumed.

**Verification limits.** The audit sandbox had no network access to the Supabase project and no
local Postgres, so no SQL was executed and no migration was confirmed as deployed. Every SQL
finding below is from reading the migration files. Anything depending on live database state is
flagged as *unverified*.

Items marked **FIXED** were changed in this pass. Everything else is left for you to decide on.

---

## Critical

### C1 — Provider report failure was undiagnosable by construction · **FIXED**

`get_provider_report_snapshot` (migration `021`) was a `LANGUAGE sql` function whose
preconditions were a trailing `WHERE` clause:

```sql
SELECT jsonb_build_object(...)
WHERE auth.uid() IS NOT NULL
  AND p_start <= p_end
  AND NULLIF(BTRIM(p_timezone), '') IS NOT NULL;
```

A scalar-returning SQL function that matches zero rows returns `NULL`, not an error. So an
expired session, a reversed date range, an empty timezone, and a correctly-returned-empty report
were all indistinguishable at the client. `loadProviderReportSnapshotFromRpc` collapsed every one
of them — plus a genuinely missing function — into a single generic string:

> We couldn't load all of the data needed for your provider report.

Nothing was logged. There was no code path that could tell you *why* the report failed, which is
why the failure in the screenshot could not be diagnosed from the app.

**Changed:**

- New migration `028_provider_report_snapshot_raises.sql` rewrites the function in `plpgsql`. The
  query body is byte-for-byte the same; only the failure mode changed. Each precondition now
  raises a distinct `ERRCODE` (`28000` not authenticated, `22007` bad range, `22023` bad
  timezone), and an unknown IANA zone is rejected up front against `pg_timezone_names` instead of
  failing opaquely inside the quick-log subquery.
- `ProviderReportDataLoadError` gained a `technicalDetail` getter, and `useProviderReport` appends
  it to the user-facing message. A screenshot of a future failure is now actionable.
- `providerReportData.ts` gained `loadProviderReportSnapshotFromTables`, a full rebuild of the
  snapshot from the base tables, and `loadProviderReportSnapshot`, which prefers the RPC and falls
  back when it is missing or declines. The report now works on any project with the base schema.
- 15 new tests in `src/hooks/__tests__/providerReportFallback.test.ts`.

**Action for you:** apply `028` in the SQL editor. The `NOTIFY pgrst, 'reload schema'` at the
bottom matters — without it PostgREST can keep serving a 404 for a redefined function.

### C2 — Dose logging did not model dose cadence · **FIXED**

`showDoseChip` / `isDoseLoggedForMed` in `medicationHelpers.ts` recognised only two shapes: "daily
family" and "clean day interval". Four separate defects followed.

| Defect | Effect |
|---|---|
| `twice_daily` and `three_times_daily` were in `DAILY_DOSE_FREQUENCIES`, and the check was `.some(date === today)` | A twice-daily medication showed a green checkmark after **one** dose of two. The second dose was never prompted and adherence data silently under-counted. |
| `every_other_day` used the same same-day check | On its off day the chip showed unchecked, prompting a dose the user was not supposed to take. |
| `twice_weekly`, `three_times_weekly`, `monthly`, `cyclic`, `as_needed`, `custom`, and every `every_N_months` frequency fell through to `false` | These medications got **no chip at all** and could never be logged. |
| No cadence was displayed anywhere on the chip | A daily and a weekly medication were visually identical, which is the ambiguity in the screenshot. |

**Changed:** new `src/utils/doseSchedule.ts` resolves all 18 frequencies into one of seven cadence
kinds (`per_day`, `interval_days`, `interval_months`, `per_week`, `cyclic`, `on_demand`,
`untracked`) and derives a `DoseStatus` — doses taken today, doses expected today, next due date,
and whether a tap should log or undo. Notable behaviours:

- Month intervals use calendar months (`addMonthsISO`), not 30-day arithmetic, and clamp to the
  last valid day of a shorter month.
- Cyclic regimens anchor on `start_date` and compute the position in the on/off cycle. A cyclic
  medication with unusable `days_on` / `days_off` degrades to `on_demand` rather than inventing a
  cycle.
- `as_needed` and `custom` are loggable but never reported as overdue.
- Pellets stay excluded — they are provider-implanted, not self-logged.
- Medications outside their `start_date` / `end_date` window get no chip.

`DoseTapWidget` was rebuilt on this model: chips are sorted outstanding-first, each shows
`{cadence} · {status}` ("Twice daily · 1 of 2 today", "Once weekly · Next in 4 days"), and the card
header summarises how many medications are still outstanding. 47 new tests in
`src/utils/__tests__/doseSchedule.test.ts`.

The superseded `showDoseChip` and `isDoseLoggedForMed` were deleted. `getDoseCycleDays` is kept —
it is still used by `engine/wellbeingSignal.ts` (see M5).

### C3 — The check-in flow never prompted for medications · **FIXED**

`DoseTapWidget` was rendered only on `MedicationsPage`. Nothing in the daily or weekly check-in
surface asked about doses, so dose data was only ever captured if the user navigated to a
different tab. This is the defect described in the first screenshot.

**Changed:** `CheckinPage` now renders `<DoseTapWidget title="Did you take today's doses?" />`
directly beneath the pulse and weekly prompt cards.

*Optional follow-up:* making it a step inside `CheckinFlow` would capture doses even more
reliably, but it changes `getStepCount()` and the draft payload shape, so it was left out of this
pass.

---

## High

### H1 — Dose history window was too short for long cadences · **FIXED**

`useMedicationAdministrations` fetched a fixed 90 days. With month-interval cadences now
schedulable (C2), a medication dosed every four or six months would have no administration inside
the window and be reported as due today, every day, forever.

**Changed:** the window is now `DOSE_HISTORY_DAYS = 400`, defined in `doseSchedule.ts` next to the
cadence table it has to cover, so the two cannot drift apart.

### H2 — `merge_ui_state` silently discarded writes · **FIXED**

```sql
UPDATE public.profiles SET ui_state = ... WHERE id = auth.uid() RETURNING ui_state;
```

Same shape as C1. If no profile row matched — unauthenticated, or a profile that the signup
trigger failed to create — the statement affected zero rows and returned `NULL` with no error.
`setUiValues` in `uiState.ts` only logs when `error` is non-null, so the write vanished while the
client-side cache kept the optimistic value. Dismissed banners and seen-tooltip flags would
reappear on next load with nothing in the console.

**Changed:** rewritten in `plpgsql` in migration `028` to raise on both the unauthenticated and
the missing-profile case.

### H3 — Unguarded double-tap on dose chips · **FIXED**

`handleChipTap` was `async` with no in-flight guard, and each call inserts a row. A double-tap
wrote two administrations. Previously this was invisible (the chip was already checked); with
per-day counts it is now user-visible as "2 of 2 today" after a single intended dose.

**Changed:** a `pendingMedId` guard disables all chips for the duration of the write.

*Worth checking for the same pattern:* `useQuickLog.logEvent` and the check-in save path have the
same async-handler-writes-a-row shape and were not audited in depth.

---

## Medium

### M1 — No record of which migrations are applied

`docs/DEPLOYMENT.md` instructs applying migrations by pasting SQL into the Supabase editor. There
is no `supabase db push` in any script, no CI step, and nothing in the repo records applied state.
`supabase/.temp/` contains only CLI cache.

This is the systemic cause of C1: the application code assumed an RPC that the database might not
have, and there was no way to check. Twenty-eight migrations now depend on manual ordering.

**Suggested:** adopt `supabase db push`, or add a startup assertion that queries for the RPCs the
app requires and logs a clear message when one is missing. *Unverified:* I could not confirm which
migrations are actually live on your project.

### M2 — Database functions have no test coverage

`providerReportSnapshotRpc.test.ts` mocks the `rpc` call entirely. It asserts that the client sends
`p_start`, `p_end`, `p_timezone` and parses a well-formed reply. It cannot fail if the SQL function
is broken, missing, or returns a different shape — which is exactly the failure that occurred.

Every SQL function in `supabase/migrations/` is in the same position: zero executed coverage.

**Suggested:** a `supabase db start` + `psql` job that applies all migrations and exercises each
RPC would have caught C1 and H2 at commit time. This is the single highest-value testing gap.

### M3 — Unbounded reads can be silently truncated

32 `.select('*')` call sites have no `.limit()` and no pagination. PostgREST caps result sets
(Supabase's default is 1000 rows) and returns a **200 with a short array** — no error. A user with
more than 1000 check-ins or quick logs would get silently truncated charts and insights.

`utils/dataExport.ts` is the one place that does this correctly: it pages at 500 and walks until a
short page. That pattern should be extracted and reused.

The new `loadProviderReportSnapshotFromTables` inherits this limitation on
`extended_symptom_logs`. For a long-tenured user on the "All" preset the fallback could truncate.
The RPC path is not affected, since aggregation happens server-side.

### M4 — `getDateRangeFromPreset` hardcodes an epoch

`dashboardStore.ts:25` returns `{ start: '2000-01-01' }` for the `all` preset. Harmless today, but
it is a magic date that will silently define "all time" forever. A `MIN_DATA_DATE` constant, or
deriving from the user's earliest record, would be more honest.

### M5 — Two overlapping cadence models

`getDoseCycleDays` in `medicationHelpers.ts` still encodes day intervals for
`engine/wellbeingSignal.ts:463` (adherence-gap detection), and now duplicates a subset of
`doseSchedule.ts`. It is deliberately conservative — it returns `null` for `every_other_day`,
`twice_weekly`, `monthly`, and cyclic — so the adherence engine ignores those medications
entirely.

I left it alone rather than change engine behaviour I had not analysed. **Recommend:** migrate
`wellbeingSignal` onto `getDoseCadence`, which would extend adherence detection to the eleven
frequencies it currently skips.

---

## Low

### L1 — `update_updated_at()` has no `SET search_path`

`001_initial_schema.sql:48`. It is `SECURITY INVOKER`, so the risk is much lower than it was for
`handle_new_user` (fixed in `026`), but it is the only remaining function without a pinned
`search_path`.

### L2 — `handle_new_user` has no exception handling

If the `profiles` insert fails, the whole signup transaction fails with a Postgres error surfaced
to the user. A duplicate-key path (`ON CONFLICT (id) DO NOTHING`) would make retried signups
tolerable. This may also explain any profile rows missing for existing users, which H2 now surfaces
loudly rather than silently.

### L3 — `dose_logs` is a dead table

Superseded by `medication_administrations`. No `src/` code reads or writes it beyond the export
bundle and the generated types. It is still created, still has RLS, and is still wiped by
`reset_user_app_data` and `delete_user_account` — all correct, just carrying a table nothing uses.
Keeping it in the export is right if any legacy rows exist; dropping it is safe if none do.
*Unverified:* whether it holds data on your project.

### L4 — Nine pre-existing lint warnings

All `react-hooks` dependency warnings plus `no-did-update-set-state` in `ErrorBoundary.tsx:30`.
None are new. `ErrorBoundary` is the only one with real behavioural risk (a second render pass on
`resetKey` change).

### L5 — A stray `dist/.DS_Store` breaks clean builds

`vite build` fails with `EPERM: operation not permitted, unlink dist/.DS_Store` when it cannot
clear the output directory. `dist/` and `.DS_Store` are both correctly gitignored and `dist/` is
not tracked, so this is local-only — `rm -rf dist` clears it.

---

## What was verified and how

| Check | Result |
|---|---|
| `npx tsc -b --noEmit` | Clean |
| `npx vitest run` | 284 passed / 21 files (was 269 / 20; +62 new tests, no regressions) |
| `npx oxlint` | 0 errors, 9 pre-existing warnings |
| `npx vite build` | Succeeds (2881 modules) |
| RLS enabled on all 15 app tables | Confirmed — every table has `ENABLE ROW LEVEL SECURITY` and an `auth.uid()` policy |
| `FOR ALL USING` policies lacking `WITH CHECK` | **Not a defect.** Postgres reuses the `USING` expression as the check expression when `WITH CHECK` is omitted, so inserts and updates are constrained. |
| `delete_user_account` session handling | **Correct.** `accountReset.ts` calls `supabase.auth.signOut({ scope: 'local' })` after the RPC, so the client does not hold a JWT valid against a deleted `auth.users` row. |
| `dataExport.ts` completeness | Includes `medication_administrations`; pages correctly at 500 |
| SQL execution against a real database | **Not performed** — no network access and no local Postgres in the audit environment |
| Which migrations are live | **Not verified** |

## Files changed in this pass

```
src/utils/doseSchedule.ts                            (new)
src/utils/__tests__/doseSchedule.test.ts             (new, 47 tests)
src/hooks/__tests__/providerReportFallback.test.ts   (new, 15 tests)
supabase/migrations/028_provider_report_snapshot_raises.sql (new)
src/components/medications/DoseTapWidget.tsx         (rebuilt)
src/hooks/providerReportData.ts                      (fallback + diagnostics)
src/hooks/useProviderReport.ts                       (surface the cause)
src/hooks/useMedicationAdministrations.ts            (400-day window)
src/utils/medicationHelpers.ts                       (removed superseded helpers)
src/pages/CheckinPage.tsx                            (dose prompt)
```
