import { create } from 'zustand';
import type { MRSScore, SymptomSeverity, SymptomCheckin, ExtendedSymptomLog } from '../types/database';
import {
  INITIAL_MRS_SCORES,
  MRS_SYMPTOM_KEYS,
  type MRSScoresMap,
  type MRSSymptomKey,
  computeTotalMRS,
  computeSomaticScore,
  computePsychologicalScore,
  computeUrogenitalScore,
  getTopConcerns,
} from '../utils/checkinHelpers';

export interface ExtendedSymptomEntry {
  symptom_key: string;
  severity: SymptomSeverity;
}

interface CheckinState {
  mode: 'full' | 'quick';
  currentStep: number;
  isEditing: boolean;
  editingCheckinId: string | null;
  wellbeingScore: number | null;
  mrsScores: MRSScoresMap;
  extendedSymptoms: ExtendedSymptomEntry[];
  notes: string;

  setMode: (mode: 'full' | 'quick') => void;
  setWellbeingScore: (score: number) => void;
  setMRSScore: (symptom: MRSSymptomKey, score: MRSScore) => void;
  toggleExtendedSymptom: (symptomKey: string) => void;
  setExtendedSeverity: (symptomKey: string, severity: SymptomSeverity) => void;
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
  getTopConcerns: () => Array<{ key: string; label: string; score: MRSScore }>;
  getStepCount: () => number;
}

const initialState = {
  mode: 'full' as const,
  currentStep: 1,
  isEditing: false,
  editingCheckinId: null as string | null,
  wellbeingScore: null as number | null,
  mrsScores: { ...INITIAL_MRS_SCORES },
  extendedSymptoms: [] as ExtendedSymptomEntry[],
  notes: '',
};

export const useCheckinStore = create<CheckinState>((set, get) => ({
  ...initialState,

  setMode: (mode) => set({ mode }),

  setWellbeingScore: (score) => set({ wellbeingScore: score }),

  setMRSScore: (symptom, score) =>
    set((state) => ({
      mrsScores: { ...state.mrsScores, [symptom]: score },
    })),

  toggleExtendedSymptom: (symptomKey) =>
    set((state) => {
      const exists = state.extendedSymptoms.find((s) => s.symptom_key === symptomKey);
      if (exists) {
        return {
          extendedSymptoms: state.extendedSymptoms.filter((s) => s.symptom_key !== symptomKey),
        };
      }
      return {
        extendedSymptoms: [
          ...state.extendedSymptoms,
          { symptom_key: symptomKey, severity: 'moderate' as SymptomSeverity },
        ],
      };
    }),

  setExtendedSeverity: (symptomKey, severity) =>
    set((state) => ({
      extendedSymptoms: state.extendedSymptoms.map((s) =>
        s.symptom_key === symptomKey ? { ...s, severity } : s,
      ),
    })),

  setNotes: (notes) => set({ notes }),

  nextStep: () => {
    const { currentStep, mode } = get();
    const max = mode === 'quick' ? 3 : 5;
    if (currentStep < max) set({ currentStep: currentStep + 1 });
  },

  prevStep: () => {
    const { currentStep } = get();
    if (currentStep > 1) set({ currentStep: currentStep - 1 });
  },

  goToStep: (step) => set({ currentStep: step }),

  loadExistingCheckin: (checkin, extendedSymptoms) => {
    const mrsScores = { ...INITIAL_MRS_SCORES };
    for (const key of MRS_SYMPTOM_KEYS) {
      const val = checkin[key];
      mrsScores[key] = val as MRSScore | null;
    }
    set({
      isEditing: true,
      editingCheckinId: checkin.id,
      wellbeingScore: checkin.overall_wellbeing,
      mrsScores,
      extendedSymptoms: extendedSymptoms.map((e) => ({
        symptom_key: e.symptom_key,
        severity: e.severity ?? 'moderate',
      })),
      notes: checkin.notes ?? '',
      currentStep: 1,
    });
  },

  reset: () => set({ ...initialState, mrsScores: { ...INITIAL_MRS_SCORES } }),

  getTotalMRS: () => computeTotalMRS(get().mrsScores),
  getSomaticScore: () => computeSomaticScore(get().mrsScores),
  getPsychologicalScore: () => computePsychologicalScore(get().mrsScores),
  getUrogenitalScore: () => computeUrogenitalScore(get().mrsScores),
  getTopConcerns: () => getTopConcerns(get().mrsScores),
  getStepCount: () => (get().mode === 'quick' ? 3 : 5),
}));
