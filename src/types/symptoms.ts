import type { StrawStageCode } from '../lib/strawStaging';

export type SymptomCategory = 'body' | 'digestive' | 'mind' | 'sexual_pelvic' | 'skin_hair';
export type MRSSubscale = 'somatic' | 'psychological' | 'urogenital';

export type SymptomBodySystem =
  | 'vasomotor'
  | 'mood'
  | 'cognitive'
  | 'sleep'
  | 'musculoskeletal'
  | 'energy'
  | 'cardiovascular'
  | 'genitourinary'
  | 'digestive'
  | 'skin_hair_nails'
  | 'neurological'
  | 'other';

export const SYMPTOM_BODY_SYSTEM_LABELS: Record<SymptomBodySystem, string> = {
  vasomotor: 'Vasomotor',
  mood: 'Mood & Emotions',
  cognitive: 'Cognitive',
  sleep: 'Sleep',
  musculoskeletal: 'Musculoskeletal',
  energy: 'Energy',
  cardiovascular: 'Cardiovascular',
  genitourinary: 'Genitourinary',
  digestive: 'Digestive',
  skin_hair_nails: 'Skin / Hair / Nails',
  neurological: 'Neurological',
  other: 'Other',
};

/**
 * Identity hues — they answer "which system is this", never "how bad".
 * Muted, no-valence, no red/orange/amber. Judgment stays rose depth;
 * celebration stays moss. Approved via render-size mockup Jul 12 2026.
 */
export const SYMPTOM_BODY_SYSTEM_COLORS: Record<SymptomBodySystem, string> = {
  vasomotor: '#be739a',        // rose — heat, the house hue
  mood: '#8e4552',             // garnet — hot, not a siren
  cognitive: '#6c6382',        // fog violet
  sleep: '#56699c',            // twilight indigo
  musculoskeletal: '#a68a4a',  // bone gold
  energy: '#918b85',           // washed gray — drained
  cardiovascular: '#a04f7f',   // mulberry
  genitourinary: '#a3766a',    // soft copper
  digestive: '#4f7a74',        // deep teal
  skin_hair_nails: '#a892bd',  // lilac
  neurological: '#6f8f85',     // menthol — what you rub on your temples
  other: '#6e7580',            // slate
};

export interface SymptomDefinition {
  key: string;
  label: string;
  /** Compact label for chip/tap contexts when full label would collide with another watched symptom. */
  shortLabel?: string;
  description?: string;
  category: SymptomCategory;
  bodySystem: SymptomBodySystem;
  isMRSCore: boolean;
  mrsIndex?: number;
  mrsSubscale?: MRSSubscale;
  relatedHormones?: string[];
  phasePeak: StrawStageCode[];
  tier: number;
}
