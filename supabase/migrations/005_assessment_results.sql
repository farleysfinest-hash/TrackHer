-- Assessment results table (stores completed instrument scores)
CREATE TABLE assessment_results (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  instrument_id TEXT NOT NULL,
  checkin_id UUID REFERENCES symptom_checkins(id) ON DELETE SET NULL,
  total_score NUMERIC NOT NULL,
  total_severity TEXT NOT NULL,
  subscale_scores JSONB NOT NULL,
  item_responses JSONB NOT NULL,
  assessed_at TIMESTAMPTZ DEFAULT now(),
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_assessment_user_instrument ON assessment_results(user_id, instrument_id, assessed_at);

ALTER TABLE assessment_results ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own assessments" ON assessment_results
  FOR ALL USING (auth.uid() = user_id);
