export const HORMONE_CATEGORIES = [
  {
    value: 'estrogen' as const,
    label: 'Estrogen',
    description:
      'Estradiol patches, creams, gels, pellets, troches, vaginal, oral, or injections',
  },
  {
    value: 'progesterone' as const,
    label: 'Progesterone',
    description: 'Oral capsules (Prometrium), creams, vaginal, rectal, or pellets',
  },
  {
    value: 'testosterone' as const,
    label: 'Testosterone',
    description: 'Compounded creams, troches, pellets, or injections',
  },
  {
    value: 'combination' as const,
    label: 'Combination',
    description:
      'Combination products (Bijuva, Combipatch) or combination pellets with multiple hormones',
  },
  {
    value: 'dhea' as const,
    label: 'DHEA',
    description: 'Oral supplement or vaginal (Intrarosa)',
  },
  {
    value: 'oxytocin' as const,
    label: 'Oxytocin',
    description: 'Compounded troches or nasal spray',
  },
  {
    value: 'thyroid' as const,
    label: 'Thyroid',
    description: 'Levothyroxine, liothyronine, desiccated thyroid (Armour, NP Thyroid)',
  },
  {
    value: 'supplement' as const,
    label: 'Supplement',
    description: 'Saw palmetto, pregnenolone, or other supplements in your protocol',
  },
  {
    value: 'other' as const,
    label: 'Other / Custom',
    description: 'Any medication not listed above',
  },
];

export const DELIVERY_METHOD_LABELS: Record<
  import('../types/database').DeliveryMethod,
  { label: string; description: string }
> = {
  patch: { label: 'Patch', description: 'Applied to the skin, changed once or twice weekly' },
  cream: { label: 'Cream', description: 'Applied to the skin daily' },
  gel: { label: 'Gel', description: 'Applied to the skin daily' },
  oral_capsule: { label: 'Oral Capsule', description: 'Taken by mouth, usually at bedtime' },
  oral_tablet: { label: 'Oral Tablet', description: 'Taken by mouth daily' },
  injection: { label: 'Injection', description: 'Intramuscular or subcutaneous injection' },
  pellet: { label: 'Pellet', description: 'Subcutaneous implant lasting 3-6 months' },
  troche: { label: 'Troche / Sublingual', description: 'Dissolved under the tongue or between cheek and gum' },
  sublingual: { label: 'Sublingual', description: 'Dissolved under the tongue' },
  vaginal_cream: { label: 'Vaginal Cream', description: 'Applied vaginally' },
  vaginal_tablet: { label: 'Vaginal Tablet', description: 'Inserted vaginally' },
  vaginal_ring: { label: 'Vaginal Ring', description: 'Inserted vaginally, changed every 90 days' },
  vaginal_suppository: { label: 'Vaginal Suppository', description: 'Inserted vaginally' },
  rectal: { label: 'Rectal Suppository', description: 'Used when oral or vaginal is not preferred' },
  nasal_spray: { label: 'Nasal Spray', description: 'Sprayed into the nose' },
  spray: { label: 'Topical Spray', description: 'Sprayed on the skin' },
  other: { label: 'Other', description: 'Custom delivery method' },
};

export const APPLICATION_SITE_LABELS: Record<string, string> = {
  lower_abdomen: 'Lower abdomen',
  upper_buttock: 'Upper buttock',
  hip: 'Hip',
  outer_arm: 'Outer arm',
  upper_arm: 'Upper arm',
  shoulder: 'Shoulder',
  inner_forearm: 'Inner forearm',
  upper_thigh: 'Upper thigh',
  inner_arm: 'Inner arm',
  inner_thigh: 'Inner thigh',
  behind_knee: 'Behind knee',
  chest: 'Chest',
};

export const TIME_OF_DAY_OPTIONS = [
  { value: '', label: 'No preference / not specified' },
  { value: 'bedtime', label: 'At bedtime' },
  { value: 'morning', label: 'Morning' },
  { value: 'evening', label: 'Evening' },
  { value: 'with_meals', label: 'With meals' },
] as const;

export const UNITS_PER_DOSE_OPTIONS = [
  { value: '1', label: '1' },
  { value: '2', label: '2' },
  { value: '3', label: '3' },
  { value: '4', label: '4' },
] as const;

export const FREQUENCY_OPTIONS: { value: import('../types/database').MedicationFrequency; label: string }[] = [
  { value: 'daily', label: 'Daily' },
  { value: 'twice_daily', label: 'Twice daily' },
  { value: 'three_times_daily', label: 'Three times daily' },
  { value: 'weekly', label: 'Once weekly' },
  { value: 'twice_weekly', label: 'Twice weekly' },
  { value: 'three_times_weekly', label: 'Three times weekly' },
  { value: 'every_other_day', label: 'Every other day' },
  { value: 'every_two_weeks', label: 'Every 2 weeks' },
  { value: 'every_three_weeks', label: 'Every 3 weeks' },
  { value: 'every_four_weeks', label: 'Every 4 weeks' },
  { value: 'monthly', label: 'Monthly' },
  { value: 'cyclic', label: 'Cyclic' },
  { value: 'as_needed', label: 'As needed' },
  { value: 'custom', label: 'Custom schedule' },
  { value: 'every_three_months', label: 'Every 3 months' },
  { value: 'every_four_months', label: 'Every 4 months' },
  { value: 'every_five_months', label: 'Every 5 months' },
  { value: 'every_six_months', label: 'Every 6 months' },
];

export const DISCONTINUE_REASONS = [
  { value: 'switched', label: 'Switched to different medication' },
  { value: 'side_effects', label: 'Side effects' },
  { value: 'provider', label: 'Provider recommended stopping' },
  { value: 'cost', label: 'Cost / insurance' },
  { value: 'felt_well', label: 'Felt well enough to stop' },
  { value: 'other', label: 'Other' },
] as const;
