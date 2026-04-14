import { useState, useEffect, useRef, useCallback } from 'react'
import { supabase } from '../../lib/supabase'
import { MoodPill, Spinner, EmptyState, Btn, Input, Select, Textarea } from '../shared/UI'
import { ArtistLink } from '../shared/ArtistLink'
import { MOOD_COLORS, MOODS, GENRES } from '../../lib/constants'
import {
  Search, Play, Pause, ChevronRight, ChevronLeft, X, Pencil, Trash2,
  RefreshCw, BarChart3, Upload, Globe
} from 'lucide-react'
import type { Profile, Track } from '../../lib/types'
import { formatTrackDurationMmSs } from '../../lib/trackDuration'

interface MyCatalogProps {
  profile: Profile
  onPlayTrack: (track: Track) => void
  currentTrack: Track | null
  playing: boolean
  onNavigateToSearch?: () => void
}

type StatusTab = 'all' | 'active' | 'review' | 'rejected' | 'draft'

const STATUS_TABS: { id: StatusTab; label: string; color: string }[] = [
  { id: 'all', label: 'All', color: '#888' },
  { id: 'active', label: 'Active', color: '#4DFFB4' },
  { id: 'review', label: 'Pending', color: '#FFD700' },
  { id: 'rejected', label: 'Rejected', color: '#FF4D4D' },
  { id: 'draft', label: 'Draft', color: '#666' }
]

function getMoodGradient(mood?: string): string {
  const color = mood ? MOOD_COLORS[mood] || '#C8A97E' : '#C8A97E'
  return `linear-gradient(135deg, ${color}99 0%, #0A0A0C 100%)`
}

export function MyCatalog({ profile, onPlayTrack, currentTrack, playing, onNavigateToSearch }: MyCatalogProps) {
  const [tracks, setTracks] = useState<Track[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<StatusTab>('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedMood, setSelectedMood] = useState('All')
  const [selectedGenre, setSelectedGenre] = useState('All')
  const [bpmRange, setBpmRange] = useState<[number, number]>([60, 180])

  const [editingTrack, setEditingTrack] = useState<Track | null>(null)
  const [editForm, setEditForm] = useState<Partial<Track>>({})
  const [saving, setSaving] = useState(false)

  const featuredScrollRef = useRef<HTMLDivElement>(null)

  const loadTracks = useCallback(async () => {
    setLoading(true)
    const { data } = await supabase
      .from('tracks')
      .select('*')
      .eq('uploaded_by', profile.id)
      .order('created_at', { ascending: false })

    if (data) setTracks(data)
    setLoading(false)
  }, [profile.id])

  useEffect(() => {
    void loadTracks()
  }, [loadTracks])

  const getStatusCount = (status: StatusTab) => {
    if (status === 'all') return tracks.length
    return tracks.filter(t => t.status === status).length
  }

  const filteredTracks = tracks.filter(track => {
    const matchesTab = activeTab === 'all' || track.status === activeTab

    const matchesSearch = !searchQuery ||
      track.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      track.artist.toLowerCase().includes(searchQuery.toLowerCase()) ||
      track.mood?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      track.genre?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      track.tags?.some(t => t.toLowerCase().includes(searchQuery.toLowerCase()))

    const matchesMood = selectedMood === 'All' || track.mood === selectedMood
    const matchesGenre = selectedGenre === 'All' || track.genre === selectedGenre
    const matchesBpm = !track.bpm || (track.bpm >= bpmRange[0] && track.bpm <= bpmRange[1])

    return matchesTab && matchesSearch && matchesMood && matchesGenre && matchesBpm
  })

  const topTracks = [...tracks]
    .filter(t => t.status === 'active')
    .sort((a, b) => (b.play_count || 0) - (a.play_count || 0))
    .slice(0, 6)

  const stats = {
    total: tracks.length,
    active: tracks.filter(t => t.status === 'active').length,
    pending: tracks.filter(t => t.status === 'review').length,
    plays: tracks.reduce((sum, t) => sum + (t.play_count || 0), 0),
    saves: tracks.reduce((sum, t) => sum + (t.save_count || 0), 0)
  }

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

  const startEdit = (track: Track) => {
    setEditingTrack(track)
    setEditForm({
      title: track.title,
      artist: track.artist,
      mood: track.mood,
      genre: track.genre,
      sub_genre: track.sub_genre,
      bpm: track.bpm,
      key: track.musical_key ?? track.key,
      notes: track.notes ?? track.ownership_notes
    })
  }

  const saveEdit = async () => {
    if (!editingTrack) return
    setSaving(true)

    const keyTrim = editForm.key?.trim() || null
    const notesTrim = editForm.notes?.trim() || null
    await supabase
      .from('tracks')
      .update({
        title: editForm.title,
        artist: editForm.artist,
        mood: editForm.mood,
        genre: editForm.genre,
        sub_genre: editForm.sub_genre?.trim() || null,
        bpm: editForm.bpm,
        key: keyTrim,
        musical_key: keyTrim,
        notes: notesTrim,
        ownership_notes: notesTrim
      })
      .eq('id', editingTrack.id)

    setTracks(tracks.map(t => {
      if (t.id !== editingTrack.id) return t
      const k = editForm.key?.trim() || undefined
      return { ...t, ...editForm, key: k, musical_key: k, notes: notesTrim ?? undefined, ownership_notes: notesTrim ?? undefined }
    }))
    setEditingTrack(null)
    setEditForm({})
    setSaving(false)
  }

  const deleteTrack = async (trackId: string) => {
    await supabase.from('tracks').delete().eq('id', trackId)
    setTracks(tracks.filter(t => t.id !== trackId))
  }

  const resubmitTrack = async (trackId: string) => {
    await supabase.from('tracks').update({ status: 'review' }).eq('id', trackId)
    setTracks(tracks.map(t => t.id === trackId ? { ...t, status: 'review' } : t))
  }

  const getEmptyMessage = () => {
    switch (activeTab) {
      case 'active':
        return { title: 'No active tracks yet', description: 'Upload your first track to get started' }
      case 'review':
        return { title: 'No tracks pending review', description: 'Your submitted tracks will appear here' }
      case 'rejected':
        return { title: 'No rejected tracks', description: 'Tracks that need revision will appear here' }
      case 'draft':
        return { title: 'No draft tracks', description: 'Save tracks as drafts to finish later' }
      default:
        return { title: 'No tracks yet', description: 'Upload your first track to get started' }
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
            <h1 className="font-['Playfair_Display'] text-2xl font-semibold text-[#E8E8E8]">My Catalog</h1>
            <p className="text-[#666] text-sm mt-1">Manage your uploaded tracks</p>
          </div>
          {profile.role === 'supervisor' && onNavigateToSearch && (
            <button
              type="button"
              onClick={onNavigateToSearch}
              className="flex items-center gap-2 px-4 py-2 bg-[#1A1A1E] border border-[#2A2A2E] rounded-lg text-sm text-[#888] hover:text-[#E8E8E8] hover:border-[#C8A97E] transition-colors"
            >
              <Globe className="w-4 h-4" />
              Browse Platform Catalog
            </button>
          )}
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4 mb-6">
          <div className="bg-[#13131A] border border-[#1E1E22] rounded-xl p-4">
            <p className="text-[#666] text-xs uppercase tracking-wider mb-1">Total Tracks</p>
            <p className="text-2xl font-semibold text-[#E8E8E8]">{stats.total}</p>
          </div>
          <div className="bg-[#13131A] border border-[#1E1E22] rounded-xl p-4">
            <p className="text-[#666] text-xs uppercase tracking-wider mb-1">Active</p>
            <p className="text-2xl font-semibold text-[#4DFFB4]">{stats.active}</p>
          </div>
          <div className="bg-[#13131A] border border-[#1E1E22] rounded-xl p-4">
            <p className="text-[#666] text-xs uppercase tracking-wider mb-1">Pending</p>
            <p className="text-2xl font-semibold text-[#FFD700]">{stats.pending}</p>
          </div>
          <div className="bg-[#13131A] border border-[#1E1E22] rounded-xl p-4">
            <p className="text-[#666] text-xs uppercase tracking-wider mb-1">Total Plays</p>
            <p className="text-2xl font-semibold text-[#E8E8E8]">{stats.plays.toLocaleString()}</p>
          </div>
          <div className="bg-[#13131A] border border-[#1E1E22] rounded-xl p-4">
            <p className="text-[#666] text-xs uppercase tracking-wider mb-1">Total Saves</p>
            <p className="text-2xl font-semibold text-[#FF6B9D]">{stats.saves.toLocaleString()}</p>
          </div>
        </div>

        <div className="flex gap-2 mb-4 overflow-x-auto pb-2">
          {STATUS_TABS.map(tab => {
            const count = getStatusCount(tab.id)
            const isActive = activeTab === tab.id
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-all whitespace-nowrap ${
                  isActive
                    ? 'bg-[#C8A97E] text-[#0A0A0C]'
                    : 'bg-[#1A1A1E] text-[#888] hover:text-[#E8E8E8] border border-[#2A2A2E]'
                }`}
              >
                {tab.label}
                <span
                  className={`px-1.5 py-0.5 rounded text-xs font-medium ${
                    isActive ? 'bg-[#0A0A0C]/20 text-[#0A0A0C]' : ''
                  }`}
                  style={!isActive ? { backgroundColor: `${tab.color}20`, color: tab.color } : {}}
                >
                  {count}
                </span>
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

        {topTracks.length > 0 && activeTab === 'all' && (
          <section className="mb-8">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-['Playfair_Display'] text-lg text-white">Top Performing Tracks</h2>
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
              {topTracks.map(track => (
                <FeaturedCard
                  key={track.id}
                  track={track}
                  isPlaying={currentTrack?.id === track.id && playing}
                  onPlay={() => onPlayTrack(track)}
                  onEdit={() => startEdit(track)}
                />
              ))}
            </div>
          </section>
        )}

        <section>
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-['Playfair_Display'] text-lg text-white">
              {activeTab === 'all' ? 'All Tracks' : STATUS_TABS.find(t => t.id === activeTab)?.label}
            </h2>
            <span className="text-sm text-[#666]">{filteredTracks.length} tracks</span>
          </div>

          {filteredTracks.length > 0 ? (
            <div className="rounded-xl overflow-hidden">
              <div className="grid grid-cols-[40px_minmax(200px,2fr)_1fr_80px_100px_80px_100px_80px_80px_100px] gap-4 px-4 py-3 text-xs text-[#666] uppercase tracking-wider border-b border-[#1A1A1E]">
                <span>#</span>
                <span>Title</span>
                <span>Genre</span>
                <span>BPM</span>
                <span>Mood</span>
                <span>Duration</span>
                <span>Status</span>
                <span>Plays</span>
                <span>Saves</span>
                <span className="text-right">Actions</span>
              </div>
              {filteredTracks.map((track, index) => (
                <TrackRow
                  key={track.id}
                  track={track}
                  index={index + 1}
                  isPlaying={currentTrack?.id === track.id && playing}
                  onPlay={() => onPlayTrack(track)}
                  onEdit={() => startEdit(track)}
                  onDelete={() => deleteTrack(track.id)}
                  onResubmit={() => resubmitTrack(track.id)}
                />
              ))}
            </div>
          ) : (
            <EmptyState
              icon={<Upload className="w-12 h-12" />}
              title={getEmptyMessage().title}
              description={getEmptyMessage().description}
            />
          )}
        </section>
      </div>

      {editingTrack && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-[#13131A] border border-[#1E1E22] rounded-xl w-full max-w-2xl shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-4 border-b border-[#1E1E22]">
              <h2 className="text-lg font-semibold text-[#E8E8E8]">Edit Track</h2>
              <button
                onClick={() => setEditingTrack(null)}
                className="p-1 text-[#666] hover:text-[#E8E8E8] transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-4 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <Input
                  label="Title"
                  value={editForm.title || ''}
                  onChange={e => setEditForm({ ...editForm, title: e.target.value })}
                />
                <Input
                  label="Artist"
                  value={editForm.artist || ''}
                  onChange={e => setEditForm({ ...editForm, artist: e.target.value })}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <Select
                  label="Mood"
                  value={editForm.mood || ''}
                  onChange={e => setEditForm({ ...editForm, mood: e.target.value })}
                >
                  <option value="">Select mood</option>
                  {MOODS.filter(m => m !== 'All').map(mood => (
                    <option key={mood} value={mood}>{mood}</option>
                  ))}
                </Select>
                <Select
                  label="Genre"
                  value={editForm.genre || ''}
                  onChange={e => setEditForm({ ...editForm, genre: e.target.value })}
                >
                  <option value="">Select genre</option>
                  {GENRES.filter(g => g !== 'All').map(genre => (
                    <option key={genre} value={genre}>{genre}</option>
                  ))}
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <Input
                  label="BPM"
                  type="number"
                  value={editForm.bpm || ''}
                  onChange={e => setEditForm({ ...editForm, bpm: parseInt(e.target.value) || undefined })}
                />
                <Input
                  label="Key"
                  value={editForm.key || ''}
                  onChange={e => setEditForm({ ...editForm, key: e.target.value })}
                />
              </div>
              <Input
                label="Sub-genre (optional)"
                value={editForm.sub_genre || ''}
                onChange={e => setEditForm({ ...editForm, sub_genre: e.target.value })}
                placeholder="e.g. Dark pop"
              />
              <Textarea
                label="Notes (optional)"
                value={editForm.notes || ''}
                onChange={e => setEditForm({ ...editForm, notes: e.target.value })}
                placeholder="Track notes"
                rows={3}
                className="bg-[#0D0D10] border border-[#2A2A2E] rounded-lg"
              />
            </div>

            <div className="flex justify-end gap-2 p-4 border-t border-[#1E1E22]">
              <button
                onClick={() => setEditingTrack(null)}
                className="px-4 py-2 text-sm text-[#888] hover:text-[#E8E8E8] transition-colors"
              >
                Cancel
              </button>
              <Btn onClick={saveEdit} disabled={saving}>
                {saving ? 'Saving...' : 'Save Changes'}
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
  onPlay: () => void
  onEdit: () => void
}

function FeaturedCard({ track, isPlaying, onPlay, onEdit }: FeaturedCardProps) {
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
            onClick={(e) => { e.stopPropagation(); onEdit() }}
            className="w-10 h-10 rounded-full bg-[#1A1A1E] flex items-center justify-center shadow-lg transform transition-transform hover:scale-105"
          >
            <Pencil className="w-4 h-4 text-[#E8E8E8]" />
          </button>
        </div>

        {track.mood && (
          <div className="absolute top-3 left-3">
            <MoodPill mood={track.mood} />
          </div>
        )}

        <div className="absolute bottom-3 right-3 flex items-center gap-2">
          <span className="px-2 py-1 rounded bg-black/40 text-xs text-white flex items-center gap-1">
            <BarChart3 className="w-3 h-3" />
            {track.play_count || 0}
          </span>
        </div>
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
  onPlay: () => void
  onEdit: () => void
  onDelete: () => void
  onResubmit: () => void
}

function TrackRow({ track, index, isPlaying, onPlay, onEdit, onDelete, onResubmit }: TrackRowProps) {
  const [hovered, setHovered] = useState(false)
  const moodColor = track.mood ? MOOD_COLORS[track.mood] : '#C8A97E'

  const getStatusBadge = (status?: string) => {
    const config: Record<string, { label: string; color: string }> = {
      active: { label: 'Active', color: '#4DFFB4' },
      review: { label: 'Pending', color: '#FFD700' },
      rejected: { label: 'Rejected', color: '#FF4D4D' },
      draft: { label: 'Draft', color: '#666' }
    }
    const { label, color } = config[status || 'review'] || config.review
    return (
      <span
        className="px-2 py-0.5 rounded text-xs font-medium"
        style={{ backgroundColor: `${color}20`, color }}
      >
        {label}
      </span>
    )
  }

  return (
    <div
      className={`grid grid-cols-[40px_minmax(200px,2fr)_1fr_80px_100px_80px_100px_80px_80px_100px] gap-4 px-4 py-3 items-center cursor-pointer transition-colors ${
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

      <span className="text-sm text-[#888]">{formatTrackDurationMmSs(track)}</span>

      <div>{getStatusBadge(track.status)}</div>

      <span className="text-sm text-[#888]">{track.play_count || 0}</span>

      <span className="text-sm text-[#FF6B9D]">{track.save_count || 0}</span>

      <div className="flex items-center justify-end gap-1" onClick={e => e.stopPropagation()}>
        <button
          onClick={onEdit}
          className="p-1.5 rounded text-[#888] hover:text-[#E8E8E8] hover:bg-[#2A2A2E] transition-colors"
          title="Edit"
        >
          <Pencil className="w-4 h-4" />
        </button>
        {(track.status === 'rejected' || track.status === 'draft') && (
          <>
            <button
              onClick={onResubmit}
              className="p-1.5 rounded text-[#FFD700] hover:bg-[#FFD700]/20 transition-colors"
              title="Resubmit"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
            <button
              onClick={onDelete}
              className="p-1.5 rounded text-[#FF4D4D] hover:bg-[#FF4D4D]/20 transition-colors"
              title="Delete"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </>
        )}
      </div>
    </div>
  )
}
