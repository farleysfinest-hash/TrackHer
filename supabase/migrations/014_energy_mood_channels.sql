ALTER TABLE symptom_checkins
  ADD COLUMN IF NOT EXISTS energy_level SMALLINT
  CHECK (energy_level BETWEEN 1 AND 5);

ALTER TABLE symptom_checkins
  ADD COLUMN IF NOT EXISTS mood_level SMALLINT
  CHECK (mood_level BETWEEN 1 AND 5);

NOTIFY pgrst, 'reload schema';
