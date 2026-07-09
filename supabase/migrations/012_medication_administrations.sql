CREATE TABLE medication_administrations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  medication_id UUID NOT NULL REFERENCES medications(id) ON DELETE CASCADE,
  taken_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE medication_administrations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own administrations" ON medication_administrations
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE INDEX idx_med_admin_user_med_time
  ON medication_administrations(user_id, medication_id, taken_at DESC);
