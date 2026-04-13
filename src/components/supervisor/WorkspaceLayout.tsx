import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import { Btn, MoodPill, ClearanceBadge, Textarea, EmptyState, Spinner } from '../shared/UI'
import { MOODS, GENRES } from '../../lib/constants'
import {
  ChevronLeft, ChevronRight, Play, Pause, GripVertical, Plus, X, Search,
  Folder, ListMusic, Share2, Sparkles
} from 'lucide-react'
import type { Track, Profile, Project, Playlist, PlaylistTrack } from '../../lib/types'

interface WorkspaceLayoutProps {
  profile: Profile
  onPlayTrack: (track: Track) => void
  currentTrack: Track | null
  playing: boolean
}

export function WorkspaceLayout({ profile, onPlayTrack, currentTrack, playing }: WorkspaceLayoutProps) {
  const [leftCollapsed, setLeftCollapsed] = useState(false)
  const [rightCollapsed, setRightCollapsed] = useState(false)

  const [projects, setProjects] = useState<Project[]>([])
  const [playlists, setPlaylists] = useState<Playlist[]>([])
  const [expandedProjects, setExpandedProjects] = useState<Set<string>>(new Set())
  const [activePlaylist, setActivePlaylist] = useState<Playlist | null>(null)
  const [playlistTracks, setPlaylistTracks] = useState<PlaylistTrack[]>([])

  const [catalogTracks, setCatalogTracks] = useState<Track[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedMood, setSelectedMood] = useState('All')
  const [selectedGenre, setSelectedGenre] = useState('All')
  const [bpmRange, setBpmRange] = useState<[number, number]>([60, 180])

  const [rightTab, setRightTab] = useState<'browse' | 'ai'>('browse')
  const [aiQuery, setAiQuery] = useState('')
  const [aiResults, setAiResults] = useState<Array<{ track: Track; score: number; reason: string; cue_point?: string; placement_type?: string; energy_note?: string }>>([])
  const [aiLoading, setAiLoading] = useState(false)
  const [searchScope, setSearchScope] = useState<'all' | 'hitlist'>('all')

  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadData()
  }, [profile.id])

  const loadData = async () => {
    setLoading(true)
    try {
      const [projectsRes, playlistsRes, tracksRes] = await Promise.all([
        supabase.from('projects').select('*').eq('supervisor_id', profile.id).order('created_at', { ascending: false }),
        supabase.from('playlists').select('*').eq('owner_id', profile.id).order('created_at', { ascending: false }),
        supabase.from('tracks').select('*').eq('status', 'active').order('created_at', { ascending: false })
      ])

      if (projectsRes.data) setProjects(projectsRes.data)
      if (playlistsRes.data) setPlaylists(playlistsRes.data)
      if (tracksRes.data) setCatalogTracks(tracksRes.data)
    } catch (error) {
      console.error('Failed to load data:', error)
    } finally {
      setLoading(false)
    }
  }

  const loadPlaylistTracks = async (playlistId: string) => {
    const { data } = await supabase
      .from('playlist_tracks')
      .select('*, track:tracks(*)')
      .eq('playlist_id', playlistId)
      .order('position')
    if (data) setPlaylistTracks(data)
  }

  const selectPlaylist = (playlist: Playlist) => {
    setActivePlaylist(playlist)
    loadPlaylistTracks(playlist.id)
  }

  const toggleProject = (projectId: string) => {
    setExpandedProjects(prev => {
      const next = new Set(prev)
      if (next.has(projectId)) next.delete(projectId)
      else next.add(projectId)
      return next
    })
  }

  const filteredTracks = catalogTracks.filter(track => {
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

  const addToPlaylist = async (track: Track) => {
    if (!activePlaylist) return
    const position = playlistTracks.length
    const { data, error } = await supabase
      .from('playlist_tracks')
      .insert({ playlist_id: activePlaylist.id, track_id: track.id, position })
      .select('*, track:tracks(*)')
      .single()
    if (!error && data) {
      setPlaylistTracks([...playlistTracks, data])
    }
  }

  const removeFromPlaylist = async (id: string) => {
    await supabase.from('playlist_tracks').delete().eq('id', id)
    setPlaylistTracks(playlistTracks.filter(pt => pt.id !== id))
  }

  const updateTrackNotes = async (id: string, notes: string) => {
    await supabase.from('playlist_tracks').update({ notes }).eq('id', id)
    setPlaylistTracks(playlistTracks.map(pt => pt.id === id ? { ...pt, notes } : pt))
  }

  const handleDragStart = (e: React.DragEvent, track: Track) => {
    e.dataTransfer.setData('track', JSON.stringify(track))
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    const trackData = e.dataTransfer.getData('track')
    if (trackData) {
      const track = JSON.parse(trackData) as Track
      addToPlaylist(track)
    }
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
  }

  const createNewProject = async () => {
    const { data, error } = await supabase
      .from('projects')
      .insert({ name: 'New Project', supervisor_id: profile.id, status: 'active' })
      .select()
      .single()
    if (!error && data) {
      setProjects([data, ...projects])
    }
  }

  const createNewPlaylist = async (projectId?: string) => {
    const { data, error } = await supabase
      .from('playlists')
      .insert({
        name: 'New Playlist',
        owner_id: profile.id,
        project_id: projectId || null,
        is_public: false
      })
      .select()
      .single()
    if (!error && data) {
      setPlaylists([data, ...playlists])
      selectPlaylist(data)
    }
  }

  const sharePlaylist = async () => {
    if (!activePlaylist) return
    const shareToken = crypto.randomUUID()
    await supabase
      .from('playlists')
      .update({ is_public: true, share_token: shareToken })
      .eq('id', activePlaylist.id)
    const shareUrl = `${window.location.origin}/playlist/${shareToken}`
    navigator.clipboard.writeText(shareUrl)
    alert('Playlist link copied to clipboard!')
  }

  const runAISearch = async () => {
    if (!aiQuery.trim()) return
    setAiLoading(true)
    setAiResults([])

    try {
      const tracksToSearch = searchScope === 'hitlist'
        ? catalogTracks.slice(0, 50)
        : catalogTracks

      const catalogContext = tracksToSearch.map(t => ({
        id: t.id,
        title: t.title,
        artist: t.artist,
        mood: t.mood,
        genre: t.genre,
        bpm: t.bpm,
        tags: t.tags
      }))

      const systemPrompt = `You are an expert music supervisor and sync licensing specialist with 20+ years of experience placing music in film, TV, commercials, and trailers. You have deep knowledge of:

- Sync licensing terminology: one-stop licensing, master rights, sync rights, PRO (Performing Rights Organization), clearance status, needle drop, temp track, buy-out vs backend deals
- How music supervisors think: they need tracks that serve the emotional and narrative function of a scene, match the energy arc, and are clearable within budget
- Genre and mood nuances for sync: the difference between "cinematic hip-hop" and "trap", what makes something "ad-ready", why a track might work for a car commercial vs a drama series
- Energy arcs: builds, drops, tension/release, underscore vs featured placement, how BPM affects cutting pace
- Semantic understanding: if someone says "something that feels like driving fast at night in the rain" you understand they want tense, electronic, 120-140 BPM, minor key. If they say "feels like a Nike ad" you know they want inspirational, driving beat, anthemic. If they say "sad but not depressing, like saying goodbye" you know melancholic but resolved, mid-tempo, acoustic or indie.

When matching tracks to a scene:
- Consider the emotional journey of the scene, not just surface-level mood
- Think about where the music sits in the mix (background underscore vs featured)
- Consider clearance - CLEAR tracks are easier to place quickly, PRO tracks need budget
- Match energy arc to the scene's pacing
- Give specific reasons why each track works, referencing sync-specific qualities
- Suggest a cue point (timestamp) where the track works best
- Rate match percentage based on: mood fit (40%), energy/BPM fit (25%), clearance/budget fit (20%), genre fit (15%)`

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
            content: `Given this brief/scene description, find matching tracks from the catalog.

Brief: ${aiQuery}

Catalog:
${JSON.stringify(catalogContext, null, 2)}

Return ONLY valid JSON:
{
  "matches": [
    {
      "id": "track_id",
      "score": 92,
      "reason": "Specific sync-focused reason why this works for the scene",
      "cue_point": "0:32 - where the drop hits, perfect for the cut",
      "placement_type": "Featured",
      "energy_note": "Builds steadily, peaks at 2:15 - ideal for climax moment"
    }
  ],
  "supervisorNote": "Strategic note about the overall approach for this scene",
  "budgetNote": "Note about clearance mix and budget considerations"
}`
          }]
        })
      })

      if (response.ok) {
        const data = await response.json()
        const content = data.content[0]?.text || '{}'
        const parsed = JSON.parse(content)
        const matches = parsed.matches?.map((m: { id: string; score: number; reason: string; cue_point?: string; placement_type?: string; energy_note?: string }) => {
          const track = catalogTracks.find(t => t.id === m.id)
          return track ? { track, score: m.score / 100, reason: m.reason, cue_point: m.cue_point, placement_type: m.placement_type, energy_note: m.energy_note } : null
        }).filter(Boolean) || []
        setAiResults(matches)
      }
    } catch (error) {
      console.error('AI search failed:', error)
    } finally {
      setAiLoading(false)
    }
  }

  const handleReorder = (fromIndex: number, toIndex: number) => {
    const newTracks = [...playlistTracks]
    const [moved] = newTracks.splice(fromIndex, 1)
    newTracks.splice(toIndex, 0, moved)
    setPlaylistTracks(newTracks)
    newTracks.forEach(async (pt, index) => {
      await supabase.from('playlist_tracks').update({ position: index }).eq('id', pt.id)
    })
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Spinner />
      </div>
    )
  }

  return (
    <div className="flex h-[calc(100vh-76px)] overflow-hidden">
      <div
        className={`bg-[#0D0D10] border-r border-[#1A1A1E] flex flex-col transition-all duration-300 ${
          leftCollapsed ? 'w-12' : 'w-[260px]'
        }`}
      >
        <div className="flex items-center justify-between p-3 border-b border-[#1A1A1E]">
          {!leftCollapsed && <span className="text-sm font-medium text-[#888]">Projects</span>}
          <button
            onClick={() => setLeftCollapsed(!leftCollapsed)}
            className="p-1 text-[#666] hover:text-[#E8E8E8]"
          >
            {leftCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
          </button>
        </div>

        {!leftCollapsed && (
          <div className="flex-1 overflow-y-auto p-2">
            <Btn size="sm" variant="ghost" className="w-full mb-2" onClick={createNewProject}>
              <Plus className="w-3 h-3" /> New Project
            </Btn>

            {projects.map(project => (
              <div key={project.id} className="mb-1">
                <button
                  onClick={() => toggleProject(project.id)}
                  className="w-full flex items-center gap-2 px-2 py-1.5 rounded text-sm text-[#888] hover:text-[#E8E8E8] hover:bg-[#1A1A1E]"
                >
                  <Folder className="w-4 h-4" />
                  <span className="truncate flex-1 text-left">{project.name}</span>
                </button>

                {expandedProjects.has(project.id) && (
                  <div className="ml-4 mt-1 space-y-1">
                    {playlists.filter(p => p.project_id === project.id).map(playlist => (
                      <button
                        key={playlist.id}
                        onClick={() => selectPlaylist(playlist)}
                        className={`w-full flex items-center gap-2 px-2 py-1 rounded text-xs ${
                          activePlaylist?.id === playlist.id
                            ? 'bg-[#C8A97E]/10 text-[#C8A97E]'
                            : 'text-[#666] hover:text-[#E8E8E8] hover:bg-[#1A1A1E]'
                        }`}
                      >
                        <ListMusic className="w-3 h-3" />
                        <span className="truncate">{playlist.name}</span>
                      </button>
                    ))}
                    <button
                      onClick={() => createNewPlaylist(project.id)}
                      className="w-full flex items-center gap-2 px-2 py-1 rounded text-xs text-[#555] hover:text-[#888]"
                    >
                      <Plus className="w-3 h-3" /> Add Playlist
                    </button>
                  </div>
                )}
              </div>
            ))}

            <div className="mt-4 pt-4 border-t border-[#1A1A1E]">
              <span className="text-xs text-[#555] px-2">Unassigned</span>
              {playlists.filter(p => !p.project_id).map(playlist => (
                <button
                  key={playlist.id}
                  onClick={() => selectPlaylist(playlist)}
                  className={`w-full flex items-center gap-2 px-2 py-1.5 rounded text-sm mt-1 ${
                    activePlaylist?.id === playlist.id
                      ? 'bg-[#C8A97E]/10 text-[#C8A97E]'
                      : 'text-[#888] hover:text-[#E8E8E8] hover:bg-[#1A1A1E]'
                  }`}
                >
                  <ListMusic className="w-4 h-4" />
                  <span className="truncate">{playlist.name}</span>
                </button>
              ))}
              <Btn size="sm" variant="ghost" className="w-full mt-2" onClick={() => createNewPlaylist()}>
                <Plus className="w-3 h-3" /> New Playlist
              </Btn>
            </div>
          </div>
        )}
      </div>

      <div
        className="flex-1 flex flex-col bg-[#0A0A0C] overflow-hidden"
        onDrop={handleDrop}
        onDragOver={handleDragOver}
      >
        {activePlaylist ? (
          <>
            <div className="flex items-center justify-between p-4 border-b border-[#1A1A1E]">
              <div>
                <h2 className="text-lg font-medium text-[#E8E8E8]">{activePlaylist.name}</h2>
                {activePlaylist.project_id && (
                  <p className="text-xs text-[#666]">
                    {projects.find(p => p.id === activePlaylist.project_id)?.name}
                  </p>
                )}
              </div>
              <Btn size="sm" variant="ghost" onClick={sharePlaylist}>
                <Share2 className="w-4 h-4" /> Share
              </Btn>
            </div>

            <div className="flex-1 overflow-y-auto p-4">
              {playlistTracks.length > 0 ? (
                <div className="space-y-2">
                  {playlistTracks.map((pt, index) => (
                    <div
                      key={pt.id}
                      draggable
                      onDragStart={(e) => {
                        e.dataTransfer.setData('reorder', index.toString())
                      }}
                      onDrop={(e) => {
                        e.stopPropagation()
                        const fromIndex = parseInt(e.dataTransfer.getData('reorder'))
                        if (!isNaN(fromIndex)) handleReorder(fromIndex, index)
                      }}
                      className="flex items-center gap-3 p-3 bg-[#13131A] rounded-lg border border-[#1E1E22] group"
                    >
                      <GripVertical className="w-4 h-4 text-[#444] cursor-grab" />
                      <button
                        onClick={() => pt.track && onPlayTrack(pt.track)}
                        className="w-8 h-8 rounded-full bg-[#C8A97E]/10 flex items-center justify-center hover:bg-[#C8A97E]/20"
                      >
                        {currentTrack?.id === pt.track_id && playing ? (
                          <Pause className="w-4 h-4 text-[#C8A97E]" />
                        ) : (
                          <Play className="w-4 h-4 text-[#C8A97E] ml-0.5" />
                        )}
                      </button>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-[#E8E8E8] truncate">{pt.track?.title}</p>
                        <p className="text-xs text-[#666] truncate">{pt.track?.artist}</p>
                      </div>
                      {pt.track?.mood && <MoodPill mood={pt.track.mood} />}
                      <span className="text-xs text-[#555]">{pt.track?.bpm} BPM</span>
                      {pt.track?.clearance_status && <ClearanceBadge status={pt.track.clearance_status} />}
                      <span className="text-xs text-[#C8A97E]">${pt.track?.one_stop_fee || '—'}</span>
                      <input
                        type="text"
                        value={pt.notes || ''}
                        onChange={(e) => updateTrackNotes(pt.id, e.target.value)}
                        placeholder="Notes..."
                        className="w-32 bg-transparent border-b border-[#2A2A2E] text-xs text-[#888] placeholder-[#444] focus:outline-none focus:border-[#C8A97E]"
                      />
                      <button
                        onClick={() => removeFromPlaylist(pt.id)}
                        className="opacity-0 group-hover:opacity-100 p-1 text-[#666] hover:text-red-400"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              ) : (
                <EmptyState
                  title="Empty Playlist"
                  description="Drag tracks from the catalog to add them here"
                />
              )}
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center">
            <EmptyState
              title="Select a Playlist"
              description="Choose a playlist from the left panel or create a new one"
              action={
                <Btn onClick={() => createNewPlaylist()}>
                  <Plus className="w-4 h-4" /> Create Playlist
                </Btn>
              }
            />
          </div>
        )}
      </div>

      <div
        className={`bg-[#0D0D10] border-l border-[#1A1A1E] flex flex-col transition-all duration-300 ${
          rightCollapsed ? 'w-12' : 'w-[320px]'
        }`}
      >
        <div className="flex items-center justify-between p-3 border-b border-[#1A1A1E]">
          <button
            onClick={() => setRightCollapsed(!rightCollapsed)}
            className="p-1 text-[#666] hover:text-[#E8E8E8]"
          >
            {rightCollapsed ? <ChevronLeft className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
          </button>
          {!rightCollapsed && (
            <div className="flex gap-1">
              <button
                onClick={() => setRightTab('browse')}
                className={`px-3 py-1 rounded text-xs font-medium ${
                  rightTab === 'browse' ? 'bg-[#C8A97E] text-[#0A0A0C]' : 'text-[#888] hover:text-[#E8E8E8]'
                }`}
              >
                Browse
              </button>
              <button
                onClick={() => setRightTab('ai')}
                className={`px-3 py-1 rounded text-xs font-medium flex items-center gap-1 ${
                  rightTab === 'ai' ? 'bg-[#C8A97E] text-[#0A0A0C]' : 'text-[#888] hover:text-[#E8E8E8]'
                }`}
              >
                <Sparkles className="w-3 h-3" /> AI
              </button>
            </div>
          )}
        </div>

        {!rightCollapsed && rightTab === 'browse' && (
          <div className="flex-1 overflow-hidden flex flex-col">
            <div className="p-3 space-y-3 border-b border-[#1A1A1E]">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#555]" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search catalog..."
                  className="w-full bg-[#0A0A0C] border border-[#2A2A2E] rounded-lg pl-10 pr-4 py-2 text-sm text-[#E8E8E8] placeholder-[#555] focus:outline-none focus:border-[#C8A97E]"
                />
              </div>

              <div className="flex flex-wrap gap-1">
                {MOODS.map(mood => (
                  <button
                    key={mood}
                    onClick={() => setSelectedMood(mood)}
                    className={`px-2 py-1 rounded text-xs ${
                      selectedMood === mood
                        ? 'bg-[#C8A97E] text-[#0A0A0C]'
                        : 'bg-[#1A1A1E] text-[#888] hover:text-[#E8E8E8]'
                    }`}
                  >
                    {mood}
                  </button>
                ))}
              </div>

              <select
                value={selectedGenre}
                onChange={(e) => setSelectedGenre(e.target.value)}
                className="w-full bg-[#0A0A0C] border border-[#2A2A2E] rounded-lg px-3 py-2 text-sm text-[#E8E8E8]"
              >
                {GENRES.map(genre => (
                  <option key={genre} value={genre}>{genre}</option>
                ))}
              </select>

              <div className="flex items-center gap-2">
                <span className="text-xs text-[#666]">BPM:</span>
                <input
                  type="range"
                  min="60"
                  max="180"
                  value={bpmRange[0]}
                  onChange={(e) => setBpmRange([parseInt(e.target.value), bpmRange[1]])}
                  className="flex-1"
                />
                <span className="text-xs text-[#888]">{bpmRange[0]}-{bpmRange[1]}</span>
                <input
                  type="range"
                  min="60"
                  max="180"
                  value={bpmRange[1]}
                  onChange={(e) => setBpmRange([bpmRange[0], parseInt(e.target.value)])}
                  className="flex-1"
                />
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-2">
              <p className="text-xs text-[#555] px-2 mb-2">{filteredTracks.length} tracks</p>
              {filteredTracks.map(track => (
                <div
                  key={track.id}
                  draggable
                  onDragStart={(e) => handleDragStart(e, track)}
                  className="flex items-center gap-2 p-2 rounded hover:bg-[#1A1A1E] cursor-grab group"
                >
                  <GripVertical className="w-3 h-3 text-[#444]" />
                  <button
                    onClick={() => onPlayTrack(track)}
                    className="w-6 h-6 rounded-full bg-[#C8A97E]/10 flex items-center justify-center"
                  >
                    {currentTrack?.id === track.id && playing ? (
                      <Pause className="w-3 h-3 text-[#C8A97E]" />
                    ) : (
                      <Play className="w-3 h-3 text-[#C8A97E] ml-0.5" />
                    )}
                  </button>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-[#E8E8E8] truncate">{track.title}</p>
                    <p className="text-xs text-[#555] truncate">{track.artist}</p>
                  </div>
                  {track.mood && <MoodPill mood={track.mood} />}
                  <button
                    onClick={() => addToPlaylist(track)}
                    className="opacity-0 group-hover:opacity-100 p-1 text-[#C8A97E] hover:text-[#E8E8E8]"
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {!rightCollapsed && rightTab === 'ai' && (
          <div className="flex-1 overflow-hidden flex flex-col">
            <div className="p-3 space-y-3 border-b border-[#1A1A1E]">
              <Textarea
                value={aiQuery}
                onChange={(e) => setAiQuery(e.target.value)}
                placeholder="Describe your scene or paste a brief..."
                rows={4}
              />

              <div className="flex gap-2">
                <button
                  onClick={() => setSearchScope('hitlist')}
                  className={`flex-1 py-2 rounded text-xs font-medium ${
                    searchScope === 'hitlist'
                      ? 'bg-[#C8A97E] text-[#0A0A0C]'
                      : 'bg-[#1A1A1E] text-[#888]'
                  }`}
                >
                  My Hit List
                </button>
                <button
                  onClick={() => setSearchScope('all')}
                  className={`flex-1 py-2 rounded text-xs font-medium ${
                    searchScope === 'all'
                      ? 'bg-[#C8A97E] text-[#0A0A0C]'
                      : 'bg-[#1A1A1E] text-[#888]'
                  }`}
                >
                  All Artists
                </button>
              </div>

              <Btn onClick={runAISearch} disabled={aiLoading || !aiQuery.trim()} className="w-full">
                {aiLoading ? <Spinner /> : <><Sparkles className="w-4 h-4" /> Find Tracks</>}
              </Btn>
            </div>

            <div className="flex-1 overflow-y-auto p-2">
              {aiResults.map(result => (
                <div
                  key={result.track.id}
                  draggable
                  onDragStart={(e) => handleDragStart(e, result.track)}
                  className="p-3 mb-2 bg-[#13131A] rounded-lg border border-[#1E1E22] cursor-grab"
                >
                  <div className="flex items-center gap-2 mb-2">
                    <GripVertical className="w-3 h-3 text-[#444]" />
                    <button
                      onClick={() => onPlayTrack(result.track)}
                      className="w-6 h-6 rounded-full bg-[#C8A97E]/10 flex items-center justify-center"
                    >
                      <Play className="w-3 h-3 text-[#C8A97E] ml-0.5" />
                    </button>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs text-[#E8E8E8] truncate">{result.track.title}</p>
                      <p className="text-xs text-[#555] truncate">{result.track.artist}</p>
                    </div>
                    <span className="text-xs font-medium text-[#C8A97E]">
                      {Math.round(result.score * 100)}%
                    </span>
                    <button
                      onClick={() => addToPlaylist(result.track)}
                      className="p-1 text-[#C8A97E] hover:text-[#E8E8E8]"
                    >
                      <Plus className="w-4 h-4" />
                    </button>
                  </div>
                  <p className="text-xs text-[#666] mb-1">{result.reason}</p>
                  {result.cue_point && (
                    <p className="text-xs text-[#C8A97E]">Cue: {result.cue_point}</p>
                  )}
                  {result.energy_note && (
                    <p className="text-xs text-[#888] mt-1">{result.energy_note}</p>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
