import { useState, useEffect, useRef, useCallback } from 'react'
import { supabase } from '../../lib/supabase'
import { MoodPill, Spinner, EmptyState, Btn, Input } from '../shared/UI'
import { ArtistLink } from '../shared/ArtistLink'
import { MOOD_COLORS, MOODS, GENRES } from '../../lib/constants'
import { Search, Play, Pause, Heart, ChevronRight, ChevronLeft, X, Send, UserPlus, Bookmark, Music2 } from 'lucide-react'
import type { Profile, Track } from '../../lib/types'
import { formatTrackDurationMmSs } from '../../lib/trackDuration'

interface LabelCatalogProps {
  profile: Profile
  onPlayTrack: (track: Track) => void
  currentTrack: Track | null
  playing: boolean
}

interface SavedSearch {
  id: string
  name: string
  filters: FilterState
}

interface FilterState {
  searchQuery: string
  selectedMood: string
  selectedGenre: string
  bpmRange: [number, number]
  sortBy: string
  keyFilter: string
}

const SORT_OPTIONS = [
  { value: 'newest', label: 'Newest' },
  { value: 'plays', label: 'Most Played' },
  { value: 'saves', label: 'Most Saved' },
  { value: 'alpha', label: 'Alphabetical' }
]
const KEY_OPTIONS = ['All', 'C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B']

function getMoodGradient(mood?: string): string {
  const color = mood ? MOOD_COLORS[mood] || '#C8A97E' : '#C8A97E'
  return `linear-gradient(135deg, ${color}99 0%, #0A0A0C 100%)`
}

export function LabelCatalog({ profile, onPlayTrack, currentTrack, playing }: LabelCatalogProps) {
  const [tracks, setTracks] = useState<Track[]>([])
  const [rosterArtistIds, setRosterArtistIds] = useState<Set<string>>(new Set())
  const [savedTracks, setSavedTracks] = useState<Set<string>>(new Set())
  const [loading, setLoading] = useState(true)

  const [searchQuery, setSearchQuery] = useState('')
  const [selectedMood, setSelectedMood] = useState('All')
  const [selectedGenre, setSelectedGenre] = useState('All')
  const [bpmRange, setBpmRange] = useState<[number, number]>([60, 180])
  const [sortBy, setSortBy] = useState('newest')
  const [keyFilter, setKeyFilter] = useState('All')

  const [rosterOnly, setRosterOnly] = useState(false)
  const [savedSearches, setSavedSearches] = useState<SavedSearch[]>([])
  const [showSaveSearch, setShowSaveSearch] = useState(false)
  const [newSearchName, setNewSearchName] = useState('')

  const [showPitchModal, setShowPitchModal] = useState(false)
  const [pitchTrack, setPitchTrack] = useState<Track | null>(null)
  const [pitchForm, setPitchForm] = useState({ supervisorName: '', projectName: '', fee: '' })
  const [pitching, setPitching] = useState(false)

  const featuredScrollRef = useRef<HTMLDivElement>(null)

  const loadData = useCallback(async () => {
    setLoading(true)

    const [tracksRes, rosterRes, savedRes] = await Promise.all([
      supabase.from('tracks').select('*').eq('status', 'active').order('created_at', { ascending: false }),
      supabase.from('roster').select('artist_id').eq('label_id', profile.id),
      supabase.from('saved_tracks').select('track_id').eq('user_id', profile.id)
    ])

    if (tracksRes.data) setTracks(tracksRes.data)
    if (rosterRes.data) setRosterArtistIds(new Set(rosterRes.data.map(r => r.artist_id)))
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

  const filteredTracks = tracks
    .filter(track => {
      if (rosterOnly && !rosterArtistIds.has(track.uploaded_by)) return false

      const matchesSearch = !searchQuery ||
        track.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        track.artist.toLowerCase().includes(searchQuery.toLowerCase()) ||
        track.mood?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        track.genre?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        track.tags?.some(t => t.toLowerCase().includes(searchQuery.toLowerCase()))

      const matchesMood = selectedMood === 'All' || track.mood === selectedMood
      const matchesGenre = selectedGenre === 'All' || track.genre === selectedGenre
      const matchesBpm = !track.bpm || (track.bpm >= bpmRange[0] && track.bpm <= bpmRange[1])
      const matchesKey = keyFilter === 'All' || track.key?.startsWith(keyFilter)

      return matchesSearch && matchesMood && matchesGenre && matchesBpm && matchesKey
    })
    .sort((a, b) => {
      switch (sortBy) {
        case 'plays':
          return (b.play_count || 0) - (a.play_count || 0)
        case 'saves':
          return (b.save_count || 0) - (a.save_count || 0)
        case 'alpha':
          return a.title.localeCompare(b.title)
        default:
          return new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime()
      }
    })

  const trendingTracks = [...tracks]
    .sort((a, b) => (b.play_count || 0) - (a.play_count || 0))
    .slice(0, 8)

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
    setSortBy('newest')
    setKeyFilter('All')
    setRosterOnly(false)
  }

  const hasActiveFilters = searchQuery || selectedMood !== 'All' || selectedGenre !== 'All' ||
    bpmRange[0] !== 60 || bpmRange[1] !== 180 ||
    sortBy !== 'newest' || keyFilter !== 'All' || rosterOnly

  const saveCurrentSearch = () => {
    if (!newSearchName.trim()) return
    const newSearch: SavedSearch = {
      id: Date.now().toString(),
      name: newSearchName,
      filters: {
        searchQuery,
        selectedMood,
        selectedGenre,
        bpmRange,
        sortBy,
        keyFilter
      }
    }
    setSavedSearches(prev => [...prev, newSearch])
    setNewSearchName('')
    setShowSaveSearch(false)
  }

  const applySavedSearch = (search: SavedSearch) => {
    setSearchQuery(search.filters.searchQuery)
    setSelectedMood(search.filters.selectedMood)
    setSelectedGenre(search.filters.selectedGenre)
    setBpmRange(search.filters.bpmRange)
    setSortBy(search.filters.sortBy)
    setKeyFilter(search.filters.keyFilter)
  }

  const deleteSavedSearch = (id: string) => {
    setSavedSearches(prev => prev.filter(s => s.id !== id))
  }

  const openPitchModal = (track: Track) => {
    setPitchTrack(track)
    setPitchForm({ supervisorName: '', projectName: '', fee: '' })
    setShowPitchModal(true)
  }

  const submitPitch = async () => {
    if (!pitchTrack) return
    setPitching(true)

    await supabase.from('pitches').insert({
      track_id: pitchTrack.id,
      label_id: profile.id,
      supervisor_name: pitchForm.supervisorName,
      project_name: pitchForm.projectName,
      offered_fee: parseInt(pitchForm.fee) || 0,
      status: 'pending'
    })

    setPitching(false)
    setShowPitchModal(false)
    setPitchTrack(null)
  }

  const addToRoster = async (artistId: string) => {
    await supabase.from('roster').insert({ label_id: profile.id, artist_id: artistId })
    setRosterArtistIds(prev => new Set([...prev, artistId]))
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
            <h1 className="font-['Playfair_Display'] text-2xl font-semibold text-[#E8E8E8]">Label Catalog</h1>
            <p className="text-[#666] text-sm mt-1">Browse and pitch tracks from the full platform catalog</p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setRosterOnly(!rosterOnly)}
              className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${
                rosterOnly
                  ? 'bg-[#C8A97E] text-[#0A0A0C]'
                  : 'bg-[#1A1A1E] text-[#888] hover:text-[#E8E8E8] border border-[#2A2A2E]'
              }`}
            >
              {rosterOnly ? 'My Roster Only' : 'All Tracks'}
            </button>
          </div>
        </div>

        <div className="relative mb-4">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-[#666]" />
          <input
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Search by title, artist, mood, genre, tags, BPM, or key..."
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

          <select
            value={keyFilter}
            onChange={e => setKeyFilter(e.target.value)}
            className="bg-[#1A1A1E] border border-[#2A2A2E] rounded-full px-4 py-2 text-xs text-[#888] focus:outline-none focus:border-[#C8A97E] appearance-none cursor-pointer flex-shrink-0"
          >
            {KEY_OPTIONS.map(key => (
              <option key={key} value={key}>{key === 'All' ? 'All Keys' : key}</option>
            ))}
          </select>

          <select
            value={sortBy}
            onChange={e => setSortBy(e.target.value)}
            className="bg-[#1A1A1E] border border-[#2A2A2E] rounded-full px-4 py-2 text-xs text-[#888] focus:outline-none focus:border-[#C8A97E] appearance-none cursor-pointer flex-shrink-0"
          >
            {SORT_OPTIONS.map(option => (
              <option key={option.value} value={option.value}>{option.label}</option>
            ))}
          </select>

          {hasActiveFilters && (
            <>
              <button
                onClick={clearAllFilters}
                className="flex items-center gap-1 px-3 py-2 rounded-full text-xs text-[#FF6B9D] bg-[#FF6B9D]/10 border border-[#FF6B9D]/20 hover:bg-[#FF6B9D]/20 transition-colors flex-shrink-0"
              >
                <X className="w-3 h-3" />
                Clear
              </button>
              <button
                onClick={() => setShowSaveSearch(true)}
                className="flex items-center gap-1 px-3 py-2 rounded-full text-xs text-[#C8A97E] bg-[#C8A97E]/10 border border-[#C8A97E]/20 hover:bg-[#C8A97E]/20 transition-colors flex-shrink-0"
              >
                <Bookmark className="w-3 h-3" />
                Save Search
              </button>
            </>
          )}
        </div>

        {savedSearches.length > 0 && (
          <div className="flex items-center gap-2 mb-4 overflow-x-auto pb-2">
            <span className="text-xs text-[#666] flex-shrink-0">Saved:</span>
            {savedSearches.map(search => (
              <div
                key={search.id}
                className="flex items-center gap-1 px-3 py-1.5 rounded-full text-xs bg-[#1A1A1E] border border-[#2A2A2E] flex-shrink-0"
              >
                <button
                  onClick={() => applySavedSearch(search)}
                  className="text-[#888] hover:text-[#E8E8E8] transition-colors"
                >
                  {search.name}
                </button>
                <button
                  onClick={() => deleteSavedSearch(search.id)}
                  className="text-[#555] hover:text-[#FF6B9D] transition-colors"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            ))}
          </div>
        )}

        {trendingTracks.length > 0 && !hasActiveFilters && (
          <section className="mb-8">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-['Playfair_Display'] text-lg text-white">Trending Tracks</h2>
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
              {trendingTracks.map(track => (
                <FeaturedCard
                  key={track.id}
                  track={track}
                  isPlaying={currentTrack?.id === track.id && playing}
                  isSaved={savedTracks.has(track.id)}
                  isOnRoster={rosterArtistIds.has(track.uploaded_by)}
                  onPlay={() => onPlayTrack(track)}
                  onToggleSave={(e) => toggleSave(e, track.id)}
                  onPitch={() => openPitchModal(track)}
                />
              ))}
            </div>
          </section>
        )}

        <section>
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-['Playfair_Display'] text-lg text-white">
              {rosterOnly ? 'My Roster Tracks' : 'All Tracks'}
            </h2>
            <span className="text-sm text-[#666]">{filteredTracks.length} tracks</span>
          </div>

          {filteredTracks.length > 0 ? (
            <div className="rounded-xl overflow-hidden">
              <div className="grid grid-cols-[40px_minmax(200px,2fr)_1fr_80px_100px_80px_80px_140px] gap-4 px-4 py-3 text-xs text-[#666] uppercase tracking-wider border-b border-[#1A1A1E]">
                <span>#</span>
                <span>Title</span>
                <span>Genre</span>
                <span>BPM</span>
                <span>Mood</span>
                <span>Duration</span>
                <span>Catalog</span>
                <span className="text-right">Actions</span>
              </div>
              {filteredTracks.map((track, index) => (
                <TrackRow
                  key={track.id}
                  track={track}
                  index={index + 1}
                  isPlaying={currentTrack?.id === track.id && playing}
                  isSaved={savedTracks.has(track.id)}
                  isOnRoster={rosterArtistIds.has(track.uploaded_by)}
                  onPlay={() => onPlayTrack(track)}
                  onToggleSave={(e) => toggleSave(e, track.id)}
                  onPitch={() => openPitchModal(track)}
                  onAddToRoster={() => addToRoster(track.uploaded_by)}
                />
              ))}
            </div>
          ) : (
            <EmptyState
              icon={<Music2 className="w-12 h-12" />}
              title={searchQuery ? `No tracks found for '${searchQuery}'` : "No Tracks Found"}
              description="Try adjusting your search or filters"
            />
          )}
        </section>
      </div>

      {showSaveSearch && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-[#13131A] border border-[#1E1E22] rounded-xl w-full max-w-md shadow-2xl">
            <div className="flex items-center justify-between p-4 border-b border-[#1E1E22]">
              <h2 className="text-lg font-semibold text-[#E8E8E8]">Save Search</h2>
              <button
                onClick={() => setShowSaveSearch(false)}
                className="p-1 text-[#666] hover:text-[#E8E8E8] transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-4">
              <Input
                label="Search Name"
                value={newSearchName}
                onChange={e => setNewSearchName(e.target.value)}
                placeholder="e.g., Upbeat Hip-Hop 120+ BPM"
              />
            </div>
            <div className="flex justify-end gap-2 p-4 border-t border-[#1E1E22]">
              <button
                onClick={() => setShowSaveSearch(false)}
                className="px-4 py-2 text-sm text-[#888] hover:text-[#E8E8E8] transition-colors"
              >
                Cancel
              </button>
              <Btn onClick={saveCurrentSearch} disabled={!newSearchName.trim()}>
                Save
              </Btn>
            </div>
          </div>
        </div>
      )}

      {showPitchModal && pitchTrack && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-[#13131A] border border-[#1E1E22] rounded-xl w-full max-w-md shadow-2xl">
            <div className="flex items-center justify-between p-4 border-b border-[#1E1E22]">
              <h2 className="text-lg font-semibold text-[#E8E8E8]">Pitch Track</h2>
              <button
                onClick={() => setShowPitchModal(false)}
                className="p-1 text-[#666] hover:text-[#E8E8E8] transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-4 space-y-4">
              <div className="flex items-center gap-3 p-3 bg-[#0A0A0C] rounded-lg">
                <div
                  className="w-12 h-12 rounded flex items-center justify-center"
                  style={{ background: getMoodGradient(pitchTrack.mood) }}
                >
                  <span className="text-lg font-bold text-white/80">
                    {pitchTrack.title.charAt(0).toUpperCase()}
                  </span>
                </div>
                <div>
                  <p className="text-[#E8E8E8] font-medium">{pitchTrack.title}</p>
                  <p className="text-sm text-[#666]">{pitchTrack.artist}</p>
                </div>
              </div>
              <Input
                label="Supervisor Name"
                value={pitchForm.supervisorName}
                onChange={e => setPitchForm({ ...pitchForm, supervisorName: e.target.value })}
                placeholder="Who are you pitching to?"
              />
              <Input
                label="Project Name"
                value={pitchForm.projectName}
                onChange={e => setPitchForm({ ...pitchForm, projectName: e.target.value })}
                placeholder="Film, TV show, or campaign name"
              />
              <Input
                label="Offered Fee ($)"
                type="number"
                value={pitchForm.fee}
                onChange={e => setPitchForm({ ...pitchForm, fee: e.target.value })}
                placeholder="Sync license fee"
              />
            </div>
            <div className="flex justify-end gap-2 p-4 border-t border-[#1E1E22]">
              <button
                onClick={() => setShowPitchModal(false)}
                className="px-4 py-2 text-sm text-[#888] hover:text-[#E8E8E8] transition-colors"
              >
                Cancel
              </button>
              <Btn onClick={submitPitch} disabled={pitching || !pitchForm.supervisorName || !pitchForm.projectName}>
                {pitching ? 'Submitting...' : 'Submit Pitch'}
              </Btn>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

interface FeaturedCardProps {
  track: Track
  isPlaying: boolean
  isSaved: boolean
  isOnRoster: boolean
  onPlay: () => void
  onToggleSave: (e: React.MouseEvent) => void
  onPitch: () => void
}

function FeaturedCard({ track, isPlaying, isSaved, isOnRoster, onPlay, onToggleSave, onPitch }: FeaturedCardProps) {
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

        <div className={`absolute inset-0 bg-black/40 flex items-center justify-center gap-2 transition-opacity ${hovered ? 'opacity-100' : 'opacity-0'}`}>
          <button className="w-12 h-12 rounded-full bg-[#C8A97E] flex items-center justify-center shadow-lg transform transition-transform hover:scale-105">
            {isPlaying ? (
              <Pause className="w-5 h-5 text-[#0A0A0C]" />
            ) : (
              <Play className="w-5 h-5 text-[#0A0A0C] ml-0.5" />
            )}
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); onPitch() }}
            className="w-10 h-10 rounded-full bg-[#1A1A1E] flex items-center justify-center shadow-lg transform transition-transform hover:scale-105"
          >
            <Send className="w-4 h-4 text-[#E8E8E8]" />
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

        {isOnRoster && (
          <div className="absolute bottom-3 left-3">
            <span className="px-2 py-1 rounded bg-[#4DFFB4]/20 text-[#4DFFB4] text-xs font-medium">
              Roster
            </span>
          </div>
        )}
      </div>

      <h3 className="text-[#E8E8E8] font-medium text-sm truncate">{track.title}</h3>
      <ArtistLink artistName={track.artist} className="text-[#666] text-xs truncate block" />
    </div>
  )
}

interface TrackRowProps {
  track: Track
  index: number
  isPlaying: boolean
  isSaved: boolean
  isOnRoster: boolean
  onPlay: () => void
  onToggleSave: (e: React.MouseEvent) => void
  onPitch: () => void
  onAddToRoster: () => void
}

function TrackRow({ track, index, isPlaying, isSaved, isOnRoster, onPlay, onToggleSave, onPitch, onAddToRoster }: TrackRowProps) {
  const [hovered, setHovered] = useState(false)
  const moodColor = track.mood ? MOOD_COLORS[track.mood] : '#C8A97E'

  return (
    <div
      className={`grid grid-cols-[40px_minmax(200px,2fr)_1fr_80px_100px_80px_80px_140px] gap-4 px-4 py-3 items-center cursor-pointer transition-colors ${
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
          <div className="flex items-center gap-2">
            <p className={`text-sm font-medium truncate ${isPlaying ? 'text-[#C8A97E]' : 'text-[#E8E8E8]'}`}>
              {track.title}
            </p>
            {isOnRoster && (
              <span className="px-1.5 py-0.5 rounded text-[10px] bg-[#4DFFB4]/20 text-[#4DFFB4]">
                Roster
              </span>
            )}
          </div>
          <ArtistLink artistName={track.artist} className="text-xs text-[#666] truncate block" />
        </div>
      </div>

      <span className="text-sm text-[#888] truncate">{track.genre || '-'}</span>

      <span className="text-sm text-[#888]">{track.bpm || '-'}</span>

      <div>
        {track.mood ? <MoodPill mood={track.mood} /> : <span className="text-sm text-[#555]">-</span>}
      </div>

      <span className="text-sm text-[#888]">{formatTrackDurationMmSs(track)}</span>

      <span className="text-sm text-[#888] capitalize">{track.status || '-'}</span>

      <div className="flex items-center justify-end gap-1" onClick={e => e.stopPropagation()}>
        <button
          onClick={onToggleSave}
          className={`p-1.5 rounded transition-colors ${
            isSaved ? 'text-[#FF6B9D]' : 'text-[#888] hover:text-[#FF6B9D]'
          }`}
          title={isSaved ? 'Unsave' : 'Save'}
        >
          <Heart className={`w-4 h-4 ${isSaved ? 'fill-current' : ''}`} />
        </button>
        <button
          onClick={onPitch}
          className="p-1.5 rounded text-[#888] hover:text-[#C8A97E] hover:bg-[#C8A97E]/20 transition-colors"
          title="Pitch"
        >
          <Send className="w-4 h-4" />
        </button>
        {!isOnRoster && (
          <button
            onClick={onAddToRoster}
            className="p-1.5 rounded text-[#888] hover:text-[#4DFFB4] hover:bg-[#4DFFB4]/20 transition-colors"
            title="Add artist to roster"
          >
            <UserPlus className="w-4 h-4" />
          </button>
        )}
      </div>
    </div>
  )
}
