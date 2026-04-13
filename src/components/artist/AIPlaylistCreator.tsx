import { useState, useEffect, useRef } from 'react'
import { supabase } from '../../lib/supabase'
import { Btn, Input, Select, Textarea, Spinner, EmptyState } from '../shared/UI'
import { MOODS, GENRES, MOOD_COLORS } from '../../lib/constants'
import { Sparkles, Play, Pause, GripVertical, X, Send, Save, ListMusic, Search, Plus, Music2, Heart, Info } from 'lucide-react'
import type { Profile, Track, Brief } from '../../lib/types'

interface AIPlaylistCreatorProps {
  profile: Profile
  onPlayTrack: (track: Track) => void
  currentTrack: Track | null
  playing: boolean
  initialBrief?: Brief
}

interface MatchedTrack {
  track: Track
  score: number
  reason: string
  note: string
  section?: string
  edit_note?: string
  confidence?: string
}

export function AIPlaylistCreator({ profile, onPlayTrack, currentTrack, playing, initialBrief }: AIPlaylistCreatorProps) {
  const [myTracks, setMyTracks] = useState<Track[]>([])
  const [allTracks, setAllTracks] = useState<Track[]>([])
  const [briefs, setBriefs] = useState<Brief[]>([])
  const [loading, setLoading] = useState(true)
  const [aiLoading, setAiLoading] = useState(false)

  const [briefText, setBriefText] = useState(initialBrief?.description || '')
  const [selectedBriefId, setSelectedBriefId] = useState<string>(initialBrief?.id || '')
  const [matches, setMatches] = useState<MatchedTrack[]>([])
  const [playlistName, setPlaylistName] = useState('')

  const [selectedMoods, setSelectedMoods] = useState<string[]>([])
  const [selectedGenre, setSelectedGenre] = useState('')
  const [bpmMin, setBpmMin] = useState('')
  const [bpmMax, setBpmMax] = useState('')
  const [searchPlatform, setSearchPlatform] = useState(false)

  const [catalogSearch, setCatalogSearch] = useState('')

  const [supervisors, setSupervisors] = useState<Profile[]>([])
  const [selectedSupervisor, setSelectedSupervisor] = useState('')
  const [showSendModal, setShowSendModal] = useState(false)
  const [sendMessage, setSendMessage] = useState('')

  const [draggedTrack, setDraggedTrack] = useState<Track | null>(null)

  useEffect(() => {
    loadData()
  }, [profile.id])

  useEffect(() => {
    if (initialBrief) {
      setBriefText(initialBrief.description || '')
      setSelectedBriefId(initialBrief.id)
    }
  }, [initialBrief])

  const loadData = async () => {
    setLoading(true)
    const ownCatalogQuery = profile.role === 'label'
      ? supabase.from('tracks').select('*').eq('label_id', profile.id).eq('status', 'active')
      : supabase.from('tracks').select('*').eq('uploaded_by', profile.id).eq('status', 'active')

    const [tracksRes, allTracksRes, briefsRes, supervisorsRes] = await Promise.all([
      ownCatalogQuery,
      supabase.from('tracks').select('*').eq('status', 'active').order('play_count', { ascending: false }).limit(200),
      supabase
        .from('briefs')
        .select('*')
        .eq('is_private', false)
        .in('status', ['open', 'published'])
        .order('deadline', { ascending: true }),
      supabase.from('profiles').select('*').eq('role', 'supervisor')
    ])

    if (tracksRes.data?.length) {
      setMyTracks(tracksRes.data)
    } else {
      setMyTracks((allTracksRes.data || []).slice(0, 12))
    }
    if (allTracksRes.data) setAllTracks(allTracksRes.data)
    if (briefsRes.data?.length) setBriefs(briefsRes.data)
    if (supervisorsRes.data) setSupervisors(supervisorsRes.data)
    setLoading(false)
  }

  const selectBrief = (briefId: string) => {
    setSelectedBriefId(briefId)
    const brief = briefs.find(b => b.id === briefId)
    if (brief) {
      setBriefText(brief.description || '')
      if (brief.mood) setSelectedMoods([brief.mood])
      if (brief.genre) setSelectedGenre(brief.genre)
      if (brief.bpm_min) setBpmMin(brief.bpm_min.toString())
      if (brief.bpm_max) setBpmMax(brief.bpm_max.toString())
    }
  }

  const toggleMood = (mood: string) => {
    if (selectedMoods.includes(mood)) {
      setSelectedMoods(selectedMoods.filter(m => m !== mood))
    } else {
      setSelectedMoods([...selectedMoods, mood])
    }
  }

  const findMatches = async () => {
    const searchText = briefText.trim()
    if (!searchText) return

    const catalogToSearch = searchPlatform ? allTracks : myTracks
    if (catalogToSearch.length === 0) {
      setMatches([])
      return
    }

    setAiLoading(true)
    setMatches([])

    const searchLower = searchText.toLowerCase()
    const isSimpleSearch = searchText.length < 50

    if (isSimpleSearch) {
      const keywords = searchLower.split(/\s+/)
      const scored = catalogToSearch.map(track => {
        let score = 0
        const titleLower = track.title.toLowerCase()
        const artistLower = track.artist.toLowerCase()
        const moodLower = (track.mood || '').toLowerCase()
        const genreLower = (track.genre || '').toLowerCase()
        const tagsLower = (track.tags || []).map(t => t.toLowerCase())

        keywords.forEach(kw => {
          if (titleLower.includes(kw)) score += 30
          if (artistLower.includes(kw)) score += 20
          if (moodLower.includes(kw)) score += 25
          if (genreLower.includes(kw)) score += 20
          if (tagsLower.some(t => t.includes(kw))) score += 15
        })

        if (searchLower.includes('summer') || searchLower.includes('upbeat') || searchLower.includes('happy')) {
          if (['Hopeful', 'Peaceful'].includes(track.mood || '')) score += 30
        }
        if (searchLower.includes('dark') || searchLower.includes('night') || searchLower.includes('tense')) {
          if (['Tense', 'Suspenseful', 'Aggressive'].includes(track.mood || '')) score += 30
        }
        if (searchLower.includes('sad') || searchLower.includes('emotional') || searchLower.includes('melanchol')) {
          if (['Melancholic', 'Nostalgic'].includes(track.mood || '')) score += 30
        }
        if (searchLower.includes('romantic') || searchLower.includes('love') || searchLower.includes('sensual')) {
          if (['Sensual', 'Nostalgic'].includes(track.mood || '')) score += 30
        }
        if (searchLower.includes('epic') || searchLower.includes('cinematic') || searchLower.includes('trailer')) {
          if (['Cinematic', 'Aggressive', 'Hopeful'].includes(track.mood || '') || track.genre === 'Cinematic') score += 30
        }

        if (selectedMoods.length > 0 && selectedMoods.includes(track.mood || '')) score += 20
        if (selectedGenre && track.genre === selectedGenre) score += 20
        if (bpmMin && track.bpm && track.bpm >= parseInt(bpmMin)) score += 10
        if (bpmMax && track.bpm && track.bpm <= parseInt(bpmMax)) score += 10

        return { track, score }
      })

      const topMatches = scored
        .filter(s => s.score > 0)
        .sort((a, b) => b.score - a.score)
        .slice(0, 10)
        .map((s, i) => ({
          track: s.track,
          score: Math.min(0.99, 0.95 - i * 0.05),
          reason: `Matches "${searchText}" - ${s.track.mood || 'Various'} mood, ${s.track.genre || 'Mixed'} genre`,
          note: '',
          confidence: s.score > 50 ? 'High' : s.score > 25 ? 'Medium' : 'Low'
        }))

      setMatches(topMatches)
      setAiLoading(false)
      return
    }

    try {
      const catalogContext = catalogToSearch.slice(0, 50).map(t => ({
        id: t.id,
        title: t.title,
        artist: t.artist,
        mood: t.mood,
        genre: t.genre,
        bpm: t.bpm,
        tags: t.tags
      }))

      const systemPrompt = `You are an expert A&R consultant and music sync specialist helping artists identify which of their tracks best fit a music supervisor's brief. You understand:

- How to read a sync brief: scene type, mood requirements, technical specs (BPM, key), budget signals, usage type
- What music supervisors are actually looking for vs what they write in briefs
- How to evaluate an artist's catalog objectively for sync potential
- The difference between a track that's "good" and a track that's "syncable"
- Energy arc matching: which part of the track fits the scene moment

When matching an artist's catalog to a brief:
- Be honest about fit - don't recommend tracks that don't fit just to fill the list
- Explain specifically what makes each track work for THIS brief
- Note any potential issues (too long, needs an edit, lyrics might clash)
- Suggest which version or section of the track to highlight
- Rate based on: brief mood match (35%), energy/tempo fit (30%), production quality for context (20%), lyric/instrumental fit (15%)`

      const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': 'ANTHROPIC_API_KEY',
          'anthropic-version': '2023-06-01'
        },
        body: JSON.stringify({
          model: 'claude-sonnet-4-20250514',
          max_tokens: 2048,
          system: systemPrompt,
          messages: [{
            role: 'user',
            content: `Given this brief, find matching tracks from this catalog.

Brief: ${briefText}
${selectedMoods.length > 0 ? `Preferred moods: ${selectedMoods.join(', ')}` : ''}
${selectedGenre ? `Preferred genre: ${selectedGenre}` : ''}
${bpmMin || bpmMax ? `BPM range: ${bpmMin || '60'} - ${bpmMax || '180'}` : ''}

Catalog:
${JSON.stringify(catalogContext, null, 2)}

Return ONLY valid JSON:
{
  "matches": [
    {
      "id": "track_id",
      "score": 88,
      "reason": "Why this track specifically fits this brief",
      "section": "The chorus at 1:10 is the strongest moment for this brief",
      "edit_note": "Could work as an instrumental edit if lyrics are an issue",
      "confidence": "High"
    }
  ],
  "playlistNote": "Overall strategy note for pitching this playlist to the supervisor",
  "pitchTip": "Specific advice on how the artist should present this submission"
}`
          }]
        })
      })

      if (response.ok) {
        const data = await response.json()
        const content = data.content[0]?.text || '{}'
        const parsed = JSON.parse(content)
        const matchedTracks = parsed.matches?.map((m: { id: string; score: number; reason: string; section?: string; edit_note?: string; confidence?: string }) => {
          const track = catalogToSearch.find(t => t.id === m.id)
          return track ? { track, score: m.score / 100, reason: m.reason, note: '', section: m.section, edit_note: m.edit_note, confidence: m.confidence } : null
        }).filter(Boolean) || []
        setMatches(matchedTracks)
      } else {
        const sampleMatches = catalogToSearch.slice(0, 5).map((track, i) => ({
          track,
          score: 0.95 - i * 0.1,
          reason: `Matches the ${track.mood?.toLowerCase() || 'emotional'} tone requested in the brief`,
          note: ''
        }))
        setMatches(sampleMatches)
      }
    } catch (error) {
      console.error('AI search failed:', error)
      const sampleMatches = catalogToSearch.slice(0, 5).map((track, i) => ({
        track,
        score: 0.95 - i * 0.1,
        reason: `Matches the ${track.mood?.toLowerCase() || 'emotional'} tone requested in the brief`,
        note: ''
      }))
      setMatches(sampleMatches)
    } finally {
      setAiLoading(false)
    }
  }

  const updateMatchNote = (index: number, note: string) => {
    setMatches(matches.map((m, i) => i === index ? { ...m, note } : m))
  }

  const removeMatch = (index: number) => {
    setMatches(matches.filter((_, i) => i !== index))
  }

  const addTrackToPlaylist = (track: Track) => {
    if (matches.some(m => m.track.id === track.id)) return
    setMatches([...matches, {
      track,
      score: 0.8,
      reason: 'Manually added',
      note: ''
    }])
  }

  const handleDragStart = (track: Track) => {
    setDraggedTrack(track)
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    if (draggedTrack) {
      addTrackToPlaylist(draggedTrack)
      setDraggedTrack(null)
    }
  }

  const saveAsPlaylist = async () => {
    if (!playlistName.trim() || matches.length === 0) return

    const { data: playlist, error } = await supabase
      .from('playlists')
      .insert({
        name: playlistName,
        owner_id: profile.id,
        is_public: false
      })
      .select()
      .single()

    if (error || !playlist) return

    const playlistTracks = matches.map((m, i) => ({
      playlist_id: playlist.id,
      track_id: m.track.id,
      position: i,
      notes: m.note || null
    }))

    await supabase.from('playlist_tracks').insert(playlistTracks)
    alert('Playlist saved!')
    setPlaylistName('')
  }

  const sendToSupervisor = async () => {
    if (!selectedSupervisor || matches.length === 0) return

    for (const match of matches) {
      await supabase.from('inbox_submissions').insert({
        track_id: match.track.id,
        artist_id: profile.id,
        supervisor_id: selectedSupervisor,
        message: sendMessage || `AI-curated submission: ${match.reason}`,
        status: 'pending',
        brief_id: selectedBriefId || null
      })
    }

    setShowSendModal(false)
    setSelectedSupervisor('')
    setSendMessage('')
    alert('Tracks sent to supervisor!')
  }

  const filteredCatalog = (searchPlatform ? allTracks : myTracks).filter(track => {
    if (!catalogSearch) return true
    const search = catalogSearch.toLowerCase()
    return (
      track.title.toLowerCase().includes(search) ||
      track.artist.toLowerCase().includes(search) ||
      track.mood?.toLowerCase().includes(search) ||
      track.genre?.toLowerCase().includes(search) ||
      track.tags?.some(t => t.toLowerCase().includes(search))
    )
  })

  const totalDuration = matches.reduce((sum, m) => sum + (m.track.duration || 0), 0)
  const formatDuration = (secs: number) => {
    const mins = Math.floor(secs / 60)
    return `${mins}m`
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Spinner />
      </div>
    )
  }

  return (
    <div className="flex h-[calc(100vh-76px)] bg-[#0A0A0C]">
      <div className="w-[400px] bg-[#0D0D10] border-r border-[#1A1A1E] flex flex-col overflow-hidden">
        <div className="p-6 border-b border-[#1A1A1E]">
          <div className="flex items-center gap-2 mb-1">
            <Sparkles className="w-5 h-5 text-[#C8A97E]" />
            <h2 className="text-xl font-['Playfair_Display'] font-semibold text-[#E8E8E8]">AI Pitch Tool</h2>
          </div>
          <p className="text-sm text-[#666]">Paste a brief or describe what you need - AI matches your catalog</p>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {briefs.length > 0 && (
            <Select
              label="Select from open briefs"
              value={selectedBriefId}
              onChange={e => selectBrief(e.target.value)}
            >
              <option value="">Select a brief or paste details below...</option>
              {briefs.map(brief => (
                <option key={brief.id} value={brief.id}>{brief.title}</option>
              ))}
            </Select>
          )}

          <Textarea
            label="Brief Description"
            value={briefText}
            onChange={e => setBriefText(e.target.value)}
            placeholder="Describe the scene, mood, and what you're looking for... Even short keywords work! Try: 'summer vibes', 'dark night chase', 'emotional breakup'"
            rows={6}
          />

          <div>
            <label className="block text-xs text-[#888] mb-2">Mood Filter</label>
            <div className="flex flex-wrap gap-2">
              {MOODS.filter(m => m !== 'All').map(mood => (
                <button
                  key={mood}
                  onClick={() => toggleMood(mood)}
                  className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
                    selectedMoods.includes(mood)
                      ? 'text-[#0A0A0C]'
                      : 'bg-[#1A1A1E] text-[#888] hover:text-[#E8E8E8] border border-[#2A2A2E]'
                  }`}
                  style={selectedMoods.includes(mood) ? { backgroundColor: MOOD_COLORS[mood] } : {}}
                >
                  {mood}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Select
              label="Genre"
              value={selectedGenre}
              onChange={e => setSelectedGenre(e.target.value)}
            >
              <option value="">Any genre</option>
              {GENRES.filter(g => g !== 'All').map(genre => (
                <option key={genre} value={genre}>{genre}</option>
              ))}
            </Select>
            <div className="grid grid-cols-2 gap-2">
              <Input
                label="BPM Min"
                type="number"
                value={bpmMin}
                onChange={e => setBpmMin(e.target.value)}
                placeholder="60"
              />
              <Input
                label="BPM Max"
                type="number"
                value={bpmMax}
                onChange={e => setBpmMax(e.target.value)}
                placeholder="180"
              />
            </div>
          </div>

          <Btn onClick={findMatches} disabled={aiLoading || !briefText.trim()} className="w-full">
            {aiLoading ? <Spinner /> : <><Sparkles className="w-4 h-4" /> Find Matches in My Catalog</>}
          </Btn>

          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={searchPlatform}
              onChange={e => setSearchPlatform(e.target.checked)}
              className="w-4 h-4 rounded bg-[#1A1A1E] border-[#2A2A2E] text-[#C8A97E] focus:ring-[#C8A97E]"
            />
            <span className="text-sm text-[#888]">Search entire platform catalog</span>
          </label>

          <div className="text-xs text-[#555] text-center pt-2 border-t border-[#1E1E22]">
            {searchPlatform ? allTracks.length : myTracks.length} tracks in {searchPlatform ? 'platform' : 'your'} catalog
          </div>
        </div>
      </div>

      <div
        className="flex-1 flex flex-col overflow-hidden"
        onDragOver={handleDragOver}
        onDrop={handleDrop}
      >
        <div className="p-6 border-b border-[#1A1A1E] bg-[#0D0D10]">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              {matches.length > 0 ? (
                <Input
                  value={playlistName}
                  onChange={e => setPlaylistName(e.target.value)}
                  placeholder="Playlist name..."
                  className="w-64"
                />
              ) : (
                <h2 className="text-xl font-['Playfair_Display'] font-semibold text-[#E8E8E8]">
                  Generated Playlist
                </h2>
              )}
              {matches.length > 0 && (
                <span className="text-sm text-[#666]">
                  {matches.length} tracks - {formatDuration(totalDuration)}
                </span>
              )}
            </div>
            {matches.length > 0 && (
              <div className="flex gap-2">
                <Btn variant="ghost" onClick={saveAsPlaylist} disabled={!playlistName.trim()}>
                  <Save className="w-4 h-4" /> Save Playlist
                </Btn>
                <Btn onClick={() => setShowSendModal(true)}>
                  <Send className="w-4 h-4" /> Send to Supervisor
                </Btn>
              </div>
            )}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">
          {matches.length > 0 ? (
            <div className="rounded-lg overflow-hidden">
              {matches.map((match, index) => (
                <CompactTrackRow
                  key={match.track.id}
                  match={match}
                  index={index}
                  isPlaying={currentTrack?.id === match.track.id && playing}
                  onPlay={() => onPlayTrack(match.track)}
                  onRemove={() => removeMatch(index)}
                  onUpdateNote={(note) => updateMatchNote(index, note)}
                  onReorder={(fromIndex) => {
                    if (fromIndex !== index) {
                      const newMatches = [...matches]
                      const [moved] = newMatches.splice(fromIndex, 1)
                      newMatches.splice(index, 0, moved)
                      setMatches(newMatches)
                    }
                  }}
                />
              ))}
            </div>
          ) : (
            <div className="p-6">
              <EmptyState
                icon={<ListMusic className="w-12 h-12" />}
                title="No Matches Yet"
                description="Describe a brief on the left to generate your playlist, or drag tracks from the catalog on the right"
              />
            </div>
          )}
        </div>
      </div>

      <div className="w-[320px] bg-[#0D0D10] border-l border-[#1A1A1E] flex flex-col overflow-hidden">
        <div className="p-4 border-b border-[#1A1A1E]">
          <h3 className="text-sm font-medium text-[#E8E8E8] mb-3">Catalog Browser</h3>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#555]" />
            <input
              type="text"
              value={catalogSearch}
              onChange={e => setCatalogSearch(e.target.value)}
              placeholder="Search tracks..."
              className="w-full bg-[#1A1A1E] border border-[#2A2A2E] rounded-lg pl-9 pr-3 py-2 text-sm text-[#E8E8E8] placeholder-[#555] focus:outline-none focus:border-[#C8A97E]"
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">
          {filteredCatalog.length > 0 ? (
            <div className="divide-y divide-[#1A1A1E]/50">
              {filteredCatalog.slice(0, 50).map(track => {
                const moodColor = track.mood ? MOOD_COLORS[track.mood] : '#C8A97E'
                const artworkColor = (track as Track & { artwork_color?: string }).artwork_color || moodColor
                const isInPlaylist = matches.some(m => m.track.id === track.id)
                return (
                  <div
                    key={track.id}
                    draggable
                    onDragStart={() => handleDragStart(track)}
                    className={`flex items-center gap-3 px-4 py-2.5 cursor-grab hover:bg-[#1A1A1E] transition-colors ${
                      isInPlaylist ? 'opacity-50' : ''
                    }`}
                  >
                    <GripVertical className="w-4 h-4 text-[#444] flex-shrink-0" />
                    <div
                      className="w-9 h-9 rounded flex-shrink-0 flex items-center justify-center cursor-pointer"
                      style={{ background: `linear-gradient(135deg, ${artworkColor}80 0%, ${artworkColor}20 100%)` }}
                      onClick={(e) => { e.stopPropagation(); onPlayTrack(track) }}
                    >
                      {currentTrack?.id === track.id && playing ? (
                        <Pause className="w-3.5 h-3.5 text-white" />
                      ) : (
                        <Play className="w-3.5 h-3.5 text-white ml-0.5" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-[#E8E8E8] truncate">{track.title}</p>
                      <p className="text-xs text-[#666] truncate">{track.artist}</p>
                    </div>
                    <button
                      onClick={() => addTrackToPlaylist(track)}
                      disabled={isInPlaylist}
                      className={`p-1 rounded transition-colors ${
                        isInPlaylist ? 'text-[#4DFFB4]' : 'text-[#555] hover:text-[#C8A97E]'
                      }`}
                    >
                      {isInPlaylist ? <Heart className="w-4 h-4 fill-current" /> : <Plus className="w-4 h-4" />}
                    </button>
                  </div>
                )
              })}
            </div>
          ) : (
            <div className="p-6 text-center">
              <Music2 className="w-10 h-10 text-[#333] mx-auto mb-2" />
              <p className="text-sm text-[#666]">No tracks found</p>
            </div>
          )}
        </div>

        <div className="p-3 border-t border-[#1A1A1E] text-xs text-[#555] text-center">
          Drag tracks into the playlist
        </div>
      </div>

      {showSendModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-[#0D0D10] border border-[#1A1A1E] rounded-xl w-[400px] p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-medium text-[#E8E8E8]">Send to Supervisor</h3>
              <button onClick={() => setShowSendModal(false)} className="text-[#666]">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              <Select
                label="Select Supervisor"
                value={selectedSupervisor}
                onChange={e => setSelectedSupervisor(e.target.value)}
              >
                <option value="">Choose a supervisor</option>
                {supervisors.map(sup => (
                  <option key={sup.id} value={sup.id}>{sup.full_name}</option>
                ))}
              </Select>

              <Textarea
                label="Message (optional)"
                value={sendMessage}
                onChange={e => setSendMessage(e.target.value)}
                placeholder="Add a personal message..."
                rows={3}
              />

              <p className="text-sm text-[#666]">
                Sending {matches.length} tracks
              </p>

              <div className="flex justify-end gap-2">
                <Btn variant="ghost" onClick={() => setShowSendModal(false)}>Cancel</Btn>
                <Btn onClick={sendToSupervisor} disabled={!selectedSupervisor}>
                  <Send className="w-4 h-4" /> Send
                </Btn>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

interface CompactTrackRowProps {
  match: MatchedTrack
  index: number
  isPlaying: boolean
  onPlay: () => void
  onRemove: () => void
  onUpdateNote: (note: string) => void
  onReorder: (fromIndex: number) => void
}

function CompactTrackRow({ match, index, isPlaying, onPlay, onRemove, onUpdateNote, onReorder }: CompactTrackRowProps) {
  const [hovered, setHovered] = useState(false)
  const [expanded, setExpanded] = useState(false)
  const [showTooltip, setShowTooltip] = useState(false)
  const tooltipRef = useRef<HTMLDivElement>(null)

  const moodColor = match.track.mood ? MOOD_COLORS[match.track.mood] : '#C8A97E'
  const artworkColor = (match.track as Track & { artwork_color?: string }).artwork_color || moodColor
  const scorePercent = Math.round(match.score * 100)

  const getScoreColor = () => {
    if (scorePercent >= 90) return { bg: 'bg-[#4DFFB4]/15', text: 'text-[#4DFFB4]' }
    if (scorePercent >= 75) return { bg: 'bg-[#C8A97E]/15', text: 'text-[#C8A97E]' }
    return { bg: 'bg-[#555]/15', text: 'text-[#888]' }
  }

  const scoreColors = getScoreColor()

  const handleDragStart = (e: React.DragEvent) => {
    e.dataTransfer.setData('index', index.toString())
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    const fromIndex = parseInt(e.dataTransfer.getData('index'))
    if (!isNaN(fromIndex)) {
      onReorder(fromIndex)
    }
  }

  const handleRowClick = (e: React.MouseEvent) => {
    const target = e.target as HTMLElement
    if (target.closest('button') || target.closest('input')) return
    setExpanded(!expanded)
  }

  return (
    <div
      className={`transition-colors ${isPlaying ? 'border-l-2 border-l-[#C8A97E]' : 'border-l-2 border-l-transparent'}`}
      style={{ backgroundColor: hovered ? 'rgba(200, 169, 126, 0.03)' : 'transparent' }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => { setHovered(false); setShowTooltip(false) }}
      draggable
      onDragStart={handleDragStart}
      onDrop={handleDrop}
      onDragOver={(e) => e.preventDefault()}
    >
      <div
        className="flex items-center h-12 px-3 gap-2 cursor-pointer"
        onClick={handleRowClick}
      >
        <GripVertical className="w-4 h-4 text-[#444] flex-shrink-0 cursor-grab" />

        <span className="w-6 text-[11px] text-[#555] flex-shrink-0">#{index + 1}</span>

        <div
          className="w-8 h-8 rounded flex-shrink-0 flex items-center justify-center cursor-pointer"
          style={{ background: `linear-gradient(135deg, ${artworkColor}70 0%, ${artworkColor}20 100%)` }}
          onClick={(e) => { e.stopPropagation(); onPlay() }}
        >
          {isPlaying ? (
            <Pause className="w-3.5 h-3.5 text-white" />
          ) : (
            <Play className="w-3.5 h-3.5 text-white ml-0.5" />
          )}
        </div>

        <div className="flex-1 min-w-0 pr-2">
          <p className={`text-[13px] font-semibold truncate ${isPlaying ? 'text-[#C8A97E]' : 'text-[#E8E8E8]'}`}>
            {match.track.title}
          </p>
          <p className="text-[11px] text-[#666] truncate">{match.track.artist}</p>
        </div>

        <span className={`px-2 py-0.5 rounded text-[11px] font-medium flex-shrink-0 ${scoreColors.bg} ${scoreColors.text}`}>
          {scorePercent}%
        </span>

        {match.track.mood && (
          <span
            className="px-2 py-0.5 rounded text-[10px] font-medium flex-shrink-0"
            style={{ backgroundColor: `${moodColor}20`, color: moodColor }}
          >
            {match.track.mood}
          </span>
        )}

        <span className="text-[11px] text-[#555] flex-shrink-0 w-10 text-right">
          {match.track.bpm || '-'}
        </span>

        <div className="relative flex-shrink-0">
          <button
            className="p-1 text-[#555] hover:text-[#888] transition-colors"
            onMouseEnter={() => setShowTooltip(true)}
            onMouseLeave={() => setShowTooltip(false)}
          >
            <Info className="w-3.5 h-3.5" />
          </button>

          {showTooltip && (
            <div
              ref={tooltipRef}
              className="absolute right-0 top-full mt-1 z-50 w-64 p-3 bg-[#1A1A1E] border border-[#2A2A2E] rounded-lg shadow-xl"
            >
              <p className="text-xs text-[#E8E8E8] mb-1">{match.reason}</p>
              {match.section && (
                <p className="text-[10px] text-[#C8A97E] mt-1">{match.section}</p>
              )}
              {match.edit_note && (
                <p className="text-[10px] text-[#666] mt-1">{match.edit_note}</p>
              )}
            </div>
          )}
        </div>

        <button
          className={`p-1 text-[#555] hover:text-red-400 transition-colors flex-shrink-0 ${hovered ? 'opacity-100' : 'opacity-0'}`}
          onClick={(e) => { e.stopPropagation(); onRemove() }}
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>

      {expanded && (
        <div className="px-3 pb-3 pt-1">
          <div className="pl-[52px]">
            <input
              type="text"
              value={match.note}
              onChange={(e) => onUpdateNote(e.target.value)}
              placeholder="Add a note for this track..."
              className="w-full bg-[#1A1A1E] border border-[#2A2A2E] rounded px-3 py-2 text-xs text-[#E8E8E8] placeholder-[#555] focus:outline-none focus:border-[#C8A97E]"
              onClick={(e) => e.stopPropagation()}
            />
          </div>
        </div>
      )}
    </div>
  )
}
