ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS next_appointment_date DATE;
