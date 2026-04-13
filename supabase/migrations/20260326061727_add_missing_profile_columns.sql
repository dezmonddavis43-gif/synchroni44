/*
  # Add missing profile columns

  This migration adds missing columns to the profiles table that are required
  by the application but may not exist in the database.

  1. Changes
    - Add artist_name column if missing
    - Add label_name column if missing
    - Add onboarding_complete column if missing
    - Add other profile columns
*/

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