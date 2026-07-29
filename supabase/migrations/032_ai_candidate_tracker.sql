-- Dev signal: which AI-noticed candidates women see / dismiss, so recurring
-- shapes can be hand-written into patternEngine analyzers later.
-- The model NEVER writes analyzers.

CREATE TABLE IF NOT EXISTS public.ai_candidate_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  candidate_hash TEXT NOT NULL,
  title TEXT NOT NULL,
  action TEXT NOT NULL CHECK (action IN ('shown', 'dismissed', 'opened')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_ai_candidate_events_user_created
  ON public.ai_candidate_events (user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_ai_candidate_events_hash
  ON public.ai_candidate_events (candidate_hash);

ALTER TABLE public.ai_candidate_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "ai_candidate_events_select_own"
  ON public.ai_candidate_events
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "ai_candidate_events_insert_own"
  ON public.ai_candidate_events
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);
