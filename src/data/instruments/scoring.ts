import type { InstrumentDefinition, InstrumentScore, SeverityBands, SeverityLevel } from '../../types/instruments';

export function getSeverityFromBands(score: number, bands: SeverityBands): SeverityLevel {
  if (score >= bands.severe[0] && score <= bands.severe[1]) return 'severe';
  if (score >= bands.moderate[0] && score <= bands.moderate[1]) return 'moderate';
  if (score >= bands.mild[0] && score <= bands.mild[1]) return 'mild';
  return 'none';
}

export function getSeverityLabel(severity: SeverityLevel): string {
  const labels: Record<SeverityLevel, string> = {
    none: 'None / minimal',
    mild: 'Mild',
    moderate: 'Moderate',
    severe: 'Severe',
  };
  return labels[severity];
}

export function getItemStorageKey(item: InstrumentDefinition['items'][number]): string {
  return item.storageKey ?? item.id;
}

/** Maps instrument items to response values; null means unanswered (distinct from answered 0). */
export function storageToInstrumentResponses(
  storageScores: Record<string, number | null | undefined>,
  instrument: InstrumentDefinition,
): Record<string, number | null> {
  const responses: Record<string, number | null> = {};
  for (const item of instrument.items) {
    const key = getItemStorageKey(item);
    const value = storageScores[key];
    responses[item.id] = value !== null && value !== undefined ? value : null;
  }
  return responses;
}

export function getMissingInstrumentItemIds(
  responses: Record<string, number | null>,
  instrument: InstrumentDefinition,
): string[] {
  return instrument.items
    .filter((item) => responses[item.id] === null || responses[item.id] === undefined)
    .map((item) => item.id);
}

export function isInstrumentComplete(
  storageScores: Record<string, number | null | undefined>,
  instrument: InstrumentDefinition,
): boolean {
  return instrument.items.every((item) => {
    const value = storageScores[getItemStorageKey(item)];
    return value !== null && value !== undefined;
  });
}

export function scoreInstrument(
  storageScores: Record<string, number | null | undefined>,
  instrument: InstrumentDefinition,
  completedAt?: string,
): InstrumentScore {
  const responses = storageToInstrumentResponses(storageScores, instrument);
  const missingItemIds = getMissingInstrumentItemIds(responses, instrument);
  const missingItemCount = missingItemIds.length;
  const isComplete = missingItemCount === 0;

  const score = buildInstrumentScore(instrument, responses, completedAt, isComplete, missingItemCount);
  return score;
}

export function sumSubscale(
  responses: Record<string, number | null>,
  itemIds: string[],
): number | null {
  let sum = 0;
  for (const id of itemIds) {
    const value = responses[id];
    if (value === null || value === undefined) return null;
    sum += value;
  }
  return sum;
}

export function meanSubscale(
  responses: Record<string, number | null>,
  itemIds: string[],
): number | null {
  if (itemIds.length === 0) return null;
  let sum = 0;
  for (const id of itemIds) {
    const value = responses[id];
    if (value === null || value === undefined) return null;
    sum += value;
  }
  return sum / itemIds.length;
}

export function buildInstrumentScore(
  instrument: InstrumentDefinition,
  responses: Record<string, number | null>,
  completedAt?: string,
  isComplete?: boolean,
  missingItemCount?: number,
): InstrumentScore {
  const missing =
    missingItemCount ??
    instrument.items.filter(
      (item) => responses[item.id] === null || responses[item.id] === undefined,
    ).length;
  const complete =
    isComplete ?? missing === 0;

  const subscales: InstrumentScore['subscales'] = {};

  for (const subscale of instrument.subscales) {
    const score =
      instrument.scoringMethod === 'sum'
        ? sumSubscale(responses, subscale.items)
        : meanSubscale(responses, subscale.items);
    subscales[subscale.id] = {
      score,
      severity: score !== null ? getSeverityFromBands(score, subscale.severityBands) : null,
    };
  }

  let total: number | null = null;
  let totalSeverity: SeverityLevel | null = null;

  if (complete) {
    if (instrument.scoringMethod === 'sum') {
      total = instrument.items.reduce((sum, item) => sum + (responses[item.id] as number), 0);
    } else if (instrument.scoringMethod === 'scaled_mean') {
      const domainScores = instrument.subscales.map((s) => subscales[s.id]?.score as number);
      const domainMean =
        domainScores.length > 0
          ? domainScores.reduce((a, b) => a + b, 0) / domainScores.length
          : 0;
      total = Math.round(domainMean * 25 * 10) / 10;
    } else {
      total = meanSubscale(
        responses,
        instrument.items.map((item) => item.id),
      );
    }
    if (total !== null) {
      totalSeverity = getSeverityFromBands(total, instrument.totalSeverityBands);
    }
  }

  const itemResponses: Record<string, number> = {};
  for (const item of instrument.items) {
    const value = responses[item.id];
    if (value !== null && value !== undefined) {
      itemResponses[item.id] = value;
    }
  }

  return {
    instrumentId: instrument.id,
    total,
    totalSeverity,
    subscales,
    completedAt: completedAt ?? new Date().toISOString(),
    itemResponses,
    isComplete: complete,
    missingItemCount: missing,
  };
}
