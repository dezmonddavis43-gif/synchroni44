import type { Track } from './types'

/** Length in seconds: prefers `duration_ms`, then legacy `duration` (stored as seconds). */
export function trackDurationSeconds(
  track: Pick<Track, 'duration_ms' | 'duration'> | null | undefined
): number {
  if (!track) return 0
  if (track.duration_ms != null && track.duration_ms > 0) {
    return track.duration_ms / 1000
  }
  if (track.duration != null && track.duration > 0) {
    return track.duration
  }
  return 0
}

/** MM:SS for track rows and playlist views. */
export function formatTrackDurationMmSs(
  track: Pick<Track, 'duration_ms' | 'duration'> | null | undefined
): string {
  const secs = trackDurationSeconds(track)
  if (!secs) return '--:--'
  const m = Math.floor(secs / 60)
  const s = Math.floor(secs % 60)
  return `${m}:${String(s).padStart(2, '0')}`
}

/** When you already have total seconds (e.g. playlist sum). */
export function formatSecondsAsMmSs(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds <= 0) return '--:--'
  const m = Math.floor(seconds / 60)
  const s = Math.floor(seconds % 60)
  return `${m}:${String(s).padStart(2, '0')}`
}

/**
 * Decode local audio file and return length in ms (Web Audio API).
 * Call from a user gesture path (e.g. file input / upload).
 */
export async function getAudioDurationMsFromFile(file: File): Promise<number | null> {
  try {
    const arrayBuffer = await file.arrayBuffer()
    const ctx = new AudioContext()
    try {
      const copy = arrayBuffer.slice(0)
      const audioBuffer = await ctx.decodeAudioData(copy)
      const ms = Math.round(audioBuffer.duration * 1000)
      return Number.isFinite(ms) && ms > 0 ? ms : null
    } finally {
      await ctx.close()
    }
  } catch {
    return null
  }
}
