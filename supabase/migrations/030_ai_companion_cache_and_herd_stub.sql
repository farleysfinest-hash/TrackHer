 Widen ai_insights cache types for the companion layer, and scaffold herd consent
-- + aggregate snapshots (no writers yet — personal AI only this pass).

ALTER TABLE public.ai_insights
  DROP CONSTRAINT IF EXISTS ai_insights_insight_type_check;

ALTER TABLE public.ai_insights
  ADD CONSTRAINT ai_insights_insight_type_check CHECK (
    insight_type IN (--
      'dose_correlation',
      'symptom_cluster',
      'lab_discordance',
      'trend_alert',
      'monthly_summary',
      'report_narrative',
      'insight_polish',
      'ai_candidate',
      'monitor_note',
      'gap_coach'
    )
  );

CREATE UNIQUE INDEX IF NOT EXISTS idx_ai_insights_user_type_hash
  ON public.ai_insights (user_id, insight_type, data_hash);

-- Opt-in for future anonymized herd stats (no Edge cross-user calls yet).
CREATE TABLE IF NOT EXISTS public.ai_herd_consent (
  user_id UUID PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
  consented BOOLEAN NOT NULL DEFAULT FALSE,
  consented_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.ai_herd_consent ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "ai_herd_consent_own" ON public.ai_herd_consent;
CREATE POLICY "ai_herd_consent_own"
  ON public.ai_herd_consent
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Nightly aggregate snapshots will land here later. Empty stub for now.
CREATE TABLE IF NOT EXISTS public.herd_aggregate_snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  stage_key TEXT NOT NULL,
  snapshot_date DATE NOT NULL,
  payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (stage_key, snapshot_date)
);

ALTER TABLE public.herd_aggregate_snapshots ENABLE ROW LEVEL SECURITY;

-- No client policies: service role / future jobs only. Authenticated users cannot read yet.
