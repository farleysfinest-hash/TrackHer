import { HeartHandshake } from 'lucide-react';
import { Card } from '../ui/Card';

interface GapCoachCardProps {
  message: string;
}

/** Deterministic gap coach when meds exist but weekly MRS history is thin. */
export function GapCoachCard({ message }: GapCoachCardProps) {
  return (
    <Card variant="outlined" padding="md" className="border-sage-200">
      <div className="flex items-start gap-3">
        <div className="mt-0.5 rounded-lg bg-sand-100 p-2 text-sage-500">
          <HeartHandshake className="h-5 w-5" />
        </div>
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-sage-500">
            A gentle nudge
          </p>
          <p className="mt-1 text-sm leading-relaxed text-sage-700">{message}</p>
        </div>
      </div>
    </Card>
  );
}
