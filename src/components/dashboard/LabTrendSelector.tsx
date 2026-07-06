import { LAB_BIOMARKERS } from '../../data/labRanges';
import { LAB_CATEGORIES } from '../../utils/labHelpers';
import type { LabResult } from '../../types/database';
import { getBiomarkerValue } from '../../utils/labHelpers';

interface LabTrendSelectorProps {
  labResults: LabResult[];
  selectedKey: string;
  onChange: (key: string) => void;
}

function getAvailableBiomarkers(labResults: LabResult[]): string[] {
  const keys = new Set<string>();
  for (const lab of labResults) {
    for (const b of LAB_BIOMARKERS) {
      if (getBiomarkerValue(lab, b.key) !== null) {
        keys.add(b.key);
      }
    }
  }
  return [...keys];
}

export function LabTrendSelector({ labResults, selectedKey, onChange }: LabTrendSelectorProps) {
  const available = getAvailableBiomarkers(labResults);

  if (available.length === 0) return null;

  return (
    <>
      <label htmlFor="lab-trend-select" className="sr-only">
        Select biomarker
      </label>
      <select
        id="lab-trend-select"
        value={selectedKey}
        onChange={(e) => onChange(e.target.value)}
        className="w-full min-w-[10rem] rounded-lg border border-sand-200 bg-white px-3 py-2 text-sm text-sage-700 focus:border-sage-400 focus:outline-none focus:ring-1 focus:ring-sage-400 sm:w-auto sm:max-w-xs"
      >
        {LAB_CATEGORIES.map((cat) => {
          const biomarkers = LAB_BIOMARKERS.filter(
            (b) => b.category === cat.key && available.includes(b.key),
          );
          if (biomarkers.length === 0) return null;
          return (
            <optgroup key={cat.key} label={cat.label}>
              {biomarkers.map((b) => (
                <option key={b.key} value={b.key}>
                  {b.label}
                </option>
              ))}
            </optgroup>
          );
        })}
      </select>
    </>
  );
}

export function getDefaultBiomarkerKey(labResults: LabResult[]): string {
  const available = getAvailableBiomarkers(labResults);
  if (available.includes('estradiol')) return 'estradiol';
  return available[0] ?? 'estradiol';
}
