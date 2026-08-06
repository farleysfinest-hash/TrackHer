# TrackHer Luna AI setup

Luna uses the Supabase Edge Function `ai-assistant`. The OpenAI key stays on the server and must never be added to Vite environment variables or the iOS bundle.

## Product architecture

| Layer | Responsibility |
|---|---|
| Deterministic TrackHer engine | Safeguarding decisions, thresholds, arithmetic, and verified analysis-tool results |
| Luna | Shared conversation UI, consent-gated memory, explanations, and narration of verified results |
| Supabase | User-scoped threads, messages, memories, feedback, and cached insights under RLS |

Luna never receives or explains the forbidden categories `safeguarding`, `psych_trajectory`, `cardiac_persistence`, or `bleeding_red_flag`.

## 1. Configure the OpenAI key

1. Create a key at [platform.openai.com/api-keys](https://platform.openai.com/api-keys).
2. Open the TrackHer project in the [Supabase Dashboard](https://supabase.com/dashboard).
3. Go to **Edge Functions → Secrets**.
4. Add `OPENAI_API_KEY` and paste the key once.

Optional model secrets (defaults are cost-first):
- `OPENAI_MODEL` — primary (default `gpt-5.6-luna`).
- `OPENAI_FALLBACK_MODEL` — only after a transient 429/5xx on Luna (one retry, then one fallback). Default `gpt-4o-mini`. Never used for 4xx. Do not set this to terra for routine reliability.
- `OPENAI_COMPLEX_MODEL` — optional; only for future explicit heavy-analysis escalation. Leave unset so terra is never auto-selected.

The in-app companion is named Luna; the OpenAI model id is an infrastructure choice.

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

- Deterministic regex detection sets the crisis tier per message (`deterministicCurrentCrisisTier`). There is no LLM risk classifier; safety routing is regex-only.
- Low mood, fatigue, and depression language without clear suicidal intent is handled by ordinary free chat — never a crisis tier, never a safety panel.
- `crisis`, `crisis_imminent`, and `loved_one` tiers trigger the safety panel on the client for the current session. Crisis state is ephemeral (React state in LunaProvider); it does not persist to the database and does not survive page reloads.
- Clear euphemisms for self-harm (e.g. "off myself", "take myself out", "do myself in") are treated as real danger, same as "kill myself".
- If the model or facts packet is unavailable during a crisis message, the Edge falls back to a deterministic scripted reply (`buildTierScriptReply`) with `showSafetyPanel: true`. Clear SI never depends on a successful model call.
- Crisis turns are tagged client-side so they never enter thread summaries. Crisis content is never proposed as memory.
- Free text sent to `journal_extract`, `visit_debrief`, `symptom_translate`, and `partner_letter` is risk-screened before any free-form model call. Only clear self-harm / loved-one danger blocks those flows; low mood does not.
- Chat messages are capped at 4,000 characters and each history turn at 2,000 characters server-side.
- Conversation memory is saved only after explicit user consent. Crisis content is never proposed as memory or used for synthesis.
- Browser CORS uses an explicit origin allowlist. Auth and RLS remain the data-access boundary.
- Lab images are restricted to JPEG, PNG, or WebP and capped at 8 MB client-side plus an Edge request-size cap.

## Rate limiting

The Edge Function uses an atomic Supabase token bucket shared across cold starts and Edge isolates, plus a bounded in-isolate burst backstop. The ordinary bucket refills 45 weighted units over 10 minutes; risk-adjacent chat uses a raised 120-unit ceiling (`p_high_ceiling`, migration `037`); expensive synthesis and image extraction consume more capacity than ordinary chat. Authenticated identity comes from `auth.uid()`, and clients have no direct table access. Chat with a hard crisis signal in the current message bypasses the limiter entirely.

## Caching

- Insight caching uses the authenticated user plus facts hash.
- Analysis-tool results use user, facts hash, tool, and parameters, with a five-minute TTL and a hard in-isolate entry limit.
- Opening a tab or the Dashboard does not make a model request solely for decorative content.

## Repository map

| Path | Role |
|---|---|
| `supabase/functions/ai-assistant/index.ts` | Authenticated Edge request routing and model/tool orchestration |
| `supabase/functions/ai-assistant/analysisTools.ts` | Deterministic user-scoped calculations |
| `supabase/functions/ai-assistant/crisisController.ts` | Deterministic regex crisis detection and danger-signal checks |
| `supabase/functions/ai-assistant/rateLimitPolicy.ts` | Shared limiter capacities, action costs, and burst policy |
| `supabase/functions/ai-assistant/httpSecurity.ts` | CORS origin allowlist and response headers |
| `supabase/functions/ai-assistant/boundedTtlCache.ts` | Bounded in-isolate TTL cache for analysis-tool results |
| `src/utils/aiFactsPacket.ts` | Bounded structured context packet |
| `src/utils/aiForbiddenCategories.ts` | Never-touch categories |
| `src/hooks/useAiAssistant.ts` | Client invoke helpers |
| `src/lib/lunaConversations.ts` | Thread, message, memory, and feedback persistence |
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
