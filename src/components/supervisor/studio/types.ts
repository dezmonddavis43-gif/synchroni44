import type { Track } from '../../../lib/types'

export type SceneStatus = 'Searching' | 'Options Found' | 'Client Review' | 'Approved' | 'Licensed'

export const STATUS_COLORS: Record<SceneStatus, string> = {
  Searching: '#6B7280',
  'Options Found': '#3B82F6',
  'Client Review': '#F59E0B',
  Approved: '#22C55E',
  Licensed: '#C8A97E',
}

export interface DAWTrack {
  id: string
  trackId: string
  title: string
  artist: string
  audioUrl: string
  color: string
  muted: boolean
  soloed: boolean
  volume: number
  pitch: number
  speed: number
  fadeIn: number
  fadeOut: number
  loop: boolean
  primary: boolean
  audioBuffer?: AudioBuffer
  trimStart: number
  trimEnd: number
}

export const MOOD_COLORS: Record<string, string> = {
  Tense: '#FF4D4D',
  Hopeful: '#4DFF91',
  Melancholic: '#7B9CFF',
  Sensual: '#FF9C7B',
  Aggressive: '#FF4D4D',
  Peaceful: '#4DDFFF',
  Cinematic: '#C8A97E',
  Mixed: '#888',
}

export const TRACK_COLORS = [
  '#C8A97E', '#7B9CFF', '#4DFFB4', '#FF7B7B',
  '#FFD700', '#FF9C7B', '#4DDFFF', '#B47BFF',
]

export interface StudioProject {
  id: string
  name: string
  sceneName: string
  status: SceneStatus
  videoUrl: string | null
  syncVideo: boolean
}

export { Track }
