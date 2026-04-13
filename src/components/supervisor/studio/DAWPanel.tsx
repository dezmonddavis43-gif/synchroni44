import { useRef, useState, useCallback, useEffect } from 'react'
import { Plus, X, Volume2, SkipBack, Play, Pause, RefreshCw, Link } from 'lucide-react'
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
}

function formatTime(s: number) {
  const m = Math.floor(s / 60)
  const sec = Math.floor(s % 60)
  return `${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}:${String(Math.floor((s % 1) * 100)).padStart(2, '0')}`
}

interface SliderProps {
  min: number
  max: number
  step?: number
  value: number
  onChange: (v: number) => void
  label: string
  unit?: string
}

function Slider({ min, max, step = 0.01, value, onChange, label, unit = '' }: SliderProps) {
  return (
    <div className="flex items-center gap-1">
      <span className="text-[9px] text-[#555] whitespace-nowrap">{label}</span>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={e => onChange(Number(e.target.value))}
        className="w-14 accent-[#C8A97E]"
        style={{ height: 4 }}
      />
      <span className="text-[9px] text-[#666] w-7 text-right">
        {typeof value === 'number' ? (step < 1 ? value.toFixed(step < 0.1 ? 1 : 0) : value) : value}{unit}
      </span>
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
  videoRef: _videoRef,
}: DAWPanelProps) {
  const audioCtxRef = useRef<AudioContext | null>(null)
  const sourceRefs = useRef<Map<string, AudioBufferSourceNode>>(new Map())
  const gainRefs = useRef<Map<string, GainNode>>(new Map())
  const [zoom, setZoom] = useState(2)
  const [loop, setLoop] = useState(false)
  const [bpm, setBpm] = useState(120)
  const startTimeRef = useRef(0)
  const pauseOffsetRef = useRef(0)
  const rafRef = useRef<number>(0)
  const [displayTime, setDisplayTime] = useState(0)

  const getAudioCtx = useCallback(() => {
    if (!audioCtxRef.current) audioCtxRef.current = new AudioContext()
    return audioCtxRef.current
  }, [])

  const loadAudio = useCallback(async (url: string): Promise<AudioBuffer | null> => {
    try {
      const ctx = getAudioCtx()
      const res = await fetch(url)
      const buf = await res.arrayBuffer()
      return await ctx.decodeAudioData(buf)
    } catch { return null }
  }, [getAudioCtx])

  useEffect(() => {
    tracks.forEach(t => {
      if (!t.audioBuffer && t.audioUrl) {
        loadAudio(t.audioUrl).then(buf => {
          if (buf) {
            onTracksChange(tracks.map(tr => tr.id === t.id ? { ...tr, audioBuffer: buf } : tr))
          }
        })
      }
    })
  }, [tracks.map(t => t.id).join(',')])

  const stopAll = useCallback(() => {
    sourceRefs.current.forEach(src => { try { src.stop() } catch {} })
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

  const playAll = useCallback(() => {
    const ctx = getAudioCtx()
    if (ctx.state === 'suspended') ctx.resume()
    stopAll()
    const offset = pauseOffsetRef.current

    tracks.forEach(t => {
      if (!t.audioBuffer || t.muted) return
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
      src.start(0, t.trimStart + Math.min(offset, trimDur), trimDur)
      sourceRefs.current.set(t.id, src)

      if (t.fadeIn > 0) {
        const now = ctx.currentTime
        gain.gain.setValueAtTime(0, now)
        gain.gain.linearRampToValueAtTime(t.volume / 100, now + t.fadeIn)
      }
    })

    startTimeRef.current = ctx.currentTime
    rafRef.current = requestAnimationFrame(updateTick)
  }, [tracks, loop, stopAll, updateTick, getAudioCtx])

  const handlePlay = useCallback(() => {
    playAll()
    onPlay()
  }, [playAll, onPlay])

  const handlePause = useCallback(() => {
    pauseOffsetRef.current = displayTime
    stopAll()
    onPause()
  }, [displayTime, stopAll, onPause])

  const handleSeekPct = useCallback((pct: number, duration: number) => {
    pauseOffsetRef.current = pct * duration
    setDisplayTime(pauseOffsetRef.current)
    onSeek(pauseOffsetRef.current)
    if (isPlaying) { stopAll(); setTimeout(() => playAll(), 50) }
  }, [isPlaying, stopAll, playAll, onSeek])

  const handleSkipTo = useCallback((delta: number) => {
    pauseOffsetRef.current = Math.max(0, pauseOffsetRef.current + delta)
    setDisplayTime(pauseOffsetRef.current)
    onSkip(delta)
    if (isPlaying) { stopAll(); setTimeout(() => playAll(), 50) }
  }, [isPlaying, stopAll, playAll, onSkip])

  const updateTrack = useCallback((id: string, patch: Partial<DAWTrack>) => {
    onTracksChange(tracks.map(t => t.id === id ? { ...t, ...patch } : t))
    if (patch.volume !== undefined) {
      const g = gainRefs.current.get(id)
      if (g) g.gain.value = patch.volume / 100
    }
  }, [tracks, onTracksChange])

  const removeTrack = useCallback((id: string) => {
    try { sourceRefs.current.get(id)?.stop() } catch {}
    sourceRefs.current.delete(id)
    gainRefs.current.delete(id)
    onTracksChange(tracks.filter(t => t.id !== id))
  }, [tracks, onTracksChange])

  const setPrimary = useCallback((id: string) => {
    onTracksChange(tracks.map(t => ({ ...t, primary: t.id === id })))
  }, [tracks, onTracksChange])

  const handleDropZone = (e: React.DragEvent) => {
    e.preventDefault()
    const raw = (window as any).__studioTrack
    if (!raw || tracks.length >= 6 || tracks.some(t => t.trackId === raw.id)) return
    const color = TRACK_COLORS[tracks.length % TRACK_COLORS.length]
    const newTrack: DAWTrack = {
      id: crypto.randomUUID(),
      trackId: raw.id,
      title: raw.title,
      artist: raw.artist,
      audioUrl: raw.audio_url || raw.preview_url || '',
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
    }
    onTracksChange([...tracks, newTrack])
  }

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
          <button
            className="text-xs px-1.5 py-0.5 border border-[#2a2a35] rounded text-[#777] hover:border-[#C8A97E] hover:text-[#C8A97E] transition-colors flex items-center gap-1"
          >
            <Plus className="w-3 h-3" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto">
          {tracks.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full p-4">
              <p className="text-xs text-[#333] text-center">Drag tracks from catalog →</p>
            </div>
          ) : tracks.map(track => (
            <div
              key={track.id}
              className="group relative px-2 py-1.5 border-b border-[#0E0E16] flex flex-col gap-1"
              style={{
                borderLeft: `3px solid ${track.primary ? '#C8A97E' : track.color}`,
                background: track.primary ? '#0F0F1A' : 'transparent',
                minHeight: 88,
              }}
            >
              <div className="flex items-center gap-1.5">
                <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: track.color }} />
                <div className="flex-1 min-w-0">
                  <p className="text-[11px] text-[#E8E8E8] truncate leading-tight font-medium">{track.title}</p>
                  <p className="text-[9px] text-[#666] truncate">{track.artist}</p>
                </div>
                {track.primary && <span className="text-[#C8A97E] text-xs">★</span>}
                <button
                  onClick={() => removeTrack(track.id)}
                  className="opacity-0 group-hover:opacity-100 text-[#555] hover:text-red-400 transition-all"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>

              <div className="flex items-center gap-1">
                <button
                  onClick={() => updateTrack(track.id, { muted: !track.muted })}
                  className="text-[9px] px-1.5 py-0.5 rounded font-bold transition-colors"
                  style={{
                    background: track.muted ? '#FF4D4D22' : '#1A1A22',
                    color: track.muted ? '#FF4D4D' : '#555',
                    border: `1px solid ${track.muted ? '#FF4D4D44' : '#2A2A35'}`,
                  }}
                >M</button>
                <button
                  onClick={() => updateTrack(track.id, { soloed: !track.soloed })}
                  className="text-[9px] px-1.5 py-0.5 rounded font-bold transition-colors"
                  style={{
                    background: track.soloed ? '#FFD70022' : '#1A1A22',
                    color: track.soloed ? '#FFD700' : '#555',
                    border: `1px solid ${track.soloed ? '#FFD70044' : '#2A2A35'}`,
                  }}
                >S</button>
                <Volume2 className="w-2.5 h-2.5 text-[#444] ml-1" />
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
                  className="opacity-0 group-hover:opacity-100 text-[9px] text-[#555] hover:text-[#C8A97E] transition-all text-left"
                >
                  Set as Primary ★
                </button>
              )}
            </div>
          ))}
        </div>
      </div>

      <div className="flex-1 flex flex-col overflow-hidden min-w-0">
        <div
          className="flex items-center gap-2 px-3 border-b border-[#1A1A22] flex-shrink-0 flex-wrap"
          style={{ height: 40 }}
        >
          <div className="flex items-center gap-1">
            <button
              onClick={() => { pauseOffsetRef.current = 0; setDisplayTime(0); onSeek(0) }}
              className="p-1 text-[#555] hover:text-[#C8A97E] transition-colors"
            >
              <SkipBack className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => handleSkipTo(-5)}
              className="text-[10px] px-1.5 py-0.5 rounded border border-[#2a2a35] text-[#777] hover:border-[#C8A97E] transition-colors"
            >
              -5s
            </button>
            <button
              onClick={isPlaying ? handlePause : handlePlay}
              className="p-1.5 rounded-full transition-colors mx-0.5"
              style={{ background: '#C8A97E', color: '#0A0A0E' }}
            >
              {isPlaying ? <Pause className="w-3 h-3" /> : <Play className="w-3 h-3" />}
            </button>
            <button
              onClick={() => handleSkipTo(5)}
              className="text-[10px] px-1.5 py-0.5 rounded border border-[#2a2a35] text-[#777] hover:border-[#C8A97E] transition-colors"
            >
              +5s
            </button>
          </div>

          <span className="font-mono text-[11px] text-[#C8A97E]">{formatTime(displayTime)}</span>

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
            <Link className="w-2.5 h-2.5" /> Sync {syncVideo ? 'ON' : 'OFF'}
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
            <div className="flex items-center justify-center h-full">
              <p className="text-xs text-[#2A2A35]">Drop tracks from catalog to load here</p>
            </div>
          )}
          {tracks.map(track => (
            <div key={track.id} className="border-b border-[#0E0E18]">
              <div style={{ height: 56, minHeight: 56 }}>
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
                style={{ background: '#0A0A12', height: 30, minHeight: 30 }}
              >
                <Slider label="Vol" min={0} max={100} step={1} unit="%" value={track.volume} onChange={v => updateTrack(track.id, { volume: v })} />
                <Slider label="Pitch≈" min={-12} max={12} step={1} unit="st" value={track.pitch} onChange={v => updateTrack(track.id, { pitch: v })} />
                <Slider label="Speed" min={0.5} max={2} step={0.05} unit="x" value={track.speed} onChange={v => updateTrack(track.id, { speed: v })} />
                <Slider label="FadeIn" min={0} max={5} step={0.1} unit="s" value={track.fadeIn} onChange={v => updateTrack(track.id, { fadeIn: v })} />
                <Slider label="FadeOut" min={0} max={5} step={0.1} unit="s" value={track.fadeOut} onChange={v => updateTrack(track.id, { fadeOut: v })} />
              </div>
            </div>
          ))}
        </div>
      </div>

      <div
        className="flex flex-col items-center justify-between py-3 px-2 flex-shrink-0"
        style={{ width: 72, borderLeft: '1px solid #1A1A22' }}
      >
        <div className="flex flex-col items-center gap-1.5">
          <span className="text-[7px] tracking-widest text-[#C8A97E] uppercase">Master</span>
          <input
            type="range"
            min={0}
            max={100}
            defaultValue={80}
            className="accent-[#C8A97E]"
            style={{
              writingMode: 'vertical-lr' as any,
              direction: 'rtl' as any,
              height: 70,
              width: 16,
            }}
          />
          <span className="text-[9px] text-[#555]">80%</span>
        </div>

        <div className="flex flex-col gap-1.5 w-full">
          <button className="text-[7px] py-1 border border-[#C8A97E]/40 rounded text-[#C8A97E] hover:bg-[#C8A97E]/10 transition-colors leading-tight">
            Export
          </button>
          <button className="text-[7px] py-1 border border-[#2a2a35] rounded text-[#555] hover:border-[#C8A97E]/30 transition-colors leading-tight">
            Bounce
          </button>
        </div>
      </div>
    </div>
  )
}
