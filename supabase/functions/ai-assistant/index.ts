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
  parseRiskTierWord,
  shouldForceDemandFromHistory,
  type CrisisTier,
  type FactsLite,
} from './companionScripts.ts';

const MODEL = 'gpt-4o-mini';
const MAX_OUTPUT_TOKENS = 800;

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
  | 'explain_insight';

type RequestBody = {
  action?: AiAction;
  message?: string;
  facts?: unknown;
  history?: ChatMessage[];
  insight?: { id?: string; title?: string; body?: string; category?: string };
  freeText?: string;
  catalog?: Array<{ key: string; label: string; searchTerms?: string[] }>;
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
    const tier = await classifyRiskTier(openaiKey, message, history);
    if (tier) {
      finalScript = buildTierScriptReply(tier, message, facts, history);
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
): Promise<CrisisTier | null> {
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
  if (res.error) return null; // fail-open to normal companion chat
  return parseRiskTierWord(res.text);
}

async function handleExplain(openaiKey: string, userId: string, body: RequestBody) {
  const factsJson = requireFacts(body.facts);
  if (typeof factsJson !== 'string') return factsJson;
  if (!body.insight || typeof body.insight !== 'object') {
    return json({ error: 'insight is required' }, 400);
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
            typeof (p as { body?: unknown }).body === 'string',
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

function requireFacts(facts: unknown): string | Response {
  if (!facts || typeof facts !== 'object') {
    return json({ error: 'facts packet is required' }, 400);
  }
  const factsJson = JSON.stringify(facts);
  if (factsJson.length > 24_000) {
    return json({ error: 'facts packet too large' }, 400);
  }
  return factsJson;
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
