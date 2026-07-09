CREATE TABLE dismissed_insights (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  insight_id TEXT NOT NULL,
  dismissed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, insight_id)
);

ALTER TABLE dismissed_insights ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own dismissals" ON dismissed_insights
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE INDEX idx_dismissed_insights_user ON dismissed_insights(user_id);
