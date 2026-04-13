import { useEffect, useRef, useCallback } from 'react'

interface WaveformCanvasProps {
  buffer: AudioBuffer | null
  playheadPos: number
  trimStart: number
  trimEnd: number
  duration: number
  zoom: number
  color: string
  onSeek: (pct: number) => void
}

export function WaveformCanvas({
  buffer,
  playheadPos,
  trimStart,
  trimEnd,
  duration,
  zoom,
  color,
  onSeek,
}: WaveformCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  const draw = useCallback(() => {
    const canvas = canvasRef.current
    const container = containerRef.current
    if (!canvas || !container) return

    const W = container.clientWidth
    const H = container.clientHeight
    if (W === 0 || H === 0) return

    if (canvas.width !== W || canvas.height !== H) {
      canvas.width = W
      canvas.height = H
    }

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    ctx.clearRect(0, 0, W, H)
    ctx.fillStyle = '#13131A'
    ctx.fillRect(0, 0, W, H)

    if (!buffer) {
      ctx.strokeStyle = '#2A2A35'
      ctx.lineWidth = 1
      ctx.setLineDash([4, 4])
      ctx.beginPath()
      ctx.moveTo(0, H / 2)
      ctx.lineTo(W, H / 2)
      ctx.stroke()
      ctx.setLineDash([])
      return
    }

    const rawData = buffer.getChannelData(0)
    const samples = rawData.length
    const barW = Math.max(1, zoom * 1.5)
    const numBars = Math.floor(W / barW)
    const samplesPerBar = Math.max(1, Math.floor(samples / numBars))

    const grad = ctx.createLinearGradient(0, 0, 0, H)
    grad.addColorStop(0, '#7B9CFF')
    grad.addColorStop(1, color || '#C8A97E')

    const actualDur = buffer.duration
    const phPct = Math.max(0, Math.min(1, playheadPos / Math.max(actualDur, 0.001)))

    for (let i = 0; i < numBars; i++) {
      let peak = 0
      const start = i * samplesPerBar
      for (let j = 0; j < samplesPerBar; j++) {
        const val = Math.abs(rawData[start + j] || 0)
        if (val > peak) peak = val
      }

      const pct = i / numBars
      const isDimmed =
        (actualDur > 0 && trimStart > 0 && pct < trimStart / actualDur) ||
        (trimEnd > 0 && actualDur > 0 && pct > trimEnd / actualDur)

      ctx.globalAlpha = isDimmed ? 0.2 : 1
      ctx.fillStyle = grad

      const barH = Math.max(2, peak * H * 0.88)
      const x = i * barW
      const y = (H - barH) / 2
      ctx.fillRect(x, y, Math.max(1, barW - 1), barH)
    }

    ctx.globalAlpha = 1

    const phX = phPct * W
    ctx.strokeStyle = '#C8A97E'
    ctx.lineWidth = 2
    ctx.beginPath()
    ctx.moveTo(phX, 0)
    ctx.lineTo(phX, H)
    ctx.stroke()

    ctx.fillStyle = '#C8A97E'
    ctx.beginPath()
    ctx.moveTo(phX - 4, 0)
    ctx.lineTo(phX + 4, 0)
    ctx.lineTo(phX, 6)
    ctx.fill()
  }, [buffer, playheadPos, trimStart, trimEnd, duration, zoom, color])

  useEffect(() => {
    draw()
  }, [draw])

  useEffect(() => {
    const container = containerRef.current
    if (!container) return
    const observer = new ResizeObserver(() => { draw() })
    observer.observe(container)
    return () => observer.disconnect()
  }, [draw])

  const handleClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current
    if (!canvas) return
    const rect = canvas.getBoundingClientRect()
    const pct = (e.clientX - rect.left) / rect.width
    onSeek(Math.max(0, Math.min(1, pct)))
  }

  return (
    <div ref={containerRef} className="w-full h-full" style={{ background: '#13131A' }}>
      <canvas
        ref={canvasRef}
        className="w-full h-full cursor-pointer block"
        onClick={handleClick}
      />
    </div>
  )
}
