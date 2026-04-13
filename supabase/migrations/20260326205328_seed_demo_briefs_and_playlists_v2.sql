/*
  # Seed Demo Briefs and Playlists (No Profile Dependency)

  1. Schema Changes
    - Make supervisor_id nullable on briefs table for demo data
    - Make owner_id nullable on playlists table for demo data

  2. Demo Briefs Created
    - 5 sample briefs for the Opportunities section
    - Nike, Netflix, Toyota, HBO, Taco Bell campaigns
    - Set as public (is_private = false) and open status

  3. Demo Playlists Created  
    - 10 curated playlists linked to demo tracks
    - Summer Vibes, Black History Month, Holiday Spirit, etc.
    - Set as public (is_public = true)

  4. RLS Policy Updates
    - Allow anyone to view public briefs (is_private = false)
    - Allow anyone to view public playlists (is_public = true)

  5. Notes
    - Demo data has null supervisor_id/owner_id to bypass profile requirement
    - Public visibility allows all users to see demo content
*/

-- Make supervisor_id nullable on briefs for demo data
ALTER TABLE briefs ALTER COLUMN supervisor_id DROP NOT NULL;

-- Make owner_id nullable on playlists for demo data  
ALTER TABLE playlists ALTER COLUMN owner_id DROP NOT NULL;

-- Add policy to allow viewing public briefs without authentication
DROP POLICY IF EXISTS "Anyone can view public briefs" ON briefs;
CREATE POLICY "Anyone can view public briefs"
  ON briefs FOR SELECT
  USING (is_private = false AND status = 'open');

-- Add policy to allow viewing public playlists without authentication
DROP POLICY IF EXISTS "Anyone can view public playlists" ON playlists;
CREATE POLICY "Anyone can view public playlists"
  ON playlists FOR SELECT
  USING (is_public = true);

-- Add policy to allow viewing tracks in public playlists
DROP POLICY IF EXISTS "Anyone can view tracks in public playlists" ON playlist_tracks;
CREATE POLICY "Anyone can view tracks in public playlists"
  ON playlist_tracks FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM playlists 
      WHERE playlists.id = playlist_tracks.playlist_id 
      AND playlists.is_public = true
    )
  );

-- Insert 5 sample briefs (public, open, no supervisor)
INSERT INTO briefs (title, description, mood, genre, bpm_min, bpm_max, budget, deadline, supervisor_id, status, is_private, usage_type, client, moods, genres) VALUES
(
  'Nike - Summer Campaign 2025',
  'We need an anthemic, uplifting track for our summer running campaign. Should feel like pushing through barriers and achieving greatness. High energy, builds to a climax.',
  'Hopeful',
  'Hip-Hop',
  120, 145,
  100000,
  NOW() + INTERVAL '14 days',
  NULL,
  'open',
  false,
  '6 Months - National Broadcast TV, Internet, Paid Social, Exclusivity',
  'Nike',
  ARRAY['Hopeful', 'Aggressive'],
  ARRAY['Hip-Hop', 'Electronic']
),
(
  'Netflix Drama Series - Episode 4 Underscore',
  'Melancholic, atmospheric piece for a breakup scene. Should feel bittersweet, not devastatingly sad. Piano or acoustic guitar preferred. Female or no vocal.',
  'Melancholic',
  'Ambient',
  60, 90,
  40000,
  NOW() + INTERVAL '10 days',
  NULL,
  'open',
  false,
  '1 Year - Worldwide Streaming, All Media',
  'Netflix',
  ARRAY['Melancholic', 'Nostalgic'],
  ARRAY['Indie Pop', 'Ambient']
),
(
  'Toyota - Holiday Campaign',
  'Warm, family-oriented track for holiday TV spot. Should feel like coming home, gathering together, gratitude. Orchestral or acoustic, not too on-the-nose Christmassy.',
  'Hopeful',
  'Folk',
  70, 95,
  150000,
  NOW() + INTERVAL '21 days',
  NULL,
  'open',
  false,
  '3 Months - National Broadcast TV, Internet, Industrial',
  'Toyota',
  ARRAY['Hopeful', 'Nostalgic'],
  ARRAY['Folk', 'Cinematic']
),
(
  'HBO Documentary - Opening Title Sequence',
  'Powerful, thought-provoking track for a documentary about civil rights. Should feel weighty and important but also hopeful. Gospel, soul, or cinematic influences.',
  'Hopeful',
  'Gospel',
  75, 100,
  60000,
  NOW() + INTERVAL '30 days',
  NULL,
  'open',
  false,
  'In Perpetuity - Worldwide, All Media, Exclusivity',
  'HBO',
  ARRAY['Hopeful', 'Melancholic'],
  ARRAY['Gospel', 'Cinematic']
),
(
  'Taco Bell - Late Night Social Campaign',
  'Fun, irreverent, late-night energy track for social media campaign. Should feel like 2am good decisions. Hip-hop or trap influence, not too serious.',
  'Aggressive',
  'Hip-Hop',
  130, 150,
  30000,
  NOW() + INTERVAL '14 days',
  NULL,
  'open',
  false,
  '6 Months - Digital/Social Media Only, Non-Exclusive',
  'Taco Bell',
  ARRAY['Aggressive', 'Hopeful'],
  ARRAY['Hip-Hop', 'Electronic']
)
ON CONFLICT DO NOTHING;

-- Now create playlists (public, no owner)
DO $$
DECLARE
  playlist_id uuid;
  track_rec RECORD;
  pos int;
BEGIN
  -- 1. Summer Vibes 2025
  INSERT INTO playlists (name, owner_id, is_public) VALUES ('Summer Vibes 2025', NULL, true) RETURNING id INTO playlist_id;
  pos := 0;
  FOR track_rec IN SELECT id FROM tracks WHERE title IN ('Golden Summer', 'Summer Cookout', 'Sunset Boulevard', 'Electric Feel', 'Graduation Day') LOOP
    INSERT INTO playlist_tracks (playlist_id, track_id, position, added_by) VALUES (playlist_id, track_rec.id, pos, NULL);
    pos := pos + 1;
  END LOOP;

  -- 2. Black History Month
  INSERT INTO playlists (name, owner_id, is_public) VALUES ('Black History Month', NULL, true) RETURNING id INTO playlist_id;
  pos := 0;
  FOR track_rec IN SELECT id FROM tracks WHERE title IN ('Freedom March', 'Roots & Roses', 'Kwanzaa Soul', 'Brooklyn Hustle', 'Pharaoh Rising') LOOP
    INSERT INTO playlist_tracks (playlist_id, track_id, position, added_by) VALUES (playlist_id, track_rec.id, pos, NULL);
    pos := pos + 1;
  END LOOP;

  -- 3. Holiday Spirit
  INSERT INTO playlists (name, owner_id, is_public) VALUES ('Holiday Spirit', NULL, true) RETURNING id INTO playlist_id;
  pos := 0;
  FOR track_rec IN SELECT id FROM tracks WHERE title IN ('New Years Eve', 'Harvest Moon', 'Lunar New Year', 'Kwanzaa Soul') LOOP
    INSERT INTO playlist_tracks (playlist_id, track_id, position, added_by) VALUES (playlist_id, track_rec.id, pos, NULL);
    pos := pos + 1;
  END LOOP;

  -- 4. Late Night Drive
  INSERT INTO playlists (name, owner_id, is_public) VALUES ('Late Night Drive', NULL, true) RETURNING id INTO playlist_id;
  pos := 0;
  FOR track_rec IN SELECT id FROM tracks WHERE title IN ('Midnight Protocol', 'Neon Genesis', 'Electric Feel', 'Ice Cold', 'Digital Nomad') LOOP
    INSERT INTO playlist_tracks (playlist_id, track_id, position, added_by) VALUES (playlist_id, track_rec.id, pos, NULL);
    pos := pos + 1;
  END LOOP;

  -- 5. Cinco De Mayo Fiesta
  INSERT INTO playlists (name, owner_id, is_public) VALUES ('Cinco De Mayo Fiesta', NULL, true) RETURNING id INTO playlist_id;
  pos := 0;
  FOR track_rec IN SELECT id FROM tracks WHERE title IN ('Cinco De Mayo', 'Pharaoh Rising', 'Summer Cookout', 'Golden Summer') LOOP
    INSERT INTO playlist_tracks (playlist_id, track_id, position, added_by) VALUES (playlist_id, track_rec.id, pos, NULL);
    pos := pos + 1;
  END LOOP;

  -- 6. Valentine's Day
  INSERT INTO playlists (name, owner_id, is_public) VALUES ('Valentine''s Day', NULL, true) RETURNING id INTO playlist_id;
  pos := 0;
  FOR track_rec IN SELECT id FROM tracks WHERE title IN ('Valentines Night', 'Velvet Sunrise', 'Lavender Haze', 'Electric Feel') LOOP
    INSERT INTO playlist_tracks (playlist_id, track_id, position, added_by) VALUES (playlist_id, track_rec.id, pos, NULL);
    pos := pos + 1;
  END LOOP;

  -- 7. Halloween Haunts
  INSERT INTO playlists (name, owner_id, is_public) VALUES ('Halloween Haunts', NULL, true) RETURNING id INTO playlist_id;
  pos := 0;
  FOR track_rec IN SELECT id FROM tracks WHERE title IN ('Halloween Haunt', 'Midnight Protocol', 'Neon Genesis', 'War Drum') LOOP
    INSERT INTO playlist_tracks (playlist_id, track_id, position, added_by) VALUES (playlist_id, track_rec.id, pos, NULL);
    pos := pos + 1;
  END LOOP;

  -- 8. Spring Awakening
  INSERT INTO playlists (name, owner_id, is_public) VALUES ('Spring Awakening', NULL, true) RETURNING id INTO playlist_id;
  pos := 0;
  FOR track_rec IN SELECT id FROM tracks WHERE title IN ('Sakura Season', 'Cherry Blossom', 'Lavender Haze', 'Golden Summer', 'Triumph Arc') LOOP
    INSERT INTO playlist_tracks (playlist_id, track_id, position, added_by) VALUES (playlist_id, track_rec.id, pos, NULL);
    pos := pos + 1;
  END LOOP;

  -- 9. Epic Trailers
  INSERT INTO playlists (name, owner_id, is_public) VALUES ('Epic Trailers', NULL, true) RETURNING id INTO playlist_id;
  pos := 0;
  FOR track_rec IN SELECT id FROM tracks WHERE title IN ('War Drum', 'Triumph Arc', 'Thunderhead', 'Freedom March') LOOP
    INSERT INTO playlist_tracks (playlist_id, track_id, position, added_by) VALUES (playlist_id, track_rec.id, pos, NULL);
    pos := pos + 1;
  END LOOP;

  -- 10. Chill Sunday Morning
  INSERT INTO playlists (name, owner_id, is_public) VALUES ('Chill Sunday Morning', NULL, true) RETURNING id INTO playlist_id;
  pos := 0;
  FOR track_rec IN SELECT id FROM tracks WHERE title IN ('Velvet Sunrise', 'Sakura Season', 'Arctic Circle', 'Lavender Haze', 'Bayou Blues') LOOP
    INSERT INTO playlist_tracks (playlist_id, track_id, position, added_by) VALUES (playlist_id, track_rec.id, pos, NULL);
    pos := pos + 1;
  END LOOP;
END $$;
