---
description: Full codebase audit with Luna AI focus
---

You are auditing the TrackHer codebase. **Do not make changes.** Report findings only.

Start by reading `docs/AI_SETUP.md` for product context.

## Scope

Audit these areas in order of priority:

### 1. Safety & crisis handling (CRITICAL — this is a health app)

Trace the full crisis pipeline in `supabase/functions/ai-assistant/`:
- Deterministic regex → LLM classifier → tier assignment → script selection → persistent state
- Check `crisisController.ts` and `crisisContinuityPolicy.ts` for fail-open paths
- Verify `mental_decline` tier renders safety resources in the Luna UI
- Confirm `AI_FORBIDDEN_CATEGORIES` blocks safeguarding/psych_trajectory/cardiac_persistence/bleeding_red_flag from reaching the model
- Verify crisis content never enters Luna memories (`isMemorySafeContent`)
- Verify dose/med requests use deterministic scripts, not free-form GPT

### 2. Security

- **CORS**: Check `httpSecurity.ts` — is origin restricted or wildcard?
- **Auth**: Trace JWT verification — any action path that skips it?
- **Rate limiting**: Check `rateLimitPolicy.ts` + migrations 036/037 — per-isolate or DB-backed?
- **API key**: Confirm `OPENAI_API_KEY` is edge-function-only, never in `VITE_*` env
- **RLS**: Verify all tables in migrations 030-037 have RLS + `auth.uid()` policies
- **Input sanitization**: Are user messages length-bounded before sending to OpenAI?

### 3. Data privacy

- List every health data field in `src/utils/aiFactsPacket.ts` that leaves the client
- Check `src/pages/PrivacyPolicyPage.tsx` discloses OpenAI processing
- Verify lab report images aren't persisted after extraction
- Check for size cap on lab report data URLs in `src/hooks/useAiAssistant.ts`

### 4. Code quality

- Dead code: `@deprecated` exports still used, unused imports, TODO/FIXME/HACK
- Stale docs: Compare `docs/AI_SETUP.md` repo map against actual files
- Run `npx tsc --noEmit` and report errors
- Run `npx vitest run` and report results
- List Luna/AI modules with NO test coverage
- Flag `console.log`/`console.error` in production code paths

### 5. React & UX

- Check Luna panel accessibility: `role="dialog"`, `aria-modal`, focus trap
- Check destructive actions have confirmation dialogs (delete thread, clear memories)
- Check async calls without `.catch()` handlers
- Check `useEffect` cleanup for timers/subscriptions
- Verify loading, error, and empty states exist

### 6. Edge function

- Confirm model is `gpt-5.6-luna` with `max_completion_tokens` (not deprecated `max_tokens`)
- List every action and whether each has auth + rate limit checks
- Check `boundedTtlCache.ts` has max-size / LRU eviction
- Verify OpenAI errors don't leak internal details to client

## Output format

```
## [Section Name]

### CRITICAL
- [finding] — file:line — [explanation]

### HIGH / MEDIUM / LOW
- ...

### GOOD
- ...
```

End with **"Top 5 fixes before merging to main"** ranked by risk.
