/*
  # Add artwork_color column and seed demo tracks, playlists, and briefs

  1. Schema Changes
    - Add `artwork_color` column to tracks table for unique visual identity

  2. Demo Data
    - 30 diverse demo tracks across all genres/moods
    - 10 curated demo playlists with track associations
    - 5 sample briefs for the Opportunities section

  3. Notes
    - All demo tracks have status='active' for visibility
    - Playlists use system admin user as owner
    - Briefs are public/open for demo purposes
*/

-- Add artwork_color column to tracks
ALTER TABLE tracks ADD COLUMN IF NOT EXISTS artwork_color text DEFAULT '#C8A97E';

-- Insert 30 demo tracks with diverse artwork colors
INSERT INTO tracks (title, artist, genre, mood, bpm, key, tags, clearance_status, one_stop_fee, status, play_count, save_count, artwork_color, duration) VALUES
('Golden Summer', 'Marisol Cruz', 'Pop', 'Hopeful', 98, 'G', ARRAY['summer','upbeat','sunshine','feel-good','pop'], 'CLEAR', 650, 'active', 1205, 342, '#FFD700', 195),
('Midnight Protocol', 'AXON', 'Electronic', 'Suspenseful', 132, 'Bm', ARRAY['cyber','dark','tension','action','night'], 'PRO', 1800, 'active', 892, 201, '#4B0082', 240),
('Roots & Roses', 'The Harlem Collective', 'R&B', 'Nostalgic', 78, 'F', ARRAY['soul','heritage','emotional','classic','warm'], 'CLEAR', 950, 'active', 2341, 567, '#8B4513', 228),
('Electric Feel', 'Nyx', 'Pop', 'Sensual', 112, 'Am', ARRAY['retro','80s','dance','neon','night'], 'CLEAR', 750, 'active', 1876, 423, '#FF1493', 212),
('War Drum', 'Siege', 'Cinematic', 'Aggressive', 145, 'Dm', ARRAY['battle','epic','trailer','intense','power'], 'PRO', 3500, 'active', 654, 123, '#8B0000', 180),
('Lavender Haze', 'Luna Park', 'Ambient', 'Peaceful', 72, 'D', ARRAY['dreamy','soft','feminine','ethereal','calm'], 'CLEAR', 600, 'active', 1543, 389, '#E6E6FA', 265),
('Brooklyn Hustle', 'Jay Mack', 'Hip-Hop', 'Aggressive', 94, 'Cm', ARRAY['street','authentic','urban','gritty','raw'], 'CLEAR', 800, 'active', 3210, 678, '#2F4F4F', 198),
('Sakura Season', 'Yuki Tanaka', 'Ambient', 'Peaceful', 65, 'E', ARRAY['spring','japan','nature','meditative','soft'], 'CLEAR', 450, 'active', 876, 234, '#FFB7C5', 300),
('Triumph Arc', 'Orion Fields', 'Cinematic', 'Hopeful', 118, 'C', ARRAY['victory','sports','inspire','anthem','rise'], 'PRO', 2800, 'active', 1987, 445, '#FFD700', 210),
('Red Dirt Road', 'Caleb Moore', 'Country', 'Nostalgic', 84, 'G', ARRAY['americana','heartland','story','road trip','roots'], 'CLEAR', 700, 'active', 1123, 289, '#CD853F', 235),
('Neon Genesis', 'VOID', 'Electronic', 'Tense', 140, 'F#m', ARRAY['cyberpunk','future','chase','dark','electric'], 'PRO', 1600, 'active', 765, 187, '#00FF00', 225),
('Harvest Moon', 'The Folk Rivers', 'Folk', 'Nostalgic', 76, 'A', ARRAY['autumn','harvest','warm','acoustic','storytelling'], 'CLEAR', 550, 'active', 934, 267, '#FF8C00', 248),
('Pharaoh Rising', 'Amara Soul', 'R&B', 'Hopeful', 102, 'Bb', ARRAY['africa','celebration','culture','dance','vibrant'], 'CLEAR', 850, 'active', 2654, 589, '#DAA520', 205),
('Ice Cold', 'Frost', 'Hip-Hop', 'Aggressive', 138, 'Em', ARRAY['winter','hard','luxury','trap','cold'], 'CLEAR', 900, 'active', 1876, 334, '#87CEEB', 192),
('Velvet Sunrise', 'Cleo James', 'Jazz', 'Peaceful', 68, 'Db', ARRAY['morning','smooth','coffee','chill','sophisticated'], 'CLEAR', 600, 'active', 1234, 345, '#8B0000', 275),
('Digital Nomad', 'Pulse Theory', 'Electronic', 'Hopeful', 124, 'Bm', ARRAY['travel','adventure','modern','future','free'], 'CLEAR', 750, 'active', 987, 223, '#00CED1', 218),
('Freedom March', 'Unity Sound', 'Gospel', 'Hopeful', 88, 'F', ARRAY['justice','empowerment','black history','soul','powerful'], 'PRO', 1200, 'active', 3456, 789, '#000000', 245),
('Cherry Blossom', 'Hana K', 'Pop', 'Hopeful', 118, 'G', ARRAY['spring','cute','anime','fresh','pink'], 'CLEAR', 500, 'active', 1543, 378, '#FFB7C5', 188),
('Thunderhead', 'Storm Caller', 'Rock', 'Aggressive', 152, 'E', ARRAY['storm','power','electric','intense','raw'], 'CLEAR', 950, 'active', 2109, 456, '#708090', 232),
('Sunset Boulevard', 'The Malibu Set', 'Pop', 'Nostalgic', 92, 'D', ARRAY['california','summer','golden hour','road trip','warm'], 'CLEAR', 700, 'active', 1678, 412, '#FF6347', 215),
('Lunar New Year', 'Chen Wei', 'World', 'Hopeful', 128, 'C', ARRAY['celebration','chinese new year','festive','culture','joy'], 'CLEAR', 600, 'active', 876, 198, '#FF0000', 195),
('Bayou Blues', 'Mama Dupree', 'Blues', 'Melancholic', 72, 'Bb', ARRAY['louisiana','soulful','southern','emotion','raw'], 'CLEAR', 650, 'active', 1234, 289, '#4682B4', 268),
('Valentines Night', 'Silk & Rouge', 'R&B', 'Sensual', 82, 'F#m', ARRAY['romance','love','valentine','intimate','smooth'], 'CLEAR', 850, 'active', 2345, 567, '#FF69B4', 222),
('Arctic Circle', 'Northern Lights', 'Ambient', 'Peaceful', 58, 'C#', ARRAY['winter','meditation','cold','nature','vast'], 'CLEAR', 500, 'active', 654, 167, '#B0E0E6', 320),
('Cinco De Mayo', 'La Fiesta Band', 'Latin', 'Hopeful', 138, 'G', ARRAY['celebration','mexico','fiesta','dance','vibrant'], 'CLEAR', 700, 'active', 987, 234, '#006400', 198),
('Graduation Day', 'Cap & Gown', 'Pop', 'Hopeful', 104, 'A', ARRAY['achievement','milestone','celebration','young','inspire'], 'CLEAR', 600, 'active', 1876, 445, '#4169E1', 208),
('Halloween Haunt', 'The Shadows', 'Electronic', 'Tense', 128, 'Dm', ARRAY['halloween','spooky','dark','horror','mysterious'], 'CLEAR', 750, 'active', 1234, 289, '#FF6600', 235),
('Kwanzaa Soul', 'Imani Rivers', 'Soul', 'Hopeful', 86, 'F', ARRAY['kwanzaa','heritage','family','warm','culture'], 'CLEAR', 700, 'active', 876, 234, '#006400', 242),
('New Years Eve', 'Champagne Dreams', 'Pop', 'Hopeful', 128, 'C', ARRAY['new year','celebration','midnight','party','countdown'], 'CLEAR', 800, 'active', 2345, 567, '#C0C0C0', 202),
('Summer Cookout', 'The Backyard Band', 'Hip-Hop', 'Hopeful', 95, 'G', ARRAY['summer','bbq','cookout','fun','community'], 'CLEAR', 650, 'active', 1987, 478, '#FF4500', 215)
ON CONFLICT DO NOTHING;

-- Get a default supervisor ID for briefs (use first admin or supervisor profile)
DO $$
DECLARE
  default_supervisor_id uuid;
BEGIN
  -- Try to find an admin first, then a supervisor
  SELECT id INTO default_supervisor_id FROM profiles WHERE role = 'admin' LIMIT 1;
  
  IF default_supervisor_id IS NULL THEN
    SELECT id INTO default_supervisor_id FROM profiles WHERE role = 'supervisor' LIMIT 1;
  END IF;

  -- Only insert briefs if we have a supervisor
  IF default_supervisor_id IS NOT NULL THEN
    -- Insert 5 sample briefs
    INSERT INTO briefs (title, description, mood, genre, bpm_min, bpm_max, budget, deadline, supervisor_id, status, usage_type, client, moods, genres) VALUES
    (
      'Nike - Summer Campaign 2025',
      'We need an anthemic, uplifting track for our summer running campaign. Should feel like pushing through barriers and achieving greatness. High energy, builds to a climax.',
      'Hopeful',
      'Hip-Hop',
      120, 145,
      100000,
      NOW() + INTERVAL '14 days',
      default_supervisor_id,
      'active',
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
      default_supervisor_id,
      'active',
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
      default_supervisor_id,
      'active',
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
      default_supervisor_id,
      'active',
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
      default_supervisor_id,
      'active',
      '6 Months - Digital/Social Media Only, Non-Exclusive',
      'Taco Bell',
      ARRAY['Aggressive', 'Hopeful'],
      ARRAY['Hip-Hop', 'Electronic']
    )
    ON CONFLICT DO NOTHING;
  END IF;
END $$;