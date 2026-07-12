CREATE TABLE IF NOT EXISTS checkin_drafts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  target_date DATE NOT NULL,
  mode TEXT NOT NULL CHECK (mode IN ('full', 'quick')),
  schema_version INT NOT NULL DEFAULT 1,
  payload JSONB NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, target_date, mode)
);

ALTER TABLE checkin_drafts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users manage own checkin drafts" ON checkin_drafts;
CREATE POLICY "Users manage own checkin drafts" ON checkin_drafts
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_checkin_drafts_user_date
  ON checkin_drafts(user_id, target_date DESC);

DROP TRIGGER IF EXISTS checkin_drafts_updated_at ON checkin_drafts;
CREATE TRIGGER checkin_drafts_updated_at
  BEFORE UPDATE ON checkin_drafts
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
