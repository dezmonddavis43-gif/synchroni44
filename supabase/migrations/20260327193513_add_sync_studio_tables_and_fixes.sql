/*
  # Add Sync Studio Tables and Sample Content

  1. New Tables
    - `studio_scenes` - Stores video scenes for music auditioning
      - `id` (uuid, primary key)
      - `supervisor_id` (uuid, foreign key to profiles)
      - `title` (text, required)
      - `notes` (text, optional)
      - `video_url` (text, optional) - URL to video file
      - `video_file_path` (text, optional) - Storage path for uploaded video
      - `duration_seconds` (integer, optional)
      - `created_at` (timestamp)
    
    - `studio_matches` - Stores track-to-scene pairings
      - `id` (uuid, primary key)
      - `supervisor_id` (uuid, foreign key to profiles)
      - `scene_id` (uuid, foreign key to studio_scenes, nullable)
      - `track_id` (uuid, foreign key to tracks)
      - `note` (text, optional)
      - `clip_volume` (integer, default 70)
      - `music_volume` (integer, default 80)
      - `music_offset_seconds` (integer, default 0)
      - `created_at` (timestamp)

  2. Security
    - Enable RLS on both tables
    - Add policies for authenticated users to manage their own data
*/

-- Create studio_scenes table
CREATE TABLE IF NOT EXISTS studio_scenes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  supervisor_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  title text NOT NULL,
  notes text,
  video_url text,
  video_file_path text,
  duration_seconds integer,
  created_at timestamptz DEFAULT now()
);

-- Create studio_matches table
CREATE TABLE IF NOT EXISTS studio_matches (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  supervisor_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  scene_id uuid REFERENCES studio_scenes(id) ON DELETE SET NULL,
  track_id uuid NOT NULL REFERENCES tracks(id) ON DELETE CASCADE,
  note text,
  clip_volume integer DEFAULT 70,
  music_volume integer DEFAULT 80,
  music_offset_seconds integer DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE studio_scenes ENABLE ROW LEVEL SECURITY;
ALTER TABLE studio_matches ENABLE ROW LEVEL SECURITY;

-- RLS policies for studio_scenes
CREATE POLICY "Users can view own scenes"
  ON studio_scenes FOR SELECT
  TO authenticated
  USING (auth.uid() = supervisor_id);

CREATE POLICY "Users can create own scenes"
  ON studio_scenes FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = supervisor_id);

CREATE POLICY "Users can update own scenes"
  ON studio_scenes FOR UPDATE
  TO authenticated
  USING (auth.uid() = supervisor_id)
  WITH CHECK (auth.uid() = supervisor_id);

CREATE POLICY "Users can delete own scenes"
  ON studio_scenes FOR DELETE
  TO authenticated
  USING (auth.uid() = supervisor_id);

-- RLS policies for studio_matches
CREATE POLICY "Users can view own matches"
  ON studio_matches FOR SELECT
  TO authenticated
  USING (auth.uid() = supervisor_id);

CREATE POLICY "Users can create own matches"
  ON studio_matches FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = supervisor_id);

CREATE POLICY "Users can update own matches"
  ON studio_matches FOR UPDATE
  TO authenticated
  USING (auth.uid() = supervisor_id)
  WITH CHECK (auth.uid() = supervisor_id);

CREATE POLICY "Users can delete own matches"
  ON studio_matches FOR DELETE
  TO authenticated
  USING (auth.uid() = supervisor_id);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_studio_scenes_supervisor ON studio_scenes(supervisor_id);
CREATE INDEX IF NOT EXISTS idx_studio_matches_supervisor ON studio_matches(supervisor_id);
CREATE INDEX IF NOT EXISTS idx_studio_matches_scene ON studio_matches(scene_id);
CREATE INDEX IF NOT EXISTS idx_studio_matches_track ON studio_matches(track_id);
