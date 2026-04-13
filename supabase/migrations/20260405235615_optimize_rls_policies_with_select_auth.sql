/*
  # Optimize RLS Policies with (select auth.uid())

  1. Summary
    This migration recreates RLS policies to use (select auth.uid()) instead of auth.uid()
    directly. This optimization prevents re-evaluation of the auth function for each row,
    significantly improving query performance at scale.

  2. Tables Affected
    - profiles
    - tracks
    - projects
    - playlists
    - playlist_tracks
    - briefs
    - brief_recipients
    - inbox_submissions
    - license_requests
    - brief_contacts
    - hit_list_members
    - saved_tracks
    - messages
    - track_analytics
    - label_roster_members
    - pitches
    - micro_licenses
    - brief_buckets
    - brief_sends
    - brief_responses
    - brief_response_tracks
    - brief_submissions

  3. Security
    - All policies maintain the same security logic
    - Only optimization change: auth.uid() -> (select auth.uid())
*/

-- ============================================
-- PROFILES
-- ============================================
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;

CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE
  TO authenticated
  USING ((select auth.uid()) = id)
  WITH CHECK ((select auth.uid()) = id);

CREATE POLICY "Users can insert own profile"
  ON public.profiles FOR INSERT
  TO authenticated
  WITH CHECK ((select auth.uid()) = id);

-- ============================================
-- TRACKS
-- ============================================
DROP POLICY IF EXISTS "Users can view active tracks" ON public.tracks;
DROP POLICY IF EXISTS "Users can insert own tracks" ON public.tracks;
DROP POLICY IF EXISTS "Users can update own tracks" ON public.tracks;
DROP POLICY IF EXISTS "Admins can update any track" ON public.tracks;

CREATE POLICY "Users can view active tracks"
  ON public.tracks FOR SELECT
  TO authenticated
  USING (
    status = 'active' OR 
    uploaded_by = (select auth.uid()) OR 
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE profiles.id = (select auth.uid()) AND profiles.role = 'admin'
    )
  );

CREATE POLICY "Users can insert own tracks"
  ON public.tracks FOR INSERT
  TO authenticated
  WITH CHECK (uploaded_by = (select auth.uid()));

CREATE POLICY "Users can update own tracks"
  ON public.tracks FOR UPDATE
  TO authenticated
  USING (uploaded_by = (select auth.uid()))
  WITH CHECK (uploaded_by = (select auth.uid()));

CREATE POLICY "Admins can update any track"
  ON public.tracks FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE profiles.id = (select auth.uid()) AND profiles.role = 'admin'
    )
  );

-- ============================================
-- PROJECTS
-- ============================================
DROP POLICY IF EXISTS "Users can view own projects" ON public.projects;
DROP POLICY IF EXISTS "Users can insert own projects" ON public.projects;
DROP POLICY IF EXISTS "Users can update own projects" ON public.projects;
DROP POLICY IF EXISTS "Users can delete own projects" ON public.projects;

CREATE POLICY "Users can view own projects"
  ON public.projects FOR SELECT
  TO authenticated
  USING (supervisor_id = (select auth.uid()));

CREATE POLICY "Users can insert own projects"
  ON public.projects FOR INSERT
  TO authenticated
  WITH CHECK (supervisor_id = (select auth.uid()));

CREATE POLICY "Users can update own projects"
  ON public.projects FOR UPDATE
  TO authenticated
  USING (supervisor_id = (select auth.uid()))
  WITH CHECK (supervisor_id = (select auth.uid()));

CREATE POLICY "Users can delete own projects"
  ON public.projects FOR DELETE
  TO authenticated
  USING (supervisor_id = (select auth.uid()));

-- ============================================
-- PLAYLISTS
-- ============================================
DROP POLICY IF EXISTS "Users can view own playlists" ON public.playlists;
DROP POLICY IF EXISTS "Users can insert own playlists" ON public.playlists;
DROP POLICY IF EXISTS "Users can update own playlists" ON public.playlists;
DROP POLICY IF EXISTS "Users can delete own playlists" ON public.playlists;

CREATE POLICY "Users can view own playlists"
  ON public.playlists FOR SELECT
  TO authenticated
  USING (owner_id = (select auth.uid()) OR is_public = true);

CREATE POLICY "Users can insert own playlists"
  ON public.playlists FOR INSERT
  TO authenticated
  WITH CHECK (owner_id = (select auth.uid()));

CREATE POLICY "Users can update own playlists"
  ON public.playlists FOR UPDATE
  TO authenticated
  USING (owner_id = (select auth.uid()))
  WITH CHECK (owner_id = (select auth.uid()));

CREATE POLICY "Users can delete own playlists"
  ON public.playlists FOR DELETE
  TO authenticated
  USING (owner_id = (select auth.uid()));

-- ============================================
-- PLAYLIST_TRACKS
-- ============================================
DROP POLICY IF EXISTS "Users can view playlist tracks for own playlists" ON public.playlist_tracks;
DROP POLICY IF EXISTS "Users can insert tracks to own playlists" ON public.playlist_tracks;
DROP POLICY IF EXISTS "Users can update tracks in own playlists" ON public.playlist_tracks;
DROP POLICY IF EXISTS "Users can delete tracks from own playlists" ON public.playlist_tracks;

CREATE POLICY "Users can view playlist tracks for own playlists"
  ON public.playlist_tracks FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.playlists 
      WHERE playlists.id = playlist_tracks.playlist_id 
      AND (playlists.owner_id = (select auth.uid()) OR playlists.is_public = true)
    )
  );

CREATE POLICY "Users can insert tracks to own playlists"
  ON public.playlist_tracks FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.playlists 
      WHERE playlists.id = playlist_tracks.playlist_id 
      AND playlists.owner_id = (select auth.uid())
    )
  );

CREATE POLICY "Users can update tracks in own playlists"
  ON public.playlist_tracks FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.playlists 
      WHERE playlists.id = playlist_tracks.playlist_id 
      AND playlists.owner_id = (select auth.uid())
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.playlists 
      WHERE playlists.id = playlist_tracks.playlist_id 
      AND playlists.owner_id = (select auth.uid())
    )
  );

CREATE POLICY "Users can delete tracks from own playlists"
  ON public.playlist_tracks FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.playlists 
      WHERE playlists.id = playlist_tracks.playlist_id 
      AND playlists.owner_id = (select auth.uid())
    )
  );

-- ============================================
-- BRIEFS
-- ============================================
DROP POLICY IF EXISTS "Users can view public briefs or own briefs or recipient briefs" ON public.briefs;
DROP POLICY IF EXISTS "Users can insert own briefs" ON public.briefs;
DROP POLICY IF EXISTS "Users can update own briefs" ON public.briefs;
DROP POLICY IF EXISTS "Users can delete own briefs" ON public.briefs;

CREATE POLICY "Users can view public briefs or own briefs or recipient briefs"
  ON public.briefs FOR SELECT
  TO authenticated
  USING (
    status = 'published' OR
    created_by = (select auth.uid()) OR
    EXISTS (
      SELECT 1 FROM public.brief_recipients 
      WHERE brief_recipients.brief_id = briefs.id 
      AND brief_recipients.artist_id = (select auth.uid())
    )
  );

CREATE POLICY "Users can insert own briefs"
  ON public.briefs FOR INSERT
  TO authenticated
  WITH CHECK (created_by = (select auth.uid()));

CREATE POLICY "Users can update own briefs"
  ON public.briefs FOR UPDATE
  TO authenticated
  USING (created_by = (select auth.uid()))
  WITH CHECK (created_by = (select auth.uid()));

CREATE POLICY "Users can delete own briefs"
  ON public.briefs FOR DELETE
  TO authenticated
  USING (created_by = (select auth.uid()));

-- ============================================
-- BRIEF_RECIPIENTS
-- ============================================
DROP POLICY IF EXISTS "Supervisors can view own brief recipients" ON public.brief_recipients;
DROP POLICY IF EXISTS "Supervisors can insert brief recipients" ON public.brief_recipients;
DROP POLICY IF EXISTS "Supervisors can delete brief recipients" ON public.brief_recipients;

CREATE POLICY "Supervisors can view own brief recipients"
  ON public.brief_recipients FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.briefs 
      WHERE briefs.id = brief_recipients.brief_id 
      AND briefs.created_by = (select auth.uid())
    ) OR artist_id = (select auth.uid())
  );

CREATE POLICY "Supervisors can insert brief recipients"
  ON public.brief_recipients FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.briefs 
      WHERE briefs.id = brief_recipients.brief_id 
      AND briefs.created_by = (select auth.uid())
    )
  );

CREATE POLICY "Supervisors can delete brief recipients"
  ON public.brief_recipients FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.briefs 
      WHERE briefs.id = brief_recipients.brief_id 
      AND briefs.created_by = (select auth.uid())
    )
  );

-- ============================================
-- INBOX_SUBMISSIONS
-- ============================================
DROP POLICY IF EXISTS "Users can view own submissions" ON public.inbox_submissions;
DROP POLICY IF EXISTS "Artists can insert submissions" ON public.inbox_submissions;
DROP POLICY IF EXISTS "Supervisors can update submissions" ON public.inbox_submissions;

CREATE POLICY "Users can view own submissions"
  ON public.inbox_submissions FOR SELECT
  TO authenticated
  USING (artist_id = (select auth.uid()) OR supervisor_id = (select auth.uid()));

CREATE POLICY "Artists can insert submissions"
  ON public.inbox_submissions FOR INSERT
  TO authenticated
  WITH CHECK (artist_id = (select auth.uid()));

CREATE POLICY "Supervisors can update submissions"
  ON public.inbox_submissions FOR UPDATE
  TO authenticated
  USING (supervisor_id = (select auth.uid()));

-- ============================================
-- LICENSE_REQUESTS
-- ============================================
DROP POLICY IF EXISTS "Users can view own license requests" ON public.license_requests;
DROP POLICY IF EXISTS "Users can insert license requests" ON public.license_requests;
DROP POLICY IF EXISTS "Users can update own license requests" ON public.license_requests;

CREATE POLICY "Users can view own license requests"
  ON public.license_requests FOR SELECT
  TO authenticated
  USING (supervisor_id = (select auth.uid()));

CREATE POLICY "Users can insert license requests"
  ON public.license_requests FOR INSERT
  TO authenticated
  WITH CHECK (supervisor_id = (select auth.uid()));

CREATE POLICY "Users can update own license requests"
  ON public.license_requests FOR UPDATE
  TO authenticated
  USING (supervisor_id = (select auth.uid()))
  WITH CHECK (supervisor_id = (select auth.uid()));

-- ============================================
-- BRIEF_CONTACTS
-- ============================================
DROP POLICY IF EXISTS "Users can manage their own contacts" ON public.brief_contacts;
DROP POLICY IF EXISTS "Users can view their own contacts" ON public.brief_contacts;

CREATE POLICY "Users can view their own contacts"
  ON public.brief_contacts FOR SELECT
  TO authenticated
  USING (supervisor_id = (select auth.uid()));

CREATE POLICY "Users can manage their own contacts"
  ON public.brief_contacts FOR ALL
  TO authenticated
  USING (supervisor_id = (select auth.uid()))
  WITH CHECK (supervisor_id = (select auth.uid()));

-- ============================================
-- HIT_LIST_MEMBERS
-- ============================================
DROP POLICY IF EXISTS "Users can view own hit list" ON public.hit_list_members;
DROP POLICY IF EXISTS "Supervisors can insert to hit list" ON public.hit_list_members;
DROP POLICY IF EXISTS "Supervisors can delete from hit list" ON public.hit_list_members;

CREATE POLICY "Users can view own hit list"
  ON public.hit_list_members FOR SELECT
  TO authenticated
  USING (supervisor_id = (select auth.uid()));

CREATE POLICY "Supervisors can insert to hit list"
  ON public.hit_list_members FOR INSERT
  TO authenticated
  WITH CHECK (supervisor_id = (select auth.uid()));

CREATE POLICY "Supervisors can delete from hit list"
  ON public.hit_list_members FOR DELETE
  TO authenticated
  USING (supervisor_id = (select auth.uid()));

-- ============================================
-- SAVED_TRACKS
-- ============================================
DROP POLICY IF EXISTS "Users can view own saved tracks" ON public.saved_tracks;
DROP POLICY IF EXISTS "Users can insert own saved tracks" ON public.saved_tracks;
DROP POLICY IF EXISTS "Users can delete own saved tracks" ON public.saved_tracks;

CREATE POLICY "Users can view own saved tracks"
  ON public.saved_tracks FOR SELECT
  TO authenticated
  USING (user_id = (select auth.uid()));

CREATE POLICY "Users can insert own saved tracks"
  ON public.saved_tracks FOR INSERT
  TO authenticated
  WITH CHECK (user_id = (select auth.uid()));

CREATE POLICY "Users can delete own saved tracks"
  ON public.saved_tracks FOR DELETE
  TO authenticated
  USING (user_id = (select auth.uid()));

-- ============================================
-- MESSAGES
-- ============================================
DROP POLICY IF EXISTS "Users can view own messages" ON public.messages;
DROP POLICY IF EXISTS "Users can insert messages" ON public.messages;
DROP POLICY IF EXISTS "Users can update received messages" ON public.messages;

CREATE POLICY "Users can view own messages"
  ON public.messages FOR SELECT
  TO authenticated
  USING (sender_id = (select auth.uid()) OR recipient_id = (select auth.uid()));

CREATE POLICY "Users can insert messages"
  ON public.messages FOR INSERT
  TO authenticated
  WITH CHECK (sender_id = (select auth.uid()));

CREATE POLICY "Users can update received messages"
  ON public.messages FOR UPDATE
  TO authenticated
  USING (recipient_id = (select auth.uid()));

-- ============================================
-- TRACK_ANALYTICS
-- ============================================
DROP POLICY IF EXISTS "Users can view analytics for own tracks" ON public.track_analytics;
DROP POLICY IF EXISTS "Authenticated users can insert analytics" ON public.track_analytics;

CREATE POLICY "Users can view analytics for own tracks"
  ON public.track_analytics FOR SELECT
  TO authenticated
  USING (
    user_id = (select auth.uid()) OR
    EXISTS (
      SELECT 1 FROM public.tracks 
      WHERE tracks.id = track_analytics.track_id 
      AND tracks.uploaded_by = (select auth.uid())
    )
  );

CREATE POLICY "Authenticated users can insert analytics"
  ON public.track_analytics FOR INSERT
  TO authenticated
  WITH CHECK (user_id = (select auth.uid()));

-- ============================================
-- LABEL_ROSTER_MEMBERS
-- ============================================
DROP POLICY IF EXISTS "Labels can view own roster" ON public.label_roster_members;
DROP POLICY IF EXISTS "Labels can insert to roster" ON public.label_roster_members;
DROP POLICY IF EXISTS "Labels can delete from roster" ON public.label_roster_members;

CREATE POLICY "Labels can view own roster"
  ON public.label_roster_members FOR SELECT
  TO authenticated
  USING (label_id = (select auth.uid()) OR artist_id = (select auth.uid()));

CREATE POLICY "Labels can insert to roster"
  ON public.label_roster_members FOR INSERT
  TO authenticated
  WITH CHECK (label_id = (select auth.uid()));

CREATE POLICY "Labels can delete from roster"
  ON public.label_roster_members FOR DELETE
  TO authenticated
  USING (label_id = (select auth.uid()));

-- ============================================
-- PITCHES
-- ============================================
DROP POLICY IF EXISTS "Labels can view own pitches" ON public.pitches;
DROP POLICY IF EXISTS "Labels can insert pitches" ON public.pitches;
DROP POLICY IF EXISTS "Labels can update own pitches" ON public.pitches;
DROP POLICY IF EXISTS "Labels can delete own pitches" ON public.pitches;

CREATE POLICY "Labels can view own pitches"
  ON public.pitches FOR SELECT
  TO authenticated
  USING (label_id = (select auth.uid()));

CREATE POLICY "Labels can insert pitches"
  ON public.pitches FOR INSERT
  TO authenticated
  WITH CHECK (label_id = (select auth.uid()));

CREATE POLICY "Labels can update own pitches"
  ON public.pitches FOR UPDATE
  TO authenticated
  USING (label_id = (select auth.uid()))
  WITH CHECK (label_id = (select auth.uid()));

CREATE POLICY "Labels can delete own pitches"
  ON public.pitches FOR DELETE
  TO authenticated
  USING (label_id = (select auth.uid()));

-- ============================================
-- MICRO_LICENSES
-- ============================================
DROP POLICY IF EXISTS "Artists can view their micro licenses" ON public.micro_licenses;
DROP POLICY IF EXISTS "Buyers can view their purchases" ON public.micro_licenses;
DROP POLICY IF EXISTS "Authenticated users can create micro licenses" ON public.micro_licenses;

CREATE POLICY "Artists can view their micro licenses"
  ON public.micro_licenses FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.tracks 
      WHERE tracks.id = micro_licenses.track_id 
      AND tracks.uploaded_by = (select auth.uid())
    )
  );

CREATE POLICY "Buyers can view their purchases"
  ON public.micro_licenses FOR SELECT
  TO authenticated
  USING (buyer_id = (select auth.uid()));

CREATE POLICY "Authenticated users can create micro licenses"
  ON public.micro_licenses FOR INSERT
  TO authenticated
  WITH CHECK (buyer_id = (select auth.uid()));

-- ============================================
-- BRIEF_BUCKETS
-- ============================================
DROP POLICY IF EXISTS "Users can view buckets for briefs they created" ON public.brief_buckets;
DROP POLICY IF EXISTS "Users can view buckets for briefs sent to them" ON public.brief_buckets;
DROP POLICY IF EXISTS "Users can manage buckets for their briefs" ON public.brief_buckets;

CREATE POLICY "Users can view buckets for briefs they created"
  ON public.brief_buckets FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.briefs 
      WHERE briefs.id = brief_buckets.brief_id 
      AND briefs.created_by = (select auth.uid())
    )
  );

CREATE POLICY "Users can view buckets for briefs sent to them"
  ON public.brief_buckets FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.brief_sends bs
      JOIN public.brief_contacts bc ON bc.id = bs.contact_id
      WHERE bs.brief_id = brief_buckets.brief_id 
      AND bc.supervisor_id = (select auth.uid())
    )
  );

CREATE POLICY "Users can manage buckets for their briefs"
  ON public.brief_buckets FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.briefs 
      WHERE briefs.id = brief_buckets.brief_id 
      AND briefs.created_by = (select auth.uid())
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.briefs 
      WHERE briefs.id = brief_buckets.brief_id 
      AND briefs.created_by = (select auth.uid())
    )
  );

-- ============================================
-- BRIEF_SENDS
-- ============================================
DROP POLICY IF EXISTS "Users can view sends for their briefs" ON public.brief_sends;
DROP POLICY IF EXISTS "Users can view briefs sent to them" ON public.brief_sends;
DROP POLICY IF EXISTS "Users can manage sends for their briefs" ON public.brief_sends;
DROP POLICY IF EXISTS "Recipients can update their send records" ON public.brief_sends;

CREATE POLICY "Users can view sends for their briefs"
  ON public.brief_sends FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.briefs 
      WHERE briefs.id = brief_sends.brief_id 
      AND briefs.created_by = (select auth.uid())
    )
  );

CREATE POLICY "Users can view briefs sent to them"
  ON public.brief_sends FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.brief_contacts bc
      WHERE bc.id = brief_sends.contact_id 
      AND bc.supervisor_id = (select auth.uid())
    )
  );

CREATE POLICY "Users can manage sends for their briefs"
  ON public.brief_sends FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.briefs 
      WHERE briefs.id = brief_sends.brief_id 
      AND briefs.created_by = (select auth.uid())
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.briefs 
      WHERE briefs.id = brief_sends.brief_id 
      AND briefs.created_by = (select auth.uid())
    )
  );

CREATE POLICY "Recipients can update their send records"
  ON public.brief_sends FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.brief_contacts bc
      WHERE bc.id = brief_sends.contact_id 
      AND bc.supervisor_id = (select auth.uid())
    )
  );

-- ============================================
-- BRIEF_RESPONSES
-- ============================================
DROP POLICY IF EXISTS "Users can view responses for their briefs" ON public.brief_responses;
DROP POLICY IF EXISTS "Users can manage their own responses" ON public.brief_responses;

CREATE POLICY "Users can view responses for their briefs"
  ON public.brief_responses FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.briefs 
      WHERE briefs.id = brief_responses.brief_id 
      AND briefs.created_by = (select auth.uid())
    )
  );

CREATE POLICY "Users can manage their own responses"
  ON public.brief_responses FOR ALL
  TO authenticated
  USING (responder_id = (select auth.uid()))
  WITH CHECK (responder_id = (select auth.uid()));

-- ============================================
-- BRIEF_RESPONSE_TRACKS
-- ============================================
DROP POLICY IF EXISTS "Users can view response tracks for their briefs" ON public.brief_response_tracks;
DROP POLICY IF EXISTS "Users can manage tracks for their responses" ON public.brief_response_tracks;

CREATE POLICY "Users can view response tracks for their briefs"
  ON public.brief_response_tracks FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.brief_responses br
      JOIN public.briefs b ON b.id = br.brief_id
      WHERE br.id = brief_response_tracks.response_id 
      AND b.created_by = (select auth.uid())
    )
  );

CREATE POLICY "Users can manage tracks for their responses"
  ON public.brief_response_tracks FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.brief_responses br
      WHERE br.id = brief_response_tracks.response_id 
      AND br.responder_id = (select auth.uid())
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.brief_responses br
      WHERE br.id = brief_response_tracks.response_id 
      AND br.responder_id = (select auth.uid())
    )
  );

-- ============================================
-- BRIEF_SUBMISSIONS
-- ============================================
DROP POLICY IF EXISTS "Artists can view own brief submissions" ON public.brief_submissions;
DROP POLICY IF EXISTS "Brief owners can view brief submissions" ON public.brief_submissions;
DROP POLICY IF EXISTS "Artists can create brief submissions" ON public.brief_submissions;
DROP POLICY IF EXISTS "Brief owners can update brief submissions" ON public.brief_submissions;
DROP POLICY IF EXISTS "Artists can delete own draft submissions" ON public.brief_submissions;

CREATE POLICY "Artists can view own brief submissions"
  ON public.brief_submissions FOR SELECT
  TO authenticated
  USING (artist_id = (select auth.uid()));

CREATE POLICY "Brief owners can view brief submissions"
  ON public.brief_submissions FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.briefs 
      WHERE briefs.id = brief_submissions.brief_id 
      AND briefs.created_by = (select auth.uid())
    )
  );

CREATE POLICY "Artists can create brief submissions"
  ON public.brief_submissions FOR INSERT
  TO authenticated
  WITH CHECK (artist_id = (select auth.uid()));

CREATE POLICY "Brief owners can update brief submissions"
  ON public.brief_submissions FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.briefs 
      WHERE briefs.id = brief_submissions.brief_id 
      AND briefs.created_by = (select auth.uid())
    )
  );

CREATE POLICY "Artists can delete own draft submissions"
  ON public.brief_submissions FOR DELETE
  TO authenticated
  USING (artist_id = (select auth.uid()) AND status = 'draft');