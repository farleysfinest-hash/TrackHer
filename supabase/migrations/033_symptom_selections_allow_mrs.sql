-- Allow MRS core symptoms in user_symptom_selections so Quick Log can include
-- daily tracking of irritability, hot flashes, etc. Drop the 5-favorite cap;
-- tracked set = quick-tap set. Watch ids still accepted for back-compat and are
-- intersected with tracked (clients may pass watch = tracked).
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
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  SELECT COALESCE(array_agg(DISTINCT id), ARRAY[]::TEXT[])
  INTO v_symptom_ids
  FROM unnest(COALESCE(p_symptom_ids, ARRAY[]::TEXT[])) AS ids(id)
  WHERE NULLIF(BTRIM(id), '') IS NOT NULL;

  SELECT COALESCE(array_agg(DISTINCT id), ARRAY[]::TEXT[])
  INTO v_watch_ids
  FROM unnest(COALESCE(p_watch_symptom_ids, ARRAY[]::TEXT[])) AS ids(id)
  WHERE NULLIF(BTRIM(id), '') IS NOT NULL
    AND id = ANY(v_symptom_ids);

  -- If the client omits watch ids, treat every tracked symptom as a quick-tap.
  IF cardinality(v_watch_ids) = 0 AND cardinality(v_symptom_ids) > 0 THEN
    v_watch_ids := v_symptom_ids;
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
