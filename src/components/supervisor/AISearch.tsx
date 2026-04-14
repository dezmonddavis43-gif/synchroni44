import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import { MoodPill, Spinner, EmptyState } from '../shared/UI'
import { MOOD_COLORS } from '../../lib/constants'
import { Play, Pause, Heart, Sparkles, Wand2, X, Filter, SlidersHorizontal } from 'lucide-react'
import type { Profile, Track } from '../../lib/types'
import { formatTrackDurationMmSs } from '../../lib/trackDuration'

interface AISearchProps {
  profile: Profile
  onPlayTrack: (track: Track) => void
  currentTrack: Track | null
  playing: boolean
}

const EXAMPLE_QUERIES = [
  "Upbeat indie rock for a road trip commercial",
  "Moody R&B with female vocals for a fashion brand",
  "Cinematic orchestral for a tech product launch",
  "Lo-fi hip hop for a coffee shop scene",
  "Energetic electronic for a workout montage",
  "Acoustic folk for a heartfelt documentary"
]

export function AISearch({ profile, onPlayTrack, currentTrack, playing }: AISearchProps) {
  const [tracks, setTracks] = useState<Track[]>([])
  const [savedTracks, setSavedTracks] = useState<Set<string>>(new Set())
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [isSearching, setIsSearching] = useState(false)
  const [searchResults, setSearchResults] = useState<Track[]>([])
  const [hasSearched, setHasSearched] = useState(false)
  const [showFilters, setShowFilters] = useState(false)
  const [minBpm, setMinBpm] = useState('')
  const [maxBpm, setMaxBpm] = useState('')

  useEffect(() => {
    loadData()
  }, [profile.id])

  const loadData = async () => {
    setLoading(true)
    const [tracksRes, savedRes] = await Promise.all([
      supabase.from('tracks').select('*').eq('status', 'active').order('created_at', { ascending: false }),
      supabase.from('saved_tracks').select('track_id').eq('user_id', profile.id)
    ])

    if (tracksRes.data) setTracks(tracksRes.data)
    if (savedRes.data) setSavedTracks(new Set(savedRes.data.map(s => s.track_id)))
    setLoading(false)
  }

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

  const handleSearch = async () => {
    if (!searchQuery.trim()) return

    setIsSearching(true)
    setHasSearched(true)

    const queryLower = searchQuery.toLowerCase()
    const keywords = queryLower.split(/\s+/).filter(k => k.length > 2)

    const matched = tracks.filter(track => {
      let score = 0

      keywords.forEach(keyword => {
        if (track.title?.toLowerCase().includes(keyword)) score += 3
        if (track.artist?.toLowerCase().includes(keyword)) score += 2
        if (track.mood?.toLowerCase().includes(keyword)) score += 5
        if (track.genre?.toLowerCase().includes(keyword)) score += 4
        if (track.tags?.some(t => t.toLowerCase().includes(keyword))) score += 3
      })

      if (queryLower.includes('upbeat') || queryLower.includes('energetic') || queryLower.includes('happy')) {
        if (['Hopeful', 'Aggressive'].includes(track.mood || '')) score += 4
      }
      if (queryLower.includes('chill') || queryLower.includes('relaxed') || queryLower.includes('calm')) {
        if (['Peaceful', 'Melancholic'].includes(track.mood || '')) score += 4
      }
      if (queryLower.includes('dark') || queryLower.includes('intense') || queryLower.includes('dramatic')) {
        if (['Tense', 'Suspenseful', 'Aggressive'].includes(track.mood || '')) score += 4
      }
      if (queryLower.includes('romantic') || queryLower.includes('sensual') || queryLower.includes('love')) {
        if (['Sensual', 'Nostalgic'].includes(track.mood || '')) score += 4
      }
      if (queryLower.includes('cinematic') || queryLower.includes('epic') || queryLower.includes('orchestral')) {
        if (['Suspenseful', 'Nostalgic', 'Hopeful'].includes(track.mood || '')) score += 4
      }

      if (minBpm && track.bpm && track.bpm < parseInt(minBpm)) return false
      if (maxBpm && track.bpm && track.bpm > parseInt(maxBpm)) return false

      return score > 0
    })

    const sorted = [...matched].sort((a, b) => {
      let scoreA = 0
      let scoreB = 0
      keywords.forEach(keyword => {
        if (a.mood?.toLowerCase().includes(keyword)) scoreA += 5
        if (a.genre?.toLowerCase().includes(keyword)) scoreA += 4
        if (b.mood?.toLowerCase().includes(keyword)) scoreB += 5
        if (b.genre?.toLowerCase().includes(keyword)) scoreB += 4
      })
      return scoreB - scoreA
    })

    await new Promise(resolve => setTimeout(resolve, 800))
    setSearchResults(sorted)
    setIsSearching(false)
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSearch()
    }
  }

  const handleExampleClick = (query: string) => {
    setSearchQuery(query)
    setTimeout(() => {
      setIsSearching(true)
      setHasSearched(true)
      handleSearch()
    }, 100)
  }

  const clearSearch = () => {
    setSearchQuery('')
    setSearchResults([])
    setHasSearched(false)
    setMinBpm('')
    setMaxBpm('')
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
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-[#C8A97E]/20 to-[#C8A97E]/5 mb-4">
              <Sparkles className="w-8 h-8 text-[#C8A97E]" />
            </div>
            <h1 className="font-['Playfair_Display'] text-3xl text-white mb-2">AI Music Search</h1>
            <p className="text-[#888] text-sm max-w-md mx-auto">
              Describe what you're looking for in natural language and let AI find the perfect tracks for your project
            </p>
          </div>

          <div className="relative mb-4">
            <div className="absolute left-4 top-1/2 -translate-y-1/2">
              <Wand2 className="w-5 h-5 text-[#C8A97E]" />
            </div>
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Describe the music you need... e.g., 'upbeat indie for a summer ad'"
              className="w-full bg-[#1A1A1E] border border-[#2A2A2E] rounded-xl pl-12 pr-32 py-4 text-[#E8E8E8] placeholder-[#555] focus:outline-none focus:border-[#C8A97E] transition-colors text-sm"
            />
            <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-2">
              {searchQuery && (
                <button
                  onClick={clearSearch}
                  className="p-2 rounded-lg text-[#666] hover:text-[#E8E8E8] transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
              <button
                onClick={() => setShowFilters(!showFilters)}
                className={`p-2 rounded-lg transition-colors ${showFilters ? 'bg-[#C8A97E]/20 text-[#C8A97E]' : 'text-[#666] hover:text-[#E8E8E8]'}`}
              >
                <SlidersHorizontal className="w-4 h-4" />
              </button>
              <button
                onClick={handleSearch}
                disabled={!searchQuery.trim() || isSearching}
                className="px-4 py-2 bg-[#C8A97E] text-[#0A0A0C] rounded-lg text-sm font-medium hover:bg-[#B89A6F] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSearching ? 'Searching...' : 'Search'}
              </button>
            </div>
          </div>

          {showFilters && (
            <div className="flex items-center gap-4 mb-6 p-4 bg-[#1A1A1E] rounded-xl border border-[#2A2A2E]">
              <div className="flex items-center gap-2">
                <Filter className="w-4 h-4 text-[#666]" />
                <span className="text-sm text-[#888]">Filters:</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs text-[#666]">BPM</span>
                <input
                  type="number"
                  value={minBpm}
                  onChange={e => setMinBpm(e.target.value)}
                  placeholder="Min"
                  className="w-16 bg-[#0A0A0C] border border-[#2A2A2E] rounded px-2 py-1 text-xs text-[#E8E8E8] focus:outline-none focus:border-[#C8A97E]"
                />
                <span className="text-[#666]">-</span>
                <input
                  type="number"
                  value={maxBpm}
                  onChange={e => setMaxBpm(e.target.value)}
                  placeholder="Max"
                  className="w-16 bg-[#0A0A0C] border border-[#2A2A2E] rounded px-2 py-1 text-xs text-[#E8E8E8] focus:outline-none focus:border-[#C8A97E]"
                />
              </div>
            </div>
          )}

          {!hasSearched && (
            <div className="mb-8">
              <p className="text-xs text-[#666] mb-3">Try these examples:</p>
              <div className="flex flex-wrap gap-2">
                {EXAMPLE_QUERIES.map((query, i) => (
                  <button
                    key={i}
                    onClick={() => handleExampleClick(query)}
                    className="px-3 py-1.5 bg-[#1A1A1E] border border-[#2A2A2E] rounded-full text-xs text-[#888] hover:text-[#E8E8E8] hover:border-[#C8A97E] transition-colors"
                  >
                    {query}
                  </button>
                ))}
              </div>
            </div>
          )}

          {isSearching && (
            <div className="flex flex-col items-center justify-center py-16">
              <div className="relative mb-4">
                <div className="w-16 h-16 rounded-full border-2 border-[#C8A97E]/20 border-t-[#C8A97E] animate-spin" />
                <Sparkles className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-6 h-6 text-[#C8A97E]" />
              </div>
              <p className="text-[#888] text-sm">Analyzing your request...</p>
            </div>
          )}

          {hasSearched && !isSearching && (
            <div>
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <h2 className="font-['Playfair_Display'] text-lg text-white">Results</h2>
                  <span className="px-2 py-0.5 bg-[#C8A97E]/10 rounded text-xs text-[#C8A97E]">
                    {searchResults.length} tracks found
                  </span>
                </div>
                <button
                  onClick={clearSearch}
                  className="text-xs text-[#888] hover:text-[#E8E8E8] transition-colors"
                >
                  Clear search
                </button>
              </div>

              {searchResults.length > 0 ? (
                <div className="rounded-xl overflow-hidden border border-[#1A1A1E]">
                  {searchResults.map((track, index) => (
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
                  title="No Matching Tracks"
                  description="Try adjusting your search query or filters to find more results"
                />
              )}
            </div>
          )}
        </div>
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
  const moodColor = track.mood ? MOOD_COLORS[track.mood] : '#C8A97E'

  return (
    <div
      className={`flex items-center gap-4 px-4 py-3 cursor-pointer transition-colors ${
        hovered ? 'bg-[#1A1A1E]' : index % 2 === 0 ? 'bg-[#0D0D10]' : 'bg-transparent'
      } ${isPlaying ? 'bg-[#C8A97E]/10' : ''}`}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onClick={onPlay}
    >
      <div className="w-8 flex items-center justify-center">
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

      <div
        className="w-10 h-10 rounded flex-shrink-0 flex items-center justify-center"
        style={{ background: `linear-gradient(135deg, ${moodColor}60 0%, #1A1A1E 100%)` }}
      >
        <span className="text-sm font-semibold text-white/80">
          {track.title.charAt(0).toUpperCase()}
        </span>
      </div>

      <div className="flex-1 min-w-0">
        <p className={`text-sm font-medium truncate ${isPlaying ? 'text-[#C8A97E]' : 'text-[#E8E8E8]'}`}>
          {track.title}
        </p>
        <p className="text-xs text-[#666] truncate">{track.artist}</p>
      </div>

      <div className="hidden sm:block w-24">
        <span className="text-sm text-[#888] truncate">{track.genre || '-'}</span>
      </div>

      <div className="hidden md:block w-16">
        <span className="text-sm text-[#888]">{track.bpm || '-'}</span>
      </div>

      <div className="hidden lg:block w-24">
        {track.mood ? <MoodPill mood={track.mood} /> : <span className="text-sm text-[#555]">-</span>}
      </div>

      <div className="w-16 text-right">
        <span className="text-sm text-[#888]">{formatTrackDurationMmSs(track)}</span>
      </div>

      <div className="flex items-center gap-2">
        <button
          onClick={onToggleSave}
          className={`p-1.5 rounded-full transition-colors ${
            isSaved ? 'text-[#FF6B9D]' : hovered ? 'text-[#888] hover:text-[#FF6B9D]' : 'text-transparent'
          }`}
        >
          <Heart className={`w-4 h-4 ${isSaved ? 'fill-current' : ''}`} />
        </button>
      </div>
    </div>
  )
}
