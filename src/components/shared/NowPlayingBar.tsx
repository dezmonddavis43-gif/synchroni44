import { useState } from 'react'
import { Play, Pause, Volume2, VolumeX, SkipBack, SkipForward, Heart } from 'lucide-react'
import { MobilePlayer } from './MobilePlayer'
import { MOOD_COLORS } from '../../lib/constants'
import type { Track } from '../../lib/types'
import { ArtistLink } from './ArtistLink'

interface NowPlayingBarProps {
  currentTrack: Track | null
  playing: boolean
  progress: number
  duration: number
  volume: number
  onTogglePlay: () => void
  onSeek: (time: number) => void
  onVolumeChange: (volume: number) => void
  onPrevious?: () => void
  onNext?: () => void
  isFavorite?: boolean
  onToggleFavorite?: () => void
}

function formatTime(seconds: number): string {
  if (!seconds || isNaN(seconds)) return '0:00'
  const mins = Math.floor(seconds / 60)
  const secs = Math.floor(seconds % 60)
  return `${mins}:${secs.toString().padStart(2, '0')}`
}

export function NowPlayingBar({
  currentTrack,
  playing,
  progress,
  duration,
  volume,
  onTogglePlay,
  onSeek,
  onVolumeChange,
  onPrevious,
  onNext,
  isFavorite,
  onToggleFavorite,
}: NowPlayingBarProps) {
  const [showMobilePlayer, setShowMobilePlayer] = useState(false)

  const handleProgressClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect()
    const x = e.clientX - rect.left
    const percentage = x / rect.width
    onSeek(percentage * duration)
  }

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onVolumeChange(parseFloat(e.target.value))
  }

  const handleMobileBarClick = (e: React.MouseEvent) => {
    const target = e.target as HTMLElement
    if (!target.closest('button')) {
      setShowMobilePlayer(true)
    }
  }

  const artworkColor = (currentTrack as Track & { artwork_color?: string })?.artwork_color
  const moodColor = artworkColor || (currentTrack?.mood ? MOOD_COLORS[currentTrack.mood] : '#C8A97E')

  return (
    <>
      <div className="fixed left-0 right-0 bottom-0 h-[68px] bg-[#0D0D10] border-t border-[#1A1A1E] z-40 hidden md:flex items-center px-4">
        <div className="flex items-center gap-4 w-[280px]">
          <div
            className="w-12 h-12 rounded flex items-center justify-center flex-shrink-0"
            style={{ background: `linear-gradient(135deg, ${moodColor}60 0%, #1A1A1E 100%)` }}
          >
            {currentTrack && (
              <span className="text-sm font-semibold text-white/80">{currentTrack.title.charAt(0).toUpperCase()}</span>
            )}
          </div>

          {currentTrack ? (
            <div className="flex-1 min-w-0">
              <p className="text-[#E8E8E8] text-sm font-medium truncate">{currentTrack.title}</p>
              <ArtistLink artistName={currentTrack.artist} className="text-[#666] text-xs truncate block" />
            </div>
          ) : (
            <div className="flex-1">
              <p className="text-[#555] text-sm">No track selected</p>
            </div>
          )}
        </div>

        <div className="flex-1 flex flex-col items-center gap-1 max-w-[600px] mx-auto">
          <div className="flex items-center gap-4">
            {onPrevious && (
              <button
                onClick={onPrevious}
                disabled={!currentTrack}
                className="p-2 text-[#888] hover:text-[#E8E8E8] transition-colors disabled:opacity-50"
              >
                <SkipBack className="w-5 h-5" />
              </button>
            )}

            <button
              onClick={onTogglePlay}
              disabled={!currentTrack}
              className="w-10 h-10 rounded-full bg-[#C8A97E] flex items-center justify-center hover:bg-[#D4B88A] transition-colors disabled:opacity-50"
            >
              {playing ? (
                <Pause className="w-5 h-5 text-[#0A0A0C]" />
              ) : (
                <Play className="w-5 h-5 text-[#0A0A0C] ml-0.5" />
              )}
            </button>

            {onNext && (
              <button
                onClick={onNext}
                disabled={!currentTrack}
                className="p-2 text-[#888] hover:text-[#E8E8E8] transition-colors disabled:opacity-50"
              >
                <SkipForward className="w-5 h-5" />
              </button>
            )}
          </div>

          <div className="w-full flex items-center gap-2">
            <span className="text-[#555] text-xs w-10 text-right">{formatTime(progress)}</span>
            <div
              className="flex-1 h-1 bg-[#2A2A2E] rounded-full cursor-pointer group"
              onClick={handleProgressClick}
            >
              <div
                className="h-full bg-[#C8A97E] rounded-full relative"
                style={{ width: duration ? `${(progress / duration) * 100}%` : '0%' }}
              >
                <div className="absolute right-0 top-1/2 -translate-y-1/2 w-3 h-3 bg-[#E8E8E8] rounded-full opacity-0 group-hover:opacity-100 transition-opacity" />
              </div>
            </div>
            <span className="text-[#555] text-xs w-10">{formatTime(duration)}</span>
          </div>
        </div>

        <div className="flex items-center gap-4 w-[280px] justify-end">
          {onToggleFavorite && (
            <button
              type="button"
              onClick={e => {
                e.stopPropagation()
                onToggleFavorite()
              }}
              disabled={!currentTrack}
              className={`p-2 rounded-lg transition-colors disabled:opacity-40 ${
                isFavorite ? 'text-[#FF6B9D]' : 'text-[#666] hover:text-[#FF6B9D]'
              }`}
              title={isFavorite ? 'Remove from saved' : 'Save track'}
            >
              <Heart className={`w-5 h-5 ${isFavorite ? 'fill-current' : ''}`} />
            </button>
          )}
          <div className="flex items-center gap-2">
            <button
              onClick={() => onVolumeChange(volume > 0 ? 0 : 0.8)}
              className="text-[#666] hover:text-[#E8E8E8] transition-colors"
            >
              {volume > 0 ? <Volume2 className="w-5 h-5" /> : <VolumeX className="w-5 h-5" />}
            </button>
            <input
              type="range"
              min="0"
              max="1"
              step="0.01"
              value={volume}
              onChange={handleVolumeChange}
              className="w-20 h-1 bg-[#2A2A2E] rounded-full appearance-none cursor-pointer accent-[#C8A97E]"
            />
          </div>
        </div>
      </div>

      <div
        className="fixed left-0 right-0 bg-[#0D0D10] border-t border-[#1A1A1E] z-40 flex md:hidden items-center px-3 cursor-pointer"
        style={{ bottom: 'calc(60px + env(safe-area-inset-bottom))', height: '60px' }}
        onClick={handleMobileBarClick}
      >
        <div
          className="w-11 h-11 rounded flex items-center justify-center flex-shrink-0 mr-3"
          style={{ background: `linear-gradient(135deg, ${moodColor}60 0%, #1A1A1E 100%)` }}
        >
          {currentTrack && (
            <span className="text-xs font-semibold text-white/80">{currentTrack.title.charAt(0).toUpperCase()}</span>
          )}
        </div>

        {currentTrack ? (
          <div className="flex-1 min-w-0">
            <p className="text-[#E8E8E8] text-sm font-medium truncate">{currentTrack.title}</p>
            <ArtistLink artistName={currentTrack.artist} className="text-[#666] text-xs truncate block" />
          </div>
        ) : (
          <div className="flex-1">
            <p className="text-[#555] text-sm">No track selected</p>
          </div>
        )}

        <div className="flex items-center gap-1">
          <button
            onClick={onTogglePlay}
            disabled={!currentTrack}
            className="w-10 h-10 rounded-full bg-[#C8A97E] flex items-center justify-center disabled:opacity-50"
          >
            {playing ? <Pause className="w-5 h-5 text-[#0A0A0C]" /> : <Play className="w-5 h-5 text-[#0A0A0C] ml-0.5" />}
          </button>
          {onNext && (
            <button onClick={onNext} disabled={!currentTrack} className="p-2 text-[#888] disabled:opacity-50">
              <SkipForward className="w-5 h-5" />
            </button>
          )}
        </div>
      </div>

      {showMobilePlayer && (
        <MobilePlayer
          currentTrack={currentTrack}
          playing={playing}
          progress={progress}
          duration={duration}
          volume={volume}
          onTogglePlay={onTogglePlay}
          onSeek={onSeek}
          onVolumeChange={onVolumeChange}
          onPrevious={onPrevious}
          onNext={onNext}
          onClose={() => setShowMobilePlayer(false)}
        />
      )}
    </>
  )
}
