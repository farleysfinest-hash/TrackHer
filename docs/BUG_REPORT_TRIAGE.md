# Bug report triage and fixes

**Date:** 26 July 2026
**Base commit:** `973cee1`
**Source:** the 22-finding comprehensive bug report, every item of which was labelled "Confirmed".

## How to read this

The incoming report was not taken at face value. Each finding was checked against the source
before anything was changed. Of the 22, **9 were verified individually**, **13 were assessed**,
and the results split three ways: real and fixed, real but deferred with a reason, and not a
defect. One finding was actively wrong and fixing it would have introduced a bug.

Provenance checked first: HEAD is `973cee1`, all 26 named files exist, and the claimed 397-test
baseline matched. The report is about this codebase and this commit.

**Result: 420 tests passing (was 397), `tsc` clean, 0 lint errors (9 pre-existing warnings).**

---

## Fixed

### C1 — Delete Account confirm step was unreachable · Critical

`DeleteAccountModal.tsx`. The effect that reset the flow had `step` in its dependency array.
Clicking "Yes, delete everything" set `step: 'confirm'`, which changed a dependency, re-ran the
effect with `isOpen` still true, and set it straight back to `'warning'`. The confirm modal
rendered for a single commit and vanished. **Account deletion could not be completed by any
user.**

The report's suggested fix — match `ResetAccountModal` with deps `[isOpen]` — works but leaves
`step` read from the closure without being declared, which is a lint warning and a stale-closure
hazard on the `'deleted'` branch. Used a functional updater instead, so the previous step is read
from React rather than the closure and `step` is not a dependency at all.

The transition is now a pure function in `deleteAccountSteps.ts` so the invariant is testable
without a DOM — the project has no component-test setup, which is why this shipped uncaught.

### H2 — `viewed_insights` could be wiped by a profile refetch · High

`uiState.ts`. `hydrate()` replaced `cachedState` wholesale on every profile change. High-churn
keys are written with `mirrorToProfile: false`, so between the optimistic write and the
`merge_ui_state` RPC landing, the cache is the *only* copy. Any `fetchProfile` in that window
dropped it, and safeguarding and bleeding cards could reappear as unread.

Now merges — but scoped to one profile id. **Merging unconditionally would have been worse than
the bug:** on sign-out the profile goes null, and the next user would have inherited the previous
user's flags. Same-user changes merge, anything else replaces. There is a test for exactly that.

Also fixed while in the file: the RPC was `void supabase.rpc(...).then(...)` with no rejection
handler, so a transport failure surfaced as an unhandled rejection rather than the intended
`console.error`.

### H3 — Provider PDF executive summary had no page overflow · High

`report/sections/executiveSummary.ts`. `y` accumulated across up to six insights plus wellbeing
notes with no bounds check — there was no `addNewPage` anywhere in the file. A single bleeding
red flag body is roughly 86mm of page, so two or three insights wrote past the footer and off the
sheet, silently, in the document the patient hands to her provider.

Content now flows: block-level breaks keep a title with its first body line, and the body breaks
line by line so a body longer than a whole page flows rather than overflowing.

**This required a second fix the report did not identify.** Footers were drawn inline against a
total from `countReportPages`, which assumed one page per section. Once the summary can add
pages, every "Page X of Y" would have been wrong. `countReportPages` is deleted; footers are now
stamped in one pass at the end via `stampAllPageFooters`, reading the true count from the
document. That estimate can no longer drift for any future section either.

### H5 — `dateNotFuture` mixed UTC parsing with a local instant · High

`validation.ts`. `new Date("YYYY-MM-DD") <= new Date()` parsed the value as UTC midnight and
compared it against an instant.

The report described one half. It was wrong in **both** directions:

- East of UTC, today was rejected as "in the future" for most of the working day.
- West of UTC, tomorrow was *accepted* — a US user after 7pm could set a future start date.

Now compares ISO calendar days in the user's own zone via `todayISO()`, with `today` injectable
for tests. Empty input is explicitly not-a-date rather than accidentally valid — `new Date('')`
is Invalid Date and every comparison against it was false, so blank input passed by accident.

**Correction to the report's blast radius:** it claims lab draws, medication start dates and DOB.
There are exactly two call sites, both medication `start_date` (`CustomMedicationForm.tsx`,
`StepDoseFrequency.tsx`). Lab draw dates and DOB are validated elsewhere and were never affected.

### H1 (the real part) — sign-in could route an established user to onboarding · High

The report's stated mechanism does not hold; see *Overstated* below. But there is a genuine bug
in the same lines. If `fetchProfile` hits its error path it sets `profileLoadFailed` and returns
with `profile` still null, and `LoginForm` read `currentProfile?.onboarding_completed` and sent
the user to `/onboarding`.

That is not cosmetic: `submitStaging()` calls `initSymptomsForStage()`, which overwrites tracked
symptoms. A transient network error at sign-in could walk an established user back through
staging and reset her symptom selections.

Now distinguishes "profile failed to load" from "onboarding incomplete" and routes to
`/dashboard`, where `ProtectedRoute` already renders a proper retry screen for that exact state.

### M3 — "Remember me" was a dead control · Medium

`LoginForm.tsx` held `rememberMe` in state and never read it.

Wired up first, then reversed on the product call: staying signed in is the intended behaviour on
web and required on iOS, where being logged out of a native app is simply wrong. That makes the
checkbox itself the defect — it offered a choice the app should not act on. **Removed**, and
`supabase.ts` is back to plain persistent sessions. Signing out stays explicit, from Settings.

Recorded because the intermediate state shipped in `a01e92c`: that commit added a
sessionStorage-backed adapter and a `trackher.auth.persistence` key. Both are gone. Anyone who
signed in from that build with the box unchecked has a token in `sessionStorage` that is no
longer read, so they will be signed out once; the orphaned preference key is inert.

### M4 — `reset()` skipped the welcome step · Medium

`onboardingStore.ts` initialises at `currentStep: 0` but `reset()` set `1`. Post-reset onboarding
started one step in. Now `0`.

### M9 — `fetchMedicationById` swallowed network errors · Medium

Returned `null` for both "no such row" and "the query failed", and the caller reported
"Medication not found". A dropped connection during a dose change read as *someone deleted this*,
inviting the user to re-add a medication that still exists. Now returns a discriminated result
and the two cases produce different messages. Also switched `.single()` to `.maybeSingle()`, since
`.single()` treats a legitimate zero-row result as an error.

---

## Real, but deliberately not fixed here

### H4 — Provider report engine never receives administrations · High

Verified: `administrations: []` is a literal at `executiveSummary.ts:108`. Dose-adherence and
administration-backed correlations cannot fire in the PDF.

Not fixed because it is **not the one-line wiring the report implies**. `ProviderReportData` has
no `administrations` field at all — the provider-report data pipeline never fetches them. Doing
this properly means threading them through `ProviderReportData`, both loaders in
`providerReportData.ts` (the RPC snapshot *and* the table fallback), and extending
`get_provider_report_snapshot` — a migration `029`.

That is the exact surface that broke once already and was repaired by `028`. Wiring only the
fallback path would leave the RPC path silently returning nothing, which is the same class of
divergence that caused the original outage. **This needs a migration you apply by hand, so it is
your call, and it should be done as one deliberate change.**

### M5 — Administrations fetch is unbounded

`useInsights.ts` bounds by date (90 days) but sets no row limit, so PostgREST's 1000-row cap can
truncate silently for a heavy logger with many medications. Real — but it is one of the 32 sites
already logged as `CODE_AUDIT.md` M3. Fixing a single site inconsistently is worse than fixing
the class; `dataExport.ts` has the paging pattern to extract.

### M8 — Fullscreen dialogs lack a focus trap

Real a11y defect across `QuickLogSheet`, `CheckinFlow`, `LabEntryForm`, `MedicationEntryWizard`.
Deferred per your call — it is a render-structure change across four components and wants
verification with an actual screen reader.

### M1 — Mutations omit a `user_id` filter

Accurate as described, but this is defence-in-depth, not a defect. RLS is enabled and enforcing
on all 15 tables. Worth doing; not a bug.

---

## Not defects

### M2 — "Dose tap toast remaining count is off by one" · **wrong**

`remaining = status.expectedToday - status.takenToday - 1` is correct. `status` is a parameter
passed into `runChipTap(med, status)`, captured from the render *before* the write, so
`takenToday` is the pre-write count. Twice-daily with none taken: `2 - 0 - 1 = 1` → "1 more
today". Correct.

**Applying the report's fix would have introduced the off-by-one it describes.**

### M6 — Lab range bar clamps extreme values

Clamping is required — an unclamped marker renders outside the bar. That a value 10× over max
looks like one 1.01× over is a real information loss, but the answer is an out-of-range
indicator, not removing the clamp. Enhancement, not a bug.

### M7 — Deleting a check-in leaves its draft

`CheckinFlow` clears the draft on save (lines 114 and 128), so a saved check-in has no lingering
draft to revive. Drafts also self-expire after 7 days. No defect in the described path.

### M10 — Double-tap undo can error

`handleChipTap` has a `pendingMedId` guard that disables all chips for the duration of the write,
so the second tap never runs. Even without it, a delete matching zero rows does not error. The
report marked this "Likely" rather than "Confirmed", which was the right call.

### L2 — `getWeeksSinceDraw` ignores profile timezone

`todayISO()` defaults to `getActiveTimezone()`, which resolves the *device* zone with the profile
preference as fallback. That is the documented app-wide convention (see the comment on
`EngineInput.timezone`), not an oversight.

### L3 — Toast timers are fire-and-forget

The removal is a filter on id; if the toast is already gone it is a no-op. Harmless.

### L4 — `auth.initialize` cleanup discarded

`main.tsx` calls it at module scope, which runs once. StrictMode double-invokes component renders
and effects, not module bodies. Nothing to fix.

---

## Overstated

### H1 as described — the race mechanism does not hold

The report says `signIn` awaits a `fetchProfile` that no-ops because the `SIGNED_IN` handler
already claimed `profileFetchInFlight`. But that handler defers via `setTimeout(..., 0)` — a
macrotask — while `signIn` reaches `await get().fetchProfile(...)` in the microtask drain
immediately after `signInWithPassword` resolves. `signIn` therefore claims the flag first and
awaits the real fetch; the deferred call is the one that no-ops.

It inverts only if supabase-js dispatches `SIGNED_IN` *before* that promise resolves and the
timer fires in the gap. Possible, dependent on library internals, and not demonstrated. Labelling
it "Confirmed" alongside genuinely verified findings is the kind of thing that erodes trust in
the rest of the list.

The null-profile navigate it walks past is real, and is fixed above.

---

## Test coverage added

23 new tests, all of which fail against the pre-fix code:

| File | Covers |
|---|---|
| `components/settings/__tests__/deleteAccountSteps.test.ts` | C1 — including that re-applying the transition while open cannot walk 'confirm' back to 'warning' |
| `utils/__tests__/validation.test.ts` | H5 — both timezone directions, month boundaries, empty input |
| `lib/__tests__/uiState.test.ts` | H2 — optimistic write survives same-user refetch; does *not* survive sign-out or a user change |
| `utils/__tests__/reportPagination.test.ts` | H3 — flows to a new page, writes nothing below the footer limit, stamps the real total |

The pagination test asserts against jsPDF's committed text stream rather than a return value.
Note the stream is in PDF points with a bottom-left origin, so the helper flips and rescales into
the mm-from-top units the layout uses — comparing raw `Td` values against the layout limit is
meaningless and was caught while writing it.

---

## Files changed

```
src/components/settings/DeleteAccountModal.tsx        C1
src/components/settings/deleteAccountSteps.ts         C1 (new)
src/lib/uiState.ts                                    H2 + unhandled rejection
src/utils/report/pdfTheme.ts                          H3 (deferred footer stamping)
src/utils/report/sections/executiveSummary.ts         H3 (content flow)
src/utils/pdfReport.ts                                H3 (drop countReportPages)
src/utils/validation.ts                               H5
src/components/auth/LoginForm.tsx                     H1-real + M3 (checkbox removed)
src/lib/supabase.ts                                   M3 (reverted to persistent sessions)
src/stores/onboardingStore.ts                         M4
src/stores/medicationsStore.ts                        M9

src/components/settings/__tests__/deleteAccountSteps.test.ts   (new)
src/utils/__tests__/validation.test.ts                         (new)
src/lib/__tests__/uiState.test.ts                              (new)
src/utils/__tests__/reportPagination.test.ts                   (new)
```

## Still open, ranked

1. **H4** — provider report administrations. Needs migration `029`. Your call.
2. **M8** — focus trap across four fullscreen dialogs.
3. **M5** — unbounded reads, as part of `CODE_AUDIT.md` M3 rather than piecemeal.
4. **M1** — `user_id` filters on mutations, as hardening.
5. **No component-test setup.** `vitest.config.ts` includes only `src/**/*.test.ts` and runs in
   the node environment, so no `.tsx` can be tested. C1 was a component bug that a single render
   test would have caught, and the workaround here was to extract the logic. Adding jsdom and
   testing-library is the durable fix.
