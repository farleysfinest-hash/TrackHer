import { useState } from 'react';
import { Capacitor } from '@capacitor/core';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';
import {
  getHapticRuntimeStatus,
  selectionTick,
  success as hapticSuccess,
  tapLight,
  tapMedium,
} from '../../lib/haptics';

export function HapticDiagnosticsCard() {
  const [hapticTestResult, setHapticTestResult] = useState<string | null>(null);
  const showHapticDiagnostics = Capacitor.isNativePlatform() && Capacitor.DEBUG === true;
  const hapticStatus = getHapticRuntimeStatus();

  if (!showHapticDiagnostics) return null;

  const handleHapticTest = async (
    label: string,
    operation: () => Promise<boolean>,
  ) => {
    setHapticTestResult(`Testing ${label.toLowerCase()}…`);
    const resolved = await operation();
    const nextStatus = getHapticRuntimeStatus();
    console.info('[Haptics] diagnostic test', {
      test: label,
      bridgeCallResolved: resolved,
      ...nextStatus,
    });
    setHapticTestResult(
      resolved
        ? `${label} bridge call resolved. Confirm whether you felt it on the phone.`
        : `${label} failed or was unavailable. Check the Xcode console for details.`,
    );
  };

  return (
    <Card>
      <h2 className="font-display text-xl text-sage-800">Haptic diagnostics</h2>
      <p className="mt-1 text-sm text-sage-500">
        Temporary native debug controls. Test on the physical iPhone while watching the Xcode
        console.
      </p>
      <dl className="mt-4 grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
        <dt className="text-sage-500">Platform</dt>
        <dd className="font-medium text-sage-700">{hapticStatus.platform}</dd>
        <dt className="text-sage-500">Native runtime</dt>
        <dd className="font-medium text-sage-700">{String(hapticStatus.native)}</dd>
        <dt className="text-sage-500">Haptics plugin</dt>
        <dd className="font-medium text-sage-700">{String(hapticStatus.pluginAvailable)}</dd>
        <dt className="text-sage-500">Capacitor debug</dt>
        <dd className="font-medium text-sage-700">{String(hapticStatus.capacitorDebug)}</dd>
      </dl>
      <div className="mt-4 flex flex-wrap gap-2">
        <Button
          size="sm"
          variant="secondary"
          onClick={() => void handleHapticTest('Light impact', tapLight)}
        >
          Test light
        </Button>
        <Button
          size="sm"
          variant="secondary"
          onClick={() => void handleHapticTest('Medium impact', tapMedium)}
        >
          Test medium
        </Button>
        <Button
          size="sm"
          variant="secondary"
          onClick={() => void handleHapticTest('Selection tick', selectionTick)}
        >
          Test selection
        </Button>
        <Button
          size="sm"
          variant="secondary"
          onClick={() => void handleHapticTest('Success notification', hapticSuccess)}
        >
          Test success
        </Button>
      </div>
      {hapticTestResult && (
        <p role="status" className="mt-3 text-sm text-sage-600">
          {hapticTestResult}
        </p>
      )}
    </Card>
  );
}
