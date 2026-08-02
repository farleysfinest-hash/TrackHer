import { create } from 'zustand';
import type { LabResult } from '../types/database';
import { LAB_BIOMARKERS } from '../data/labRanges';
import { BIOMARKER_KEYS, labToValues } from '../utils/labHelpers';
import { todayISO } from '../utils/localDate';
import type { LabReportedValue, LabSourceType } from '../types/labs';
import {
  normalizeExtractedLabValue,
  type LabReportExtractionDraft,
} from '../utils/labReportExtraction';

function initialValues(): Record<string, number | null> {
  const values: Record<string, number | null> = {};
  for (const key of BIOMARKER_KEYS) {
    values[key] = null;
  }
  return values;
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
  sourceType: LabSourceType;
  importedValues: LabReportedValue[];
  medicationMentions: string[];
  medicationAnswers: Record<string, 'yes' | 'no' | 'unsure'>;
  importWarnings: string[];
  importPreviewDataUrl: string | null;
  importReviewedAt: string | null;

  setValue: (biomarkerKey: string, value: number | null) => void;
  setDrawDate: (date: string) => void;
  setFasting: (fasting: boolean | null) => void;
  setDrawTime: (time: string | null) => void;
  setLabName: (name: string) => void;
  setNotes: (notes: string) => void;
  setImportedValue: (index: number, patch: Partial<LabReportedValue>) => void;
  removeImportedValue: (index: number) => void;
  setMedicationAnswer: (name: string, answer: 'yes' | 'no' | 'unsure') => void;
  loadImportDraft: (draft: LabReportExtractionDraft, unknownMedicationMentions: string[]) => void;
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
  sourceType: 'manual',
  importedValues: [],
  medicationMentions: [],
  medicationAnswers: {},
  importWarnings: [],
  importPreviewDataUrl: null,
  importReviewedAt: null,

  setValue: (biomarkerKey, value) =>
    set((s) => ({ values: { ...s.values, [biomarkerKey]: value } })),

  setDrawDate: (date) => set({ drawDate: date }),
  setFasting: (fasting) => set({ fasting }),
  setDrawTime: (time) => set({ drawTime: time }),
  setLabName: (name) => set({ labName: name }),
  setNotes: (notes) => set({ notes }),
  setImportedValue: (index, patch) =>
    set((state) => {
      const previous = state.importedValues[index];
      const importedValues = state.importedValues.map((item, itemIndex) => {
        if (itemIndex !== index) return item;
        const next = { ...item, ...patch };
        return {
          ...next,
          normalizedValue: normalizeExtractedLabValue(
            next.biomarkerKey,
            next.reportedValue,
            next.reportedUnit,
          ),
        };
      });
      const nextValues = { ...state.values };
      const changed = importedValues[index];
      if (
        previous?.biomarkerKey &&
        previous.biomarkerKey !== changed?.biomarkerKey &&
        nextValues[previous.biomarkerKey] === previous.normalizedValue &&
        !importedValues.some(
          (item, itemIndex) => itemIndex !== index && item.biomarkerKey === previous.biomarkerKey,
        )
      ) {
        nextValues[previous.biomarkerKey] = null;
      }
      if (changed?.biomarkerKey && changed.normalizedValue !== null) {
        nextValues[changed.biomarkerKey] = changed.normalizedValue;
      }
      return { importedValues, values: nextValues };
    }),
  removeImportedValue: (index) =>
    set((state) => {
      const removed = state.importedValues[index];
      const importedValues = state.importedValues.filter((_, itemIndex) => itemIndex !== index);
      const values = { ...state.values };
      if (
        removed?.biomarkerKey &&
        values[removed.biomarkerKey] === removed.normalizedValue &&
        !importedValues.some((item) => item.biomarkerKey === removed.biomarkerKey)
      ) {
        values[removed.biomarkerKey] = null;
      }
      return { importedValues, values };
    }),
  setMedicationAnswer: (name, answer) =>
    set((state) => ({
      medicationAnswers: { ...state.medicationAnswers, [name]: answer },
    })),
  loadImportDraft: (draft, unknownMedicationMentions) => {
    const values = initialValues();
    for (const item of draft.values) {
      if (item.biomarkerKey && item.normalizedValue !== null) {
        values[item.biomarkerKey] = item.normalizedValue;
      }
    }
    set({
      isEditing: false,
      editingLabId: null,
      drawDate: draft.drawDate ?? todayISO(),
      fasting: draft.fasting,
      drawTime: draft.drawTime,
      labName: draft.labName,
      values,
      notes: '',
      sourceType: draft.sourceType,
      importedValues: draft.values,
      medicationMentions: unknownMedicationMentions,
      medicationAnswers: {},
      importWarnings: draft.warnings,
      importPreviewDataUrl: draft.previewDataUrl ?? null,
      importReviewedAt: null,
    });
  },

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
      sourceType: lab.source_type ?? 'manual',
      importedValues: Object.values(lab.reported_values ?? {}),
      medicationMentions: [],
      medicationAnswers: {},
      importWarnings: [],
      importPreviewDataUrl: null,
      importReviewedAt: lab.import_reviewed_at ?? null,
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
      sourceType: 'manual',
      importedValues: [],
      medicationMentions: [],
      medicationAnswers: {},
      importWarnings: [],
      importPreviewDataUrl: null,
      importReviewedAt: null,
    }),

  getFilledCount: () => {
    const { values } = get();
    return LAB_BIOMARKERS.filter(
      (b) => values[b.key] !== null && values[b.key] !== undefined,
    ).length;
  },
}));
