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
