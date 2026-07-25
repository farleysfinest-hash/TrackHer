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
 * Selection tick for a one-off discrete change (severity slider, daily channel
 * buttons, a single tap on a chart). Brackets with selectionStart/End so iOS
 * treats it as a complete selection gesture.
 *
 * Do NOT call this repeatedly during a continuous drag — see the three
 * primitives below and lib/selectionGesture.
 */
export function selectionTick(): Promise<boolean> {
  return runHaptic('selection tick', async () => {
    await Haptics.selectionStart();
    await Haptics.selectionChanged();
    await Haptics.selectionEnd();
  });
}

/**
 * Continuous-gesture primitives (chart scrubbing).
 *
 * iOS backs these with a UISelectionFeedbackGenerator: selectionStart prepares
 * and warms the Taptic Engine, selectionEnd releases it. Bracketing every
 * individual tick — start/changed/end per date — powers the engine down between
 * ticks and costs three bridge round-trips each, which drops and delays taps
 * during a fast scrub. Prepare once at the start of the drag, tick per change,
 * release at the end.
 */
export function selectionGestureStart(): Promise<boolean> {
  return runHaptic('selection gesture start', () => Haptics.selectionStart());
}

export function selectionGestureChanged(): Promise<boolean> {
  return runHaptic('selection gesture changed', () => Haptics.selectionChanged());
}

export function selectionGestureEnd(): Promise<boolean> {
  return runHaptic('selection gesture end', () => Haptics.selectionEnd());
}
