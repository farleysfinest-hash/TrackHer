# TrackHer AI companion

Personal journey companion (GPT-4o-mini) via Supabase Edge Function `ai-assistant`.
The OpenAI key stays on the server — never in Vite `.env` or the iOS app.

## Product stance

| Brain | Role |
|-------|------|
| **Pattern engine** (`runPatternEngine`) | Clinical / evidence authority — dose correlations, trends, safeguarding |
| **AI companion** | Warm friend for the journey — polishes copy, soft “AI noticed” observations, chat, monitor notes, report narrative, symptom phrase mapping |

The companion **never** rewrites or proposes cards about: `safeguarding`, `psych_trajectory`, `cardiac_persistence`, `bleeding_red_flag`.

“AI noticed” candidates are clearly labeled observations grounded in her facts packet — not peer clinical insights.

## 1. Add your OpenAI API key (Supabase Dashboard)

1. Open [platform.openai.com/api-keys](https://platform.openai.com/api-keys) → **Create new secret key** → copy it.
2. Open [Supabase Dashboard](https://supabase.com/dashboard) → your TrackHer project.
3. **Edge Functions** → **Secrets**.
4. Add secret:
   - Name: `OPENAI_API_KEY`
   - Value: `sk-...` (paste once; don’t commit it)

## 2. Deploy the function

```bash
cd /Users/james/Desktop/TrackHer
npx supabase login
npx supabase link --project-ref bgvfghnfmgbdezwotsmn
npx supabase functions deploy ai-assistant --project-ref bgvfghnfmgbdezwotsmn
```

Apply migration `030_ai_companion_cache_and_herd_stub.sql` (widens `ai_insights` types + herd stubs).

## 3. Try it in the app

```bash
cd /Users/james/Desktop/TrackHer
npm run dev
```

Chrome → Vite URL → **Insights**:
- **Ask about your data** (chat)
- Polished engine cards + **AI noticed**
- **Talk about this** on an insight
- Monitor note after a full weekly check-in
- Gap coach when meds exist but MRS history is thin

Also: Quick Log / personal symptom search for everyday phrases; provider PDF companion narrative above pattern blocks.

## Edge actions

| Action | Purpose |
|--------|---------|
| `chat` | Ask about her data (dose/level asks use fixed helpful scripts) |
| `explain_insight` | Talk through one card |
| `improve_insights` | Polish titles/bodies + AI noticed candidates |
| `monitor` | Post–weekly-check-in companion note |
| `report_narrative` | Provider PDF story draft |
| `symptom_translate` | Phrase → catalog keys only |

### Companion scripts (chat)

High-risk / high-dodge asks use deterministic templates (not free-form GPT):

| Shape | Examples |
|--------|----------|
| `mental_decline` | depressed / can’t fix this / hopeless without SI — answer feeling + pulse/dose; soft 988 only |
| `crisis` | SI / “kill myself” without plan/time — warm resources; **follow-ups must not paste the same blob** |
| `crisis_imminent` | tonight / method (gun etc.) / “going to do it” — shorter urgent reply; escalate copy on repeat |
| `med_effect` | why did progesterone lower energy / supposed to help — answer disappointment + dose-change facts |
| Emergency | clot, chest pain, stroke signs, post-meno heavy bleed — seek urgent care |
| DIY dose | double / skip / stop / switch product — refuse; clinician ask |
| Dose amount / should I raise | refuse personal mg; cite logs; small-step education |
| Lab target / interpret | her labs + educational ballpark; no diagnosis; units tip |
| Staging | point at profile STRAW/stage; don’t re-stage in chat |
| Comparison | no herd dosing; personal baseline |
| Thin / broken | won’t invent patterns; logging tip |
| Life support | partner disbelief / can’t afford — empathy + practical redirects |

Keep `src/utils/aiCompanionScripts.ts` and `supabase/functions/ai-assistant/companionScripts.ts` in sync; redeploy Edge after script changes.

Dose/lab demands (“just tell me”) after a script get a shorter, firmer version. Crisis demands do **not** replay the identical 988 paragraph — they escalate via `priorCrisisReplyCount`.

### Safety hardening (Edge)

- **Risk classifier fail-closed:** if the one-word risk-tier call errors or returns an unusable label, chat returns a soft safety reply (988 / findahelpline) instead of free-form companion chat.
- **Rate limit:** ~45 authenticated requests per user per 10 minutes (in-memory per isolate).
- **Forbidden explain:** `explain_insight` returns 403 when `insight.category` is in the safeguarding family; facts packets also strip those categories before any model call.

## Cache

`ai_insights` keyed by `user_id` + `insight_type` + `data_hash` (facts packet hash).

Types: `insight_polish`, `ai_candidate`, `monitor_note`, `gap_coach`, `report_narrative`, plus legacy types.

## Herd patterns (later)

Scaffold only in migration 030:
- `ai_herd_consent` — per-user opt-in
- `herd_aggregate_snapshots` — empty; no writers; no RLS for clients

Next phase: nightly SQL aggregates → anonymized stats packet → optional “women in your stage often…” **only with consent**. No raw cross-user dumps to the model.

## Repo map

| Path | Role |
|------|------|
| `supabase/functions/ai-assistant/index.ts` | Edge Function |
| `src/utils/aiFactsPacket.ts` | Facts JSON |
| `src/utils/aiForbiddenCategories.ts` | Never-touch categories |
| `src/utils/aiInsightsCache.ts` | Cache read/write |
| `src/hooks/useAiAssistant.ts` | Client invoke helpers |
| `src/hooks/useAiInsightLayer.ts` | Polish + candidates |
| `src/components/insights/AskDataSheet.tsx` | Chat UI |
| `src/components/insights/AiNoticedList.tsx` | Candidate list |
| `src/components/insights/CompanionMonitorCard.tsx` | Monitor note |
| `src/components/insights/GapCoachCard.tsx` | Gap coach |
