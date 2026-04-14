import { useRef, useState, useCallback } from 'react'
import type { Profile, Track } from '../../lib/types'
import type { DAWTrack, StudioProject } from './studio/types'
import { TRACK_COLORS } from './studio/types'
import { HorizontalResizeHandle, VerticalResizeHandle } from './studio/ResizeHandle'
import { VideoPanel } from './studio/VideoPanel'
import { DAWPanel } from './studio/DAWPanel'
import { CatalogPanel } from './studio/CatalogPanel'

interface StudioProps { profile: Profile }

function formatTimecode(s: number) {
  const h = Math.floor(s / 3600)
  const m = Math.floor((s % 3600) / 60)
  const sec = Math.floor(s % 60)
  return [h, m, sec].map(v => String(v).padStart(2, '0')).join(':')
}

function useResizePx(key: string, defaultVal: number, min: number, max: number) {
  const [size, setSize] = useState(() =>
    parseInt(localStorage.getItem(key) || String(defaultVal))
  )
  const sizeRef = useRef(size)
  sizeRef.current = size

  const startResize = useCallback((e: React.MouseEvent, isVertical: boolean) => {
    e.preventDefault()
    const startPos = isVertical ? e.clientY : e.clientX
    const startSize = sizeRef.current

    const onMove = (ev: MouseEvent) => {
      const delta = isVertical ? ev.clientY - startPos : ev.clientX - startPos
      setSize(Math.max(min, Math.min(max, startSize + delta)))
    }

    const onUp = () => {
      localStorage.setItem(key, String(sizeRef.current))
      document.removeEventListener('mousemove', onMove)
      document.removeEventListener('mouseup', onUp)
    }

    document.addEventListener('mousemove', onMove)
    document.addEventListener('mouseup', onUp)
  }, [key, min, max])

  return [size, startResize] as const
}

export function Studio({ profile }: StudioProps) {
  const leftRef = useRef<HTMLDivElement>(null)
  const [videoHeightPct, setVideoHeightPct] = useState(() =>
    parseInt(localStorage.getItem('studio-video-h') || '55')
  )
  const videoHeightPctRef = useRef(videoHeightPct)
  videoHeightPctRef.current = videoHeightPct
  const [catalogWidth, startCatalogResize] = useResizePx('studio-catalog-w', 320, 220, 520)

  const startVideoResize = useCallback((e: React.MouseEvent) => {
    e.preventDefault()
    const startY = e.clientY
    const startPct = videoHeightPctRef.current

    const onMove = (ev: MouseEvent) => {
      const containerH = leftRef.current?.clientHeight || window.innerHeight
      const deltaPct = ((ev.clientY - startY) / containerH) * 100
      const next = Math.max(25, Math.min(75, startPct + deltaPct))
      setVideoHeightPct(next)
    }

    const onUp = () => {
      localStorage.setItem('studio-video-h', String(Math.round(videoHeightPctRef.current)))
      document.removeEventListener('mousemove', onMove)
      document.removeEventListener('mouseup', onUp)
    }

    document.addEventListener('mousemove', onMove)
    document.addEventListener('mouseup', onUp)
  }, [])

  const dawHeightPct = 100 - videoHeightPct

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
  const [videoVolume, setVideoVolume] = useState(1)
  const videoRef = useRef<HTMLVideoElement>(null)

  const handleVideoVolumeChange = useCallback((v: number) => {
    setVideoVolume(v)
    if (videoRef.current) videoRef.current.volume = v
  }, [])

  const handlePlay = useCallback(() => {
    setIsPlaying(true)
    if (project.syncVideo && videoRef.current) {
      videoRef.current.currentTime = currentTime
      videoRef.current.play().catch(() => {})
    }
  }, [project.syncVideo, currentTime])

  const handlePause = useCallback(() => {
    setIsPlaying(false)
    if (project.syncVideo && videoRef.current) videoRef.current.pause()
  }, [project.syncVideo])

  const handleSeek = useCallback((t: number) => {
    setCurrentTime(t)
    if (project.syncVideo && videoRef.current) {
      videoRef.current.currentTime = t
    }
  }, [project.syncVideo])

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

  if (profile.role !== 'supervisor' && profile.role !== 'admin') {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-76px)]" style={{ background: '#070709' }}>
        <p className="text-[#666] text-sm">Supervisor access only</p>
      </div>
    )
  }

  return (
    <div
      className="flex overflow-hidden"
      style={{ height: 'calc(100vh - 76px)', background: '#070709' }}
    >
      <div ref={leftRef} className="flex flex-col flex-1 min-w-0 overflow-hidden">
        <div style={{ height: `${videoHeightPct}%`, overflow: 'hidden', flexShrink: 0 }}>
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

        <HorizontalResizeHandle onMouseDown={startVideoResize} />

        <div style={{ height: `${dawHeightPct}%`, overflow: 'hidden', flexShrink: 0 }}>
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
            videoVolume={videoVolume}
            onVideoVolumeChange={handleVideoVolumeChange}
          />
        </div>
      </div>

      <VerticalResizeHandle onMouseDown={e => startCatalogResize(e, false)} />


      <div style={{ width: catalogWidth, flexShrink: 0, overflow: 'hidden' }}>
        <CatalogPanel onAddTrack={addTrackFromCatalog} />
      </div>
    </div>
  )
}
