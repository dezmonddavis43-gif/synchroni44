import { useEffect, useRef } from 'react'

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

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const W = canvas.width
    const H = canvas.height
    ctx.clearRect(0, 0, W, H)

    const bg = '#13131A'
    ctx.fillStyle = bg
    ctx.fillRect(0, 0, W, H)

    if (!buffer) {
      ctx.strokeStyle = '#2A2A35'
      ctx.lineWidth = 1
      ctx.beginPath()
      ctx.moveTo(0, H / 2)
      ctx.lineTo(W, H / 2)
      ctx.stroke()
      return
    }

    const rawData = buffer.getChannelData(0)
    const samples = rawData.length
    const barWidth = Math.max(1, zoom)
    const numBars = Math.floor(W / barWidth)
    const samplesPerBar = Math.floor(samples / numBars)

    const grad = ctx.createLinearGradient(0, 0, 0, H)
    grad.addColorStop(0, '#7B9CFF')
    grad.addColorStop(1, color || '#C8A97E')

    for (let i = 0; i < numBars; i++) {
      let max = 0
      const start = i * samplesPerBar
      for (let j = 0; j < samplesPerBar; j++) {
        const val = Math.abs(rawData[start + j] || 0)
        if (val > max) max = val
      }

      const pct = i / numBars
      const isDimmed =
        (duration > 0 && pct < trimStart / duration) ||
        (duration > 0 && pct > trimEnd / duration)

      ctx.globalAlpha = isDimmed ? 0.25 : 1
      ctx.fillStyle = grad

      const barH = Math.max(1, max * H * 0.9)
      const x = i * barWidth
      const y = (H - barH) / 2
      ctx.fillRect(x, y, Math.max(1, barWidth - 1), barH)
    }

    ctx.globalAlpha = 1

    const phX = (playheadPos / Math.max(duration, 1)) * W
    ctx.strokeStyle = '#C8A97E'
    ctx.lineWidth = 1.5
    ctx.beginPath()
    ctx.moveTo(phX, 0)
    ctx.lineTo(phX, H)
    ctx.stroke()
  }, [buffer, playheadPos, trimStart, trimEnd, duration, zoom, color])

  const handleClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current
    if (!canvas) return
    const rect = canvas.getBoundingClientRect()
    const pct = (e.clientX - rect.left) / rect.width
    onSeek(Math.max(0, Math.min(1, pct)))
  }

  return (
    <canvas
      ref={canvasRef}
      width={800}
      height={56}
      className="w-full h-full cursor-pointer"
      onClick={handleClick}
    />
  )
}
