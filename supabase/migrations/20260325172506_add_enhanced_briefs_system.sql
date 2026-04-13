/*
  # Enhanced Briefs System

  1. Modified Tables
    - `briefs` - Add new fields for enhanced brief creation
      - `client` - Client name
      - `scene_description` - Full scene/story description
      - `moods` - Array of mood tags
      - `genres` - Array of genre preferences
      - `vocal_preference` - Vocal preference option
      - `reference_tracks` - Reference track descriptions
      - `usage_terms` - Full usage terms text
      - `territory` - Territory specification
      - `term_length` - Term length option
      - `usage_type` - Usage type category
      - `exclusivity` - Whether exclusive
      - `priority` - Priority level (standard/urgent/rush)
      - `internal_notes` - Private notes not sent to recipients

  2. New Tables
    - `brief_buckets` - Budget buckets for briefs
    - `brief_contacts` - Contact management for supervisors
    - `brief_sends` - Track sent briefs to recipients
    - `brief_responses` - Track responses from labels/artists
    - `brief_response_tracks` - Tracks submitted in responses

  3. Security
    - Enable RLS on all new tables
    - Add policies for authenticated users
*/

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'briefs' AND column_name = 'client') THEN
    ALTER TABLE briefs ADD COLUMN client text;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'briefs' AND column_name = 'scene_description') THEN
    ALTER TABLE briefs ADD COLUMN scene_description text;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'briefs' AND column_name = 'moods') THEN
    ALTER TABLE briefs ADD COLUMN moods text[] DEFAULT '{}';
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'briefs' AND column_name = 'genres') THEN
    ALTER TABLE briefs ADD COLUMN genres text[] DEFAULT '{}';
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'briefs' AND column_name = 'vocal_preference') THEN
    ALTER TABLE briefs ADD COLUMN vocal_preference text DEFAULT 'vocal_ok';
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'briefs' AND column_name = 'reference_tracks') THEN
    ALTER TABLE briefs ADD COLUMN reference_tracks text;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'briefs' AND column_name = 'usage_terms') THEN
    ALTER TABLE briefs ADD COLUMN usage_terms text;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'briefs' AND column_name = 'territory') THEN
    ALTER TABLE briefs ADD COLUMN territory text;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'briefs' AND column_name = 'term_length') THEN
    ALTER TABLE briefs ADD COLUMN term_length text;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'briefs' AND column_name = 'usage_type') THEN
    ALTER TABLE briefs ADD COLUMN usage_type text;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'briefs' AND column_name = 'exclusivity') THEN
    ALTER TABLE briefs ADD COLUMN exclusivity boolean DEFAULT false;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'briefs' AND column_name = 'priority') THEN
    ALTER TABLE briefs ADD COLUMN priority text DEFAULT 'standard';
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'briefs' AND column_name = 'internal_notes') THEN
    ALTER TABLE briefs ADD COLUMN internal_notes text;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'briefs' AND column_name = 'sent_at') THEN
    ALTER TABLE briefs ADD COLUMN sent_at timestamptz;
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS brief_buckets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  brief_id uuid NOT NULL REFERENCES briefs(id) ON DELETE CASCADE,
  label text NOT NULL,
  min_amount integer,
  max_amount integer,
  position integer DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE brief_buckets ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS brief_contacts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  supervisor_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  name text NOT NULL,
  company text,
  email text NOT NULL,
  contact_type text DEFAULT 'other',
  notes text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE brief_contacts ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS brief_sends (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  brief_id uuid NOT NULL REFERENCES briefs(id) ON DELETE CASCADE,
  recipient_id uuid REFERENCES profiles(id) ON DELETE SET NULL,
  contact_id uuid REFERENCES brief_contacts(id) ON DELETE SET NULL,
  recipient_email text,
  recipient_name text,
  recipient_company text,
  sent_at timestamptz DEFAULT now(),
  opened boolean DEFAULT false,
  opened_at timestamptz,
  submitted boolean DEFAULT false,
  submitted_at timestamptz
);

ALTER TABLE brief_sends ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS brief_responses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  brief_id uuid NOT NULL REFERENCES briefs(id) ON DELETE CASCADE,
  send_id uuid REFERENCES brief_sends(id) ON DELETE SET NULL,
  responder_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  message text,
  status text DEFAULT 'draft',
  created_at timestamptz DEFAULT now(),
  submitted_at timestamptz
);

ALTER TABLE brief_responses ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS brief_response_tracks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  response_id uuid NOT NULL REFERENCES brief_responses(id) ON DELETE CASCADE,
  track_id uuid NOT NULL REFERENCES tracks(id) ON DELETE CASCADE,
  bucket_id uuid REFERENCES brief_buckets(id) ON DELETE SET NULL,
  quote_amount integer,
  notes text,
  position integer DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE brief_response_tracks ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'brief_buckets' AND policyname = 'Users can view buckets for briefs they created') THEN
    CREATE POLICY "Users can view buckets for briefs they created"
      ON brief_buckets FOR SELECT TO authenticated
      USING (EXISTS (SELECT 1 FROM briefs WHERE briefs.id = brief_buckets.brief_id AND briefs.supervisor_id = auth.uid()));
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'brief_buckets' AND policyname = 'Users can view buckets for briefs sent to them') THEN
    CREATE POLICY "Users can view buckets for briefs sent to them"
      ON brief_buckets FOR SELECT TO authenticated
      USING (EXISTS (SELECT 1 FROM brief_sends WHERE brief_sends.brief_id = brief_buckets.brief_id AND brief_sends.recipient_id = auth.uid()));
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'brief_buckets' AND policyname = 'Users can manage buckets for their briefs') THEN
    CREATE POLICY "Users can manage buckets for their briefs"
      ON brief_buckets FOR ALL TO authenticated
      USING (EXISTS (SELECT 1 FROM briefs WHERE briefs.id = brief_buckets.brief_id AND briefs.supervisor_id = auth.uid()));
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'brief_contacts' AND policyname = 'Users can view their own contacts') THEN
    CREATE POLICY "Users can view their own contacts"
      ON brief_contacts FOR SELECT TO authenticated
      USING (supervisor_id = auth.uid());
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'brief_contacts' AND policyname = 'Users can manage their own contacts') THEN
    CREATE POLICY "Users can manage their own contacts"
      ON brief_contacts FOR ALL TO authenticated
      USING (supervisor_id = auth.uid());
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'brief_sends' AND policyname = 'Users can view sends for their briefs') THEN
    CREATE POLICY "Users can view sends for their briefs"
      ON brief_sends FOR SELECT TO authenticated
      USING (EXISTS (SELECT 1 FROM briefs WHERE briefs.id = brief_sends.brief_id AND briefs.supervisor_id = auth.uid()));
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'brief_sends' AND policyname = 'Users can view briefs sent to them') THEN
    CREATE POLICY "Users can view briefs sent to them"
      ON brief_sends FOR SELECT TO authenticated
      USING (recipient_id = auth.uid());
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'brief_sends' AND policyname = 'Users can manage sends for their briefs') THEN
    CREATE POLICY "Users can manage sends for their briefs"
      ON brief_sends FOR ALL TO authenticated
      USING (EXISTS (SELECT 1 FROM briefs WHERE briefs.id = brief_sends.brief_id AND briefs.supervisor_id = auth.uid()));
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'brief_sends' AND policyname = 'Recipients can update their send records') THEN
    CREATE POLICY "Recipients can update their send records"
      ON brief_sends FOR UPDATE TO authenticated
      USING (recipient_id = auth.uid());
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'brief_responses' AND policyname = 'Users can view responses for their briefs') THEN
    CREATE POLICY "Users can view responses for their briefs"
      ON brief_responses FOR SELECT TO authenticated
      USING (EXISTS (SELECT 1 FROM briefs WHERE briefs.id = brief_responses.brief_id AND briefs.supervisor_id = auth.uid()));
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'brief_responses' AND policyname = 'Users can manage their own responses') THEN
    CREATE POLICY "Users can manage their own responses"
      ON brief_responses FOR ALL TO authenticated
      USING (responder_id = auth.uid());
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'brief_response_tracks' AND policyname = 'Users can view response tracks for their briefs') THEN
    CREATE POLICY "Users can view response tracks for their briefs"
      ON brief_response_tracks FOR SELECT TO authenticated
      USING (EXISTS (
        SELECT 1 FROM brief_responses br
        JOIN briefs b ON b.id = br.brief_id
        WHERE br.id = brief_response_tracks.response_id AND b.supervisor_id = auth.uid()
      ));
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'brief_response_tracks' AND policyname = 'Users can manage tracks for their responses') THEN
    CREATE POLICY "Users can manage tracks for their responses"
      ON brief_response_tracks FOR ALL TO authenticated
      USING (EXISTS (
        SELECT 1 FROM brief_responses WHERE brief_responses.id = brief_response_tracks.response_id AND brief_responses.responder_id = auth.uid()
      ));
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'playlist_tracks' AND column_name = 'added_by') THEN
    ALTER TABLE playlist_tracks ADD COLUMN added_by uuid REFERENCES profiles(id);
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'playlist_tracks' AND column_name = 'folder_name') THEN
    ALTER TABLE playlist_tracks ADD COLUMN folder_name text;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'playlist_tracks' AND column_name = 'created_at') THEN
    ALTER TABLE playlist_tracks ADD COLUMN created_at timestamptz DEFAULT now();
  END IF;
END $$;
