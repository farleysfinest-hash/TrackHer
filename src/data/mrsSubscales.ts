/** MRS subscale palette — a lightness-separated rose ramp. */
export const MRS_SUBSCALE_COLORS = {
  psychological: '#7a3b5e',
  somatic: '#a64d79',
  urogenital: '#e0a8c6',
  urogenitalDotOutline: '#a64d79',
} as const;

export const MRS_SUBSCALES = [
  {
    dataKey: 'psychological' as const,
    plainLabel: 'Mood & sleep',
    clinicalLabel: 'Psychological',
    color: MRS_SUBSCALE_COLORS.psychological,
    dotFill: MRS_SUBSCALE_COLORS.psychological,
    dotStroke: MRS_SUBSCALE_COLORS.psychological,
    dotStrokeWidth: 0,
  },
  {
    dataKey: 'somatic' as const,
    plainLabel: 'Body & hot flashes',
    clinicalLabel: 'Vasomotor',
    color: MRS_SUBSCALE_COLORS.somatic,
    dotFill: MRS_SUBSCALE_COLORS.somatic,
    dotStroke: MRS_SUBSCALE_COLORS.somatic,
    dotStrokeWidth: 0,
  },
  {
    dataKey: 'urogenital' as const,
    plainLabel: 'Bladder & intimacy',
    clinicalLabel: 'Urogenital',
    color: MRS_SUBSCALE_COLORS.urogenital,
    dotFill: MRS_SUBSCALE_COLORS.urogenital,
    dotStroke: MRS_SUBSCALE_COLORS.urogenitalDotOutline,
    dotStrokeWidth: 0.75,
  },
] as const;

export const MRS_SUBSCALE_DESCRIPTION = MRS_SUBSCALES.map((s) => s.plainLabel).join(' · ');
