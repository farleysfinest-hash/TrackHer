-- Atomic symptom-selection replacement. There is intentionally no global tracked-symptom cap;
-- the five-item limit applies only to quick-log favorites.
CREATE OR REPLACE FUNCTION public.save_user_symptom_selections(
  p_symptom_ids TEXT[],
  p_watch_symptom_ids TEXT[]
)
RETURNS SETOF public.user_symptom_selections
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_user_id UUID := auth.uid();
  v_symptom_ids TEXT[];
  v_watch_ids TEXT[];
  v_mrs_core_ids CONSTANT TEXT[] := ARRAY[
    'hot_flashes', 'heart_discomfort', 'sleep_problems', 'depressed_mood',
    'irritability', 'anxiety', 'exhaustion', 'sexual_problems',
    'bladder_problems', 'vaginal_dryness', 'joint_muscle_pain'
  ];
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  SELECT COALESCE(array_agg(DISTINCT id), ARRAY[]::TEXT[])
  INTO v_symptom_ids
  FROM unnest(COALESCE(p_symptom_ids, ARRAY[]::TEXT[])) AS ids(id)
  WHERE NULLIF(BTRIM(id), '') IS NOT NULL
    AND NOT (id = ANY(v_mrs_core_ids));

  SELECT COALESCE(array_agg(DISTINCT id), ARRAY[]::TEXT[])
  INTO v_watch_ids
  FROM unnest(COALESCE(p_watch_symptom_ids, ARRAY[]::TEXT[])) AS ids(id)
  WHERE NULLIF(BTRIM(id), '') IS NOT NULL
    AND NOT (id = ANY(v_mrs_core_ids));

  IF cardinality(v_watch_ids) > 5 THEN
    RAISE EXCEPTION 'Quick-log favorites are limited to 5 symptoms';
  END IF;

  IF EXISTS (
    SELECT 1 FROM unnest(v_watch_ids) AS watch_ids(watch_id)
    WHERE NOT (watch_id = ANY(v_symptom_ids))
  ) THEN
    RAISE EXCEPTION 'Every quick-log favorite must be included in the submitted symptom IDs';
  END IF;

  DELETE FROM public.user_symptom_selections WHERE user_id = v_user_id;

  INSERT INTO public.user_symptom_selections (user_id, symptom_id, is_watch_symptom)
  SELECT v_user_id, symptom_id, symptom_id = ANY(v_watch_ids)
  FROM unnest(v_symptom_ids) AS symptom_ids(symptom_id);

  RETURN QUERY
  SELECT *
  FROM public.user_symptom_selections
  WHERE user_id = v_user_id
  ORDER BY selected_at, symptom_id;
END;
$$;

REVOKE ALL ON FUNCTION public.save_user_symptom_selections(TEXT[], TEXT[]) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.save_user_symptom_selections(TEXT[], TEXT[]) TO authenticated;

-- One medication command owns both mutable state and its audit rows. A stale updated_at rejects
-- regimen edits rather than writing history against a state the client did not read.
CREATE OR REPLACE FUNCTION public.save_medication_command(
  p_action TEXT,
  p_medication_id UUID DEFAULT NULL,
  p_payload JSONB DEFAULT '{}'::JSONB,
  p_change_date DATE DEFAULT NULL,
  p_notes TEXT DEFAULT NULL,
  p_expected_updated_at TIMESTAMPTZ DEFAULT NULL
)
RETURNS public.medications
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_user_id UUID := auth.uid();
  v_med public.medications%ROWTYPE;
  v_input public.medications%ROWTYPE;
  v_result public.medications%ROWTYPE;
  v_dose_changed BOOLEAN;
  v_frequency_changed BOOLEAN;
  v_previous_effective NUMERIC;
  v_new_effective NUMERIC;
  v_change_type TEXT;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  IF p_action = 'add' THEN
    v_input := jsonb_populate_record(NULL::public.medications, p_payload);
    INSERT INTO public.medications (
      user_id, hormone_category, delivery_method, medication_name, dose_amount, dose_unit,
      units_per_dose, secondary_dose_amount, secondary_dose_unit, tertiary_dose_amount,
      tertiary_dose_unit, frequency, frequency_details, application_site, start_date, end_date,
      is_active, prescriber_name, pharmacy_name, notes, pellet_insertion_date,
      pellet_expected_duration_months
    ) VALUES (
      v_user_id, v_input.hormone_category, v_input.delivery_method, v_input.medication_name,
      v_input.dose_amount, v_input.dose_unit, COALESCE(v_input.units_per_dose, 1),
      v_input.secondary_dose_amount, v_input.secondary_dose_unit, v_input.tertiary_dose_amount,
      v_input.tertiary_dose_unit, v_input.frequency, v_input.frequency_details,
      v_input.application_site, v_input.start_date, v_input.end_date,
      COALESCE(v_input.is_active, TRUE), v_input.prescriber_name, v_input.pharmacy_name,
      v_input.notes, v_input.pellet_insertion_date, v_input.pellet_expected_duration_months
    ) RETURNING * INTO v_result;

    INSERT INTO public.medication_changes (
      user_id, medication_id, change_type, new_dose, change_date, notes
    ) VALUES (
      v_user_id, v_result.id, 'started', v_result.dose_amount, v_result.start_date, NULL
    );
    RETURN v_result;
  END IF;

  SELECT * INTO v_med
  FROM public.medications
  WHERE id = p_medication_id AND user_id = v_user_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Medication not found';
  END IF;

  IF p_expected_updated_at IS NOT NULL AND v_med.updated_at <> p_expected_updated_at THEN
    RAISE EXCEPTION 'Medication changed since it was loaded; refresh and try again';
  END IF;

  IF p_action = 'regimen' THEN
    IF p_change_date IS NULL OR p_change_date < v_med.start_date THEN
      RAISE EXCEPTION 'Effective date cannot be before the medication start date';
    END IF;

    v_dose_changed := COALESCE((p_payload->>'dose_changed')::BOOLEAN, FALSE);
    v_frequency_changed := COALESCE((p_payload->>'frequency_changed')::BOOLEAN, FALSE);
    IF NOT v_dose_changed AND NOT v_frequency_changed THEN
      RAISE EXCEPTION 'No regimen change was supplied';
    END IF;

    v_previous_effective := NULLIF(p_payload->>'previous_effective_dose', '')::NUMERIC;
    v_new_effective := NULLIF(p_payload->>'new_effective_dose', '')::NUMERIC;
    IF v_dose_changed AND (v_previous_effective IS NULL OR v_new_effective IS NULL) THEN
      RAISE EXCEPTION 'Dose change requires previous and new effective doses';
    END IF;
    IF v_dose_changed
      AND COALESCE((p_payload->>'dose_amount')::NUMERIC, v_med.dose_amount) = v_med.dose_amount
      AND COALESCE(p_payload->>'dose_unit', v_med.dose_unit) = v_med.dose_unit
      AND COALESCE((p_payload->>'units_per_dose')::INTEGER, v_med.units_per_dose) = v_med.units_per_dose
    THEN
      RAISE EXCEPTION 'Dose change does not alter the dose';
    END IF;

    UPDATE public.medications SET
      dose_amount = CASE WHEN p_payload ? 'dose_amount' THEN (p_payload->>'dose_amount')::NUMERIC ELSE dose_amount END,
      dose_unit = CASE WHEN p_payload ? 'dose_unit' THEN p_payload->>'dose_unit' ELSE dose_unit END,
      units_per_dose = CASE WHEN p_payload ? 'units_per_dose' THEN (p_payload->>'units_per_dose')::INTEGER ELSE units_per_dose END,
      frequency = CASE WHEN p_payload ? 'frequency' THEN p_payload->>'frequency' ELSE frequency END,
      frequency_details = CASE WHEN p_payload ? 'frequency_details'
        THEN NULLIF(p_payload->'frequency_details', 'null'::JSONB)
        ELSE frequency_details END
    WHERE id = v_med.id
    RETURNING * INTO v_result;

    IF v_dose_changed THEN
      v_change_type := CASE
        WHEN v_new_effective > v_previous_effective THEN 'dose_increased'
        WHEN v_new_effective < v_previous_effective THEN 'dose_decreased'
        WHEN COALESCE((p_payload->>'dose_amount')::NUMERIC, v_med.dose_amount)
          * COALESCE((p_payload->>'units_per_dose')::INTEGER, v_med.units_per_dose)
          > v_med.dose_amount * v_med.units_per_dose THEN 'dose_increased'
        ELSE 'dose_decreased'
      END;
      INSERT INTO public.medication_changes (
        user_id, medication_id, change_type, previous_dose, new_dose, change_date, notes
      ) VALUES (
        v_user_id, v_med.id, v_change_type, v_previous_effective, v_new_effective,
        p_change_date, p_notes
      );
    END IF;

    IF v_frequency_changed THEN
      INSERT INTO public.medication_changes (
        user_id, medication_id, change_type, change_date, notes
      ) VALUES (
        v_user_id, v_med.id, 'frequency_changed', p_change_date, p_notes
      );
    END IF;
    RETURN v_result;
  END IF;

  IF p_action = 'discontinue' THEN
    IF p_change_date IS NULL OR p_change_date < v_med.start_date THEN
      RAISE EXCEPTION 'End date cannot be before the medication start date';
    END IF;
    UPDATE public.medications
    SET end_date = p_change_date, is_active = FALSE
    WHERE id = v_med.id
    RETURNING * INTO v_result;
    INSERT INTO public.medication_changes (
      user_id, medication_id, change_type, change_date, notes
    ) VALUES (v_user_id, v_med.id, 'stopped', p_change_date, p_notes);
    RETURN v_result;
  END IF;

  IF p_action = 'reactivate' THEN
    IF p_change_date IS NULL OR p_change_date < v_med.start_date THEN
      RAISE EXCEPTION 'Reactivation date cannot be before the medication start date';
    END IF;
    UPDATE public.medications
    SET end_date = NULL, is_active = TRUE
    WHERE id = v_med.id
    RETURNING * INTO v_result;
    INSERT INTO public.medication_changes (
      user_id, medication_id, change_type, new_dose, change_date, notes
    ) VALUES (v_user_id, v_med.id, 'started', v_result.dose_amount, p_change_date, 'Reactivated');
    RETURN v_result;
  END IF;

  IF p_action = 'delete' THEN
    DELETE FROM public.medication_changes WHERE medication_id = v_med.id AND user_id = v_user_id;
    DELETE FROM public.medications WHERE id = v_med.id AND user_id = v_user_id;
    RETURN v_med;
  END IF;

  RAISE EXCEPTION 'Unsupported medication action: %', p_action;
END;
$$;

REVOKE ALL ON FUNCTION public.save_medication_command(TEXT, UUID, JSONB, DATE, TEXT, TIMESTAMPTZ) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.save_medication_command(TEXT, UUID, JSONB, DATE, TEXT, TIMESTAMPTZ) TO authenticated;

-- Reset every app-owned value in one transaction. The auth identity/email remains only because
-- this is reset, not account deletion.
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

  -- The signup display name is duplicated in auth metadata. It is app-owned profile data, not
  -- part of the login identity, so a full reset removes it while preserving email and providers.
  UPDATE auth.users
  SET raw_user_meta_data = COALESCE(raw_user_meta_data, '{}'::JSONB) - 'display_name'
  WHERE id = v_user_id;

  UPDATE public.profiles SET
    display_name = NULL,
    onboarding_completed = FALSE,
    welcome_seen = FALSE,
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
