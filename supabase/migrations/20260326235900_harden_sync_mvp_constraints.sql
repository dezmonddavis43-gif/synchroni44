/*
  # Harden sync MVP workflow constraints and performance

  1. Tracks metadata hardening
    - add fields used by upload/catalog/search workflows
  2. Constraints
    - enforce valid BPM range and non-negative budgets
  3. Indexes
    - optimize dashboard and discovery queries
*/

-- Track metadata fields needed for sync licensing catalog depth
ALTER TABLE tracks
  ADD COLUMN IF NOT EXISTS writers text[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS producers text[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS lyrics_themes text,
  ADD COLUMN IF NOT EXISTS vocal_type text CHECK (vocal_type IN ('instrumental', 'vocal')),
  ADD COLUMN IF NOT EXISTS explicit boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS ownership_splits jsonb DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS publishing_info text,
  ADD COLUMN IF NOT EXISTS pro_info text,
  ADD COLUMN IF NOT EXISTS one_stop boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS easy_clear boolean DEFAULT false;

-- Guardrails for key numeric fields
ALTER TABLE briefs DROP CONSTRAINT IF EXISTS briefs_budget_non_negative;
ALTER TABLE briefs
  ADD CONSTRAINT briefs_budget_non_negative CHECK (budget IS NULL OR budget >= 0);

ALTER TABLE tracks DROP CONSTRAINT IF EXISTS tracks_bpm_non_negative;
ALTER TABLE tracks
  ADD CONSTRAINT tracks_bpm_non_negative CHECK (bpm IS NULL OR bpm BETWEEN 1 AND 260);

-- Discovery + dashboard query performance
CREATE INDEX IF NOT EXISTS idx_tracks_status_created_at ON tracks(status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_tracks_artist_title ON tracks(artist, title);
CREATE INDEX IF NOT EXISTS idx_tracks_genre_mood ON tracks(genre, mood);
CREATE INDEX IF NOT EXISTS idx_tracks_tags_gin ON tracks USING gin(tags);
CREATE INDEX IF NOT EXISTS idx_briefs_status_deadline ON briefs(status, deadline);
CREATE INDEX IF NOT EXISTS idx_briefs_supervisor_status ON briefs(supervisor_id, status);
CREATE INDEX IF NOT EXISTS idx_brief_submissions_brief_status ON brief_submissions(brief_id, status);
CREATE INDEX IF NOT EXISTS idx_brief_submissions_artist_created_at ON brief_submissions(artist_id, created_at DESC);
