import { useState } from 'react';
import { ChevronDown, ChevronRight } from 'lucide-react';
import type { LabBiomarker } from '../../types/labs';
import { LabValueInput } from './LabValueInput';

interface LabPanelSectionProps {
  label: string;
  biomarkers: LabBiomarker[];
  values: Record<string, number | null>;
  previousValues: Record<string, number | null>;
  defaultExpanded?: boolean;
  onChange: (key: string, value: number | null) => void;
}

export function LabPanelSection({
  label,
  biomarkers,
  values,
  previousValues,
  defaultExpanded = false,
  onChange,
}: LabPanelSectionProps) {
  const [expanded, setExpanded] = useState(defaultExpanded);

  return (
    <div className="rounded-xl border border-sand-200 bg-sand-50">
      <button
        type="button"
        onClick={() => setExpanded(!expanded)}
        className="flex w-full items-center justify-between px-4 py-3 text-left"
        aria-expanded={expanded}
      >
        <span className="font-medium text-sage-800">
          {label}{' '}
          <span className="font-normal text-sage-400">({biomarkers.length} biomarkers)</span>
        </span>
        {expanded ? (
          <ChevronDown className="h-5 w-5 text-sage-400" />
        ) : (
          <ChevronRight className="h-5 w-5 text-sage-400" />
        )}
      </button>

      {expanded && (
        <div className="border-t border-sand-100 px-4 pb-2">
          {biomarkers.map((b) => (
            <LabValueInput
              key={b.key}
              biomarker={b}
              value={values[b.key] ?? null}
              previousValue={previousValues[b.key] ?? null}
              onChange={onChange}
            />
          ))}
        </div>
      )}
    </div>
  );
}
