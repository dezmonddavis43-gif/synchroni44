import { useState, useEffect, useRef, useCallback } from 'react'
import { supabase } from '../../lib/supabase'
import { MoodPill, Spinner, EmptyState } from '../shared/UI'
import { MOOD_COLORS, MOODS, GENRES } from '../../lib/constants'
import {
  Search, Play, Pause, Heart, ChevronRight, ChevronLeft, X, ListPlus,
  Clock, CheckCircle
} from 'lucide-react'
import type { Profile, Track } from '../../lib/types'
import { formatTrackDurationMmSs } from '../../lib/trackDuration'

interface MyLibraryProps {
  profile: Profile
  onPlayTrack: (track: Track) => void
  currentTrack: Track | null
  playing: boolean
}

type LibraryTab = 'saved' | 'recent' | 'licensed'

const LIBRARY_TABS: { id: LibraryTab; label: string; icon: React.ReactNode }[] = [
  { id: 'saved', label: 'Saved Tracks', icon: <Heart className="w-4 h-4" /> },
  { id: 'recent', label: 'Recently Played', icon: <Clock className="w-4 h-4" /> },
  { id: 'licensed', label: 'Licensed', icon: <CheckCircle className="w-4 h-4" /> }
]

function getMoodGradient(mood?: string): string {
  const color = mood ? MOOD_COLORS[mood] || '#C8A97E' : '#C8A97E'
  return `linear-gradient(135deg, ${color}99 0%, #0A0A0C 100%)`
}

export function MyLibrary({ profile, onPlayTrack, currentTrack, playing }: MyLibraryProps) {
  const [savedTracks, setSavedTracks] = useState<Track[]>([])
  const [recentTracks, setRecentTracks] = useState<Track[]>([])
  const [licensedTracks, setLicensedTracks] = useState<Track[]>([])
  const [savedTrackIds, setSavedTrackIds] = useState<Set<string>>(new Set())
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<LibraryTab>('saved')

  const [searchQuery, setSearchQuery] = useState('')
  const [selectedMood, setSelectedMood] = useState('All')
  const [selectedGenre, setSelectedGenre] = useState('All')
  const [bpmRange, setBpmRange] = useState<[number, number]>([60, 180])

  const featuredScrollRef = useRef<HTMLDivElement>(null)

  const loadData = useCallback(async () => {
    setLoading(true)

    const thirtyDaysAgo = new Date()
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

    const [savedRes, recentRes, licensedRes] = await Promise.all([
      supabase
        .from('saved_tracks')
        .select('track_id, tracks(*)')
        .eq('user_id', profile.id)
        .order('created_at', { ascending: false }),

      supabase
        .from('track_analytics')
        .select('track_id, tracks(*)')
        .eq('user_id', profile.id)
        .eq('event_type', 'play')
        .gte('created_at', thirtyDaysAgo.toISOString())
        .order('created_at', { ascending: false }),

      supabase
        .from('license_requests')
        .select('track_id, tracks(*)')
        .eq('user_id', profile.id)
        .eq('status', 'approved')
    ])

    if (savedRes.data) {
      const tracks = savedRes.data
        .map(s => s.tracks as unknown as Track)
        .filter(Boolean)
      setSavedTracks(tracks)
      setSavedTrackIds(new Set(tracks.map(t => t.id)))
    }

    if (recentRes.data) {
      const trackMap = new Map<string, Track>()
      recentRes.data.forEach(r => {
        const track = r.tracks as unknown as Track
        if (track && !trackMap.has(track.id)) {
          trackMap.set(track.id, track)
        }
      })
      setRecentTracks(Array.from(trackMap.values()))
    }

    if (licensedRes.data) {
      const tracks = licensedRes.data
        .map(l => l.tracks as unknown as Track)
        .filter(Boolean)
      setLicensedTracks(tracks)
    }

    setLoading(false)
  }, [profile.id])

  useEffect(() => {
    void loadData()
  }, [loadData])

  const toggleSave = async (e: React.MouseEvent, trackId: string) => {
    e.stopPropagation()
    if (savedTrackIds.has(trackId)) {
      await supabase.from('saved_tracks').delete().eq('user_id', profile.id).eq('track_id', trackId)
      setSavedTrackIds(prev => {
        const next = new Set(prev)
        next.delete(trackId)
        return next
      })
      setSavedTracks(prev => prev.filter(t => t.id !== trackId))
    } else {
      await supabase.from('saved_tracks').insert({ user_id: profile.id, track_id: trackId })
      setSavedTrackIds(prev => new Set([...prev, trackId]))
    }
  }

  const getCurrentTracks = (): Track[] => {
    switch (activeTab) {
      case 'saved': return savedTracks
      case 'recent': return recentTracks
      case 'licensed': return licensedTracks
      default: return savedTracks
    }
  }

  const filteredTracks = getCurrentTracks().filter(track => {
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

  const recentlySaved = savedTracks.slice(0, 8)

  const scroll = (ref: React.RefObject<HTMLDivElement | null>, direction: 'left' | 'right') => {
    if (ref.current) {
      const scrollAmount = direction === 'left' ? -300 : 300
      ref.current.scrollBy({ left: scrollAmount, behavior: 'smooth' })
    }
  }

  const clearAllFilters = () => {
    setSearchQuery('')
    setSelectedMood('All')
    setSelectedGenre('All')
    setBpmRange([60, 180])
  }

  const hasActiveFilters = searchQuery || selectedMood !== 'All' || selectedGenre !== 'All' ||
    bpmRange[0] !== 60 || bpmRange[1] !== 180

  const getEmptyMessage = () => {
    switch (activeTab) {
      case 'saved':
        return { title: 'No saved tracks', description: 'Heart tracks in Discover to save them here' }
      case 'recent':
        return { title: 'No recently played tracks', description: 'Tracks you play will appear here' }
      case 'licensed':
        return { title: 'No licensed tracks', description: 'Licensed tracks will appear here' }
      default:
        return { title: 'No tracks', description: '' }
    }
  }

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
            <h1 className="font-['Playfair_Display'] text-2xl font-semibold text-[#E8E8E8]">My Library</h1>
            <p className="text-[#666] text-sm mt-1">Your saved and recently played tracks</p>
          </div>
        </div>

        <div className="flex gap-1 mb-6 border-b border-[#1A1A1E]">
          {LIBRARY_TABS.map(tab => {
            const count = tab.id === 'saved' ? savedTracks.length :
                         tab.id === 'recent' ? recentTracks.length : licensedTracks.length
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-4 py-3 text-sm font-medium transition-colors relative ${
                  activeTab === tab.id ? 'text-[#E8E8E8]' : 'text-[#666] hover:text-[#888]'
                }`}
              >
                {tab.icon}
                {tab.label}
                <span className="text-xs text-[#555]">({count})</span>
                {activeTab === tab.id && (
                  <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#C8A97E]" />
                )}
              </button>
            )
          })}
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

        {activeTab === 'saved' && recentlySaved.length > 0 && !hasActiveFilters && (
          <section className="mb-8">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-['Playfair_Display'] text-lg text-white">Recently Saved</h2>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => scroll(featuredScrollRef, 'left')}
                  className="p-1.5 rounded-full bg-[#1A1A1E] text-[#888] hover:text-white transition-colors"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <button
                  onClick={() => scroll(featuredScrollRef, 'right')}
                  className="p-1.5 rounded-full bg-[#1A1A1E] text-[#888] hover:text-white transition-colors"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
            <div
              ref={featuredScrollRef}
              className="flex gap-4 overflow-x-auto scrollbar-hide pb-2"
            >
              {recentlySaved.map(track => (
                <FeaturedCard
                  key={track.id}
                  track={track}
                  isPlaying={currentTrack?.id === track.id && playing}
                  isSaved={savedTrackIds.has(track.id)}
                  onPlay={() => onPlayTrack(track)}
                  onToggleSave={(e) => toggleSave(e, track.id)}
                />
              ))}
            </div>
          </section>
        )}

        <section>
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-['Playfair_Display'] text-lg text-white">
              {LIBRARY_TABS.find(t => t.id === activeTab)?.label}
            </h2>
            <span className="text-sm text-[#666]">{filteredTracks.length} tracks</span>
          </div>

          {filteredTracks.length > 0 ? (
            <div className="rounded-xl overflow-hidden">
              <div className="grid grid-cols-[36px_minmax(0,1fr)_52px_auto] md:grid-cols-[40px_minmax(200px,2fr)_1fr_80px_100px_80px_80px_120px] gap-2 md:gap-4 px-3 md:px-4 py-3 text-xs text-[#666] uppercase tracking-wider border-b border-[#1A1A1E]">
                <span>#</span>
                <span>Title</span>
                <span className="hidden md:block">Genre</span>
                <span className="hidden md:block">BPM</span>
                <span className="hidden md:block">Mood</span>
                <span>Duration</span>
                <span className="hidden md:block">Catalog</span>
                <span className="text-right">Actions</span>
              </div>
              {filteredTracks.map((track, index) => (
                <TrackRow
                  key={track.id}
                  track={track}
                  index={index + 1}
                  isPlaying={currentTrack?.id === track.id && playing}
                  isSaved={savedTrackIds.has(track.id)}
                  onPlay={() => onPlayTrack(track)}
                  onToggleSave={(e) => toggleSave(e, track.id)}
                />
              ))}
            </div>
          ) : (
            <EmptyState
              icon={<Heart className="w-12 h-12" />}
              title={getEmptyMessage().title}
              description={getEmptyMessage().description}
            />
          )}
        </section>
      </div>
    </div>
  )
}

interface TrackCardProps {
  track: Track
  isPlaying: boolean
  isSaved: boolean
  onPlay: () => void
  onToggleSave: (e: React.MouseEvent) => void
}

function FeaturedCard({ track, isPlaying, isSaved, onPlay, onToggleSave }: TrackCardProps) {
  const [hovered, setHovered] = useState(false)

  return (
    <div
      className="flex-shrink-0 w-[180px] group cursor-pointer"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onClick={onPlay}
    >
      <div
        className="relative w-[180px] h-[180px] rounded-lg overflow-hidden mb-3"
        style={{ background: getMoodGradient(track.mood) }}
      >
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="w-16 h-16 rounded-full bg-black/20 backdrop-blur-sm flex items-center justify-center">
            <span className="text-3xl font-bold text-white/80">
              {track.title.charAt(0).toUpperCase()}
            </span>
          </div>
        </div>

        <div className={`absolute inset-0 bg-black/40 flex items-center justify-center transition-opacity ${hovered ? 'opacity-100' : 'opacity-0'}`}>
          <button className="w-14 h-14 rounded-full bg-[#C8A97E] flex items-center justify-center shadow-lg transform transition-transform hover:scale-105">
            {isPlaying ? (
              <Pause className="w-6 h-6 text-[#0A0A0C]" />
            ) : (
              <Play className="w-6 h-6 text-[#0A0A0C] ml-1" />
            )}
          </button>
        </div>

        {track.mood && (
          <div className="absolute top-3 left-3">
            <MoodPill mood={track.mood} />
          </div>
        )}

        <button
          onClick={onToggleSave}
          className={`absolute top-3 right-3 p-2 rounded-full transition-all ${
            hovered || isSaved ? 'opacity-100' : 'opacity-0'
          } ${isSaved ? 'text-[#FF6B9D]' : 'text-white hover:text-[#FF6B9D]'}`}
        >
          <Heart className={`w-4 h-4 ${isSaved ? 'fill-current' : ''}`} />
        </button>
      </div>

      <h3 className="text-[#E8E8E8] font-medium text-sm truncate">{track.title}</h3>
      <p className="text-[#666] text-xs truncate">{track.artist}</p>
    </div>
  )
}

interface TrackRowProps extends TrackCardProps {
  index: number
}

function TrackRow({ track, index, isPlaying, isSaved, onPlay, onToggleSave }: TrackRowProps) {
  const [hovered, setHovered] = useState(false)
  const moodColor = track.mood ? MOOD_COLORS[track.mood] : '#C8A97E'

  return (
    <div
      className={`grid grid-cols-[36px_minmax(0,1fr)_52px_auto] md:grid-cols-[40px_minmax(200px,2fr)_1fr_80px_100px_80px_80px_120px] gap-2 md:gap-4 px-3 md:px-4 py-3 items-center cursor-pointer transition-colors ${
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

      <span className="hidden md:block text-sm text-[#888] truncate">{track.genre || '-'}</span>

      <span className="hidden md:block text-sm text-[#888]">{track.bpm || '-'}</span>

      <div className="hidden md:block">
        {track.mood ? <MoodPill mood={track.mood} /> : <span className="text-sm text-[#555]">-</span>}
      </div>

      <span className="text-sm text-[#888] tabular-nums">{formatTrackDurationMmSs(track)}</span>

      <span className="hidden md:block text-sm text-[#888] capitalize">{track.status || '-'}</span>

      <div className="flex items-center justify-end gap-1" onClick={e => e.stopPropagation()}>
        <button
          onClick={onToggleSave}
          className={`p-1.5 rounded transition-colors ${
            isSaved ? 'text-[#FF6B9D]' : 'text-[#888] hover:text-[#FF6B9D]'
          }`}
          title={isSaved ? 'Remove from library' : 'Save to library'}
        >
          <Heart className={`w-4 h-4 ${isSaved ? 'fill-current' : ''}`} />
        </button>
        <button
          className="p-1.5 rounded text-[#888] hover:text-[#E8E8E8] hover:bg-[#2A2A2E] transition-colors"
          title="Add to playlist"
        >
          <ListPlus className="w-4 h-4" />
        </button>
      </div>
    </div>
  )
}
