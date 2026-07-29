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

/** Rule: active meds present and fewer than `minMrs` complete weekly check-ins. */
export function buildGapCoachMessage(
  activeMedCount: number,
  mrsCheckinCount: number,
  minMrs = 3,
): string | null {
  if (activeMedCount <= 0) return null;
  if (mrsCheckinCount >= minMrs) return null;
  if (mrsCheckinCount === 0) {
    return `You're already tracking medication — a few weekly check-ins will help your companion and pattern insights reflect how you're actually feeling alongside those doses.`;
  }
  return `You've logged medication and ${mrsCheckinCount} weekly check-in${mrsCheckinCount === 1 ? '' : 's'}. A couple more weeks of scores will make trends much clearer — no rush, just whenever you can.`;
}
