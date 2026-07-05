-- ============================================================
-- TrackHer Database Schema
-- Migration: 001_initial_schema
-- ============================================================

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================
-- PROFILES (extends Supabase auth.users)
-- ============================================================
CREATE TABLE profiles (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  display_name TEXT,
  email TEXT,
  menopause_stage TEXT CHECK (menopause_stage IN (
    'perimenopause', 'menopause', 'postmenopause', 'surgical', 'unknown'
  )),
  has_uterus BOOLEAN DEFAULT TRUE,
  date_of_birth DATE,
  last_period_date DATE,
  checkin_frequency TEXT CHECK (checkin_frequency IN ('daily', 'weekly', 'monthly')),
  onboarding_completed BOOLEAN DEFAULT FALSE,
  timezone TEXT DEFAULT 'America/Los_Angeles',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Auto-create profile on user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, display_name)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'display_name', split_part(NEW.email, '@', 1))
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER profiles_updated_at
  BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================================
-- MEDICATIONS (user's current and historical HRT/BHRT regimen)
-- ============================================================
CREATE TABLE medications (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  hormone_category TEXT NOT NULL CHECK (hormone_category IN (
    'estrogen', 'progesterone', 'testosterone', 'combination',
    'dhea', 'oxytocin', 'thyroid', 'supplement', 'other'
  )),
  delivery_method TEXT NOT NULL CHECK (delivery_method IN (
    'patch', 'cream', 'gel', 'oral_capsule', 'oral_tablet',
    'injection', 'pellet', 'troche', 'sublingual',
    'vaginal_cream', 'vaginal_tablet', 'vaginal_ring', 'vaginal_suppository',
    'rectal', 'nasal_spray', 'spray', 'other'
  )),
  medication_name TEXT NOT NULL,
  dose_amount DECIMAL NOT NULL,
  dose_unit TEXT NOT NULL,
  secondary_dose_amount DECIMAL,
  secondary_dose_unit TEXT,
  tertiary_dose_amount DECIMAL,
  tertiary_dose_unit TEXT,
  frequency TEXT NOT NULL CHECK (frequency IN (
    'daily', 'twice_daily', 'three_times_daily',
    'weekly', 'twice_weekly', 'three_times_weekly',
    'every_other_day', 'every_two_weeks', 'every_three_weeks',
    'every_four_weeks', 'monthly',
    'cyclic', 'as_needed', 'custom',
    'every_three_months', 'every_four_months', 'every_five_months', 'every_six_months'
  )),
  frequency_details JSONB,
  application_site TEXT,
  start_date DATE NOT NULL,
  end_date DATE,
  is_active BOOLEAN DEFAULT TRUE,
  prescriber_name TEXT,
  pharmacy_name TEXT,
  notes TEXT,
  pellet_insertion_date DATE,
  pellet_expected_duration_months INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_medications_user_id ON medications(user_id);
CREATE INDEX idx_medications_active ON medications(user_id, is_active) WHERE is_active = TRUE;

CREATE TRIGGER medications_updated_at
  BEFORE UPDATE ON medications
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================================
-- DOSE LOGS (individual dose taken/missed events)
-- ============================================================
CREATE TABLE dose_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  medication_id UUID REFERENCES medications(id) ON DELETE CASCADE NOT NULL,
  logged_at TIMESTAMPTZ NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('taken', 'missed', 'late', 'skipped')),
  actual_dose DECIMAL,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_dose_logs_user_date ON dose_logs(user_id, logged_at DESC);
CREATE INDEX idx_dose_logs_medication ON dose_logs(medication_id, logged_at DESC);

-- ============================================================
-- SYMPTOM CHECK-INS (MRS core — one per day)
-- ============================================================
CREATE TABLE symptom_checkins (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  checkin_date DATE NOT NULL,
  hot_flashes INTEGER CHECK (hot_flashes BETWEEN 0 AND 4),
  heart_discomfort INTEGER CHECK (heart_discomfort BETWEEN 0 AND 4),
  sleep_problems INTEGER CHECK (sleep_problems BETWEEN 0 AND 4),
  depressed_mood INTEGER CHECK (depressed_mood BETWEEN 0 AND 4),
  irritability INTEGER CHECK (irritability BETWEEN 0 AND 4),
  anxiety INTEGER CHECK (anxiety BETWEEN 0 AND 4),
  exhaustion INTEGER CHECK (exhaustion BETWEEN 0 AND 4),
  sexual_problems INTEGER CHECK (sexual_problems BETWEEN 0 AND 4),
  bladder_problems INTEGER CHECK (bladder_problems BETWEEN 0 AND 4),
  vaginal_dryness INTEGER CHECK (vaginal_dryness BETWEEN 0 AND 4),
  joint_muscle_pain INTEGER CHECK (joint_muscle_pain BETWEEN 0 AND 4),
  dry_itchy_skin INTEGER CHECK (dry_itchy_skin BETWEEN 0 AND 4),
  brain_fog INTEGER CHECK (brain_fog BETWEEN 0 AND 4),
  irregular_periods INTEGER CHECK (irregular_periods BETWEEN 0 AND 4),
  heavy_bleeding INTEGER CHECK (heavy_bleeding BETWEEN 0 AND 4),
  misophonia INTEGER CHECK (misophonia BETWEEN 0 AND 4),
  total_score INTEGER GENERATED ALWAYS AS (
    COALESCE(hot_flashes,0) + COALESCE(heart_discomfort,0) + COALESCE(sleep_problems,0) +
    COALESCE(depressed_mood,0) + COALESCE(irritability,0) + COALESCE(anxiety,0) +
    COALESCE(exhaustion,0) + COALESCE(sexual_problems,0) + COALESCE(bladder_problems,0) +
    COALESCE(vaginal_dryness,0) + COALESCE(joint_muscle_pain,0) + COALESCE(dry_itchy_skin,0) +
    COALESCE(brain_fog,0) + COALESCE(irregular_periods,0) + COALESCE(heavy_bleeding,0) +
    COALESCE(misophonia,0)
  ) STORED,
  somatic_score INTEGER GENERATED ALWAYS AS (
    COALESCE(hot_flashes,0) + COALESCE(heart_discomfort,0) + COALESCE(joint_muscle_pain,0)
  ) STORED,
  psychological_score INTEGER GENERATED ALWAYS AS (
    COALESCE(sleep_problems,0) + COALESCE(depressed_mood,0) + COALESCE(irritability,0) +
    COALESCE(anxiety,0) + COALESCE(exhaustion,0)
  ) STORED,
  urogenital_score INTEGER GENERATED ALWAYS AS (
    COALESCE(sexual_problems,0) + COALESCE(bladder_problems,0) + COALESCE(vaginal_dryness,0)
  ) STORED,
  overall_wellbeing INTEGER CHECK (overall_wellbeing BETWEEN 1 AND 10),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, checkin_date)
);

CREATE INDEX idx_checkins_user_date ON symptom_checkins(user_id, checkin_date DESC);

-- ============================================================
-- EXTENDED SYMPTOM LOGS (many-to-many, linked to check-ins)
-- ============================================================
CREATE TABLE extended_symptom_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  checkin_id UUID REFERENCES symptom_checkins(id) ON DELETE CASCADE NOT NULL,
  symptom_key TEXT NOT NULL,
  severity TEXT CHECK (severity IN ('mild', 'moderate', 'severe')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_extended_symptoms_checkin ON extended_symptom_logs(checkin_id);
CREATE INDEX idx_extended_symptoms_user ON extended_symptom_logs(user_id, created_at DESC);

-- ============================================================
-- LAB RESULTS
-- ============================================================
CREATE TABLE lab_results (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  draw_date DATE NOT NULL,
  fasting BOOLEAN,
  draw_time TIME,
  lab_name TEXT,
  estradiol DECIMAL,
  estrone DECIMAL,
  progesterone DECIMAL,
  total_testosterone DECIMAL,
  free_testosterone DECIMAL,
  dhea_s DECIMAL,
  shbg DECIMAL,
  fsh DECIMAL,
  lh DECIMAL,
  tsh DECIMAL,
  free_t3 DECIMAL,
  free_t4 DECIMAL,
  cortisol_am DECIMAL,
  vitamin_d DECIMAL,
  ferritin DECIMAL,
  fasting_insulin DECIMAL,
  hba1c DECIMAL,
  hs_crp DECIMAL,
  homocysteine DECIMAL,
  prolactin DECIMAL,
  igf1 DECIMAL,
  total_cholesterol DECIMAL,
  ldl DECIMAL,
  hdl DECIMAL,
  triglycerides DECIMAL,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_labs_user_date ON lab_results(user_id, draw_date DESC);

-- ============================================================
-- MEDICATION CHANGES (tracks dose/method changes for pattern engine)
-- ============================================================
CREATE TABLE medication_changes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  medication_id UUID REFERENCES medications(id) ON DELETE SET NULL,
  change_type TEXT NOT NULL CHECK (change_type IN (
    'started', 'stopped', 'dose_increased', 'dose_decreased',
    'method_changed', 'frequency_changed', 'switched'
  )),
  previous_dose DECIMAL,
  new_dose DECIMAL,
  previous_method TEXT,
  new_method TEXT,
  change_date DATE NOT NULL,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_med_changes_user_date ON medication_changes(user_id, change_date DESC);

-- ============================================================
-- AI INSIGHTS CACHE
-- ============================================================
CREATE TABLE ai_insights (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  insight_type TEXT NOT NULL CHECK (insight_type IN (
    'dose_correlation', 'symptom_cluster', 'lab_discordance',
    'trend_alert', 'monthly_summary', 'report_narrative'
  )),
  data_hash TEXT NOT NULL,
  insight_content JSONB NOT NULL,
  generated_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ
);

CREATE INDEX idx_insights_user ON ai_insights(user_id, generated_at DESC);
CREATE INDEX idx_insights_hash ON ai_insights(user_id, data_hash);

-- ============================================================
-- REMINDER SCHEDULE
-- ============================================================
CREATE TABLE reminder_schedule (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  reminder_type TEXT NOT NULL CHECK (reminder_type IN ('checkin', 'medication', 'lab_due')),
  frequency TEXT NOT NULL,
  preferred_time TIME DEFAULT '09:00',
  is_active BOOLEAN DEFAULT TRUE,
  last_sent_at TIMESTAMPTZ,
  next_send_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- ROW LEVEL SECURITY — ALL TABLES
-- ============================================================
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE medications ENABLE ROW LEVEL SECURITY;
ALTER TABLE dose_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE symptom_checkins ENABLE ROW LEVEL SECURITY;
ALTER TABLE extended_symptom_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE lab_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE medication_changes ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_insights ENABLE ROW LEVEL SECURITY;
ALTER TABLE reminder_schedule ENABLE ROW LEVEL SECURITY;

CREATE POLICY "profiles_select_own" ON profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "profiles_update_own" ON profiles FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "profiles_insert_own" ON profiles FOR INSERT WITH CHECK (auth.uid() = id);

CREATE POLICY "medications_all_own" ON medications FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "dose_logs_all_own" ON dose_logs FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "checkins_all_own" ON symptom_checkins FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "extended_symptoms_all_own" ON extended_symptom_logs FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "labs_all_own" ON lab_results FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "med_changes_all_own" ON medication_changes FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "insights_all_own" ON ai_insights FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "reminders_all_own" ON reminder_schedule FOR ALL USING (auth.uid() = user_id);
