import { create } from 'zustand';
import type { LabResult } from '../types/database';
import { LAB_BIOMARKERS } from '../data/labRanges';
import { BIOMARKER_KEYS, labToValues } from '../utils/labHelpers';

function initialValues(): Record<string, number | null> {
  const values: Record<string, number | null> = {};
  for (const key of BIOMARKER_KEYS) {
    values[key] = null;
  }
  return values;
}

function todayISO(): string {
  return new Date().toISOString().split('T')[0];
}

interface LabEntryState {
  isEditing: boolean;
  editingLabId: string | null;
  drawDate: string;
  fasting: boolean | null;
  drawTime: string | null;
  labName: string;
  values: Record<string, number | null>;
  notes: string;

  setValue: (biomarkerKey: string, value: number | null) => void;
  setDrawDate: (date: string) => void;
  setFasting: (fasting: boolean | null) => void;
  setDrawTime: (time: string | null) => void;
  setLabName: (name: string) => void;
  setNotes: (notes: string) => void;
  loadExistingLab: (lab: LabResult) => void;
  reset: () => void;
  getFilledCount: () => number;
}

export const useLabEntryStore = create<LabEntryState>((set, get) => ({
  isEditing: false,
  editingLabId: null,
  drawDate: todayISO(),
  fasting: null,
  drawTime: null,
  labName: '',
  values: initialValues(),
  notes: '',

  setValue: (biomarkerKey, value) =>
    set((s) => ({ values: { ...s.values, [biomarkerKey]: value } })),

  setDrawDate: (date) => set({ drawDate: date }),
  setFasting: (fasting) => set({ fasting }),
  setDrawTime: (time) => set({ drawTime: time }),
  setLabName: (name) => set({ labName: name }),
  setNotes: (notes) => set({ notes }),

  loadExistingLab: (lab) => {
    set({
      isEditing: true,
      editingLabId: lab.id,
      drawDate: lab.draw_date,
      fasting: lab.fasting,
      drawTime: lab.draw_time,
      labName: lab.lab_name ?? '',
      values: labToValues(lab),
      notes: lab.notes ?? '',
    });
  },

  reset: () =>
    set({
      isEditing: false,
      editingLabId: null,
      drawDate: todayISO(),
      fasting: null,
      drawTime: null,
      labName: '',
      values: initialValues(),
      notes: '',
    }),

  getFilledCount: () => {
    const { values } = get();
    return LAB_BIOMARKERS.filter((b) => values[b.key] !== null && values[b.key] !== undefined)
      .length;
  },
}));
