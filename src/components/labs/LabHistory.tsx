import { useEffect } from 'react';
import { useLabResults } from '../../hooks/useLabResults';
import type { LabResult } from '../../types/database';
import { LabHistoryCard } from './LabHistoryCard';
import { LoadingSpinner } from '../ui/LoadingSpinner';

interface LabHistoryProps {
  onViewDetails: (lab: LabResult) => void;
}

export function LabHistory({ onViewDetails }: LabHistoryProps) {
  const { labResults, isLoading, fetchLabResults } = useLabResults();

  useEffect(() => {
    void fetchLabResults();
  }, [fetchLabResults]);

  if (isLoading) {
    return (
      <div className="flex justify-center py-12">
        <LoadingSpinner />
      </div>
    );
  }

  if (labResults.length === 0) {
    return null;
  }

  return (
    <div className="space-y-4">
      <h2 className="font-display text-xl text-sage-800">Past Lab Results</h2>
      <div className="space-y-4">
        {labResults.map((lab) => (
          <LabHistoryCard key={lab.id} lab={lab} onViewDetails={onViewDetails} />
        ))}
      </div>
    </div>
  );
}
