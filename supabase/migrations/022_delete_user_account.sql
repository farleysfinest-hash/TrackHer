-- Permanently delete a user's account: all app data AND their auth identity.
-- This is irreversible. The reset_user_app_data logic is inlined here rather than
-- called as a nested RPC to keep it in one explicit transaction.
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

  -- Delete all app-owned data (same tables as reset_user_app_data)
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

  -- Delete the profile row
  DELETE FROM public.profiles WHERE id = v_user_id;

  -- Delete the auth identity — this is why the function is SECURITY DEFINER
  DELETE FROM auth.users WHERE id = v_user_id;
END;
$$;

REVOKE ALL ON FUNCTION public.delete_user_account() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.delete_user_account() TO authenticated;
