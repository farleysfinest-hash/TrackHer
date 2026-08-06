/**
 * Apple Health / Health Connect integration via @capgo/capacitor-health.
 *
 * Read-only for now: sleep analysis and resting heart rate.
 * Data is never written back to the health store.
 */

import { Capacitor } from '@capacitor/core';
import { Health } from '@capgo/capacitor-health';
import type { HealthDataType, HealthSample } from '@capgo/capacitor-health';

// ---------------------------------------------------------------------------
// Availability
// ---------------------------------------------------------------------------

/** True when the native HealthKit/Health Connect SDK is reachable. */
export async function isHealthAvailable(): Promise<boolean> {
  if (!Capacitor.isNativePlatform()) return false;
  try {
    const { available } = await Health.isAvailable();
    return available;
  } catch {
    return false;
  }
}

// ---------------------------------------------------------------------------
// Authorization
// ---------------------------------------------------------------------------

/** The data types TrackHer reads from the health store. */
const READ_TYPES: HealthDataType[] = ['sleep', 'restingHeartRate'];

/**
 * Request read authorization for sleep + resting heart rate.
 * Returns true if the prompt was shown (iOS never tells you the result).
 */
export async function requestHealthAuthorization(): Promise<boolean> {
  try {
    await Health.requestAuthorization({ read: READ_TYPES, write: [] });
    return true;
  } catch {
    return false;
  }
}

// ---------------------------------------------------------------------------
// Sleep
// ---------------------------------------------------------------------------

export interface SleepSummary {
  /** Total minutes asleep (all stages combined). */
  totalMinutes: number;
  /** 1–5 quality score derived from total sleep duration. */
  qualityScore: number;
  /** ISO date string of the sleep session start. */
  startDate: string;
  /** ISO date string of the sleep session end. */
  endDate: string;
}

/**
 * Map total sleep minutes → 1–5 quality score.
 *
 * Brackets based on sleep hygiene guidelines:
 *   <4h = 1, 4–5.5h = 2, 5.5–6.5h = 3, 6.5–8h = 4, 8h+ = 5
 */
function sleepMinutesToQuality(minutes: number): number {
  if (minutes < 240) return 1;
  if (minutes < 330) return 2;
  if (minutes < 390) return 3;
  if (minutes < 480) return 4;
  return 5;
}

/**
 * Fetch last night's sleep data. Returns null if unavailable or no data.
 *
 * "Last night" = samples whose endDate falls between yesterday 12 PM
 * and today 12 PM (covers going to bed late and waking up early).
 */
export async function fetchLastNightSleep(): Promise<SleepSummary | null> {
  try {
    const now = new Date();
    // Search window: yesterday noon → today noon
    const endDate = new Date(now);
    endDate.setHours(12, 0, 0, 0);
    if (now.getHours() < 12) {
      // Before noon — "today noon" is still in the future, keep it.
    } else {
      // After noon — shift end to tomorrow noon so we capture tonight.
      endDate.setDate(endDate.getDate() + 1);
    }
    const startDate = new Date(endDate);
    startDate.setDate(startDate.getDate() - 1);

    const { samples } = await Health.readSamples({
      dataType: 'sleep',
      startDate: startDate.toISOString(),
      endDate: endDate.toISOString(),
      limit: 200,
      ascending: true,
    });

    if (!samples || samples.length === 0) return null;

    // Sum only "asleep" stages (asleep, rem, deep, light).
    // Exclude 'awake' and 'inBed' stages.
    const asleepStates = new Set(['asleep', 'rem', 'deep', 'light']);
    let totalMs = 0;
    let earliestStart = samples[0].startDate;
    let latestEnd = samples[0].endDate;

    for (const s of samples) {
      if (s.sleepState && !asleepStates.has(s.sleepState)) continue;
      // If no sleepState, treat as asleep (some devices don't report stages).
      const segStart = new Date(s.startDate).getTime();
      const segEnd = new Date(s.endDate).getTime();
      totalMs += segEnd - segStart;
      if (s.startDate < earliestStart) earliestStart = s.startDate;
      if (s.endDate > latestEnd) latestEnd = s.endDate;
    }

    const totalMinutes = Math.round(totalMs / 60_000);
    if (totalMinutes < 1) return null;

    return {
      totalMinutes,
      qualityScore: sleepMinutesToQuality(totalMinutes),
      startDate: earliestStart,
      endDate: latestEnd,
    };
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------------------
// Resting Heart Rate
// ---------------------------------------------------------------------------

export interface RestingHeartRateSummary {
  /** BPM value. */
  bpm: number;
  /** ISO date of the measurement. */
  date: string;
}

/**
 * Fetch most recent resting heart rate sample from the last 24 hours.
 */
export async function fetchRestingHeartRate(): Promise<RestingHeartRateSummary | null> {
  try {
    const now = new Date();
    const yesterday = new Date(now);
    yesterday.setDate(yesterday.getDate() - 1);

    const { samples } = await Health.readSamples({
      dataType: 'restingHeartRate',
      startDate: yesterday.toISOString(),
      endDate: now.toISOString(),
      limit: 1,
      ascending: false, // most recent first
    });

    if (!samples || samples.length === 0) return null;

    const sample = samples[0];
    return {
      bpm: Math.round(sample.value),
      date: sample.startDate,
    };
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------------------
// Combined fetch
// ---------------------------------------------------------------------------

export interface HealthSnapshot {
  sleep: SleepSummary | null;
  restingHR: RestingHeartRateSummary | null;
  fetchedAt: string;
}

/**
 * One-shot fetch of all health data TrackHer uses.
 * Returns null if health is not available.
 */
export async function fetchHealthSnapshot(): Promise<HealthSnapshot | null> {
  const available = await isHealthAvailable();
  if (!available) return null;

  const [sleep, restingHR] = await Promise.all([
    fetchLastNightSleep(),
    fetchRestingHeartRate(),
  ]);

  return { sleep, restingHR, fetchedAt: new Date().toISOString() };
}
