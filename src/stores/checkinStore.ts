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
  severity: MRSScore;
}

interface CheckinState {
  mode: 'full' | 'quick';
  currentStep: number;
  isEditing: boolean;
  editingCheckinId: string | null;
  targetDate: string;
  instrumentId: string;
  wellbeingScore: number | null;
  sleepQuality: number | null;
  mrsScores: MRSScoresMap;
  extendedSymptoms: ExtendedSymptomEntry[];
  notes: string;

  setMode: (mode: 'full' | 'quick') => void;
  setTargetDate: (date: string) => void;
  setWellbeingScore: (score: number) => void;
  setSleepQuality: (score: number) => void;
  skipSleepQuality: () => void;
  setMRSScore: (symptom: MRSSymptomKey, score: MRSScore) => void;
  setExtendedScore: (symptomKey: string, severity: MRSScore) => void;
  removeExtendedSymptom: (symptomKey: string) => void;
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
  getTotalMRS: () => number;
  getSomaticScore: () => number;
  getPsychologicalScore: () => number;
  getUrogenitalScore: () => number;
  getMRSScore: () => ReturnType<typeof calculateMRS>;
  getInstrumentScore: (instrument: InstrumentDefinition) => ReturnType<typeof calculateInstrumentScore>;
  getTopConcerns: () => Array<{ key: string; label: string; score: MRSScore }>;
  getStepCount: () => number;
  setInstrumentId: (id: string) => void;
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
  wellbeingScore: null as number | null,
  sleepQuality: null as number | null,
  mrsScores: { ...INITIAL_MRS_SCORES },
  extendedSymptoms: [] as ExtendedSymptomEntry[],
  notes: '',
};

export const useCheckinStore = create<CheckinState>((set, get) => ({
  ...initialState,

  setMode: (mode) => set({ mode }),

  setTargetDate: (date) => set({ targetDate: date }),

  setInstrumentId: (id) => set({ instrumentId: id }),

  setWellbeingScore: (score) => set({ wellbeingScore: score }),

  setSleepQuality: (score) => set({ sleepQuality: score }),

  skipSleepQuality: () => set({ sleepQuality: null }),

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

  removeExtendedSymptom: (symptomKey) =>
    set((state) => ({
      extendedSymptoms: state.extendedSymptoms.filter((s) => s.symptom_key !== symptomKey),
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
      wellbeingScore: checkin.overall_wellbeing,
      sleepQuality: checkin.sleep_quality ?? null,
      mrsScores,
      extendedSymptoms: extended,
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

  getTotalMRS: () => computeTotalMRS(get().mrsScores),
  getSomaticScore: () => computeSomaticScore(get().mrsScores),
  getPsychologicalScore: () => computePsychologicalScore(get().mrsScores),
  getUrogenitalScore: () => computeUrogenitalScore(get().mrsScores),
  getMRSScore: () => calculateMRS(get().mrsScores),
  getInstrumentScore: (instrument) => calculateInstrumentScore(get().mrsScores, instrument),
  getTopConcerns: () => getTopConcerns(get().mrsScores),
  getStepCount: () => (get().mode === 'quick' ? 2 : 5),
}));
