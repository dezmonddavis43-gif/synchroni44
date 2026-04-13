import { useState, useEffect, useRef, useCallback } from 'react'
import { supabase } from '../../lib/supabase'
import { Search as SearchIcon, Play, Pause, Heart, X, ChevronRight } from 'lucide-react'
import { MoodPill, ClearanceBadge, Spinner, EmptyState, TrackArtwork } from '../shared/UI'
import { MOOD_COLORS, MOODS, GENRES } from '../../lib/constants'
import type { Profile, Track } from '../../lib/types'
import { TrackDetailModal } from '../shared/TrackDetailModal'
import { ArtistLink } from '../shared/ArtistLink'

interface SearchProps {
  profile: Profile
  onPlayTrack: (track: Track) => void
  currentTrack: Track | null
  playing: boolean
  globalSearch: string
}

function formatDuration(seconds?: number): string {
  if (!seconds) return '--:--'
  const mins = Math.floor(seconds / 60)
  const secs = Math.floor(seconds % 60)
  return `${mins}:${secs.toString().padStart(2, '0')}`
}

export function Search({ profile, onPlayTrack, currentTrack, playing, globalSearch }: SearchProps) {
  const [featuredTracks, setFeaturedTracks] = useState<Track[]>([])
  const [recentTracks, setRecentTracks] = useState<Track[]>([])
  const [filteredTracks, setFilteredTracks] = useState<Track[]>([])
  const [searchResults, setSearchResults] = useState<Track[]>([])
  const [showSearchDropdown, setShowSearchDropdown] = useState(false)
  const [savedTracks, setSavedTracks] = useState<Set<string>>(new Set())
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedMood, setSelectedMood] = useState('All')
  const [selectedGenre, setSelectedGenre] = useState('All')
  const [bpmRange, setBpmRange] = useState<[number, number]>([60, 180])
  const [clearanceFilter, setClearanceFilter] = useState('All')
  const [selectedTrack, setSelectedTrack] = useState<Track | null>(null)
  const [hoveredTrack, setHoveredTrack] = useState<string | null>(null)
  const searchInputRef = useRef<HTMLInputElement>(null)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    loadFeaturedTracks()
    loadRecentTracks()
    loadAllTracks()
    loadSavedTracks()
  }, [])

  useEffect(() => {
    if (globalSearch) setSearchQuery(globalSearch)
  }, [globalSearch])

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    if (searchQuery.trim()) {
      debounceRef.current = setTimeout(() => {
        searchTracks(searchQuery)
      }, 300)
    } else {
      setSearchResults([])
      setShowSearchDropdown(false)
    }
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current) }
  }, [searchQuery])

  useEffect(() => {
    applyFilters()
  }, [selectedMood, selectedGenre, bpmRange, clearanceFilter])

  const loadFeaturedTracks = async () => {
    const { data } = await supabase
      .from('tracks')
      .select('*')
      .eq('status', 'active')
      .order('created_at', { ascending: false })
      .limit(8)
    if (data) setFeaturedTracks(data as Track[])
  }

  const loadRecentTracks = async () => {
    const { data } = await supabase
      .from('tracks')
      .select('*')
      .eq('status', 'active')
      .order('created_at', { ascending: false })
      .limit(50)
    if (data) {
      const seenArtists = new Set<string>()
      const diversified: Track[] = []
      for (const track of data) {
        if (!seenArtists.has(track.artist) && diversified.length < 8) {
          seenArtists.add(track.artist)
          diversified.push(track)
        }
      }
      setRecentTracks(diversified as Track[])
    }
  }

  const loadAllTracks = async () => {
    const { data } = await supabase
      .from('tracks')
      .select('*')
      .eq('status', 'active')
      .order('play_count', { ascending: false })
    if (data) setFilteredTracks(data as Track[])
    setLoading(false)
  }

  const searchTracks = async (query: string) => {
    const { data } = await supabase
      .from('tracks')
      .select('*')
      .or(`title.ilike.%${query}%,artist.ilike.%${query}%,mood.ilike.%${query}%,genre.ilike.%${query}%`)
      .eq('status', 'active')
      .limit(10)
    if (data) {
      setSearchResults(data as Track[])
      setShowSearchDropdown(true)
    }
  }

  const applyFilters = useCallback(async () => {
    let query = supabase
      .from('tracks')
      .select('*')
      .eq('status', 'active')

    if (selectedMood !== 'All') {
      query = query.ilike('mood', `%${selectedMood}%`)
    }
    if (selectedGenre !== 'All') {
      query = query.eq('genre', selectedGenre)
    }
    if (bpmRange[0] !== 60 || bpmRange[1] !== 180) {
      query = query.gte('bpm', bpmRange[0]).lte('bpm', bpmRange[1])
    }
    if (clearanceFilter === 'Cleared') {
      query = query.eq('clearance_status', 'CLEAR')
    } else if (clearanceFilter === 'PRO') {
      query = query.eq('clearance_status', 'PRO')
    }

    const { data } = await query.order('created_at', { ascending: false })
    if (data) setFilteredTracks(data as Track[])
  }, [selectedMood, selectedGenre, bpmRange, clearanceFilter])

  const loadSavedTracks = async () => {
    const { data: authData } = await supabase.auth.getUser()
    const userId = authData.user?.id ?? profile.id
    const { data } = await supabase.from('saved_tracks').select('track_id').eq('user_id', userId)
    if (data) setSavedTracks(new Set(data.map(s => s.track_id)))
  }

  const toggleSave = async (e: React.MouseEvent, trackId: string) => {
    e.stopPropagation()
    const { data: authData } = await supabase.auth.getUser()
    const userId = authData.user?.id ?? profile.id
    if (savedTracks.has(trackId)) {
      await supabase.from('saved_tracks').delete().eq('user_id', userId).eq('track_id', trackId)
      setSavedTracks(prev => { const next = new Set(prev); next.delete(trackId); return next })
    } else {
      await supabase.from('saved_tracks').insert({ user_id: userId, track_id: trackId })
      setSavedTracks(prev => new Set([...prev, trackId]))
    }
  }

  const handleSearchResultClick = (track: Track) => {
    setShowSearchDropdown(false)
    onPlayTrack(track)
  }

  const hasFilters = selectedMood !== 'All' || selectedGenre !== 'All' || bpmRange[0] !== 60 || bpmRange[1] !== 180 || clearanceFilter !== 'All'

  if (loading) {
    return <div className="flex items-center justify-center h-full"><Spinner size="lg" /></div>
  }

  return (
    <div className="h-full overflow-y-auto">
      <div className="p-6">
        <div className="relative mb-6">
          <SearchIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-[#555]" />
          <input
            ref={searchInputRef}
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onFocus={() => { if (searchResults.length > 0) setShowSearchDropdown(true) }}
            onBlur={() => setTimeout(() => setShowSearchDropdown(false), 200)}
            placeholder="Search by title, artist, mood, genre, or tags..."
            className="w-full bg-[#1A1A1E] border border-[#2A2A2E] rounded-full pl-12 pr-4 py-3 text-[#E8E8E8] placeholder-[#555] focus:outline-none focus:border-[#C8A97E] transition-colors"
          />
          {searchQuery && (
            <button onClick={() => { setSearchQuery(''); setSearchResults([]); setShowSearchDropdown(false) }} className="absolute right-4 top-1/2 -translate-y-1/2 p-1 text-[#666] hover:text-[#E8E8E8]">
              <X className="w-4 h-4" />
            </button>
          )}
          {showSearchDropdown && searchResults.length > 0 && (
            <div className="absolute top-full left-0 right-0 mt-2 bg-[#0D0D10] border border-[#2A2A2E] rounded-xl shadow-xl z-50 overflow-hidden">
              {searchResults.map(track => {
                const color = track.artwork_color || (track.mood ? MOOD_COLORS[track.mood] : '#C8A97E')
                const title = track.title || 'Untitled'
                const artist = track.artist || 'Unknown Artist'
                const hasArtwork = track.artwork_url && track.artwork_url.trim() !== ''
                return (
                  <button
                    key={track.id}
                    onClick={() => handleSearchResultClick(track)}
                    className="w-full flex items-center gap-3 px-4 py-3 hover:bg-[#1A1A1E] transition-colors text-left"
                  >
                    <div
                      className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0"
                      style={hasArtwork
                        ? { backgroundImage: `url(${track.artwork_url})`, backgroundSize: 'cover', backgroundPosition: 'center' }
                        : { background: `linear-gradient(135deg, ${color}60 0%, #1A1A1E 100%)` }
                      }
                    >
                      {!hasArtwork && <span className="text-sm font-bold text-white/50">{title.charAt(0).toUpperCase()}</span>}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-[#E8E8E8] truncate">{title}</p>
                      <p className="text-xs text-[#666] truncate">{artist}</p>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      {track.mood && <MoodPill mood={track.mood} />}
                      <span className="text-xs text-[#555]">{track.bpm || '-'} BPM</span>
                    </div>
                    <Play className="w-4 h-4 text-[#C8A97E] flex-shrink-0" />
                  </button>
                )
              })}
            </div>
          )}
        </div>

        <div className="flex items-center gap-3 mb-6 overflow-x-auto pb-2 scrollbar-hide">
          <div className="flex gap-2 flex-shrink-0">
            {MOODS.map(mood => {
              const isActive = selectedMood === mood
              const color = mood === 'All' ? '#C8A97E' : MOOD_COLORS[mood]
              return (
                <button
                  key={mood}
                  onClick={() => setSelectedMood(mood)}
                  className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all whitespace-nowrap ${
                    isActive ? 'text-[#0A0A0C]' : 'bg-[#1A1A1E] text-[#888] hover:text-[#E8E8E8] border border-[#2A2A2E]'
                  }`}
                  style={isActive ? { backgroundColor: color } : {}}
                >
                  {mood}
                </button>
              )
            })}
          </div>

          <div className="h-5 w-px bg-[#2A2A2E] flex-shrink-0" />

          <select
            value={selectedGenre}
            onChange={(e) => setSelectedGenre(e.target.value)}
            className="bg-[#1A1A1E] border border-[#2A2A2E] rounded-full px-3 py-1.5 text-xs text-[#888] focus:outline-none focus:border-[#C8A97E] appearance-none cursor-pointer flex-shrink-0"
          >
            {GENRES.map(g => <option key={g} value={g}>{g === 'All' ? 'All Genres' : g}</option>)}
          </select>

          <div className="flex items-center gap-2 bg-[#1A1A1E] border border-[#2A2A2E] rounded-full px-3 py-1.5 flex-shrink-0">
            <span className="text-xs text-[#666]">BPM:</span>
            <input type="range" min="60" max="180" value={bpmRange[0]} onChange={(e) => setBpmRange([parseInt(e.target.value), bpmRange[1]])} className="w-12 accent-[#C8A97E]" />
            <span className="text-xs text-[#888] w-14 text-center">{bpmRange[0]}-{bpmRange[1]}</span>
            <input type="range" min="60" max="180" value={bpmRange[1]} onChange={(e) => setBpmRange([bpmRange[0], parseInt(e.target.value)])} className="w-12 accent-[#C8A97E]" />
          </div>

          <select
            value={clearanceFilter}
            onChange={(e) => setClearanceFilter(e.target.value)}
            className="bg-[#1A1A1E] border border-[#2A2A2E] rounded-full px-3 py-1.5 text-xs text-[#888] focus:outline-none focus:border-[#C8A97E] appearance-none cursor-pointer flex-shrink-0"
          >
            <option value="All">All Clearance</option>
            <option value="Cleared">Cleared</option>
            <option value="PRO">PRO Required</option>
          </select>

          {hasFilters && (
            <button
              onClick={() => { setSelectedMood('All'); setSelectedGenre('All'); setBpmRange([60, 180]); setClearanceFilter('All') }}
              className="flex items-center gap-1 px-3 py-1.5 rounded-full text-xs text-[#FF6B9D] bg-[#FF6B9D]/10 border border-[#FF6B9D]/20 hover:bg-[#FF6B9D]/20 flex-shrink-0"
            >
              <X className="w-3 h-3" /> Clear
            </button>
          )}
        </div>

        {!searchQuery && (
          <>
            <section className="mb-8">
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-display text-lg text-[#E8E8E8]">Featured Tracks</h2>
                <button className="text-sm text-[#C8A97E] hover:text-[#D4B88A] flex items-center gap-1">
                  See all <ChevronRight className="w-4 h-4" />
                </button>
              </div>
              <div className="flex gap-4 overflow-x-auto pb-2 scrollbar-hide">
                {featuredTracks.map(track => {
                  const color = track.artwork_color || (track.mood ? MOOD_COLORS[track.mood] : '#C8A97E')
                  const isPlaying = currentTrack?.id === track.id && playing
                  const title = track.title || 'Untitled'
                  const artist = track.artist || 'Unknown Artist'
                  const hasArtwork = track.artwork_url && track.artwork_url.trim() !== ''
                  return (
                    <div
                      key={track.id}
                      onClick={() => setSelectedTrack(track)}
                      className="flex-shrink-0 w-[180px] group cursor-pointer"
                    >
                      <div
                        className="w-[180px] h-[180px] rounded-xl mb-3 flex items-center justify-center relative overflow-hidden"
                        style={hasArtwork
                          ? { backgroundImage: `url(${track.artwork_url})`, backgroundSize: 'cover', backgroundPosition: 'center' }
                          : { background: `linear-gradient(135deg, ${color}60 0%, #1A1A1E 100%)` }
                        }
                      >
                        {!hasArtwork && <span className="text-4xl font-bold text-white/50">{title.charAt(0).toUpperCase()}</span>}
                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                          <button
                            onClick={(e) => { e.stopPropagation(); onPlayTrack(track) }}
                            className="w-12 h-12 rounded-full bg-[#C8A97E] flex items-center justify-center hover:scale-105 transition-transform"
                          >
                            {isPlaying ? <Pause className="w-5 h-5 text-[#0A0A0C]" /> : <Play className="w-5 h-5 text-[#0A0A0C] ml-0.5" />}
                          </button>
                        </div>
                      </div>
                      <p className="text-sm font-medium text-[#E8E8E8] truncate">{title}</p>
                      <ArtistLink artistName={artist} className="text-xs text-[#666] truncate block" />
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-xs text-[#555]">{track.bpm || '-'} BPM</span>
                        {track.mood && <MoodPill mood={track.mood} />}
                      </div>
                    </div>
                  )
                })}
              </div>
            </section>

            {recentTracks.length > 0 && (
              <section className="mb-8">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="font-display text-lg text-[#E8E8E8]">Recently Added</h2>
                  <button className="text-sm text-[#C8A97E] hover:text-[#D4B88A] flex items-center gap-1">
                    See all <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
                <div className="flex gap-4 overflow-x-auto pb-2 scrollbar-hide">
                  {recentTracks.map(track => {
                    const color = track.artwork_color || (track.mood ? MOOD_COLORS[track.mood] : '#C8A97E')
                    const isPlaying = currentTrack?.id === track.id && playing
                    const title = track.title || 'Untitled'
                    const artist = track.artist || 'Unknown Artist'
                    const hasArtwork = track.artwork_url && track.artwork_url.trim() !== ''
                    return (
                      <div
                        key={track.id}
                        onClick={() => setSelectedTrack(track)}
                        className="flex-shrink-0 w-[180px] group cursor-pointer"
                      >
                        <div
                          className="w-[180px] h-[180px] rounded-xl mb-3 flex items-center justify-center relative overflow-hidden"
                          style={hasArtwork
                            ? { backgroundImage: `url(${track.artwork_url})`, backgroundSize: 'cover', backgroundPosition: 'center' }
                            : { background: `linear-gradient(135deg, ${color}60 0%, #1A1A1E 100%)` }
                          }
                        >
                          {!hasArtwork && <span className="text-4xl font-bold text-white/50">{title.charAt(0).toUpperCase()}</span>}
                          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                            <button
                              onClick={(e) => { e.stopPropagation(); onPlayTrack(track) }}
                              className="w-12 h-12 rounded-full bg-[#C8A97E] flex items-center justify-center hover:scale-105 transition-transform"
                            >
                              {isPlaying ? <Pause className="w-5 h-5 text-[#0A0A0C]" /> : <Play className="w-5 h-5 text-[#0A0A0C] ml-0.5" />}
                            </button>
                          </div>
                        </div>
                        <p className="text-sm font-medium text-[#E8E8E8] truncate">{title}</p>
                        <ArtistLink artistName={artist} className="text-xs text-[#666] truncate block" />
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-xs text-[#555]">{track.bpm || '-'} BPM</span>
                          {track.mood && <MoodPill mood={track.mood} />}
                        </div>
                      </div>
                    )
                  })}
                </div>
              </section>
            )}
          </>
        )}

        <section>
          <h2 className="font-display text-lg text-[#E8E8E8] mb-4">{searchQuery ? 'Search Results' : 'All Tracks'}</h2>
          {filteredTracks.length > 0 ? (
            <div className="bg-[#0D0D10] rounded-xl border border-[#1A1A1E] overflow-hidden">
              <div className="grid grid-cols-[40px_1fr_100px_60px_60px_60px_80px_60px_70px_40px] gap-4 px-4 py-3 text-xs text-[#555] border-b border-[#1A1A1E] font-medium">
                <span>#</span>
                <span>TITLE</span>
                <span className="hidden md:block">GENRE</span>
                <span className="hidden md:block">BPM</span>
                <span className="hidden lg:block">KEY</span>
                <span>TIME</span>
                <span className="hidden lg:block">MOOD</span>
                <span className="hidden lg:block">CLEAR</span>
                <span className="text-right">FEE</span>
                <span></span>
              </div>
              {filteredTracks.map((track, index) => {
                const isPlaying = currentTrack?.id === track.id && playing
                const isCurrent = currentTrack?.id === track.id
                const isHovered = hoveredTrack === track.id
                const isSaved = savedTracks.has(track.id)

                return (
                  <div
                    key={track.id}
                    onClick={() => setSelectedTrack(track)}
                    onMouseEnter={() => setHoveredTrack(track.id)}
                    onMouseLeave={() => setHoveredTrack(null)}
                    className={`grid grid-cols-[40px_1fr_100px_60px_60px_60px_80px_60px_70px_40px] gap-4 px-4 py-2.5 items-center cursor-pointer transition-colors ${
                      isCurrent ? 'bg-[#C8A97E]/10' : isHovered ? 'bg-[#1A1A1E]' : ''
                    }`}
                  >
                    <div className="flex items-center justify-center">
                      {isHovered || isPlaying ? (
                        <button onClick={(e) => { e.stopPropagation(); onPlayTrack(track) }} className="text-[#C8A97E]">
                          {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                        </button>
                      ) : (
                        <span className="text-sm text-[#666]">{index + 1}</span>
                      )}
                    </div>

                    <div className="flex items-center gap-3 min-w-0 overflow-hidden">
                      <TrackArtwork track={{ title: track.title || 'Untitled', mood: track.mood, artwork_color: track.artwork_color, artwork_url: track.artwork_url }} size="sm" />
                      <div className="min-w-0 flex-1">
                        <p className={`text-sm font-medium truncate ${isCurrent ? 'text-[#C8A97E]' : 'text-[#E8E8E8]'}`}>{track.title || 'Untitled'}</p>
                        <ArtistLink artistName={track.artist || 'Unknown Artist'} className="text-xs text-[#666] truncate block" />
                      </div>
                    </div>

                    <span className="text-sm text-[#888] hidden md:block truncate">{track.genre || '-'}</span>
                    <span className="text-sm text-[#888] hidden md:block">{track.bpm || '-'}</span>
                    <span className="text-sm text-[#888] hidden lg:block">{track.key || '-'}</span>
                    <span className="text-sm text-[#888]">{formatDuration(track.duration)}</span>
                    <div className="hidden lg:block">{track.mood && <MoodPill mood={track.mood} />}</div>
                    <div className="hidden lg:block">{track.clearance_status && <ClearanceBadge status={track.clearance_status} />}</div>
                    <span className="text-sm text-[#C8A97E] font-medium text-right">{track.one_stop_fee ? `$${track.one_stop_fee}` : '-'}</span>
                    <button
                      onClick={(e) => toggleSave(e, track.id)}
                      className={`p-1 transition-colors ${isSaved ? 'text-[#FF6B9D]' : isHovered ? 'text-[#666] hover:text-[#FF6B9D]' : 'text-transparent'}`}
                    >
                      <Heart className={`w-4 h-4 ${isSaved ? 'fill-current' : ''}`} />
                    </button>
                  </div>
                )
              })}
            </div>
          ) : (
            <EmptyState title="No tracks found" description="Try adjusting your search or filters" />
          )}
        </section>
      </div>

      {selectedTrack && (
        <TrackDetailModal
          track={selectedTrack}
          profile={profile}
          isOpen={!!selectedTrack}
          onClose={() => setSelectedTrack(null)}
          onPlay={() => onPlayTrack(selectedTrack)}
          isPlaying={currentTrack?.id === selectedTrack.id && playing}
          isSaved={savedTracks.has(selectedTrack.id)}
          onToggleSave={() => {
            supabase.auth.getUser().then(({ data: authData }) => {
              const userId = authData.user?.id ?? profile.id
              if (savedTracks.has(selectedTrack.id)) {
                supabase.from('saved_tracks').delete().eq('user_id', userId).eq('track_id', selectedTrack.id).then(() => {
                  setSavedTracks(prev => { const next = new Set(prev); next.delete(selectedTrack.id); return next })
                })
              } else {
                supabase.from('saved_tracks').insert({ user_id: userId, track_id: selectedTrack.id }).then(() => {
                  setSavedTracks(prev => new Set([...prev, selectedTrack.id]))
                })
              }
            })
          }}
        />
      )}
    </div>
  )
}
