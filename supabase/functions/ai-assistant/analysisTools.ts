export const ANALYSIS_METRICS = [
  'total_score',
  'somatic_score',
  'psychological_score',
  'urogenital_score',
  'hot_flashes',
  'sleep_problems',
  'irritability',
  'anxiety',
  'exhaustion',
  'sexual_problems',
  'bladder_problems',
  'vaginal_dryness',
  'joint_muscle_pain',
  'brain_fog',
  'overall_wellbeing',
  'energy_level',
  'mood_level',
  'sleep_quality',
] as const;

export const ANALYSIS_BIOMARKERS = [
  'estradiol',
  'estrone',
  'progesterone',
  'total_testosterone',
  'free_testosterone',
  'dhea_s',
  'shbg',
  'fsh',
  'lh',
  'tsh',
  'free_t3',
  'free_t4',
  'cortisol_am',
  'vitamin_d',
  'ferritin',
  'fasting_insulin',
  'hba1c',
  'hs_crp',
  'homocysteine',
  'prolactin',
  'igf1',
] as const;

export type AnalysisMetric = (typeof ANALYSIS_METRICS)[number];
export type AnalysisBiomarker = (typeof ANALYSIS_BIOMARKERS)[number];

export interface AnalysisCheckin {
  checkin_date: string;
  [key: string]: string | number | boolean | null | undefined;
}

export interface AnalysisLab {
  draw_date: string;
  [key: string]: string | number | boolean | null | undefined;
}

export interface AnalysisAdministration {
  taken_at: string;
  local_date?: string | null;
}

interface RecentRowsResult {
  data: unknown[] | null;
  error: { message: string } | null;
}

interface RecentRowsQuery {
  select(columns: string): RecentRowsQuery;
  eq(column: string, value: string): RecentRowsQuery;
  order(column: string, options: { ascending: boolean }): RecentRowsQuery;
  limit(count: number): PromiseLike<RecentRowsResult>;
}

export interface RecentAnalysisClient {
  from(table: 'symptom_checkins' | 'lab_results'): RecentRowsQuery;
}

export async function loadRecentAnalysisRows(
  client: RecentAnalysisClient,
  userId: string,
): Promise<{ checkins: AnalysisCheckin[]; labs: AnalysisLab[] }> {
  const [checkinsResult, labsResult] = await Promise.all([
    client
      .from('symptom_checkins')
      .select('*')
      .eq('user_id', userId)
      .order('checkin_date', { ascending: false })
      .limit(500),
    client
      .from('lab_results')
      .select('*')
      .eq('user_id', userId)
      .order('draw_date', { ascending: false })
      .limit(100),
  ]);
  if (checkinsResult.error) throw new Error(checkinsResult.error.message);
  if (labsResult.error) throw new Error(labsResult.error.message);
  return {
    checkins: [...((checkinsResult.data ?? []) as AnalysisCheckin[])].reverse(),
    labs: [...((labsResult.data ?? []) as AnalysisLab[])].reverse(),
  };
}

export interface AnalysisToolResult {
  tool: string;
  evidenceClass: AnalysisEvidenceClass;
  sufficient: boolean;
  sampleSize: number;
  effectSize: number | null;
  minimumRequired: number;
  stableWithoutOutlier: boolean | null;
  repeatCount: number;
  identity: AnalysisResultIdentity;
  summary: string;
  evidence: string[];
  limitations: string[];
  values: Record<string, string | number | boolean | null>;
}

export type AnalysisEvidenceClass =
  | 'fact'
  | 'worth_watching'
  | 'early_signal'
  | 'repeated_finding'
  | 'suppressed';

export interface AnalysisResultIdentity {
  version: 1;
  parameters: Record<string, string | number | boolean | null>;
  evidenceKeys: string[];
}

function numeric(row: Record<string, unknown>, key: string): number | null {
  const value = row[key];
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

function mean(values: number[]): number | null {
  if (values.length === 0) return null;
  return Math.round((values.reduce((sum, value) => sum + value, 0) / values.length) * 100) / 100;
}

function rawMean(values: number[]): number | null {
  if (values.length === 0) return null;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function daysBetween(a: string, b: string): number {
  const aMs = new Date(`${a}T12:00:00Z`).getTime();
  const bMs = new Date(`${b}T12:00:00Z`).getTime();
  return Math.round((bMs - aMs) / 86_400_000);
}

function correlation(pairs: Array<[number, number]>): number | null {
  if (pairs.length < 3) return null;
  const xMean = rawMean(pairs.map(([x]) => x));
  const yMean = rawMean(pairs.map(([, y]) => y));
  if (xMean === null || yMean === null) return null;
  let numerator = 0;
  let xSquared = 0;
  let ySquared = 0;
  for (const [x, y] of pairs) {
    const dx = x - xMean;
    const dy = y - yMean;
    numerator += dx * dy;
    xSquared += dx * dx;
    ySquared += dy * dy;
  }
  const denominator = Math.sqrt(xSquared * ySquared);
  if (denominator === 0) return null;
  return Math.round((numerator / denominator) * 100) / 100;
}

function identity(
  parameters: AnalysisResultIdentity['parameters'],
  evidenceKeys: string[],
): AnalysisResultIdentity {
  return {
    version: 1,
    parameters,
    evidenceKeys: [...new Set(evidenceKeys)].sort(),
  };
}

function metricEffectThreshold(metric: AnalysisMetric): number {
  if (metric === 'total_score') return 2;
  if (
    metric === 'somatic_score' ||
    metric === 'psychological_score' ||
    metric === 'urogenital_score'
  ) {
    return 1;
  }
  return 0.5;
}

function sameDirection(value: number | null, expected: number): boolean {
  if (value === null || value === 0 || expected === 0) return false;
  return Math.sign(value) === Math.sign(expected);
}

function periodDifference(
  first: Array<{ value: number }>,
  second: Array<{ value: number }>,
): number | null {
  const firstAverage = rawMean(first.map((row) => row.value));
  const secondAverage = rawMean(second.map((row) => row.value));
  return firstAverage === null || secondAverage === null
    ? null
    : secondAverage - firstAverage;
}

function periodDifferenceIsStable(
  first: Array<{ value: number }>,
  second: Array<{ value: number }>,
  delta: number | null,
  threshold: number,
): boolean {
  if (delta === null || first.length < 4 || second.length < 4) return false;
  const variants: number[] = [];
  for (let index = 0; index < first.length; index += 1) {
    const value = periodDifference(first.filter((_, rowIndex) => rowIndex !== index), second);
    if (value !== null) variants.push(value);
  }
  for (let index = 0; index < second.length; index += 1) {
    const value = periodDifference(first, second.filter((_, rowIndex) => rowIndex !== index));
    if (value !== null) variants.push(value);
  }
  return variants.length > 0 && variants.every(
    (value) => sameDirection(value, delta) && Math.abs(value) >= threshold,
  );
}

function correlationIsStable(pairs: Array<[number, number]>, result: number | null): boolean {
  if (result === null || pairs.length < 6) return false;
  return pairs.every((_, index) => {
    const reduced = correlation(pairs.filter((__, pairIndex) => pairIndex !== index));
    return sameDirection(reduced, result) && Math.abs(reduced ?? 0) >= 0.3;
  });
}

const MRS_SCORE_METRICS = new Set<AnalysisMetric>([
  'total_score',
  'somatic_score',
  'psychological_score',
  'urogenital_score',
]);

function isCompletedMrsRow(row: AnalysisCheckin): boolean {
  return row.mrs_complete === true;
}

function metricValues(
  rows: AnalysisCheckin[],
  metric: AnalysisMetric,
  startDate?: string,
  endDate?: string,
): Array<{ date: string; value: number }> {
  return rows
    .filter(
      (row) =>
        (!startDate || row.checkin_date >= startDate) &&
        (!endDate || row.checkin_date <= endDate) &&
        (!MRS_SCORE_METRICS.has(metric) || isCompletedMrsRow(row)),
    )
    .map((row) => ({ date: row.checkin_date, value: numeric(row, metric) }))
    .filter((row): row is { date: string; value: number } => row.value !== null)
    .sort((a, b) => a.date.localeCompare(b.date));
}

export function comparePeriods(input: {
  checkins: AnalysisCheckin[];
  metric: AnalysisMetric;
  firstStart: string;
  firstEnd: string;
  secondStart: string;
  secondEnd: string;
}): AnalysisToolResult {
  const first = metricValues(input.checkins, input.metric, input.firstStart, input.firstEnd);
  const second = metricValues(input.checkins, input.metric, input.secondStart, input.secondEnd);
  const firstAverage = mean(first.map((row) => row.value));
  const secondAverage = mean(second.map((row) => row.value));
  const delta =
    firstAverage !== null && secondAverage !== null
      ? Math.round((secondAverage - firstAverage) * 100) / 100
      : null;
  const effectThreshold = metricEffectThreshold(input.metric);
  const effectSize = delta === null ? null : Math.abs(delta);
  const stableWithoutOutlier = periodDifferenceIsStable(
    first,
    second,
    delta,
    effectThreshold,
  );
  const hasComparablePeriods = first.length >= 2 && second.length >= 2;
  const isMeaningful = effectSize !== null && effectSize >= effectThreshold;
  const evidenceClass: AnalysisEvidenceClass =
    first.length === 0 || second.length === 0
      ? 'suppressed'
      : !hasComparablePeriods
        ? 'worth_watching'
        : !isMeaningful
          ? 'suppressed'
          : first.length >= 4 && second.length >= 4 && stableWithoutOutlier
            ? 'repeated_finding'
            : 'early_signal';
  return {
    tool: 'compare_periods',
    evidenceClass,
    sufficient: hasComparablePeriods,
    sampleSize: first.length + second.length,
    effectSize,
    minimumRequired: 4,
    stableWithoutOutlier,
    repeatCount: Math.min(first.length, second.length),
    identity: identity(
      {
        metric: input.metric,
        firstStart: input.firstStart,
        firstEnd: input.firstEnd,
        secondStart: input.secondStart,
        secondEnd: input.secondEnd,
      },
      [...first, ...second].map((row) => `${row.date}:${input.metric}`),
    ),
    summary:
      delta === null
        ? `There are not enough ${input.metric} values to compare these periods.`
        : `${input.metric} averaged ${firstAverage} in the first period and ${secondAverage} in the second (change ${delta >= 0 ? '+' : ''}${delta}).`,
    evidence: [
      `First period ${input.firstStart} to ${input.firstEnd}: ${first.length} observations.`,
      `Second period ${input.secondStart} to ${input.secondEnd}: ${second.length} observations.`,
    ],
    limitations:
      evidenceClass === 'worth_watching'
        ? ['Each period needs at least two comparable observations for an early signal.']
        : evidenceClass === 'early_signal'
          ? ['The calculated difference is based on a small number of observations.']
          : evidenceClass === 'suppressed' && hasComparablePeriods
            ? ['The calculated difference is below TrackHer’s display threshold for this scale.']
            : [],
    values: {
      firstAverage,
      secondAverage,
      delta,
      firstCount: first.length,
      secondCount: second.length,
      effectThreshold,
    },
  };
}

export function compareMrsDomains(input: {
  checkins: AnalysisCheckin[];
  firstStart: string;
  firstEnd: string;
  secondStart: string;
  secondEnd: string;
}): AnalysisToolResult {
  const complete = input.checkins
    .filter((row) => {
      const inWindow =
        (row.checkin_date >= input.firstStart && row.checkin_date <= input.firstEnd) ||
        (row.checkin_date >= input.secondStart && row.checkin_date <= input.secondEnd);
      return inWindow &&
        isCompletedMrsRow(row) &&
        numeric(row, 'total_score') !== null &&
        numeric(row, 'somatic_score') !== null &&
        numeric(row, 'psychological_score') !== null &&
        numeric(row, 'urogenital_score') !== null;
    })
    .sort((a, b) => a.checkin_date.localeCompare(b.checkin_date));
  const first = complete.filter(
    (row) => row.checkin_date >= input.firstStart && row.checkin_date <= input.firstEnd,
  );
  const second = complete.filter(
    (row) => row.checkin_date >= input.secondStart && row.checkin_date <= input.secondEnd,
  );
  const valuesFor = (rows: AnalysisCheckin[], metric: AnalysisMetric) =>
    rows
      .map((row) => numeric(row, metric))
      .filter((value): value is number => value !== null)
      .map((value) => ({ value }));
  const deltaFor = (metric: AnalysisMetric): number | null => {
    const firstAverage = rawMean(valuesFor(first, metric).map((row) => row.value));
    const secondAverage = rawMean(valuesFor(second, metric).map((row) => row.value));
    return firstAverage === null || secondAverage === null
      ? null
      : Math.round((secondAverage - firstAverage) * 100) / 100;
  };
  const totalDelta = deltaFor('total_score');
  const somaticDelta = deltaFor('somatic_score');
  const psychologicalDelta = deltaFor('psychological_score');
  const urogenitalDelta = deltaFor('urogenital_score');
  const domainDeltas = [
    ['somatic', somaticDelta],
    ['psychological', psychologicalDelta],
    ['urogenital', urogenitalDelta],
  ] as const;
  const improving = domainDeltas.filter(([, delta]) => delta !== null && delta <= -1);
  const worsening = domainDeltas.filter(([, delta]) => delta !== null && delta >= 1);
  const hiddenOpposition =
    totalDelta !== null && Math.abs(totalDelta) < 2 && improving.length > 0 && worsening.length > 0;
  const hasMinimum = first.length >= 2 && second.length >= 2;
  const repeated = first.length >= 4 && second.length >= 4;
  const metricForDomain = (name: string): AnalysisMetric =>
    name === 'somatic'
      ? 'somatic_score'
      : name === 'psychological'
        ? 'psychological_score'
        : 'urogenital_score';
  const stableWithoutOutlier = hiddenOpposition
    ? [...improving, ...worsening].every(([name, delta]) => {
        if (delta === null) return false;
        const metric = metricForDomain(name);
        return periodDifferenceIsStable(
          valuesFor(first, metric),
          valuesFor(second, metric),
          delta,
          1,
        );
      })
    : null;
  const evidenceClass: AnalysisEvidenceClass =
    first.length === 0 || second.length === 0
      ? 'suppressed'
      : !hasMinimum
        ? 'worth_watching'
        : !hiddenOpposition
          ? 'suppressed'
          : repeated && stableWithoutOutlier
            ? 'repeated_finding'
            : hiddenOpposition
              ? 'early_signal'
              : 'suppressed';
  const summary = hiddenOpposition
    ? `The total MRS changed ${totalDelta}, while ${improving.map(([name]) => name).join(' and ')} improved and ${worsening.map(([name]) => name).join(' and ')} worsened.`
    : 'The completed MRS records do not show a stable total concealing opposing domain changes.';
  return {
    tool: 'mrs_domain_divergence',
    evidenceClass,
    sufficient: hasMinimum,
    sampleSize: first.length + second.length,
    effectSize: hiddenOpposition
      ? Math.max(...domainDeltas.map(([, delta]) => Math.abs(delta ?? 0)))
      : null,
    minimumRequired: 4,
    stableWithoutOutlier,
    repeatCount: Math.min(first.length, second.length),
    identity: identity(
      {
        firstStart: input.firstStart,
        firstEnd: input.firstEnd,
        secondStart: input.secondStart,
        secondEnd: input.secondEnd,
      },
      complete.map((row) => `${row.checkin_date}:completed-mrs`),
    ),
    summary,
    evidence: [
      `First period: ${first.length} completed MRS records.`,
      `Second period: ${second.length} completed MRS records.`,
      `Total change ${totalDelta ?? 'unavailable'}; somatic ${somaticDelta ?? 'unavailable'}; psychological ${psychologicalDelta ?? 'unavailable'}; urogenital ${urogenitalDelta ?? 'unavailable'}.`,
    ],
    limitations:
      evidenceClass === 'worth_watching'
        ? ['Each period needs at least two completed physical MRS records.']
        : evidenceClass === 'early_signal'
          ? ['The opposing domain movement is based on a small number of completed assessments.']
          : [],
    values: {
      totalDelta,
      somaticDelta,
      psychologicalDelta,
      urogenitalDelta,
      firstCount: first.length,
      secondCount: second.length,
    },
  };
}

export function analyzeMedicationWindow(input: {
  checkins: AnalysisCheckin[];
  metric: AnalysisMetric;
  changeDate: string;
  beforeDays?: number;
  afterDays?: number;
}): AnalysisToolResult {
  const beforeDays = Math.min(Math.max(input.beforeDays ?? 28, 7), 90);
  const afterDays = Math.min(Math.max(input.afterDays ?? 42, 7), 90);
  const rows = metricValues(input.checkins, input.metric);
  const before = rows.filter((row) => {
    const offset = daysBetween(row.date, input.changeDate);
    return offset > 0 && offset <= beforeDays;
  });
  const after = rows.filter((row) => {
    const offset = daysBetween(input.changeDate, row.date);
    return offset >= 0 && offset <= afterDays;
  });
  const beforeAverage = mean(before.map((row) => row.value));
  const afterAverage = mean(after.map((row) => row.value));
  const delta =
    beforeAverage !== null && afterAverage !== null
      ? Math.round((afterAverage - beforeAverage) * 100) / 100
      : null;
  const sufficient = before.length >= 2 && after.length >= 2;
  const effectThreshold = metricEffectThreshold(input.metric);
  const effectSize = delta === null ? null : Math.abs(delta);
  const stableWithoutOutlier = periodDifferenceIsStable(
    before,
    after,
    delta,
    effectThreshold,
  );
  const evidenceClass: AnalysisEvidenceClass =
    before.length === 0 || after.length === 0
      ? 'suppressed'
      : !sufficient
        ? 'worth_watching'
        : effectSize === null || effectSize < effectThreshold
          ? 'suppressed'
          : before.length >= 4 && after.length >= 4 && stableWithoutOutlier
            ? 'repeated_finding'
            : 'early_signal';
  return {
    tool: 'medication_change_window',
    evidenceClass,
    sufficient,
    sampleSize: before.length + after.length,
    effectSize,
    minimumRequired: 4,
    stableWithoutOutlier,
    repeatCount: Math.min(before.length, after.length),
    identity: identity(
      {
        metric: input.metric,
        changeDate: input.changeDate,
        beforeDays,
        afterDays,
      },
      [...before, ...after].map((row) => `${row.date}:${input.metric}`),
    ),
    summary:
      delta === null
        ? `There are not enough ${input.metric} observations around ${input.changeDate}.`
        : `${input.metric} averaged ${beforeAverage} before and ${afterAverage} after the recorded change (change ${delta >= 0 ? '+' : ''}${delta}).`,
    evidence: [
      `${before.length} observations in the ${beforeDays}-day before window.`,
      `${after.length} observations in the ${afterDays}-day after window.`,
    ],
    limitations: [
      'A before/after relationship does not prove the medication change caused it.',
      ...(evidenceClass === 'worth_watching'
        ? ['At least two observations are required on each side for an early signal.']
        : evidenceClass === 'early_signal'
          ? ['The comparison is based on a small number of observations.']
          : evidenceClass === 'suppressed' && sufficient
            ? ['The calculated difference is below TrackHer’s display threshold for this scale.']
            : []),
    ],
    values: {
      changeDate: input.changeDate,
      beforeAverage,
      afterAverage,
      delta,
      beforeCount: before.length,
      afterCount: after.length,
      beforeDays,
      afterDays,
      effectThreshold,
    },
  };
}

export function analyzeRepeatedMedicationWindows(input: {
  checkins: AnalysisCheckin[];
  metric: AnalysisMetric;
  medicationName: string;
  changeDates: string[];
  beforeDays?: number;
  afterDays?: number;
}): AnalysisToolResult {
  const changeDates = [...new Set(input.changeDates)].sort();
  const windows = changeDates.map((changeDate) =>
    analyzeMedicationWindow({
      checkins: input.checkins,
      metric: input.metric,
      changeDate,
      beforeDays: input.beforeDays,
      afterDays: input.afterDays,
    })
  );
  const meaningful = windows.filter(isMeaningfulAnalysisResult);
  const positive = meaningful.filter((result) => Number(result.values.delta) > 0);
  const negative = meaningful.filter((result) => Number(result.values.delta) < 0);
  const sameDirection = positive.length >= 2
    ? positive
    : negative.length >= 2
      ? negative
      : [];
  const evidenceClass: AnalysisEvidenceClass =
    changeDates.length === 0
      ? 'suppressed'
      : sameDirection.length >= 3
        ? 'repeated_finding'
        : sameDirection.length >= 2
          ? 'early_signal'
          : 'worth_watching';
  const averageDelta = sameDirection.length > 0
    ? mean(sameDirection.map((result) => Number(result.values.delta)))
    : null;
  return {
    tool: 'repeated_medication_windows',
    evidenceClass,
    sufficient: sameDirection.length >= 2,
    sampleSize: windows.reduce((sum, result) => sum + result.sampleSize, 0),
    effectSize: averageDelta === null ? null : Math.abs(averageDelta),
    minimumRequired: 2,
    stableWithoutOutlier: sameDirection.length >= 3,
    repeatCount: sameDirection.length,
    identity: identity(
      {
        metric: input.metric,
        medicationName: input.medicationName.toLowerCase(),
        beforeDays: input.beforeDays ?? 28,
        afterDays: input.afterDays ?? 42,
      },
      meaningful.flatMap((result) => result.identity.evidenceKeys),
    ),
    summary:
      sameDirection.length >= 2
        ? `${input.metric} moved in the same direction after ${sameDirection.length} independently recorded ${input.medicationName} changes (average calculated change ${averageDelta}).`
        : `There are ${changeDates.length} recorded ${input.medicationName} changes, but fewer than two have comparable before-and-after ${input.metric} observations moving in the same direction.`,
    evidence: windows.flatMap((result) => [
      `${String(result.values.changeDate)}: ${result.summary}`,
      ...result.evidence,
    ]),
    limitations: [
      'Repeated timing does not prove that the medication changes caused the symptom movement.',
      ...(evidenceClass === 'worth_watching'
        ? ['At least two independently recorded changes need usable before-and-after observations moving in the same direction.']
        : evidenceClass === 'early_signal'
          ? ['The direction has repeated twice; a third comparable event would make the pattern more dependable.']
          : []),
    ],
    values: {
      recordedChangeCount: changeDates.length,
      comparableChangeCount: meaningful.length,
      matchingDirectionCount: sameDirection.length,
      averageDelta,
      direction: averageDelta === null ? null : averageDelta > 0 ? 'higher' : 'lower',
    },
  };
}

export function compareSymptoms(input: {
  checkins: AnalysisCheckin[];
  firstMetric: AnalysisMetric;
  secondMetric: AnalysisMetric;
}): AnalysisToolResult {
  const pairs = input.checkins
    .map((row) => ({
      date: row.checkin_date,
      first: numeric(row, input.firstMetric),
      second: numeric(row, input.secondMetric),
    }))
    .filter(
      (row): row is { date: string; first: number; second: number } =>
        row.first !== null && row.second !== null,
    )
    .sort((a, b) => a.date.localeCompare(b.date));
  const r = correlation(pairs.map((row) => [row.first, row.second]));
  const correlationPairs = pairs.map((row): [number, number] => [row.first, row.second]);
  const stableWithoutOutlier = correlationIsStable(correlationPairs, r);
  const spanDays = pairs.length > 1
    ? daysBetween(pairs[0].date, pairs[pairs.length - 1].date)
    : 0;
  const evidenceClass: AnalysisEvidenceClass =
    pairs.length < 3 || r === null
      ? 'suppressed'
      : pairs.length < 6
        ? 'worth_watching'
        : Math.abs(r) < (pairs.length >= 10 ? 0.4 : 0.5) || !stableWithoutOutlier
          ? 'suppressed'
          : pairs.length >= 10 && spanDays >= 21
            ? 'repeated_finding'
            : 'early_signal';
  const sufficient = evidenceClass === 'early_signal' || evidenceClass === 'repeated_finding';
  return {
    tool: 'compare_symptoms',
    evidenceClass,
    sufficient,
    sampleSize: pairs.length,
    effectSize: r === null ? null : Math.abs(r),
    minimumRequired: 6,
    stableWithoutOutlier,
    repeatCount: pairs.length,
    identity: identity(
      { firstMetric: input.firstMetric, secondMetric: input.secondMetric },
      pairs.map((row) => `${row.date}:${input.firstMetric}:${input.secondMetric}`),
    ),
    summary:
      r === null
        ? `There are not enough varying observations to compare ${input.firstMetric} with ${input.secondMetric}.`
        : `${input.firstMetric} and ${input.secondMetric} had a computed alignment of ${r}.`,
    evidence: [
      `${pairs.length} same-date observations contained both values.`,
      ...(pairs.length > 0
        ? [`Comparable dates ran from ${pairs[0].date} to ${pairs[pairs.length - 1].date}.`]
        : []),
    ],
    limitations: [
      'Alignment does not establish that either symptom caused the other.',
      ...(evidenceClass === 'worth_watching'
        ? ['At least six varying, same-date observations are required for an early signal.']
        : evidenceClass === 'early_signal'
          ? ['More paired days are needed to know whether this alignment repeats.']
          : evidenceClass === 'suppressed' && pairs.length >= 6
            ? ['The apparent alignment is weak or depends too heavily on one observation.']
            : []),
    ],
    values: {
      correlation: r,
      pairCount: pairs.length,
      firstAverage: mean(pairs.map((row) => row.first)),
      secondAverage: mean(pairs.map((row) => row.second)),
      spanDays,
    },
  };
}

export function repeatedCooccurrences(input: {
  checkins: AnalysisCheckin[];
  firstMetric: AnalysisMetric;
  secondMetric: AnalysisMetric;
  threshold?: number;
}): AnalysisToolResult {
  const threshold = Math.min(Math.max(input.threshold ?? 2, 1), 4);
  const comparable = input.checkins
    .map((row) => ({
      date: row.checkin_date,
      first: numeric(row, input.firstMetric),
      second: numeric(row, input.secondMetric),
    }))
    .filter(
      (row): row is { date: string; first: number; second: number } =>
        row.first !== null && row.second !== null,
    );
  const matches = comparable.filter(
    (row) => row.first >= threshold && row.second >= threshold,
  );
  const firstCount = comparable.filter((row) => row.first >= threshold).length;
  const secondCount = comparable.filter((row) => row.second >= threshold).length;
  const matchRate = comparable.length > 0
    ? Math.round((matches.length / comparable.length) * 100)
    : null;
  const expectedMatchRate = comparable.length > 0
    ? Math.round((firstCount / comparable.length) * (secondCount / comparable.length) * 100)
    : null;
  const liftPoints = matchRate === null || expectedMatchRate === null
    ? null
    : matchRate - expectedMatchRate;
  const crossesEffectThreshold =
    matches.length >= 2 &&
    (matchRate ?? 0) >= 40 &&
    (liftPoints ?? 0) >= 15;
  const evidenceClass: AnalysisEvidenceClass =
    comparable.length < 4
      ? 'suppressed'
      : comparable.length < 6
        ? 'worth_watching'
        : !crossesEffectThreshold
          ? 'suppressed'
          : comparable.length >= 12 && matches.length >= 3
            ? 'repeated_finding'
            : 'early_signal';
  return {
    tool: 'repeated_cooccurrences',
    evidenceClass,
    sufficient: evidenceClass === 'early_signal' || evidenceClass === 'repeated_finding',
    sampleSize: comparable.length,
    effectSize: liftPoints,
    minimumRequired: 6,
    stableWithoutOutlier: null,
    repeatCount: matches.length,
    identity: identity(
      { firstMetric: input.firstMetric, secondMetric: input.secondMetric, threshold },
      comparable.map((row) => `${row.date}:${input.firstMetric}:${input.secondMetric}`),
    ),
    summary: `${input.firstMetric} and ${input.secondMetric} were both at least ${threshold} on ${matches.length} of ${comparable.length} comparable dates.`,
    evidence: matches.slice(-8).map((row) => `${row.date}: ${row.first} and ${row.second}.`),
    limitations:
      evidenceClass === 'worth_watching'
        ? ['At least six comparable observations are required for an early signal.']
        : evidenceClass === 'early_signal'
          ? ['The overlap is higher than expected, but there are not yet twelve comparable days.']
          : evidenceClass === 'suppressed' && comparable.length >= 6
            ? ['The overlap was not meaningfully higher than expected from each symptom’s frequency.']
            : [],
    values: {
      threshold,
      matchCount: matches.length,
      comparableCount: comparable.length,
      firstCount,
      secondCount,
      matchRate,
      expectedMatchRate,
      liftPoints,
    },
  };
}

export function laggedChanges(input: {
  checkins: AnalysisCheckin[];
  leadingMetric: AnalysisMetric;
  followingMetric: AnalysisMetric;
  lagDays: number;
}): AnalysisToolResult {
  const lagDays = Math.min(Math.max(Math.round(input.lagDays), 1), 60);
  const leading = metricValues(input.checkins, input.leadingMetric);
  const following = metricValues(input.checkins, input.followingMetric);
  const pairs: Array<{ leadDate: string; followDate: string; values: [number, number] }> = [];
  for (const lead of leading) {
    const match = following
      .map((row) => ({ ...row, distance: Math.abs(daysBetween(lead.date, row.date) - lagDays) }))
      .filter((row) => row.distance <= 2)
      .sort((a, b) => a.distance - b.distance)[0];
    if (match) pairs.push({ leadDate: lead.date, followDate: match.date, values: [lead.value, match.value] });
  }
  const correlationPairs = pairs.map((pair) => pair.values);
  const r = correlation(correlationPairs);
  const stableWithoutOutlier = correlationIsStable(correlationPairs, r);
  const spanDays = pairs.length > 1
    ? daysBetween(pairs[0].leadDate, pairs[pairs.length - 1].leadDate)
    : 0;
  const evidenceClass: AnalysisEvidenceClass =
    pairs.length < 3 || r === null
      ? 'suppressed'
      : pairs.length < 6
        ? 'worth_watching'
        : Math.abs(r) < (pairs.length >= 10 ? 0.4 : 0.5) || !stableWithoutOutlier
          ? 'suppressed'
          : pairs.length >= 10 && spanDays >= 21
            ? 'repeated_finding'
            : 'early_signal';
  return {
    tool: 'lagged_changes',
    evidenceClass,
    sufficient: evidenceClass === 'early_signal' || evidenceClass === 'repeated_finding',
    sampleSize: pairs.length,
    effectSize: r === null ? null : Math.abs(r),
    minimumRequired: 6,
    stableWithoutOutlier,
    repeatCount: pairs.length,
    identity: identity(
      {
        leadingMetric: input.leadingMetric,
        followingMetric: input.followingMetric,
        lagDays,
      },
      pairs.map((pair) => `${pair.leadDate}:${pair.followDate}`),
    ),
    summary:
      r === null
        ? `There are not enough matched observations to test a ${lagDays}-day lag.`
        : `${input.leadingMetric} followed by ${input.followingMetric} about ${lagDays} days later had a computed alignment of ${r}.`,
    evidence: [`${pairs.length} observations matched within two days of the requested lag.`],
    limitations: [
      'Lagged alignment remains observational and may reflect other changes.',
      ...(evidenceClass === 'worth_watching'
        ? ['At least six matched observations are required for an early signal.']
        : evidenceClass === 'early_signal'
          ? ['The requested lag has not yet repeated across a long enough period.']
          : evidenceClass === 'suppressed' && pairs.length >= 6
            ? ['The apparent lag is weak or depends too heavily on one matched observation.']
            : []),
    ],
    values: { lagDays, pairCount: pairs.length, correlation: r, spanDays },
  };
}

export function analyzeDoseTiming(input: {
  checkins: AnalysisCheckin[];
  administrations: AnalysisAdministration[];
  medicationName: string;
  metric: AnalysisMetric;
  maxDays?: number;
}): AnalysisToolResult {
  const maxDays = Math.min(Math.max(Math.round(input.maxDays ?? 14), 2), 30);
  const administrationDates = [...new Set(
    input.administrations
      .map((row) => row.local_date ?? row.taken_at.slice(0, 10))
      .filter((value) => /^\d{4}-\d{2}-\d{2}$/.test(value)),
  )].sort();
  const observations = metricValues(input.checkins, input.metric)
    .map((row) => {
      const priorDate = [...administrationDates]
        .reverse()
        .find((date) => date <= row.date);
      if (!priorDate) return null;
      const daysSince = daysBetween(priorDate, row.date);
      if (daysSince < 0 || daysSince > maxDays) return null;
      return { ...row, priorDate, daysSince };
    })
    .filter((row): row is { date: string; value: number; priorDate: string; daysSince: number } => row !== null);
  const pairs = observations.map((row): [number, number] => [row.daysSince, row.value]);
  const distinctOffsets = new Set(observations.map((row) => row.daysSince)).size;
  const r = distinctOffsets >= 3 ? correlation(pairs) : null;
  const stableWithoutOutlier = correlationIsStable(pairs, r);
  const evidenceClass: AnalysisEvidenceClass =
    observations.length < 3 || administrationDates.length < 2
      ? 'suppressed'
      : observations.length < 6 || distinctOffsets < 3 || r === null
        ? 'worth_watching'
        : Math.abs(r) < (observations.length >= 12 ? 0.4 : 0.5) || !stableWithoutOutlier
          ? 'suppressed'
          : observations.length >= 12 && administrationDates.length >= 3
            ? 'repeated_finding'
            : 'early_signal';
  return {
    tool: 'dose_timing_pattern',
    evidenceClass,
    sufficient: evidenceClass === 'early_signal' || evidenceClass === 'repeated_finding',
    sampleSize: observations.length,
    effectSize: r === null ? null : Math.abs(r),
    minimumRequired: 6,
    stableWithoutOutlier,
    repeatCount: administrationDates.length,
    identity: identity(
      {
        medicationName: input.medicationName.toLowerCase(),
        metric: input.metric,
        maxDays,
      },
      [
        ...administrationDates.map((date) => `${date}:administration`),
        ...observations.map((row) => `${row.date}:${input.metric}`),
      ],
    ),
    summary:
      r === null
        ? `There is not enough variation in days since ${input.medicationName} administrations to compare with ${input.metric}.`
        : `${input.metric} and days since a recorded ${input.medicationName} administration had a computed alignment of ${r}.`,
    evidence: [
      `${administrationDates.length} distinct recorded administration dates were available.`,
      `${observations.length} check-ins fell within ${maxDays} days of a recorded administration.`,
      `${distinctOffsets} different day offsets were represented.`,
    ],
    limitations: [
      'Administration timing and symptoms are observational; this does not establish a dosing effect or support a dose change.',
      ...(evidenceClass === 'worth_watching'
        ? ['At least six check-ins across three different day offsets and two recorded administrations are needed for an early signal.']
        : evidenceClass === 'early_signal'
          ? ['More administrations and check-ins are needed to know whether the timing pattern repeats.']
          : []),
    ],
    values: {
      correlation: r,
      pairCount: observations.length,
      administrationCount: administrationDates.length,
      distinctDayOffsets: distinctOffsets,
      maxDays,
    },
  };
}

export function compareLabsWithSymptoms(input: {
  labs: AnalysisLab[];
  checkins: AnalysisCheckin[];
  biomarker: AnalysisBiomarker;
  metric: AnalysisMetric;
}): AnalysisToolResult {
  const pairs: Array<{ date: string; lab: number; symptom: number; distance: number }> = [];
  for (const lab of input.labs) {
    const labValue = numeric(lab, input.biomarker);
    if (labValue === null) continue;
    const nearest = metricValues(input.checkins, input.metric)
      .map((row) => ({
        ...row,
        distance: Math.abs(daysBetween(lab.draw_date, row.date)),
      }))
      .filter((row) => row.distance <= 7)
      .sort((a, b) => a.distance - b.distance)[0];
    if (nearest) {
      pairs.push({
        date: lab.draw_date,
        lab: labValue,
        symptom: nearest.value,
        distance: nearest.distance,
      });
    }
  }
  const correlationPairs = pairs.map((row): [number, number] => [row.lab, row.symptom]);
  const r = correlation(correlationPairs);
  const stableWithoutOutlier = correlationIsStable(correlationPairs, r);
  const evidenceClass: AnalysisEvidenceClass =
    pairs.length < 2
      ? 'suppressed'
      : pairs.length < 3 || r === null
        ? 'worth_watching'
        : pairs.length < 5
          ? Math.abs(r) >= 0.7
            ? 'early_signal'
            : 'suppressed'
          : Math.abs(r) >= 0.5 && stableWithoutOutlier
            ? 'repeated_finding'
            : 'suppressed';
  return {
    tool: 'lab_symptom_comparison',
    evidenceClass,
    sufficient: evidenceClass === 'early_signal' || evidenceClass === 'repeated_finding',
    sampleSize: pairs.length,
    effectSize: r === null ? null : Math.abs(r),
    minimumRequired: 3,
    stableWithoutOutlier,
    repeatCount: pairs.length,
    identity: identity(
      { biomarker: input.biomarker, metric: input.metric, nearbyDays: 7 },
      pairs.map((row) => `${row.date}:${input.biomarker}:${input.metric}`),
    ),
    summary:
      r === null
        ? `There are not enough matched ${input.biomarker} and ${input.metric} observations.`
        : `${input.biomarker} and nearby ${input.metric} values had a computed alignment of ${r}.`,
    evidence: pairs.map(
      (row) =>
        `${row.date}: ${input.biomarker} ${row.lab}; nearby ${input.metric} ${row.symptom} (${row.distance} days apart).`,
    ),
    limitations: [
      'Laboratory timing, dose timing, and other factors may affect this comparison.',
      'Nearby symptom scores are not measurements taken at the exact laboratory time.',
      ...(evidenceClass === 'worth_watching'
        ? ['A second pair can be described factually, but at least three pairs are needed for an early signal.']
        : evidenceClass === 'early_signal'
          ? ['Three or four laboratory comparisons are especially sensitive to one result.']
          : evidenceClass === 'suppressed' && pairs.length >= 3
            ? ['The apparent relationship is weak or unstable.']
            : []),
    ],
    values: { correlation: r, pairCount: pairs.length },
  };
}

export function identifyContradictoryEvidence(input: {
  results: AnalysisToolResult[];
}): AnalysisToolResult {
  const comparable = input.results.filter(
    (result) =>
      isMeaningfulAnalysisResult(result) &&
      (typeof result.values.delta === 'number' ||
        typeof result.values.correlation === 'number'),
  );
  const positive = comparable.filter((result) => {
    const value =
      typeof result.values.delta === 'number'
        ? result.values.delta
        : result.values.correlation;
    return typeof value === 'number' && value > 0.15;
  });
  const negative = comparable.filter((result) => {
    const value =
      typeof result.values.delta === 'number'
        ? result.values.delta
        : result.values.correlation;
    return typeof value === 'number' && value < -0.15;
  });
  const contradictory = positive.length > 0 && negative.length > 0;
  const evidenceClass: AnalysisEvidenceClass =
    comparable.length < 2
      ? 'worth_watching'
      : contradictory
        ? 'repeated_finding'
        : 'suppressed';
  return {
    tool: 'contradictory_evidence',
    evidenceClass,
    sufficient: comparable.length >= 2,
    sampleSize: comparable.length,
    effectSize: contradictory ? 1 : 0,
    minimumRequired: 2,
    stableWithoutOutlier: null,
    repeatCount: comparable.length,
    identity: identity(
      { comparedResultCount: comparable.length },
      comparable.flatMap((result) => result.identity.evidenceKeys),
    ),
    summary: contradictory
      ? 'The verified analyses point in different directions.'
      : 'The supplied verified analyses do not contain a clear directional contradiction.',
    evidence: comparable.map((result) => `${result.tool}: ${result.summary}`),
    limitations:
      comparable.length >= 2 ? [] : ['At least two sufficient analyses are required.'],
    values: {
      contradictory,
      positiveCount: positive.length,
      negativeCount: negative.length,
    },
  };
}

export function checkSufficiency(input: {
  observationCount: number;
  requiredCount: number;
  label: string;
}): AnalysisToolResult {
  const required = Math.max(1, Math.round(input.requiredCount));
  const count = Math.max(0, Math.round(input.observationCount));
  const sufficient = count >= required;
  return {
    tool: 'check_sufficiency',
    evidenceClass: sufficient ? 'fact' : 'worth_watching',
    sufficient,
    sampleSize: count,
    effectSize: null,
    minimumRequired: required,
    stableWithoutOutlier: null,
    repeatCount: count,
    identity: identity({ label: input.label, requiredCount: required }, []),
    summary:
      count >= required
        ? `${input.label} has ${count} observations, meeting the ${required}-observation minimum.`
        : `${input.label} has ${count} observations; ${required} are needed for this comparison.`,
    evidence: [`Observed ${count}; required ${required}.`],
    limitations: count >= required ? [] : ['More comparable observations are needed.'],
    values: { observationCount: count, requiredCount: required },
  };
}

export function isMeaningfulAnalysisResult(result: AnalysisToolResult): boolean {
  return result.evidenceClass === 'early_signal' || result.evidenceClass === 'repeated_finding';
}

function canonicalIdentityValue(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(canonicalIdentityValue);
  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>)
        .sort(([left], [right]) => left.localeCompare(right))
        .map(([key, child]) => [key, canonicalIdentityValue(child)]),
    );
  }
  return value;
}

/** Stable across display order, Luna wording, and unrelated facts-packet changes. */
export function analysisResultKey(result: AnalysisToolResult): string {
  const source = JSON.stringify(canonicalIdentityValue({
    tool: result.tool,
    identity: result.identity,
  }));
  let hash = 0x811c9dc5;
  for (let index = 0; index < source.length; index += 1) {
    hash ^= source.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193);
  }
  return `luna-v1-${(hash >>> 0).toString(16).padStart(8, '0')}`;
}
