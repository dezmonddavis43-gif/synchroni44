export const MOOD_COLORS: Record<string, string> = {
  Tense: '#FF4D4D',
  Hopeful: '#FFD700',
  Melancholic: '#7B9CFF',
  Sensual: '#FF6B9D',
  Aggressive: '#FF7A00',
  Peaceful: '#4DFFB4',
  Suspenseful: '#B44DFF',
  Nostalgic: '#FF9B4D'
}

export const MOODS = ['All', 'Tense', 'Hopeful', 'Melancholic', 'Sensual', 'Aggressive', 'Peaceful', 'Suspenseful', 'Nostalgic']

export const GENRES = ['All', 'Electronic', 'Indie Pop', 'Alt Rock', 'R&B', 'Hip-Hop', 'Ambient', 'Cinematic', 'Dream Pop', 'Jazz', 'Classical', 'Folk', 'Pop']

export const CLEARANCE_CONFIG: Record<string, { label: string; color: string }> = {
  CLEAR: { label: 'Cleared', color: '#4DFFB4' },
  PRO: { label: 'PRO Required', color: '#FFD700' },
  PENDING: { label: 'Pending', color: '#FF9B4D' }
}

export const ROLE_COLORS: Record<string, string> = {
  supervisor: '#C8A97E',
  artist: '#7B9CFF',
  label: '#4DFFB4',
  admin: '#FF6B9D'
}

export const PROJECT_STATUSES = ['Briefed', 'Search Sent', 'Creative Selects', 'Client Approval', 'Ship Ready', 'Finished']

export const PITCH_STATUSES = ['Pitched', 'In Review', 'Passed', 'Licensed', 'Expired']

export const KEYS = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B']

export const KEY_MODES = ['Major', 'Minor']

export const VOCAL_PREFERENCES = [
  { value: 'instrumental', label: 'Instrumental Only' },
  { value: 'vocal_ok', label: 'Vocals OK' },
  { value: 'vocal_preferred', label: 'Vocals Preferred' }
]

export const USAGE_TYPES = [
  'Film/TV',
  'Advertising',
  'Trailer',
  'Video Games',
  'Social Media',
  'Podcast',
  'Corporate',
  'Documentary'
]

export const TERRITORIES = [
  'Worldwide',
  'North America',
  'Europe',
  'Asia Pacific',
  'Latin America',
  'UK Only',
  'US Only'
]

export const TERM_LENGTHS = [
  '1 Year',
  '2 Years',
  '3 Years',
  '5 Years',
  'In Perpetuity'
]

export const TAG_CATEGORIES: Record<string, string[]> = {
  'Scene Types': ['Chase Scene', 'Love Scene', 'Fight Scene', 'Montage', 'Opening Credits', 'Closing Credits', 'Transition', 'Dream Sequence'],
  'Emotions': ['Uplifting', 'Dark', 'Romantic', 'Intense', 'Playful', 'Mysterious', 'Triumphant', 'Sad'],
  'Settings': ['Urban', 'Nature', 'Beach', 'Night', 'Day', 'Party', 'Office', 'Home'],
  'Production': ['Lo-Fi', 'Polished', 'Live', 'Acoustic', 'Synthetic', 'Orchestral', 'Minimal', 'Dense'],
  'Usage': ['Background', 'Feature', 'Source Music', 'Diegetic', 'Score-like']
}

export const MICRO_LICENSE_TIERS = [
  { type: 'ugc', label: 'UGC / Personal', price: 29, description: 'YouTube, TikTok, personal projects' },
  { type: 'small_brand', label: 'Small Brand', price: 79, description: 'Small business, local ads' },
  { type: 'digital_ads', label: 'Digital Ads', price: 149, description: 'Digital advertising campaigns' }
]
