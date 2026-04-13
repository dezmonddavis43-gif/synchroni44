/*
  # Add brief submissions workflow + role-safe brief statuses

  1. Brief status normalization
    - Supports draft/open/closed/archived
  2. brief_submissions table
    - Connects briefs, tracks, and artists
    - Prevents duplicate submissions
    - Supports review statuses
  3. Performance
    - Adds indexes for dashboard and review queries
*/

-- Normalize brief status constraints
ALTER TABLE briefs DROP CONSTRAINT IF EXISTS briefs_status_check;
ALTER TABLE briefs
  ADD CONSTRAINT briefs_status_check CHECK (status IN ('draft', 'open', 'closed', 'archived'));

ALTER TABLE briefs ALTER COLUMN status SET DEFAULT 'draft';
UPDATE briefs SET status = 'closed' WHERE status = 'active';

-- Ensure supervisor ownership stays optional for legacy demo records but constrained when set
ALTER TABLE briefs DROP CONSTRAINT IF EXISTS briefs_supervisor_id_fkey;
ALTER TABLE briefs
  ADD CONSTRAINT briefs_supervisor_id_fkey
  FOREIGN KEY (supervisor_id) REFERENCES profiles(id) ON DELETE CASCADE;

-- Create normalized submission table for brief workflow
CREATE TABLE IF NOT EXISTS brief_submissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  brief_id uuid NOT NULL REFERENCES briefs(id) ON DELETE CASCADE,
  track_id uuid NOT NULL REFERENCES tracks(id) ON DELETE CASCADE,
  artist_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'submitted' CHECK (status IN ('submitted', 'shortlisted', 'in_review', 'selected', 'licensed', 'rejected')),
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (brief_id, track_id, artist_id)
);

CREATE INDEX IF NOT EXISTS idx_brief_submissions_brief_id ON brief_submissions(brief_id);
CREATE INDEX IF NOT EXISTS idx_brief_submissions_artist_id ON brief_submissions(artist_id);
CREATE INDEX IF NOT EXISTS idx_brief_submissions_status ON brief_submissions(status);

ALTER TABLE brief_submissions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Artists can view own brief submissions" ON brief_submissions;
CREATE POLICY "Artists can view own brief submissions"
  ON brief_submissions FOR SELECT
  TO authenticated
  USING (artist_id = auth.uid());

DROP POLICY IF EXISTS "Brief owners can view brief submissions" ON brief_submissions;
CREATE POLICY "Brief owners can view brief submissions"
  ON brief_submissions FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM briefs
      WHERE briefs.id = brief_submissions.brief_id
      AND briefs.supervisor_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Artists can create brief submissions" ON brief_submissions;
CREATE POLICY "Artists can create brief submissions"
  ON brief_submissions FOR INSERT
  TO authenticated
  WITH CHECK (artist_id = auth.uid());

DROP POLICY IF EXISTS "Brief owners can update brief submissions" ON brief_submissions;
CREATE POLICY "Brief owners can update brief submissions"
  ON brief_submissions FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM briefs
      WHERE briefs.id = brief_submissions.brief_id
      AND briefs.supervisor_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM briefs
      WHERE briefs.id = brief_submissions.brief_id
      AND briefs.supervisor_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Artists can delete own draft submissions" ON brief_submissions;
CREATE POLICY "Artists can delete own draft submissions"
  ON brief_submissions FOR DELETE
  TO authenticated
  USING (artist_id = auth.uid() AND status = 'submitted');

-- Trigger for updated_at sync
CREATE OR REPLACE FUNCTION set_brief_submission_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_set_brief_submission_updated_at ON brief_submissions;
CREATE TRIGGER trg_set_brief_submission_updated_at
BEFORE UPDATE ON brief_submissions
FOR EACH ROW
EXECUTE FUNCTION set_brief_submission_updated_at();
