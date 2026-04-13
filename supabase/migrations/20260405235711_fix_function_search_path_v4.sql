/*
  # Fix Function Search Path Security

  1. Summary
    This migration recreates functions with an immutable search_path to prevent
    potential security vulnerabilities from search_path manipulation.

  2. Functions Fixed
    - set_brief_submission_updated_at
    - set_sync_row_updated_at
    - set_brief_published_at

  3. Security
    - Sets search_path to empty string for all functions
    - Uses fully qualified table/schema references
    - Recreates triggers after function replacement
*/

-- Drop ALL triggers that use these functions (exact names from database)
DROP TRIGGER IF EXISTS trg_set_brief_submission_updated_at ON public.brief_submissions;
DROP TRIGGER IF EXISTS trg_set_brief_published_at ON public.briefs;
DROP TRIGGER IF EXISTS trg_set_briefs_updated_at ON public.briefs;
DROP TRIGGER IF EXISTS trg_set_tracks_updated_at ON public.tracks;

-- Now drop functions
DROP FUNCTION IF EXISTS public.set_brief_submission_updated_at();
DROP FUNCTION IF EXISTS public.set_sync_row_updated_at();
DROP FUNCTION IF EXISTS public.set_brief_published_at();

-- Recreate functions with secure search_path
CREATE FUNCTION public.set_brief_submission_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE FUNCTION public.set_sync_row_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE FUNCTION public.set_brief_published_at()
RETURNS trigger
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $$
BEGIN
  IF NEW.status = 'published' AND OLD.status != 'published' THEN
    NEW.published_at = now();
  END IF;
  RETURN NEW;
END;
$$;

-- Recreate all triggers
CREATE TRIGGER trg_set_brief_submission_updated_at
  BEFORE UPDATE ON public.brief_submissions
  FOR EACH ROW
  EXECUTE FUNCTION public.set_brief_submission_updated_at();

CREATE TRIGGER trg_set_brief_published_at
  BEFORE UPDATE ON public.briefs
  FOR EACH ROW
  EXECUTE FUNCTION public.set_brief_published_at();

CREATE TRIGGER trg_set_briefs_updated_at
  BEFORE UPDATE ON public.briefs
  FOR EACH ROW
  EXECUTE FUNCTION public.set_sync_row_updated_at();

CREATE TRIGGER trg_set_tracks_updated_at
  BEFORE UPDATE ON public.tracks
  FOR EACH ROW
  EXECUTE FUNCTION public.set_sync_row_updated_at();