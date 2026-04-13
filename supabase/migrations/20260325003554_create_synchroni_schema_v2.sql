/*
  # Synchroni V4 Database Schema

  1. New Tables
    - `profiles` - User profiles with role (supervisor, artist, label, admin)
    - `tracks` - Music tracks in the catalog
    - `projects` - Supervisor projects
    - `playlists` - Track playlists
    - `playlist_tracks` - Tracks in playlists
    - `briefs` - Sync briefs from supervisors
    - `brief_recipients` - Private brief recipients
    - `inbox_submissions` - Track submissions to supervisors
    - `license_requests` - License requests
    - `hit_list_members` - Supervisor hit list
    - `saved_tracks` - User saved tracks
    - `messages` - Direct messages
    - `track_analytics` - Track play/view analytics
    - `label_roster_members` - Label artist roster
    - `pitches` - Label track pitches

  2. Security
    - Enable RLS on all tables
    - Add policies for authenticated users based on role and ownership
*/

-- Create profiles table
CREATE TABLE IF NOT EXISTS profiles (
  id uuid PRIMARY KEY REFERENCES auth.users ON DELETE CASCADE,
  email text UNIQUE NOT NULL,
  full_name text NOT NULL,
  role text NOT NULL CHECK (role IN ('supervisor', 'artist', 'label', 'admin')),
  company text,
  avatar_url text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view all profiles"
  ON profiles FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can insert own profile"
  ON profiles FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);

-- Create tracks table
CREATE TABLE IF NOT EXISTS tracks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  artist text NOT NULL,
  mood text,
  genre text,
  bpm integer,
  key text,
  audio_url text,
  clearance_status text DEFAULT 'PENDING' CHECK (clearance_status IN ('CLEAR', 'PRO', 'PENDING')),
  status text DEFAULT 'review' CHECK (status IN ('active', 'review', 'rejected')),
  duration integer,
  tags text[],
  uploaded_by uuid REFERENCES profiles(id) ON DELETE SET NULL,
  label_id uuid REFERENCES profiles(id) ON DELETE SET NULL,
  one_stop_fee integer,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE tracks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view active tracks"
  ON tracks FOR SELECT
  TO authenticated
  USING (status = 'active' OR uploaded_by = auth.uid() OR label_id = auth.uid());

CREATE POLICY "Users can insert own tracks"
  ON tracks FOR INSERT
  TO authenticated
  WITH CHECK (uploaded_by = auth.uid());

CREATE POLICY "Users can update own tracks"
  ON tracks FOR UPDATE
  TO authenticated
  USING (uploaded_by = auth.uid() OR label_id = auth.uid())
  WITH CHECK (uploaded_by = auth.uid() OR label_id = auth.uid());

CREATE POLICY "Admins can update any track"
  ON tracks FOR UPDATE
  TO authenticated
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));

-- Create projects table
CREATE TABLE IF NOT EXISTS projects (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  client text,
  status text DEFAULT 'active' CHECK (status IN ('active', 'completed', 'on_hold', 'cancelled')),
  deadline timestamptz,
  budget integer,
  supervisor_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE projects ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own projects"
  ON projects FOR SELECT
  TO authenticated
  USING (supervisor_id = auth.uid());

CREATE POLICY "Users can insert own projects"
  ON projects FOR INSERT
  TO authenticated
  WITH CHECK (supervisor_id = auth.uid());

CREATE POLICY "Users can update own projects"
  ON projects FOR UPDATE
  TO authenticated
  USING (supervisor_id = auth.uid())
  WITH CHECK (supervisor_id = auth.uid());

CREATE POLICY "Users can delete own projects"
  ON projects FOR DELETE
  TO authenticated
  USING (supervisor_id = auth.uid());

-- Create playlists table
CREATE TABLE IF NOT EXISTS playlists (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  project_id uuid REFERENCES projects(id) ON DELETE SET NULL,
  folder_name text,
  scene_name text,
  owner_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  is_public boolean DEFAULT false,
  share_token text UNIQUE,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE playlists ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own playlists"
  ON playlists FOR SELECT
  TO authenticated
  USING (owner_id = auth.uid() OR is_public = true);

CREATE POLICY "Users can insert own playlists"
  ON playlists FOR INSERT
  TO authenticated
  WITH CHECK (owner_id = auth.uid());

CREATE POLICY "Users can update own playlists"
  ON playlists FOR UPDATE
  TO authenticated
  USING (owner_id = auth.uid())
  WITH CHECK (owner_id = auth.uid());

CREATE POLICY "Users can delete own playlists"
  ON playlists FOR DELETE
  TO authenticated
  USING (owner_id = auth.uid());

-- Create playlist_tracks table
CREATE TABLE IF NOT EXISTS playlist_tracks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  playlist_id uuid REFERENCES playlists(id) ON DELETE CASCADE NOT NULL,
  track_id uuid REFERENCES tracks(id) ON DELETE CASCADE NOT NULL,
  position integer NOT NULL DEFAULT 0,
  notes text
);

ALTER TABLE playlist_tracks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view playlist tracks for own playlists"
  ON playlist_tracks FOR SELECT
  TO authenticated
  USING (EXISTS (SELECT 1 FROM playlists WHERE id = playlist_id AND (owner_id = auth.uid() OR is_public = true)));

CREATE POLICY "Users can insert tracks to own playlists"
  ON playlist_tracks FOR INSERT
  TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM playlists WHERE id = playlist_id AND owner_id = auth.uid()));

CREATE POLICY "Users can update tracks in own playlists"
  ON playlist_tracks FOR UPDATE
  TO authenticated
  USING (EXISTS (SELECT 1 FROM playlists WHERE id = playlist_id AND owner_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM playlists WHERE id = playlist_id AND owner_id = auth.uid()));

CREATE POLICY "Users can delete tracks from own playlists"
  ON playlist_tracks FOR DELETE
  TO authenticated
  USING (EXISTS (SELECT 1 FROM playlists WHERE id = playlist_id AND owner_id = auth.uid()));

-- Create briefs table (without circular reference policy first)
CREATE TABLE IF NOT EXISTS briefs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text,
  scene_type text,
  mood text,
  genre text,
  bpm_min integer,
  bpm_max integer,
  budget integer,
  deadline timestamptz,
  is_private boolean DEFAULT false,
  supervisor_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  status text DEFAULT 'open' CHECK (status IN ('open', 'closed')),
  created_at timestamptz DEFAULT now()
);

ALTER TABLE briefs ENABLE ROW LEVEL SECURITY;

-- Create brief_recipients table
CREATE TABLE IF NOT EXISTS brief_recipients (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  brief_id uuid REFERENCES briefs(id) ON DELETE CASCADE NOT NULL,
  artist_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  UNIQUE(brief_id, artist_id)
);

ALTER TABLE brief_recipients ENABLE ROW LEVEL SECURITY;

-- Now add briefs policies with proper references
CREATE POLICY "Users can view public briefs or own briefs or recipient briefs"
  ON briefs FOR SELECT
  TO authenticated
  USING (is_private = false OR supervisor_id = auth.uid() OR 
    EXISTS (SELECT 1 FROM brief_recipients WHERE brief_id = briefs.id AND artist_id = auth.uid()));

CREATE POLICY "Users can insert own briefs"
  ON briefs FOR INSERT
  TO authenticated
  WITH CHECK (supervisor_id = auth.uid());

CREATE POLICY "Users can update own briefs"
  ON briefs FOR UPDATE
  TO authenticated
  USING (supervisor_id = auth.uid())
  WITH CHECK (supervisor_id = auth.uid());

CREATE POLICY "Users can delete own briefs"
  ON briefs FOR DELETE
  TO authenticated
  USING (supervisor_id = auth.uid());

-- brief_recipients policies
CREATE POLICY "Supervisors can view own brief recipients"
  ON brief_recipients FOR SELECT
  TO authenticated
  USING (EXISTS (SELECT 1 FROM briefs WHERE id = brief_id AND supervisor_id = auth.uid()) OR artist_id = auth.uid());

CREATE POLICY "Supervisors can insert brief recipients"
  ON brief_recipients FOR INSERT
  TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM briefs WHERE id = brief_id AND supervisor_id = auth.uid()));

CREATE POLICY "Supervisors can delete brief recipients"
  ON brief_recipients FOR DELETE
  TO authenticated
  USING (EXISTS (SELECT 1 FROM briefs WHERE id = brief_id AND supervisor_id = auth.uid()));

-- Create inbox_submissions table
CREATE TABLE IF NOT EXISTS inbox_submissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  track_id uuid REFERENCES tracks(id) ON DELETE CASCADE NOT NULL,
  artist_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  supervisor_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  message text,
  status text DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'passed')),
  brief_id uuid REFERENCES briefs(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE inbox_submissions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own submissions"
  ON inbox_submissions FOR SELECT
  TO authenticated
  USING (artist_id = auth.uid() OR supervisor_id = auth.uid());

CREATE POLICY "Artists can insert submissions"
  ON inbox_submissions FOR INSERT
  TO authenticated
  WITH CHECK (artist_id = auth.uid());

CREATE POLICY "Supervisors can update submissions"
  ON inbox_submissions FOR UPDATE
  TO authenticated
  USING (supervisor_id = auth.uid())
  WITH CHECK (supervisor_id = auth.uid());

-- Create license_requests table
CREATE TABLE IF NOT EXISTS license_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  track_id uuid REFERENCES tracks(id) ON DELETE CASCADE NOT NULL,
  project_id uuid REFERENCES projects(id) ON DELETE SET NULL,
  supervisor_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  license_type text NOT NULL CHECK (license_type IN ('one_stop', 'quote')),
  usage_type text,
  territory text,
  term text,
  fee_offered integer,
  fee_agreed integer,
  status text DEFAULT 'pending' CHECK (status IN ('pending', 'in_review', 'negotiating', 'approved', 'rejected')),
  created_at timestamptz DEFAULT now()
);

ALTER TABLE license_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own license requests"
  ON license_requests FOR SELECT
  TO authenticated
  USING (supervisor_id = auth.uid() OR EXISTS (SELECT 1 FROM tracks WHERE id = track_id AND uploaded_by = auth.uid()));

CREATE POLICY "Users can insert license requests"
  ON license_requests FOR INSERT
  TO authenticated
  WITH CHECK (supervisor_id = auth.uid());

CREATE POLICY "Users can update own license requests"
  ON license_requests FOR UPDATE
  TO authenticated
  USING (supervisor_id = auth.uid())
  WITH CHECK (supervisor_id = auth.uid());

-- Create hit_list_members table
CREATE TABLE IF NOT EXISTS hit_list_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  supervisor_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  artist_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  created_at timestamptz DEFAULT now(),
  UNIQUE(supervisor_id, artist_id)
);

ALTER TABLE hit_list_members ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own hit list"
  ON hit_list_members FOR SELECT
  TO authenticated
  USING (supervisor_id = auth.uid() OR artist_id = auth.uid());

CREATE POLICY "Supervisors can insert to hit list"
  ON hit_list_members FOR INSERT
  TO authenticated
  WITH CHECK (supervisor_id = auth.uid());

CREATE POLICY "Supervisors can delete from hit list"
  ON hit_list_members FOR DELETE
  TO authenticated
  USING (supervisor_id = auth.uid());

-- Create saved_tracks table
CREATE TABLE IF NOT EXISTS saved_tracks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  track_id uuid REFERENCES tracks(id) ON DELETE CASCADE NOT NULL,
  created_at timestamptz DEFAULT now(),
  UNIQUE(user_id, track_id)
);

ALTER TABLE saved_tracks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own saved tracks"
  ON saved_tracks FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can insert own saved tracks"
  ON saved_tracks FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can delete own saved tracks"
  ON saved_tracks FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());

-- Create messages table
CREATE TABLE IF NOT EXISTS messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sender_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  recipient_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  content text NOT NULL,
  read boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own messages"
  ON messages FOR SELECT
  TO authenticated
  USING (sender_id = auth.uid() OR recipient_id = auth.uid());

CREATE POLICY "Users can insert messages"
  ON messages FOR INSERT
  TO authenticated
  WITH CHECK (sender_id = auth.uid());

CREATE POLICY "Users can update received messages"
  ON messages FOR UPDATE
  TO authenticated
  USING (recipient_id = auth.uid())
  WITH CHECK (recipient_id = auth.uid());

-- Create track_analytics table
CREATE TABLE IF NOT EXISTS track_analytics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  track_id uuid REFERENCES tracks(id) ON DELETE CASCADE NOT NULL,
  event_type text NOT NULL CHECK (event_type IN ('play', 'save', 'view')),
  user_id uuid REFERENCES profiles(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE track_analytics ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view analytics for own tracks"
  ON track_analytics FOR SELECT
  TO authenticated
  USING (EXISTS (SELECT 1 FROM tracks WHERE id = track_id AND uploaded_by = auth.uid()));

CREATE POLICY "Authenticated users can insert analytics"
  ON track_analytics FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid() OR user_id IS NULL);

-- Create label_roster_members table
CREATE TABLE IF NOT EXISTS label_roster_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  label_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  artist_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  created_at timestamptz DEFAULT now(),
  UNIQUE(label_id, artist_id)
);

ALTER TABLE label_roster_members ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Labels can view own roster"
  ON label_roster_members FOR SELECT
  TO authenticated
  USING (label_id = auth.uid() OR artist_id = auth.uid());

CREATE POLICY "Labels can insert to roster"
  ON label_roster_members FOR INSERT
  TO authenticated
  WITH CHECK (label_id = auth.uid());

CREATE POLICY "Labels can delete from roster"
  ON label_roster_members FOR DELETE
  TO authenticated
  USING (label_id = auth.uid());

-- Create pitches table
CREATE TABLE IF NOT EXISTS pitches (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  track_id uuid REFERENCES tracks(id) ON DELETE CASCADE NOT NULL,
  label_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  supervisor_name text,
  project_name text,
  fee_offered integer,
  fee_agreed integer,
  status text DEFAULT 'pitched' CHECK (status IN ('pitched', 'in_review', 'passed', 'licensed', 'expired')),
  notes text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE pitches ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Labels can view own pitches"
  ON pitches FOR SELECT
  TO authenticated
  USING (label_id = auth.uid());

CREATE POLICY "Labels can insert pitches"
  ON pitches FOR INSERT
  TO authenticated
  WITH CHECK (label_id = auth.uid());

CREATE POLICY "Labels can update own pitches"
  ON pitches FOR UPDATE
  TO authenticated
  USING (label_id = auth.uid())
  WITH CHECK (label_id = auth.uid());

CREATE POLICY "Labels can delete own pitches"
  ON pitches FOR DELETE
  TO authenticated
  USING (label_id = auth.uid());
