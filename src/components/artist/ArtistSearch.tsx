import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../../lib/supabase'
import { MoodPill, Spinner, EmptyState } from '../shared/UI'
import { MOOD_COLORS, MOODS, GENRES } from '../../lib/constants'
import { Search, Play, Pause, Heart, X } from 'lucide-react'
import type { Profile, Track } from '../../lib/types'
import { formatTrackDurationMmSs } from '../../lib/trackDuration'

interface ArtistSearchProps {
  profile: Profile
  onPlayTrack: (track: Track) => void
  currentTrack: Track | null
  playing: boolean
}

export function ArtistSearch({ profile, onPlayTrack, currentTrack, playing }: ArtistSearchProps) {
  const [tracks, setTracks] = useState<Track[]>([])
  const [savedTracks, setSavedTracks] = useState<Set<string>>(new Set())
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedMood, setSelectedMood] = useState('All')
  const [selectedGenre, setSelectedGenre] = useState('All')
  const [bpmRange, setBpmRange] = useState<[number, number]>([60, 180])

  const loadData = useCallback(async () => {
    setLoading(true)
    const [tracksRes, savedRes] = await Promise.all([
      supabase.from('tracks').select('*').eq('status', 'active').order('created_at', { ascending: false }),
      supabase.from('saved_tracks').select('track_id').eq('user_id', profile.id)
    ])

    if (tracksRes.data) setTracks(tracksRes.data)
    if (savedRes.data) setSavedTracks(new Set(savedRes.data.map(s => s.track_id)))
    setLoading(false)
  }, [profile.id])

  useEffect(() => {
    void loadData()
  }, [loadData])

  const toggleSave = async (e: React.MouseEvent, trackId: string) => {
    e.stopPropagation()
    if (savedTracks.has(trackId)) {
      await supabase.from('saved_tracks').delete().eq('user_id', profile.id).eq('track_id', trackId)
      setSavedTracks(prev => {
        const next = new Set(prev)
        next.delete(trackId)
        return next
      })
    } else {
      await supabase.from('saved_tracks').insert({ user_id: profile.id, track_id: trackId })
      setSavedTracks(prev => new Set([...prev, trackId]))
    }
  }

  const filteredTracks = tracks.filter(track => {
    const matchesSearch = !searchQuery ||
      track.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      track.artist.toLowerCase().includes(searchQuery.toLowerCase()) ||
      track.mood?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      track.genre?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      track.tags?.some(t => t.toLowerCase().includes(searchQuery.toLowerCase()))

    const matchesMood = selectedMood === 'All' || track.mood === selectedMood
    const matchesGenre = selectedGenre === 'All' || track.genre === selectedGenre
    const matchesBpm = !track.bpm || (track.bpm >= bpmRange[0] && track.bpm <= bpmRange[1])

    return matchesSearch && matchesMood && matchesGenre && matchesBpm
  })

  const clearAllFilters = () => {
    setSearchQuery('')
    setSelectedMood('All')
    setSelectedGenre('All')
    setBpmRange([60, 180])
  }

  const hasActiveFilters = searchQuery || selectedMood !== 'All' || selectedGenre !== 'All' ||
    bpmRange[0] !== 60 || bpmRange[1] !== 180

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full bg-[#0A0A0C]">
        <Spinner />
      </div>
    )
  }

  return (
    <div className="h-[calc(100vh-76px)] overflow-y-auto bg-[#0A0A0C]">
      <div className="p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="font-['Playfair_Display'] text-2xl font-semibold text-[#E8E8E8]">Search Catalog</h1>
            <p className="text-[#666] text-sm mt-1">Browse all tracks on the platform</p>
          </div>
          <span className="text-sm text-[#666]">{tracks.length} total tracks</span>
        </div>

        <div className="relative mb-4">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-[#666]" />
          <input
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Search by title, artist, mood, genre, or tags..."
            className="w-full bg-[#1A1A1E] border border-[#2A2A2E] rounded-full pl-12 pr-10 py-3.5 text-[#E8E8E8] placeholder-[#555] focus:outline-none focus:border-[#C8A97E] transition-colors text-sm"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-4 top-1/2 -translate-y-1/2 p-1 text-[#666] hover:text-[#E8E8E8] transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        <div className="flex items-center gap-3 pb-4 overflow-x-auto scrollbar-hide">
          <div className="flex gap-2 flex-shrink-0">
            {MOODS.map(mood => {
              const isActive = selectedMood === mood
              const moodColor = mood === 'All' ? '#C8A97E' : MOOD_COLORS[mood]
              return (
                <button
                  key={mood}
                  onClick={() => setSelectedMood(mood)}
                  className={`px-4 py-2 rounded-full text-xs font-medium transition-all whitespace-nowrap ${
                    isActive
                      ? 'text-[#0A0A0C]'
                      : 'bg-[#1A1A1E] text-[#888] hover:text-[#E8E8E8] border border-[#2A2A2E]'
                  }`}
                  style={isActive ? { backgroundColor: moodColor } : {}}
                >
                  {mood}
                </button>
              )
            })}
          </div>

          <div className="h-6 w-px bg-[#2A2A2E] flex-shrink-0" />

          <select
            value={selectedGenre}
            onChange={e => setSelectedGenre(e.target.value)}
            className="bg-[#1A1A1E] border border-[#2A2A2E] rounded-full px-4 py-2 text-xs text-[#888] focus:outline-none focus:border-[#C8A97E] appearance-none cursor-pointer flex-shrink-0"
          >
            {GENRES.map(genre => (
              <option key={genre} value={genre}>{genre === 'All' ? 'All Genres' : genre}</option>
            ))}
          </select>

          <div className="flex items-center gap-2 bg-[#1A1A1E] border border-[#2A2A2E] rounded-full px-4 py-2 flex-shrink-0">
            <span className="text-xs text-[#666]">BPM:</span>
            <input
              type="range"
              min="60"
              max="180"
              value={bpmRange[0]}
              onChange={e => setBpmRange([parseInt(e.target.value), bpmRange[1]])}
              className="w-16 h-1 bg-[#333] rounded-full appearance-none cursor-pointer accent-[#C8A97E]"
            />
            <span className="text-xs text-[#888] w-16 text-center">{bpmRange[0]}-{bpmRange[1]}</span>
            <input
              type="range"
              min="60"
              max="180"
              value={bpmRange[1]}
              onChange={e => setBpmRange([bpmRange[0], parseInt(e.target.value)])}
              className="w-16 h-1 bg-[#333] rounded-full appearance-none cursor-pointer accent-[#C8A97E]"
            />
          </div>

          {hasActiveFilters && (
            <button
              onClick={clearAllFilters}
              className="flex items-center gap-1 px-3 py-2 rounded-full text-xs text-[#FF6B9D] bg-[#FF6B9D]/10 border border-[#FF6B9D]/20 hover:bg-[#FF6B9D]/20 transition-colors flex-shrink-0"
            >
              <X className="w-3 h-3" />
              Clear
            </button>
          )}
        </div>

        <div className="flex items-center justify-between mb-4">
          <h2 className="font-['Playfair_Display'] text-lg text-white">All Tracks</h2>
          <span className="text-sm text-[#666]">{filteredTracks.length} tracks</span>
        </div>

        {filteredTracks.length > 0 ? (
          <div className="rounded-xl overflow-hidden">
            <div className="grid grid-cols-[40px_minmax(200px,2fr)_1fr_80px_100px_80px_80px_40px] gap-4 px-4 py-3 text-xs text-[#666] uppercase tracking-wider border-b border-[#1A1A1E]">
              <span>#</span>
              <span>Title</span>
              <span>Genre</span>
              <span>BPM</span>
              <span>Mood</span>
              <span>Duration</span>
              <span>Catalog</span>
              <span className="text-right">Save</span>
            </div>
            {filteredTracks.map((track, index) => (
              <TrackRow
                key={track.id}
                track={track}
                index={index + 1}
                isPlaying={currentTrack?.id === track.id && playing}
                isSaved={savedTracks.has(track.id)}
                onPlay={() => onPlayTrack(track)}
                onToggleSave={(e) => toggleSave(e, track.id)}
              />
            ))}
          </div>
        ) : (
          <EmptyState
            icon={<Search className="w-12 h-12" />}
            title="No tracks found"
            description="Try adjusting your search or filters"
          />
        )}
      </div>
    </div>
  )
}

interface TrackRowProps {
  track: Track
  index: number
  isPlaying: boolean
  isSaved: boolean
  onPlay: () => void
  onToggleSave: (e: React.MouseEvent) => void
}

function TrackRow({ track, index, isPlaying, isSaved, onPlay, onToggleSave }: TrackRowProps) {
  const [hovered, setHovered] = useState(false)
  const artworkColor = (track as Track & { artwork_color?: string }).artwork_color
  const moodColor = artworkColor || (track.mood ? MOOD_COLORS[track.mood] : '#C8A97E')

  return (
    <div
      className={`grid grid-cols-[40px_minmax(200px,2fr)_1fr_80px_100px_80px_80px_40px] gap-4 px-4 py-3 items-center cursor-pointer transition-colors ${
        hovered ? 'bg-[#1A1A1E]' : index % 2 === 0 ? 'bg-[#0D0D10]' : 'bg-transparent'
      } ${isPlaying ? 'bg-[#C8A97E]/10' : ''}`}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onClick={onPlay}
    >
      <div className="flex items-center justify-center">
        {hovered ? (
          isPlaying ? (
            <Pause className="w-4 h-4 text-[#C8A97E]" />
          ) : (
            <Play className="w-4 h-4 text-[#E8E8E8] ml-0.5" />
          )
        ) : (
          <span className={`text-sm ${isPlaying ? 'text-[#C8A97E]' : 'text-[#666]'}`}>{index}</span>
        )}
      </div>

      <div className="flex items-center gap-3 min-w-0">
        <div
          className="w-10 h-10 rounded flex-shrink-0 flex items-center justify-center"
          style={{ background: `linear-gradient(135deg, ${moodColor}60 0%, #1A1A1E 100%)` }}
        >
          <span className="text-sm font-semibold text-white/80">
            {track.title.charAt(0).toUpperCase()}
          </span>
        </div>
        <div className="min-w-0">
          <p className={`text-sm font-medium truncate ${isPlaying ? 'text-[#C8A97E]' : 'text-[#E8E8E8]'}`}>
            {track.title}
          </p>
          <p className="text-xs text-[#666] truncate">{track.artist}</p>
        </div>
      </div>

      <span className="text-sm text-[#888] truncate">{track.genre || '-'}</span>

      <span className="text-sm text-[#888]">{track.bpm || '-'}</span>

      <div>
        {track.mood ? <MoodPill mood={track.mood} /> : <span className="text-sm text-[#555]">-</span>}
      </div>

      <span className="text-sm text-[#888]">{formatTrackDurationMmSs(track)}</span>

      <span className="text-sm text-[#888] capitalize">{track.status || '-'}</span>

      <div className="flex justify-end" onClick={e => e.stopPropagation()}>
        <button
          onClick={onToggleSave}
          className={`p-1.5 rounded-full transition-colors ${
            isSaved ? 'text-[#FF6B9D]' : hovered ? 'text-[#888] hover:text-[#FF6B9D]' : 'text-[#555]'
          }`}
        >
          <Heart className={`w-4 h-4 ${isSaved ? 'fill-current' : ''}`} />
        </button>
      </div>
    </div>
  )
}
