-- MRS separation: recalculate generated scores using only the canonical 11 items
-- Psychological: depressed_mood, irritability, anxiety, exhaustion (max 16)
-- Somatic: hot_flashes, heart_discomfort, sleep_problems, joint_muscle_pain (max 16)
-- Urogenital: sexual_problems, bladder_problems, vaginal_dryness (max 12)
-- Total max: 44

ALTER TABLE symptom_checkins DROP COLUMN IF EXISTS total_score;
ALTER TABLE symptom_checkins DROP COLUMN IF EXISTS somatic_score;
ALTER TABLE symptom_checkins DROP COLUMN IF EXISTS psychological_score;
ALTER TABLE symptom_checkins DROP COLUMN IF EXISTS urogenital_score;

ALTER TABLE symptom_checkins ADD COLUMN total_score INTEGER GENERATED ALWAYS AS (
  COALESCE(depressed_mood,0) + COALESCE(irritability,0) + COALESCE(anxiety,0) + COALESCE(exhaustion,0) +
  COALESCE(hot_flashes,0) + COALESCE(heart_discomfort,0) + COALESCE(sleep_problems,0) + COALESCE(joint_muscle_pain,0) +
  COALESCE(sexual_problems,0) + COALESCE(bladder_problems,0) + COALESCE(vaginal_dryness,0)
) STORED;

ALTER TABLE symptom_checkins ADD COLUMN somatic_score INTEGER GENERATED ALWAYS AS (
  COALESCE(hot_flashes,0) + COALESCE(heart_discomfort,0) + COALESCE(sleep_problems,0) + COALESCE(joint_muscle_pain,0)
) STORED;

ALTER TABLE symptom_checkins ADD COLUMN psychological_score INTEGER GENERATED ALWAYS AS (
  COALESCE(depressed_mood,0) + COALESCE(irritability,0) + COALESCE(anxiety,0) + COALESCE(exhaustion,0)
) STORED;

ALTER TABLE symptom_checkins ADD COLUMN urogenital_score INTEGER GENERATED ALWAYS AS (
  COALESCE(sexual_problems,0) + COALESCE(bladder_problems,0) + COALESCE(vaginal_dryness,0)
) STORED;

-- Extended symptom logs: support 0-4 numeric severity
ALTER TABLE extended_symptom_logs ADD COLUMN IF NOT EXISTS severity_score INTEGER
  CHECK (severity_score >= 0 AND severity_score <= 4);

-- Quick-log events for watch symptoms
CREATE TABLE IF NOT EXISTS quick_log_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  symptom_id TEXT NOT NULL,
  severity INTEGER NOT NULL CHECK (severity >= 0 AND severity <= 10),
  logged_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  duration_minutes INTEGER,
  trigger_tag TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_quick_log_user_symptom ON quick_log_events(user_id, symptom_id, logged_at DESC);

ALTER TABLE quick_log_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users manage own quick logs" ON quick_log_events;
CREATE POLICY "Users manage own quick logs" ON quick_log_events
  FOR ALL USING (auth.uid() = user_id);
