import { Capacitor } from '@capacitor/core';
import { Haptics, ImpactStyle, NotificationType } from '@capacitor/haptics';

export interface HapticRuntimeStatus {
  platform: string;
  native: boolean;
  pluginAvailable: boolean;
  capacitorDebug: boolean;
}

export function getHapticRuntimeStatus(): HapticRuntimeStatus {
  return {
    platform: Capacitor.getPlatform(),
    native: Capacitor.isNativePlatform(),
    pluginAvailable: Capacitor.isPluginAvailable('Haptics'),
    capacitorDebug: Capacitor.DEBUG === true,
  };
}

function diagnosticsEnabled(): boolean {
  return Capacitor.DEBUG === true || import.meta.env.DEV;
}

function reportUnavailable(action: string, status: HapticRuntimeStatus): void {
  if (!diagnosticsEnabled()) return;
  console.warn(`[Haptics] ${action} skipped`, status);
}

function reportFailure(action: string, error: unknown, status: HapticRuntimeStatus): void {
  if (!diagnosticsEnabled()) return;
  console.error(`[Haptics] ${action} failed`, { ...status, error });
}

async function runHaptic(action: string, operation: () => Promise<void>): Promise<boolean> {
  const status = getHapticRuntimeStatus();
  if (!status.native || !status.pluginAvailable) {
    reportUnavailable(action, status);
    return false;
  }

  try {
    await operation();
    return true;
  } catch (error) {
    reportFailure(action, error, status);
    return false;
  }
}

/** Light impact — successful taps (dose log, quick log). */
export function tapLight(): Promise<boolean> {
  return runHaptic('light impact', () => Haptics.impact({ style: ImpactStyle.Light }));
}

/** Medium impact — long-press confirm (chart expand). */
export function tapMedium(): Promise<boolean> {
  return runHaptic('medium impact', () => Haptics.impact({ style: ImpactStyle.Medium }));
}

/** Success notification — full MRS save only. */
export function success(): Promise<boolean> {
  return runHaptic('success notification', () =>
    Haptics.notification({ type: NotificationType.Success }),
  );
}

/**
 * Selection tick for discrete control changes (severity slider).
 * Brackets with selectionStart/End so iOS treats it as a selection gesture.
 */
export function selectionTick(): Promise<boolean> {
  return runHaptic('selection tick', async () => {
    await Haptics.selectionStart();
    await Haptics.selectionChanged();
    await Haptics.selectionEnd();
  });
}
