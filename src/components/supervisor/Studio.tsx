import { useRef, useState, useCallback } from 'react'
import type { Profile, Track } from '../../lib/types'
import type { DAWTrack, StudioProject } from './studio/types'
import { TRACK_COLORS } from './studio/types'
import { ResizeHandle } from './studio/ResizeHandle'
import { VideoPanel } from './studio/VideoPanel'
import { DAWPanel } from './studio/DAWPanel'
import { CatalogPanel } from './studio/CatalogPanel'

interface StudioProps { profile: Profile }

function formatTimecode(s: number) {
  const h = Math.floor(s / 3600)
  const m = Math.floor((s % 3600) / 60)
  const sec = Math.floor(s % 60)
  const fr = Math.floor((s % 1) * 24)
  return [h, m, sec, fr].map(v => String(v).padStart(2, '0')).join(':')
}

export function Studio({ profile }: StudioProps) {
  if (profile.role !== 'supervisor' && profile.role !== 'admin') {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-76px)]" style={{ background: '#070709' }}>
        <div className="text-center">
          <p className="text-[#888] text-sm">Supervisor access only</p>
        </div>
      </div>
    )
  }

  const [row1Height, setRow1Height] = useState(() =>
    parseInt(localStorage.getItem('studio-row1') || '50')
  )
  const [row2Height, setRow2Height] = useState(() =>
    parseInt(localStorage.getItem('studio-row2') || '30')
  )

  const containerRef = useRef<HTMLDivElement>(null)

  const handleDrag1 = useCallback((deltaY: number) => {
    const container = containerRef.current
    if (!container) return
    const totalH = container.clientHeight
    const deltaPct = (deltaY / totalH) * 100
    setRow1Height(prev => {
      const next = Math.max(20, Math.min(70, prev + deltaPct))
      localStorage.setItem('studio-row1', String(Math.round(next)))
      return next
    })
  }, [])

  const handleDrag2 = useCallback((deltaY: number) => {
    const container = containerRef.current
    if (!container) return
    const totalH = container.clientHeight
    const deltaPct = (deltaY / totalH) * 100
    setRow2Height(prev => {
      const nextRow2 = Math.max(15, Math.min(50, prev + deltaPct))
      const nextRow3 = 100 - row1Height - nextRow2
      if (nextRow3 < 10) return prev
      localStorage.setItem('studio-row2', String(Math.round(nextRow2)))
      return nextRow2
    })
  }, [row1Height])

  const row3Height = Math.max(10, 100 - row1Height - row2Height)

  const [project, setProject] = useState<StudioProject>({
    id: crypto.randomUUID(),
    name: 'Untitled Project',
    sceneName: 'Main Scene',
    status: 'Searching',
    videoUrl: null,
    syncVideo: true,
  })

  const [dawTracks, setDawTracks] = useState<DAWTrack[]>([])
  const [isPlaying, setIsPlaying] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const videoRef = useRef<HTMLVideoElement>(null)

  const handlePlay = useCallback(() => {
    setIsPlaying(true)
    if (project.syncVideo && videoRef.current) {
      videoRef.current.currentTime = currentTime
      videoRef.current.play().catch(() => {})
    }
  }, [project.syncVideo, currentTime])

  const handlePause = useCallback(() => {
    setIsPlaying(false)
    if (project.syncVideo && videoRef.current) {
      videoRef.current.pause()
    }
  }, [project.syncVideo])

  const handleSeek = useCallback((t: number) => {
    setCurrentTime(t)
    if (project.syncVideo && videoRef.current && !isPlaying) {
      videoRef.current.currentTime = t
    }
  }, [project.syncVideo, isPlaying])

  const handleSkip = useCallback((delta: number) => {
    setCurrentTime(prev => Math.max(0, prev + delta))
    if (project.syncVideo && videoRef.current) {
      videoRef.current.currentTime = Math.max(0, (videoRef.current.currentTime || 0) + delta)
    }
  }, [project.syncVideo])

  const addTrackFromCatalog = useCallback((track: Track) => {
    if (dawTracks.length >= 6) return
    if (dawTracks.some(t => t.trackId === track.id)) return
    const color = TRACK_COLORS[dawTracks.length % TRACK_COLORS.length]
    const newTrack: DAWTrack = {
      id: crypto.randomUUID(),
      trackId: track.id,
      title: track.title,
      artist: track.artist,
      audioUrl: track.audio_url || track.preview_url || '',
      color,
      muted: false,
      soloed: false,
      volume: 80,
      pitch: 0,
      speed: 1,
      fadeIn: 0,
      fadeOut: 0,
      loop: false,
      primary: dawTracks.length === 0,
      trimStart: 0,
      trimEnd: 0,
    }
    setDawTracks(prev => [...prev, newTrack])
  }, [dawTracks])

  const timecode = formatTimecode(currentTime)

  return (
    <div
      ref={containerRef}
      className="flex flex-col overflow-hidden"
      style={{ height: 'calc(100vh - 76px)', background: '#070709' }}
    >
      <div style={{ height: `${row1Height}%`, overflow: 'hidden', flexShrink: 0 }}>
        <VideoPanel
          profile={profile}
          projectName={project.name}
          sceneName={project.sceneName}
          status={project.status}
          videoUrl={project.videoUrl}
          syncVideo={project.syncVideo}
          videoRef={videoRef}
          onProjectNameChange={name => setProject(p => ({ ...p, name }))}
          onSceneNameChange={sceneName => setProject(p => ({ ...p, sceneName }))}
          onStatusChange={status => setProject(p => ({ ...p, status }))}
          onVideoUrlChange={videoUrl => setProject(p => ({ ...p, videoUrl }))}
          timecode={timecode}
        />
      </div>

      <ResizeHandle onDrag={handleDrag1} />

      <div style={{ height: `${row2Height}%`, overflow: 'hidden', flexShrink: 0 }}>
        <DAWPanel
          tracks={dawTracks}
          onTracksChange={setDawTracks}
          isPlaying={isPlaying}
          currentTime={currentTime}
          syncVideo={project.syncVideo}
          onSyncVideoChange={v => setProject(p => ({ ...p, syncVideo: v }))}
          onPlay={handlePlay}
          onPause={handlePause}
          onSeek={handleSeek}
          onSkip={handleSkip}
          videoRef={videoRef}
        />
      </div>

      <ResizeHandle onDrag={handleDrag2} />

      <div style={{ height: `${row3Height}%`, overflow: 'hidden', flexShrink: 0 }}>
        <CatalogPanel onAddTrack={addTrackFromCatalog} />
      </div>
    </div>
  )
}
