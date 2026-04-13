/*
  # Add cover art URL to tracks

  1. Changes
    - Add `cover_art_url` column to `tracks` table for storing album/track artwork

  2. Notes
    - Column is nullable since cover art is optional
    - Images will be stored in Supabase storage and URLs referenced here
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'tracks' AND column_name = 'cover_art_url'
  ) THEN
    ALTER TABLE tracks ADD COLUMN cover_art_url text;
  END IF;
END $$;
