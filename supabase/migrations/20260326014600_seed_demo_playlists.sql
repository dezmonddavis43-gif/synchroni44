/*
  # Seed Demo Playlists with Tracks

  1. Playlists Created
    - "Summer Vibes 2025" - summer/upbeat tracks
    - "Black History Month" - freedom, soul, heritage tracks  
    - "Holiday Spirit" - Christmas/New Year tracks
    - "Late Night Drive" - tense, electronic, night tracks
    - "Cinco De Mayo Fiesta" - latin, celebration tracks
    - "Valentine's Day" - romantic, sensual tracks
    - "Halloween Haunts" - spooky, dark tracks
    - "Spring Awakening" - peaceful, hopeful tracks
    - "Epic Trailers" - cinematic, aggressive tracks
    - "Chill Sunday Morning" - peaceful, jazz, ambient tracks

  2. Notes
    - Uses first admin user as playlist owner
    - Links tracks by matching titles
*/

DO $$
DECLARE
  admin_user_id uuid;
  playlist_id uuid;
  track_rec RECORD;
BEGIN
  -- Get admin user ID
  SELECT id INTO admin_user_id FROM profiles WHERE role = 'admin' LIMIT 1;
  
  IF admin_user_id IS NULL THEN
    SELECT id INTO admin_user_id FROM profiles WHERE role = 'supervisor' LIMIT 1;
  END IF;

  IF admin_user_id IS NULL THEN
    RAISE NOTICE 'No admin or supervisor found, skipping playlist creation';
    RETURN;
  END IF;

  -- 1. Summer Vibes 2025
  INSERT INTO playlists (name, owner_id, is_public) VALUES ('Summer Vibes 2025', admin_user_id, true) RETURNING id INTO playlist_id;
  FOR track_rec IN SELECT id FROM tracks WHERE title IN ('Golden Summer', 'Summer Cookout', 'Sunset Boulevard', 'Electric Feel', 'Graduation Day') LOOP
    INSERT INTO playlist_tracks (playlist_id, track_id, position) VALUES (playlist_id, track_rec.id, (SELECT COALESCE(MAX(position), -1) + 1 FROM playlist_tracks WHERE playlist_id = playlist_id));
  END LOOP;

  -- 2. Black History Month
  INSERT INTO playlists (name, owner_id, is_public) VALUES ('Black History Month', admin_user_id, true) RETURNING id INTO playlist_id;
  FOR track_rec IN SELECT id FROM tracks WHERE title IN ('Freedom March', 'Roots & Roses', 'Kwanzaa Soul', 'Brooklyn Hustle', 'Pharaoh Rising') LOOP
    INSERT INTO playlist_tracks (playlist_id, track_id, position) VALUES (playlist_id, track_rec.id, (SELECT COALESCE(MAX(position), -1) + 1 FROM playlist_tracks WHERE playlist_id = playlist_id));
  END LOOP;

  -- 3. Holiday Spirit
  INSERT INTO playlists (name, owner_id, is_public) VALUES ('Holiday Spirit', admin_user_id, true) RETURNING id INTO playlist_id;
  FOR track_rec IN SELECT id FROM tracks WHERE title IN ('New Years Eve', 'Harvest Moon', 'Lunar New Year', 'Kwanzaa Soul') LOOP
    INSERT INTO playlist_tracks (playlist_id, track_id, position) VALUES (playlist_id, track_rec.id, (SELECT COALESCE(MAX(position), -1) + 1 FROM playlist_tracks WHERE playlist_id = playlist_id));
  END LOOP;

  -- 4. Late Night Drive
  INSERT INTO playlists (name, owner_id, is_public) VALUES ('Late Night Drive', admin_user_id, true) RETURNING id INTO playlist_id;
  FOR track_rec IN SELECT id FROM tracks WHERE title IN ('Midnight Protocol', 'Neon Genesis', 'Electric Feel', 'Ice Cold', 'Digital Nomad') LOOP
    INSERT INTO playlist_tracks (playlist_id, track_id, position) VALUES (playlist_id, track_rec.id, (SELECT COALESCE(MAX(position), -1) + 1 FROM playlist_tracks WHERE playlist_id = playlist_id));
  END LOOP;

  -- 5. Cinco De Mayo Fiesta
  INSERT INTO playlists (name, owner_id, is_public) VALUES ('Cinco De Mayo Fiesta', admin_user_id, true) RETURNING id INTO playlist_id;
  FOR track_rec IN SELECT id FROM tracks WHERE title IN ('Cinco De Mayo', 'Pharaoh Rising', 'Summer Cookout', 'Golden Summer') LOOP
    INSERT INTO playlist_tracks (playlist_id, track_id, position) VALUES (playlist_id, track_rec.id, (SELECT COALESCE(MAX(position), -1) + 1 FROM playlist_tracks WHERE playlist_id = playlist_id));
  END LOOP;

  -- 6. Valentine's Day
  INSERT INTO playlists (name, owner_id, is_public) VALUES ('Valentine''s Day', admin_user_id, true) RETURNING id INTO playlist_id;
  FOR track_rec IN SELECT id FROM tracks WHERE title IN ('Valentines Night', 'Velvet Sunrise', 'Lavender Haze', 'Electric Feel') LOOP
    INSERT INTO playlist_tracks (playlist_id, track_id, position) VALUES (playlist_id, track_rec.id, (SELECT COALESCE(MAX(position), -1) + 1 FROM playlist_tracks WHERE playlist_id = playlist_id));
  END LOOP;

  -- 7. Halloween Haunts
  INSERT INTO playlists (name, owner_id, is_public) VALUES ('Halloween Haunts', admin_user_id, true) RETURNING id INTO playlist_id;
  FOR track_rec IN SELECT id FROM tracks WHERE title IN ('Halloween Haunt', 'Midnight Protocol', 'Neon Genesis', 'War Drum') LOOP
    INSERT INTO playlist_tracks (playlist_id, track_id, position) VALUES (playlist_id, track_rec.id, (SELECT COALESCE(MAX(position), -1) + 1 FROM playlist_tracks WHERE playlist_id = playlist_id));
  END LOOP;

  -- 8. Spring Awakening
  INSERT INTO playlists (name, owner_id, is_public) VALUES ('Spring Awakening', admin_user_id, true) RETURNING id INTO playlist_id;
  FOR track_rec IN SELECT id FROM tracks WHERE title IN ('Sakura Season', 'Cherry Blossom', 'Lavender Haze', 'Golden Summer', 'Triumph Arc') LOOP
    INSERT INTO playlist_tracks (playlist_id, track_id, position) VALUES (playlist_id, track_rec.id, (SELECT COALESCE(MAX(position), -1) + 1 FROM playlist_tracks WHERE playlist_id = playlist_id));
  END LOOP;

  -- 9. Epic Trailers
  INSERT INTO playlists (name, owner_id, is_public) VALUES ('Epic Trailers', admin_user_id, true) RETURNING id INTO playlist_id;
  FOR track_rec IN SELECT id FROM tracks WHERE title IN ('War Drum', 'Triumph Arc', 'Thunderhead', 'Freedom March') LOOP
    INSERT INTO playlist_tracks (playlist_id, track_id, position) VALUES (playlist_id, track_rec.id, (SELECT COALESCE(MAX(position), -1) + 1 FROM playlist_tracks WHERE playlist_id = playlist_id));
  END LOOP;

  -- 10. Chill Sunday Morning
  INSERT INTO playlists (name, owner_id, is_public) VALUES ('Chill Sunday Morning', admin_user_id, true) RETURNING id INTO playlist_id;
  FOR track_rec IN SELECT id FROM tracks WHERE title IN ('Velvet Sunrise', 'Sakura Season', 'Arctic Circle', 'Lavender Haze', 'Bayou Blues') LOOP
    INSERT INTO playlist_tracks (playlist_id, track_id, position) VALUES (playlist_id, track_rec.id, (SELECT COALESCE(MAX(position), -1) + 1 FROM playlist_tracks WHERE playlist_id = playlist_id));
  END LOOP;

END $$;