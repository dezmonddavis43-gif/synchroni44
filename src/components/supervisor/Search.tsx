import { useState, useEffect, useRef, useMemo } from 'react'
import { supabase } from '../../lib/supabase'
import { Search as SearchIcon, Play, Pause, Heart, X } from 'lucide-react'
import { MoodPill, Spinner, EmptyState, TrackArtwork } from '../shared/UI'
import { MOOD_COLORS, MOODS, GENRES } from '../../lib/constants'
import type { Profile, Track } from '../../lib/types'
import { formatTrackDurationMmSs } from '../../lib/trackDuration'
import { TrackDetailModal } from '../shared/TrackDetailModal'
import { ArtistLink } from '../shared/ArtistLink'

interface SearchProps {
  profile: Profile
  onPlayTrack: (track: Track) => void
  currentTrack: Track | null
  playing: boolean
  globalSearch: string
}

export function Search({ profile, onPlayTrack, currentTrack, playing, globalSearch }: SearchProps) {
  const [allTracks, setAllTracks] = useState<Track[]>([])
  const [savedTracks, setSavedTracks] = useState<Set<string>>(new Set())
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedMood, setSelectedMood] = useState('All')
  const [selectedGenre, setSelectedGenre] = useState('All')
  const [bpmRange, setBpmRange] = useState<[number, number]>([60, 180])
  const [selectedTrack, setSelectedTrack] = useState<Track | null>(null)
  const [hoveredTrack, setHoveredTrack] = useState<string | null>(null)
  const searchInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    const load = async () => {
      setLoading(true)
      const { data } = await supabase
        .from('tracks')
        .select('*')
        .eq('status', 'active')
        .order('play_count', { ascending: false })

      if (data) setAllTracks(data as Track[])

      const { data: authData } = await supabase.auth.getUser()
      const userId = authData.user?.id ?? profile.id
      const { data: saved } = await supabase.from('saved_tracks').select('track_id').eq('user_id', userId)
      if (saved) setSavedTracks(new Set(saved.map(s => s.track_id)))

      setLoading(false)
    }
    void load()
  }, [profile.id])

  useEffect(() => {
    if (globalSearch) setSearchQuery(globalSearch)
  }, [globalSearch])

  const featuredTracks = useMemo(() => allTracks.slice(0, 12), [allTracks])

  const filteredTracks = useMemo(() => {
    const q = (globalSearch.trim() || searchQuery.trim()).toLowerCase()
    return allTracks.filter(track => {
      const matchesText =
        !q ||
        (track.title || '').toLowerCase().includes(q) ||
        (track.artist || '').toLowerCase().includes(q) ||
        (track.genre || '').toLowerCase().includes(q) ||
        (track.mood || '').toLowerCase().includes(q) ||
        (track.tags || []).some(t => t.toLowerCase().includes(q))

      const matchesMood =
        selectedMood === 'All' ||
        (track.mood || '').toLowerCase().includes(selectedMood.toLowerCase())

      const matchesGenre = selectedGenre === 'All' || track.genre === selectedGenre

      const matchesBpm =
        !track.bpm || (track.bpm >= bpmRange[0] && track.bpm <= bpmRange[1])

      return matchesText && matchesMood && matchesGenre && matchesBpm
    })
  }, [allTracks, globalSearch, searchQuery, selectedMood, selectedGenre, bpmRange])

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

  const hasFilters = selectedMood !== 'All' || selectedGenre !== 'All' || bpmRange[0] !== 60 || bpmRange[1] !== 180 || !!searchQuery.trim() || !!globalSearch.trim()

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
            placeholder="Search by title, artist, genre, tags…"
            className="w-full bg-[#1A1A1E] border border-[#2A2A2E] rounded-full pl-12 pr-4 py-3 text-[#E8E8E8] placeholder-[#555] focus:outline-none focus:border-[#C8A97E] transition-colors"
          />
          {(searchQuery || globalSearch) && (
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              className="absolute right-4 top-1/2 -translate-y-1/2 p-1 text-[#666] hover:text-[#E8E8E8]"
            >
              <X className="w-4 h-4" />
            </button>
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

          {hasFilters && (
            <button
              type="button"
              onClick={() => { setSelectedMood('All'); setSelectedGenre('All'); setBpmRange([60, 180]); setSearchQuery('') }}
              className="flex items-center gap-1 px-3 py-1.5 rounded-full text-xs text-[#FF6B9D] bg-[#FF6B9D]/10 border border-[#FF6B9D]/20 hover:bg-[#FF6B9D]/20 flex-shrink-0"
            >
              <X className="w-3 h-3" /> Clear
            </button>
          )}
        </div>

        <section className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-display text-lg text-[#E8E8E8]">Featured Tracks</h2>
            <span className="text-xs text-[#555]">{allTracks.length} active</span>
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
                  role="button"
                  tabIndex={0}
                  onClick={() => onPlayTrack(track)}
                  onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onPlayTrack(track) } }}
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
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center pointer-events-none">
                      <div className="w-12 h-12 rounded-full bg-[#C8A97E] flex items-center justify-center">
                        {isPlaying ? <Pause className="w-5 h-5 text-[#0A0A0C]" /> : <Play className="w-5 h-5 text-[#0A0A0C] ml-0.5" />}
                      </div>
                    </div>
                  </div>
                  <button
                    type="button"
                    className="text-left w-full"
                    onClick={e => { e.stopPropagation(); setSelectedTrack(track) }}
                  >
                    <p className="text-sm font-medium text-[#E8E8E8] truncate">{title}</p>
                    <ArtistLink artistName={artist} className="text-xs text-[#666] truncate block" />
                  </button>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-xs text-[#555]">{track.bpm || '-'} BPM</span>
                    {track.mood && <MoodPill mood={track.mood} />}
                  </div>
                </div>
              )
            })}
          </div>
        </section>

        <section>
          <h2 className="font-display text-lg text-[#E8E8E8] mb-4">
            {(globalSearch.trim() || searchQuery.trim()) ? 'Filtered tracks' : 'All tracks'}
            <span className="text-sm font-normal text-[#666] ml-2">({filteredTracks.length})</span>
          </h2>
          {filteredTracks.length > 0 ? (
            <div className="bg-[#0D0D10] rounded-xl border border-[#1A1A1E] overflow-hidden">
              <div className="grid grid-cols-[40px_1fr_100px_60px_60px_60px_80px_40px] gap-4 px-4 py-3 text-xs text-[#555] border-b border-[#1A1A1E] font-medium">
                <span>#</span>
                <span>TITLE</span>
                <span className="hidden md:block">GENRE</span>
                <span className="hidden md:block">BPM</span>
                <span className="hidden lg:block">KEY</span>
                <span>TIME</span>
                <span className="hidden lg:block">MOOD</span>
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
                    className={`grid grid-cols-[40px_1fr_100px_60px_60px_60px_80px_40px] gap-4 px-4 py-2.5 items-center cursor-pointer transition-colors ${
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
                    <span className="text-sm text-[#888]">{formatTrackDurationMmSs(track)}</span>
                    <div className="hidden lg:block">{track.mood && <MoodPill mood={track.mood} />}</div>
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
