/*
  # MVP sync workflow field enhancements

  - Expands briefs to support richer sync brief metadata and publish tracking.
  - Expands tracks to support richer catalog metadata without breaking existing fields.
  - Adds updated_at automation for briefs/tracks and publish timestamp automation for briefs.
*/

-- Brief enhancements (safe additive)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'briefs' AND column_name = 'project_name') THEN
    ALTER TABLE briefs ADD COLUMN project_name text;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'briefs' AND column_name = 'client_name') THEN
    ALTER TABLE briefs ADD COLUMN client_name text;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'briefs' AND column_name = 'sonic_direction') THEN
    ALTER TABLE briefs ADD COLUMN sonic_direction text;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'briefs' AND column_name = 'reference_artists') THEN
    ALTER TABLE briefs ADD COLUMN reference_artists text;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'briefs' AND column_name = 'reference_links') THEN
    ALTER TABLE briefs ADD COLUMN reference_links text[];
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'briefs' AND column_name = 'media_type') THEN
    ALTER TABLE briefs ADD COLUMN media_type text;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'briefs' AND column_name = 'budget_min') THEN
    ALTER TABLE briefs ADD COLUMN budget_min integer;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'briefs' AND column_name = 'budget_max') THEN
    ALTER TABLE briefs ADD COLUMN budget_max integer;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'briefs' AND column_name = 'exclusivity_required') THEN
    ALTER TABLE briefs ADD COLUMN exclusivity_required boolean DEFAULT false;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'briefs' AND column_name = 'rights_needed') THEN
    ALTER TABLE briefs ADD COLUMN rights_needed text;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'briefs' AND column_name = 'created_by') THEN
    ALTER TABLE briefs ADD COLUMN created_by uuid REFERENCES profiles(id) ON DELETE SET NULL;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'briefs' AND column_name = 'published_at') THEN
    ALTER TABLE briefs ADD COLUMN published_at timestamptz;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'briefs' AND column_name = 'updated_at') THEN
    ALTER TABLE briefs ADD COLUMN updated_at timestamptz NOT NULL DEFAULT now();
  END IF;
END $$;

-- Accept both "open" and "published" as active states for backwards compatibility
ALTER TABLE briefs DROP CONSTRAINT IF EXISTS briefs_status_check;
ALTER TABLE briefs
  ADD CONSTRAINT briefs_status_check CHECK (status IN ('draft', 'open', 'published', 'closed', 'archived'));

-- Track enhancements (safe additive)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'tracks' AND column_name = 'primary_artist') THEN
    ALTER TABLE tracks ADD COLUMN primary_artist text;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'tracks' AND column_name = 'featured_artists') THEN
    ALTER TABLE tracks ADD COLUMN featured_artists text[];
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'tracks' AND column_name = 'writers') THEN
    ALTER TABLE tracks ADD COLUMN writers text[];
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'tracks' AND column_name = 'producers') THEN
    ALTER TABLE tracks ADD COLUMN producers text[];
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'tracks' AND column_name = 'musical_key') THEN
    ALTER TABLE tracks ADD COLUMN musical_key text;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'tracks' AND column_name = 'duration_seconds') THEN
    ALTER TABLE tracks ADD COLUMN duration_seconds integer;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'tracks' AND column_name = 'lyrics') THEN
    ALTER TABLE tracks ADD COLUMN lyrics text;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'tracks' AND column_name = 'themes') THEN
    ALTER TABLE tracks ADD COLUMN themes text[];
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'tracks' AND column_name = 'instrumental') THEN
    ALTER TABLE tracks ADD COLUMN instrumental boolean DEFAULT false;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'tracks' AND column_name = 'vocal') THEN
    ALTER TABLE tracks ADD COLUMN vocal boolean DEFAULT true;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'tracks' AND column_name = 'explicit') THEN
    ALTER TABLE tracks ADD COLUMN explicit boolean DEFAULT false;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'tracks' AND column_name = 'clean_version') THEN
    ALTER TABLE tracks ADD COLUMN clean_version boolean DEFAULT true;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'tracks' AND column_name = 'ownership_notes') THEN
    ALTER TABLE tracks ADD COLUMN ownership_notes text;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'tracks' AND column_name = 'master_split') THEN
    ALTER TABLE tracks ADD COLUMN master_split numeric(5,2);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'tracks' AND column_name = 'publishing_split') THEN
    ALTER TABLE tracks ADD COLUMN publishing_split numeric(5,2);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'tracks' AND column_name = 'publisher_info') THEN
    ALTER TABLE tracks ADD COLUMN publisher_info text;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'tracks' AND column_name = 'one_stop') THEN
    ALTER TABLE tracks ADD COLUMN one_stop boolean DEFAULT false;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'tracks' AND column_name = 'easy_clear') THEN
    ALTER TABLE tracks ADD COLUMN easy_clear boolean DEFAULT false;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'tracks' AND column_name = 'preview_url') THEN
    ALTER TABLE tracks ADD COLUMN preview_url text;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'tracks' AND column_name = 'updated_at') THEN
    ALTER TABLE tracks ADD COLUMN updated_at timestamptz NOT NULL DEFAULT now();
  END IF;
END $$;

-- Auto-updated timestamps
CREATE OR REPLACE FUNCTION set_sync_row_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_set_briefs_updated_at ON briefs;
CREATE TRIGGER trg_set_briefs_updated_at
BEFORE UPDATE ON briefs
FOR EACH ROW
EXECUTE FUNCTION set_sync_row_updated_at();

DROP TRIGGER IF EXISTS trg_set_tracks_updated_at ON tracks;
CREATE TRIGGER trg_set_tracks_updated_at
BEFORE UPDATE ON tracks
FOR EACH ROW
EXECUTE FUNCTION set_sync_row_updated_at();

-- Auto set published_at for active briefs
CREATE OR REPLACE FUNCTION set_brief_published_at()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status IN ('open', 'published') AND OLD.status IS DISTINCT FROM NEW.status AND NEW.published_at IS NULL THEN
    NEW.published_at = now();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_set_brief_published_at ON briefs;
CREATE TRIGGER trg_set_brief_published_at
BEFORE UPDATE ON briefs
FOR EACH ROW
EXECUTE FUNCTION set_brief_published_at();

CREATE INDEX IF NOT EXISTS idx_briefs_status_deadline ON briefs(status, deadline);
CREATE INDEX IF NOT EXISTS idx_tracks_search_title_artist ON tracks(title, artist);
