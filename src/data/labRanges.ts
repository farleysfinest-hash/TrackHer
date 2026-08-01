import type { LabBiomarker, LabCategory, LabRangeStatus } from '../types/labs';

/**
 * Supported TrackHer analytes and storage units.
 *
 * The numeric intervals below are retained only as legacy input/chart bounds.
 * They are not shown or interpreted unless a reviewed referenceSource is added.
 * A laboratory's own reported interval remains the primary comparison context.
 */
export const LAB_BIOMARKERS: LabBiomarker[] = [
  { key: 'estradiol', label: 'Estradiol (E2)', unit: 'pg/mL', category: 'core_hrt', conventionalRange: { min: 0, max: 30 }, optimalRange: null },
  { key: 'estrone', label: 'Estrone (E1)', unit: 'pg/mL', category: 'core_hrt', conventionalRange: { min: 10, max: 50 }, optimalRange: null },
  { key: 'progesterone', label: 'Progesterone', unit: 'ng/mL', category: 'core_hrt', conventionalRange: { min: 0.2, max: 25 }, optimalRange: null },
  { key: 'total_testosterone', label: 'Total Testosterone', unit: 'ng/dL', category: 'core_hrt', conventionalRange: { min: 8, max: 48 }, optimalRange: null },
  { key: 'free_testosterone', label: 'Free Testosterone', unit: 'pg/mL', category: 'core_hrt', conventionalRange: { min: 0.1, max: 6.3 }, optimalRange: null },
  { key: 'dhea_s', label: 'DHEA-S', unit: 'mcg/dL', category: 'core_hrt', conventionalRange: { min: 35, max: 430 }, optimalRange: null },
  { key: 'shbg', label: 'SHBG', unit: 'nmol/L', category: 'core_hrt', conventionalRange: { min: 18, max: 144 }, optimalRange: null },
  { key: 'fsh', label: 'FSH', unit: 'mIU/mL', category: 'core_hrt', conventionalRange: { min: 10, max: 25 }, optimalRange: null },
  { key: 'lh', label: 'LH', unit: 'mIU/mL', category: 'core_hrt', conventionalRange: { min: 10, max: 15 }, optimalRange: null },
  { key: 'tsh', label: 'TSH', unit: 'mIU/L', category: 'thyroid', conventionalRange: { min: 0.4, max: 4.5 }, optimalRange: null },
  { key: 'free_t3', label: 'Free T3', unit: 'pg/mL', category: 'thyroid', conventionalRange: { min: 2.3, max: 4.2 }, optimalRange: null },
  { key: 'free_t4', label: 'Free T4', unit: 'ng/dL', category: 'thyroid', conventionalRange: { min: 0.8, max: 1.8 }, optimalRange: null },
  { key: 'cortisol_am', label: 'Cortisol (AM)', unit: 'mcg/dL', category: 'metabolic', conventionalRange: { min: 6, max: 23 }, optimalRange: null },
  { key: 'vitamin_d', label: 'Vitamin D (25-OH)', unit: 'ng/mL', category: 'metabolic', conventionalRange: { min: 30, max: 100 }, optimalRange: null },
  { key: 'ferritin', label: 'Ferritin', unit: 'ng/mL', category: 'metabolic', conventionalRange: { min: 12, max: 150 }, optimalRange: null },
  { key: 'fasting_insulin', label: 'Fasting Insulin', unit: 'mIU/L', category: 'metabolic', conventionalRange: { min: 2, max: 25 }, optimalRange: null },
  { key: 'hba1c', label: 'HbA1c', unit: '%', category: 'metabolic', conventionalRange: { min: 4, max: 5.6 }, optimalRange: null },
  { key: 'hs_crp', label: 'hs-CRP', unit: 'mg/L', category: 'metabolic', conventionalRange: { min: 0, max: 3 }, optimalRange: null },
  { key: 'homocysteine', label: 'Homocysteine', unit: 'umol/L', category: 'metabolic', conventionalRange: { min: 5, max: 15 }, optimalRange: null },
  { key: 'prolactin', label: 'Prolactin', unit: 'ng/mL', category: 'metabolic', conventionalRange: { min: 2, max: 29 }, optimalRange: null },
  { key: 'igf1', label: 'IGF-1', unit: 'ng/mL', category: 'metabolic', conventionalRange: { min: 80, max: 250 }, optimalRange: null },
  { key: 'total_cholesterol', label: 'Total Cholesterol', unit: 'mg/dL', category: 'lipid', conventionalRange: { min: 0, max: 200 }, optimalRange: null },
  { key: 'ldl', label: 'LDL Cholesterol', unit: 'mg/dL', category: 'lipid', conventionalRange: { min: 0, max: 100 }, optimalRange: null },
  { key: 'hdl', label: 'HDL Cholesterol', unit: 'mg/dL', category: 'lipid', conventionalRange: { min: 50, max: 200 }, optimalRange: null },
  { key: 'triglycerides', label: 'Triglycerides', unit: 'mg/dL', category: 'lipid', conventionalRange: { min: 0, max: 150 }, optimalRange: null },
];

export function getBiomarkerByKey(key: string): LabBiomarker | undefined {
  return LAB_BIOMARKERS.find((biomarker) => biomarker.key === key);
}

export const getLabBiomarker = getBiomarkerByKey;

export function getBiomarkersByCategory(category: LabCategory): LabBiomarker[] {
  return LAB_BIOMARKERS.filter((biomarker) => biomarker.category === category);
}

export function getLabRangeStatus(value: number, biomarker: LabBiomarker): LabRangeStatus {
  const { conventionalRange, referenceSource } = biomarker;
  if (!referenceSource || !conventionalRange) return 'conventional';
  if (value < conventionalRange.min) return 'low';
  if (value > conventionalRange.max) return 'high';
  return 'conventional';
}
