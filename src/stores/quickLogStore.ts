import { create } from 'zustand';

interface QuickLogState {
  isSheetOpen: boolean;
  selectedSymptomId: string | null;
  openSheet: (symptomId: string) => void;
  closeSheet: () => void;
}

export const useQuickLogStore = create<QuickLogState>((set) => ({
  isSheetOpen: false,
  selectedSymptomId: null,
  openSheet: (symptomId) => set({ isSheetOpen: true, selectedSymptomId: symptomId }),
  closeSheet: () => set({ isSheetOpen: false, selectedSymptomId: null }),
}));
