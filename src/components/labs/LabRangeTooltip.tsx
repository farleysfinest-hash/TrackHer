import type { LabBiomarker } from '../../types/labs';
import { formatRangeLine } from '../../utils/labHelpers';

interface LabRangeTooltipProps {
  biomarker: LabBiomarker;
  isOpen: boolean;
  onClose: () => void;
}

export function LabRangeTooltip({ biomarker, isOpen, onClose }: LabRangeTooltipProps) {
  if (!isOpen) return null;

  return (
    <div
      className="mt-2 rounded-lg border border-sand-200 bg-sand-50 p-4 text-sm shadow-sm"
      role="tooltip"
    >
      <p className="font-medium text-sage-800">
        {biomarker.label} ({biomarker.unit})
      </p>
      <p className="mt-2 text-xs text-sage-500">{formatRangeLine(biomarker)}</p>
      <p className="mt-2 text-xs leading-relaxed text-sage-600">
        Laboratory intervals vary with methods, units, timing, and reference populations. TrackHer
        will use the interval from your report when you import and confirm it. An interval is not a
        personal treatment target.
      </p>
      <p className="mt-3 text-xs leading-relaxed text-sage-500">
        Being inside a range does not by itself show whether your symptoms are controlled or whether
        treatment is right for you. Discuss the result and how you feel with your doctor.
      </p>
      <button
        type="button"
        onClick={onClose}
        className="mt-2 text-xs font-medium text-sage-600 hover:text-sage-800"
      >
        Close
      </button>
    </div>
  );
}
