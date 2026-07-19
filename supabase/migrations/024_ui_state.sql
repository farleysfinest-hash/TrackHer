-- Per-user UI state (dismissed banners, seen tooltips, viewed insights).
-- Lives on the profile so it survives incognito windows and follows the user.
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS ui_state JSONB NOT NULL DEFAULT '{}'::jsonb;

-- Atomic partial update: merges a patch into ui_state without clobbering
-- concurrent writes to other keys. SECURITY INVOKER — relies on the existing
-- RLS update policy on profiles (the same one updateProfile uses).
CREATE OR REPLACE FUNCTION public.merge_ui_state(p_patch JSONB)
RETURNS JSONB
LANGUAGE sql
SECURITY INVOKER
SET search_path = public, pg_temp
AS $$
  UPDATE public.profiles
  SET ui_state = COALESCE(ui_state, '{}'::jsonb) || p_patch
  WHERE id = auth.uid()
  RETURNING ui_state;
$$;

REVOKE ALL ON FUNCTION public.merge_ui_state(JSONB) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.merge_ui_state(JSONB) TO authenticated;

-- Reset every app-owned value in one transaction. The auth identity/email remains only because
-- this is reset, not account deletion. Now also clears ui_state so a reset account
-- sees first-run banners and tooltips again.
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
