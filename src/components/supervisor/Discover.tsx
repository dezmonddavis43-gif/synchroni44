import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import { supabase } from '../../lib/supabase'
import { MoodPill, ClearanceBadge, Spinner, EmptyState } from '../shared/UI'
import { MOOD_COLORS, MOODS, GENRES } from '../../lib/constants'
import { Search, Play, Pause, Heart, ChevronRight, ChevronLeft, X, ListPlus } from 'lucide-react'
import type { Profile, Track } from '../../lib/types'
import { ArtistLink } from '../shared/ArtistLink'

function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value)

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value)
    }, delay)

    return () => {
      clearTimeout(handler)
    }
  }, [value, delay])

  return debouncedValue
}

interface DiscoverProps {
  profile: Profile | null
  onPlayTrack: (track: Track) => void
  currentTrack: Track | null
  playing: boolean
  searchQuery?: string
  onTrackDetail?: (track: Track) => void
}

const MOOD_PLAYLISTS = [
  { name: 'Upbeat', moods: ['Hopeful', 'Aggressive'], icon: '...', count: 0 },
  { name: 'Chill', moods: ['Peaceful', 'Melancholic'], icon: '...', count: 0 },
  { name: 'R&B Vibes', moods: ['Sensual'], icon: '...', count: 0 },
  { name: 'Hip-Hop', moods: ['Aggressive', 'Tense'], icon: '...', count: 0 },
  { name: 'Cinematic', moods: ['Suspenseful', 'Nostalgic'], icon: '...', count: 0 },
  { name: 'Late Night', moods: ['Melancholic', 'Sensual'], icon: '...', count: 0 },
  { name: 'Feel Good', moods: ['Hopeful', 'Peaceful'], icon: '...', count: 0 },
  { name: 'Intense', moods: ['Tense', 'Aggressive', 'Suspenseful'], icon: '...', count: 0 }
]

const CLEARANCE_OPTIONS = ['All', 'Cleared', 'PRO', 'Pending']

function formatDuration(seconds?: number): string {
  if (!seconds) return '--:--'
  const mins = Math.floor(seconds / 60)
  const secs = Math.floor(seconds % 60)
  return `${mins}:${secs.toString().padStart(2, '0')}`
}

function getMoodGradient(mood?: string): string {
  const color = mood ? MOOD_COLORS[mood] || '#C8A97E' : '#C8A97E'
  return `linear-gradient(135deg, ${color}99 0%, #0A0A0C 100%)`
}

function getPrimaryMoodColor(moods: string[]): string {
  return MOOD_COLORS[moods[0]] || '#C8A97E'
}

export function Discover({ profile, onPlayTrack, currentTrack, playing, searchQuery: externalSearchQuery, onTrackDetail: _onTrackDetail }: DiscoverProps) {
  const [tracks, setTracks] = useState<Track[]>([])
  const [savedTracks, setSavedTracks] = useState<Set<string>>(new Set())
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [searchInput, setSearchInput] = useState(externalSearchQuery || '')
  const debouncedSearchQuery = useDebounce(searchInput, 300)
  const [selectedMood, setSelectedMood] = useState('All')
  const [selectedGenre, setSelectedGenre] = useState('All')
  const [bpmRange, setBpmRange] = useState<[number, number]>([60, 180])
  const [clearanceFilter, setClearanceFilter] = useState('All')
  const [activeTab, setActiveTab] = useState<'browse' | 'moods'>('browse')
  const [selectedMoodPlaylist, setSelectedMoodPlaylist] = useState<string | null>(null)
  const [swipedTrackId, setSwipedTrackId] = useState<string | null>(null)

  const featuredScrollRef = useRef<HTMLDivElement>(null)
  const recentScrollRef = useRef<HTMLDivElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  const pullStartY = useRef(0)
  const pullCurrentY = useRef(0)
  const [pullDistance, setPullDistance] = useState(0)

  useEffect(() => {
    if (externalSearchQuery !== undefined) {
      setSearchInput(externalSearchQuery)
    }
  }, [externalSearchQuery])

  useEffect(() => {
    loadData()
  }, [profile?.id])

  const loadData = async () => {
    setLoading(true)
    const { data, error } = await supabase
      .from('tracks')
      .select('*')
      .eq('status', 'active')
      .order('play_count', { ascending: false })

    console.log('Tracks loaded:', data?.length, error)

    if (data) setTracks(data)

    if (profile) {
      const savedRes = await supabase.from('saved_tracks').select('track_id').eq('user_id', profile.id)
      if (savedRes.data) setSavedTracks(new Set(savedRes.data.map(s => s.track_id)))
    }
    setLoading(false)
  }

  const handleRefresh = useCallback(async () => {
    setRefreshing(true)
    await loadData()
    setRefreshing(false)
  }, [profile?.id])

  const handlePullStart = (e: React.TouchEvent) => {
    if (containerRef.current && containerRef.current.scrollTop <= 0) {
      pullStartY.current = e.touches[0].clientY
    }
  }

  const handlePullMove = (e: React.TouchEvent) => {
    if (containerRef.current && containerRef.current.scrollTop <= 0 && !refreshing) {
      pullCurrentY.current = e.touches[0].clientY
      const diff = pullCurrentY.current - pullStartY.current
      if (diff > 0) {
        setPullDistance(Math.min(diff * 0.5, 80))
      }
    }
  }

  const handlePullEnd = async () => {
    if (pullDistance >= 60 && !refreshing) {
      await handleRefresh()
    }
    setPullDistance(0)
    pullStartY.current = 0
    pullCurrentY.current = 0
  }

  const toggleSave = async (e: React.MouseEvent | React.TouchEvent, trackId: string) => {
    e.stopPropagation()
    if (!profile) return
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
    setSwipedTrackId(null)
  }

  const filteredTracks = useMemo(() => tracks.filter(track => {
    const searchLower = debouncedSearchQuery.toLowerCase()
    const matchesSearch = !debouncedSearchQuery ||
      track.title.toLowerCase().includes(searchLower) ||
      track.artist.toLowerCase().includes(searchLower) ||
      track.mood?.toLowerCase().includes(searchLower) ||
      track.genre?.toLowerCase().includes(searchLower) ||
      track.tags?.some(t => t.toLowerCase().includes(searchLower))

    const matchesMood = selectedMood === 'All' || track.mood === selectedMood
    const matchesGenre = selectedGenre === 'All' || track.genre === selectedGenre
    const matchesBpm = !track.bpm || (track.bpm >= bpmRange[0] && track.bpm <= bpmRange[1])

    let matchesClearance = true
    if (clearanceFilter !== 'All') {
      const statusMap: Record<string, string> = { 'Cleared': 'CLEAR', 'PRO': 'PRO', 'Pending': 'PENDING' }
      matchesClearance = track.clearance_status === statusMap[clearanceFilter]
    }

    let matchesMoodPlaylist = true
    if (selectedMoodPlaylist) {
      const playlist = MOOD_PLAYLISTS.find(p => p.name === selectedMoodPlaylist)
      if (playlist) {
        matchesMoodPlaylist = playlist.moods.includes(track.mood || '')
      }
    }

    return matchesSearch && matchesMood && matchesGenre && matchesBpm && matchesClearance && matchesMoodPlaylist
  }), [tracks, debouncedSearchQuery, selectedMood, selectedGenre, bpmRange, clearanceFilter, selectedMoodPlaylist])

  const [featuredTracks, setFeaturedTracks] = useState<Track[]>([])
  const [featuredTracksLoading, setFeaturedTracksLoading] = useState(true)

  useEffect(() => {
    const loadFeaturedTracks = async () => {
      setFeaturedTracksLoading(true)
      const { data } = await supabase
        .from('tracks')
        .select('id, title, artist, bpm, mood, genre, audio_url, artwork_color')
        .eq('uploaded_by', 'f5a217f6-446f-4412-b912-aba71ae76fcb')
        .eq('status', 'active')
        .order('created_at', { ascending: false })
        .limit(4)
      if (data) setFeaturedTracks(data)
      setFeaturedTracksLoading(false)
    }
    loadFeaturedTracks()
  }, [])

  const recentTracks = useMemo(() => {
    const base = debouncedSearchQuery ? filteredTracks : tracks
    return base.slice(0, 8)
  }, [tracks, filteredTracks, debouncedSearchQuery])

  const moodPlaylistsWithCounts = MOOD_PLAYLISTS.map(playlist => ({
    ...playlist,
    count: tracks.filter(t => playlist.moods.includes(t.mood || '')).length
  }))

  const scroll = (ref: React.RefObject<HTMLDivElement | null>, direction: 'left' | 'right') => {
    if (ref.current) {
      const scrollAmount = direction === 'left' ? -300 : 300
      ref.current.scrollBy({ left: scrollAmount, behavior: 'smooth' })
    }
  }

  const clearAllFilters = () => {
    setSearchInput('')
    setSelectedMood('All')
    setSelectedGenre('All')
    setBpmRange([60, 180])
    setClearanceFilter('All')
    setSelectedMoodPlaylist(null)
  }

  const hasActiveFilters = searchInput || selectedMood !== 'All' || selectedGenre !== 'All' ||
    bpmRange[0] !== 60 || bpmRange[1] !== 180 || clearanceFilter !== 'All' || selectedMoodPlaylist

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full bg-[#0A0A0C]">
        <Spinner />
      </div>
    )
  }

  return (
    <div
      ref={containerRef}
      className="h-[calc(100vh-76px)] md:h-[calc(100vh-76px)] overflow-y-auto bg-[#0A0A0C]"
      style={{
        overscrollBehavior: 'none',
        WebkitOverflowScrolling: 'touch',
        paddingBottom: 'calc(120px + env(safe-area-inset-bottom))'
      }}
      onTouchStart={handlePullStart}
      onTouchMove={handlePullMove}
      onTouchEnd={handlePullEnd}
    >
      <div
        className="flex items-center justify-center transition-all md:hidden"
        style={{
          height: pullDistance > 0 ? pullDistance : 0,
          opacity: pullDistance > 20 ? 1 : 0
        }}
      >
        <div
          className={`w-8 h-8 border-2 border-[#333] border-t-[#C8A97E] rounded-full ${refreshing ? 'animate-spin' : ''}`}
          style={{ transform: refreshing ? 'none' : `rotate(${pullDistance * 4}deg)` }}
        />
      </div>

      <div className="p-4 md:p-6">
        <div className="relative mb-4">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-[#666]" />
          <input
            type="text"
            value={searchInput}
            onChange={e => setSearchInput(e.target.value)}
            placeholder="Search by title, artist, genre, mood, or tags..."
            className="w-full bg-[#1A1A1E] border border-[#2A2A2E] rounded-full pl-12 pr-28 py-3 md:py-3.5 text-[#E8E8E8] placeholder-[#555] focus:outline-none focus:border-[#C8A97E] transition-colors text-sm"
          />
          <div className="absolute right-4 top-1/2 -translate-y-1/2 flex items-center gap-2">
            {debouncedSearchQuery && (
              <span className="text-xs text-[#C8A97E]">{filteredTracks.length} found</span>
            )}
            {searchInput && (
              <button
                onClick={() => setSearchInput('')}
                className="p-1 text-[#666] hover:text-[#E8E8E8] transition-colors touch-manipulation"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

        <div className="flex items-center gap-3 pb-4 overflow-x-auto scrollbar-hide -mx-4 px-4 md:mx-0 md:px-0">
          <div className="flex gap-2 flex-shrink-0">
            {MOODS.map(mood => {
              const isActive = selectedMood === mood
              const moodColor = mood === 'All' ? '#C8A97E' : MOOD_COLORS[mood]
              return (
                <button
                  key={mood}
                  onClick={() => setSelectedMood(mood)}
                  className={`px-4 py-2 rounded-full text-xs font-medium transition-all whitespace-nowrap touch-manipulation ${
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

          <div className="h-6 w-px bg-[#2A2A2E] flex-shrink-0 hidden md:block" />

          <select
            value={selectedGenre}
            onChange={e => setSelectedGenre(e.target.value)}
            className="bg-[#1A1A1E] border border-[#2A2A2E] rounded-full px-4 py-2 text-xs text-[#888] focus:outline-none focus:border-[#C8A97E] appearance-none cursor-pointer flex-shrink-0 hidden md:block"
          >
            {GENRES.map(genre => (
              <option key={genre} value={genre}>{genre === 'All' ? 'All Genres' : genre}</option>
            ))}
          </select>

          <div className="items-center gap-2 bg-[#1A1A1E] border border-[#2A2A2E] rounded-full px-4 py-2 flex-shrink-0 hidden md:flex">
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

          <select
            value={clearanceFilter}
            onChange={e => setClearanceFilter(e.target.value)}
            className="bg-[#1A1A1E] border border-[#2A2A2E] rounded-full px-4 py-2 text-xs text-[#888] focus:outline-none focus:border-[#C8A97E] appearance-none cursor-pointer flex-shrink-0 hidden md:block"
          >
            {CLEARANCE_OPTIONS.map(option => (
              <option key={option} value={option}>{option === 'All' ? 'All Clearance' : option}</option>
            ))}
          </select>

          {hasActiveFilters && (
            <button
              onClick={clearAllFilters}
              className="flex items-center gap-1 px-3 py-2 rounded-full text-xs text-[#FF6B9D] bg-[#FF6B9D]/10 border border-[#FF6B9D]/20 hover:bg-[#FF6B9D]/20 transition-colors flex-shrink-0 touch-manipulation"
            >
              <X className="w-3 h-3" />
              Clear
            </button>
          )}
        </div>

        <div className="flex gap-1 mb-6 border-b border-[#1A1A1E]">
          <button
            onClick={() => { setActiveTab('browse'); setSelectedMoodPlaylist(null) }}
            className={`px-4 py-3 text-sm font-medium transition-colors relative touch-manipulation ${
              activeTab === 'browse' ? 'text-[#E8E8E8]' : 'text-[#666] hover:text-[#888]'
            }`}
          >
            Browse
            {activeTab === 'browse' && (
              <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#C8A97E]" />
            )}
          </button>
          <button
            onClick={() => setActiveTab('moods')}
            className={`px-4 py-3 text-sm font-medium transition-colors relative touch-manipulation ${
              activeTab === 'moods' ? 'text-[#E8E8E8]' : 'text-[#666] hover:text-[#888]'
            }`}
          >
            Mood Playlists
            {activeTab === 'moods' && (
              <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#C8A97E]" />
            )}
          </button>
        </div>

        {activeTab === 'moods' ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 md:gap-4 mb-8">
            {moodPlaylistsWithCounts.map(playlist => {
              const primaryColor = getPrimaryMoodColor(playlist.moods)
              return (
                <button
                  key={playlist.name}
                  onClick={() => { setSelectedMoodPlaylist(playlist.name); setActiveTab('browse') }}
                  className="group relative overflow-hidden rounded-xl p-4 md:p-6 text-left transition-transform active:scale-[0.98] md:hover:scale-[1.02] touch-manipulation"
                  style={{ background: `linear-gradient(135deg, ${primaryColor}80 0%, #0A0A0C 100%)` }}
                >
                  <h3 className="font-['Playfair_Display'] text-base md:text-lg text-white font-semibold mb-1">
                    {playlist.name}
                  </h3>
                  <p className="text-xs md:text-sm text-white/60">{playlist.count} tracks</p>
                </button>
              )
            })}
          </div>
        ) : (
          <>
            {selectedMoodPlaylist && (
              <div className="flex items-center gap-3 mb-6">
                <span className="text-sm text-[#888]">Filtered by:</span>
                <span
                  className="px-3 py-1.5 rounded-full text-sm font-medium flex items-center gap-2"
                  style={{
                    backgroundColor: `${getPrimaryMoodColor(MOOD_PLAYLISTS.find(p => p.name === selectedMoodPlaylist)?.moods || [])}20`,
                    color: getPrimaryMoodColor(MOOD_PLAYLISTS.find(p => p.name === selectedMoodPlaylist)?.moods || [])
                  }}
                >
                  {selectedMoodPlaylist}
                  <button onClick={() => setSelectedMoodPlaylist(null)} className="hover:opacity-70 touch-manipulation">
                    <X className="w-3 h-3" />
                  </button>
                </span>
              </div>
            )}

            <section className="mb-8">
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-['Playfair_Display'] text-lg text-white">Featured Tracks</h2>
                <div className="items-center gap-2 hidden md:flex">
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
                className="flex gap-3 md:gap-4 overflow-x-auto scrollbar-hide pb-2 -mx-4 px-4 md:mx-0 md:px-0"
                style={{ WebkitOverflowScrolling: 'touch' }}
              >
                {featuredTracksLoading ? (
                  Array.from({ length: 4 }).map((_, index) => (
                    <div key={`featured-skeleton-${index}`} className="flex-shrink-0 w-[160px] md:w-[180px] touch-manipulation animate-pulse">
                      <div className="relative w-[160px] h-[160px] md:w-[180px] md:h-[180px] rounded-lg overflow-hidden mb-3 bg-[#1A1A1E]" />
                      <div className="h-4 w-3/4 rounded bg-[#1A1A1E] mb-2" />
                      <div className="h-3 w-1/2 rounded bg-[#1A1A1E]" />
                    </div>
                  ))
                ) : (
                  featuredTracks.map(track => (
                    <FeaturedCard
                      key={track.id}
                      track={track}
                      isPlaying={currentTrack?.id === track.id && playing}
                      isSaved={savedTracks.has(track.id)}
                      onPlay={() => onPlayTrack(track)}
                      onToggleSave={(e) => toggleSave(e, track.id)}
                    />
                  ))
                )}
              </div>
            </section>

            <section className="mb-8">
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-['Playfair_Display'] text-lg text-white">Recently Added</h2>
                <div className="items-center gap-2 hidden md:flex">
                  <button
                    onClick={() => scroll(recentScrollRef, 'left')}
                    className="p-1.5 rounded-full bg-[#1A1A1E] text-[#888] hover:text-white transition-colors"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => scroll(recentScrollRef, 'right')}
                    className="p-1.5 rounded-full bg-[#1A1A1E] text-[#888] hover:text-white transition-colors"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
              <div
                ref={recentScrollRef}
                className="flex gap-3 md:gap-4 overflow-x-auto scrollbar-hide pb-2 -mx-4 px-4 md:mx-0 md:px-0"
                style={{ WebkitOverflowScrolling: 'touch' }}
              >
                {recentTracks.map(track => (
                  <RecentCard
                    key={track.id}
                    track={track}
                    isPlaying={currentTrack?.id === track.id && playing}
                    isSaved={savedTracks.has(track.id)}
                    onPlay={() => onPlayTrack(track)}
                    onToggleSave={(e) => toggleSave(e, track.id)}
                  />
                ))}
              </div>
            </section>

            <section>
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-['Playfair_Display'] text-lg text-white">All Tracks</h2>
                <span className="text-sm text-[#666]">{filteredTracks.length} tracks</span>
              </div>

              {filteredTracks.length > 0 ? (
                <>
                  <div className="rounded-xl overflow-hidden hidden md:block">
                    <div className="grid grid-cols-[40px_minmax(200px,2fr)_1fr_80px_100px_80px_60px_80px] gap-4 px-4 py-3 text-xs text-[#666] uppercase tracking-wider border-b border-[#1A1A1E]">
                      <span>#</span>
                      <span>Title</span>
                      <span>Genre</span>
                      <span>BPM</span>
                      <span>Mood</span>
                      <span>Duration</span>
                      <span>Status</span>
                      <span className="text-right">Fee</span>
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

                  <div className="space-y-1 md:hidden">
                    {filteredTracks.map((track) => (
                      <MobileTrackRow
                        key={track.id}
                        track={track}
                        isPlaying={currentTrack?.id === track.id && playing}
                        isSaved={savedTracks.has(track.id)}
                        isSwiped={swipedTrackId === track.id}
                        onPlay={() => onPlayTrack(track)}
                        onToggleSave={(e) => toggleSave(e, track.id)}
                        onSwipe={(swiped) => setSwipedTrackId(swiped ? track.id : null)}
                      />
                    ))}
                  </div>
                </>
              ) : (
                <EmptyState
                  title={debouncedSearchQuery ? `No tracks found for '${debouncedSearchQuery}'` : "No Tracks Found"}
                  description="Try adjusting your search or filters"
                />
              )}
            </section>
          </>
        )}
      </div>
    </div>
  )
}

interface TrackCardProps {
  track: Track
  isPlaying: boolean
  isSaved: boolean
  onPlay: () => void
  onToggleSave: (e: React.MouseEvent | React.TouchEvent) => void
}

function FeaturedCard({ track, isPlaying, isSaved, onPlay, onToggleSave }: TrackCardProps) {
  const [hovered, setHovered] = useState(false)

  return (
    <div
      className="flex-shrink-0 w-[160px] md:w-[180px] group cursor-pointer touch-manipulation"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onClick={onPlay}
    >
      <div
        className="relative w-[160px] h-[160px] md:w-[180px] md:h-[180px] rounded-lg overflow-hidden mb-3"
        style={{ background: getMoodGradient(track.mood) }}
      >
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="w-14 h-14 md:w-16 md:h-16 rounded-full bg-black/20 backdrop-blur-sm flex items-center justify-center">
            <span className="text-2xl md:text-3xl font-bold text-white/80">
              {track.title.charAt(0).toUpperCase()}
            </span>
          </div>
        </div>

        <div className={`absolute inset-0 bg-black/40 flex items-center justify-center transition-opacity ${hovered || isPlaying ? 'opacity-100' : 'opacity-0 md:opacity-0'}`}>
          <button className="w-12 h-12 md:w-14 md:h-14 rounded-full bg-[#C8A97E] flex items-center justify-center shadow-lg transform transition-transform active:scale-95 md:hover:scale-105">
            {isPlaying ? (
              <Pause className="w-5 h-5 md:w-6 md:h-6 text-[#0A0A0C]" />
            ) : (
              <Play className="w-5 h-5 md:w-6 md:h-6 text-[#0A0A0C] ml-0.5" />
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
          className={`absolute top-3 right-3 p-2 rounded-full transition-all touch-manipulation ${
            hovered || isSaved ? 'opacity-100' : 'opacity-100 md:opacity-0'
          } ${isSaved ? 'text-[#FF6B9D]' : 'text-white hover:text-[#FF6B9D]'}`}
        >
          <Heart className={`w-4 h-4 ${isSaved ? 'fill-current' : ''}`} />
        </button>
      </div>

      <h3 className="text-[#E8E8E8] font-medium text-sm truncate">{track.title}</h3>
      <ArtistLink artistName={track.artist} className="text-[#666] text-xs truncate block" />
    </div>
  )
}

function RecentCard({ track, isPlaying, isSaved, onPlay, onToggleSave }: TrackCardProps) {
  const [hovered, setHovered] = useState(false)

  return (
    <div
      className="flex-shrink-0 w-[130px] md:w-[140px] group cursor-pointer touch-manipulation"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onClick={onPlay}
    >
      <div
        className="relative w-[130px] h-[130px] md:w-[140px] md:h-[140px] rounded-lg overflow-hidden mb-3"
        style={{ background: getMoodGradient(track.mood) }}
      >
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="w-10 h-10 md:w-12 md:h-12 rounded-full bg-black/20 backdrop-blur-sm flex items-center justify-center">
            <span className="text-xl md:text-2xl font-bold text-white/80">
              {track.title.charAt(0).toUpperCase()}
            </span>
          </div>
        </div>

        <div className={`absolute inset-0 bg-black/40 flex items-center justify-center transition-opacity ${hovered || isPlaying ? 'opacity-100' : 'opacity-0 md:opacity-0'}`}>
          <button className="w-10 h-10 md:w-12 md:h-12 rounded-full bg-[#C8A97E] flex items-center justify-center shadow-lg transform transition-transform active:scale-95 md:hover:scale-105">
            {isPlaying ? (
              <Pause className="w-4 h-4 md:w-5 md:h-5 text-[#0A0A0C]" />
            ) : (
              <Play className="w-4 h-4 md:w-5 md:h-5 text-[#0A0A0C] ml-0.5" />
            )}
          </button>
        </div>

        <button
          onClick={onToggleSave}
          className={`absolute top-2 right-2 p-1.5 rounded-full transition-all touch-manipulation ${
            hovered || isSaved ? 'opacity-100' : 'opacity-100 md:opacity-0'
          } ${isSaved ? 'text-[#FF6B9D]' : 'text-white hover:text-[#FF6B9D]'}`}
        >
          <Heart className={`w-3.5 h-3.5 ${isSaved ? 'fill-current' : ''}`} />
        </button>
      </div>

      <h3 className="text-[#E8E8E8] font-medium text-sm truncate">{track.title}</h3>
      <ArtistLink artistName={track.artist} className="text-[#666] text-xs truncate block" />
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
      className={`grid grid-cols-[40px_minmax(200px,2fr)_1fr_80px_100px_80px_60px_80px] gap-4 px-4 py-3 items-center cursor-pointer transition-colors ${
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
          <ArtistLink artistName={track.artist} className="text-xs text-[#666] truncate block" />
        </div>
      </div>

      <span className="text-sm text-[#888] truncate">{track.genre || '-'}</span>

      <span className="text-sm text-[#888]">{track.bpm || '-'}</span>

      <div>
        {track.mood ? <MoodPill mood={track.mood} /> : <span className="text-sm text-[#555]">-</span>}
      </div>

      <span className="text-sm text-[#888]">{formatDuration(track.duration)}</span>

      <div>
        {track.clearance_status ? (
          <ClearanceBadge status={track.clearance_status} />
        ) : (
          <span className="text-sm text-[#555]">-</span>
        )}
      </div>

      <div className="flex items-center justify-end gap-2">
        <button
          onClick={onToggleSave}
          className={`p-1.5 rounded-full transition-colors ${
            isSaved ? 'text-[#FF6B9D]' : hovered ? 'text-[#888] hover:text-[#FF6B9D]' : 'text-transparent'
          }`}
        >
          <Heart className={`w-4 h-4 ${isSaved ? 'fill-current' : ''}`} />
        </button>
        <span className="text-sm text-[#C8A97E] font-medium">
          {track.one_stop_fee ? `$${track.one_stop_fee}` : '-'}
        </span>
      </div>
    </div>
  )
}

interface MobileTrackRowProps extends TrackCardProps {
  isSwiped: boolean
  onSwipe: (swiped: boolean) => void
}

function MobileTrackRow({ track, isPlaying, isSaved, isSwiped, onPlay, onToggleSave, onSwipe }: MobileTrackRowProps) {
  const moodColor = track.mood ? MOOD_COLORS[track.mood] : '#C8A97E'
  const touchStartX = useRef(0)
  const touchCurrentX = useRef(0)
  const [translateX, setTranslateX] = useState(0)

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX
    touchCurrentX.current = e.touches[0].clientX
  }

  const handleTouchMove = (e: React.TouchEvent) => {
    touchCurrentX.current = e.touches[0].clientX
    const diff = touchCurrentX.current - touchStartX.current
    if (diff < 0 && diff > -150) {
      setTranslateX(diff)
    }
  }

  const handleTouchEnd = () => {
    if (translateX < -50) {
      setTranslateX(-120)
      onSwipe(true)
    } else {
      setTranslateX(0)
      onSwipe(false)
    }
  }

  const resetSwipe = () => {
    setTranslateX(0)
    onSwipe(false)
  }

  useEffect(() => {
    if (!isSwiped && translateX !== 0) {
      setTranslateX(0)
    }
  }, [isSwiped])

  return (
    <div className="relative overflow-hidden rounded-lg">
      <div
        className="absolute right-0 top-0 bottom-0 flex items-center gap-2 pr-2"
        style={{ width: '120px' }}
      >
        <button
          onClick={(e) => { toggleSaveAndReset(e) }}
          className={`flex-1 h-full flex flex-col items-center justify-center rounded-l-lg touch-manipulation ${
            isSaved ? 'bg-[#FF6B9D]/20' : 'bg-[#FF6B9D]/10'
          }`}
        >
          <Heart className={`w-5 h-5 ${isSaved ? 'text-[#FF6B9D] fill-current' : 'text-[#FF6B9D]'}`} />
          <span className="text-[10px] text-[#FF6B9D] mt-1">Save</span>
        </button>
        <button
          onClick={(e) => { e.stopPropagation(); resetSwipe() }}
          className="flex-1 h-full flex flex-col items-center justify-center bg-[#C8A97E]/10 rounded-r-lg touch-manipulation"
        >
          <ListPlus className="w-5 h-5 text-[#C8A97E]" />
          <span className="text-[10px] text-[#C8A97E] mt-1">Add</span>
        </button>
      </div>

      <div
        className={`flex items-center gap-3 p-3 bg-[#0D0D10] transition-transform touch-manipulation ${
          isPlaying ? 'bg-[#C8A97E]/10' : ''
        }`}
        style={{
          transform: `translateX(${translateX}px)`,
          transition: translateX === 0 || translateX === -120 ? 'transform 0.2s ease-out' : 'none'
        }}
        onClick={() => translateX === 0 && onPlay()}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        <div
          className="w-12 h-12 rounded-lg flex-shrink-0 flex items-center justify-center"
          style={{ background: `linear-gradient(135deg, ${moodColor}60 0%, #1A1A1E 100%)` }}
        >
          {isPlaying ? (
            <Pause className="w-5 h-5 text-[#C8A97E]" />
          ) : (
            <span className="text-lg font-semibold text-white/80">
              {track.title.charAt(0).toUpperCase()}
            </span>
          )}
        </div>

        <div className="flex-1 min-w-0">
          <p className={`text-sm font-medium truncate ${isPlaying ? 'text-[#C8A97E]' : 'text-[#E8E8E8]'}`}>
            {track.title}
          </p>
          <ArtistLink artistName={track.artist} className="text-xs text-[#666] truncate block" />
        </div>

        <div className="flex items-center gap-3">
          <span className="text-xs text-[#888]">{track.bpm || '-'} BPM</span>
          <button
            onClick={(e) => { e.stopPropagation(); onPlay() }}
            className="w-10 h-10 rounded-full bg-[#C8A97E] flex items-center justify-center touch-manipulation"
          >
            {isPlaying ? (
              <Pause className="w-4 h-4 text-[#0A0A0C]" />
            ) : (
              <Play className="w-4 h-4 text-[#0A0A0C] ml-0.5" />
            )}
          </button>
        </div>
      </div>
    </div>
  )

  function toggleSaveAndReset(e: React.MouseEvent) {
    onToggleSave(e)
    resetSwipe()
  }
}
