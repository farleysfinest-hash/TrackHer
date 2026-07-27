-- Provider report snapshot omitted medication_administrations. The in-app insight engine
-- receives them (useInsights) and uses them for trough-timing wellbeing insights; the PDF
-- hard-coded administrations: []. A patient could see a trough insight on her dashboard and
-- hand her provider a report that silently lacked it — the app and the document disagreed
-- about her own data.
--
-- Both loaders must carry the same payload. Wiring only the table fallback would leave the
-- RPC path handing the engine an empty array with no error — the same silent-divergence
-- class that migration 028 was written to repair.

CREATE OR REPLACE FUNCTION public.get_provider_report_snapshot(
  p_start DATE,
  p_end DATE,
  p_timezone TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
STABLE
SET search_path = public, pg_temp
AS $$
DECLARE
  v_user_id UUID := auth.uid();
  v_result JSONB;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated' USING ERRCODE = '28000';
  END IF;

  IF p_start IS NULL OR p_end IS NULL OR p_start > p_end THEN
    RAISE EXCEPTION 'Report start date must be on or before its end date (got % to %)',
      p_start, p_end USING ERRCODE = '22007';
  END IF;

  IF NULLIF(BTRIM(COALESCE(p_timezone, '')), '') IS NULL THEN
    RAISE EXCEPTION 'Report timezone is required' USING ERRCODE = '22023';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_timezone_names WHERE name = p_timezone) THEN
    RAISE EXCEPTION 'Unknown report timezone: %', p_timezone USING ERRCODE = '22023';
  END IF;

  SELECT jsonb_build_object(
    'checkins', COALESCE((
      SELECT jsonb_agg(to_jsonb(c) ORDER BY c.checkin_date DESC)
      FROM public.symptom_checkins c
      WHERE c.user_id = v_user_id AND c.checkin_date BETWEEN p_start AND p_end
    ), '[]'::JSONB),
    'medications', COALESCE((
      SELECT jsonb_agg(to_jsonb(m) ORDER BY m.is_active DESC, m.start_date DESC)
      FROM public.medications m
      WHERE m.user_id = v_user_id
        AND m.start_date <= p_end
        AND COALESCE(m.end_date, 'infinity'::DATE) >= p_start
    ), '[]'::JSONB),
    'medicationChanges', COALESCE((
      SELECT jsonb_agg(to_jsonb(mc) ORDER BY mc.change_date DESC, mc.created_at DESC)
      FROM public.medication_changes mc
      WHERE mc.user_id = v_user_id AND mc.change_date BETWEEN p_start AND p_end
    ), '[]'::JSONB),
    'labResults', COALESCE((
      SELECT jsonb_agg(to_jsonb(l) ORDER BY l.draw_date DESC)
      FROM public.lab_results l
      WHERE l.user_id = v_user_id AND l.draw_date BETWEEN p_start AND p_end
    ), '[]'::JSONB),
    'quickLogEvents', COALESCE((
      SELECT jsonb_agg(to_jsonb(q) ORDER BY q.logged_at DESC)
      FROM public.quick_log_events q
      WHERE q.user_id = v_user_id
        AND COALESCE(q.local_date, (q.logged_at AT TIME ZONE p_timezone)::DATE)
          BETWEEN p_start AND p_end
    ), '[]'::JSONB),
    'extendedSymptomLogs', COALESCE((
      SELECT jsonb_agg(to_jsonb(r) - 'checkin_date' ORDER BY r.checkin_date DESC, r.created_at DESC)
      FROM (
        SELECT e.*, c.checkin_date
        FROM public.extended_symptom_logs e
        JOIN public.symptom_checkins c ON c.id = e.checkin_id
        WHERE e.user_id = v_user_id AND c.checkin_date BETWEEN p_start AND p_end
      ) r
    ), '[]'::JSONB),
    'administrations', COALESCE((
      SELECT jsonb_agg(to_jsonb(a) ORDER BY a.taken_at DESC)
      FROM public.medication_administrations a
      WHERE a.user_id = v_user_id
        AND (a.taken_at AT TIME ZONE p_timezone)::DATE BETWEEN p_start AND p_end
    ), '[]'::JSONB)
  )
  INTO v_result;

  RETURN v_result;
END;
$$;

REVOKE ALL ON FUNCTION public.get_provider_report_snapshot(DATE, DATE, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_provider_report_snapshot(DATE, DATE, TEXT) TO authenticated;

NOTIFY pgrst, 'reload schema';
