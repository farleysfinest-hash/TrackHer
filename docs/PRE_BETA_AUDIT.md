# TrackHer pre-beta audit

**Date:** 25 July 2026
**Base commit:** `bfa8786`
**Method:** static review of `src/**` and `supabase/migrations/**`, plus live testing of the running
app at `localhost:5173` in Chrome against a real authenticated account.

Complements `docs/CODE_AUDIT.md` (same day, earlier). That document covers the dose-cadence and
provider-report defects and is not repeated here.

## Coverage and limits

**Live-tested:** Dashboard, Check In, Medications, Insights, Privacy Policy, sign-in redirect
behaviour. Console monitored throughout.

**Not live-tested:** Labs, Settings, onboarding, signup, password reset, paywall/Pro gating,
offline and slow-network behaviour, iOS native build. These were reviewed statically only.

**Not verifiable from here:** anything requiring the production Supabase project or the Cloudflare
dashboard. No SQL was executed — the audit environment has no network access to your project and
no local Postgres.

---

## High — resolve before beta

### H1 — The safeguarding path names no concrete crisis resource

`engine/safeguarding.ts` detects a sustained rise in mood, anxiety and exhaustion across three
check-ins and escalates. The copy is well-judged — it respects autonomy, avoids catastrophising,
and closes with "This is what your record shows. What you do with it is yours to decide." That
tone is right.

But the only actionable pointer in the entire feature is `SafeguardingCard.tsx:29`:

> Contact your local crisis line or emergency services if you may be in immediate danger.

No number, no link, no region detection. A user who has just been told their mental-health
trajectory is deteriorating is asked to go and find a crisis line themselves.

This matters more here than in most apps: depressed mood, irritability and anxiety are three of
the eleven core MRS domains, so this path is not an edge case — it will fire for real beta users.

**Suggested:** surface at least one concrete resource alongside the existing copy. An
international directory such as `findahelpline.com` avoids hardcoding a US number for non-US
users; if you prefer a US-first default, 988 (Suicide & Crisis Lifeline) is the current standard
and replaced the older 1-800-273-8255 routing. Worth confirming current details before shipping
rather than taking this document's word for it.

*Note:* if you already intend the app to stay deliberately hands-off here, that is a defensible
product position — but it should be a decision you have made, not a gap.

### H2 — No support channel exists

The sidebar reads "Need Help? / Support email coming soon". Beta testers who hit a problem have
nowhere to send it, and the privacy policy commits to responding to support requests and to
honouring access/deletion rights — obligations with no inbox behind them.

**Suggested:** any monitored address before invites go out.

---

## Medium

### M1 — Privacy policy describes analytics that is not in the codebase

The policy states: "We use Cloudflare Web Analytics, a cookieless [analytics service]". There is
no analytics script in `index.html` and no reference anywhere in `src/`.

Either Cloudflare Pages injects it at the edge (plausible — it can be enabled per-project without
touching your code) or the policy describes collection that does not happen. A privacy policy is
a legal representation, so it should match reality in either direction.

**Action:** check whether Web Analytics is enabled in your Cloudflare dashboard, then either keep
the clause or remove it. *Unverified — I cannot see your Cloudflare account.*

### M2 — Everything else in the privacy policy checks out

Recorded because it is unusual, and because it means the above is the only discrepancy. I verified
each specific technical claim against the code:

| Claim | Verified |
|---|---|
| RLS on every table | True — 15/15 tables have `ENABLE ROW LEVEL SECURITY` and an `auth.uid()` policy |
| Complete JSON export | True — `dataExport.ts` covers all 15 tables and pages correctly at 500 rows |
| Delete account in-app, no email required | True — `delete_user_account()` RPC, reachable from Settings |
| Reminders scheduled locally, never third-party push | True — Capacitor Local Notifications only |
| Minimal on-device storage | True, and understated — the app writes *nothing* to localStorage itself; only the Supabase auth token persists |

The policy also correctly addresses the FTC Health Breach Notification Rule, CCPA/CPRA, children's
privacy and international transfer — coverage most apps at this stage do not have.

### M3 — Carried forward from `CODE_AUDIT.md`

Still open and still relevant to beta readiness:

- **Manual migrations with no applied-state tracking.** The root cause of the provider-report
  outage. Twenty-eight migrations now depend on being pasted in the right order.
- **No executed coverage of any SQL function.** Every RPC test mocks the `rpc` call, so a broken
  function passes CI. Highest-value testing gap.
- **Unbounded reads.** 32 `.select('*')` sites with no `.limit()` or pagination. PostgREST caps at
  1000 rows and returns a 200 with a short array — silent truncation for a long-tenured user.
  `dataExport.ts` has the correct pattern to copy.

---

## Low

### L1 — "BleedingHeavy" renders without a separator

Check In → Daily Pulse summary. Sibling rows ("Energy 3", "Mood 3", "Sleep 2") space correctly;
the bleeding row runs its label and value together. Cosmetic, but on the first screen a tester
sees after logging.

### L2 — Dead localStorage cleanup

`clearTrackHerLocalStorage()` in `lib/accountReset.ts` removes keys prefixed `trackher_` and
`predicther_`. Nothing in the codebase writes either prefix. Harmless, but it implies an on-device
cache that does not exist — and it would not clear the Supabase session key if that were ever the
intent (different prefix; `signOut({ scope: 'local' })` handles that correctly instead).

### L3 — Nine pre-existing lint warnings

Unchanged. `ErrorBoundary.tsx:30` (`no-did-update-set-state`) is the only one with behavioural
risk; the rest are `react-hooks` dependency warnings.

---

## Fixed during this pass

**Dose chip name truncation.** `shortMedName` cut every chip label at 16 characters regardless of
available width, so "Progesterone (Prometrium)" and "Estradiol patch (Climara)" both rendered as
ellipses — and with two estradiol patches active, the chips were indistinguishable. Replaced with
CSS truncation against a `max-w-[17rem]` cap, so wide viewports show the full name and narrow ones
still ellipsize. Verified visually before and after.

---

## What live testing confirmed working

Worth recording, since these are the paths most likely to break:

- **Dose cadence fix behaves correctly on real data.** Outstanding doses sort first; Progesterone
  shows "Daily · Due today", Vivelle-Dot "Once weekly · Due today", and the Climara patch
  correctly shows "Once weekly · Next tomorrow" with a checkmark instead of falsely prompting.
- **Provider report generates and downloads.** Confirmed by the user after migration `028`.
- **No console errors** across Dashboard, Check In, Medications or Insights on fresh loads.
- **`ErrorBoundary` genuinely works.** A render crash introduced mid-edit was caught and recovered
  rather than white-screening the app — verified accidentally, but verified.
- **`ProtectedRoute` has no auth-hydration race.** It gates on `isInitialized` before redirecting,
  so a hard refresh on a protected route does not bounce a signed-in user to login.
- **Dashboard figures render correctly** — MRS 24, Energy 3.4, Days logged 85, subscale breakdown
  and medication timeline all populated.

## Recommended order before invites

1. H2 (support email) — trivial, blocks nothing else
2. H1 (crisis resource) — small change, highest consequence
3. M1 (reconcile the analytics clause)
4. L1 (bleeding separator)
5. M3 (SQL test harness) — the durable fix, worth doing before the codebase grows further

---

# Addendum — clinical safety pass

Added after the initial audit, following review of the insight engine's clinical logic.

## C1 — No red-flag handling for postmenopausal bleeding · **FIXED**

The engine had no urgent-evaluation path of any kind. Meanwhile `heavy_bleeding` and
`irregular_periods` are **primary** symptoms of the `estrogen_high` cluster, and nothing checked
menopause stage before interpreting them.

A woman at STRAW `+1b` on estradiol who logged heavy bleeding was therefore told her symptoms
matched a high estrogen-to-progesterone pattern, and handed "Could my estrogen dose be too high?"
as a question for her provider. Bleeding after the transition is complete warrants prompt
evaluation to exclude endometrial pathology — endometrial carcinoma is identified in roughly 9%
of postmenopausal bleeding presentations (ACOG Committee Opinion 734). Framing it as a titration
problem could delay diagnosis.

**Built:** `src/engine/bleedingRedFlag.ts`, 52 tests.

- Fires on any bleeding — spotting included — at `+1a` or later, or after surgical/iatrogenic
  menopause.
- Excludes `-1` late transition, where irregular and heavy bleeding is expected.
- Excludes `hysterectomy_ovaries_intact` rather than guessing — ovaries cycling, no uterus.
- Fixed high confidence, no sample-size gate: this is a guideline threshold, not an inferred
  pattern, and must not be filtered out by the low-confidence cut.
- Dismissals expire, so an unresolved flag cannot be silenced permanently.
- New `bleeding_red_flag` category, deliberately **not** `safeguarding` — that category is treated
  as mental-health content and withheld from the provider report unless the user opts in. This
  should reach a clinician by default.
- Copy is conditional on the actual regimen: names inadequate progestogen as a common and fixable
  cause when she is on systemic estrogen plus a progestogen; raises unopposed systemic estrogen
  specifically when no progestogen is recorded; omits progesterone entirely when she is on no
  hormone therapy. Local vaginal estrogen is not treated as needing opposition.
- Never uses the word cancer. Says most causes are benign and explains the check confirms that by
  looking at the uterine lining. Tested across every medication combination.
- While a flag is active, the `estrogen_high` cluster is demoted so dose-tuning advice does not
  sit beside it.

**Still wanted:** clinician review of the stage boundaries — the `-1` exclusion, the hysterectomy
case, and the 90-day lookback are reasoned judgements, not guideline quotes.

## C2 — Opposing hormone patterns gave contradictory dose advice · **FIXED**

`clusterMatcher` emitted an insight for every matching pattern with no mutual-exclusion check, and
never set `.conflict`, so the existing `resolveConflicts()` machinery never saw them.
`estrogen_low` and `estrogen_high` have disjoint hallmark sets, so both can fire — producing
"Could my estradiol dose be increased?" beside "Could my estrogen dose be too high?"

**Built:** axis metadata on `HormonePattern`, `resolveHormoneAxisConflicts()`, 20 tests.

Because demoted insights still render under "more", demotion alone was insufficient — the
contradictory questions are also rewritten to measurement questions.

The two axes get different copy, deliberately. `estrogen_high` is a *ratio* pattern, so
low-estrogen plus high-ratio symptoms is not a contradiction: it is the classic transition
picture of estradiol swinging while progesterone declines. That card names the pattern and points
at progesterone and symptom timing. Androgen excess and deficiency genuinely are contradictory,
so testosterone keeps the measure-it framing.

## M4 — Settings menopause stage edited a column nothing reads · **FIXED**

`SettingsPage` wrote `menopause_stage` (5 coarse values). The provider report, insight engine and
the new bleeding check all key off `straw_stage` (11 STRAW codes), which only onboarding writes.
Editing the stage in Settings appeared to correct it and silently did not.

The 5-value and 11-value scales are not mappable — "postmenopause" cannot distinguish `+1a` from
`+2` — so auto-mapping would put invented precision on a clinical document. For beta the dropdown
is replaced with a read-only view of the derived STRAW stage.

**Still wanted:** a "redo staging" flow reusing the onboarding questions. Note that
`submitStaging()` also calls `initSymptomsForStage()`, which overwrites tracked symptoms — any
reuse must bypass it.

## L6 — Dose chip names truncated at a fixed character count · **FIXED**

`shortMedName` cut every label at 16 characters regardless of viewport, making two estradiol
patches indistinguishable. Now CSS truncation against a width cap.

---

# Addendum 2 — bug hunt

Systematic pass over modules the earlier audits did not reach: engine internals, stores, chart
maths, validation, date handling. Prioritised by size × absence of test coverage.

## C3 — Menopause stage never advances with time · **FIXED**

**The bug.** `straw_stage` is written exactly once, by `onboardingStore.submitStaging()`, and is
never recomputed. `getStageProfile()` appears to re-derive it, but only from the stored onboarding
*answers* — which are equally frozen. So the stage a user is assigned on signup is the stage she
keeps forever.

**Why it matters.** `timeframeToStage` maps "last period less than 12 months ago" to `-1`, which
is correct: postmenopause is not recognised until 12 months of amenorrhea. But a woman who
onboards at ten months stays `-1` indefinitely. Two years later she is genuinely postmenopausal,
her record still says late transition, and the postmenopausal-bleeding check excludes `-1` —
correctly, because bleeding is expected there.

The population most likely to cross into the risk window is therefore the population silently
excluded from the check that exists for it.

**Compounding finding.** `last_period_date` — an actual date, not a bucket — is collected during
onboarding, written to the profile, and **read by nothing**. It was write-only. The data needed to
fix this was already being stored.

**Fixed:** `resolveCurrentStrawStage(profile, today)` in `lib/strawStaging.ts`, used by
`analyzeBleedingRedFlag`.

- Advances the stage from elapsed time when `last_period_date` is known.
- Boundaries mirror `timeframeToStage` exactly, so this changes *when* a stage is recognised, not
  what the app calls it. No new clinical convention introduced as part of a bug fix.
- Surgical, iatrogenic and post-hysterectomy stages are events, not timeline positions, and are
  returned unchanged.
- Users still cycling are not advanced — transition stages are defined by cycle pattern, not
  elapsed time.
- Only ever moves forward. A mistyped date cannot walk someone backwards out of a stage-gated
  safety check.
- Falls back to the stored stage on a missing, unparseable or future date.

**Residual gap, documented in a test:** a user with no `last_period_date` still cannot advance.
The proper fix is the re-staging flow already noted under M4.

## C4 — `lib/strawStaging.ts` had no test coverage · **FIXED**

331 lines driving clinical staging, feeding the provider report, the insight engine and now the
bleeding check — and zero tests. Added 31, covering `computeStagingResult` branches, the
timeframe boundaries, and every `resolveCurrentStrawStage` fallback.

## L7 — STRAW stage `+1b` is unreachable

`timeframeToStage` returns `-1`, `+1a`, `+1c` or `+2`. No input produces `+1b`, though it is a
valid `StrawStageCode` with full `STAGE_DETAILS`. Harmless today — the bleeding check treats all
`+1x` stages identically — but the 1-to-3-year bucket spans what STRAW+10 splits into `+1a` and
`+1b`, so anyone at 2–3 years is reported one sub-stage earlier than they are. Worth resolving if
staging fidelity ever matters beyond the postmenopausal boundary.

## L8 — `getInitials` returns an empty string for a whitespace-only name

`utils/formatters.ts:38`. `"   "` survives the `!name` guard, and `"".charAt(0)` yields `""`, so
the avatar renders blank rather than the intended `?`. Cosmetic.

## Verified sound

Checked and found correctly guarded — recorded so the next audit does not re-tread them:

- **Division by array length** — every site either guards emptiness or is preceded by a minimum
  sample check (`chartHelpers`, `storyColumnHelpers`, `scoreSummary`, `chartStyle`, `scoring`).
- **Unguarded `[0]` access** — `labDiscordance` checks `recentCheckins.length === 0` first;
  `trendDetector` and `clusterMatcher` sit behind minimum-check-in gates;
  `medicationLaneHelpers` returns early for single-element domains before dividing by
  `length - 1`.
- **`STAGE_DETAILS` and `TYPICAL_SYMPTOM_CLUSTERS`** are exhaustive `Record` types, so a new stage
  code cannot produce an undefined lookup at runtime — TypeScript enforces it.
- **`chartDrawing.ts:66`** guards `dates.length === 1` before dividing by `length - 1`.
