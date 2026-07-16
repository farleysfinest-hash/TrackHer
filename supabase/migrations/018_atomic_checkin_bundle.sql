-- Persist a check-in, its extended symptoms, and its assessment as one unit.
-- Existing duplicate child rows are collapsed before uniqueness is enforced.

WITH ranked_extended_symptoms AS (
  SELECT
    id,
    ROW_NUMBER() OVER (
      PARTITION BY checkin_id, symptom_key
      ORDER BY created_at DESC, id DESC
    ) AS row_number
  FROM public.extended_symptom_logs
)
DELETE FROM public.extended_symptom_logs AS symptom
USING ranked_extended_symptoms AS ranked
WHERE symptom.id = ranked.id
  AND ranked.row_number > 1;

ALTER TABLE public.extended_symptom_logs
  ADD CONSTRAINT extended_symptom_logs_checkin_symptom_key
  UNIQUE (checkin_id, symptom_key);

WITH ranked_assessments AS (
  SELECT
    id,
    ROW_NUMBER() OVER (
      PARTITION BY checkin_id, instrument_id
      ORDER BY created_at DESC, assessed_at DESC, id DESC
    ) AS row_number
  FROM public.assessment_results
  WHERE checkin_id IS NOT NULL
)
DELETE FROM public.assessment_results AS assessment
USING ranked_assessments AS ranked
WHERE assessment.id = ranked.id
  AND ranked.row_number > 1;

ALTER TABLE public.assessment_results
  ADD CONSTRAINT assessment_results_checkin_instrument_key
  UNIQUE (checkin_id, instrument_id);

CREATE OR REPLACE FUNCTION public.save_checkin_bundle(
  p_checkin_id UUID,
  p_checkin_date DATE,
  p_checkin JSONB,
  p_extended_symptoms JSONB,
  p_assessment JSONB
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_user_id UUID := auth.uid();
  v_checkin public.symptom_checkins%ROWTYPE;
  v_extended_symptoms JSONB := COALESCE(p_extended_symptoms, '[]'::JSONB);
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required' USING ERRCODE = '42501';
  END IF;

  IF p_checkin IS NULL OR jsonb_typeof(p_checkin) <> 'object' THEN
    RAISE EXCEPTION 'Check-in payload must be a JSON object' USING ERRCODE = '22023';
  END IF;

  IF jsonb_typeof(v_extended_symptoms) <> 'array' THEN
    RAISE EXCEPTION 'Extended symptoms payload must be a JSON array'
      USING ERRCODE = '22023';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM jsonb_array_elements(v_extended_symptoms) AS item
    WHERE NULLIF(BTRIM(item->>'symptom_key'), '') IS NULL
  ) THEN
    RAISE EXCEPTION 'Every extended symptom requires a symptom_key'
      USING ERRCODE = '22023';
  END IF;

  IF p_checkin_id IS NULL THEN
    IF p_checkin_date IS NULL THEN
      RAISE EXCEPTION 'Check-in date is required' USING ERRCODE = '22023';
    END IF;

    INSERT INTO public.symptom_checkins (
      user_id,
      checkin_date,
      hot_flashes,
      heart_discomfort,
      sleep_problems,
      depressed_mood,
      irritability,
      anxiety,
      exhaustion,
      sexual_problems,
      bladder_problems,
      vaginal_dryness,
      joint_muscle_pain,
      dry_itchy_skin,
      brain_fog,
      irregular_periods,
      heavy_bleeding,
      misophonia,
      energy_level,
      mood_level,
      sleep_quality,
      notes,
      checkin_type,
      is_backdated,
      mrs_complete
    )
    VALUES (
      v_user_id,
      p_checkin_date,
      (p_checkin->>'hot_flashes')::INTEGER,
      (p_checkin->>'heart_discomfort')::INTEGER,
      (p_checkin->>'sleep_problems')::INTEGER,
      (p_checkin->>'depressed_mood')::INTEGER,
      (p_checkin->>'irritability')::INTEGER,
      (p_checkin->>'anxiety')::INTEGER,
      (p_checkin->>'exhaustion')::INTEGER,
      (p_checkin->>'sexual_problems')::INTEGER,
      (p_checkin->>'bladder_problems')::INTEGER,
      (p_checkin->>'vaginal_dryness')::INTEGER,
      (p_checkin->>'joint_muscle_pain')::INTEGER,
      (p_checkin->>'dry_itchy_skin')::INTEGER,
      (p_checkin->>'brain_fog')::INTEGER,
      (p_checkin->>'irregular_periods')::INTEGER,
      (p_checkin->>'heavy_bleeding')::INTEGER,
      (p_checkin->>'misophonia')::INTEGER,
      (p_checkin->>'energy_level')::INTEGER,
      (p_checkin->>'mood_level')::INTEGER,
      (p_checkin->>'sleep_quality')::INTEGER,
      p_checkin->>'notes',
      COALESCE(p_checkin->>'checkin_type', 'full'),
      COALESCE((p_checkin->>'is_backdated')::BOOLEAN, false),
      COALESCE((p_checkin->>'mrs_complete')::BOOLEAN, false)
    )
    RETURNING * INTO v_checkin;
  ELSE
    UPDATE public.symptom_checkins
    SET
      hot_flashes = (p_checkin->>'hot_flashes')::INTEGER,
      heart_discomfort = (p_checkin->>'heart_discomfort')::INTEGER,
      sleep_problems = (p_checkin->>'sleep_problems')::INTEGER,
      depressed_mood = (p_checkin->>'depressed_mood')::INTEGER,
      irritability = (p_checkin->>'irritability')::INTEGER,
      anxiety = (p_checkin->>'anxiety')::INTEGER,
      exhaustion = (p_checkin->>'exhaustion')::INTEGER,
      sexual_problems = (p_checkin->>'sexual_problems')::INTEGER,
      bladder_problems = (p_checkin->>'bladder_problems')::INTEGER,
      vaginal_dryness = (p_checkin->>'vaginal_dryness')::INTEGER,
      joint_muscle_pain = (p_checkin->>'joint_muscle_pain')::INTEGER,
      dry_itchy_skin = (p_checkin->>'dry_itchy_skin')::INTEGER,
      brain_fog = (p_checkin->>'brain_fog')::INTEGER,
      irregular_periods = (p_checkin->>'irregular_periods')::INTEGER,
      heavy_bleeding = (p_checkin->>'heavy_bleeding')::INTEGER,
      misophonia = (p_checkin->>'misophonia')::INTEGER,
      energy_level = (p_checkin->>'energy_level')::INTEGER,
      mood_level = (p_checkin->>'mood_level')::INTEGER,
      sleep_quality = (p_checkin->>'sleep_quality')::INTEGER,
      notes = p_checkin->>'notes',
      checkin_type = COALESCE(p_checkin->>'checkin_type', 'full'),
      is_backdated = COALESCE((p_checkin->>'is_backdated')::BOOLEAN, false),
      mrs_complete = COALESCE((p_checkin->>'mrs_complete')::BOOLEAN, false)
    WHERE id = p_checkin_id
      AND user_id = v_user_id
    RETURNING * INTO v_checkin;

    IF NOT FOUND THEN
      RAISE EXCEPTION 'Check-in not found' USING ERRCODE = 'P0002';
    END IF;
  END IF;

  DELETE FROM public.extended_symptom_logs
  WHERE checkin_id = v_checkin.id
    AND user_id = v_user_id;

  INSERT INTO public.extended_symptom_logs (
    user_id,
    checkin_id,
    symptom_key,
    severity_score
  )
  SELECT
    v_user_id,
    v_checkin.id,
    item->>'symptom_key',
    (item->>'severity_score')::INTEGER
  FROM jsonb_array_elements(v_extended_symptoms) AS item;

  IF p_assessment IS NULL OR p_assessment = 'null'::JSONB THEN
    DELETE FROM public.assessment_results
    WHERE checkin_id = v_checkin.id
      AND user_id = v_user_id;
  ELSE
    INSERT INTO public.assessment_results (
      user_id,
      instrument_id,
      checkin_id,
      total_score,
      total_severity,
      subscale_scores,
      item_responses,
      assessed_at
    )
    VALUES (
      v_user_id,
      p_assessment->>'instrument_id',
      v_checkin.id,
      (p_assessment->>'total_score')::NUMERIC,
      p_assessment->>'total_severity',
      COALESCE(p_assessment->'subscale_scores', '{}'::JSONB),
      COALESCE(p_assessment->'item_responses', '{}'::JSONB),
      (v_checkin.checkin_date::TEXT || 'T12:00:00.000Z')::TIMESTAMPTZ
    )
    ON CONFLICT ON CONSTRAINT assessment_results_checkin_instrument_key
    DO UPDATE SET
      user_id = EXCLUDED.user_id,
      total_score = EXCLUDED.total_score,
      total_severity = EXCLUDED.total_severity,
      subscale_scores = EXCLUDED.subscale_scores,
      item_responses = EXCLUDED.item_responses,
      assessed_at = EXCLUDED.assessed_at;
  END IF;

  RETURN to_jsonb(v_checkin);
END;
$$;

REVOKE ALL ON FUNCTION public.save_checkin_bundle(
  UUID,
  DATE,
  JSONB,
  JSONB,
  JSONB
) FROM PUBLIC;

GRANT EXECUTE ON FUNCTION public.save_checkin_bundle(
  UUID,
  DATE,
  JSONB,
  JSONB,
  JSONB
) TO authenticated;

NOTIFY pgrst, 'reload schema';
