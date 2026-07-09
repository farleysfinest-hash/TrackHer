import type { Profile, Medication, SymptomCheckin, MedicationChange, LabResult, QuickLogEvent } from '../types/database';
import type { MRSScore } from '../types/database';

function getPastDate(daysAgo: number): string {
  const d = new Date();
  d.setDate(d.getDate() - daysAgo);
  return d.toISOString().split('T')[0];
}

export { getPastDate };

export const MOCK_USER = {
  id: 'dev-user-00000000-0000-0000-0000-000000000000',
  email: 'dev@hormonewise.test',
  aud: 'authenticated',
  role: 'authenticated',
  created_at: new Date().toISOString(),
};

export const MOCK_PROFILE: Profile = {
  id: MOCK_USER.id,
  display_name: 'Dev User',
  email: MOCK_USER.email,
  menopause_stage: 'perimenopause',
  straw_stage: '-2',
  straw_stage_label: 'Early Menopausal Transition',
  menopause_cause: 'natural',
  last_period_timeframe: null,
  periods_status: 'changing',
  period_changes: 'variable',
  staging_completed_at: new Date().toISOString(),
  welcome_seen: true,
  has_uterus: true,
  date_of_birth: '1980-06-15',
  last_period_date: '2026-05-20',
  checkin_frequency: 'weekly',
  checkin_day: null,
  next_appointment_date: null,
  onboarding_completed: true,
  timezone: 'America/Los_Angeles',
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
};

export const MOCK_MEDICATIONS: Medication[] = [
  {
    id: 'med-001',
    user_id: MOCK_USER.id,
    hormone_category: 'estrogen',
    delivery_method: 'patch',
    medication_name: 'Vivelle-Dot',
    dose_amount: 0.05,
    dose_unit: 'mg/day',
    units_per_dose: 1,
    secondary_dose_amount: null,
    secondary_dose_unit: null,
    tertiary_dose_amount: null,
    tertiary_dose_unit: null,
    frequency: 'twice_weekly',
    frequency_details: null,
    application_site: 'lower_abdomen',
    start_date: getPastDate(90),
    end_date: null,
    is_active: true,
    prescriber_name: 'Dr. Smith',
    pharmacy_name: null,
    notes: null,
    pellet_insertion_date: null,
    pellet_expected_duration_months: null,
    created_at: getPastDate(90) + 'T00:00:00Z',
    updated_at: getPastDate(60) + 'T00:00:00Z',
  },
  {
    id: 'med-002',
    user_id: MOCK_USER.id,
    hormone_category: 'progesterone',
    delivery_method: 'oral_capsule',
    medication_name: 'Prometrium',
    dose_amount: 200,
    dose_unit: 'mg',
    units_per_dose: 1,
    secondary_dose_amount: null,
    secondary_dose_unit: null,
    tertiary_dose_amount: null,
    tertiary_dose_unit: null,
    frequency: 'daily',
    frequency_details: null,
    application_site: null,
    start_date: getPastDate(30),
    end_date: null,
    is_active: true,
    prescriber_name: 'Dr. Smith',
    pharmacy_name: null,
    notes: 'Take at bedtime',
    pellet_insertion_date: null,
    pellet_expected_duration_months: null,
    created_at: getPastDate(30) + 'T00:00:00Z',
    updated_at: getPastDate(30) + 'T00:00:00Z',
  },
  {
    id: 'med-003',
    user_id: MOCK_USER.id,
    hormone_category: 'testosterone',
    delivery_method: 'cream',
    medication_name: 'Compounded Testosterone Cream',
    dose_amount: 2,
    dose_unit: 'mg/day',
    units_per_dose: 1,
    secondary_dose_amount: null,
    secondary_dose_unit: null,
    tertiary_dose_amount: null,
    tertiary_dose_unit: null,
    frequency: 'daily',
    frequency_details: null,
    application_site: 'inner_thigh',
    start_date: getPastDate(75),
    end_date: null,
    is_active: true,
    prescriber_name: 'Dr. Smith',
    pharmacy_name: 'Womens International Pharmacy',
    notes: null,
    pellet_insertion_date: null,
    pellet_expected_duration_months: null,
    created_at: getPastDate(75) + 'T00:00:00Z',
    updated_at: getPastDate(75) + 'T00:00:00Z',
  },
];

export const MOCK_MEDICATION_CHANGES: MedicationChange[] = [
  {
    id: 'change-001',
    user_id: MOCK_USER.id,
    medication_id: 'med-001',
    change_type: 'started',
    previous_dose: null,
    new_dose: 0.025,
    previous_method: null,
    new_method: null,
    change_date: getPastDate(90),
    notes: 'Starting HRT',
    created_at: getPastDate(90) + 'T00:00:00Z',
  },
  {
    id: 'change-002',
    user_id: MOCK_USER.id,
    medication_id: 'med-001',
    change_type: 'dose_increased',
    previous_dose: 0.025,
    new_dose: 0.05,
    previous_method: null,
    new_method: null,
    change_date: getPastDate(60),
    notes: 'Hot flashes not adequately controlled',
    created_at: getPastDate(60) + 'T00:00:00Z',
  },
  {
    id: 'change-003',
    user_id: MOCK_USER.id,
    medication_id: 'med-002',
    change_type: 'started',
    previous_dose: null,
    new_dose: 200,
    previous_method: null,
    new_method: null,
    change_date: getPastDate(30),
    notes: 'Adding progesterone for anxiety and sleep',
    created_at: getPastDate(30) + 'T00:00:00Z',
  },
  {
    id: 'change-004',
    user_id: MOCK_USER.id,
    medication_id: 'med-003',
    change_type: 'started',
    previous_dose: null,
    new_dose: 2,
    previous_method: null,
    new_method: null,
    change_date: getPastDate(75),
    notes: null,
    created_at: getPastDate(75) + 'T00:00:00Z',
  },
];

interface WeekScores {
  daysAgo: number;
  hot_flashes: MRSScore;
  heart_discomfort: MRSScore;
  sleep_problems: MRSScore;
  depressed_mood: MRSScore;
  irritability: MRSScore;
  anxiety: MRSScore;
  exhaustion: MRSScore;
  sexual_problems: MRSScore;
  bladder_problems: MRSScore;
  vaginal_dryness: MRSScore;
  joint_muscle_pain: MRSScore;
  dry_itchy_skin: MRSScore;
  brain_fog: MRSScore;
  irregular_periods: MRSScore;
  heavy_bleeding: MRSScore;
  misophonia: MRSScore;
  wellbeing: number;
  notes?: string;
}

const WEEKLY_NARRATIVE: WeekScores[] = [
  { daysAgo: 84, hot_flashes: 4, heart_discomfort: 1, sleep_problems: 4, depressed_mood: 3, irritability: 3, anxiety: 3, exhaustion: 4, sexual_problems: 2, bladder_problems: 1, vaginal_dryness: 2, joint_muscle_pain: 3, dry_itchy_skin: 2, brain_fog: 4, irregular_periods: 2, heavy_bleeding: 1, misophonia: 2, wellbeing: 3 },
  { daysAgo: 77, hot_flashes: 4, heart_discomfort: 1, sleep_problems: 4, depressed_mood: 3, irritability: 3, anxiety: 3, exhaustion: 4, sexual_problems: 2, bladder_problems: 1, vaginal_dryness: 2, joint_muscle_pain: 3, dry_itchy_skin: 2, brain_fog: 4, irregular_periods: 2, heavy_bleeding: 0, misophonia: 2, wellbeing: 3 },
  { daysAgo: 70, hot_flashes: 4, heart_discomfort: 0, sleep_problems: 4, depressed_mood: 2, irritability: 3, anxiety: 3, exhaustion: 4, sexual_problems: 2, bladder_problems: 1, vaginal_dryness: 2, joint_muscle_pain: 3, dry_itchy_skin: 1, brain_fog: 4, irregular_periods: 1, heavy_bleeding: 0, misophonia: 1, wellbeing: 4 },
  { daysAgo: 63, hot_flashes: 3, heart_discomfort: 1, sleep_problems: 4, depressed_mood: 2, irritability: 3, anxiety: 3, exhaustion: 3, sexual_problems: 2, bladder_problems: 0, vaginal_dryness: 2, joint_muscle_pain: 2, dry_itchy_skin: 1, brain_fog: 3, irregular_periods: 2, heavy_bleeding: 0, misophonia: 1, wellbeing: 4 },
  { daysAgo: 56, hot_flashes: 3, heart_discomfort: 0, sleep_problems: 3, depressed_mood: 2, irritability: 2, anxiety: 3, exhaustion: 3, sexual_problems: 1, bladder_problems: 0, vaginal_dryness: 2, joint_muscle_pain: 2, dry_itchy_skin: 1, brain_fog: 3, irregular_periods: 2, heavy_bleeding: 0, misophonia: 1, wellbeing: 5, notes: 'Patch dose increased — hoping for improvement' },
  { daysAgo: 49, hot_flashes: 3, heart_discomfort: 0, sleep_problems: 3, depressed_mood: 2, irritability: 2, anxiety: 3, exhaustion: 3, sexual_problems: 1, bladder_problems: 0, vaginal_dryness: 1, joint_muscle_pain: 2, dry_itchy_skin: 1, brain_fog: 2, irregular_periods: 1, heavy_bleeding: 0, misophonia: 1, wellbeing: 5 },
  { daysAgo: 42, hot_flashes: 2, heart_discomfort: 0, sleep_problems: 3, depressed_mood: 2, irritability: 2, anxiety: 3, exhaustion: 2, sexual_problems: 1, bladder_problems: 0, vaginal_dryness: 1, joint_muscle_pain: 2, dry_itchy_skin: 1, brain_fog: 2, irregular_periods: 1, heavy_bleeding: 0, misophonia: 1, wellbeing: 5 },
  { daysAgo: 35, hot_flashes: 2, heart_discomfort: 0, sleep_problems: 3, depressed_mood: 1, irritability: 2, anxiety: 2, exhaustion: 2, sexual_problems: 1, bladder_problems: 0, vaginal_dryness: 1, joint_muscle_pain: 2, dry_itchy_skin: 1, brain_fog: 2, irregular_periods: 1, heavy_bleeding: 0, misophonia: 0, wellbeing: 6 },
  { daysAgo: 28, hot_flashes: 2, heart_discomfort: 0, sleep_problems: 2, depressed_mood: 1, irritability: 1, anxiety: 2, exhaustion: 2, sexual_problems: 1, bladder_problems: 0, vaginal_dryness: 1, joint_muscle_pain: 2, dry_itchy_skin: 1, brain_fog: 2, irregular_periods: 1, heavy_bleeding: 0, misophonia: 0, wellbeing: 6, notes: 'Started Prometrium — sleep improving slightly' },
  { daysAgo: 21, hot_flashes: 2, heart_discomfort: 0, sleep_problems: 2, depressed_mood: 1, irritability: 1, anxiety: 1, exhaustion: 2, sexual_problems: 1, bladder_problems: 0, vaginal_dryness: 1, joint_muscle_pain: 2, dry_itchy_skin: 1, brain_fog: 2, irregular_periods: 1, heavy_bleeding: 0, misophonia: 0, wellbeing: 6 },
  { daysAgo: 14, hot_flashes: 2, heart_discomfort: 0, sleep_problems: 2, depressed_mood: 1, irritability: 1, anxiety: 1, exhaustion: 2, sexual_problems: 1, bladder_problems: 0, vaginal_dryness: 1, joint_muscle_pain: 2, dry_itchy_skin: 1, brain_fog: 2, irregular_periods: 2, heavy_bleeding: 0, misophonia: 1, wellbeing: 6 },
  { daysAgo: 7, hot_flashes: 2, heart_discomfort: 0, sleep_problems: 2, depressed_mood: 1, irritability: 2, anxiety: 2, exhaustion: 2, sexual_problems: 1, bladder_problems: 0, vaginal_dryness: 1, joint_muscle_pain: 2, dry_itchy_skin: 1, brain_fog: 2, irregular_periods: 2, heavy_bleeding: 0, misophonia: 0, wellbeing: 6 },
  { daysAgo: 3, hot_flashes: 2, heart_discomfort: 0, sleep_problems: 2, depressed_mood: 1, irritability: 2, anxiety: 2, exhaustion: 2, sexual_problems: 1, bladder_problems: 0, vaginal_dryness: 1, joint_muscle_pain: 2, dry_itchy_skin: 1, brain_fog: 2, irregular_periods: 2, heavy_bleeding: 0, misophonia: 0, wellbeing: 6 },
  { daysAgo: 0, hot_flashes: 2, heart_discomfort: 0, sleep_problems: 1, depressed_mood: 1, irritability: 1, anxiety: 1, exhaustion: 2, sexual_problems: 1, bladder_problems: 0, vaginal_dryness: 1, joint_muscle_pain: 2, dry_itchy_skin: 1, brain_fog: 2, irregular_periods: 2, heavy_bleeding: 0, misophonia: 1, wellbeing: 7, notes: 'Feeling much better overall' },
];

function buildCheckin(week: WeekScores, index: number): SymptomCheckin {
  const somatic = week.hot_flashes + week.heart_discomfort + week.sleep_problems + week.joint_muscle_pain;
  const psychological =
    week.depressed_mood + week.irritability + week.anxiety + week.exhaustion;
  const urogenital = week.sexual_problems + week.bladder_problems + week.vaginal_dryness;
  const total = somatic + psychological + urogenital;

  const date = getPastDate(week.daysAgo);
  return {
    id: `checkin-${String(index + 1).padStart(3, '0')}`,
    user_id: MOCK_USER.id,
    checkin_date: date,
    hot_flashes: week.hot_flashes,
    heart_discomfort: week.heart_discomfort,
    sleep_problems: week.sleep_problems,
    depressed_mood: week.depressed_mood,
    irritability: week.irritability,
    anxiety: week.anxiety,
    exhaustion: week.exhaustion,
    sexual_problems: week.sexual_problems,
    bladder_problems: week.bladder_problems,
    vaginal_dryness: week.vaginal_dryness,
    joint_muscle_pain: week.joint_muscle_pain,
    dry_itchy_skin: week.dry_itchy_skin,
    brain_fog: week.brain_fog,
    irregular_periods: week.irregular_periods,
    heavy_bleeding: week.heavy_bleeding,
    misophonia: week.misophonia,
    checkin_type: 'full',
    total_score: total,
    somatic_score: somatic,
    psychological_score: psychological,
    urogenital_score: urogenital,
    overall_wellbeing: week.wellbeing,
    sleep_quality: null,
    notes: week.notes ?? null,
    is_backdated: false,
    created_at: date + 'T10:00:00Z',
  };
}

export const MOCK_CHECKINS: SymptomCheckin[] = WEEKLY_NARRATIVE.map(buildCheckin);

export const MOCK_LAB_RESULTS: LabResult[] = [
  {
    id: 'lab-001',
    user_id: MOCK_USER.id,
    draw_date: getPastDate(7),
    fasting: true,
    draw_time: '08:30',
    lab_name: 'Quest Diagnostics',
    estradiol: 85,
    estrone: 42,
    progesterone: 8.5,
    total_testosterone: 38,
    free_testosterone: 3.2,
    dhea_s: 180,
    shbg: 65,
    fsh: 45,
    lh: 32,
    tsh: 2.1,
    free_t3: 3.2,
    free_t4: 1.2,
    cortisol_am: 14,
    vitamin_d: 55,
    ferritin: 48,
    fasting_insulin: 4.8,
    hba1c: 5.2,
    hs_crp: 0.8,
    homocysteine: 7,
    prolactin: null,
    igf1: null,
    total_cholesterol: 210,
    ldl: 125,
    hdl: 62,
    triglycerides: 95,
    notes: 'Drawn fasting, 2 days after patch change',
    created_at: getPastDate(7) + 'T09:00:00Z',
  },
  {
    id: 'lab-002',
    user_id: MOCK_USER.id,
    draw_date: getPastDate(97),
    fasting: true,
    draw_time: '08:00',
    lab_name: 'Quest Diagnostics',
    estradiol: 42,
    estrone: 38,
    progesterone: 0.3,
    total_testosterone: 18,
    free_testosterone: 1.1,
    dhea_s: 120,
    shbg: 72,
    fsh: 68,
    lh: 48,
    tsh: 3.4,
    free_t3: 2.6,
    free_t4: 1.1,
    cortisol_am: 18,
    vitamin_d: 28,
    ferritin: 22,
    fasting_insulin: 8.2,
    hba1c: 5.5,
    hs_crp: 2.4,
    homocysteine: 12,
    prolactin: null,
    igf1: null,
    total_cholesterol: 235,
    ldl: 148,
    hdl: 52,
    triglycerides: 130,
    notes: 'Baseline labs before starting HRT',
    created_at: getPastDate(97) + 'T09:00:00Z',
  },
];

export const MOCK_QUICK_LOGS: QuickLogEvent[] = [
  {
    id: 'ql-001',
    user_id: MOCK_USER.id,
    symptom_id: 'brain_fog',
    severity: 6,
    logged_at: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
    duration_minutes: 45,
    trigger_tag: 'poor_sleep',
    notes: null,
    created_at: new Date().toISOString(),
  },
  {
    id: 'ql-002',
    user_id: MOCK_USER.id,
    symptom_id: 'headaches',
    severity: 4,
    logged_at: new Date(Date.now() - 5 * 60 * 60 * 1000).toISOString(),
    duration_minutes: 22,
    trigger_tag: 'stress',
    notes: 'After work meeting',
    created_at: new Date().toISOString(),
  },
  {
    id: 'ql-003',
    user_id: MOCK_USER.id,
    symptom_id: 'night_sweats',
    severity: 8,
    logged_at: new Date(Date.now() - 20 * 60 * 60 * 1000).toISOString(),
    duration_minutes: null,
    trigger_tag: 'heat',
    notes: null,
    created_at: new Date().toISOString(),
  },
];
