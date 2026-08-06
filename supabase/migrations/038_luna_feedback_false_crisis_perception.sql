-- Feedback when a crisis / 988 panel was a false alarm for this episode.
-- Clears active crisis state only; does not permanently disable future SI detection.
DO $$
DECLARE
  constraint_name text;
BEGIN
  SELECT con.conname INTO constraint_name
  FROM pg_constraint con
  JOIN pg_class rel ON rel.oid = con.conrelid
  JOIN pg_namespace nsp ON nsp.oid = rel.relnamespace
  WHERE nsp.nspname = 'public'
    AND rel.relname = 'luna_feedback'
    AND con.contype = 'c'
    AND pg_get_constraintdef(con.oid) ILIKE '%rating%IN%';

  IF constraint_name IS NOT NULL THEN
    EXECUTE format('ALTER TABLE public.luna_feedback DROP CONSTRAINT %I', constraint_name);
  END IF;
END $$;

ALTER TABLE public.luna_feedback
  ADD CONSTRAINT luna_feedback_rating_check CHECK (
    rating IN (
      'helpful',
      'not_helpful',
      'incorrect',
      'too_obvious',
      'missing_context',
      'new_understanding',
      'false_crisis_perception'
    )
  );
