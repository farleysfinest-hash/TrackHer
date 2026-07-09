import { create } from 'zustand';

interface QuickLogState {
  isSheetOpen: boolean;
  selectedSymptomId: string | null;
  openSheet: (symptomId?: string) => void;
  closeSheet: () => void;
  selectSymptom: (symptomId: string) => void;
}

export const useQuickLogStore = create<QuickLogState>((set) => ({
  isSheetOpen: false,
  selectedSymptomId: null,
  openSheet: (symptomId) =>
    set({ isSheetOpen: true, selectedSymptomId: symptomId ?? null }),
  closeSheet: () => set({ isSheetOpen: false, selectedSymptomId: null }),
  selectSymptom: (symptomId) => set({ selectedSymptomId: symptomId }),
}));
