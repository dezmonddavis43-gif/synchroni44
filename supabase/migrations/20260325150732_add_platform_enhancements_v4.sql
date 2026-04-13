/*
  # Platform Enhancement Migration

  1. Profile Table Updates
    - location, website, pro_affiliation, publisher
    - project_types, genre_specialties arrays
    - onboarding_complete, plan
    - artist_name, label_name, label_type, roster_size
    - social_links jsonb

  2. Tracks Table Updates
    - instrumental_url, acapella_url, stems_urls
    - pro_affiliation, publisher
    - micro_fee_min, micro_fee_max
    - co_writers, play_count, save_count, license_count

  3. New Tables
    - micro_licenses - Track micro license purchases
*/

-- Add columns to profiles table
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'location') THEN
    ALTER TABLE profiles ADD COLUMN location text;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'website') THEN
    ALTER TABLE profiles ADD COLUMN website text;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'pro_affiliation') THEN
    ALTER TABLE profiles ADD COLUMN pro_affiliation text;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'publisher') THEN
    ALTER TABLE profiles ADD COLUMN publisher text;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'project_types') THEN
    ALTER TABLE profiles ADD COLUMN project_types text[];
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'genre_specialties') THEN
    ALTER TABLE profiles ADD COLUMN genre_specialties text[];
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'onboarding_complete') THEN
    ALTER TABLE profiles ADD COLUMN onboarding_complete boolean DEFAULT false;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'plan') THEN
    ALTER TABLE profiles ADD COLUMN plan text DEFAULT 'free';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'artist_name') THEN
    ALTER TABLE profiles ADD COLUMN artist_name text;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'label_name') THEN
    ALTER TABLE profiles ADD COLUMN label_name text;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'label_type') THEN
    ALTER TABLE profiles ADD COLUMN label_type text;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'roster_size') THEN
    ALTER TABLE profiles ADD COLUMN roster_size text;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'social_links') THEN
    ALTER TABLE profiles ADD COLUMN social_links jsonb DEFAULT '{}';
  END IF;
END $$;

-- Add columns to tracks table
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'tracks' AND column_name = 'instrumental_url') THEN
    ALTER TABLE tracks ADD COLUMN instrumental_url text;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'tracks' AND column_name = 'acapella_url') THEN
    ALTER TABLE tracks ADD COLUMN acapella_url text;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'tracks' AND column_name = 'stems_urls') THEN
    ALTER TABLE tracks ADD COLUMN stems_urls text[];
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'tracks' AND column_name = 'pro_affiliation') THEN
    ALTER TABLE tracks ADD COLUMN pro_affiliation text;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'tracks' AND column_name = 'publisher') THEN
    ALTER TABLE tracks ADD COLUMN publisher text;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'tracks' AND column_name = 'micro_fee_min') THEN
    ALTER TABLE tracks ADD COLUMN micro_fee_min integer DEFAULT 29;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'tracks' AND column_name = 'micro_fee_max') THEN
    ALTER TABLE tracks ADD COLUMN micro_fee_max integer DEFAULT 149;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'tracks' AND column_name = 'co_writers') THEN
    ALTER TABLE tracks ADD COLUMN co_writers jsonb DEFAULT '[]';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'tracks' AND column_name = 'play_count') THEN
    ALTER TABLE tracks ADD COLUMN play_count integer DEFAULT 0;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'tracks' AND column_name = 'save_count') THEN
    ALTER TABLE tracks ADD COLUMN save_count integer DEFAULT 0;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'tracks' AND column_name = 'license_count') THEN
    ALTER TABLE tracks ADD COLUMN license_count integer DEFAULT 0;
  END IF;
END $$;

-- Add notes column to license_requests if missing
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'license_requests' AND column_name = 'notes') THEN
    ALTER TABLE license_requests ADD COLUMN notes text;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'license_requests' AND column_name = 'budget') THEN
    ALTER TABLE license_requests ADD COLUMN budget text;
  END IF;
END $$;

-- Create micro_licenses table for tracking micro license purchases
CREATE TABLE IF NOT EXISTS micro_licenses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  track_id uuid REFERENCES tracks(id) ON DELETE CASCADE,
  buyer_id uuid REFERENCES profiles(id) ON DELETE SET NULL,
  license_type text NOT NULL,
  amount integer NOT NULL,
  platform_fee integer NOT NULL,
  artist_payout integer NOT NULL,
  status text DEFAULT 'completed',
  created_at timestamptz DEFAULT now()
);

ALTER TABLE micro_licenses ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Artists can view their micro licenses" ON micro_licenses;
CREATE POLICY "Artists can view their micro licenses"
  ON micro_licenses FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM tracks
      WHERE tracks.id = micro_licenses.track_id
      AND tracks.uploaded_by = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Buyers can view their purchases" ON micro_licenses;
CREATE POLICY "Buyers can view their purchases"
  ON micro_licenses FOR SELECT
  TO authenticated
  USING (buyer_id = auth.uid());

DROP POLICY IF EXISTS "Authenticated users can create micro licenses" ON micro_licenses;
CREATE POLICY "Authenticated users can create micro licenses"
  ON micro_licenses FOR INSERT
  TO authenticated
  WITH CHECK (buyer_id = auth.uid());
