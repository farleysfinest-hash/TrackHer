-- Per-administration unit count (e.g. 2 × 200 mg capsules at bedtime)
ALTER TABLE medications
  ADD COLUMN IF NOT EXISTS units_per_dose INTEGER NOT NULL DEFAULT 1
  CHECK (units_per_dose >= 1 AND units_per_dose <= 20);
