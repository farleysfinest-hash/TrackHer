import { useEffect, useState } from 'react';
import { Check, ClipboardList } from 'lucide-react';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import {
  clearVisitDebriefStorage,
  clampVisitDebriefPack,
  writeVisitDebriefToStorage,
  type VisitDebriefPack,
} from '../../utils/aiVisitDebrief';
import { CompanionRiskNotice } from './CompanionRiskNotice';

interface VisitDebriefCardProps {
  pack: VisitDebriefPack;
  onCleared?: () => void;
}

/** Checklist from a visit debrief — localStorage only. */
export function VisitDebriefCard({ pack: initial, onCleared }: VisitDebriefCardProps) {
  const [pack, setPack] = useState(() => clampVisitDebriefPack(initial) ?? initial);

  useEffect(() => {
    const next = clampVisitDebriefPack(initial) ?? initial;
    setPack(next);
    // Persist the cleaned checklist so the redundant row does not return.
    if (next.followUps.length !== initial.followUps.length) {
      writeVisitDebriefToStorage(next);
    }
  }, [initial]);

  const toggle = (index: number) => {
    const next: VisitDebriefPack = {
      ...pack,
      followUps: pack.followUps.map((f, i) =>
        i === index ? { ...f, done: !f.done } : f,
      ),
    };
    setPack(next);
    writeVisitDebriefToStorage(next);
  };

  const clear = () => {
    clearVisitDebriefStorage();
    onCleared?.();
  };

  return (
    <Card variant="outlined" padding="md" className="border-sage-200">
      <div className="flex items-start gap-3">
        <div className="mt-0.5 rounded-lg bg-sand-100 p-2 text-sage-600">
          <ClipboardList className="h-5 w-5" />
        </div>
        <div className="min-w-0 flex-1 space-y-3">
          {pack.riskReply ? <CompanionRiskNotice reply={pack.riskReply} /> : null}
          {pack.planSummary ? (
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-sage-500">
                After your visit
              </p>
              <p className="mt-1 text-sm leading-relaxed text-sage-700">{pack.planSummary}</p>
            </div>
          ) : null}
          {pack.followUps.length > 0 && (
            <ul className="space-y-2">
              {pack.followUps.map((f, i) => (
                <li key={`${f.label}-${i}`}>
                  <button
                    type="button"
                    onClick={() => toggle(i)}
                    className="flex w-full items-start gap-2 rounded-lg border border-sand-200 bg-sand-50 px-3 py-2 text-left text-sm hover:border-sage-300"
                  >
                    <span
                      className={[
                        'mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded border',
                        f.done
                          ? 'border-sage-500 bg-sage-500 text-on-accent'
                          : 'border-sage-300 bg-sand-50',
                      ].join(' ')}
                    >
                      {f.done ? <Check className="h-3 w-3" /> : null}
                    </span>
                    <span className={f.done ? 'text-sage-500 line-through' : 'text-sage-800'}>
                      {f.label}
                      {f.timeframe ? (
                        <span className="mt-0.5 block text-xs text-sage-500">
                          {f.timeframe}
                        </span>
                      ) : null}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
          <Button type="button" variant="ghost" size="sm" onClick={clear}>
            Clear debrief
          </Button>
        </div>
      </div>
    </Card>
  );
}
