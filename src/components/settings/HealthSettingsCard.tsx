import { useEffect, useState } from 'react';
import { Watch } from 'lucide-react';
import { Card } from '../ui/Card';
import { useHealthStore } from '../../stores/healthStore';

/**
 * Settings card for connecting Apple Health / Health Connect.
 * Only rendered when the device supports the health SDK.
 */
export function HealthSettingsCard() {
  const available = useHealthStore((s) => s.available);
  const enabled = useHealthStore((s) => s.enabled);
  const snapshot = useHealthStore((s) => s.snapshot);
  const loading = useHealthStore((s) => s.loading);
  const setEnabled = useHealthStore((s) => s.setEnabled);
  const checkAvailability = useHealthStore((s) => s.checkAvailability);
  const [toggling, setToggling] = useState(false);

  useEffect(() => {
    if (available === null) void checkAvailability();
  }, [available, checkAvailability]);

  // Don't render on web or devices without HealthKit.
  if (available === null || available === false) return null;

  const handleToggle = async () => {
    setToggling(true);
    try {
      await setEnabled(!enabled);
    } finally {
      setToggling(false);
    }
  };

  return (
    <Card>
      <div className="flex items-start gap-3">
        <div className="mt-0.5 rounded-lg bg-sage-100 p-2 text-sage-600">
          <Watch className="h-5 w-5" aria-hidden />
        </div>
        <div className="min-w-0 flex-1">
          <h2 className="font-display text-xl text-sage-800">Apple Health</h2>
          <p className="mt-1 text-sm text-sage-500">
            Import sleep duration and resting heart rate to auto-fill your daily
            pulse check-in.
          </p>

          <div className="mt-4 flex items-center justify-between">
            <span className="text-sm font-medium text-sage-700">
              {enabled ? 'Connected' : 'Disconnected'}
            </span>
            <button
              type="button"
              role="switch"
              aria-checked={enabled}
              disabled={toggling || loading}
              onClick={() => void handleToggle()}
              className={[
                'relative inline-flex h-7 w-12 shrink-0 items-center rounded-full transition-colors',
                enabled ? 'bg-sage-500' : 'bg-sand-300',
                (toggling || loading) ? 'opacity-50' : '',
              ].join(' ')}
            >
              <span
                className={[
                  'inline-block h-5 w-5 rounded-full bg-white shadow transition-transform',
                  enabled ? 'translate-x-6' : 'translate-x-1',
                ].join(' ')}
              />
            </button>
          </div>

          {enabled && snapshot && (
            <div className="mt-3 rounded-lg bg-sage-50/60 px-3 py-2 text-xs text-sage-500">
              {snapshot.sleep
                ? `Last sleep: ${Math.floor(snapshot.sleep.totalMinutes / 60)}h ${snapshot.sleep.totalMinutes % 60}m`
                : 'No recent sleep data'}
              {snapshot.restingHR
                ? ` · Resting HR: ${snapshot.restingHR.bpm} bpm`
                : ''}
            </div>
          )}

          {enabled && !snapshot && !loading && (
            <p className="mt-3 text-xs text-sage-400">
              No health data found. Make sure TrackHer has permission in your
              device&apos;s Health settings.
            </p>
          )}
        </div>
      </div>
    </Card>
  );
}
