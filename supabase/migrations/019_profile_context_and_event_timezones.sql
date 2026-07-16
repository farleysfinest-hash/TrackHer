-- Remove location and clinical defaults that previously fabricated answers.
-- Profiles may be temporarily unanswered before onboarding, but a completed profile must have
-- explicit confirmations. NOT VALID preserves legacy rows until the app asks each user once.
ALTER TABLE profiles
  ALTER COLUMN has_uterus DROP DEFAULT,
  ALTER COLUMN timezone DROP DEFAULT,
  ADD COLUMN has_uterus_confirmed_at TIMESTAMPTZ,
  ADD COLUMN timezone_confirmed_at TIMESTAMPTZ;

ALTER TABLE profiles
  ADD CONSTRAINT profiles_completed_require_confirmed_context
  CHECK (
    onboarding_completed IS NOT TRUE
    OR (
      has_uterus IS NOT NULL
      AND has_uterus_confirmed_at IS NOT NULL
      AND NULLIF(BTRIM(timezone), '') IS NOT NULL
      AND timezone_confirmed_at IS NOT NULL
    )
  ) NOT VALID;

-- Preserve how new timestamped events were experienced locally. Existing events remain NULL
-- because their original event timezone cannot be recovered safely.
ALTER TABLE quick_log_events
  ADD COLUMN event_timezone TEXT,
  ADD COLUMN local_date DATE,
  ADD COLUMN utc_offset_minutes SMALLINT,
  ADD CONSTRAINT quick_log_event_offset_range
    CHECK (utc_offset_minutes IS NULL OR utc_offset_minutes BETWEEN -840 AND 840);

ALTER TABLE medication_administrations
  ADD COLUMN event_timezone TEXT,
  ADD COLUMN local_date DATE,
  ADD COLUMN utc_offset_minutes SMALLINT,
  ADD CONSTRAINT medication_administration_offset_range
    CHECK (utc_offset_minutes IS NULL OR utc_offset_minutes BETWEEN -840 AND 840);

CREATE INDEX idx_quick_log_user_local_date
  ON quick_log_events(user_id, local_date DESC);

CREATE INDEX idx_med_admin_user_local_date
  ON medication_administrations(user_id, local_date DESC);
