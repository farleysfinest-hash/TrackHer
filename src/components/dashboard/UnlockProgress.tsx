const FULL_DASHBOARD_CHECKINS = 7;

function getUnlockMessage(checkinCount: number): string | null {
  if (checkinCount >= FULL_DASHBOARD_CHECKINS) return null;
  if (checkinCount < 2) {
    const remaining = 2 - checkinCount;
    return remaining === 1
      ? '1 more check-in unlocks your first comparison'
      : `${remaining} more check-ins unlock your first comparison`;
  }
  if (checkinCount < 3) {
    const remaining = 3 - checkinCount;
    return remaining === 1
      ? '1 more check-in unlocks trend detection'
      : `${remaining} more check-ins unlock trend detection`;
  }
  const remaining = FULL_DASHBOARD_CHECKINS - checkinCount;
  return remaining === 1
    ? '1 more check-in unlocks your symptom heatmap and full dashboard'
    : `${remaining} more check-ins unlock your symptom heatmap and full dashboard`;
}

interface UnlockProgressProps {
  checkinCount: number;
}

export function UnlockProgress({ checkinCount }: UnlockProgressProps) {
  const message = getUnlockMessage(checkinCount);
  if (!message) return null;

  const progress = Math.min(checkinCount / FULL_DASHBOARD_CHECKINS, 1);

  return (
    <div className="flex items-center gap-3 rounded-lg border border-sand-200 bg-sand-50/50 px-4 py-3">
      <div
        className="h-1.5 w-16 shrink-0 overflow-hidden rounded-full bg-sage-100"
        role="progressbar"
        aria-valuenow={checkinCount}
        aria-valuemin={0}
        aria-valuemax={FULL_DASHBOARD_CHECKINS}
        aria-label="Check-in progress toward full dashboard"
      >
        <div
          className="h-full rounded-full bg-sage-400 transition-all duration-300"
          style={{ width: `${progress * 100}%` }}
        />
      </div>
      <p className="text-sm text-sage-500">{message}</p>
    </div>
  );
}
