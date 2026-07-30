/**
 * TrackHer AI companion — GPT-4o-mini over a client-built facts packet.
 *
 * Secrets (Dashboard → Edge Functions → Secrets, or CLI):
 *   OPENAI_API_KEY
 *
 * Never put the OpenAI key in Vite .env — it would ship to the client.
 */
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1';
import {
  buildCompanionScriptReply,
  buildTierScriptReply,
  classifyCompanionShape,
  parseRiskTierLabel,
  shouldForceDemandFromHistory,
  type CrisisTier,
  type FactsLite,
} from './companionScripts.ts';

const MODEL = 'gpt-4o-mini';
const MAX_OUTPUT_TOKENS = 800;

/** Categories the companion must never explain, polish, or receive in the facts packet. */
const AI_FORBIDDEN_CATEGORIES = new Set([
  'safeguarding',
  'psych_trajectory',
  'cardiac_persistence',
  'bleeding_red_flag',
]);

/** Soft reply when the risk-tier backstop cannot run (API error / unusable label). */
const RISK_CLASSIFIER_UNAVAILABLE_REPLY =
  "I'm having a brief glitch checking how you're doing, so I won't keep chatting on autopilot right now. If you're in a hard place, please reach out — call or text 988 in the US, or findahelpline.com for a local line. Try me again in a moment when you're ready.";

/** Per-isolate sliding window — enough headroom for polish + chat + cards, blocks abuse. */
const AI_RATE_LIMIT_MAX = 45;
const AI_RATE_LIMIT_WINDOW_MS = 10 * 60 * 1000;
const aiRateBuckets = new Map<string, number[]>();

const COMPANION_BASE = `You are TrackHer's gentle companion for a woman tracking menopause / HRT symptoms — a kind friend for the journey who happens to know her logs. Soft, feminine, clear. Warm but not fluffy. Never dodge a direct question with a wall of generic empathy.

Global rules:
- Ground personal claims in the facts packet only. Do not invent her numbers, dates, scores, labs, or dose changes.
- Answer the question she asked in the first 1–2 sentences. Keep replies short (about 3–6 sentences) unless she asks for more.
- Never prescribe dose changes. Never diagnose.
- If she asks WHY a med change might have affected energy/mood: acknowledge the disappointment, cite any matching dose-change + pulse/MRS from the packet, note that progesterone can feel flattening/sedating for some women (correlation ≠ proof), and hand a clinician question. Do not ignore the emotional "supposed to help" part.
- Low mood without suicide language: be caring, cite pulse/mood if present, encourage clinician follow-up; mention 988 only if she sounds hopeless or stuck — do not dump a full crisis script.
- Active suicidal content is handled by a separate safety script — if you somehow see it, be warm, urge 988/emergency help, and do not counsel through a plan.

Thin history: say so gently. Use "you".`;

type ChatMessage = { role: 'user' | 'assistant'; content: string };

type AiAction =
  | 'chat'
  | 'improve_insights'
  | 'monitor'
  | 'report_narrative'
  | 'symptom_translate'
  | 'explain_insight'
  | 'visit_prep'
  | 'journal_extract'
  | 'dose_watch'
  | 'visit_debrief'
  | 'daily_line'
  | 'stage_explain'
  | 'partner_letter';

type RequestBody = {
  action?: AiAction;
  message?: string;
  facts?: unknown;
  history?: ChatMessage[];
  insight?: { id?: string; title?: string; body?: string; category?: string };
  freeText?: string;
  catalog?: Array<{ key: string; label: string; searchTerms?: string[] }>;
  medications?: string[];
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders() });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return json({ error: 'Missing Authorization' }, 401);
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseAnon = Deno.env.get('SUPABASE_ANON_KEY');
    const openaiKey = Deno.env.get('OPENAI_API_KEY');

    if (!supabaseUrl || !supabaseAnon) {
      return json({ error: 'Server misconfigured (Supabase)' }, 500);
    }
    if (!openaiKey) {
      return json({ error: 'OPENAI_API_KEY not set on Edge Function secrets' }, 500);
    }

    const userClient = createClient(supabaseUrl, supabaseAnon, {
      global: { headers: { Authorization: authHeader } },
    });
    const {
      data: { user },
      error: userError,
    } = await userClient.auth.getUser();
    if (userError || !user) {
      return json({ error: 'Unauthorized' }, 401);
    }

    if (!allowAiRequest(user.id)) {
      return json(
        { error: 'Too many AI requests. Please wait a few minutes and try again.' },
        429,
      );
    }

    const body = (await req.json()) as RequestBody;
    const action: AiAction = body.action ?? 'chat';

    switch (action) {
      case 'chat':
        return await handleChat(openaiKey, user.id, body);
      case 'explain_insight':
        return await handleExplain(openaiKey, user.id, body);
      case 'improve_insights':
        return await handleImprove(openaiKey, user.id, body);
      case 'monitor':
        return await handleMonitor(openaiKey, user.id, body);
      case 'report_narrative':
        return await handleNarrative(openaiKey, user.id, body);
      case 'symptom_translate':
        return await handleTranslate(openaiKey, user.id, body);
      case 'visit_prep':
        return await handleVisitPrep(openaiKey, user.id, body);
      case 'journal_extract':
        return await handleJournalExtract(openaiKey, user.id, body);
      case 'dose_watch':
        return await handleDoseWatch(openaiKey, user.id, body);
      case 'visit_debrief':
        return await handleVisitDebrief(openaiKey, user.id, body);
      case 'daily_line':
        return await handleDailyLine(openaiKey, user.id, body);
      case 'stage_explain':
        return await handleStageExplain(openaiKey, user.id, body);
      case 'partner_letter':
        return await handlePartnerLetter(openaiKey, user.id, body);
      default:
        return json({ error: `Unsupported action: ${action}` }, 400);
    }
  } catch (e) {
    console.error(e);
    return json({ error: 'Unexpected server error' }, 500);
  }
});

async function handleChat(openaiKey: string, userId: string, body: RequestBody) {
  const message = body.message?.trim();
  if (!message) return json({ error: 'message is required' }, 400);
  const factsJson = requireFacts(body.facts);
  if (typeof factsJson !== 'string') return factsJson;

  const history = sanitizeHistory(body.history);
  const facts = body.facts as FactsLite;
  const demand = shouldForceDemandFromHistory(message, history);
  let finalScript = buildCompanionScriptReply(message, facts, { demand, history });

  // Short push after a prior *dose/lab* script → reuse last classified user ask.
  // Crisis follow-ups are handled inside buildCompanionScriptReply via history count.
  if (!finalScript && demand) {
    const lastUserShaped = [...history]
      .reverse()
      .find((h) => h.role === 'user' && classifyCompanionShape(h.content));
    if (lastUserShaped) {
      finalScript = buildCompanionScriptReply(lastUserShaped.content, facts, {
        demand: true,
        history,
      });
    }
  }

  // Regex found nothing. Backstop: let the model classify risk tier ONLY —
  // it picks the door, the deterministic scripts still write every word.
  // Catches phrasings the regex can't enumerate (euphemisms, typos, non-English).
  if (!finalScript) {
    const classification = await classifyRiskTier(openaiKey, message, history);
    if (classification.status === 'unavailable') {
      return json({
        reply: RISK_CLASSIFIER_UNAVAILABLE_REPLY,
        model: 'trackher-companion-script',
        shape: 'risk_classifier_unavailable',
        userId,
      });
    }
    if (classification.tier) {
      finalScript = buildTierScriptReply(classification.tier, message, facts, history);
    }
  }

  if (finalScript) {
    return json({
      reply: finalScript.reply,
      model: 'trackher-companion-script',
      shape: finalScript.shape,
      userId,
    });
  }

  const reply = await complete(openaiKey, {
    system: `${COMPANION_BASE}
You ONLY discuss patterns visible in the JSON facts packet for *her* personal story.
Never invent a personal dose increase, lab target, diagnosis, or emergency clearance.`,
    messages: [
      ...history,
      {
        role: 'user',
        content: `FACTS_PACKET:\n${factsJson}\n\nUSER_QUESTION:\n${message}`,
      },
    ],
  });
  if (reply.error) return json({ error: reply.error }, reply.status ?? 502);
  return json({ reply: reply.text, model: MODEL, userId });
}

type RiskClassification =
  | { status: 'ok'; tier: CrisisTier | null }
  | { status: 'unavailable' };

const RISK_TIER_SYSTEM = `You label ONE message from a woman chatting in a menopause-tracking app for suicide/self-harm risk. Typos, slang, euphemisms ("unalive", "never wake up"), and non-English text all count. Recent turns give context — label the LAST user message in light of them.
Reply with exactly one word:
imminent — intent to act with a timeframe, method, plan, "going to do it", or asking what amount of medication would harm/kill her
ideation — wants to die / suicidal or self-harm thoughts, no plan or timeframe stated. ALSO use this when earlier turns show she voiced suicidal thoughts and the last message continues that thread (pushback like "stop giving me hotlines", "just talk to me")
decline — serious low mood, hopelessness, despair without a stated death wish; or PAST suicidal feelings she says have eased ("last month I wanted to end it but I'm doing better")
none — everything else: figures of speech ("this heat is killing me"), and risk that is about someone ELSE (her child, friend — not the writer herself)`;

async function classifyRiskTier(
  openaiKey: string,
  message: string,
  history: ChatMessage[],
): Promise<RiskClassification> {
  const context = history
    .slice(-4)
    .map((h) => `${h.role}: ${h.content.slice(0, 300)}`)
    .join('\n');
  const res = await complete(openaiKey, {
    system: RISK_TIER_SYSTEM,
    messages: [
      {
        role: 'user',
        content: `${context ? `RECENT TURNS:\n${context}\n\n` : ''}LAST USER MESSAGE:\n${message}`,
      },
    ],
    temperature: 0,
    maxTokens: 5,
  });
  // Fail closed: never drop into free-form companion chat when we couldn't label risk.
  if (res.error) return { status: 'unavailable' };
  const label = parseRiskTierLabel(res.text);
  if (label === null) return { status: 'unavailable' };
  if (label === 'none') return { status: 'ok', tier: null };
  return { status: 'ok', tier: label };
}

async function handleExplain(openaiKey: string, userId: string, body: RequestBody) {
  const factsJson = requireFacts(body.facts);
  if (typeof factsJson !== 'string') return factsJson;
  if (!body.insight || typeof body.insight !== 'object') {
    return json({ error: 'insight is required' }, 400);
  }

  const category = body.insight.category;
  if (typeof category === 'string' && AI_FORBIDDEN_CATEGORIES.has(category)) {
    return json(
      {
        error:
          'This insight is handled by TrackHer safety layer and cannot be explained by the companion.',
      },
      403,
    );
  }

  const reply = await complete(openaiKey, {
    system: `${COMPANION_BASE}
Explain one insight card in plain, warm language. Ground every claim in the facts packet and the insight text. Do not invent supporting numbers.`,
    messages: [
      {
        role: 'user',
        content: `FACTS_PACKET:\n${factsJson}\n\nINSIGHT:\n${JSON.stringify(body.insight)}\n\nPlease explain this insight gently for her.`,
      },
    ],
  });
  if (reply.error) return json({ error: reply.error }, reply.status ?? 502);
  return json({ reply: reply.text, model: MODEL, userId });
}

async function handleImprove(openaiKey: string, userId: string, body: RequestBody) {
  const factsJson = requireFacts(body.facts);
  if (typeof factsJson !== 'string') return factsJson;

  const allowedIds = new Set<string>();
  try {
    const cleaned = JSON.parse(factsJson) as { engineInsights?: Array<{ id?: string }> };
    for (const i of cleaned.engineInsights ?? []) {
      if (i?.id) allowedIds.add(i.id);
    }
  } catch {
    // polished will drop if we cannot read ids
  }

  const raw = await complete(openaiKey, {
    system: `${COMPANION_BASE}
Return ONLY valid JSON (no markdown) with this shape:
{"polished":[{"id":"...","title":"...","body":"..."}],"candidates":[{"title":"...","body":"...","citedFacts":["..."]}]}

Rules for polished:
- Rewrite title/body for warmth and clarity. Keep the same meaning and ids.
- Only polish insights present in the facts packet engineInsights array.
- Do not invent new clinical claims.

Rules for candidates ("AI noticed"):
- Soft observations grounded in dates/scores/dose changes in the packet.
- 0–3 candidates. Each citedFacts entry must name a concrete packet fact (date + score or dose change).
- Never invent numbers. Never suggest dosing or diagnoses.
- Prefer empty candidates over speculative ones.`,
    messages: [
      {
        role: 'user',
        content: `FACTS_PACKET:\n${factsJson}\n\nPolish engineInsights and optionally suggest AI noticed candidates.`,
      },
    ],
    temperature: 0.35,
    maxTokens: 1000,
  });
  if (raw.error) return json({ error: raw.error }, raw.status ?? 502);

  const parsed = parseJsonObject(raw.text);
  if (!parsed) {
    return json({
      polished: [],
      candidates: [],
      model: MODEL,
      userId,
      parseWarning: true,
    });
  }

  const polished = Array.isArray(parsed.polished)
    ? parsed.polished
        .filter(
          (p): p is { id: string; title: string; body: string } =>
            !!p &&
            typeof p === 'object' &&
            typeof (p as { id?: unknown }).id === 'string' &&
            typeof (p as { title?: unknown }).title === 'string' &&
            typeof (p as { body?: unknown }).body === 'string' &&
            allowedIds.has((p as { id: string }).id),
        )
        .map((p) => ({
          id: p.id,
          title: p.title.slice(0, 160),
          body: p.body.slice(0, 800),
        }))
    : [];

  const candidates = Array.isArray(parsed.candidates)
    ? parsed.candidates
        .filter(
          (c): c is { title: string; body: string; citedFacts?: unknown } =>
            !!c &&
            typeof c === 'object' &&
            typeof (c as { title?: unknown }).title === 'string' &&
            typeof (c as { body?: unknown }).body === 'string',
        )
        .slice(0, 3)
        .map((c) => ({
          title: c.title.slice(0, 160),
          body: c.body.slice(0, 800),
          citedFacts: Array.isArray(c.citedFacts)
            ? c.citedFacts.filter((x): x is string => typeof x === 'string').slice(0, 6)
            : [],
        }))
    : [];

  return json({ polished, candidates, model: MODEL, userId });
}

async function handleMonitor(openaiKey: string, userId: string, body: RequestBody) {
  const factsJson = requireFacts(body.facts);
  if (typeof factsJson !== 'string') return factsJson;

  const raw = await complete(openaiKey, {
    system: `${COMPANION_BASE}
Return ONLY valid JSON (no markdown):
{"note":"...","gapHint":"...or null"}

note: 2–4 short sentences celebrating progress or gently reflecting what her recent logs show.
gapHint: optional soft nudge if meds are logged but weekly check-ins look thin — never shame. null if not needed.`,
    messages: [{ role: 'user', content: `FACTS_PACKET:\n${factsJson}` }],
    temperature: 0.4,
    maxTokens: 400,
  });
  if (raw.error) return json({ error: raw.error }, raw.status ?? 502);

  const parsed = parseJsonObject(raw.text);
  const note =
    typeof parsed?.note === 'string' && parsed.note.trim()
      ? parsed.note.trim().slice(0, 600)
      : raw.text.slice(0, 600);
  const gapHint =
    typeof parsed?.gapHint === 'string' && parsed.gapHint.trim()
      ? parsed.gapHint.trim().slice(0, 400)
      : null;

  return json({ note, gapHint, model: MODEL, userId });
}

async function handleNarrative(openaiKey: string, userId: string, body: RequestBody) {
  const factsJson = requireFacts(body.facts);
  if (typeof factsJson !== 'string') return factsJson;

  const reply = await complete(openaiKey, {
    system: `${COMPANION_BASE}
Write a 2–4 paragraph plain-language story of her recent tracking for a clinician PDF.
- Ground every claim in the facts packet.
- No dosing advice or diagnoses.
- Third person or "the patient" is fine for clinical tone, but keep warmth.
- Do not mention AI. Do not invent labs or scores.`,
    messages: [
      {
        role: 'user',
        content: `FACTS_PACKET:\n${factsJson}\n\nDraft the companion narrative for the provider report.`,
      },
    ],
    temperature: 0.35,
    maxTokens: 700,
  });
  if (reply.error) return json({ error: reply.error }, reply.status ?? 502);
  return json({ narrative: reply.text, model: MODEL, userId });
}

async function handleVisitPrep(openaiKey: string, userId: string, body: RequestBody) {
  const factsJson = requireFacts(body.facts);
  if (typeof factsJson !== 'string') return factsJson;
  const history = sanitizeHistory(body.history);

  const historyBlock =
    history.length > 0
      ? `\n\nRECENT_CHAT (optional context only — still ground in FACTS_PACKET):\n${JSON.stringify(history)}`
      : '';

  const raw = await complete(openaiKey, {
    system: `${COMPANION_BASE}
Return ONLY valid JSON (no markdown):
{"summary":"...","symptomsToRaise":["..."],"questions":["..."],"watchSince":"...or null"}

You are drafting a visit-prep pack she can bring to a clinician appointment.
- summary: 2–3 sentences of her recent story, grounded only in the facts packet.
- symptomsToRaise: up to 5 items; each must cite a packet fact (date + score or dose change). No invented numbers.
- questions: up to 4 clinician questions in her voice. Never suggest dose amounts — prefer "what range are we aiming for" style.
- watchSince: one line if a recent dose change deserves follow-up; otherwise null.
Never diagnose. Never prescribe.`,
    messages: [
      {
        role: 'user',
        content: `FACTS_PACKET:\n${factsJson}${historyBlock}\n\nDraft the visit prep pack.`,
      },
    ],
    temperature: 0.35,
    maxTokens: 700,
  });
  if (raw.error) return json({ error: raw.error }, raw.status ?? 502);

  const parsed = parseJsonObject(raw.text);
  const summary =
    typeof parsed?.summary === 'string' && parsed.summary.trim()
      ? parsed.summary.trim().slice(0, 800)
      : '';
  if (!summary) {
    return json({ error: 'Could not draft visit prep' }, 502);
  }
  const symptomsToRaise = Array.isArray(parsed?.symptomsToRaise)
    ? parsed.symptomsToRaise
        .filter((s): s is string => typeof s === 'string' && s.trim().length > 0)
        .map((s) => s.trim().slice(0, 240))
        .slice(0, 5)
    : [];
  const questions = Array.isArray(parsed?.questions)
    ? parsed.questions
        .filter((s): s is string => typeof s === 'string' && s.trim().length > 0)
        .map((s) => s.trim().slice(0, 240))
        .slice(0, 4)
    : [];
  const watchSince =
    typeof parsed?.watchSince === 'string' && parsed.watchSince.trim()
      ? parsed.watchSince.trim().slice(0, 240)
      : null;

  return json({ summary, symptomsToRaise, questions, watchSince, model: MODEL, userId });
}

async function handleTranslate(openaiKey: string, userId: string, body: RequestBody) {
  const freeText = body.freeText?.trim();
  if (!freeText) return json({ error: 'freeText is required' }, 400);
  const catalog = Array.isArray(body.catalog) ? body.catalog.slice(0, 80) : [];
  if (catalog.length === 0) return json({ error: 'catalog is required' }, 400);

  const catalogJson = JSON.stringify(
    catalog.map((c) => ({
      key: c.key,
      label: c.label,
      searchTerms: (c.searchTerms ?? []).slice(0, 8),
    })),
  );
  if (catalogJson.length > 40_000) {
    return json({ error: 'catalog too large' }, 400);
  }

  const raw = await complete(openaiKey, {
    system: `${COMPANION_BASE}
Return ONLY valid JSON (no markdown):
{"suggestions":[{"key":"...","label":"...","reason":"..."}]}

Map her everyday phrase to 1–5 catalog entries. key MUST be copied exactly from the catalog. If nothing fits, return {"suggestions":[]}.`,
    messages: [
      {
        role: 'user',
        content: `PHRASE:\n${freeText}\n\nCATALOG:\n${catalogJson}`,
      },
    ],
    temperature: 0.2,
    maxTokens: 400,
  });
  if (raw.error) return json({ error: raw.error }, raw.status ?? 502);

  const allowed = new Map(catalog.map((c) => [c.key, c.label]));
  const parsed = parseJsonObject(raw.text);
  const suggestions = Array.isArray(parsed?.suggestions)
    ? parsed.suggestions
        .filter(
          (s): s is { key: string; label?: string; reason?: string } =>
            !!s && typeof s === 'object' && typeof (s as { key?: unknown }).key === 'string',
        )
        .filter((s) => allowed.has(s.key))
        .slice(0, 5)
        .map((s) => ({
          key: s.key,
          label: allowed.get(s.key) ?? s.label ?? s.key,
          reason: typeof s.reason === 'string' ? s.reason.slice(0, 160) : '',
        }))
    : [];

  return json({ suggestions, model: MODEL, userId });
}

async function handleJournalExtract(openaiKey: string, userId: string, body: RequestBody) {
  const freeText = body.freeText?.trim();
  if (!freeText) return json({ error: 'freeText is required' }, 400);
  const catalog = Array.isArray(body.catalog) ? body.catalog.slice(0, 80) : [];
  if (catalog.length === 0) return json({ error: 'catalog is required' }, 400);
  const medications = Array.isArray(body.medications)
    ? body.medications.filter((m): m is string => typeof m === 'string' && m.trim().length > 0)
        .map((m) => m.trim())
        .slice(0, 40)
    : [];

  const catalogJson = JSON.stringify(
    catalog.map((c) => ({
      key: c.key,
      label: c.label,
      searchTerms: (c.searchTerms ?? []).slice(0, 8),
    })),
  );
  if (catalogJson.length > 40_000) {
    return json({ error: 'catalog too large' }, 400);
  }

  const raw = await complete(openaiKey, {
    system: `${COMPANION_BASE}
Return ONLY valid JSON (no markdown):
{"symptoms":[{"key":"...","label":"...","reason":"..."}],"events":[{"type":"missed_dose"|"note","medicationName":"...or null","note":"..."}]}

Extract what she might want to log from free text.
- symptom keys MUST be copied exactly from the catalog. Max 6.
- events: max 3. type is missed_dose or note. medicationName must match a provided med name or be null.
- Never invent catalog keys. If unclear, omit.`,
    messages: [
      {
        role: 'user',
        content: `JOURNAL:\n${freeText.slice(0, 4000)}\n\nCATALOG:\n${catalogJson}\n\nMEDICATIONS:\n${JSON.stringify(medications)}`,
      },
    ],
    temperature: 0.2,
    maxTokens: 500,
  });
  if (raw.error) return json({ error: raw.error }, raw.status ?? 502);

  const allowed = new Map(catalog.map((c) => [c.key, c.label]));
  const allowedMeds = new Set(medications);
  const parsed = parseJsonObject(raw.text);

  const symptoms = Array.isArray(parsed?.symptoms)
    ? parsed.symptoms
        .filter(
          (s): s is { key: string; label?: string; reason?: string } =>
            !!s && typeof s === 'object' && typeof (s as { key?: unknown }).key === 'string',
        )
        .filter((s) => allowed.has(s.key))
        .slice(0, 6)
        .map((s) => ({
          key: s.key,
          label: allowed.get(s.key) ?? s.label ?? s.key,
          reason: typeof s.reason === 'string' ? s.reason.slice(0, 160) : '',
        }))
    : [];

  const events = Array.isArray(parsed?.events)
    ? parsed.events
        .filter((e): e is Record<string, unknown> => !!e && typeof e === 'object')
        .map((e) => {
          const type = e.type === 'missed_dose' || e.type === 'note' ? e.type : null;
          if (!type) return null;
          const rawName =
            typeof e.medicationName === 'string' && e.medicationName.trim()
              ? e.medicationName.trim()
              : null;
          const medicationName = rawName && allowedMeds.has(rawName) ? rawName : null;
          const note =
            typeof e.note === 'string' && e.note.trim()
              ? e.note.trim().slice(0, 240)
              : type === 'missed_dose'
                ? 'Missed dose'
                : '';
          if (!note && type === 'note') return null;
          return { type, medicationName, note };
        })
        .filter((e): e is { type: 'missed_dose' | 'note'; medicationName: string | null; note: string } => e !== null)
        .slice(0, 3)
    : [];

  return json({ symptoms, events, model: MODEL, userId });
}

async function handleDoseWatch(openaiKey: string, userId: string, body: RequestBody) {
  const factsJson = requireFacts(body.facts);
  if (typeof factsJson !== 'string') return factsJson;

  const raw = await complete(openaiKey, {
    system: `${COMPANION_BASE}
Return ONLY valid JSON (no markdown):
{"note":"...","watchFor":["..."]}

Look at recentDoseChanges (latest) in the facts packet.
- note: about 2 sentences, describe-only ("some women notice sleep shifts in the first two weeks").
- watchFor: up to 4 plain observations to log. NEVER thresholds, dose advice, or diagnoses.
If there is no recent dose change, return {"note":"","watchFor":[]}.`,
    messages: [{ role: 'user', content: `FACTS_PACKET:\n${factsJson}` }],
    temperature: 0.35,
    maxTokens: 400,
  });
  if (raw.error) return json({ error: raw.error }, raw.status ?? 502);

  const parsed = parseJsonObject(raw.text);
  const note =
    typeof parsed?.note === 'string' && parsed.note.trim()
      ? parsed.note.trim().slice(0, 500)
      : '';
  if (!note) {
    return json({ note: '', watchFor: [], model: MODEL, userId });
  }
  const watchFor = Array.isArray(parsed?.watchFor)
    ? parsed.watchFor
        .filter((s): s is string => typeof s === 'string' && s.trim().length > 0)
        .map((s) => s.trim().slice(0, 160))
        .slice(0, 4)
    : [];

  return json({ note, watchFor, model: MODEL, userId });
}

async function handleVisitDebrief(openaiKey: string, userId: string, body: RequestBody) {
  const freeText = body.freeText?.trim();
  if (!freeText) return json({ error: 'freeText is required' }, 400);
  const factsJson = requireFacts(body.facts);
  if (typeof factsJson !== 'string') return factsJson;

  const raw = await complete(openaiKey, {
    system: `${COMPANION_BASE}
Return ONLY valid JSON (no markdown):
{"planSummary":"...","followUps":[{"label":"...","timeframe":"...or null"}]}

Restate her appointment plan warmly from her paste + facts packet only.
- planSummary: ≤4 sentences. No additions beyond her text + packet.
- followUps: max 5 concrete checklist actions only (book labs, schedule follow-up, call if X).
  Do NOT repeat soft advice already in planSummary (e.g. "monitor mood" when the summary
  already asks her to track mood). Skip vague "ongoing" / "as needed" monitoring rows.
Never invent follow-ups she did not mention. Never dose advice.`,
    messages: [
      {
        role: 'user',
        content: `WHAT_SHE_PASTED:\n${freeText.slice(0, 4000)}\n\nFACTS_PACKET:\n${factsJson}`,
      },
    ],
    temperature: 0.3,
    maxTokens: 600,
  });
  if (raw.error) return json({ error: raw.error }, raw.status ?? 502);

  const parsed = parseJsonObject(raw.text);
  const planSummary =
    typeof parsed?.planSummary === 'string' && parsed.planSummary.trim()
      ? parsed.planSummary.trim().slice(0, 1200)
      : '';
  if (!planSummary) {
    return json({ error: 'Could not draft visit debrief' }, 502);
  }
  const followUps = Array.isArray(parsed?.followUps)
    ? parsed.followUps
        .filter((f): f is Record<string, unknown> => !!f && typeof f === 'object')
        .map((f) => {
          const label =
            typeof f.label === 'string' && f.label.trim()
              ? f.label.trim().slice(0, 200)
              : '';
          if (!label) return null;
          const timeframe =
            typeof f.timeframe === 'string' && f.timeframe.trim()
              ? f.timeframe.trim().slice(0, 80)
              : null;
          return { label, timeframe };
        })
        .filter((f): f is { label: string; timeframe: string | null } => f !== null)
        .slice(0, 5)
    : [];

  return json({ planSummary, followUps, model: MODEL, userId });
}

async function handleDailyLine(openaiKey: string, userId: string, body: RequestBody) {
  const factsJson = requireFacts(body.facts);
  if (typeof factsJson !== 'string') return factsJson;

  const reply = await complete(openaiKey, {
    system: `${COMPANION_BASE}
Return plain text only — ONE sentence, max 140 characters.
Ground in the packet's most recent real change (pulse, MRS, dose change).
No advice. No numbers she didn't log. Never touch safeguarding / psych / cardiac / bleeding categories.
Example tone: "Sleep has been climbing since the 18th — quietly good news."`,
    messages: [{ role: 'user', content: `FACTS_PACKET:\n${factsJson}\n\nOne warm sentence.` }],
    temperature: 0.45,
    maxTokens: 80,
  });
  if (reply.error) return json({ error: reply.error }, reply.status ?? 502);
  const line = reply.text.replace(/\s+/g, ' ').trim().slice(0, 140);
  return json({ line, model: MODEL, userId });
}

async function handleStageExplain(openaiKey: string, userId: string, body: RequestBody) {
  const factsJson = requireFacts(body.facts);
  if (typeof factsJson !== 'string') return factsJson;

  const reply = await complete(openaiKey, {
    system: `${COMPANION_BASE}
Return plain text only — at most 5 short sentences.
Explain what her STRAW / menopause stage in the facts packet means, in companion voice, and what tracking will show her next.
Never re-stage her. Never contradict the profile stage. No diagnoses or dose advice.`,
    messages: [
      {
        role: 'user',
        content: `FACTS_PACKET:\n${factsJson}\n\nExplain her stage warmly.`,
      },
    ],
    temperature: 0.4,
    maxTokens: 400,
  });
  if (reply.error) return json({ error: reply.error }, reply.status ?? 502);
  const text = reply.text.trim().slice(0, 1200);
  return json({ text, model: MODEL, userId });
}

async function handlePartnerLetter(openaiKey: string, userId: string, body: RequestBody) {
  const factsJson = requireFacts(body.facts);
  if (typeof factsJson !== 'string') return factsJson;
  const freeText = typeof body.freeText === 'string' ? body.freeText.trim().slice(0, 2000) : '';

  const reply = await complete(openaiKey, {
    system: `${COMPANION_BASE}
Write a one-page letter to a partner or family member explaining what she is experiencing.
- Plain warm language. Ground in her real logged symptoms (names, not scores).
- Explicitly say disbelief is common and the data is real.
- No diagnoses. No invented numbers or dates.
- Optional notes from her may be woven in if provided.
Return plain text only.`,
    messages: [
      {
        role: 'user',
        content: `FACTS_PACKET:\n${factsJson}${
          freeText ? `\n\nHER_NOTES_TO_INCLUDE:\n${freeText}` : ''
        }\n\nDraft the partner letter.`,
      },
    ],
    temperature: 0.4,
    maxTokens: 900,
  });
  if (reply.error) return json({ error: reply.error }, reply.status ?? 502);
  const letter = reply.text.trim().slice(0, 6000);
  return json({ letter, model: MODEL, userId });
}

function stripForbiddenEngineInsights(facts: Record<string, unknown>): Record<string, unknown> {
  const engineInsights = facts.engineInsights;
  if (!Array.isArray(engineInsights)) return facts;
  return {
    ...facts,
    engineInsights: engineInsights.filter((insight) => {
      if (!insight || typeof insight !== 'object') return false;
      const category = (insight as { category?: unknown }).category;
      return typeof category !== 'string' || !AI_FORBIDDEN_CATEGORIES.has(category);
    }),
  };
}

function requireFacts(facts: unknown): string | Response {
  if (!facts || typeof facts !== 'object') {
    return json({ error: 'facts packet is required' }, 400);
  }
  const cleaned = stripForbiddenEngineInsights(facts as Record<string, unknown>);
  const factsJson = JSON.stringify(cleaned);
  if (factsJson.length > 24_000) {
    return json({ error: 'facts packet too large' }, 400);
  }
  return factsJson;
}

/** In-memory per-user sliding window (resets on cold start; still stops burst abuse). */
function allowAiRequest(userId: string): boolean {
  const now = Date.now();
  const prior = (aiRateBuckets.get(userId) ?? []).filter(
    (t) => now - t < AI_RATE_LIMIT_WINDOW_MS,
  );
  if (prior.length >= AI_RATE_LIMIT_MAX) {
    aiRateBuckets.set(userId, prior);
    return false;
  }
  prior.push(now);
  aiRateBuckets.set(userId, prior);
  return true;
}

function sanitizeHistory(history: ChatMessage[] | undefined): ChatMessage[] {
  return (history ?? [])
    .filter((m) => m && (m.role === 'user' || m.role === 'assistant') && typeof m.content === 'string')
    .slice(-8);
}

function parseJsonObject(text: string): Record<string, unknown> | null {
  const trimmed = text.trim();
  const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/);
  const candidate = fenced?.[1]?.trim() ?? trimmed;
  try {
    const parsed = JSON.parse(candidate);
    return parsed && typeof parsed === 'object' ? (parsed as Record<string, unknown>) : null;
  } catch {
    const start = candidate.indexOf('{');
    const end = candidate.lastIndexOf('}');
    if (start >= 0 && end > start) {
      try {
        const parsed = JSON.parse(candidate.slice(start, end + 1));
        return parsed && typeof parsed === 'object' ? (parsed as Record<string, unknown>) : null;
      } catch {
        return null;
      }
    }
    return null;
  }
}

async function complete(
  openaiKey: string,
  opts: {
    system: string;
    messages: Array<{ role: 'user' | 'assistant'; content: string }>;
    temperature?: number;
    maxTokens?: number;
  },
): Promise<{ text: string; error?: string; status?: number }> {
  const openaiRes = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${openaiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: MODEL,
      temperature: opts.temperature ?? 0.4,
      max_tokens: opts.maxTokens ?? MAX_OUTPUT_TOKENS,
      messages: [{ role: 'system', content: opts.system }, ...opts.messages],
    }),
  });

  if (!openaiRes.ok) {
    const errText = await openaiRes.text();
    console.error('OpenAI error', openaiRes.status, errText);
    return { text: '', error: 'Model request failed', status: 502 };
  }

  const completion = await openaiRes.json();
  const text =
    completion?.choices?.[0]?.message?.content?.trim() ??
    'I could not generate a reply. Try again in a moment.';
  return { text };
}

function corsHeaders(): HeadersInit {
  return {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  };
}

function json(payload: unknown, status = 200): Response {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { ...corsHeaders(), 'Content-Type': 'application/json' },
  });
}
