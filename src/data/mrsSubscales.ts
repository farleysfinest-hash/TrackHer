import { CHART_COLORS } from '../utils/chartHelpers';

export const MRS_SUBSCALES = [
  {
    dataKey: 'somatic' as const,
    plainLabel: 'Body & hot flashes',
    clinicalLabel: 'Vasomotor',
    color: CHART_COLORS.somatic,
  },
  {
    dataKey: 'psychological' as const,
    plainLabel: 'Mood & sleep',
    clinicalLabel: 'Psychological',
    color: CHART_COLORS.psychological,
  },
  {
    dataKey: 'urogenital' as const,
    plainLabel: 'Bladder & intimacy',
    clinicalLabel: 'Urogenital',
    color: CHART_COLORS.urogenital,
  },
] as const;

export const MRS_SUBSCALE_DESCRIPTION = MRS_SUBSCALES.map((s) => s.plainLabel).join(' · ');
