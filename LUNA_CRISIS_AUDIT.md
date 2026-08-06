# Luna Crisis Detection Audit

**Date:** 2026-08-02  
**Scope:** Full pipeline — client regex → Edge Function classifier → `decideCrisisTurn` → crisis state management → UI safety panel  
**Status:** All three findings addressed by Cursor's safety commits (`e5b8c7c`, `5a3941a`, `2d5100b`). 696/696 tests pass.

---

## Finding 1 — `decideCrisisTurn` overrides successful classifier with `classifier_unavailable`

**Severity: HIGH — false positive 988 panel on normal messages**  
**Status: FIXED** (commit `e5b8c7c`)

**Location:** `supabase/functions/ai-assistant/crisisController.ts`, line 289

**What was wrong:** The `classifier_unavailable` return fired whenever `currentMessageHasCrisisSignal` was true, even after the classifier successfully returned `{status: 'ok', tier: null}`. Any standalone method-mention word (`hanging`, `overdose`, `knife`, etc.) would override the classifier's verdict and show the 988 panel.

**Fix applied:** Added `input.classification?.status !== 'ok'` guard:

```ts
if (
  input.classification?.status !== 'ok' &&
  currentMessageHasCrisisSignal(input.message)
) {
  return { action: 'classifier_unavailable' };
}
```

Now the fail-closed path only fires when the classifier didn't run or failed. A successful `none` is respected.

**Additional guard (line 251–264):** Cursor also added a confirmation gate on classifier-returned tiers — the classifier's crisis verdict now requires corroboration from `currentMessageHasCrisisSignal`, `looksRiskAdjacent`, or `loved_one_crisis` shape. This prevents the LLM from solo-escalating ambiguous messages like "I feel tired" while still catching real danger. Deliberate tradeoff: novel euphemisms that no regex recognizes won't be caught by the classifier alone. Acceptable for a menopause app.

---

## Finding 2 — `crisis_continuity_unavailable` false positive on Supabase DB outage

**Severity: MEDIUM — rare trigger, correct fail-closed intent, but aggressive**  
**Status: FIXED** (commit `5a3941a`)

**Location:** `supabase/functions/ai-assistant/crisisContinuityPolicy.ts`

**What was wrong:** When `readActiveCrisisState` failed, messages without crisis signals got a full crisis payload with the 988 panel and a message about unverifiable "safety conversations."

**Fix applied:** `crisisContinuityUnavailablePayload` now returns a plain retry error with no crisis tier and no safety panel:

```ts
return {
  error: 'Luna cannot verify conversation continuity right now. Please try again in a moment.',
} as const;
```

Messages with active crisis signals still get `proceed_crisis` routing (fail-closed for real danger). Test coverage confirms: "pauses ordinary chat with a retry error and no 988 panel."

---

## Finding 3 — `currentMessageHasCrisisSignal` method-mention regex too broad for HRT context

**Severity: MEDIUM — contributes to Finding 1**  
**Status: FIXED** (commit `e5b8c7c`)

**Location:** `supabase/functions/ai-assistant/crisisController.ts`, line 173

**What was wrong:** Standalone `hang`, `hanging`, and `overdose` matched casual HRT phrases ("hanging in there", "can I overdose on patches?").

**Fix applied:** Narrowed the regex to `hang myself` (self-harm specific) and removed `overdose` entirely:

```ts
/\b(gun|rifle|pistol|firearm|hang myself|jump off|slit|bleed out|knife)\b/
```

These words are still caught by `classifyCrisisTier` when paired with ideation context. The standalone method check now only fires on unambiguous danger words.

---

## Other changes reviewed (no issues found)

- **Soft dismiss** (`SOFT_DISMISS_PATTERNS`): "leave me alone" / "stop asking" resolves an active crisis without affirming safety. Blocked when the same message contains danger. Early exit in `decideCrisisTurn` at line 243.

- **`mental_decline` one-shot**: No longer persists across follow-ups (line 280). Fires once, delivers its script, returns to normal. Treatment-context low mood (`hasMenopauseTreatmentContext`) routes to data-grounded free chat instead.

- **SI euphemisms**: Added `off myself`, `take myself out`, `do myself in` to `classifyCrisisTier`. Catches slang the original patterns missed.

- **Clinician screening**: `stripNegatedClinicianRiskReport` now handles trailing clauses ("doctor asked… I said no, but I want to die") correctly. `isClearlyNegatedClinicianRiskReport` returns true only when nothing remains after the strip.

- **`screenFreeTextRisk`**: Returns null for `mental_decline` — low mood in journal/letter/visit-prep no longer blocks capture.

- **Client-side dismiss**: Safety panel has "I don't want these prompts right now" button. `onDismissCrisis` clears both local state and DB row. `false_crisis_perception` feedback also clears state.

- **`shouldForceDemandFromHistory`**: Simplified — removed redundant nested branch that checked crisis words inside a demand-push block. The early `classifyCrisisTier` return already handles crisis messages.

- **Client/server `companionScripts.ts` sync**: Both files are identical (verified via `diff`).

---

## Things that work correctly

- **Tiered crisis classification** (`crisis_imminent` / `crisis` / `mental_decline` / `loved_one`): Clear separation. `mental_decline` correctly one-shot, never shows 988.

- **Recovery language suppression**: Past-tense "doing better" / "not anymore" correctly suppresses ideation detection.

- **Negated clinician screening**: "doctor asked if I wanted to kill myself, I said no" properly stripped. Trailing danger clauses still classified.

- **Resolution with danger override**: "I'm safe now, but I have a gun" correctly fails to resolve. Resolution requires explicit safety language AND classifier `none` AND no crisis signal.

- **Crisis reply variation**: Reply count alternates wording. No broken-record 988 paste.

- **Hybrid crisis flow**: LLM writes empathic reflection only; resources/questions/actions come from deterministic scripts. `validateCrisisReflection` rejects unsafe model copy.

- **Memory safety**: Crisis content blocked from Luna memory. Crisis messages redacted from thread summaries.

- **Client-side state management**: Persists across sessions, 72h expiry, manual dismiss, `false_crisis_perception` feedback.

- **Rate limit exemption**: Crisis chat bypasses rate limiting.

- **`parseRiskTierLabel` maps 'decline' → 'none'**: Prevents classifier from creating persistent `mental_decline` tier.
