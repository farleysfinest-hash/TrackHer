export type LabCategory = 'core_hrt' | 'thyroid' | 'metabolic' | 'lipid';

export interface LabBiomarker {
  key: string;
  label: string;
  unit: string;
  category: LabCategory;
  conventionalRange: { min: number; max: number } | null;
  optimalRange: { min: number; max: number } | null;
  context: string;
  warningHigh?: string;
  warningLow?: string;
}

export type LabRangeStatus = 'optimal' | 'conventional' | 'low' | 'high';
