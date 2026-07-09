import type {
  StrawStageCode,
  PeriodsStatus,
  PeriodChanges,
  LastPeriodTimeframe,
  MenopauseCause,
} from '../lib/strawStaging';

export type MenopauseStage = 'perimenopause' | 'menopause' | 'postmenopause' | 'surgical' | 'unknown';
export type CheckinFrequency = 'daily' | 'weekly' | 'monthly';

export type HormoneCategory =
  | 'estrogen'
  | 'progesterone'
  | 'testosterone'
  | 'combination'
  | 'dhea'
  | 'oxytocin'
  | 'thyroid'
  | 'supplement'
  | 'other';

export type DeliveryMethod =
  | 'patch'
  | 'cream'
  | 'gel'
  | 'oral_capsule'
  | 'oral_tablet'
  | 'injection'
  | 'pellet'
  | 'troche'
  | 'sublingual'
  | 'vaginal_cream'
  | 'vaginal_tablet'
  | 'vaginal_ring'
  | 'vaginal_suppository'
  | 'rectal'
  | 'nasal_spray'
  | 'spray'
  | 'other';

export type MedicationFrequency =
  | 'daily'
  | 'twice_daily'
  | 'three_times_daily'
  | 'weekly'
  | 'twice_weekly'
  | 'three_times_weekly'
  | 'every_other_day'
  | 'every_two_weeks'
  | 'every_three_weeks'
  | 'every_four_weeks'
  | 'monthly'
  | 'cyclic'
  | 'as_needed'
  | 'custom'
  | 'every_three_months'
  | 'every_four_months'
  | 'every_five_months'
  | 'every_six_months';

export type DoseStatus = 'taken' | 'missed' | 'late' | 'skipped';
export type SymptomSeverity = 'mild' | 'moderate' | 'severe';
export type MRSScore = 0 | 1 | 2 | 3 | 4;
export type CheckinType = 'full' | 'quick' | 'pulse';

export type MedicationChangeType =
  | 'started'
  | 'stopped'
  | 'dose_increased'
  | 'dose_decreased'
  | 'method_changed'
  | 'frequency_changed'
  | 'switched';

export type InsightType =
  | 'dose_correlation'
  | 'symptom_cluster'
  | 'lab_discordance'
  | 'trend_alert'
  | 'monthly_summary'
  | 'report_narrative';

export type ReminderType = 'checkin' | 'medication' | 'lab_due';

export interface Profile {
  id: string;
  display_name: string | null;
  email: string | null;
  menopause_stage: MenopauseStage | null;
  straw_stage: StrawStageCode | null;
  straw_stage_label: string | null;
  menopause_cause: MenopauseCause | null;
  last_period_date: string | null;
  last_period_timeframe: LastPeriodTimeframe | null;
  periods_status: PeriodsStatus | null;
  period_changes: PeriodChanges | null;
  staging_completed_at: string | null;
  welcome_seen: boolean | null;
  has_uterus: boolean;
  date_of_birth: string | null;
  checkin_frequency: CheckinFrequency | null;
  /**
   * Weekly check-in day.
   * Convention: 0 = Sunday ... 6 = Saturday (matches JS Date#getDay()).
   * NULL means "any day is fine" (no chosen day yet).
   */
  checkin_day: number | null;
  next_appointment_date: string | null;
  onboarding_completed: boolean;
  timezone: string;
  created_at: string;
  updated_at: string;
}

export interface UserSymptomSelection {
  id: string;
  user_id: string;
  symptom_id: string;
  is_watch_symptom: boolean;
  selected_at: string;
}

export type ProfileUpdate = Partial<Omit<Profile, 'id' | 'created_at' | 'updated_at'>>;

export interface Medication {
  id: string;
  user_id: string;
  hormone_category: HormoneCategory;
  delivery_method: DeliveryMethod;
  medication_name: string;
  dose_amount: number;
  dose_unit: string;
  units_per_dose: number;
  secondary_dose_amount: number | null;
  secondary_dose_unit: string | null;
  tertiary_dose_amount: number | null;
  tertiary_dose_unit: string | null;
  frequency: MedicationFrequency;
  frequency_details: Record<string, unknown> | null;
  application_site: string | null;
  start_date: string;
  end_date: string | null;
  is_active: boolean;
  prescriber_name: string | null;
  pharmacy_name: string | null;
  notes: string | null;
  pellet_insertion_date: string | null;
  pellet_expected_duration_months: number | null;
  created_at: string;
  updated_at: string;
}

export interface MedicationInsert {
  hormone_category: HormoneCategory;
  delivery_method: DeliveryMethod;
  medication_name: string;
  dose_amount: number;
  dose_unit: string;
  units_per_dose?: number;
  frequency: MedicationFrequency;
  start_date: string;
  secondary_dose_amount?: number;
  secondary_dose_unit?: string;
  tertiary_dose_amount?: number;
  tertiary_dose_unit?: string;
  frequency_details?: Record<string, unknown>;
  application_site?: string;
  end_date?: string;
  is_active?: boolean;
  prescriber_name?: string;
  pharmacy_name?: string;
  notes?: string;
  pellet_insertion_date?: string;
  pellet_expected_duration_months?: number;
}

export interface DoseLog {
  id: string;
  user_id: string;
  medication_id: string;
  logged_at: string;
  status: DoseStatus;
  actual_dose: number | null;
  notes: string | null;
  created_at: string;
}

export interface MedicationAdministration {
  id: string;
  user_id: string;
  medication_id: string;
  taken_at: string;
  created_at: string;
}

export interface MedicationAdministrationInsert {
  medication_id: string;
  taken_at?: string;
}

export interface SymptomCheckin {
  id: string;
  user_id: string;
  checkin_date: string;
  hot_flashes: MRSScore | null;
  heart_discomfort: MRSScore | null;
  sleep_problems: MRSScore | null;
  depressed_mood: MRSScore | null;
  irritability: MRSScore | null;
  anxiety: MRSScore | null;
  exhaustion: MRSScore | null;
  sexual_problems: MRSScore | null;
  bladder_problems: MRSScore | null;
  vaginal_dryness: MRSScore | null;
  joint_muscle_pain: MRSScore | null;
  dry_itchy_skin: MRSScore | null;
  brain_fog: MRSScore | null;
  irregular_periods: MRSScore | null;
  heavy_bleeding: MRSScore | null;
  misophonia: MRSScore | null;
  checkin_type: CheckinType;
  total_score: number;
  somatic_score: number;
  psychological_score: number;
  urogenital_score: number;
  overall_wellbeing: number | null;
  notes: string | null;
  is_backdated: boolean;
  created_at: string;
}

export interface ExtendedSymptomLog {
  id: string;
  user_id: string;
  checkin_id: string;
  symptom_key: string;
  /** @deprecated Use severity_score — legacy mild/moderate/severe */
  severity: SymptomSeverity | null;
  severity_score: MRSScore | null;
  created_at: string;
}

export type QuickLogTriggerTag =
  | 'stress'
  | 'food'
  | 'exercise'
  | 'heat'
  | 'poor_sleep'
  | 'missed_dose'
  | 'alcohol'
  | 'caffeine'
  | 'unknown'
  | 'other';

export interface QuickLogEvent {
  id: string;
  user_id: string;
  symptom_id: string;
  severity: number;
  logged_at: string;
  duration_minutes: number | null;
  trigger_tag: QuickLogTriggerTag | null;
  notes: string | null;
  created_at: string;
}

export interface QuickLogEventInsert {
  symptom_id: string;
  severity: number;
  logged_at?: string;
  duration_minutes?: number | null;
  trigger_tag?: QuickLogTriggerTag | null;
  notes?: string | null;
}

export interface LabResult {
  id: string;
  user_id: string;
  draw_date: string;
  fasting: boolean | null;
  draw_time: string | null;
  lab_name: string | null;
  estradiol: number | null;
  estrone: number | null;
  progesterone: number | null;
  total_testosterone: number | null;
  free_testosterone: number | null;
  dhea_s: number | null;
  shbg: number | null;
  fsh: number | null;
  lh: number | null;
  tsh: number | null;
  free_t3: number | null;
  free_t4: number | null;
  cortisol_am: number | null;
  vitamin_d: number | null;
  ferritin: number | null;
  fasting_insulin: number | null;
  hba1c: number | null;
  hs_crp: number | null;
  homocysteine: number | null;
  prolactin: number | null;
  igf1: number | null;
  total_cholesterol: number | null;
  ldl: number | null;
  hdl: number | null;
  triglycerides: number | null;
  notes: string | null;
  created_at: string;
}

export interface MedicationChange {
  id: string;
  user_id: string;
  medication_id: string | null;
  change_type: MedicationChangeType;
  previous_dose: number | null;
  new_dose: number | null;
  previous_method: string | null;
  new_method: string | null;
  change_date: string;
  notes: string | null;
  created_at: string;
}

export interface DismissedInsight {
  id: string;
  user_id: string;
  insight_id: string;
  dismissed_at: string;
}

export interface AiInsight {
  id: string;
  user_id: string;
  insight_type: InsightType;
  data_hash: string;
  insight_content: Record<string, unknown>;
  generated_at: string;
  expires_at: string | null;
}

export interface ReminderSchedule {
  id: string;
  user_id: string;
  reminder_type: ReminderType;
  frequency: string;
  preferred_time: string;
  is_active: boolean;
  last_sent_at: string | null;
  next_send_at: string | null;
  created_at: string;
}

export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: Profile;
        Insert: {
          id: string;
          display_name?: string | null;
          email?: string | null;
          menopause_stage?: MenopauseStage | null;
          straw_stage?: StrawStageCode | null;
          straw_stage_label?: string | null;
          menopause_cause?: MenopauseCause | null;
          last_period_timeframe?: LastPeriodTimeframe | null;
          periods_status?: PeriodsStatus | null;
          period_changes?: PeriodChanges | null;
          staging_completed_at?: string | null;
          has_uterus?: boolean;
          date_of_birth?: string | null;
          last_period_date?: string | null;
          checkin_frequency?: CheckinFrequency | null;
          checkin_day?: number | null;
          onboarding_completed?: boolean;
          timezone?: string;
        };
        Update: ProfileUpdate;
        Relationships: [];
      };
      medications: {
        Row: Medication;
        Insert: MedicationInsert & { user_id: string };
        Update: Partial<MedicationInsert>;
        Relationships: [];
      };
      dose_logs: {
        Row: DoseLog;
        Insert: Omit<DoseLog, 'id' | 'created_at'>;
        Update: Partial<Omit<DoseLog, 'id' | 'created_at'>>;
        Relationships: [];
      };
      medication_administrations: {
        Row: MedicationAdministration;
        Insert: MedicationAdministrationInsert & { user_id: string };
        Update: Partial<MedicationAdministrationInsert>;
        Relationships: [];
      };
      symptom_checkins: {
        Row: SymptomCheckin;
        Insert: Omit<
          SymptomCheckin,
          | 'id'
          | 'user_id'
          | 'total_score'
          | 'somatic_score'
          | 'psychological_score'
          | 'urogenital_score'
          | 'created_at'
        > & { user_id: string };
        Update: Partial<
          Omit<
            SymptomCheckin,
            | 'id'
            | 'user_id'
            | 'total_score'
            | 'somatic_score'
            | 'psychological_score'
            | 'urogenital_score'
            | 'created_at'
          >
        >;
        Relationships: [];
      };
      extended_symptom_logs: {
        Row: ExtendedSymptomLog;
        Insert: Omit<ExtendedSymptomLog, 'id' | 'created_at'>;
        Update: Partial<Omit<ExtendedSymptomLog, 'id' | 'created_at'>>;
        Relationships: [];
      };
      lab_results: {
        Row: LabResult;
        Insert: Omit<LabResult, 'id' | 'created_at'> & { user_id: string };
        Update: Partial<Omit<LabResult, 'id' | 'user_id' | 'created_at'>>;
        Relationships: [];
      };
      medication_changes: {
        Row: MedicationChange;
        Insert: Omit<MedicationChange, 'id' | 'created_at'>;
        Update: Partial<Omit<MedicationChange, 'id' | 'created_at'>>;
        Relationships: [];
      };
      ai_insights: {
        Row: AiInsight;
        Insert: Omit<AiInsight, 'id' | 'generated_at'>;
        Update: Partial<Omit<AiInsight, 'id' | 'generated_at'>>;
        Relationships: [];
      };
      reminder_schedule: {
        Row: ReminderSchedule;
        Insert: Omit<ReminderSchedule, 'id' | 'created_at'>;
        Update: Partial<Omit<ReminderSchedule, 'id' | 'created_at'>>;
        Relationships: [];
      };
      user_symptom_selections: {
        Row: UserSymptomSelection;
        Insert: Omit<UserSymptomSelection, 'id' | 'selected_at'>;
        Update: Partial<Omit<UserSymptomSelection, 'id' | 'selected_at'>>;
        Relationships: [];
      };
      quick_log_events: {
        Row: QuickLogEvent;
        Insert: QuickLogEventInsert & { user_id: string };
        Update: Partial<QuickLogEventInsert>;
        Relationships: [];
      };
      dismissed_insights: {
        Row: DismissedInsight;
        Insert: Omit<DismissedInsight, 'id' | 'dismissed_at'> & {
          dismissed_at?: string;
        };
        Update: Partial<Omit<DismissedInsight, 'id'>>;
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
  };
};
