import { useRef, useState, useCallback, type ReactNode } from 'react'
import type { Profile, Track } from '../../lib/types'
import type { DAWTrack, StudioProject } from './studio/types'
import { TRACK_COLORS } from './studio/types'
import { HorizontalResizeHandle, VerticalResizeHandle } from './studio/ResizeHandle'
import { VideoPanel } from './studio/VideoPanel'
import { DAWPanel } from './studio/DAWPanel'
import { CatalogPanel } from './studio/CatalogPanel'
import { FolderKanban, Music2, FileText, History, Plus, Send, Upload } from 'lucide-react'

interface StudioProps { profile: Profile }

const ACCENT = '#C9A84C'
const ACCENT_MUTED = 'rgba(201, 168, 76, 0.12)'

function formatTimecode(s: number) {
  const h = Math.floor(s / 3600)
  const m = Math.floor((s % 3600) / 60)
  const sec = Math.floor(s % 60)
  return [h, m, sec].map(v => String(v).padStart(2, '0')).join(':')
}

function useResizePx(key: string, defaultVal: number, min: number, max: number) {
  const [size, setSize] = useState(() =>
    parseInt(localStorage.getItem(key) || String(defaultVal), 10) || defaultVal
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

type StudioNavId = 'projects' | 'tracks' | 'briefs' | 'history'

const NAV: { id: StudioNavId; label: string; sub: string; icon: ReactNode }[] = [
  { id: 'projects', label: 'Projects', sub: 'Picture & timeline', icon: <FolderKanban className="w-4 h-4" /> },
  { id: 'tracks', label: 'Tracks', sub: 'Library & stems', icon: <Music2 className="w-4 h-4" /> },
  { id: 'briefs', label: 'Briefs', sub: 'Creative direction', icon: <FileText className="w-4 h-4" /> },
  { id: 'history', label: 'History', sub: 'Session log', icon: <History className="w-4 h-4" /> },
]

export function Studio({ profile }: StudioProps) {
  const leftRef = useRef<HTMLDivElement>(null)
  const fabFileRef = useRef<HTMLInputElement>(null)

  const [studioNav, setStudioNav] = useState<StudioNavId>('projects')
  const [videoHeightPct, setVideoHeightPct] = useState(() =>
    parseInt(localStorage.getItem('studio-video-h') || '48', 10) || 48
  )
  const videoHeightPctRef = useRef(videoHeightPct)
  videoHeightPctRef.current = videoHeightPct
  const [catalogWidth, startCatalogResize] = useResizePx('studio-catalog-w', 300, 240, 560)

  const [briefNotes, setBriefNotes] = useState('')
  const [workspaceNotes, setWorkspaceNotes] = useState('')
  const [pitchLog, setPitchLog] = useState<string[]>([])

  const startVideoResize = useCallback((e: React.MouseEvent) => {
    e.preventDefault()
    const startY = e.clientY
    const startPct = videoHeightPctRef.current

    const onMove = (ev: MouseEvent) => {
      const containerH = leftRef.current?.clientHeight || window.innerHeight
      const deltaPct = ((ev.clientY - startY) / containerH) * 100
      const next = Math.max(28, Math.min(72, startPct + deltaPct))
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
      void videoRef.current.play().catch(() => undefined)
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
    if (dawTracks.length >= 8) return
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

  const handleFabLocalUpload = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file || !file.type.startsWith('audio/') || dawTracks.length >= 8) return
    const id = crypto.randomUUID()
    const title = file.name.replace(/\.[^/.]+$/, '')
    const tempUrl = URL.createObjectURL(file)
    const color = TRACK_COLORS[dawTracks.length % TRACK_COLORS.length]
    const newTrack: DAWTrack = {
      id: crypto.randomUUID(),
      trackId: id,
      title,
      artist: 'Local file',
      audioUrl: tempUrl,
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
  }, [dawTracks.length])

  const resetProject = useCallback(() => {
    setProject({
      id: crypto.randomUUID(),
      name: 'Untitled Project',
      sceneName: 'Main Scene',
      status: 'Searching',
      videoUrl: null,
      syncVideo: true,
    })
    setDawTracks([])
    setBriefNotes('')
    setWorkspaceNotes('')
    setPitchLog([])
    setCurrentTime(0)
    setIsPlaying(false)
  }, [])

  const queuePitch = useCallback(() => {
    const line = `${project.name} — pitch staged • ${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`
    setPitchLog(prev => [line, ...prev].slice(0, 12))
  }, [project.name])

  const timecode = formatTimecode(currentTime)

  if (profile.role !== 'supervisor' && profile.role !== 'admin') {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-76px)] bg-[#050506]">
        <p className="text-[#666] text-sm">Supervisor access only</p>
      </div>
    )
  }

  return (
    <div
      className="relative flex overflow-hidden text-[#E8E6E1]"
      style={{ height: 'calc(100vh - 76px)', background: '#040405' }}
    >
      <aside
        className="flex w-56 shrink-0 flex-col border-r border-white/[0.07] transition-colors duration-300"
        style={{ background: 'linear-gradient(180deg, #0B0B0F 0%, #070709 100%)' }}
      >
        <div className="border-b border-white/[0.06] px-4 py-4">
          <p className="text-[10px] font-semibold uppercase tracking-[0.28em]" style={{ color: ACCENT }}>Studio</p>
          <h1 className="mt-1 font-['Playfair_Display',Georgia,serif] text-lg text-[#F4F2EC]">Sync Suite</h1>
          <p className="mt-1 text-[11px] leading-relaxed text-[#6B6B74]">Premiere-grade picture lock with mix-ready stems.</p>
        </div>
        <nav className="flex flex-1 flex-col gap-1 p-2">
          {NAV.map(item => {
            const active = studioNav === item.id
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => setStudioNav(item.id)}
                className="flex w-full items-start gap-3 rounded-lg px-3 py-2.5 text-left transition-all duration-200"
                style={{
                  background: active ? ACCENT_MUTED : 'transparent',
                  border: `1px solid ${active ? 'rgba(201,168,76,0.35)' : 'transparent'}`,
                  color: active ? ACCENT : '#9A9AA3',
                }}
              >
                <span className="mt-0.5 shrink-0 opacity-90">{item.icon}</span>
                <span>
                  <span className="block text-xs font-medium text-[#E8E6E1]">{item.label}</span>
                  <span className="block text-[10px] text-[#5C5C66]">{item.sub}</span>
                </span>
              </button>
            )
          })}
        </nav>
        <div className="border-t border-white/[0.06] p-3 text-[10px] leading-snug text-[#4A4A52]">
          Picture stays locked while you audition alternates against the brief — all in one canvas.
        </div>
      </aside>

      <div ref={leftRef} className="flex min-w-0 flex-1 flex-col overflow-hidden">
        <div className="flex min-h-0 min-w-0 flex-1 flex-row">
          <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
            <div
              className="flex shrink-0 flex-col overflow-hidden border-b border-white/[0.06] transition-[height] duration-200"
              style={{ height: `${videoHeightPct}%`, minHeight: 200 }}
            >
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

            <div
              className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden"
              style={{ height: `${dawHeightPct}%` }}
            >
              <div className="grid min-h-[132px] shrink-0 grid-cols-3 gap-px bg-white/[0.06]">
                <section className="flex flex-col bg-[#08080D] p-3">
                  <p className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: ACCENT }}>Brief</p>
                  <p className="mt-1 line-clamp-2 text-[11px] text-[#7D7D88]">
                    {studioNav === 'briefs'
                      ? 'Anchor mix decisions to the creative north star — tone, references, and usage.'
                      : `Scene “${project.sceneName}” · ${project.status}`}
                  </p>
                  <textarea
                    value={briefNotes}
                    onChange={e => setBriefNotes(e.target.value)}
                    placeholder="Drop brief beats, references, or client mandatories…"
                    rows={3}
                    className="mt-2 min-h-0 flex-1 resize-none rounded-md border border-white/[0.08] bg-[#050508] px-2 py-1.5 text-[11px] text-[#D6D4CE] outline-none transition-colors placeholder:text-[#3D3D45] focus:border-[rgba(201,168,76,0.45)]"
                  />
                </section>
                <section className="flex flex-col bg-[#07070C] p-3">
                  <p className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: ACCENT }}>Pitch activity</p>
                  <div className="mt-2 flex max-h-[88px] flex-col gap-1 overflow-y-auto text-[10px] text-[#8B8B96]">
                    {pitchLog.length === 0 ? (
                      <p className="text-[#4C4C56]">No outbound pitches yet. Stage one when the mix feels undeniable.</p>
                    ) : (
                      pitchLog.map(line => (
                        <div key={line} className="rounded border border-white/[0.05] bg-[#0C0C12] px-2 py-1 text-[#BAB8B2]">
                          {line}
                        </div>
                      ))
                    )}
                  </div>
                </section>
                <section className="flex flex-col bg-[#08080D] p-3">
                  <p className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: ACCENT }}>Notes</p>
                  <textarea
                    value={workspaceNotes}
                    onChange={e => setWorkspaceNotes(e.target.value)}
                    placeholder="Director notes, alt selects, mix notes…"
                    rows={4}
                    className="mt-2 min-h-0 flex-1 resize-none rounded-md border border-white/[0.08] bg-[#050508] px-2 py-1.5 text-[11px] text-[#D6D4CE] outline-none transition-colors placeholder:text-[#3D3D45] focus:border-[rgba(201,168,76,0.45)]"
                  />
                </section>
              </div>

              <div className="min-h-0 flex-1 border-t border-white/[0.06]">
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
          </div>

          <VerticalResizeHandle onMouseDown={e => startCatalogResize(e, false)} />

          <div
            className="flex shrink-0 flex-col overflow-hidden border-l border-white/[0.06] transition-[width] duration-200"
            style={{ width: catalogWidth, background: '#060608' }}
          >
            <div className="flex items-center justify-between border-b border-white/[0.06] px-3 py-2">
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: ACCENT }}>Library</p>
                <p className="text-[10px] text-[#5C5C66]">Drag into the timeline lane</p>
              </div>
            </div>
            <div className="min-h-0 flex-1">
              <CatalogPanel onAddTrack={addTrackFromCatalog} />
            </div>
          </div>
        </div>
      </div>

      <input
        ref={fabFileRef}
        type="file"
        accept="audio/*"
        className="hidden"
        onChange={handleFabLocalUpload}
      />

      <div className="pointer-events-none absolute bottom-8 right-8 z-20 flex flex-col items-end gap-3">
        <div className="pointer-events-auto flex flex-col gap-2 rounded-2xl border border-white/[0.08] bg-[#0A0A10]/95 p-2 shadow-[0_20px_60px_rgba(0,0,0,0.55)] backdrop-blur-md transition-transform duration-300">
          <button
            type="button"
            onClick={resetProject}
            className="flex items-center gap-2 rounded-xl px-4 py-2.5 text-left text-xs font-medium text-[#0A0A0C] transition-colors hover:brightness-110"
            style={{ background: ACCENT }}
          >
            <Plus className="h-4 w-4" />
            New project
          </button>
          <button
            type="button"
            onClick={() => fabFileRef.current?.click()}
            className="flex items-center gap-2 rounded-xl border border-white/[0.12] bg-[#12121A] px-4 py-2.5 text-left text-xs font-medium text-[#E4E2DC] transition-colors hover:border-[rgba(201,168,76,0.45)] hover:text-white"
          >
            <Upload className="h-4 w-4" style={{ color: ACCENT }} />
            Upload track
          </button>
          <button
            type="button"
            onClick={queuePitch}
            className="flex items-center gap-2 rounded-xl border border-[rgba(201,168,76,0.35)] bg-[rgba(201,168,76,0.08)] px-4 py-2.5 text-left text-xs font-medium transition-colors hover:bg-[rgba(201,168,76,0.15)]"
            style={{ color: ACCENT }}
          >
            <Send className="h-4 w-4" />
            Send pitch
          </button>
        </div>
      </div>
    </div>
  )
}
