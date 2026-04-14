import { useState, useRef, useCallback, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import type { Track } from '../lib/types'

interface AudioPlayerState {
  currentTrack: Track | null
  playing: boolean
  progress: number
  duration: number
  volume: number
  shuffle: boolean
  repeat: 'off' | 'all' | 'one'
  queue: Track[]
  queueIndex: number
  isFavorite: boolean
}

export function useAudioPlayer() {
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const lastUserIdRef = useRef<string | undefined>(undefined)
  const stateRef = useRef<AudioPlayerState | null>(null)
  const [state, setState] = useState<AudioPlayerState>({
    currentTrack: null,
    playing: false,
    progress: 0,
    duration: 0,
    volume: 0.8,
    shuffle: false,
    repeat: 'off',
    queue: [],
    queueIndex: -1,
    isFavorite: false,
  })
  stateRef.current = state

  const refreshFavorite = useCallback(async (trackId: string | undefined | null, userId?: string) => {
    if (!trackId || !userId) {
      setState(prev => ({ ...prev, isFavorite: false }))
      return
    }
    const { data } = await supabase
      .from('saved_tracks')
      .select('id')
      .eq('user_id', userId)
      .eq('track_id', trackId)
      .maybeSingle()
    setState(prev => ({ ...prev, isFavorite: !!data }))
  }, [])

  useEffect(() => {
    const t = state.currentTrack
    const uid = lastUserIdRef.current
    if (!t?.id || !uid) {
      setState(prev => (prev.isFavorite ? { ...prev, isFavorite: false } : prev))
      return
    }
    void refreshFavorite(t.id, uid)
  }, [state.currentTrack?.id, refreshFavorite])

  useEffect(() => {
    audioRef.current = new Audio()
    audioRef.current.volume = state.volume

    const audio = audioRef.current

    const handleTimeUpdate = () => {
      setState(prev => ({ ...prev, progress: audio.currentTime }))
    }

    const handleLoadedMetadata = () => {
      const d = Number.isFinite(audio.duration) ? audio.duration : 0
      setState(prev => ({ ...prev, duration: d || prev.duration }))
    }

    const handleEnded = () => {
      setState(prev => {
        if (prev.repeat === 'one') {
          if (audioRef.current) {
            audioRef.current.currentTime = 0
            audioRef.current.play().catch(() => {})
          }
          return { ...prev, progress: 0 }
        }
        return { ...prev, playing: false, progress: 0 }
      })
    }

    audio.addEventListener('timeupdate', handleTimeUpdate)
    audio.addEventListener('loadedmetadata', handleLoadedMetadata)
    audio.addEventListener('ended', handleEnded)

    return () => {
      audio.removeEventListener('timeupdate', handleTimeUpdate)
      audio.removeEventListener('loadedmetadata', handleLoadedMetadata)
      audio.removeEventListener('ended', handleEnded)
      audio.pause()
    }
  }, [])

  const recordPlayEvent = useCallback(async (track: Track, userId?: string) => {
    try {
      await supabase.from('track_analytics').insert({
        track_id: track.id,
        event_type: 'play',
        user_id: userId || null,
      })
    } catch (error) {
      console.error('Failed to record play event:', error)
    }
  }, [])

  const loadTrack = useCallback(
    async (track: Track, userId?: string) => {
      if (!audioRef.current) return
      lastUserIdRef.current = userId

      setState(prev => ({
        ...prev,
        currentTrack: track,
        playing: false,
        progress: 0,
        duration: track.duration || prev.duration,
        queue: [track],
        queueIndex: 0,
      }))

      if (track.audio_url) {
        audioRef.current.src = track.audio_url
        audioRef.current.load()
        try {
          await audioRef.current.play()
          setState(prev => ({ ...prev, playing: true }))
          recordPlayEvent(track, userId)
        } catch (error) {
          console.error('Failed to play audio:', error)
        }
      }
    },
    [recordPlayEvent],
  )

  const setQueue = useCallback((tracks: Track[], startIndex = 0) => {
    setState(prev => ({
      ...prev,
      queue: tracks,
      queueIndex: startIndex,
    }))
  }, [])

  const playNext = useCallback(
    async (userId?: string) => {
      setState(prev => {
        const { queue, queueIndex, shuffle, repeat } = prev
        if (queue.length === 0) return prev

        let nextIndex: number
        if (shuffle) {
          nextIndex = Math.floor(Math.random() * queue.length)
        } else {
          nextIndex = queueIndex + 1
          if (nextIndex >= queue.length) {
            if (repeat === 'all') {
              nextIndex = 0
            } else {
              return prev
            }
          }
        }

        const nextTrack = queue[nextIndex]
        if (nextTrack && audioRef.current) {
          audioRef.current.src = nextTrack.audio_url || ''
          audioRef.current.load()
          audioRef.current.play().catch(console.error)
          recordPlayEvent(nextTrack, userId)
        }

        return {
          ...prev,
          currentTrack: nextTrack,
          queueIndex: nextIndex,
          playing: true,
          progress: 0,
        }
      })
    },
    [recordPlayEvent],
  )

  const playPrevious = useCallback(
    async (userId?: string) => {
      setState(prev => {
        const { queue, queueIndex, progress } = prev
        if (queue.length === 0) return prev

        if (progress > 3 && audioRef.current) {
          audioRef.current.currentTime = 0
          return { ...prev, progress: 0 }
        }

        let prevIndex = queueIndex - 1
        if (prevIndex < 0) {
          prevIndex = queue.length - 1
        }

        const prevTrack = queue[prevIndex]
        if (prevTrack && audioRef.current) {
          audioRef.current.src = prevTrack.audio_url || ''
          audioRef.current.load()
          audioRef.current.play().catch(console.error)
          recordPlayEvent(prevTrack, userId)
        }

        return {
          ...prev,
          currentTrack: prevTrack,
          queueIndex: prevIndex,
          playing: true,
          progress: 0,
        }
      })
    },
    [recordPlayEvent],
  )

  const togglePlay = useCallback(() => {
    if (!audioRef.current || !stateRef.current?.currentTrack?.audio_url) return

    if (stateRef.current.playing) {
      audioRef.current.pause()
      setState(prev => ({ ...prev, playing: false }))
    } else {
      audioRef.current.play()
      setState(prev => ({ ...prev, playing: true }))
    }
  }, [])

  const seek = useCallback((time: number) => {
    if (!audioRef.current) return
    audioRef.current.currentTime = time
    setState(prev => ({ ...prev, progress: time }))
  }, [])

  const setVolume = useCallback((v: number) => {
    if (!audioRef.current) return
    const clampedVolume = Math.max(0, Math.min(1, v))
    audioRef.current.volume = clampedVolume
    setState(prev => ({ ...prev, volume: clampedVolume }))
  }, [])

  const toggleShuffle = useCallback(() => {
    setState(prev => ({ ...prev, shuffle: !prev.shuffle }))
  }, [])

  const toggleRepeat = useCallback(() => {
    setState(prev => {
      const modes: Array<'off' | 'all' | 'one'> = ['off', 'all', 'one']
      const currentIdx = modes.indexOf(prev.repeat)
      const nextIdx = (currentIdx + 1) % modes.length
      return { ...prev, repeat: modes[nextIdx] }
    })
  }, [])

  const stop = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause()
      audioRef.current.currentTime = 0
    }
    setState(prev => ({
      ...prev,
      currentTrack: null,
      playing: false,
      progress: 0,
      duration: 0,
      queue: [],
      queueIndex: -1,
      isFavorite: false,
    }))
  }, [])

  const toggleFavorite = useCallback(async (userId?: string) => {
    const uid = userId || lastUserIdRef.current
    const { currentTrack, isFavorite } = stateRef.current || {}
    if (!currentTrack || !uid) return

    if (isFavorite) {
      await supabase.from('saved_tracks').delete().eq('user_id', uid).eq('track_id', currentTrack.id)
      setState(prev => ({ ...prev, isFavorite: false }))
    } else {
      await supabase.from('saved_tracks').insert({ user_id: uid, track_id: currentTrack.id })
      setState(prev => ({ ...prev, isFavorite: true }))
    }
  }, [])

  const selectTrack = useCallback(
    async (index: number, userId?: string) => {
      const q = stateRef.current?.queue || []
      if (index < 0 || index >= q.length) return
      await loadTrack(q[index], userId)
    },
    [loadTrack],
  )

  return {
    ...state,
    currentTime: state.progress,
    loadTrack,
    togglePlay,
    seek,
    setVolume,
    setQueue,
    playNext,
    playPrevious,
    skipNext: playNext,
    skipPrevious: playPrevious,
    toggleShuffle,
    toggleRepeat,
    toggleFavorite,
    selectTrack,
    stop,
  }
}
