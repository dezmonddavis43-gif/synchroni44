export interface Profile {
  id: string
  email: string
  full_name: string
  role: 'supervisor' | 'artist' | 'label' | 'admin'
  company?: string
  avatar_url?: string
  location?: string
  website?: string
  pro_affiliation?: string
  publisher?: string
  project_types?: string[]
  genre_specialties?: string[]
  onboarding_complete?: boolean
  plan?: string
  artist_name?: string
  label_name?: string
  label_type?: string
  roster_size?: string
  social_links?: Record<string, string>
  created_at: string
}

export interface Track {
  id: string
  title: string
  artist: string
  primary_artist?: string
  featured_artists?: string[]
  writers?: string[]
  producers?: string[]
  mood?: string
  genre?: string
  sub_genre?: string
  bpm?: number
  key?: string
  musical_key?: string
  audio_url?: string
  cover_art_url?: string
  artwork_url?: string
  artwork_color?: string
  preview_url?: string
  instrumental_url?: string
  acapella_url?: string
  stems_urls?: string[]
  clearance_status?: 'CLEAR' | 'PRO' | 'PENDING'
  status?: 'active' | 'review' | 'rejected' | 'draft'
  /** @deprecated Prefer duration_ms; kept for older rows (seconds). */
  duration?: number
  /** Audio length in ms (set on upload via Web Audio decode). */
  duration_ms?: number
  lyrics?: string
  themes?: string[]
  tags?: string[]
  instrumental?: boolean
  vocal?: boolean
  explicit?: boolean
  clean_version?: boolean
  ownership_notes?: string
  /** Track notes (preferred). Legacy rows may only have ownership_notes. */
  notes?: string
  master_split?: number
  publishing_split?: number
  uploaded_by: string
  label_id?: string
  one_stop_fee?: number
  one_stop?: boolean
  easy_clear?: boolean
  micro_fee_min?: number
  micro_fee_max?: number
  pro_affiliation?: string
  publisher?: string
  publisher_info?: string
  co_writers?: CoWriter[]
  lyrics_themes?: string
  vocal_type?: 'instrumental' | 'vocal'
  ownership_splits?: Array<{ name: string; split: number }>
  publishing_info?: string
  pro_info?: string
  play_count?: number
  save_count?: number
  license_count?: number
  created_at: string
  updated_at?: string
}

export interface CoWriter {
  name: string
  split: number
}

export interface Project {
  id: string
  name: string
  client?: string
  status: 'active' | 'completed' | 'on_hold' | 'cancelled'
  deadline?: string
  budget?: number
  supervisor_id: string
  created_at: string
}

export interface Playlist {
  id: string
  name: string
  project_id?: string
  folder_name?: string
  scene_name?: string
  owner_id: string
  is_public: boolean
  share_token?: string
  created_at: string
}

export interface PlaylistTrack {
  id: string
  playlist_id: string
  track_id: string
  position: number
  notes?: string
  track?: Track
}

export interface Brief {
  id: string
  title: string
  description?: string
  client_name?: string
  project_name?: string
  scene_type?: string
  sonic_direction?: string
  scene_description?: string
  client?: string
  mood?: string
  moods?: string[]
  genre?: string
  genres?: string[]
  media_type?: string
  bpm_min?: number
  bpm_max?: number
  budget?: number
  budget_min?: number
  budget_max?: number
  vocal_preference?: 'instrumental' | 'vocal_ok' | 'vocal_preferred'
  reference_tracks?: string
  reference_artists?: string
  reference_links?: string[]
  usage_terms?: string
  rights_needed?: string
  territory?: string
  term_length?: string
  usage_type?: string
  exclusivity?: boolean
  exclusivity_required?: boolean
  priority?: 'standard' | 'urgent' | 'rush'
  internal_notes?: string
  deadline?: string
  is_private: boolean
  supervisor_id: string
  created_by?: string
  status: 'draft' | 'open' | 'published' | 'closed' | 'archived'
  sent_at?: string
  published_at?: string
  created_at: string
  updated_at?: string
  supervisor?: Profile
  buckets?: BriefBucket[]
}

export interface BriefBucket {
  id: string
  brief_id: string
  label: string
  min_amount?: number
  max_amount?: number
  position: number
  created_at: string
}

export interface BriefContact {
  id: string
  supervisor_id: string
  name: string
  company?: string
  email: string
  contact_type: 'label' | 'publisher' | 'artist' | 'other'
  notes?: string
  created_at: string
}

export interface BriefSend {
  id: string
  brief_id: string
  recipient_id?: string
  contact_id?: string
  recipient_email?: string
  recipient_name?: string
  recipient_company?: string
  sent_at: string
  opened: boolean
  opened_at?: string
  submitted: boolean
  submitted_at?: string
  brief?: Brief
  recipient?: Profile
}

export interface BriefResponse {
  id: string
  brief_id: string
  send_id?: string
  responder_id: string
  message?: string
  status: 'draft' | 'submitted'
  created_at: string
  submitted_at?: string
  responder?: Profile
  tracks?: BriefResponseTrack[]
}

export interface BriefResponseTrack {
  id: string
  response_id: string
  track_id: string
  bucket_id?: string
  quote_amount?: number
  notes?: string
  position: number
  created_at: string
  track?: Track
  bucket?: BriefBucket
}

export interface BriefRecipient {
  id: string
  brief_id: string
  artist_id: string
}

export interface InboxSubmission {
  id: string
  track_id: string
  artist_id: string
  supervisor_id: string
  message?: string
  status: 'pending' | 'accepted' | 'passed'
  brief_id?: string
  created_at: string
  track?: Track
  artist?: Profile
  brief?: Brief
  supervisor?: Profile
}

export interface LicenseRequest {
  id: string
  track_id: string
  project_id?: string
  supervisor_id: string
  license_type: 'one_stop' | 'quote'
  usage_type?: string
  territory?: string
  term?: string
  fee_offered?: number
  fee_agreed?: number
  status: 'pending' | 'in_review' | 'negotiating' | 'approved' | 'rejected'
  notes?: string
  budget?: string
  created_at: string
  track?: Track
  project?: Project
}

export interface HitListMember {
  id: string
  supervisor_id: string
  artist_id: string
  created_at: string
  artist?: Profile
}

export interface SavedTrack {
  id: string
  user_id: string
  track_id: string
  created_at: string
  track?: Track
}

export interface Message {
  id: string
  sender_id: string
  recipient_id: string
  content: string
  read: boolean
  created_at: string
  sender?: Profile
  recipient?: Profile
}

export interface Conversation {
  user: Profile
  lastMessage?: Message
  unreadCount: number
}

export interface TrackAnalytics {
  id: string
  track_id: string
  event_type: 'play' | 'save' | 'view'
  user_id?: string
  created_at: string
}

export interface LabelRosterMember {
  id: string
  label_id: string
  artist_id: string
  created_at: string
  artist?: Profile
}

export interface Pitch {
  id: string
  track_id: string
  label_id?: string
  submitted_by?: string
  supervisor_name?: string
  project_name?: string
  fee_offered?: number
  fee_agreed?: number
  status: 'pitched' | 'in_review' | 'passed' | 'licensed' | 'expired'
  notes?: string
  created_at: string
  track?: Track
}

export interface MicroLicense {
  id: string
  track_id: string
  buyer_id: string
  license_type: 'ugc' | 'small_brand' | 'digital_ads'
  amount: number
  platform_fee: number
  artist_payout: number
  status: 'completed' | 'pending' | 'refunded'
  created_at: string
  track?: Track
}


export interface BriefSubmission {
  id: string
  brief_id: string
  track_id: string
  artist_id: string
  status: 'submitted' | 'shortlisted' | 'in_review' | 'selected' | 'licensed' | 'rejected'
  notes?: string
  created_at: string
  updated_at?: string
  brief?: Brief
  track?: Track
  artist?: Profile
}

export interface StudioEntry {
  id: string
  created_by: string
  title: string
  description?: string
  thumbnail_url?: string
  video_mode?: 'upload' | 'url'
  video_url?: string
  video_file_path?: string
  video_file_name?: string
  video_file_size?: number
  video_mime_type?: string
  audio_file_path?: string
  audio_url?: string
  audio_file_name?: string
  audio_file_size?: number
  audio_mime_type?: string
  status: 'draft' | 'published'
  tags?: string[]
  created_at: string
  updated_at?: string
  published_at?: string
  creator?: Profile
  attached_tracks?: StudioEntryTrack[]
}

export interface StudioEntryTrack {
  id: string
  studio_entry_id: string
  track_id: string
  position: number
  created_at: string
  track?: Track
}
