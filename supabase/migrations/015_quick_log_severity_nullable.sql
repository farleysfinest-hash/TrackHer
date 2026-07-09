ALTER TABLE quick_log_events
  ALTER COLUMN severity DROP NOT NULL;

NOTIFY pgrst, 'reload schema';
