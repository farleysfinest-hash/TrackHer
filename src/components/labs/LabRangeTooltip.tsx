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
      className="mt-2 rounded-lg border border-sand-200 bg-white p-4 text-sm shadow-sm"
      role="tooltip"
    >
      <p className="font-medium text-sage-800">
        {biomarker.label} ({biomarker.unit})
      </p>
      <p className="mt-2 text-sage-600">{biomarker.context}</p>
      <p className="mt-2 text-xs text-sage-500">{formatRangeLine(biomarker)}</p>
      {biomarker.warningLow && (
        <p className="mt-2 text-xs text-sage-600">
          <span className="font-medium">Low: </span>
          {biomarker.warningLow}
        </p>
      )}
      {biomarker.warningHigh && (
        <p className="mt-1 text-xs text-sage-600">
          <span className="font-medium">High: </span>
          {biomarker.warningHigh}
        </p>
      )}
      <p className="mt-3 text-xs italic text-sage-400">
        Always discuss your results with your healthcare provider.
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
