/** Option C subscale palette — distinct at a glance, rose-family coherent. */
export const MRS_SUBSCALE_COLORS = {
  psychological: '#4a2338',
  somatic: '#a64d79',
  urogenital: '#e5aac8',
  urogenitalDotOutline: '#a64d79',
} as const;

export type SubscaleMarkerShape = 'circle' | 'diamond' | 'square';

export const MRS_SUBSCALES = [
  {
    dataKey: 'psychological' as const,
    plainLabel: 'Mood & sleep',
    clinicalLabel: 'Psychological',
    color: MRS_SUBSCALE_COLORS.psychological,
    dotFill: MRS_SUBSCALE_COLORS.psychological,
    dotStroke: MRS_SUBSCALE_COLORS.psychological,
    dotStrokeWidth: 0,
    markerShape: 'diamond' as SubscaleMarkerShape,
    dotRadius: 4.5,
  },
  {
    dataKey: 'somatic' as const,
    plainLabel: 'Body & hot flashes',
    clinicalLabel: 'Vasomotor',
    color: MRS_SUBSCALE_COLORS.somatic,
    dotFill: MRS_SUBSCALE_COLORS.somatic,
    dotStroke: MRS_SUBSCALE_COLORS.somatic,
    dotStrokeWidth: 0,
    markerShape: 'circle' as SubscaleMarkerShape,
    dotRadius: 5,
  },
  {
    dataKey: 'urogenital' as const,
    plainLabel: 'Bladder & intimacy',
    clinicalLabel: 'Urogenital',
    color: MRS_SUBSCALE_COLORS.urogenital,
    dotFill: MRS_SUBSCALE_COLORS.urogenital,
    dotStroke: MRS_SUBSCALE_COLORS.urogenitalDotOutline,
    dotStrokeWidth: 0.5,
    markerShape: 'square' as SubscaleMarkerShape,
    dotRadius: 4,
  },
] as const;

export const MRS_SUBSCALE_DESCRIPTION = MRS_SUBSCALES.map((s) => s.plainLabel).join(' · ');
