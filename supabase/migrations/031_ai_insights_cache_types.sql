-- Widen ai_insights cache types for visit prep, dose watch, daily line,
-- stage explain, and partner letter.

ALTER TABLE public.ai_insights
  DROP CONSTRAINT IF EXISTS ai_insights_insight_type_check;

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
      'daily_line',
      'stage_explain',
      'partner_letter'
    )
  );
