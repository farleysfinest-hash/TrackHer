export type LabCategory = 'core_hrt' | 'thyroid' | 'metabolic' | 'lipid';

export interface LabBiomarker {
  key: string;
  label: string;
  unit: string;
  category: LabCategory;
  conventionalRange: { min: number; max: number } | null;
  optimalRange: { min: number; max: number } | null;
  referenceSource?: {
    label: string;
    url: string;
    scope: string;
    reviewedAt: string;
  };
}

export type LabRangeStatus = 'optimal' | 'conventional' | 'low' | 'high';

export type LabSourceType = 'manual' | 'photo' | 'pdf';

export type LabReportedFlag = 'low' | 'high' | 'normal' | 'abnormal' | 'unknown';

export interface LabReportedValue {
  reportedLabel: string;
  biomarkerKey: string | null;
  reportedValue: string;
  normalizedValue: number | null;
  comparator: '<' | '<=' | '>' | '>=' | null;
  reportedUnit: string | null;
  referenceLow: number | null;
  referenceHigh: number | null;
  referenceText: string | null;
  reportedFlag: LabReportedFlag;
  sourcePage: number | null;
  confidence: number;
}

export type LabReportedValues = Record<string, LabReportedValue>;
