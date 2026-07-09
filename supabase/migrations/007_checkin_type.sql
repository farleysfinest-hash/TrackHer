-- Distinguish wellbeing-only pulses from MRS check-ins so generated
-- total_score = 0 on pulse rows is never misread as a symptom-free day.
ALTER TABLE symptom_checkins
  ADD COLUMN IF NOT EXISTS checkin_type TEXT NOT NULL DEFAULT 'full'
  CHECK (checkin_type IN ('full', 'quick', 'pulse'));
