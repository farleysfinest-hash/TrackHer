import { create } from 'zustand';
import type { MenopauseStage, CheckinFrequency } from '../types/database';
import { useAuthStore } from './authStore';

export interface OnboardingFormData {
  displayName: string;
  email: string;
  dateOfBirth: string;
  hasUterus: boolean | null;
  menopauseStage: MenopauseStage | null;
  lastPeriodDate: string;
  checkinFrequency: CheckinFrequency | null;
}

interface OnboardingState {
  currentStep: 1 | 2 | 3;
  formData: OnboardingFormData;
  isSubmitting: boolean;
  error: string | null;
  nextStep: () => void;
  prevStep: () => void;
  updateFormData: (data: Partial<OnboardingFormData>) => void;
  submitOnboarding: () => Promise<{ success: boolean; error?: string }>;
  reset: () => void;
}

const initialFormData: OnboardingFormData = {
  displayName: '',
  email: '',
  dateOfBirth: '',
  hasUterus: null,
  menopauseStage: null,
  lastPeriodDate: '',
  checkinFrequency: null,
};

export const useOnboardingStore = create<OnboardingState>((set, get) => ({
  currentStep: 1,
  formData: initialFormData,
  isSubmitting: false,
  error: null,

  nextStep: () => {
    const { currentStep } = get();
    if (currentStep < 3) {
      set({ currentStep: (currentStep + 1) as 1 | 2 | 3 });
    }
  },

  prevStep: () => {
    const { currentStep } = get();
    if (currentStep > 1) {
      set({ currentStep: (currentStep - 1) as 1 | 2 | 3 });
    }
  },

  updateFormData: (data) => {
    set((state) => ({ formData: { ...state.formData, ...data } }));
  },

  submitOnboarding: async () => {
    const { formData } = get();
    set({ isSubmitting: true, error: null });

    const updates = {
      display_name: formData.displayName,
      date_of_birth: formData.dateOfBirth || undefined,
      has_uterus: formData.hasUterus ?? true,
      menopause_stage: formData.menopauseStage ?? undefined,
      last_period_date: formData.lastPeriodDate || undefined,
      checkin_frequency: formData.checkinFrequency ?? undefined,
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
    set({ currentStep: 1, formData: initialFormData, isSubmitting: false, error: null });
  },
}));
