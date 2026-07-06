-- STRAW+10 staging fields on profiles
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS straw_stage TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS straw_stage_label TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS menopause_cause TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS last_period_timeframe TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS periods_status TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS period_changes TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS staging_completed_at TIMESTAMPTZ;

-- User's selected extended symptoms for check-ins and quick-log watch list
CREATE TABLE IF NOT EXISTS user_symptom_selections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  symptom_id TEXT NOT NULL,
  is_watch_symptom BOOLEAN DEFAULT false,
  selected_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, symptom_id)
);

ALTER TABLE user_symptom_selections ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own symptom selections" ON user_symptom_selections
  FOR ALL USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_user_symptom_selections_user_id
  ON user_symptom_selections(user_id);
