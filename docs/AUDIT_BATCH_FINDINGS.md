# TrackHer audit batch findings — 2026-07-27

Phase 0 splits landed first; batches 1–12 audited against the tree. Clear high-severity bugs
fixed in the same pass. Deferred items stay listed for a later session.

## Phase 0 (physical splits)

| Change | Notes |
|--------|--------|
| `wellbeingSignal` → shared / dose / volatility / trough / dip + barrel | Behavior unchanged; engineGuards green |
| Settings → Profile / Account / Data / About / Haptic cards | Page is orchestration only |
| QuickLog helpers → `utils/quickLogSheetHelpers.ts` | Sheet UI stays |
| `StoryChartsBody.tsx` extracted from `StoryColumn` | Column shell thinner |
| `checkinPayload.ts` extracted from `checkinsStore` | Store API unchanged; full store split not warranted |

## Batch 1 — Auth & account · fixed

- Profile heal failure now sets `profileLoadFailed`
- ProtectedRoute waits for profile before rendering children
- Password reset signs out before returning to login

Deferred: global sign-out scope; delete success step unreachable under ProtectedRoute (hard redirect already works).

## Batch 2 — Data loading · fixed

- Generation + force-queue guards on medications / labs / medication_changes stores
- Dose administrations history uses `fetchAllPages`

Deferred: page provider-report table fallback; fail-closed on 0-row mutations.

## Batch 3 — Medications & doses · fixed

- As-needed chips always `tapLogsDose: true` (multi-log same day)
- Cyclic `not_due_today` taps are no-ops (no accidental undo/log)

Deferred: shared administrations Zustand store for PersistentTabs; cyclic validation on wizard; unit-change classification.

## Batch 4 — Check-ins · fixed

- Full MRS day cannot be overwritten via quick-pulse update path
- `fetchCheckins({ force: true })` re-fetches after an in-flight request

Deferred: draft flush on unmount; backdated flare timezone; bleedingComplete null vs undefined.

## Batch 5–6 — Labs / insights engine

No higher-severity chart/engine logic bugs beyond PDF demotion (batch 7). Lab force double-waiter race deferred.

## Batch 7 — Provider PDF · fixed

- Executive summary excludes `demotedToMore` insights (keeps dose-tuning out of bleeding-flag reports)

Deferred: “weeks on med” using check-in count ÷ 7.

## Batch 8 — Subscriptions

Deferred: distinguish “key present” vs “SDK configured” for paywall UX when RevenueCat configure fails.

## Batch 9–10 — Onboarding / charts

Deferred: STRAW stage clock without `last_period_date`; dashboard stage vs bleeding advancement; chart dot radius / monotone drift (low).

## Batch 11 — Settings / legal · fixed

- Privacy policy updated for shipped iOS + local reminders

## Batch 12 — Native shell · fixed

- Medication notification ID slot stride 1000 (was 10; collision risk)

Deferred: weekly check-in repeating schedule; `PrivacyInfo.xcprivacy` for App Store.

## Verification

Run: `npx tsc -b` and `npx vitest run` after this pass.
