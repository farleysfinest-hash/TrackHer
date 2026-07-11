-- total_score / subscale columns remain GENERATED STORED (NOT NULL) and coerce null items to 0.
-- mrs_complete is the schema boundary flag: consumers must verify it before trusting generated scores.

ALTER TABLE symptom_checkins
  ADD COLUMN IF NOT EXISTS mrs_complete BOOLEAN NOT NULL DEFAULT false;

UPDATE symptom_checkins
SET mrs_complete = (
  checkin_type IS DISTINCT FROM 'pulse'
  AND hot_flashes IS NOT NULL
  AND heart_discomfort IS NOT NULL
  AND sleep_problems IS NOT NULL
  AND depressed_mood IS NOT NULL
  AND irritability IS NOT NULL
  AND anxiety IS NOT NULL
  AND exhaustion IS NOT NULL
  AND sexual_problems IS NOT NULL
  AND bladder_problems IS NOT NULL
  AND vaginal_dryness IS NOT NULL
  AND joint_muscle_pain IS NOT NULL
);
