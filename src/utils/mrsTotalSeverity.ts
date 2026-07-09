import type { SeverityBands, SeverityLevel } from '../types/instruments';
import { getSeverityFromBands } from '../data/instruments/scoring';

/** Published MRS total-score severity bands (Heinemann et al. 2004, Health Qual Life Outcomes): 0–4 no/little, 5–8 mild, 9–15 moderate, 16+ severe. */
export const MRS_TOTAL_SEVERITY_BANDS: SeverityBands = {
  none: [0, 4],
  mild: [5, 8],
  moderate: [9, 15],
  severe: [16, 44],
};

export const MRS_SEVERITY_REFERENCE =
  'Scoring: 0–4 no/minimal, 5–8 mild, 9–15 moderate, 16+ severe (Heinemann et al., Health Qual Life Outcomes, 2004).';

export function getMrsTotalSeverityLevel(total: number): SeverityLevel {
  return getSeverityFromBands(total, MRS_TOTAL_SEVERITY_BANDS);
}
