# TrackHer Luna AI setup

Luna uses the Supabase Edge Function `ai-assistant`. The OpenAI key stays on the server and must never be added to Vite environment variables or the iOS bundle.

## Product architecture

| Layer | Responsibility |
|---|---|
| Deterministic TrackHer engine | Safeguarding decisions, thresholds, arithmetic, and verified analysis-tool results |
| Luna | Shared conversation UI, consent-gated memory, explanations, and narration of verified results |
| Supabase | User-scoped threads, messages, memories, feedback, crisis continuity, and cached insights under RLS |

Luna never receives or explains the forbidden categories `safeguarding`, `psych_trajectory`, `cardiac_persistence`, or `bleeding_red_flag`.

## 1. Configure the OpenAI key

1. Create a key at [platform.openai.com/api-keys](https://platform.openai.com/api-keys).
2. Open the TrackHer project in the [Supabase Dashboard](https://supabase.com/dashboard).
3. Go to **Edge Functions → Secrets**.
4. Add `OPENAI_API_KEY` and paste the key once.

Optional: add `TRACKHER_ALLOWED_ORIGINS` as a comma-separated list when a web preview uses an origin outside TrackHer's built-in production, Capacitor, and local-development allowlist.

## 2. Apply local migrations and deploy

Luna persistence requires:

- `034_luna_conversations.sql`
- `035_luna_lab_report_import.sql`
- `036_luna_ai_rate_limit.sql`
- `037_luna_ai_rate_limit_high_ceiling.sql`

James applies migrations and deploys the Edge Function. Apply migrations `036` and `037` before deploying the Edge source: the deployed function calls the two-argument `consume_luna_ai_rate_limit(p_cost, p_high_ceiling)` introduced in `037`, and ordinary Luna actions fail closed (503) when the shared limiter cannot be reached. Repository agents must not apply or deploy either automatically.

```bash
cd /Users/james/Desktop/TrackHer
npx supabase login
npx supabase link --project-ref bgvfghnfmgbdezwotsmn
npx supabase db push --linked
npx supabase functions deploy ai-assistant --project-ref bgvfghnfmgbdezwotsmn
```

## 3. Run locally

```bash
cd /Users/james/Desktop/TrackHer
npm run dev
```

Luna appears as:

- the continuing Dashboard conversation;
- focused entry points on Medications, Check In, Lab Results, and Insights;
- evidence-backed synthesis on Insights;
- conversational Check In capture with confirmation before saving;
- lab-report photo extraction into a review draft.

## Edge actions

| Action | Purpose |
|---|---|
| `chat` | Shared Luna conversation with structured records, approved memory, and focused page context |
| `improve_insights` | Investigate hypotheses with deterministic tools and narrate verified findings |
| `explain_insight` | Explain one permitted insight |
| `monitor` | Preserve post-check-in monitor capability for Insights |
| `report_narrative` | Grounded provider-report narrative |
| `symptom_translate` | Map ordinary language to existing symptom keys |
| `visit_prep` | Structured appointment preparation |
| `journal_extract` | Prepare conversational Check In items for confirmation |
| `dose_watch` | Medication-change observation support |
| `visit_debrief` | Structure a post-appointment plan |
| `summarize_thread` | Incrementally summarize older thread turns; crisis details are omitted |
| `stage_explain` | Explain the recorded stage without re-staging |
| `partner_letter` | Grounded shareable explanation |
| `lab_report_extract` | Transcribe a report image into an unsaved review draft |

## Safety and privacy

- Deterministic detection and a model classifier backstop set the crisis tier.
- `mental_decline` is one-shot: no DB persistence, no safety panel, no 72-hour lock. Two paths depending on context: if HRT/menopause language appears alongside the emotional words (e.g. "this estradiol is making me feel hopeless"), the message routes to data-grounded free chat as `risk_watch` — the LLM gets her facts packet and can cite her data. If no treatment context, a deterministic script fires once. Pre-deploy `mental_decline` rows in `luna_crisis_state` are cleared on read.
- `crisis`, `crisis_imminent`, and `loved_one` tiers persist to `luna_crisis_state` with a 72-hour sliding window and a visible safety panel. Crisis state is user-level and survives thread changes.
- Clear euphemisms for self-harm (e.g. "off myself", "take myself out", "do myself in") are treated as real danger, same as "kill myself".
- Crisis state clears when she affirms safety ("I'm safe now") or asks to stop the follow-ups ("I don't want this help", "leave me alone", or the panel button). Soft dismiss respects the boundary without requiring her to say she is safe; clear danger in the same message still wins.
- A crisis-state read failure pauses ordinary Luna work; it does not silently continue without prior-tier context. A message that itself carries a hard crisis signal still proceeds to crisis handling.
- If the risk classifier is unavailable while a message carries a risk signal, Luna answers with a deterministic script, shows the support panel, and the turn is crisis-tagged client-side so it never enters thread summaries.
- Risk-watch middle tier: when risk-adjacent trip words fire but the classifier judges the message non-crisis, chat proceeds with a system note so the reply can acknowledge emotional weight in context instead of discarding the signal. No panel, no crisis state.
- Chat with an active crisis or a hard crisis signal bypasses the AI throttle entirely; risk-adjacent-only chat uses a raised 120-unit ceiling.
- The persistent support panel remains visible for every active persisted tier (crisis, crisis_imminent, loved_one).
- Free text sent to `journal_extract`, `visit_debrief`, `symptom_translate`, and `partner_letter` is risk-screened before any free-form model call. Only clear self-harm / loved-one danger blocks those flows; bare low mood (`mental_decline`) does not.
- Chat messages are capped at 4,000 characters and each history turn at 2,000 characters server-side.
- Conversation memory is saved only after explicit user consent. Crisis content is never proposed as memory or used for synthesis.
- Browser CORS uses an explicit origin allowlist. Auth and RLS remain the data-access boundary.
- Lab images are restricted to JPEG, PNG, or WebP and capped at 8 MB client-side plus an Edge request-size cap.

## Rate limiting

The Edge Function uses an atomic Supabase token bucket shared across cold starts and Edge isolates, plus a bounded in-isolate burst backstop. The ordinary bucket refills 45 weighted units over 10 minutes; risk-adjacent chat uses a raised 120-unit ceiling (`p_high_ceiling`, migration `037`); expensive synthesis and image extraction consume more capacity than ordinary chat. Authenticated identity comes from `auth.uid()`, and clients have no direct table access. Only chat during an active crisis or with a hard crisis signal in the current message bypasses the limiter entirely.

## Caching

- Insight caching uses the authenticated user plus facts hash.
- Analysis-tool results use user, facts hash, tool, and parameters, with a five-minute TTL and a hard in-isolate entry limit.
- Opening a tab or the Dashboard does not make a model request solely for decorative content.

## Repository map

| Path | Role |
|---|---|
| `supabase/functions/ai-assistant/index.ts` | Authenticated Edge request routing and model/tool orchestration |
| `supabase/functions/ai-assistant/analysisTools.ts` | Deterministic user-scoped calculations |
| `supabase/functions/ai-assistant/crisisController.ts` | Deterministic safety policy and validation |
| `supabase/functions/ai-assistant/crisisContinuityPolicy.ts` | Fail-closed dispositions when crisis state cannot be read |
| `supabase/functions/ai-assistant/rateLimitPolicy.ts` | Shared limiter capacities, action costs, and burst policy |
| `supabase/functions/ai-assistant/httpSecurity.ts` | CORS origin allowlist and response headers |
| `supabase/functions/ai-assistant/boundedTtlCache.ts` | Bounded in-isolate TTL cache for analysis-tool results |
| `src/utils/aiFactsPacket.ts` | Bounded structured context packet |
| `src/utils/aiForbiddenCategories.ts` | Never-touch categories |
| `src/hooks/useAiAssistant.ts` | Client invoke helpers |
| `src/lib/lunaConversations.ts` | Thread, message, memory, feedback, and crisis persistence |
| `src/components/luna/LunaProvider.tsx` | Shared Luna session and conversation state |
| `src/components/luna/LunaTranscript.tsx` | Message list, safety panel, and feedback surface |
| `src/components/luna/LunaComposer.tsx` | Message input and send controls |
| `src/components/luna/LunaHistoryView.tsx` | Past-conversation list with confirmed deletion |
| `src/components/luna/LunaMemoryView.tsx` | Consent-gated memory review and editing |
| `src/components/dashboard/LunaDashboardCard.tsx` | Dashboard relationship entry |
| `src/components/luna/LunaContextCard.tsx` | Context-specific tab entry |
| `src/components/insights/LunaSynthesisList.tsx` | Verified Insights synthesis |
| `src/components/labs/LabReportImportDialog.tsx` | Report-photo review workflow |

If `src/utils/aiCompanionScripts.ts` changes, copy it verbatim to `supabase/functions/ai-assistant/companionScripts.ts` and verify the diff is empty before deployment.
