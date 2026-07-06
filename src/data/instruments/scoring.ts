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

export function storageToInstrumentResponses(
  storageScores: Record<string, number | null | undefined>,
  instrument: InstrumentDefinition,
): Record<string, number> {
  const responses: Record<string, number> = {};
  for (const item of instrument.items) {
    const key = getItemStorageKey(item);
    const value = storageScores[key];
    if (value !== null && value !== undefined) {
      responses[item.id] = value;
    }
  }
  return responses;
}

export function scoreInstrument(
  storageScores: Record<string, number | null | undefined>,
  instrument: InstrumentDefinition,
  completedAt?: string,
): InstrumentScore {
  const responses = storageToInstrumentResponses(storageScores, instrument);
  const score = instrument.scoringFunction(responses);
  return {
    ...score,
    completedAt: completedAt ?? new Date().toISOString(),
  };
}

export function sumSubscale(
  responses: Record<string, number>,
  itemIds: string[],
): number {
  return itemIds.reduce((sum, id) => sum + (responses[id] ?? 0), 0);
}

export function meanSubscale(
  responses: Record<string, number>,
  itemIds: string[],
): number {
  if (itemIds.length === 0) return 0;
  const rated = itemIds.filter((id) => responses[id] !== undefined);
  if (rated.length === 0) return 0;
  return rated.reduce((sum, id) => sum + responses[id], 0) / rated.length;
}

export function buildInstrumentScore(
  instrument: InstrumentDefinition,
  responses: Record<string, number>,
  completedAt?: string,
): InstrumentScore {
  const subscales: InstrumentScore['subscales'] = {};

  for (const subscale of instrument.subscales) {
    let score: number;
    if (instrument.scoringMethod === 'sum') {
      score = sumSubscale(responses, subscale.items);
    } else {
      score = meanSubscale(responses, subscale.items);
    }
    subscales[subscale.id] = {
      score,
      severity: getSeverityFromBands(score, subscale.severityBands),
    };
  }

  let total: number;
  if (instrument.scoringMethod === 'sum') {
    total = instrument.items.reduce((sum, item) => sum + (responses[item.id] ?? 0), 0);
  } else if (instrument.scoringMethod === 'scaled_mean') {
    const domainScores = instrument.subscales.map((s) => subscales[s.id]?.score ?? 0);
    const domainMean =
      domainScores.length > 0
        ? domainScores.reduce((a, b) => a + b, 0) / domainScores.length
        : 0;
    total = Math.round(domainMean * 25 * 10) / 10;
  } else {
    const values = instrument.items
      .map((item) => responses[item.id])
      .filter((v): v is number => v !== undefined);
    total = values.length > 0 ? values.reduce((a, b) => a + b, 0) / values.length : 0;
  }

  return {
    instrumentId: instrument.id,
    total,
    totalSeverity: getSeverityFromBands(total, instrument.totalSeverityBands),
    subscales,
    completedAt: completedAt ?? new Date().toISOString(),
    itemResponses: { ...responses },
  };
}
