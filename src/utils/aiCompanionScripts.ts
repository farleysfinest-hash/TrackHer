/**
 * Structured companion replies for high-risk / high-dodge chat shapes.
 * Keep in sync with supabase/functions/ai-assistant/companionScripts.ts
 *
 * Mental-health threat levels (do not collapse into one stale 988 blob):
 * - mental_decline: low mood / “can’t fix this” / HRT making her feel depressed — answer the
 *   feeling + her logs; soft safety net; NOT identical to active SI.
 * - crisis (ideation): suicidal language without plan/time — warm, clear, resources once.
 * - crisis_imminent: tonight / method / “going to do it” — shorter, urgent, acknowledge
 *   specificity without graphic coaching.
 * - Follow-ups after a crisis reply: never paste the same paragraph again.
 */

export type ScriptShape =
  | 'mental_decline'
  | 'crisis'
  | 'crisis_imminent'
  | 'emergency'
  | 'diy_dose'
  | 'lab_target'
  | 'lab_interpret'
  | 'dose_amount'
  | 'should_raise'
  | 'med_effect'
  | 'staging'
  | 'comparison'
  | 'thin_or_broken'
  | 'life_support'
  | 'loved_one_crisis';

export type CrisisTier = 'mental_decline' | 'crisis' | 'crisis_imminent' | 'loved_one';

export type FactsLite = {
  profile?: {
    displayName?: string | null;
    strawStage?: string | null;
    menopauseStage?: string | null;
  };
  medications?: Array<{
    name: string;
    category: string | null;
    dose: string | null;
  }>;
  labs?: Array<{
    drawDate: string;
    estradiol: number | null;
    progesterone?: number | null;
    testosterone?: number | null;
    fsh?: number | null;
  }>;
  mrs?: Array<{ date: string; total: number }>;
  pulseRecent?: {
    daysSampled: number;
    avgEnergy: number | null;
    avgMood: number | null;
    avgSleep: number | null;
  };
  engineInsights?: Array<{ title: string; body: string; category: string }>;
  recentDoseChanges?: Array<{
    date: string;
    medicationName: string | null;
    changeType: string;
    notes: string | null;
  }>;
};

export type ScriptBuildOpts = {
  demand?: boolean;
  /** Prior turns — used so crisis follow-ups are not identical copy-paste. */
  history?: Array<{ role: string; content: string }>;
};

function normalize(text: string): string {
  return text
    .toLowerCase()
    .replace(/[\u2018\u2019\u201a\u201b\u2032\u2035`']/g, "'")
    .replace(/\s+/g, ' ')
    .trim();
}

const CLEARLY_NEGATED_CLINICIAN_RISK_RE =
  /^(?:my )?(?:doctor|therapist|clinician|provider|nurse|counselor) asked (?:me )?(?:if|whether) i (?:want(?:ed)? to (?:kill|hurt) myself|was thinking about (?:suicide|self[- ]?harm)|felt suicidal)[,.!?;:\s]+(?:and )?i (?:said|answered) no[.!?]*$/;

export function isClearlyNegatedClinicianRiskReport(text: string): boolean {
  return CLEARLY_NEGATED_CLINICIAN_RISK_RE.test(normalize(text));
}

/** Remove only a complete, explicitly negated clinician screening report. */
function normalizeForRiskClassification(text: string): string {
  const normalized = normalize(text);
  return isClearlyNegatedClinicianRiskReport(text) ? '' : normalized;
}

export function isDemandPush(message: string): boolean {
  const m = normalize(message);
  return (
    /\bjust tell me\b/.test(m) ||
    /\bgive me (a |the )?number\b/.test(m) ||
    /\bstop (saying|telling)\b/.test(m) ||
    /\b(you )?(said|keep saying) the same\b/.test(m) ||
    /\bdon'?t (say|tell me to )?(see |ask )?(a )?(doctor|clinician|provider)\b/.test(m) ||
    /\bi don'?t care\b/.test(m) ||
    /\btell me anyway\b/.test(m) ||
    /\bjust answer\b/.test(m) ||
    /\bbe specific\b/.test(m) ||
    /\bhow many (mg|mcg|milligrams?|pumps?|clicks?)\b/.test(m) ||
    /\bi need (a |the )?number\b/.test(m) ||
    /\bquit dodging\b/.test(m)
  );
}

export function priorCrisisReplyCount(
  history: Array<{ role: string; content: string }> | undefined,
): number {
  if (!history?.length) return 0;
  return history.filter(
    (m) =>
      m.role === 'assistant' &&
      (/988|findahelpline|crisis lifeline|can'?t be your crisis|local emergency/i.test(
        m.content,
      ) ||
        /please (call|get) (help|someone)|this is urgent/i.test(m.content)),
  ).length;
}

export function classifyCrisisTier(message: string): CrisisTier | null {
  const m = normalizeForRiskClassification(message);

  // Imminent = timeframe, method, or “going to do it” — NOT bare “going to kill myself”
  // (that’s ideation; escalating with tonight/gun/plan bumps the tier).
  const hasTimeframe =
    /\b(tonight|today|right now|this (morning|afternoon|evening)|in an hour)\b/.test(m);
  const hasMethod =
    /\b(gun|rifle|pistol|firearm|hang|hanging|overdose|pills to (end|kill)|jump off|slit|bleed out|knife)\b/.test(
      m,
    );
  const aboutToAct =
    /\b(going to|gonna|about to) do it\b/.test(m) ||
    /\b(have a plan|wrote a note|said goodbye)\b/.test(m);
  // Asking what amount of her meds would harm her = method-seeking, not a dose question.
  const overdoseSeek =
    /\b(how (many|much)|max(imum)?|enough)\b/.test(m) &&
    /\b(pills?|tablets?|dose|mg|mcg|patches?)\b/.test(m) &&
    /\b(to (die|not wake up|never wake up|end it|end my life|kill)|would it take|enough to|overdose|(that|which) would (hurt|harm|kill) me)\b/.test(
      m,
    );
  const imminent = hasTimeframe || hasMethod || aboutToAct || overdoseSeek;

  const ideation =
    /\b(kil+ my ?self|end my life|want to die|suicid|hurt myself|self[- ]?harm|unalive)\b/.test(
      m,
    ) ||
    /\b(don'?t|dont) want to (be )?(alive|wake up)\b/.test(m) ||
    /\b(better off|be better) without me\b/.test(m) ||
    /\bno reason to (live|keep going)\b/.test(m) ||
    /\bthink(ing)? about (ending it( all)?|kil+ing my ?self|suicide|not being here)\b/.test(m) ||
    /\b(want(ed)? to|gonna|going to) end it( all)?\b/.test(m) ||
    /\bi('m| am) going to (kill|end)\b/.test(m);

  if (imminent && (ideation || overdoseSeek || /\b(do it|kill|end|die|gun)\b/.test(m))) {
    return 'crisis_imminent';
  }

  // Past-tense SI she says has eased ("last month i wanted to end it all but im doing
  // better now") — honor the recovery, don't blast the full crisis script at it.
  const recovery =
    /\b(doing better|better now|feeling better|i'?m (ok|okay) now|not any ?more|no longer)\b/.test(
      m,
    ) && /\b(want(ed)? to|used to|last (week|month|year)|back then)\b/.test(m);
  if (ideation && recovery) return 'mental_decline';

  if (ideation) return 'crisis';

  // Mental decline without active SI — still serious, different script
  if (
    /\b(depress|hopeless|can'?t (fix|go on|do this)|overwhelm|broken inside|numb|empty)\b/.test(
      m,
    ) ||
    (/\b(making me feel|feel(ing)?|got)\b/.test(m) &&
      /\b(depress|so low|awful|miserable|worse mentally)\b/.test(m)) ||
    /\bmental (decline|health).{0,20}(worse|bad|crash)\b/.test(m)
  ) {
    return 'mental_decline';
  }

  return null;
}

/** Loose risk-adjacent check for fail-open decisions when the tier classifier is down. */
export function looksRiskAdjacent(message: string): boolean {
  if (classifyCrisisTier(message)) return true;
  const m = normalizeForRiskClassification(message);
  const benignAbsenceContext =
    /\b(travel|travelling|traveling|appointment|flight|vacation|out of town|work trip|school trip)\b/.test(
      m,
    );
  const passiveRisk =
    /\b(no point in being alive|go to sleep and (?:not|never) (?:wake up|come back)|(?:don'?t|do not) plan on making it through (?:the )?night|(?:don'?t|do not) think i(?:'ll| will| am going to) be (?:alive|around|here) tomorrow)\b/.test(
      m,
    );
  return (
    /\b(suicid|kill(ing)? (my|myself)|end (my life|it all)|hurt myself|self[- ]?harm|unalive|want to die|hopeless|worthless|not wake up|overdose|hang myself|cut myself|gun|rifle|988)\b/.test(
      m,
    ) ||
    (passiveRisk && !benignAbsenceContext)
  );
}

/**
 * Deterministic predicate: is this text safe to store as Luna memory?
 * Rejects content classified as active self-harm/suicide risk, imminent crisis,
 * risk-adjacent self-harm wording, loved-one crisis, or method-seeking/overdose content.
 * Crisis-related content must never enter ordinary Luna memory or proactive Insights.
 */
export function isMemorySafeContent(text: string): boolean {
  if (!text || !text.trim()) return false;
  if (isClearlyNegatedClinicianRiskReport(text)) return false;
  if (classifyCrisisTier(text)) return false;
  if (classifyCompanionShape(text) === 'loved_one_crisis') return false;
  if (looksRiskAdjacent(text)) return false;
  return true;
}

/** @deprecated use classifyCompanionShape */
export function classifyDoseShape(message: string): ScriptShape | null {
  const shape = classifyCompanionShape(message);
  if (shape === 'lab_target' || shape === 'dose_amount' || shape === 'should_raise') return shape;
  return null;
}

export function classifyCompanionShape(message: string): ScriptShape | null {
  const m = normalize(message);
  const estrogen = /\b(estrogen|oestrogen|estradiol|e2|oestradiol)\b/.test(m);
  const hormoneish =
    estrogen ||
    /\b(dose|hrt|patch|cream|gel|progesterone|prometrium|testosterone)\b/.test(m);

  // Someone SHE loves is at risk — check before her own crisis tiers so
  // "my daughter wants to die" never gets a script addressed to the wrong person.
  if (
    /\b(my|our) (daughter|son|kid|child|teen(ager)?|friend|sister|brother|mom|mother|dad|father|husband|wife|partner|niece|nephew)\b[\s\S]{0,60}\b(kil+ (her|him|them)self|suicid|want(s|ed)? to die|end (her|his|their) life|hurt(s|ing)? (her|him|them)self)\b/.test(
      m,
    )
  ) {
    return 'loved_one_crisis';
  }

  const crisisTier = classifyCrisisTier(message);
  if (crisisTier === 'crisis_imminent') return 'crisis_imminent';
  if (crisisTier === 'crisis') return 'crisis';
  // mental_decline checked after emergency so chest-pain etc. still wins

  if (
    /\b(blood clot|dvt|pulmonary embolism|pe\b|stroke)\b/.test(m) ||
    /\b(chest pain|crushing chest|can'?t breathe|short(ness)? of breath|one[- ]sided (weakness|numbness)|face droop|slurred speech)\b/.test(
      m,
    ) ||
    /\b(heart attack|cardiac)\b/.test(m) ||
    (/\b(heavy|soaking|flooding)\b/.test(m) &&
      /\b(bleed|bleeding|period|pad|tampon)\b/.test(m) &&
      /\b(post[- ]?meno|after menopause|haven'?t (had )?a period|years without)\b/.test(m)) ||
    /\bis this (an )?emergency\b/.test(m) ||
    /\bshould i (go to )?(the )?(er|ed|hospital|urgent care)\b/.test(m)
  ) {
    return 'emergency';
  }

  if (crisisTier === 'mental_decline') return 'mental_decline';

  if (
    (/\b(double|triple)\b/.test(m) && hormoneish) ||
    (/\b(skip|miss(ed)?|forgot)\b/.test(m) &&
      /\b(dose|patch|pill|cream|day|days)\b/.test(m) &&
      hormoneish) ||
    (/\b(stop|quit|go off|cold turkey|wean)\b/.test(m) &&
      /\b(hrt|estrogen|oestrogen|progesterone|patch|hormones?)\b/.test(m)) ||
    (/\b(switch|change) (me )?to\b/.test(m) &&
      /\b(pellet|injection|inject|biest|bi-est|patch|cream|gel|oral)\b/.test(m)) ||
    /\b(use|take) (my )?leftover\b/.test(m) ||
    /\bcan i (just )?(double|skip|stop|quit)\b/.test(m)
  ) {
    return 'diy_dose';
  }

  // Why did med X do Y to me
  if (
    /\bwhy (did|does|is|would)\b/.test(m) &&
    hormoneish &&
    /\b(energy|mood|sleep|depress|anxious|tired|exhaust|worse|lower|drop)\b/.test(m)
  ) {
    return 'med_effect';
  }
  if (
    /\b(progesterone|prometrium|estrogen|estradiol)\b/.test(m) &&
    /\b(supposed to help|was supposed|should( '?ve| have) helped)\b/.test(m)
  ) {
    return 'med_effect';
  }

  if (
    (/\b(get|aim|target|should).{0,40}\b(to|at|for)\b/.test(m) && estrogen) ||
    (/\bwhat (level|number|range)\b/.test(m) && estrogen) ||
    (/\bwhat should (my )?(e2|estradiol|estrogen|oestrogen)\b/.test(m) &&
      /\b(be|sit|run|look)\b/.test(m)) ||
    /\btarget (e2|estradiol|estrogen|oestrogen|level)\b/.test(m) ||
    (/\bhow high\b/.test(m) && estrogen)
  ) {
    return 'lab_target';
  }

  if (
    ((/\b(is|does) (my |this )?(e2|estradiol|estrogen|fsh|progesterone|testosterone|lab|level|number)\b/.test(
      m,
    ) &&
      /\b(high|low|normal|ok|okay|bad|dangerous|fine|too (high|low))\b/.test(m)) ||
      (/\b(what does|mean|convert|unit|pmol|pg\/ml|ng\/dl)\b/.test(m) &&
        /\b(e2|estradiol|estrogen|lab|testosterone|fsh)\b/.test(m)) ||
      /\b(do i need|should i (be on|take|start)) (testosterone|t\b|androgen)\b/.test(m) ||
      (/\bwhy is (my )?fsh\b/.test(m) && /\b(high|still)\b/.test(m)))
  ) {
    return 'lab_interpret';
  }

  if (
    (/\bhow much\b/.test(m) &&
      (/\b(raise|increase|up|bump|adjust)\b/.test(m) || estrogen)) ||
    (/\b(raise|increase)\b/.test(m) && /\bby how\b/.test(m)) ||
    (/\bwhat( 's| is)?( an?| the)? (dose|increase|increment)\b/.test(m) && hormoneish) ||
    (/\bhow many\b/.test(m) && /\b(mg|mcg|pumps?|clicks?|patches?)\b/.test(m))
  ) {
    return 'dose_amount';
  }

  if (
    /\bshould i\b/.test(m) &&
    /\b(raise|increase|up|bump|lower|decrease|reduce)\b/.test(m) &&
    hormoneish
  ) {
    return 'should_raise';
  }

  if (
    /\b(peri|perimenopause|menopause|post[- ]?meno|postmenopause)\b/.test(m) &&
    (/\b(am i|which|what stage|straw|in menopause|still peri)\b/.test(m) ||
      /\b(peri or meno|meno or peri)\b/.test(m))
  ) {
    return 'staging';
  }

  if (
    (/\b(my friend|everyone|other women|women my age|normal for)\b/.test(m) &&
      (/\b(more|less|higher|lower|dose|on|taking|get|getting)\b/.test(m) ||
        /\bwhat'?s normal\b/.test(m))) ||
    /\bwhat'?s normal (for|at) (my age|women)\b/.test(m)
  ) {
    return 'comparison';
  }

  if (
    /\b(just guess|guess anyway|make something up)\b/.test(m) ||
    /\b(why (don'?t|do not) i have insights|no insights|insights (yet|broken))\b/.test(m) ||
    /\b(is the app broken|app (is )?broken|not working|bug)\b/.test(m) ||
    (/\b(not enough|too little|thin) (data|history|check-?ins)\b/.test(m) &&
      /\b(guess|tell me|anyway)\b/.test(m))
  ) {
    return 'thin_or_broken';
  }

  if (
    /\b(partner|husband|wife|boyfriend|girlfriend|spouse)\b/.test(m) &&
    /\b((doesn'?t|doesnt|won'?t|wont) believe|thinks i'?m|crazy|making it up|dismiss)\b/.test(m)
  ) {
    return 'life_support';
  }
  if (
    /\b((can'?t|cannot) afford|too expensive|no insurance|cost too much)\b/.test(m) &&
    /\b(med|medication|hrt|appointment|doctor|clinician|visit|lab)\b/.test(m)
  ) {
    return 'life_support';
  }

  return null;
}

function estrogenMeds(facts: FactsLite): string[] {
  const meds = facts.medications ?? [];
  const hits = meds.filter((m) => {
    const blob = `${m.name} ${m.category ?? ''}`.toLowerCase();
    return /estrogen|oestrogen|estradiol|e2/.test(blob);
  });
  const list = (hits.length > 0 ? hits : meds).slice(0, 3);
  return list.map((m) => {
    const dose = m.dose?.trim();
    return dose ? `${m.name} (${dose})` : m.name;
  });
}

function progesteroneMeds(facts: FactsLite): string[] {
  return (facts.medications ?? [])
    .filter((m) => /progesterone|prometrium|progest/i.test(`${m.name} ${m.category ?? ''}`))
    .slice(0, 2)
    .map((m) => {
      const dose = m.dose?.trim();
      return dose ? `${m.name} (${dose})` : m.name;
    });
}

function latestLab(
  facts: FactsLite,
  key: 'estradiol' | 'progesterone' | 'testosterone' | 'fsh',
): { value: number; date: string } | null {
  const labs = [...(facts.labs ?? [])]
    .filter((l) => l[key] != null)
    .sort((a, b) => a.drawDate.localeCompare(b.drawDate));
  const last = labs[labs.length - 1];
  const value = last?.[key];
  if (!last || value == null) return null;
  return { value, date: last.drawDate };
}

function mrsTrendLine(facts: FactsLite): string | null {
  const mrs = facts.mrs ?? [];
  if (mrs.length < 2) {
    if (mrs.length === 1) return `Your latest weekly score was ${mrs[0].total} on ${mrs[0].date}.`;
    return null;
  }
  const first = mrs[0];
  const last = mrs[mrs.length - 1];
  if (last.total < first.total) {
    return `Your weekly symptom total moved from ${first.total} (${first.date}) toward ${last.total} (${last.date}) — trending better in the logs.`;
  }
  if (last.total > first.total) {
    return `Your weekly symptom total moved from ${first.total} (${first.date}) toward ${last.total} (${last.date}) — trending higher in the logs.`;
  }
  return `Your recent weekly totals have been around ${last.total}.`;
}

function moodEnergyLine(facts: FactsLite): string | null {
  const p = facts.pulseRecent;
  if (!p || p.daysSampled < 1) return null;
  const bits: string[] = [];
  if (p.avgMood != null) bits.push(`mood ~${p.avgMood}`);
  if (p.avgEnergy != null) bits.push(`energy ~${p.avgEnergy}`);
  if (p.avgSleep != null) bits.push(`sleep ~${p.avgSleep}`);
  if (bits.length === 0) return null;
  return `In your recent daily pulse (${p.daysSampled} days), I’m seeing ${bits.join(', ')} (your scale).`;
}

function doseChangeHint(facts: FactsLite, drug: RegExp): string | null {
  const hit = [...(facts.recentDoseChanges ?? [])]
    .reverse()
    .find((c) => drug.test(`${c.medicationName ?? ''} ${c.changeType}`));
  if (!hit) return null;
  const name = hit.medicationName ?? 'that medication';
  return `Your logs show a ${hit.changeType.replace(/_/g, ' ')} for ${name} around ${hit.date}.`;
}

function insightHint(facts: FactsLite): string | null {
  const hit = (facts.engineInsights ?? []).find((i) =>
    /estrogen|oestrogen|estradiol|progesterone|energy|mood|wellbeing|low e|undertreat/i.test(
      `${i.title} ${i.body}`,
    ),
  );
  if (!hit) return null;
  return hit.title;
}

function stageLine(facts: FactsLite): string {
  const straw = facts.profile?.strawStage;
  const meno = facts.profile?.menopauseStage;
  if (straw || meno) {
    const parts = [
      straw ? `STRAW stage on your profile: ${straw}` : null,
      meno ? `menopause stage: ${meno}` : null,
    ].filter(Boolean);
    return `TrackHer already has ${parts.join('; ')}. I won’t re-stage you in chat — that label came from your onboarding answers.`;
  }
  return `I don’t see a completed stage on your profile yet. Finishing staging in the app is the reliable path — I won’t guess peri vs menopause from a chat message.`;
}

function join(...parts: Array<string | null | undefined>): string {
  return parts.filter(Boolean).join('\n\n');
}

function buildCrisisReply(
  shape: 'crisis' | 'crisis_imminent',
  message: string,
  history: Array<{ role: string; content: string }> | undefined,
): string {
  const prior = priorCrisisReplyCount(history);
  const m = normalize(message);
  const namedMethod = /\b(gun|rifle|pistol|firearm)\b/.test(m)
    ? 'a firearm'
    : /\b(pills?|tablets?|overdose)\b/.test(m)
      ? 'an overdose'
      : /\b(tonight|today|right now)\b/.test(m)
        ? 'a timeframe tonight/today'
        : null;

  // Alternate the closing line by reply count so even repeated identical messages
  // never get two identical consecutive replies.
  const altClose =
    prior % 2 === 0
      ? `If you can, hand your phone to someone nearby and let them help you make the call.`
      : `If calling feels impossible, texting 988 still counts — one word is enough to start.`;

  if (shape === 'crisis_imminent') {
    if (prior >= 2) {
      return join(
        `You’ve told me more than once now, and I believe you mean it. I’m not brushing that off.`,
        namedMethod
          ? `You named ${namedMethod} — please treat this as the emergency it is.`
          : `Please treat this as the emergency it is.`,
        `Right now: call your local emergency number if you’re about to act, or call/text 988 and stay on the line with them.`,
        altClose,
      );
    }
    if (prior >= 1) {
      return join(
        `I hear you — and I’m not going to paste the same paragraph again.`,
        namedMethod
          ? `You named ${namedMethod}. That means this is urgent right now, not something to sit with alone in an app.`
          : `You’ve said you’re going to act. Please get help in the real world immediately.`,
        `Call or text 988 now (US), or local emergency services if you’re in danger. If someone is nearby, ask them to stay with you.`,
        `I care that you’re still here typing. Please reach a human who can help keep you safe tonight.`,
      );
    }
    return join(
      `I’m taking what you said seriously.`,
      namedMethod
        ? `Naming ${namedMethod} means you need real-time help — not a chat bot walking this with you.`
        : `If you’re planning to act soon, please get help right now.`,
      `Call or text 988 (US Suicide & Crisis Lifeline) or your local emergency number. findahelpline.com lists lines by country.`,
      `If you can, tell someone near you what’s going on and ask them not to leave you alone. You matter — please get to safety first.`,
    );
  }

  // ideation (not imminent)
  if (prior >= 2) {
    return join(
      `I’m still here with you, and I’m not going to keep repeating the same script like a broken machine.`,
      `The next step has to be a person: 988 (call/text) or someone who can sit with you. I can’t keep you safe from inside this chat.`,
      altClose,
    );
  }
  if (prior === 1) {
    return join(
      `I hear that the last reply wasn’t enough — thank you for saying that.`,
      `I still can’t counsel you through suicide in this app. What I can do is stay clear: please call or text 988, or use findahelpline.com if you’re outside the US.`,
      `You don’t have to explain it perfectly. Just getting connected to a trained human is the win right now.`,
    );
  }
  return join(
    `I’m really glad you told me. That took courage.`,
    `I care about you, and I also can’t be the person who talks you through wanting to die — that needs a trained human, not this companion.`,
    `Please call or text 988 now (US), or find a local line at findahelpline.com. If you might act soon, contact emergency services.`,
    `You’re not a burden for needing this. Reach out — then we can look at your TrackHer patterns with your clinician when you’re safer.`,
  );
}

function buildMentalDeclineReply(message: string, facts: FactsLite): string {
  const progChange = doseChangeHint(facts, /progesterone|prometrium/i);
  const progMeds = progesteroneMeds(facts);
  const pulse = moodEnergyLine(facts);
  const trend = mrsTrendLine(facts);
  // Mirror HER words — never quote a phrase she didn’t type.
  const mDecline = normalize(message);
  const opener = /\b(doing better|better now|feeling better)\b/.test(mDecline)
    ? `It means a lot that you told me where you’ve been — and I’m glad things feel a little lighter than they did.`
    : /can'?t fix/.test(mDecline)
    ? `I’m sorry you’re in this much pain — “I can’t fix this” is a heavy place to sit.`
    : /hopeless/.test(mDecline)
      ? `Hopeless is a heavy word to be carrying — I’m glad you told me instead of holding it alone.`
      : /depress/.test(mDecline)
        ? `Feeling this depressed is not a footnote — I’m taking it seriously, not just your charts.`
        : `I’m sorry it’s this heavy right now — I hear you.`;
  return join(
    opener,
    pulse || trend || null,
    progChange ||
      (progMeds.length > 0
        ? `I see progesterone on your list (${progMeds.join('; ')}). Some women feel flatter, sleepier, or lower mood when progesterone goes up — that doesn’t prove it’s the only cause, but it’s a real pattern to take to your clinician.`
        : null),
    `This isn’t the same as me diagnosing depression — it’s me taking your words and your logs seriously.`,
    `If thoughts of wanting to die show up, call or text 988 (or findahelpline.com). For the low mood itself: please tell your clinician soon — bring your pulse/mood trend and any dose-change dates.`,
    `You don’t have to solve it alone tonight.`,
  );
}

/**
 * Build the deterministic scripted reply for a risk tier decided elsewhere —
 * e.g. the Edge LLM backstop when regex classification found nothing.
 * The model only picks the door; these scripts still write every word.
 */
export function buildTierScriptReply(
  tier: CrisisTier,
  message: string,
  facts: FactsLite,
  history?: Array<{ role: string; content: string }>,
): { reply: string; shape: ScriptShape } {
  if (tier === 'mental_decline') {
    return { shape: 'mental_decline', reply: buildMentalDeclineReply(message, facts) };
  }
  if (tier === 'loved_one') {
    // Use the same loved-one script that buildCompanionScriptReply produces.
    const lovedOneReply = buildCompanionScriptReply(message, facts, { history });
    if (lovedOneReply?.shape === 'loved_one_crisis') return lovedOneReply;
    // Fallback if the regex didn't match the loved-one pattern (classifier-only path).
    return {
      shape: 'loved_one_crisis',
      reply: join(
        `That's a frightening thing to hear from someone you love — and you did the right thing by taking it seriously.`,
        `Ask them directly if they're thinking of acting on it, stay close, and if you safely can, remove anything they could use to hurt themselves.`,
        `988 (call or text) supports worried family and friends too — they'll coach you through what to say. If they're in immediate danger, call your local emergency number.`,
        `You don't have to handle this perfectly. Staying with them and getting trained help involved is the win.`,
      ),
    };
  }
  return { shape: tier, reply: buildCrisisReply(tier, message, history) };
}

/**
 * Parse the one-word risk-tier model output.
 * Returns a known label, or null when the model answer is unusable (caller should fail closed).
 */
export type RiskTierLabel = CrisisTier | 'none';

export function parseRiskTierLabel(text: string | null | undefined): RiskTierLabel | null {
  const w = (text ?? '').trim().toLowerCase();
  if (/^(?:imminent|crisis[_ -]?imminent)\b/.test(w)) return 'crisis_imminent';
  if (/^(?:ideation|crisis)\b/.test(w)) return 'crisis';
  if (/^(?:decline|mental[_ -]?decline)\b/.test(w)) return 'mental_decline';
  if (/^loved[_ -]?one(?:[_ -]?crisis)?\b/.test(w)) return 'loved_one';
  if (/^none\b/.test(w)) return 'none';
  return null;
}

/** Maps a clear risk word to a crisis tier; `none` / unclear → null. Prefer parseRiskTierLabel for fail-closed paths. */
export function parseRiskTierWord(text: string | null | undefined): CrisisTier | null {
  const label = parseRiskTierLabel(text);
  if (!label || label === 'none') return null;
  return label;
}

export function buildCompanionScriptReply(
  message: string,
  facts: FactsLite,
  opts?: ScriptBuildOpts,
): { reply: string; shape: ScriptShape } | null {
  const shape = classifyCompanionShape(message);
  if (!shape) {
    // "stop giving me hotlines just talk to me" after a crisis reply has no crisis
    // keywords — but dropping out of crisis mode into a data dump here is the worst
    // possible move. Stay in the conversation she's actually having.
    const priorCrisis = priorCrisisReplyCount(opts?.history);
    if (
      priorCrisis > 0 &&
      /\b(stop (giving|sending|telling)|no (more )?hotlines?|not (another|a) hotline|just talk to me|talk to me\b|be real with me|you'?re not listening|that doesn'?t help)\b/.test(
        normalize(message),
      )
    ) {
      return { shape: 'crisis', reply: buildCrisisReply('crisis', message, opts?.history) };
    }
    return null;
  }

  const demand = opts?.demand ?? isDemandPush(message);
  const history = opts?.history;
  const meds = estrogenMeds(facts);
  const e2 = latestLab(facts, 'estradiol');
  const t = latestLab(facts, 'testosterone');
  const fsh = latestLab(facts, 'fsh');
  const trend = mrsTrendLine(facts);
  const pulse = moodEnergyLine(facts);
  const insight = insightHint(facts);
  const medLine =
    meds.length > 0
      ? `From your logs, you’re on ${meds.join('; ')}.`
      : `I don’t see a clear estrogen medication in your active logs yet.`;
  const e2Line = e2
    ? `Your last logged estradiol was ${e2.value} on ${e2.date}.`
    : `I don’t see a recent estradiol lab in your TrackHer logs.`;
  const patternBits = [trend, insight ? `Your insights also flagged: “${insight}.”` : null]
    .filter(Boolean)
    .join(' ');
  const mrsCount = facts.mrs?.length ?? 0;

  if (shape === 'crisis' || shape === 'crisis_imminent') {
    return { shape, reply: buildCrisisReply(shape, message, history) };
  }

  if (shape === 'mental_decline') {
    return { shape, reply: buildMentalDeclineReply(message, facts) };
  }

  if (shape === 'loved_one_crisis') {
    return {
      shape,
      reply: join(
        `That’s a frightening thing to hear from someone you love — and you did the right thing by taking it seriously.`,
        `Ask them directly if they’re thinking of acting on it, stay close, and if you safely can, remove anything they could use to hurt themselves.`,
        `988 (call or text) supports worried family and friends too — they’ll coach you through what to say. If they’re in immediate danger, call your local emergency number.`,
        `You don’t have to handle this perfectly. Staying with them and getting trained help involved is the win.`,
      ),
    };
  }

  if (shape === 'med_effect') {
    const progChange = doseChangeHint(facts, /progesterone|prometrium/i);
    const estChange = doseChangeHint(facts, /estrogen|estradiol|oestrogen/i);
    return {
      shape,
      reply: join(
        `You’re asking why a change that was supposed to help might be making you feel worse — that’s a fair question.`,
        progChange || estChange || medLine,
        pulse ||
          `I don’t have a strong daily pulse sample in the packet, so I can’t invent an energy number — only describe what you logged.`,
        patternBits || null,
        `Progesterone (including Prometrium) can feel sedating or flattening for some women; estrogen changes can move energy and mood the other way. Correlation in your chart isn’t proof of cause.`,
        `I won’t tell you to stop or change the dose yourself. Ask: “After my ${progChange ? 'progesterone' : 'recent'} change, energy/mood dipped — is that expected on this regimen, and what would you adjust if it continues?”`,
      ),
    };
  }

  if (shape === 'emergency') {
    return {
      shape,
      reply: join(
        `I can’t diagnose what you’re feeling — and I don’t want you to wait on a chat reply if this could be urgent.`,
        `Chest pain, trouble breathing, stroke-like symptoms, or sudden severe symptoms: seek emergency care now.`,
        `Possible clot warning signs also deserve urgent medical care, not a DIY wait-and-see.`,
        `Post-menopausal heavy bleeding should be checked promptly with a clinician.`,
        `If you’re unsure but scared, urgent care or ER is okay. I’d rather you be evaluated than wait it out alone.`,
      ),
    };
  }

  if (shape === 'diy_dose') {
    return {
      shape,
      reply: join(
        demand
          ? `I still won’t green-light doubling, skipping, stopping, or switching HRT on your own.`
          : `I can’t advise you to double, skip, stop, or switch your HRT on your own.`,
        medLine,
        `Those changes need a clinician who knows your history and method.`,
        `Helpful ask: “Here’s what I’ve been doing on ${meds[0] ?? 'my current HRT'} — what change is safe, and what should we watch?”`,
      ),
    };
  }

  if (shape === 'lab_target') {
    if (demand) {
      return {
        shape,
        reply: join(
          `I still can’t set *your* personal estradiol target — that has to come from your clinician.`,
          e2Line,
          `General education (not your prescription): many menopause HRT clinicians talk about ~40–100+ pg/mL, but method and lab matter.`,
          e2
            ? `Visit ask: “Given my symptoms and estradiol ${e2.value} on ${e2.date}, what range are we aiming for?”`
            : `Visit ask: “What estradiol range are we aiming for with my method?”`,
        ),
      };
    }
    return {
      shape,
      reply: join(
        e2Line,
        `I can’t assign the level *you* should personally aim for — only your clinician can set that.`,
        `As general education: many menopause HRT clinicians discuss estradiol around ~40–100+ pg/mL. Assay and delivery method change what “good” looks like.`,
        medLine,
        patternBits || null,
        e2
          ? `Bring: “Given my symptoms and estradiol ${e2.value} on ${e2.date}, what range are we aiming for?”`
          : `Bring: “What estradiol range are we aiming for with my method?”`,
      ),
    };
  }

  if (shape === 'lab_interpret') {
    return {
      shape,
      reply: join(
        demand
          ? `I won’t label your labs as a diagnosis — ranges depend on assay, units, timing, and goals.`
          : `I can show what you logged; I can’t diagnose “too high/low” for you personally.`,
        e2Line,
        t ? `Your last logged testosterone was ${t.value} on ${t.date}.` : null,
        fsh ? `Your last logged FSH was ${fsh.value} on ${fsh.date}.` : null,
        `FSH can stay elevated on estrogen for some women — symptoms + your clinician’s target matter more than one number.`,
        `Ask: “Here’s my result — given my symptoms and method, how do you read this?”`,
      ),
    };
  }

  if (shape === 'dose_amount') {
    if (demand) {
      return {
        shape,
        reply: join(
          `I hear that you want a clear number. I won’t give milligrams or patch strengths — that would be choosing treatment for you.`,
          medLine,
          `Hand them: “I’m on ${meds[0] ?? 'my current estrogen'}. What increment would you consider, and what target are we using?”`,
        ),
      };
    }
    return {
      shape,
      reply: join(
        `I can’t tell you how much to raise your estrogen — I won’t pick a dose increase for you.`,
        medLine,
        e2Line,
        patternBits || null,
        `Ask: “Given how I’ve been feeling on my current dose, what increase would you consider?”`,
      ),
    };
  }

  if (shape === 'should_raise') {
    return {
      shape,
      reply: join(
        demand
          ? `I can’t say yes or no to raising your dose — that’s your clinician’s call.`
          : `I can’t recommend that you raise (or not raise) your estrogen — that call belongs with your clinician.`,
        medLine,
        patternBits || e2Line,
        `Try: “Here’s my symptom trend on my current dose — would you consider a change?”`,
      ),
    };
  }

  if (shape === 'staging') {
    return {
      shape,
      reply: join(
        stageLine(facts),
        `Peri vs menopause is about cycle history and staging answers, not a vibe check in chat.`,
      ),
    };
  }

  if (shape === 'comparison') {
    return {
      shape,
      reply: join(
        `I won’t compare you to “what other women are on” — we don’t use herd dosing advice in chat.`,
        medLine,
        e2Line,
        `Ask your clinician based on *your* symptoms and labs — not a friend’s dose.`,
      ),
    };
  }

  if (shape === 'thin_or_broken') {
    return {
      shape,
      reply: join(
        `I won’t invent patterns when the history is thin.`,
        mrsCount < 3
          ? `You’ve got ${mrsCount} weekly check-in${mrsCount === 1 ? '' : 's'} visible here. A few more weeks sharpen Insights and this chat.`
          : `If a screen looks stuck, refresh or check you’re on the latest build.`,
        `Next step: one honest weekly check-in when you can. No shame in gaps.`,
      ),
    };
  }

  const afford = /\b(can'?t afford|cannot afford|too expensive|no insurance|cost)\b/.test(
    normalize(message),
  );
  if (afford) {
    return {
      shape,
      reply: join(
        `Money stress around meds and appointments is real.`,
        `Ask the clinic about sliding scale, samples, savings programs, or a covered alternative that still treats your symptoms.`,
        medLine,
      ),
    };
  }

  return {
    shape,
    reply: join(
      `I’m sorry you’re carrying that — not being believed about your body is exhausting.`,
      patternBits || medLine,
      `Your logs can help: share a short report and say you need support, not debate.`,
      `On Insights, open “Preparing for an appointment?” for a short visit-prep pack you can bring.`,
    ),
  };
}

/** @deprecated alias */
export function buildDoseScriptReply(
  message: string,
  facts: FactsLite,
  opts?: ScriptBuildOpts,
): { reply: string; shape: ScriptShape } | null {
  return buildCompanionScriptReply(message, facts, opts);
}

const PRIOR_DOSE_SCRIPT_RE =
  /can’t tell you how much|won’t pick a dose|can’t assign the level|can’t set \*your\* personal|won’t give milligrams|can’t recommend that you raise|won’t green-light|can’t advise you to double|won’t invent patterns|won’t compare you/i;

const PRIOR_CRISIS_RE =
  /988|findahelpline|crisis lifeline|can'?t be your crisis|this is urgent|get help right now|paste the same paragraph/i;

/**
 * Dose/lab scripts: short push after a prior script → firmer same shape.
 * Crisis: do NOT use this to replay the identical 988 blob — buildCompanionScriptReply
 * handles follow-ups via history count instead.
 */
export function shouldForceDemandFromHistory(
  message: string,
  history: Array<{ role: string; content: string }>,
): boolean {
  if (classifyCrisisTier(message)) return false;
  if (isDemandPush(message) && !PRIOR_CRISIS_RE.test(message)) {
    const lastAssistant = [...history].reverse().find((m) => m.role === 'assistant');
    if (lastAssistant && PRIOR_CRISIS_RE.test(lastAssistant.content)) {
      // "you said the same thing" after crisis is still crisis follow-up, not dose demand
      if (classifyCrisisTier(message) || /\b(kill|suicide|gun|die|tonight)\b/.test(normalize(message))) {
        return false;
      }
    }
  }
  if (isDemandPush(message)) {
    const lastAssistant = [...history].reverse().find((m) => m.role === 'assistant');
    if (lastAssistant && PRIOR_CRISIS_RE.test(lastAssistant.content)) return false;
    return true;
  }
  const lastAssistant = [...history].reverse().find((m) => m.role === 'assistant');
  if (!lastAssistant) return false;
  if (PRIOR_CRISIS_RE.test(lastAssistant.content)) return false;
  const priorWasScript = PRIOR_DOSE_SCRIPT_RE.test(lastAssistant.content);
  const shortPush =
    /^(please|come on|seriously|really|just|ok but|fine)\b/i.test(normalize(message)) ||
    normalize(message).split(' ').length <= 8;
  return priorWasScript && shortPush;
}
