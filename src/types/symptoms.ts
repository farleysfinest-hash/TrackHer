export type SymptomCategory = 'body' | 'digestive' | 'mind' | 'sexual_pelvic' | 'skin_hair';
export type MRSSubscale = 'somatic' | 'psychological' | 'urogenital';

export interface SymptomDefinition {
  key: string;
  label: string;
  description?: string;
  category: SymptomCategory;
  isMRSCore: boolean;
  mrsIndex?: number;
  mrsSubscale?: MRSSubscale;
  relatedHormones?: string[];
}
