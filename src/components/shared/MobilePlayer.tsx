import { useState, useRef, useEffect } from 'react'
import { Play, Pause, Volume2, VolumeX, SkipBack, SkipForward, Shuffle, Repeat, Repeat1, Heart, ChevronDown, ListPlus } from 'lucide-react'
import { MoodPill } from './UI'
import { ArtistLink } from './ArtistLink'
import { MOOD_COLORS } from '../../lib/constants'
import type { Track } from '../../lib/types'

interface MobilePlayerProps {
  currentTrack: Track | null
  playing: boolean
  progress: number
  duration: number
  volume: number
  shuffle?: boolean
  repeat?: 'off' | 'all' | 'one'
  isSaved?: boolean
  onTogglePlay: () => void
  onSeek: (time: number) => void
  onVolumeChange: (volume: number) => void
  onPrevious?: () => void
  onNext?: () => void
  onToggleShuffle?: () => void
  onToggleRepeat?: () => void
  onToggleSave?: () => void
  onClose: () => void
}

function formatTime(seconds: number): string {
  if (!seconds || isNaN(seconds)) return '0:00'
  const mins = Math.floor(seconds / 60)
  const secs = Math.floor(seconds % 60)
  return `${mins}:${secs.toString().padStart(2, '0')}`
}

export function MobilePlayer({
  currentTrack,
  playing,
  progress,
  duration,
  volume,
  shuffle = false,
  repeat = 'off',
  isSaved = false,
  onTogglePlay,
  onSeek,
  onVolumeChange,
  onPrevious,
  onNext,
  onToggleShuffle,
  onToggleRepeat,
  onToggleSave,
  onClose
}: MobilePlayerProps) {
  const [isDragging, setIsDragging] = useState(false)
  const [dragProgress, setDragProgress] = useState(0)
  const progressRef = useRef<HTMLDivElement>(null)
  const startY = useRef(0)
  const currentY = useRef(0)
  const [translateY, setTranslateY] = useState(0)

  const moodColor = currentTrack?.mood ? MOOD_COLORS[currentTrack.mood] || '#C8A97E' : '#C8A97E'
  const RepeatIcon = repeat === 'one' ? Repeat1 : Repeat

  const handleProgressTouch = (e: React.TouchEvent) => {
    if (!progressRef.current) return
    const rect = progressRef.current.getBoundingClientRect()
    const x = e.touches[0].clientX - rect.left
    const percentage = Math.max(0, Math.min(1, x / rect.width))
    setDragProgress(percentage * duration)
  }

  const handleProgressTouchEnd = () => {
    if (isDragging) {
      onSeek(dragProgress)
    }
    setIsDragging(false)
  }

  const handleSwipeStart = (e: React.TouchEvent) => {
    startY.current = e.touches[0].clientY
    currentY.current = e.touches[0].clientY
  }

  const handleSwipeMove = (e: React.TouchEvent) => {
    currentY.current = e.touches[0].clientY
    const diff = currentY.current - startY.current
    if (diff > 0) {
      setTranslateY(diff)
    }
  }

  const handleSwipeEnd = () => {
    if (translateY > 100) {
      onClose()
    }
    setTranslateY(0)
  }

  useEffect(() => {
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = ''
    }
  }, [])

  if (!currentTrack) return null

  const displayProgress = isDragging ? dragProgress : progress

  return (
    <div
      className="fixed inset-0 z-[100] flex flex-col md:hidden"
      style={{
        background: `linear-gradient(180deg, ${moodColor}40 0%, #0A0A0C 40%)`,
        transform: `translateY(${translateY}px)`,
        transition: translateY === 0 ? 'transform 0.3s ease-out' : 'none'
      }}
    >
      <div
        className="flex-shrink-0 pt-3 pb-4 px-6"
        onTouchStart={handleSwipeStart}
        onTouchMove={handleSwipeMove}
        onTouchEnd={handleSwipeEnd}
      >
        <div className="flex justify-center mb-4">
          <div className="w-10 h-1 bg-white/30 rounded-full" />
        </div>
        <div className="flex items-center justify-between">
          <button
            onClick={onClose}
            className="p-2 -ml-2 text-white/60 touch-manipulation"
            style={{ minWidth: '44px', minHeight: '44px' }}
          >
            <ChevronDown className="w-6 h-6" />
          </button>
          <span className="text-xs text-white/60 uppercase tracking-wider font-medium">
            Now Playing
          </span>
          <div style={{ width: '44px' }} />
        </div>
      </div>

      <div className="flex-1 flex flex-col items-center justify-center px-8 overflow-hidden">
        <div
          className="w-[260px] h-[260px] rounded-2xl flex items-center justify-center mb-8 shadow-2xl"
          style={{ background: `linear-gradient(135deg, ${moodColor}99 0%, #0A0A0C 100%)` }}
        >
          <div className="w-24 h-24 rounded-full bg-black/20 backdrop-blur-sm flex items-center justify-center">
            <span className="text-5xl font-bold text-white/80">
              {currentTrack.title.charAt(0).toUpperCase()}
            </span>
          </div>
        </div>

        <div className="w-full text-center mb-6">
          <h2 className="font-['Playfair_Display'] text-2xl text-white font-semibold mb-1 truncate px-4">
            {currentTrack.title}
          </h2>
          <ArtistLink artistName={currentTrack.artist} className="text-white/60 text-base truncate px-4 block" />
          {currentTrack.mood && (
            <div className="mt-3 flex justify-center">
              <MoodPill mood={currentTrack.mood} />
            </div>
          )}
        </div>

        <div className="w-full mb-6">
          <div
            ref={progressRef}
            className="w-full h-2 bg-white/20 rounded-full touch-manipulation"
            onTouchStart={(e) => { setIsDragging(true); handleProgressTouch(e) }}
            onTouchMove={handleProgressTouch}
            onTouchEnd={handleProgressTouchEnd}
          >
            <div
              className="h-full bg-[#C8A97E] rounded-full relative"
              style={{ width: `${duration ? (displayProgress / duration) * 100 : 0}%` }}
            >
              <div className="absolute right-0 top-1/2 -translate-y-1/2 w-4 h-4 bg-white rounded-full shadow-lg" />
            </div>
          </div>
          <div className="flex justify-between mt-2">
            <span className="text-xs text-white/40">{formatTime(displayProgress)}</span>
            <span className="text-xs text-white/40">{formatTime(duration)}</span>
          </div>
        </div>

        <div className="flex items-center justify-center gap-6 mb-8">
          {onToggleShuffle && (
            <button
              onClick={onToggleShuffle}
              className={`p-3 rounded-full transition-colors touch-manipulation ${
                shuffle ? 'text-[#C8A97E]' : 'text-white/40'
              }`}
              style={{ minWidth: '44px', minHeight: '44px' }}
            >
              <Shuffle className="w-5 h-5" />
            </button>
          )}

          {onPrevious && (
            <button
              onClick={onPrevious}
              className="p-3 text-white touch-manipulation"
              style={{ minWidth: '44px', minHeight: '44px' }}
            >
              <SkipBack className="w-7 h-7" />
            </button>
          )}

          <button
            onClick={onTogglePlay}
            className="w-[56px] h-[56px] rounded-full bg-[#C8A97E] flex items-center justify-center shadow-lg touch-manipulation"
          >
            {playing ? (
              <Pause className="w-7 h-7 text-[#0A0A0C]" />
            ) : (
              <Play className="w-7 h-7 text-[#0A0A0C] ml-1" />
            )}
          </button>

          {onNext && (
            <button
              onClick={onNext}
              className="p-3 text-white touch-manipulation"
              style={{ minWidth: '44px', minHeight: '44px' }}
            >
              <SkipForward className="w-7 h-7" />
            </button>
          )}

          {onToggleRepeat && (
            <button
              onClick={onToggleRepeat}
              className={`p-3 rounded-full transition-colors touch-manipulation ${
                repeat !== 'off' ? 'text-[#C8A97E]' : 'text-white/40'
              }`}
              style={{ minWidth: '44px', minHeight: '44px' }}
            >
              <RepeatIcon className="w-5 h-5" />
            </button>
          )}
        </div>

        <div className="w-full flex items-center gap-4 mb-6">
          <button
            onClick={() => onVolumeChange(volume > 0 ? 0 : 0.8)}
            className="text-white/60 touch-manipulation"
            style={{ minWidth: '44px', minHeight: '44px' }}
          >
            {volume > 0 ? (
              <Volume2 className="w-5 h-5" />
            ) : (
              <VolumeX className="w-5 h-5" />
            )}
          </button>
          <input
            type="range"
            min="0"
            max="1"
            step="0.01"
            value={volume}
            onChange={(e) => onVolumeChange(parseFloat(e.target.value))}
            className="flex-1 h-1 bg-white/20 rounded-full appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-white"
          />
        </div>

        <div className="flex items-center gap-8">
          {onToggleSave && (
            <button
              onClick={onToggleSave}
              className={`flex flex-col items-center gap-1 touch-manipulation ${
                isSaved ? 'text-[#FF6B9D]' : 'text-white/60'
              }`}
              style={{ minWidth: '44px', minHeight: '44px' }}
            >
              <Heart className={`w-6 h-6 ${isSaved ? 'fill-current' : ''}`} />
              <span className="text-[10px] uppercase tracking-wider">Save</span>
            </button>
          )}
          <button
            className="flex flex-col items-center gap-1 text-white/60 touch-manipulation"
            style={{ minWidth: '44px', minHeight: '44px' }}
          >
            <ListPlus className="w-6 h-6" />
            <span className="text-[10px] uppercase tracking-wider">Add</span>
          </button>
        </div>
      </div>

      <div
        className="flex-shrink-0 h-8"
        style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
      />
    </div>
  )
}
