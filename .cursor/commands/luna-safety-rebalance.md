---
description: Review the Luna safety rebalance — treatment complaints no longer trigger crisis scripts
---

A manual audit found Luna massively over-triggering crisis/safety responses for normal perimenopause language. Changes span four files. Review each and verify correctness.

## What was wrong

1. **`classifyCrisisTier()` caught treatment complaints as mental health crises.** The `mental_decline` regex matched words like "hopeless", "overwhelmed", "numb", "empty", "can't do this" — all common perimenopause language. "This HRT is making me feel hopeless" triggered a deterministic crisis script.

2. **The LLM classifier doubled down.** Even when the regex exception returned null, `RISK_TIER_SYSTEM` defines decline as "hopelessness, despair without a death wish." The classifier returned `decline`, the chat handler routed to the one-shot script, and treatment context was ignored.

3. **`buildMentalDeclineReply()` preemptively mentioned suicide.** Every `mental_decline` response included "If thoughts of wanting to die show up, call or text 988." Patronizing when she never mentioned wanting to die.

4. **`mental_decline` persisted to `luna_crisis_state` for 72 hours.** Once triggered via `handleHybridCrisis`, the DB row caused: sticky safety panel, check-in/journal_extract blocked with 409, rate-limit bypass. Pre-deploy rows survived indefinitely.

5. **COMPANION_BASE didn't instruct Luna to ground emotional responses in data.** Luna fell back on generic empathy instead of referencing MRS scores, pulse trends, dose changes.

## What changed

### File: `supabase/functions/ai-assistant/companionScripts.ts` (and `src/utils/aiCompanionScripts.ts` — verbatim copy)

**`classifyCrisisTier()` (~line 174):** Treatment-context exception — if HRT/menopause language appears alongside emotional words, return `null`.

**`MENOPAUSE_TREATMENT_RE` (~line 194):** Shared regex constant, deliberately tight:
`hrt`, `hormone`, `estrogen`, `oestrogen`, `estradiol`, `progesterone`, `testosterone`, `perimenopause`, `menopause`, `hot flash(es)`, `night sweat(s)`.

Intentionally excluded: `doctor`, `therapy`, `pill`, `medication`, `symptom`, `treatment`, `dose`, `prescription`, `vitamin`, `supplement`, `cream`, `gel`, `patch`.

**`hasMenopauseTreatmentContext()` (~line 202):** Exported helper. Used by the chat handler to route classifier-decline + treatment context to `risk_watch` instead of the deterministic script.

**`buildMentalDeclineReply()` (~line 601):** Removed preemptive "If thoughts of wanting to die show up, call or text 988" line. Replaced with clinician handoff only.

### File: `supabase/functions/ai-assistant/index.ts`

**Chat handler (~line 391):** Three-way branch for `mental_decline`:
1. `mental_decline` + treatment context → **fall through to data-grounded free chat as `risk_watch`**. The LLM gets her facts packet, the RISK_WATCH system note, and can cite her data. No script, no panel, no DB.
2. `mental_decline` + no treatment context → **one-shot deterministic script** via `buildTierScriptReply`. No DB upsert, no panel.
3. Any other crisis tier → `handleHybridCrisis` as before.

**`riskWatch` flag (~line 485):** Now also true when the classifier returned `decline` but treatment context is present: `crisisDecision.action === 'crisis' && crisisDecision.tier === 'mental_decline' && hasMenopauseTreatmentContext(message)`.

**`readActiveCrisisState()` (~line 576):** If a DB row has `tier === 'mental_decline'`, delete it and return `null`. Clears pre-deploy leftover rows so they don't: show a sticky panel, block check-ins (409), or bypass rate limits.

**COMPANION_BASE system prompt (~line 119):** Added data-grounding instruction and explicit prohibition against mentioning 988/crisis lines unless she brings up SI.

### File: `supabase/functions/ai-assistant/crisisController.ts`

**`decideCrisisTurn()` (~line 224):** Defense-in-depth: `priorTier === 'mental_decline'` returns `{ action: 'normal' }`. Handles any edge case where a mental_decline state exists despite the read-time cleanup.

## What was NOT changed

- `crisis`, `crisis_imminent`, `loved_one` tiers: untouched. Genuine SI detection intact.
- `handleHybridCrisis`: untouched. `mental_decline` never reaches it.
- `screenFreeTextRisk`: untouched (already one-shot, no DB).
- `looksRiskAdjacent`: untouched. Fail-closed paths remain conservative.
- `isMemorySafeContent`: untouched. Crisis-adjacent content still blocked from memory.
- `buildCrisisReply`: untouched. Real crisis scripts unchanged.
- `RISK_TIER_SYSTEM` classifier prompt: untouched. The classifier can still return `decline` — the chat handler now routes it correctly based on treatment context.
- Crisis state persistence for `crisis`/`crisis_imminent`/`loved_one`: untouched. 72h window applies.

## Tests added

**`aiCompanionScripts.test.ts`** — `treatment-context exception for mental_decline`:
- HRT/menopause language suppresses mental_decline (8 cases, each uses a keyword that would otherwise match)
- Bare emotional language still triggers (5 cases)
- Generic medical words do NOT suppress (5 cases)
- Genuine SI is never suppressed by treatment context (3 cases)
- mental_decline reply does not preemptively mention 988 or suicide

**`lunaCrisisController.test.ts`** — `mental_decline one-shot behavior`:
- mental_decline does not persist across follow-ups
- crisis / crisis_imminent / loved_one still persist

## Pre-existing issue (not fixed here)

`\bdepress\b` does NOT match "depressed" — the trailing `\b` fails at the 's'→'e' boundary. Standalone "I feel so depressed" returns `null` from the regex. Consider `\bdepress(ed)?\b` if this gap should be closed.

## Verification checklist

- [ ] `npx vitest run` — all tests pass
- [ ] `diff src/utils/aiCompanionScripts.ts supabase/functions/ai-assistant/companionScripts.ts` — empty
- [ ] "this HRT is making me feel hopeless" → LLM free chat with data (risk_watch), NOT crisis script
- [ ] "i feel hopeless" (no treatment context) → one-shot mental_decline script
- [ ] "i feel hopeless my doctor doesnt care" → one-shot mental_decline (generic word not excluded)
- [ ] "i want to kill myself" → crisis script (unchanged)
- [ ] "my daughter said she wants to die" → loved_one script (unchanged)
- [ ] After mental_decline → next message is normal, no safety panel
- [ ] After crisis → next message stays in crisis mode (unchanged)
- [ ] Pre-existing `mental_decline` DB row → cleared on read, no 409, no panel
- [ ] Grep `luna_crisis_state` — mental_decline never reaches `handleHybridCrisis` upsert
- [ ] Grep `988` — still in `buildCrisisReply`, `buildTierScriptReply`, `RISK_CLASSIFIER_UNAVAILABLE_REPLY`
