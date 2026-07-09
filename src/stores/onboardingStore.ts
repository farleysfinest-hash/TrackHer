import { create } from 'zustand';
import type {
  StagingSubStep,
  StagingAnswers,
  StagingResult,
  MenopauseCauseAnswer,
  PeriodsStatus,
  PeriodChanges,
  LastPeriodTimeframe,
} from '../lib/strawStaging';
import {
  computeStagingResult,
  getNextStagingSubStep,
  getPrevStagingSubStep,
} from '../lib/strawStaging';
import { useAuthStore } from './authStore';
import { supabase } from '../lib/supabase';
import { IS_DEV_MODE } from '../lib/devMode';
import { setDevSymptomSelections } from '../lib/devStore';
import { SYMPTOM_CATALOG } from '../data/symptoms';
import type { StrawStageCode } from '../lib/strawStaging';

export type OnboardingStep = 0 | 1 | 2 | 3 | 4 | 5;

export interface OnboardingFormData {
  displayName: string;
  email: string;
  dateOfBirth: string;
  hasUterus: boolean | null;
  lastPeriodDate: string;
  /** Convention: 0 = Sunday ... 6 = Saturday (matches JS Date#getDay()). */
  checkinDay: number | null;
  staging: StagingAnswers;
  stagingResult: StagingResult | null;
  selectedSymptoms: string[];
  watchSymptoms: string[];
}

interface OnboardingState {
  currentStep: OnboardingStep;
  stagingSubStep: StagingSubStep;
  formData: OnboardingFormData;
  isSubmitting: boolean;
  error: string | null;
  nextStep: () => void;
  prevStep: () => void;
  setStagingSubStep: (step: StagingSubStep) => void;
  stagingNext: () => void;
  stagingBack: () => boolean;
  updateStaging: (data: Partial<StagingAnswers>) => void;
  updateFormData: (data: Partial<OnboardingFormData>) => void;
  toggleSymptom: (symptomId: string) => void;
  toggleWatchSymptom: (symptomId: string) => void;
  initWatchSymptomsFromSelection: () => void;
  initSymptomsForStage: (stage: StrawStageCode) => void;
  submitStaging: () => Promise<{ success: boolean; error?: string }>;
  submitSymptomSelections: () => Promise<{ success: boolean; error?: string }>;
  submitOnboarding: () => Promise<{ success: boolean; error?: string }>;
  reset: () => void;
}

const initialStaging: StagingAnswers = {
  periodsStatus: null,
  periodChanges: null,
  lastPeriodTimeframe: null,
  menopauseCauseAnswer: null,
};

const initialFormData: OnboardingFormData = {
  displayName: '',
  email: '',
  dateOfBirth: '',
  hasUterus: null,
  lastPeriodDate: '',
  checkinDay: null,
  staging: initialStaging,
  stagingResult: null,
  selectedSymptoms: [],
  watchSymptoms: [],
};

function getCommonSymptomsForStage(stage: StrawStageCode): string[] {
  return SYMPTOM_CATALOG.filter(
    (s) => !s.isMRSCore && s.phasePeak.includes(stage),
  ).map((s) => s.key);
}

export const useOnboardingStore = create<OnboardingState>((set, get) => ({
  currentStep: 0,
  stagingSubStep: 'q1',
  formData: initialFormData,
  isSubmitting: false,
  error: null,

  nextStep: () => {
    const { currentStep } = get();
    if (currentStep < 5) {
      set({ currentStep: (currentStep + 1) as OnboardingStep });
    }
  },

  prevStep: () => {
    const { currentStep, formData } = get();
    if (currentStep > 0) {
      if (currentStep === 3) {
        set({ stagingSubStep: formData.stagingResult ? 'result' : 'q1' });
      }
      set({ currentStep: (currentStep - 1) as OnboardingStep });
    }
  },

  setStagingSubStep: (step) => set({ stagingSubStep: step }),

  updateStaging: (data) => {
    set((state) => {
      const staging = { ...state.formData.staging, ...data };
      const stagingResult = computeStagingResult(staging);
      return {
        formData: {
          ...state.formData,
          staging,
          stagingResult,
        },
      };
    });
  },

  stagingNext: () => {
    const { stagingSubStep, formData } = get();
    const next = getNextStagingSubStep(stagingSubStep, formData.staging);
    if (next) {
      set({ stagingSubStep: next });
    }
  },

  stagingBack: () => {
    const { stagingSubStep, formData } = get();
    const prev = getPrevStagingSubStep(stagingSubStep, formData.staging);
    if (prev) {
      set({ stagingSubStep: prev });
      return true;
    }
    return false;
  },

  updateFormData: (data) => {
    set((state) => ({ formData: { ...state.formData, ...data } }));
  },

  initSymptomsForStage: (stage) => {
    const common = getCommonSymptomsForStage(stage);
    const selected = common.slice(0, 8);
    set((state) => ({
      formData: {
        ...state.formData,
        selectedSymptoms: selected,
        watchSymptoms: selected.length <= 5 ? [...selected] : [],
      },
    }));
  },

  initWatchSymptomsFromSelection: () => {
    set((state) => {
      const { selectedSymptoms } = state.formData;
      return {
        formData: {
          ...state.formData,
          watchSymptoms: selectedSymptoms.length <= 5 ? [...selectedSymptoms] : [],
        },
      };
    });
  },

  toggleSymptom: (symptomId) => {
    set((state) => {
      const isSelected = state.formData.selectedSymptoms.includes(symptomId);
      let selected: string[];
      let watchSymptoms = state.formData.watchSymptoms;
      if (isSelected) {
        selected = state.formData.selectedSymptoms.filter((id) => id !== symptomId);
        watchSymptoms = watchSymptoms.filter((id) => id !== symptomId);
      } else {
        if (state.formData.selectedSymptoms.length >= 8) return state;
        selected = [...state.formData.selectedSymptoms, symptomId];
      }
      return {
        formData: {
          ...state.formData,
          selectedSymptoms: selected,
          watchSymptoms,
        },
      };
    });
  },

  toggleWatchSymptom: (symptomId) => {
    set((state) => {
      if (!state.formData.selectedSymptoms.includes(symptomId)) return state;
      const isWatch = state.formData.watchSymptoms.includes(symptomId);
      if (isWatch) {
        return {
          formData: {
            ...state.formData,
            watchSymptoms: state.formData.watchSymptoms.filter((id) => id !== symptomId),
          },
        };
      }
      if (state.formData.watchSymptoms.length >= 5) return state;
      return {
        formData: {
          ...state.formData,
          watchSymptoms: [...state.formData.watchSymptoms, symptomId],
        },
      };
    });
  },

  submitStaging: async () => {
    const { formData } = get();
    const result = formData.stagingResult;
    if (!result) {
      return { success: false, error: 'Staging not complete' };
    }

    set({ isSubmitting: true, error: null });

    const updates = {
      straw_stage: result.strawStage,
      straw_stage_label: result.strawStageLabel,
      menopause_cause: result.menopauseCause,
      periods_status: formData.staging.periodsStatus ?? null,
      period_changes: formData.staging.periodChanges ?? null,
      last_period_timeframe: formData.staging.lastPeriodTimeframe ?? null,
      last_period_date: formData.lastPeriodDate || null,
      staging_completed_at: new Date().toISOString(),
    };

    const profileResult = await useAuthStore.getState().updateProfile(updates);
    set({ isSubmitting: false });

    if (!profileResult.success) {
      set({ error: profileResult.error ?? 'Failed to save staging data' });
      return { success: false, error: profileResult.error };
    }

    get().initSymptomsForStage(result.strawStage);
    return { success: true };
  },

  submitSymptomSelections: async () => {
    const { formData } = get();
    set({ isSubmitting: true, error: null });

    const user = useAuthStore.getState().user;
    if (!user) {
      set({ isSubmitting: false, error: 'Not authenticated' });
      return { success: false, error: 'Not authenticated' };
    }

    const rows = formData.selectedSymptoms.map((symptomId) => ({
      user_id: user.id,
      symptom_id: symptomId,
      is_watch_symptom: formData.watchSymptoms.includes(symptomId),
    }));

    if (IS_DEV_MODE) {
      setDevSymptomSelections(rows);
      set({ isSubmitting: false });
      console.log('[DEV] Symptom selections saved:', rows);
      return { success: true };
    }

    const { error: deleteError } = await supabase
      .from('user_symptom_selections')
      .delete()
      .eq('user_id', user.id);

    if (deleteError) {
      set({ isSubmitting: false, error: deleteError.message });
      return { success: false, error: deleteError.message };
    }

    if (rows.length > 0) {
      const { error } = await supabase.from('user_symptom_selections').insert(rows);
      if (error) {
        set({ isSubmitting: false, error: error.message });
        return { success: false, error: error.message };
      }
    }

    set({ isSubmitting: false });
    return { success: true };
  },

  submitOnboarding: async () => {
    const { formData } = get();
    set({ isSubmitting: true, error: null });

    const updates = {
      display_name: formData.displayName,
      date_of_birth: formData.dateOfBirth || null,
      has_uterus: formData.hasUterus ?? true,
      checkin_frequency: 'weekly' as const,
      checkin_day: formData.checkinDay ?? null,
      onboarding_completed: true,
    };

    const result = await useAuthStore.getState().updateProfile(updates);
    set({ isSubmitting: false });

    if (!result.success) {
      set({ error: result.error ?? 'Failed to save onboarding data' });
      return { success: false, error: result.error };
    }
    return { success: true };
  },

  reset: () => {
    set({
      currentStep: 1,
      stagingSubStep: 'q1',
      formData: initialFormData,
      isSubmitting: false,
      error: null,
    });
  },
}));

// Re-export staging answer types for components
export type {
  PeriodsStatus,
  PeriodChanges,
  LastPeriodTimeframe,
  MenopauseCauseAnswer,
  StagingSubStep,
};
