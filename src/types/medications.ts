export type { HormoneCategory, DeliveryMethod, MedicationFrequency } from './database';

export interface MedicationOption {
  key: string;
  hormoneCategory: import('./database').HormoneCategory;
  deliveryMethod: import('./database').DeliveryMethod;
  name: string;
  brandNames: string[];
  genericName: string;
  isBioidentical: boolean;
  isCompounded: boolean;
  doseOptions: {
    amounts: number[];
    unit: string;
    description?: string;
  };
  frequencyOptions: import('./database').MedicationFrequency[];
  applicationSites?: string[];
  isPellet?: boolean;
  durationOptions?: number[];
  clinicalNotes?: string;
  allowCustomDose: boolean;
}
