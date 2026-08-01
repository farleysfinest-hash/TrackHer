-- Persistent, user-scoped Luna conversations, consent-gated memories,
-- lightweight feedback, and short-lived cross-thread crisis continuity.

ALTER TABLE public.ai_insights
  DROP CONSTRAINT IF EXISTS ai_insights_insight_type_check;

DELETE FROM public.ai_insights
WHERE insight_type = 'daily_line';

ALTER TABLE public.ai_insights
  ADD CONSTRAINT ai_insights_insight_type_check CHECK (
    insight_type IN (
      'dose_correlation',
      'symptom_cluster',
      'lab_discordance',
      'trend_alert',
      'monthly_summary',
      'report_narrative',
      'insight_polish',
      'ai_candidate',
      'monitor_note',
      'gap_coach',
      'visit_prep',
      'dose_watch',
      'stage_explain',
      'partner_letter',
      'luna_synthesis'
    )
  );

CREATE TABLE IF NOT EXISTS public.luna_threads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  kind TEXT NOT NULL CHECK (
    kind IN ('dashboard', 'medication', 'checkin', 'mrs', 'lab', 'insight', 'general')
  ),
  title TEXT NOT NULL DEFAULT 'Luna',
  context_data JSONB NOT NULL DEFAULT '{}'::jsonb,
  summary TEXT,
  summary_message_count INTEGER NOT NULL DEFAULT 0 CHECK (summary_message_count >= 0),
  is_dashboard_primary BOOLEAN NOT NULL DEFAULT FALSE,
  last_message_preview TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_luna_threads_dashboard_primary
  ON public.luna_threads(user_id)
  WHERE kind = 'dashboard' AND is_dashboard_primary = TRUE;

CREATE INDEX IF NOT EXISTS idx_luna_threads_user_updated
  ON public.luna_threads(user_id, updated_at DESC);

ALTER TABLE public.luna_threads ENABLE ROW LEVEL SECURITY;

CREATE POLICY "luna_threads_select_own"
  ON public.luna_threads FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "luna_threads_insert_own"
  ON public.luna_threads FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "luna_threads_update_own"
  ON public.luna_threads FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "luna_threads_delete_own"
  ON public.luna_threads FOR DELETE
  USING (auth.uid() = user_id);

CREATE TABLE IF NOT EXISTS public.luna_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  thread_id UUID NOT NULL REFERENCES public.luna_threads(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('user', 'assistant')),
  content TEXT NOT NULL CHECK (char_length(content) BETWEEN 1 AND 12000),
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  crisis_tier TEXT CHECK (
    crisis_tier IS NULL OR
    crisis_tier IN ('mental_decline', 'crisis', 'crisis_imminent', 'loved_one')
  ),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_luna_messages_thread_created
  ON public.luna_messages(thread_id, created_at ASC);

CREATE INDEX IF NOT EXISTS idx_luna_messages_user_created
  ON public.luna_messages(user_id, created_at DESC);

ALTER TABLE public.luna_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "luna_messages_select_own"
  ON public.luna_messages FOR SELECT
  USING (
    auth.uid() = user_id AND
    EXISTS (
      SELECT 1
      FROM public.luna_threads t
      WHERE t.id = thread_id AND t.user_id = auth.uid()
    )
  );

CREATE POLICY "luna_messages_insert_own"
  ON public.luna_messages FOR INSERT
  WITH CHECK (
    auth.uid() = user_id AND
    EXISTS (
      SELECT 1
      FROM public.luna_threads t
      WHERE t.id = thread_id AND t.user_id = auth.uid()
    )
  );

CREATE POLICY "luna_messages_update_own"
  ON public.luna_messages FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "luna_messages_delete_own"
  ON public.luna_messages FOR DELETE
  USING (auth.uid() = user_id);

CREATE TABLE IF NOT EXISTS public.luna_memories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  content TEXT NOT NULL CHECK (char_length(content) BETWEEN 1 AND 1000),
  source_thread_id UUID REFERENCES public.luna_threads(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_luna_memories_user_updated
  ON public.luna_memories(user_id, updated_at DESC);

ALTER TABLE public.luna_memories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "luna_memories_select_own"
  ON public.luna_memories FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "luna_memories_insert_own"
  ON public.luna_memories FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "luna_memories_update_own"
  ON public.luna_memories FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "luna_memories_delete_own"
  ON public.luna_memories FOR DELETE
  USING (auth.uid() = user_id);

CREATE TABLE IF NOT EXISTS public.luna_crisis_state (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  tier TEXT NOT NULL CHECK (
    tier IN ('mental_decline', 'crisis', 'crisis_imminent', 'loved_one')
  ),
  response_count INTEGER NOT NULL DEFAULT 0 CHECK (response_count >= 0),
  presented_actions JSONB NOT NULL DEFAULT '[]'::jsonb,
  asked_questions JSONB NOT NULL DEFAULT '[]'::jsonb,
  escalated BOOLEAN NOT NULL DEFAULT FALSE,
  last_activity_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at TIMESTAMPTZ NOT NULL
);

ALTER TABLE public.luna_crisis_state ENABLE ROW LEVEL SECURITY;

CREATE POLICY "luna_crisis_state_select_own"
  ON public.luna_crisis_state FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "luna_crisis_state_insert_own"
  ON public.luna_crisis_state FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "luna_crisis_state_update_own"
  ON public.luna_crisis_state FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "luna_crisis_state_delete_own"
  ON public.luna_crisis_state FOR DELETE
  USING (auth.uid() = user_id);

CREATE TABLE IF NOT EXISTS public.luna_feedback (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  thread_id UUID REFERENCES public.luna_threads(id) ON DELETE CASCADE,
  message_id UUID REFERENCES public.luna_messages(id) ON DELETE CASCADE,
  insight_key TEXT,
  rating TEXT NOT NULL CHECK (
    rating IN (
      'helpful',
      'not_helpful',
      'incorrect',
      'too_obvious',
      'missing_context',
      'new_understanding'
    )
  ),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CHECK (message_id IS NOT NULL OR insight_key IS NOT NULL)
);

CREATE INDEX IF NOT EXISTS idx_luna_feedback_user_created
  ON public.luna_feedback(user_id, created_at DESC);

ALTER TABLE public.luna_feedback ENABLE ROW LEVEL SECURITY;

CREATE POLICY "luna_feedback_select_own"
  ON public.luna_feedback FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "luna_feedback_insert_own"
  ON public.luna_feedback FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "luna_feedback_delete_own"
  ON public.luna_feedback FOR DELETE
  USING (auth.uid() = user_id);

DROP TRIGGER IF EXISTS luna_threads_updated_at ON public.luna_threads;
CREATE TRIGGER luna_threads_updated_at
  BEFORE UPDATE ON public.luna_threads
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

DROP TRIGGER IF EXISTS luna_memories_updated_at ON public.luna_memories;
CREATE TRIGGER luna_memories_updated_at
  BEFORE UPDATE ON public.luna_memories
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- Account reset keeps authentication but clears Luna alongside all other app data.
CREATE OR REPLACE FUNCTION public.reset_user_app_data()
RETURNS public.profiles
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_user_id UUID := auth.uid();
  v_profile public.profiles%ROWTYPE;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  DELETE FROM public.luna_feedback WHERE user_id = v_user_id;
  DELETE FROM public.luna_crisis_state WHERE user_id = v_user_id;
  DELETE FROM public.luna_memories WHERE user_id = v_user_id;
  DELETE FROM public.luna_messages WHERE user_id = v_user_id;
  DELETE FROM public.luna_threads WHERE user_id = v_user_id;
  DELETE FROM public.ai_candidate_events WHERE user_id = v_user_id;
  DELETE FROM public.ai_herd_consent WHERE user_id = v_user_id;
  DELETE FROM public.quick_log_events WHERE user_id = v_user_id;
  DELETE FROM public.extended_symptom_logs WHERE user_id = v_user_id;
  DELETE FROM public.assessment_results WHERE user_id = v_user_id;
  DELETE FROM public.symptom_checkins WHERE user_id = v_user_id;
  DELETE FROM public.user_symptom_selections WHERE user_id = v_user_id;
  DELETE FROM public.dose_logs WHERE user_id = v_user_id;
  DELETE FROM public.medication_administrations WHERE user_id = v_user_id;
  DELETE FROM public.medication_changes WHERE user_id = v_user_id;
  DELETE FROM public.medications WHERE user_id = v_user_id;
  DELETE FROM public.lab_results WHERE user_id = v_user_id;
  DELETE FROM public.ai_insights WHERE user_id = v_user_id;
  DELETE FROM public.reminder_schedule WHERE user_id = v_user_id;
  DELETE FROM public.dismissed_insights WHERE user_id = v_user_id;
  DELETE FROM public.checkin_drafts WHERE user_id = v_user_id;

  UPDATE public.profiles SET
    display_name = NULL,
    onboarding_completed = FALSE,
    welcome_seen = FALSE,
    ui_state = '{}'::jsonb,
    straw_stage = NULL,
    straw_stage_label = NULL,
    menopause_stage = NULL,
    menopause_cause = NULL,
    periods_status = NULL,
    period_changes = NULL,
    last_period_timeframe = NULL,
    last_period_date = NULL,
    staging_completed_at = NULL,
    date_of_birth = NULL,
    has_uterus = NULL,
    has_uterus_confirmed_at = NULL,
    checkin_frequency = NULL,
    checkin_day = NULL,
    next_appointment_date = NULL,
    timezone = NULL,
    timezone_confirmed_at = NULL
  WHERE id = v_user_id
  RETURNING * INTO v_profile;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Profile not found';
  END IF;
  RETURN v_profile;
END;
$$;

REVOKE ALL ON FUNCTION public.reset_user_app_data() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.reset_user_app_data() TO authenticated;

-- Keep explicit account deletion complete even before the auth.users cascade runs.
CREATE OR REPLACE FUNCTION public.delete_user_account()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_user_id UUID := auth.uid();
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  DELETE FROM public.luna_feedback WHERE user_id = v_user_id;
  DELETE FROM public.luna_crisis_state WHERE user_id = v_user_id;
  DELETE FROM public.luna_memories WHERE user_id = v_user_id;
  DELETE FROM public.luna_messages WHERE user_id = v_user_id;
  DELETE FROM public.luna_threads WHERE user_id = v_user_id;
  DELETE FROM public.ai_candidate_events WHERE user_id = v_user_id;
  DELETE FROM public.ai_herd_consent WHERE user_id = v_user_id;
  DELETE FROM public.quick_log_events WHERE user_id = v_user_id;
  DELETE FROM public.extended_symptom_logs WHERE user_id = v_user_id;
  DELETE FROM public.assessment_results WHERE user_id = v_user_id;
  DELETE FROM public.symptom_checkins WHERE user_id = v_user_id;
  DELETE FROM public.user_symptom_selections WHERE user_id = v_user_id;
  DELETE FROM public.dose_logs WHERE user_id = v_user_id;
  DELETE FROM public.medication_administrations WHERE user_id = v_user_id;
  DELETE FROM public.medication_changes WHERE user_id = v_user_id;
  DELETE FROM public.medications WHERE user_id = v_user_id;
  DELETE FROM public.lab_results WHERE user_id = v_user_id;
  DELETE FROM public.ai_insights WHERE user_id = v_user_id;
  DELETE FROM public.reminder_schedule WHERE user_id = v_user_id;
  DELETE FROM public.dismissed_insights WHERE user_id = v_user_id;
  DELETE FROM public.checkin_drafts WHERE user_id = v_user_id;
  DELETE FROM public.profiles WHERE id = v_user_id;
  DELETE FROM auth.users WHERE id = v_user_id;
END;
$$;

REVOKE ALL ON FUNCTION public.delete_user_account() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.delete_user_account() TO authenticated;
