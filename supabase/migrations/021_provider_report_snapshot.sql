-- One SQL statement returns one range-bounded report snapshot. Timestamped events prefer their
-- immutable event-local date and use the explicitly selected report zone only for legacy rows.
CREATE OR REPLACE FUNCTION public.get_provider_report_snapshot(
  p_start DATE,
  p_end DATE,
  p_timezone TEXT
)
RETURNS JSONB
LANGUAGE sql
STABLE
SET search_path = public, pg_temp
AS $$
  SELECT jsonb_build_object(
    'checkins', COALESCE((
      SELECT jsonb_agg(to_jsonb(c) ORDER BY c.checkin_date DESC)
      FROM public.symptom_checkins c
      WHERE c.user_id = auth.uid() AND c.checkin_date BETWEEN p_start AND p_end
    ), '[]'::JSONB),
    'medications', COALESCE((
      SELECT jsonb_agg(to_jsonb(m) ORDER BY m.is_active DESC, m.start_date DESC)
      FROM public.medications m
      WHERE m.user_id = auth.uid()
        AND m.start_date <= p_end
        AND COALESCE(m.end_date, 'infinity'::DATE) >= p_start
    ), '[]'::JSONB),
    'medicationChanges', COALESCE((
      SELECT jsonb_agg(to_jsonb(mc) ORDER BY mc.change_date DESC, mc.created_at DESC)
      FROM public.medication_changes mc
      WHERE mc.user_id = auth.uid() AND mc.change_date BETWEEN p_start AND p_end
    ), '[]'::JSONB),
    'labResults', COALESCE((
      SELECT jsonb_agg(to_jsonb(l) ORDER BY l.draw_date DESC)
      FROM public.lab_results l
      WHERE l.user_id = auth.uid() AND l.draw_date BETWEEN p_start AND p_end
    ), '[]'::JSONB),
    'quickLogEvents', COALESCE((
      SELECT jsonb_agg(to_jsonb(q) ORDER BY q.logged_at DESC)
      FROM public.quick_log_events q
      WHERE q.user_id = auth.uid()
        AND COALESCE(q.local_date, (q.logged_at AT TIME ZONE p_timezone)::DATE)
          BETWEEN p_start AND p_end
    ), '[]'::JSONB),
    'extendedSymptomLogs', COALESCE((
      SELECT jsonb_agg(to_jsonb(r) - 'checkin_date' ORDER BY r.checkin_date DESC, r.created_at DESC)
      FROM (
        SELECT e.*, c.checkin_date
        FROM public.extended_symptom_logs e
        JOIN public.symptom_checkins c ON c.id = e.checkin_id
        WHERE e.user_id = auth.uid() AND c.checkin_date BETWEEN p_start AND p_end
      ) r
    ), '[]'::JSONB)
  )
  WHERE auth.uid() IS NOT NULL
    AND p_start <= p_end
    AND NULLIF(BTRIM(p_timezone), '') IS NOT NULL;
$$;

REVOKE ALL ON FUNCTION public.get_provider_report_snapshot(DATE, DATE, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_provider_report_snapshot(DATE, DATE, TEXT) TO authenticated;
