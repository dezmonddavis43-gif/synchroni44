/*
  # Add Foreign Key Indexes for Query Performance

  1. Summary
    This migration adds indexes on foreign key columns that were missing indexes,
    which improves JOIN and DELETE performance significantly.

  2. Tables Affected
    - brief_buckets (brief_id)
    - brief_contacts (supervisor_id)
    - brief_recipients (artist_id)
    - brief_response_tracks (bucket_id, response_id, track_id)
    - brief_responses (brief_id, responder_id, send_id)
    - brief_sends (brief_id, contact_id, recipient_id)
    - brief_submissions (track_id)
    - briefs (created_by)
    - hit_list_members (artist_id)
    - inbox_submissions (artist_id, brief_id, supervisor_id, track_id)
    - label_roster_members (artist_id)
    - license_requests (project_id, supervisor_id, track_id)
    - messages (recipient_id, sender_id)
    - micro_licenses (buyer_id, track_id)
    - pitches (label_id, track_id)
    - playlist_tracks (added_by, playlist_id, track_id)
    - playlists (owner_id, project_id)
    - projects (supervisor_id)
    - saved_tracks (track_id)
    - track_analytics (track_id, user_id)
    - tracks (label_id, uploaded_by)

  3. Security
    - No security changes, indexes only
*/

-- brief_buckets
CREATE INDEX IF NOT EXISTS idx_brief_buckets_brief_id ON public.brief_buckets(brief_id);

-- brief_contacts
CREATE INDEX IF NOT EXISTS idx_brief_contacts_supervisor_id ON public.brief_contacts(supervisor_id);

-- brief_recipients
CREATE INDEX IF NOT EXISTS idx_brief_recipients_artist_id ON public.brief_recipients(artist_id);

-- brief_response_tracks
CREATE INDEX IF NOT EXISTS idx_brief_response_tracks_bucket_id ON public.brief_response_tracks(bucket_id);
CREATE INDEX IF NOT EXISTS idx_brief_response_tracks_response_id ON public.brief_response_tracks(response_id);
CREATE INDEX IF NOT EXISTS idx_brief_response_tracks_track_id ON public.brief_response_tracks(track_id);

-- brief_responses
CREATE INDEX IF NOT EXISTS idx_brief_responses_brief_id ON public.brief_responses(brief_id);
CREATE INDEX IF NOT EXISTS idx_brief_responses_responder_id ON public.brief_responses(responder_id);
CREATE INDEX IF NOT EXISTS idx_brief_responses_send_id ON public.brief_responses(send_id);

-- brief_sends
CREATE INDEX IF NOT EXISTS idx_brief_sends_brief_id ON public.brief_sends(brief_id);
CREATE INDEX IF NOT EXISTS idx_brief_sends_contact_id ON public.brief_sends(contact_id);
CREATE INDEX IF NOT EXISTS idx_brief_sends_recipient_id ON public.brief_sends(recipient_id);

-- brief_submissions (track_id only - other indexes exist)
CREATE INDEX IF NOT EXISTS idx_brief_submissions_track_id ON public.brief_submissions(track_id);

-- briefs
CREATE INDEX IF NOT EXISTS idx_briefs_created_by ON public.briefs(created_by);

-- hit_list_members
CREATE INDEX IF NOT EXISTS idx_hit_list_members_artist_id ON public.hit_list_members(artist_id);

-- inbox_submissions
CREATE INDEX IF NOT EXISTS idx_inbox_submissions_artist_id ON public.inbox_submissions(artist_id);
CREATE INDEX IF NOT EXISTS idx_inbox_submissions_brief_id ON public.inbox_submissions(brief_id);
CREATE INDEX IF NOT EXISTS idx_inbox_submissions_supervisor_id ON public.inbox_submissions(supervisor_id);
CREATE INDEX IF NOT EXISTS idx_inbox_submissions_track_id ON public.inbox_submissions(track_id);

-- label_roster_members
CREATE INDEX IF NOT EXISTS idx_label_roster_members_artist_id ON public.label_roster_members(artist_id);

-- license_requests
CREATE INDEX IF NOT EXISTS idx_license_requests_project_id ON public.license_requests(project_id);
CREATE INDEX IF NOT EXISTS idx_license_requests_supervisor_id ON public.license_requests(supervisor_id);
CREATE INDEX IF NOT EXISTS idx_license_requests_track_id ON public.license_requests(track_id);

-- messages
CREATE INDEX IF NOT EXISTS idx_messages_recipient_id ON public.messages(recipient_id);
CREATE INDEX IF NOT EXISTS idx_messages_sender_id ON public.messages(sender_id);

-- micro_licenses
CREATE INDEX IF NOT EXISTS idx_micro_licenses_buyer_id ON public.micro_licenses(buyer_id);
CREATE INDEX IF NOT EXISTS idx_micro_licenses_track_id ON public.micro_licenses(track_id);

-- pitches
CREATE INDEX IF NOT EXISTS idx_pitches_label_id ON public.pitches(label_id);
CREATE INDEX IF NOT EXISTS idx_pitches_track_id ON public.pitches(track_id);

-- playlist_tracks
CREATE INDEX IF NOT EXISTS idx_playlist_tracks_added_by ON public.playlist_tracks(added_by);
CREATE INDEX IF NOT EXISTS idx_playlist_tracks_playlist_id ON public.playlist_tracks(playlist_id);
CREATE INDEX IF NOT EXISTS idx_playlist_tracks_track_id ON public.playlist_tracks(track_id);

-- playlists
CREATE INDEX IF NOT EXISTS idx_playlists_owner_id ON public.playlists(owner_id);
CREATE INDEX IF NOT EXISTS idx_playlists_project_id ON public.playlists(project_id);

-- projects
CREATE INDEX IF NOT EXISTS idx_projects_supervisor_id ON public.projects(supervisor_id);

-- saved_tracks
CREATE INDEX IF NOT EXISTS idx_saved_tracks_track_id ON public.saved_tracks(track_id);

-- track_analytics
CREATE INDEX IF NOT EXISTS idx_track_analytics_track_id ON public.track_analytics(track_id);
CREATE INDEX IF NOT EXISTS idx_track_analytics_user_id ON public.track_analytics(user_id);

-- tracks
CREATE INDEX IF NOT EXISTS idx_tracks_label_id ON public.tracks(label_id);
CREATE INDEX IF NOT EXISTS idx_tracks_uploaded_by ON public.tracks(uploaded_by);