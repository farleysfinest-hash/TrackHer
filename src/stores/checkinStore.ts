import { create } from 'zustand';
import type { MRSScore, SymptomCheckin, ExtendedSymptomLog } from '../types/database';
import type { InstrumentDefinition } from '../types/instruments';
import { getPrimaryInstrument } from '../data/instruments/registry';
import {
  INITIAL_MRS_SCORES,
  MRS_CANONICAL_KEYS,
  LEGACY_MRS_EXTRA_KEYS,
  type MRSScoresMap,
  type MRSSymptomKey,
  computeTotalMRS,
  computeSomaticScore,
  computePsychologicalScore,
  computeUrogenitalScore,
  getTopConcerns,
  calculateMRS,
  calculateInstrumentScore,
  getLocalDateISO,
  getResolvedTimezone,
} from '../utils/checkinHelpers';
import { useAuthStore } from '../stores/authStore';

export interface ExtendedSymptomEntry {
  symptom_key: string;
  severity: MRSScore | null;
}

interface CheckinState {
  mode: 'full' | 'quick';
  currentStep: number;
  isEditing: boolean;
  editingCheckinId: string | null;
  targetDate: string;
  instrumentId: string;
  energyLevel: number | null;
  moodLevel: number | null;
  sleepQuality: number | null;
  energyComplete: boolean;
  moodComplete: boolean;
  sleepComplete: boolean;
  flareSelected: string[];
  flarePreLogged: string[];
  mrsScores: MRSScoresMap;
  extendedSymptoms: ExtendedSymptomEntry[];
  pendingKeepWatch: string[];
  notes: string;

  setMode: (mode: 'full' | 'quick') => void;
  setTargetDate: (date: string) => void;
  setEnergyLevel: (score: number) => void;
  skipEnergy: () => void;
  setMoodLevel: (score: number) => void;
  skipMood: () => void;
  setSleepQuality: (score: number) => void;
  skipSleepQuality: () => void;
  initFlareFromPreLogged: (ids: string[]) => void;
  toggleFlareSymptom: (id: string) => void;
  setMRSScore: (symptom: MRSSymptomKey, score: MRSScore) => void;
  setExtendedScore: (symptomKey: string, severity: MRSScore) => void;
  addAdHocSymptom: (symptomKey: string) => void;
  dismissKeepWatch: (symptomKey: string) => void;
  removeExtendedSymptom: (symptomKey: string) => void;
  initWatchSymptomsForCheckin: (symptomKeys: string[]) => void;
  setTrackedSymptoms: (symptomKeys: string[]) => void;
  setNotes: (notes: string) => void;
  nextStep: () => void;
  prevStep: () => void;
  goToStep: (step: number) => void;
  loadExistingCheckin: (
    checkin: SymptomCheckin,
    extendedSymptoms: ExtendedSymptomLog[],
  ) => void;
  reset: () => void;
  getTotalMRS: () => number | null;
  getSomaticScore: () => number | null;
  getPsychologicalScore: () => number | null;
  getUrogenitalScore: () => number | null;
  getMRSScore: () => ReturnType<typeof calculateMRS>;
  getInstrumentScore: (instrument: InstrumentDefinition) => ReturnType<typeof calculateInstrumentScore>;
  getTopConcerns: () => Array<{ key: string; label: string; score: MRSScore }>;
  getStepCount: () => number;
  setInstrumentId: (id: string) => void;
  allChannelsComplete: () => boolean;
}

function extendedSeverityFromLog(log: ExtendedSymptomLog): MRSScore {
  if (log.severity_score !== null && log.severity_score !== undefined) {
    return log.severity_score;
  }
  if (log.severity === 'mild') return 1;
  if (log.severity === 'moderate') return 2;
  if (log.severity === 'severe') return 3;
  return 2;
}

function getDefaultTargetDate(): string {
  const timezone = getResolvedTimezone(useAuthStore.getState().profile?.timezone);
  return getLocalDateISO(timezone);
}

const initialState = {
  mode: 'full' as const,
  currentStep: 1,
  isEditing: false,
  editingCheckinId: null as string | null,
  targetDate: getDefaultTargetDate(),
  instrumentId: getPrimaryInstrument('-2').id,
  energyLevel: null as number | null,
  moodLevel: null as number | null,
  sleepQuality: null as number | null,
  energyComplete: false,
  moodComplete: false,
  sleepComplete: false,
  flareSelected: [] as string[],
  flarePreLogged: [] as string[],
  mrsScores: { ...INITIAL_MRS_SCORES },
  extendedSymptoms: [] as ExtendedSymptomEntry[],
  pendingKeepWatch: [] as string[],
  notes: '',
};

export const useCheckinStore = create<CheckinState>((set, get) => ({
  ...initialState,

  setMode: (mode) => set({ mode }),

  setTargetDate: (date) => set({ targetDate: date }),

  setInstrumentId: (id) => set({ instrumentId: id }),

  setEnergyLevel: (score) => set({ energyLevel: score, energyComplete: true }),

  skipEnergy: () => set({ energyLevel: null, energyComplete: true }),

  setMoodLevel: (score) => set({ moodLevel: score, moodComplete: true }),

  skipMood: () => set({ moodLevel: null, moodComplete: true }),

  setSleepQuality: (score) => set({ sleepQuality: score, sleepComplete: true }),

  skipSleepQuality: () => set({ sleepQuality: null, sleepComplete: true }),

  initFlareFromPreLogged: (ids) =>
    set({ flarePreLogged: ids, flareSelected: [...ids] }),

  toggleFlareSymptom: (id) =>
    set((state) => {
      const selected = state.flareSelected.includes(id)
        ? state.flareSelected.filter((s) => s !== id)
        : [...state.flareSelected, id];
      return { flareSelected: selected };
    }),

  setMRSScore: (symptom, score) =>
    set((state) => ({
      mrsScores: { ...state.mrsScores, [symptom]: score },
    })),

  setExtendedScore: (symptomKey, severity) =>
    set((state) => {
      const exists = state.extendedSymptoms.find((s) => s.symptom_key === symptomKey);
      if (exists) {
        return {
          extendedSymptoms: state.extendedSymptoms.map((s) =>
            s.symptom_key === symptomKey ? { ...s, severity } : s,
          ),
        };
      }
      return {
        extendedSymptoms: [...state.extendedSymptoms, { symptom_key: symptomKey, severity }],
      };
    }),

  addAdHocSymptom: (symptomKey) =>
    set((state) => {
      const exists = state.extendedSymptoms.some((s) => s.symptom_key === symptomKey);
      const extendedSymptoms = exists
        ? state.extendedSymptoms
        : [...state.extendedSymptoms, { symptom_key: symptomKey, severity: null }];
      const pendingKeepWatch =
        state.pendingKeepWatch.includes(symptomKey)
          ? state.pendingKeepWatch
          : [...state.pendingKeepWatch, symptomKey];
      return { extendedSymptoms, pendingKeepWatch };
    }),

  dismissKeepWatch: (symptomKey) =>
    set((state) => ({
      pendingKeepWatch: state.pendingKeepWatch.filter((k) => k !== symptomKey),
    })),

  initWatchSymptomsForCheckin: (symptomKeys) =>
    set({
      extendedSymptoms: symptomKeys.map((key) => ({ symptom_key: key, severity: null })),
      pendingKeepWatch: [],
    }),

  removeExtendedSymptom: (symptomKey) =>
    set((state) => ({
      extendedSymptoms: state.extendedSymptoms.filter((s) => s.symptom_key !== symptomKey),
      pendingKeepWatch: state.pendingKeepWatch.filter((k) => k !== symptomKey),
    })),

  setTrackedSymptoms: (symptomKeys) =>
    set((state) => {
      const existing = new Map(state.extendedSymptoms.map((s) => [s.symptom_key, s]));
      const next: ExtendedSymptomEntry[] = symptomKeys.map((key) => {
        const prev = existing.get(key);
        return prev ?? { symptom_key: key, severity: 0 };
      });
      return { extendedSymptoms: next };
    }),

  setNotes: (notes) => set({ notes }),

  nextStep: () => {
    const { currentStep, mode } = get();
    const max = mode === 'quick' ? 2 : 5;
    if (currentStep < max) set({ currentStep: currentStep + 1 });
  },

  prevStep: () => {
    const { currentStep } = get();
    if (currentStep > 1) set({ currentStep: currentStep - 1 });
  },

  goToStep: (step) => set({ currentStep: step }),

  loadExistingCheckin: (checkin, extendedSymptoms) => {
    const mrsScores = { ...INITIAL_MRS_SCORES };
    for (const key of MRS_CANONICAL_KEYS) {
      mrsScores[key] = checkin[key] as MRSScore | null;
    }

    const extended: ExtendedSymptomEntry[] = extendedSymptoms.map((e) => ({
      symptom_key: e.symptom_key,
      severity: extendedSeverityFromLog(e),
    }));

    for (const key of LEGACY_MRS_EXTRA_KEYS) {
      const val = checkin[key];
      if (val !== null && val !== undefined) {
        const existing = extended.find((e) => e.symptom_key === key);
        if (!existing) {
          extended.push({ symptom_key: key, severity: val as MRSScore });
        }
      }
    }

    set({
      isEditing: true,
      editingCheckinId: checkin.id,
      energyLevel: checkin.energy_level ?? null,
      moodLevel: checkin.mood_level ?? null,
      sleepQuality: checkin.sleep_quality ?? null,
      energyComplete: true,
      moodComplete: true,
      sleepComplete: true,
      flareSelected: [],
      flarePreLogged: [],
      mrsScores,
      extendedSymptoms: extended,
      pendingKeepWatch: [],
      notes: checkin.notes ?? '',
      currentStep: 1,
    });
  },

  reset: () =>
    set({
      ...initialState,
      targetDate: getDefaultTargetDate(),
      mrsScores: { ...INITIAL_MRS_SCORES },
    }),

  allChannelsComplete: () => {
    const { energyComplete, moodComplete, sleepComplete } = get();
    return energyComplete && moodComplete && sleepComplete;
  },

  getTotalMRS: () => computeTotalMRS(get().mrsScores),
  getSomaticScore: () => computeSomaticScore(get().mrsScores),
  getPsychologicalScore: () => computePsychologicalScore(get().mrsScores),
  getUrogenitalScore: () => computeUrogenitalScore(get().mrsScores),
  getMRSScore: () => calculateMRS(get().mrsScores),
  getInstrumentScore: (instrument) => calculateInstrumentScore(get().mrsScores, instrument),
  getTopConcerns: () => getTopConcerns(get().mrsScores),
  getStepCount: () => (get().mode === 'quick' ? 2 : 5),
}));
