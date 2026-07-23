/** MRS subscale palette — a lightness-separated rose ramp. */
export const MRS_SUBSCALE_COLORS = {
  psychological: 'var(--color-chart-line-primary)',
  somatic: 'var(--color-chart-dot)',
  urogenital: 'var(--color-chart-urogenital)',
  urogenitalDotOutline: 'var(--color-chart-dot)',
} as const;

/** Per-subscale ceilings from MRS (4+4+3 items × 0–4 → 16+16+12 = 44). */
export const MRS_SUBSCALES = [
  {
    dataKey: 'psychological' as const,
    plainLabel: 'Mood & sleep',
    clinicalLabel: 'Psychological',
    maxScore: 16,
    color: MRS_SUBSCALE_COLORS.psychological,
    dotFill: MRS_SUBSCALE_COLORS.psychological,
    dotStroke: MRS_SUBSCALE_COLORS.psychological,
    dotStrokeWidth: 0,
  },
  {
    dataKey: 'somatic' as const,
    plainLabel: 'Body & hot flashes',
    clinicalLabel: 'Vasomotor',
    maxScore: 16,
    color: MRS_SUBSCALE_COLORS.somatic,
    dotFill: MRS_SUBSCALE_COLORS.somatic,
    dotStroke: MRS_SUBSCALE_COLORS.somatic,
    dotStrokeWidth: 0,
  },
  {
    dataKey: 'urogenital' as const,
    plainLabel: 'Bladder & intimacy',
    clinicalLabel: 'Urogenital',
    maxScore: 12,
    color: MRS_SUBSCALE_COLORS.urogenital,
    dotFill: MRS_SUBSCALE_COLORS.urogenital,
    dotStroke: MRS_SUBSCALE_COLORS.urogenitalDotOutline,
    dotStrokeWidth: 0.75,
  },
] as const;

export const MRS_SUBSCALE_DESCRIPTION = MRS_SUBSCALES.map((s) => s.plainLabel).join(' · ');
