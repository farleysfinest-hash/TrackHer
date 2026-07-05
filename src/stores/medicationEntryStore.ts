import { create } from 'zustand';
import type {
  HormoneCategory,
  DeliveryMethod,
  MedicationFrequency,
} from '../types/database';
import type { MedicationOption } from '../types/medications';
import { todayISO } from '../utils/medicationHelpers';

export interface MedicationEntryFormData {
  dose_amount: number | null;
  dose_unit: string;
  secondary_dose_amount: number | null;
  secondary_dose_unit: string | null;
  tertiary_dose_amount: number | null;
  tertiary_dose_unit: string | null;
  frequency: MedicationFrequency | null;
  frequency_details: Record<string, unknown> | null;
  application_site: string | null;
  start_date: string;
  prescriber_name: string;
  pharmacy_name: string;
  notes: string;
  pellet_insertion_date: string | null;
  pellet_expected_duration_months: number | null;
  custom_medication_name: string;
  custom_hormone_category: HormoneCategory | null;
  custom_delivery_method: DeliveryMethod | null;
  custom_is_bioidentical: boolean;
  custom_is_compounded: boolean;
}

const initialFormData: MedicationEntryFormData = {
  dose_amount: null,
  dose_unit: '',
  secondary_dose_amount: null,
  secondary_dose_unit: null,
  tertiary_dose_amount: null,
  tertiary_dose_unit: null,
  frequency: null,
  frequency_details: null,
  application_site: null,
  start_date: todayISO(),
  prescriber_name: '',
  pharmacy_name: '',
  notes: '',
  pellet_insertion_date: null,
  pellet_expected_duration_months: null,
  custom_medication_name: '',
  custom_hormone_category: null,
  custom_delivery_method: null,
  custom_is_bioidentical: true,
  custom_is_compounded: false,
};

interface MedicationEntryState {
  currentStep: 1 | 2 | 3 | 4 | 5;
  selectedHormone: HormoneCategory | null;
  selectedMethod: DeliveryMethod | null;
  selectedProduct: MedicationOption | null;
  isCustomEntry: boolean;
  formData: MedicationEntryFormData;

  setHormone: (hormone: HormoneCategory) => void;
  setMethod: (method: DeliveryMethod) => void;
  setProduct: (product: MedicationOption | null) => void;
  setCustomEntry: (isCustom: boolean) => void;
  updateFormData: (updates: Partial<MedicationEntryFormData>) => void;
  nextStep: () => void;
  prevStep: () => void;
  goToStep: (step: 1 | 2 | 3 | 4 | 5) => void;
  reset: () => void;
}

export const useMedicationEntryStore = create<MedicationEntryState>((set, get) => ({
  currentStep: 1,
  selectedHormone: null,
  selectedMethod: null,
  selectedProduct: null,
  isCustomEntry: false,
  formData: { ...initialFormData },

  setHormone: (hormone) => {
    set({ selectedHormone: hormone, selectedMethod: null, selectedProduct: null });
    if (hormone === 'other') {
      set({
        isCustomEntry: true,
        formData: {
          ...get().formData,
          custom_hormone_category: 'other',
        },
      });
    }
  },

  setMethod: (method) => set({ selectedMethod: method, selectedProduct: null }),

  setProduct: (product) => {
    if (!product) {
      set({ selectedProduct: null });
      return;
    }
    set({
      selectedProduct: product,
      formData: {
        ...get().formData,
        dose_unit: product.doseOptions.unit,
        frequency: product.frequencyOptions[0] ?? null,
      },
    });
  },

  setCustomEntry: (isCustom) => {
    const { selectedHormone, selectedMethod } = get();
    set({
      isCustomEntry: isCustom,
      formData: {
        ...get().formData,
        custom_hormone_category: selectedHormone ?? get().formData.custom_hormone_category,
        custom_delivery_method: selectedMethod ?? get().formData.custom_delivery_method,
      },
    });
  },

  updateFormData: (updates) => {
    set((state) => ({ formData: { ...state.formData, ...updates } }));
  },

  nextStep: () => {
    const { currentStep } = get();
    if (currentStep < 5) set({ currentStep: (currentStep + 1) as 1 | 2 | 3 | 4 | 5 });
  },

  prevStep: () => {
    const { currentStep, isCustomEntry } = get();
    if (isCustomEntry && currentStep === 4) {
      set({ isCustomEntry: false, currentStep: get().selectedHormone === 'other' ? 1 : 3 });
      return;
    }
    if (currentStep > 1) set({ currentStep: (currentStep - 1) as 1 | 2 | 3 | 4 | 5 });
  },

  goToStep: (step) => set({ currentStep: step }),

  reset: () =>
    set({
      currentStep: 1,
      selectedHormone: null,
      selectedMethod: null,
      selectedProduct: null,
      isCustomEntry: false,
      formData: { ...initialFormData, start_date: todayISO() },
    }),
}));
