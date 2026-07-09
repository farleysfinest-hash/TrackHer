ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS checkin_day SMALLINT
  CHECK (checkin_day BETWEEN 0 AND 6);

-- Existing users: default their check-in day from their signup weekday is not
-- derivable here; leave NULL and let the app treat NULL as "any day is fine".
