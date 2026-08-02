-- Durable, weighted Luna AI rate limiting shared by all Edge isolates.
-- Direct table access is denied; authenticated callers consume only their own
-- bucket through the SECURITY DEFINER function, which derives identity from JWT.

CREATE TABLE IF NOT EXISTS public.luna_ai_rate_limits (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  available_units NUMERIC(12, 6) NOT NULL DEFAULT 45
    CHECK (available_units >= 0 AND available_units <= 45),
  last_refill_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.luna_ai_rate_limits ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE public.luna_ai_rate_limits FROM anon, authenticated;

CREATE OR REPLACE FUNCTION public.consume_luna_ai_rate_limit(p_cost INTEGER)
RETURNS TABLE (
  allowed BOOLEAN,
  retry_after_seconds INTEGER,
  remaining_units INTEGER
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_user_id UUID := auth.uid();
  v_now TIMESTAMPTZ := clock_timestamp();
  v_available NUMERIC(12, 6);
  v_last_refill TIMESTAMPTZ;
  v_refilled NUMERIC(12, 6);
  v_allowed BOOLEAN;
  v_retry_after INTEGER;
  v_capacity CONSTANT NUMERIC := 45;
  v_window_seconds CONSTANT NUMERIC := 600;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;
  IF p_cost IS NULL OR p_cost < 1 OR p_cost > 4 THEN
    RAISE EXCEPTION 'Invalid Luna AI request cost';
  END IF;

  INSERT INTO public.luna_ai_rate_limits (user_id, available_units, last_refill_at)
  VALUES (v_user_id, v_capacity, v_now)
  ON CONFLICT (user_id) DO NOTHING;

  SELECT limits.available_units, limits.last_refill_at
  INTO v_available, v_last_refill
  FROM public.luna_ai_rate_limits AS limits
  WHERE limits.user_id = v_user_id
  FOR UPDATE;

  v_refilled := LEAST(
    v_capacity,
    v_available +
      GREATEST(0, EXTRACT(EPOCH FROM (v_now - v_last_refill))) *
      (v_capacity / v_window_seconds)
  );
  v_allowed := v_refilled >= p_cost;

  IF v_allowed THEN
    v_refilled := v_refilled - p_cost;
    v_retry_after := 0;
  ELSE
    v_retry_after := CEIL(
      (p_cost - v_refilled) * (v_window_seconds / v_capacity)
    )::INTEGER;
  END IF;

  UPDATE public.luna_ai_rate_limits
  SET available_units = v_refilled,
      last_refill_at = v_now
  WHERE user_id = v_user_id;

  RETURN QUERY
  SELECT v_allowed, v_retry_after, FLOOR(v_refilled)::INTEGER;
END;
$$;

REVOKE ALL ON FUNCTION public.consume_luna_ai_rate_limit(INTEGER) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.consume_luna_ai_rate_limit(INTEGER) TO authenticated;

COMMENT ON FUNCTION public.consume_luna_ai_rate_limit(INTEGER) IS
  'Atomically consumes weighted Luna AI capacity for auth.uid(); 45 units refill over 10 minutes.';
