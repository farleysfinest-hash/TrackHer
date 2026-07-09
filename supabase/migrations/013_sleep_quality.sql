ALTER TABLE symptom_checkins
  ADD COLUMN IF NOT EXISTS sleep_quality SMALLINT
  CHECK (sleep_quality BETWEEN 1 AND 5);
