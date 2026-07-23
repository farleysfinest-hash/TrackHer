import { Capacitor } from '@capacitor/core';
import { Haptics, ImpactStyle, NotificationType } from '@capacitor/haptics';

function isNative(): boolean {
  return Capacitor.isNativePlatform();
}

/** Light impact — successful taps (dose log, quick log). */
export async function tapLight(): Promise<void> {
  if (!isNative()) return;
  try {
    await Haptics.impact({ style: ImpactStyle.Light });
  } catch {
    // Haptics must never surface.
  }
}

/** Success notification — full MRS save only. */
export async function success(): Promise<void> {
  if (!isNative()) return;
  try {
    await Haptics.notification({ type: NotificationType.Success });
  } catch {
    // Haptics must never surface.
  }
}

/**
 * Selection tick for discrete control changes (severity slider).
 * Brackets with selectionStart/End so iOS treats it as a selection gesture.
 */
export async function selectionTick(): Promise<void> {
  if (!isNative()) return;
  try {
    await Haptics.selectionStart();
    await Haptics.selectionChanged();
    await Haptics.selectionEnd();
  } catch {
    // Haptics must never surface.
  }
}
