-- Preserve what a laboratory actually reported while retaining the existing
-- normalized columns used by TrackHer charts and deterministic analysis.
-- Raw report images are intentionally not stored by this migration.

ALTER TABLE public.lab_results
  ADD COLUMN reported_values JSONB NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN source_type TEXT NOT NULL DEFAULT 'manual'
    CHECK (source_type IN ('manual', 'photo', 'pdf')),
  ADD COLUMN import_reviewed_at TIMESTAMPTZ;

COMMENT ON COLUMN public.lab_results.reported_values IS
  'User-confirmed values exactly as reported, including units, printed reference intervals, flags, comparators, and extraction provenance.';

COMMENT ON COLUMN public.lab_results.source_type IS
  'How this lab draw entered TrackHer. Uploaded source documents are processed transiently and are not retained here.';

COMMENT ON COLUMN public.lab_results.import_reviewed_at IS
  'When the user confirmed an extracted photo/PDF draft. NULL for ordinary manual entry.';
