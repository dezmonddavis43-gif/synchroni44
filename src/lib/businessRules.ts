import type { CanonicalRole } from './auth'

export function canAccessAdmin(role: CanonicalRole): boolean {
  return role === 'admin'
}

export function canManageBriefs(role: CanonicalRole): boolean {
  return role === 'admin' || role === 'supervisor'
}

export function validateUploadFile(file: { type: string; size: number }): { valid: boolean; reason?: string } {
  const allowed = new Set([
    'audio/mpeg',
    'audio/mp4',
    'audio/x-m4a',
    'audio/aac',
    'audio/wav',
    'audio/x-wav',
    'audio/flac',
    'audio/x-flac',
    'audio/aiff',
    'audio/x-aiff'
  ])

  const maxSize = 80 * 1024 * 1024

  if (!allowed.has(file.type)) {
    return { valid: false, reason: 'Unsupported file type' }
  }

  if (file.size > maxSize) {
    return { valid: false, reason: 'File size exceeds 80MB limit' }
  }

  return { valid: true }
}

export function canSubmitTrack(existingSubmissionTrackIds: string[], trackId: string): boolean {
  return !existingSubmissionTrackIds.includes(trackId)
}

export function canTransitionSubmissionStatus(current: string, next: string): boolean {
  const transitions: Record<string, string[]> = {
    submitted: ['in_review', 'shortlisted', 'rejected'],
    in_review: ['shortlisted', 'selected', 'rejected'],
    shortlisted: ['selected', 'rejected'],
    selected: ['licensed', 'rejected'],
    licensed: [],
    rejected: []
  }

  return transitions[current]?.includes(next) ?? false
}

const ALLOWED_VIDEO_TYPES = new Set([
  'video/mp4',
  'video/quicktime',
  'video/webm',
  'video/x-msvideo',
  'video/x-matroska'
])

const ALLOWED_STUDIO_AUDIO_TYPES = new Set([
  'audio/mpeg',
  'audio/wav',
  'audio/x-wav',
  'audio/flac',
  'audio/x-flac',
  'audio/aiff',
  'audio/x-aiff',
  'audio/mp4',
  'audio/x-m4a'
])

const ALLOWED_IMAGE_TYPES = new Set([
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp'
])

const MAX_VIDEO_SIZE = 500 * 1024 * 1024
const MAX_STUDIO_AUDIO_SIZE = 100 * 1024 * 1024
const MAX_THUMBNAIL_SIZE = 10 * 1024 * 1024

export function validateStudioVideoFile(file: { type: string; size: number }): { valid: boolean; reason?: string } {
  if (!ALLOWED_VIDEO_TYPES.has(file.type)) {
    return { valid: false, reason: 'Unsupported video format. Use MP4, MOV, WebM, AVI, or MKV.' }
  }

  if (file.size > MAX_VIDEO_SIZE) {
    return { valid: false, reason: 'Video file exceeds 500MB limit' }
  }

  return { valid: true }
}

export function validateStudioAudioFile(file: { type: string; size: number }): { valid: boolean; reason?: string } {
  if (!ALLOWED_STUDIO_AUDIO_TYPES.has(file.type)) {
    return { valid: false, reason: 'Unsupported audio format. Use MP3, WAV, AIFF, FLAC, or M4A.' }
  }

  if (file.size > MAX_STUDIO_AUDIO_SIZE) {
    return { valid: false, reason: 'Audio file exceeds 100MB limit' }
  }

  return { valid: true }
}

export function validateStudioThumbnail(file: { type: string; size: number }): { valid: boolean; reason?: string } {
  if (!ALLOWED_IMAGE_TYPES.has(file.type)) {
    return { valid: false, reason: 'Unsupported image format. Use JPEG, PNG, GIF, or WebP.' }
  }

  if (file.size > MAX_THUMBNAIL_SIZE) {
    return { valid: false, reason: 'Image file exceeds 10MB limit' }
  }

  return { valid: true }
}

export function validateVideoUrl(url: string): { valid: boolean; reason?: string } {
  if (!url.trim()) {
    return { valid: false, reason: 'URL is required' }
  }

  try {
    const parsed = new URL(url)
    const hostname = parsed.hostname.toLowerCase()

    const isYoutube = hostname.includes('youtube.com') || hostname.includes('youtu.be')
    const isVimeo = hostname.includes('vimeo.com')
    const isDirectVideo = /\.(mp4|webm|mov|avi)$/i.test(parsed.pathname)
    const isValidProtocol = parsed.protocol === 'https:' || parsed.protocol === 'http:'

    if (!isValidProtocol) {
      return { valid: false, reason: 'URL must use HTTP or HTTPS protocol' }
    }

    if (isYoutube || isVimeo || isDirectVideo) {
      return { valid: true }
    }

    return { valid: true }
  } catch {
    return { valid: false, reason: 'Invalid URL format' }
  }
}

export function extractVideoEmbedUrl(url: string): string | null {
  try {
    const parsed = new URL(url)
    const hostname = parsed.hostname.toLowerCase()

    if (hostname.includes('youtube.com') && parsed.searchParams.has('v')) {
      const videoId = parsed.searchParams.get('v')
      return `https://www.youtube.com/embed/${videoId}`
    }

    if (hostname.includes('youtu.be')) {
      const videoId = parsed.pathname.slice(1)
      return `https://www.youtube.com/embed/${videoId}`
    }

    if (hostname.includes('vimeo.com')) {
      const match = parsed.pathname.match(/\/(\d+)/)
      if (match) {
        return `https://player.vimeo.com/video/${match[1]}`
      }
    }

    return url
  } catch {
    return null
  }
}
