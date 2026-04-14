import { useRef, useState, useCallback, useEffect } from 'react'
import { X, Volume2, SkipBack, Play, Pause, RefreshCw, Link, Upload } from 'lucide-react'
import type { DAWTrack } from './types'
import { TRACK_COLORS } from './types'
import { WaveformCanvas } from './WaveformCanvas'

interface DAWPanelProps {
  tracks: DAWTrack[]
  onTracksChange: (tracks: DAWTrack[]) => void
  isPlaying: boolean
  currentTime: number
  syncVideo: boolean
  onSyncVideoChange: (v: boolean) => void
  onPlay: () => void
  onPause: () => void
  onSeek: (t: number) => void
  onSkip: (delta: number) => void
  videoRef: React.RefObject<HTMLVideoElement>
  videoVolume: number
  onVideoVolumeChange: (v: number) => void
}

function formatTime(s: number) {
  const m = Math.floor(s / 60)
  const sec = Math.floor(s % 60)
  const ms = Math.floor((s % 1) * 100)
  return `${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}:${String(ms).padStart(2, '0')}`
}

interface SliderRowProps {
  label: string
  min: number
  max: number
  step?: number
  value: number
  onChange: (v: number) => void
  unit?: string
}

function SliderRow({ label, min, max, step = 0.01, value, onChange, unit = '' }: SliderRowProps) {
  const displayVal = step < 0.1 ? value.toFixed(1) : step < 1 ? value.toFixed(2) : value
  return (
    <div className="flex items-center gap-1">
      <span className="text-[8px] text-[#555] whitespace-nowrap w-8">{label}</span>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={e => onChange(Number(e.target.value))}
        className="w-12 accent-[#C8A97E]"
        style={{ height: 3 }}
      />
      <span className="text-[8px] text-[#555] w-8 text-right">{displayVal}{unit}</span>
    </div>
  )
}

export function DAWPanel({
  tracks,
  onTracksChange,
  isPlaying,
  currentTime,
  syncVideo,
  onSyncVideoChange,
  onPlay,
  onPause,
  onSeek,
  onSkip,
  videoRef,
  videoVolume,
  onVideoVolumeChange,
}: DAWPanelProps) {
  void currentTime
  void videoRef
  const audioCtxRef = useRef<AudioContext | null>(null)
  const sourceRefs = useRef<Map<string, AudioBufferSourceNode>>(new Map())
  const gainRefs = useRef<Map<string, GainNode>>(new Map())
  const [soloTrackId, setSoloTrackId] = useState<string | null>(null)
  const [zoom, setZoom] = useState(2)
  const [loop, setLoop] = useState(false)
  const [bpm, setBpm] = useState(120)
  const startTimeRef = useRef(0)
  const pauseOffsetRef = useRef(0)
  const rafRef = useRef<number>(0)
  const [displayTime, setDisplayTime] = useState(0)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [loadingTrackId, setLoadingTrackId] = useState<string | null>(null)

  const getAudioCtx = useCallback(() => {
    if (!audioCtxRef.current) audioCtxRef.current = new AudioContext()
    return audioCtxRef.current
  }, [])

  const loadAudioFromUrl = useCallback(async (url: string): Promise<AudioBuffer | null> => {
    try {
      const ctx = getAudioCtx()
      const res = await fetch(url)
      const buf = await res.arrayBuffer()
      return await ctx.decodeAudioData(buf)
    } catch { return null }
  }, [getAudioCtx])

  const loadAudioFromFile = useCallback(async (file: File): Promise<AudioBuffer | null> => {
    try {
      const ctx = getAudioCtx()
      const buf = await file.arrayBuffer()
      return await ctx.decodeAudioData(buf)
    } catch { return null }
  }, [getAudioCtx])

  const tracksBufferKey = tracks.map(t => `${t.id}:${t.audioBuffer ? '1' : '0'}`).join(',')

  useEffect(() => {
    tracks.forEach(t => {
      if (!t.audioBuffer && t.audioUrl) {
        setLoadingTrackId(t.id)
        void loadAudioFromUrl(t.audioUrl).then(buf => {
          setLoadingTrackId(null)
          if (buf) {
            onTracksChange(tracks.map(tr => tr.id === t.id ? { ...tr, audioBuffer: buf } : tr))
          }
        })
      }
    })
  }, [tracksBufferKey, tracks, loadAudioFromUrl, onTracksChange])

  const stopAll = useCallback(() => {
    sourceRefs.current.forEach(src => {
      try {
        src.stop()
      } catch {
        void 0
      }
    })
    sourceRefs.current.clear()
    gainRefs.current.clear()
    cancelAnimationFrame(rafRef.current)
  }, [])

  const updateTick = useCallback(() => {
    const ctx = audioCtxRef.current
    if (!ctx) return
    const elapsed = ctx.currentTime - startTimeRef.current + pauseOffsetRef.current
    setDisplayTime(elapsed)
    onSeek(elapsed)
    rafRef.current = requestAnimationFrame(updateTick)
  }, [onSeek])

  const buildAndPlay = useCallback((tracks: DAWTrack[], offset: number, soloId: string | null) => {
    const ctx = getAudioCtx()
    if (ctx.state === 'suspended') ctx.resume()
    stopAll()

    tracks.forEach(t => {
      if (!t.audioBuffer) return
      const effectiveMute = t.muted || (soloId !== null && t.id !== soloId)
      if (effectiveMute) return

      const gain = ctx.createGain()
      gain.gain.value = t.volume / 100
      gain.connect(ctx.destination)
      gainRefs.current.set(t.id, gain)

      const src = ctx.createBufferSource()
      src.buffer = t.audioBuffer!
      src.playbackRate.value = t.speed
      src.loop = loop
      src.connect(gain)

      const trimEnd = t.trimEnd > 0 ? t.trimEnd : t.audioBuffer!.duration
      const trimDur = trimEnd - t.trimStart
      const startOffset = Math.min(Math.max(0, offset - t.trimStart), trimDur)
      src.start(0, t.trimStart + startOffset, trimDur - startOffset)
      sourceRefs.current.set(t.id, src)

      if (t.fadeIn > 0) {
        const now = ctx.currentTime
        gain.gain.setValueAtTime(0, now)
        gain.gain.linearRampToValueAtTime(t.volume / 100, now + t.fadeIn)
      }
    })

    startTimeRef.current = ctx.currentTime
    rafRef.current = requestAnimationFrame(updateTick)
  }, [loop, stopAll, updateTick, getAudioCtx])

  const handlePlay = useCallback(() => {
    buildAndPlay(tracks, pauseOffsetRef.current, soloTrackId)
    onPlay()
  }, [tracks, soloTrackId, buildAndPlay, onPlay])

  const handlePause = useCallback(() => {
    pauseOffsetRef.current = displayTime
    stopAll()
    onPause()
  }, [displayTime, stopAll, onPause])

  const handleSeekPct = useCallback((pct: number, trackDuration: number) => {
    const t = pct * trackDuration
    pauseOffsetRef.current = t
    setDisplayTime(t)
    onSeek(t)
    if (isPlaying) { stopAll(); setTimeout(() => buildAndPlay(tracks, t, soloTrackId), 30) }
  }, [isPlaying, tracks, soloTrackId, stopAll, buildAndPlay, onSeek])

  const handleSkipTo = useCallback((delta: number) => {
    const next = Math.max(0, pauseOffsetRef.current + delta)
    pauseOffsetRef.current = next
    setDisplayTime(next)
    onSkip(delta)
    if (isPlaying) { stopAll(); setTimeout(() => buildAndPlay(tracks, next, soloTrackId), 30) }
  }, [isPlaying, tracks, soloTrackId, stopAll, buildAndPlay, onSkip])

  const handleRestart = useCallback(() => {
    pauseOffsetRef.current = 0
    setDisplayTime(0)
    onSeek(0)
    if (isPlaying) { stopAll(); setTimeout(() => buildAndPlay(tracks, 0, soloTrackId), 30) }
  }, [isPlaying, tracks, soloTrackId, stopAll, buildAndPlay, onSeek])

  const playTrackSolo = useCallback((trackId: string) => {
    const track = tracks.find(t => t.id === trackId)
    if (!track?.audioBuffer) return
    const ctx = getAudioCtx()
    if (ctx.state === 'suspended') ctx.resume()
    try {
      sourceRefs.current.get(trackId)?.stop()
    } catch {
      void 0
    }

    const gain = ctx.createGain()
    gain.gain.value = track.volume / 100
    gain.connect(ctx.destination)

    const src = ctx.createBufferSource()
    src.buffer = track.audioBuffer
    src.connect(gain)
    src.start(0, Math.min(pauseOffsetRef.current, track.audioBuffer.duration))
    sourceRefs.current.set(trackId, src)
    gainRefs.current.set(trackId, gain)
  }, [tracks, getAudioCtx])

  const updateTrack = useCallback((id: string, patch: Partial<DAWTrack>) => {
    onTracksChange(tracks.map(t => t.id === id ? { ...t, ...patch } : t))
    if (patch.volume !== undefined) {
      const g = gainRefs.current.get(id)
      if (g) g.gain.value = patch.volume / 100
    }
    if (patch.speed !== undefined) {
      const src = sourceRefs.current.get(id)
      if (src) src.playbackRate.value = patch.speed
    }
  }, [tracks, onTracksChange])

  const removeTrack = useCallback((id: string) => {
    try {
      sourceRefs.current.get(id)?.stop()
    } catch {
      void 0
    }
    sourceRefs.current.delete(id)
    gainRefs.current.delete(id)
    onTracksChange(tracks.filter(t => t.id !== id))
  }, [tracks, onTracksChange])

  const setPrimary = useCallback((id: string) => {
    onTracksChange(tracks.map(t => ({ ...t, primary: t.id === id })))
  }, [tracks, onTracksChange])

  const toggleSolo = useCallback((id: string) => {
    const newSolo = soloTrackId === id ? null : id
    setSoloTrackId(newSolo)
    if (isPlaying) { stopAll(); setTimeout(() => buildAndPlay(tracks, pauseOffsetRef.current, newSolo), 30) }
  }, [soloTrackId, isPlaying, tracks, stopAll, buildAndPlay])

  const handleDropZone = (e: React.DragEvent) => {
    e.preventDefault()
    const raw = window.__studioTrack
    if (!raw || tracks.length >= 8 || tracks.some(t => t.trackId === raw.id)) return
    addNewDAWTrack({
      trackId: raw.id,
      title: raw.title,
      artist: raw.artist,
      audioUrl: raw.audio_url || raw.preview_url || '',
    })
  }

  const addNewDAWTrack = useCallback((opts: { trackId: string; title: string; artist: string; audioUrl: string; audioBuffer?: AudioBuffer }) => {
    const color = TRACK_COLORS[tracks.length % TRACK_COLORS.length]
    const newTrack: DAWTrack = {
      id: crypto.randomUUID(),
      trackId: opts.trackId,
      title: opts.title,
      artist: opts.artist,
      audioUrl: opts.audioUrl,
      color,
      muted: false,
      soloed: false,
      volume: 80,
      pitch: 0,
      speed: 1,
      fadeIn: 0,
      fadeOut: 0,
      loop: false,
      primary: tracks.length === 0,
      trimStart: 0,
      trimEnd: 0,
      audioBuffer: opts.audioBuffer,
    }
    onTracksChange([...tracks, newTrack])
  }, [tracks, onTracksChange])

  const handleFileUpload = useCallback(async (file: File) => {
    const id = crypto.randomUUID()
    const title = file.name.replace(/\.[^.]+$/, '')
    const tempUrl = URL.createObjectURL(file)
    const buf = await loadAudioFromFile(file)
    addNewDAWTrack({
      trackId: id,
      title,
      artist: 'Local File',
      audioUrl: tempUrl,
      audioBuffer: buf || undefined,
    })
  }, [loadAudioFromFile, addNewDAWTrack])

  const maxDuration = Math.max(...tracks.map(t => t.audioBuffer?.duration || 0), 30)

  return (
    <div
      className="flex h-full"
      style={{ background: '#080810' }}
      onDragOver={e => e.preventDefault()}
      onDrop={handleDropZone}
    >
      <div className="flex flex-col flex-shrink-0" style={{ width: 220, borderRight: '1px solid #1A1A22' }}>
        <div className="flex items-center justify-between px-3 py-1.5 border-b border-[#1A1A22] flex-shrink-0">
          <span className="text-[10px] tracking-widest text-[#555] uppercase">Tracks</span>
          <div className="flex items-center gap-1">
            <button
              onClick={() => fileInputRef.current?.click()}
              title="Upload audio file"
              className="text-xs px-1.5 py-0.5 border border-[#2a2a35] rounded text-[#777] hover:border-[#C8A97E] hover:text-[#C8A97E] transition-colors flex items-center gap-1"
            >
              <Upload className="w-2.5 h-2.5" />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">
          {tracks.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full p-4 gap-3">
              <p className="text-xs text-[#333] text-center">Drag tracks from catalog →</p>
              <button
                onClick={() => fileInputRef.current?.click()}
                className="flex items-center gap-1.5 px-2 py-1 text-xs border border-[#2A2A35] rounded text-[#555] hover:border-[#C8A97E] hover:text-[#C8A97E] transition-colors"
              >
                <Upload className="w-3 h-3" /> Upload audio
              </button>
            </div>
          ) : tracks.map(track => (
            <div
              key={track.id}
              className="group relative px-2 py-1.5 border-b border-[#0E0E16] flex flex-col gap-1"
              style={{
                borderLeft: `3px solid ${track.primary ? '#C8A97E' : track.color}`,
                background: track.primary ? '#0F0F1A' : 'transparent',
              }}
            >
              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => playTrackSolo(track.id)}
                  className="flex-shrink-0 w-5 h-5 rounded-full flex items-center justify-center transition-colors"
                  style={{ background: track.color + '33', border: `1px solid ${track.color}55` }}
                  title="Preview track"
                >
                  <Play className="w-2.5 h-2.5" style={{ color: track.color }} />
                </button>
                <div className="flex-1 min-w-0">
                  <p className="text-[11px] text-[#E8E8E8] truncate leading-tight font-medium">{track.title}</p>
                  <p className="text-[9px] text-[#666] truncate">{track.artist}</p>
                </div>
                {track.primary && <span className="text-[#C8A97E] text-[10px]">★</span>}
                <button
                  onClick={() => removeTrack(track.id)}
                  className="opacity-0 group-hover:opacity-100 text-[#555] hover:text-red-400 transition-all flex-shrink-0"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>

              {loadingTrackId === track.id && (
                <div className="flex items-center gap-1">
                  <div className="w-2 h-2 border border-[#C8A97E] border-t-transparent rounded-full animate-spin" />
                  <span className="text-[8px] text-[#555]">Loading audio...</span>
                </div>
              )}

              <div className="flex items-center gap-1">
                <button
                  onClick={() => updateTrack(track.id, { muted: !track.muted })}
                  className="text-[8px] px-1.5 py-0.5 rounded font-bold transition-colors"
                  style={{
                    background: track.muted ? '#FF4D4D22' : '#1A1A22',
                    color: track.muted ? '#FF4D4D' : '#555',
                    border: `1px solid ${track.muted ? '#FF4D4D44' : '#2A2A35'}`,
                  }}
                >M</button>
                <button
                  onClick={() => toggleSolo(track.id)}
                  className="text-[8px] px-1.5 py-0.5 rounded font-bold transition-colors"
                  style={{
                    background: soloTrackId === track.id ? '#FFD70022' : '#1A1A22',
                    color: soloTrackId === track.id ? '#FFD700' : '#555',
                    border: `1px solid ${soloTrackId === track.id ? '#FFD70044' : '#2A2A35'}`,
                  }}
                >S</button>
                <Volume2 className="w-2.5 h-2.5 text-[#444] ml-1 flex-shrink-0" />
                <input
                  type="range"
                  min={0}
                  max={100}
                  value={track.volume}
                  onChange={e => updateTrack(track.id, { volume: Number(e.target.value) })}
                  className="flex-1 accent-[#C8A97E]"
                  style={{ height: 3 }}
                />
              </div>

              {!track.primary && (
                <button
                  onClick={() => setPrimary(track.id)}
                  className="opacity-0 group-hover:opacity-100 text-[8px] text-[#555] hover:text-[#C8A97E] transition-all text-left"
                >
                  Set as Primary ★
                </button>
              )}
            </div>
          ))}
        </div>

        <div className="border-t border-[#1A1A22] px-2 py-2 flex-shrink-0">
          <div className="flex items-center gap-1 mb-1">
            <Volume2 className="w-3 h-3 text-[#C8A97E] flex-shrink-0" />
            <span className="text-[9px] text-[#888]">Video Audio</span>
          </div>
          <input
            type="range"
            min={0}
            max={1}
            step={0.01}
            value={videoVolume}
            onChange={e => onVideoVolumeChange(Number(e.target.value))}
            className="w-full accent-[#C8A97E]"
            style={{ height: 3 }}
          />
          <div className="flex justify-between mt-0.5">
            <span className="text-[8px] text-[#444]">0</span>
            <span className="text-[8px] text-[#C8A97E]">{Math.round(videoVolume * 100)}%</span>
            <span className="text-[8px] text-[#444]">100</span>
          </div>
        </div>
      </div>

      <div className="flex-1 flex flex-col overflow-hidden min-w-0">
        <div
          className="flex items-center gap-2 px-3 border-b border-[#1A1A22] flex-shrink-0"
          style={{ height: 44, minHeight: 44 }}
        >
          <button
            onClick={handleRestart}
            className="p-1 text-[#555] hover:text-[#C8A97E] transition-colors"
            title="Restart"
          >
            <SkipBack className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => handleSkipTo(-5)}
            className="text-[10px] px-1.5 py-0.5 rounded border border-[#2a2a35] text-[#777] hover:border-[#C8A97E] hover:text-[#C8A97E] transition-colors"
          >
            -5s
          </button>
          <button
            onClick={isPlaying ? handlePause : handlePlay}
            className="w-7 h-7 rounded-full flex items-center justify-center transition-colors flex-shrink-0"
            style={{ background: '#C8A97E', color: '#0A0A0E' }}
          >
            {isPlaying ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
          </button>
          <button
            onClick={() => handleSkipTo(5)}
            className="text-[10px] px-1.5 py-0.5 rounded border border-[#2a2a35] text-[#777] hover:border-[#C8A97E] hover:text-[#C8A97E] transition-colors"
          >
            +5s
          </button>

          <span className="font-mono text-[11px] text-[#C8A97E] ml-1">{formatTime(displayTime)}</span>

          <div className="flex items-center gap-1">
            <span className="text-[9px] text-[#444]">BPM</span>
            <input
              type="number"
              value={bpm}
              onChange={e => setBpm(Number(e.target.value))}
              className="w-9 text-[10px] bg-[#0D0D14] border border-[#2A2A35] rounded text-[#888] text-center outline-none py-0.5"
            />
          </div>

          <button
            onClick={() => setLoop(!loop)}
            className="flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded border transition-colors"
            style={{
              borderColor: loop ? '#C8A97E55' : '#2a2a35',
              color: loop ? '#C8A97E' : '#555',
              background: loop ? '#C8A97E11' : 'transparent',
            }}
          >
            <RefreshCw className="w-2.5 h-2.5" /> Loop
          </button>

          <button
            onClick={() => onSyncVideoChange(!syncVideo)}
            className="flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded border transition-colors"
            style={{
              borderColor: syncVideo ? '#C8A97E55' : '#2a2a35',
              color: syncVideo ? '#C8A97E' : '#555',
              background: syncVideo ? '#C8A97E11' : 'transparent',
            }}
          >
            <Link className="w-2.5 h-2.5" /> Sync
          </button>

          <div className="flex items-center gap-1 ml-auto">
            <span className="text-[9px] text-[#444]">Zoom</span>
            <input
              type="range"
              min={1}
              max={10}
              step={0.5}
              value={zoom}
              onChange={e => setZoom(Number(e.target.value))}
              className="w-12 accent-[#C8A97E]"
              style={{ height: 3 }}
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto overflow-x-hidden">
          {tracks.length === 0 && (
            <div className="flex flex-col items-center justify-center h-full gap-3">
              <p className="text-xs text-[#2A2A35]">Drop tracks from catalog or upload files</p>
              <button
                onClick={() => fileInputRef.current?.click()}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs border border-[#2A2A35] rounded text-[#555] hover:border-[#C8A97E]/50 hover:text-[#C8A97E] transition-colors"
              >
                <Upload className="w-3.5 h-3.5" /> Upload audio file
              </button>
            </div>
          )}
          {tracks.map(track => (
            <div key={track.id} className="border-b border-[#0E0E18]">
              <div style={{ height: 64, minHeight: 64 }}>
                <WaveformCanvas
                  buffer={track.audioBuffer || null}
                  playheadPos={displayTime}
                  trimStart={track.trimStart}
                  trimEnd={track.trimEnd || (track.audioBuffer?.duration || 0)}
                  duration={maxDuration}
                  zoom={zoom}
                  color={track.color}
                  onSeek={pct => handleSeekPct(pct, track.audioBuffer?.duration || maxDuration)}
                />
              </div>
              <div
                className="flex items-center gap-2 px-2 flex-wrap"
                style={{ background: '#0A0A12', height: 32, minHeight: 32 }}
              >
                <SliderRow label="Vol" min={0} max={100} step={1} unit="%" value={track.volume} onChange={v => updateTrack(track.id, { volume: v })} />
                <SliderRow label="Speed" min={0.5} max={2} step={0.05} unit="x" value={track.speed} onChange={v => updateTrack(track.id, { speed: v })} />
                <SliderRow label="FadeIn" min={0} max={5} step={0.1} unit="s" value={track.fadeIn} onChange={v => updateTrack(track.id, { fadeIn: v })} />
                <SliderRow label="FadeOut" min={0} max={5} step={0.1} unit="s" value={track.fadeOut} onChange={v => updateTrack(track.id, { fadeOut: v })} />
              </div>
            </div>
          ))}
        </div>
      </div>

      <div
        className="flex flex-col items-center justify-between py-3 px-2 flex-shrink-0"
        style={{ width: 68, borderLeft: '1px solid #1A1A22' }}
      >
        <div className="flex flex-col items-center gap-1.5 flex-1 justify-center">
          <span className="text-[7px] tracking-widest text-[#C8A97E] uppercase">Master</span>
          <input
            type="range"
            min={0}
            max={100}
            defaultValue={80}
            className="accent-[#C8A97E]"
            style={{
              writingMode: 'vertical-lr' as React.CSSProperties['writingMode'],
              direction: 'rtl' as React.CSSProperties['direction'],
              height: 80,
              width: 16,
            }}
          />
          <span className="text-[9px] text-[#555]">80%</span>
        </div>

        <div className="flex flex-col gap-1.5 w-full">
          <button className="text-[7px] py-1.5 border border-[#C8A97E]/40 rounded text-[#C8A97E] hover:bg-[#C8A97E]/10 transition-colors">
            Export
          </button>
          <button className="text-[7px] py-1.5 border border-[#2a2a35] rounded text-[#555] hover:border-[#C8A97E]/30 transition-colors">
            Bounce
          </button>
        </div>
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept="audio/*"
        className="hidden"
        onChange={e => {
          const f = e.target.files?.[0]
          if (f) handleFileUpload(f)
          e.target.value = ''
        }}
      />
    </div>
  )
}
