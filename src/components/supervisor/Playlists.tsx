import { useState, useEffect, useRef } from 'react'
import { supabase } from '../../lib/supabase'
import { MoodPill, ClearanceBadge, Spinner, EmptyState } from '../shared/UI'
import { MOOD_COLORS, MOODS } from '../../lib/constants'
import { Plus, Play, Pause, ListMusic, Share2, Trash2, GripVertical, X, ChevronRight, ChevronDown, MoreHorizontal, Star, Tag, Search, FolderPlus, CreditCard as Edit3, Copy, PanelRightClose, PanelRightOpen } from 'lucide-react'
import type { Profile, Playlist, PlaylistTrack, Track, Project } from '../../lib/types'

interface PlaylistsProps {
  profile: Profile
  onPlayTrack: (track: Track) => void
  currentTrack: Track | null
  playing: boolean
}

interface PlaylistWithMeta extends Playlist {
  trackCount: number
}

interface PlaylistTrackWithFolder extends PlaylistTrack {
  folder_name?: string
}

export function Playlists({ profile, onPlayTrack, currentTrack, playing }: PlaylistsProps) {
  const [playlists, setPlaylists] = useState<PlaylistWithMeta[]>([])
  const [projects, setProjects] = useState<Project[]>([])
  const [selectedPlaylist, setSelectedPlaylist] = useState<Playlist | null>(null)
  const [playlistTracks, setPlaylistTracks] = useState<PlaylistTrackWithFolder[]>([])
  const [catalogTracks, setCatalogTracks] = useState<Track[]>([])
  const [loading, setLoading] = useState(true)
  const [catalogLoading, setCatalogLoading] = useState(true)
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [newPlaylistName, setNewPlaylistName] = useState('')
  const [newPlaylistProject, setNewPlaylistProject] = useState<string>('')
  const [expandedProjects, setExpandedProjects] = useState<Set<string>>(new Set())
  const [catalogCollapsed, setCatalogCollapsed] = useState(false)
  const [catalogSearch, setCatalogSearch] = useState('')
  const [catalogMoodFilter, setCatalogMoodFilter] = useState('All')
  const [editingName, setEditingName] = useState(false)
  const [editedName, setEditedName] = useState('')
  const [activeFolder, setActiveFolder] = useState<string | null>(null)
  const [collapsedFolders, setCollapsedFolders] = useState<Set<string>>(new Set())
  const [showNewFolderInput, setShowNewFolderInput] = useState(false)
  const [newFolderName, setNewFolderName] = useState('')
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; playlistId: string } | null>(null)
  const [dragOverFolder, setDragOverFolder] = useState<string | null>(null)
  const [dragOverPosition, setDragOverPosition] = useState<number | null>(null)

  const nameInputRef = useRef<HTMLInputElement>(null)
  const folderInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    loadData()
  }, [profile.id])

  useEffect(() => {
    if (editingName && nameInputRef.current) {
      nameInputRef.current.focus()
      nameInputRef.current.select()
    }
  }, [editingName])

  useEffect(() => {
    if (showNewFolderInput && folderInputRef.current) {
      folderInputRef.current.focus()
    }
  }, [showNewFolderInput])

  useEffect(() => {
    const handleClickOutside = () => setContextMenu(null)
    document.addEventListener('click', handleClickOutside)
    return () => document.removeEventListener('click', handleClickOutside)
  }, [])

  const loadData = async () => {
    setLoading(true)
    const [ownPlaylistsRes, publicPlaylistsRes, projectsRes] = await Promise.all([
      supabase.from('playlists').select('*').eq('owner_id', profile.id).order('created_at', { ascending: false }),
      supabase.from('playlists').select('*').eq('is_public', true).is('owner_id', null).order('name'),
      supabase.from('projects').select('*').eq('supervisor_id', profile.id).order('name')
    ])

    const allPlaylists = [...(ownPlaylistsRes.data || []), ...(publicPlaylistsRes.data || [])]

    if (allPlaylists.length > 0) {
      const withCounts = await Promise.all(
        allPlaylists.map(async (p) => {
          const { count } = await supabase
            .from('playlist_tracks')
            .select('*', { count: 'exact', head: true })
            .eq('playlist_id', p.id)
          return { ...p, trackCount: count || 0 }
        })
      )
      setPlaylists(withCounts)
    }
    if (projectsRes.data) setProjects(projectsRes.data)
    setLoading(false)
    loadCatalog()
  }

  const loadCatalog = async () => {
    setCatalogLoading(true)
    const { data, error } = await supabase
      .from('tracks')
      .select('*')
      .eq('status', 'active')
      .order('created_at', { ascending: false })
      .limit(100)

    if (!error && data) setCatalogTracks(data)
    setCatalogLoading(false)
  }

  const loadPlaylistTracks = async (playlistId: string) => {
    const { data, error } = await supabase
      .from('playlist_tracks')
      .select('*, track:tracks(*)')
      .eq('playlist_id', playlistId)
      .order('position')

    if (!error && data) setPlaylistTracks(data as PlaylistTrackWithFolder[])
  }

  const selectPlaylist = (playlist: Playlist) => {
    setSelectedPlaylist(playlist)
    setEditedName(playlist.name)
    setActiveFolder(null)
    loadPlaylistTracks(playlist.id)
  }

  const createPlaylist = async () => {
    if (!newPlaylistName.trim()) return

    const { data, error } = await supabase
      .from('playlists')
      .insert({
        name: newPlaylistName,
        owner_id: profile.id,
        project_id: newPlaylistProject || null,
        is_public: false
      })
      .select()
      .single()

    if (!error && data) {
      setPlaylists([{ ...data, trackCount: 0 }, ...playlists])
      setNewPlaylistName('')
      setNewPlaylistProject('')
      setShowCreateForm(false)
      selectPlaylist(data)
    }
  }

  const renamePlaylist = async () => {
    if (!selectedPlaylist || !editedName.trim()) return

    const { error } = await supabase
      .from('playlists')
      .update({ name: editedName })
      .eq('id', selectedPlaylist.id)

    if (!error) {
      setPlaylists(playlists.map(p => p.id === selectedPlaylist.id ? { ...p, name: editedName } : p))
      setSelectedPlaylist({ ...selectedPlaylist, name: editedName })
    }
    setEditingName(false)
  }

  const duplicatePlaylist = async (playlistId: string) => {
    const playlist = playlists.find(p => p.id === playlistId)
    if (!playlist) return

    const { data: newPlaylist, error } = await supabase
      .from('playlists')
      .insert({
        name: `${playlist.name} (Copy)`,
        owner_id: profile.id,
        project_id: playlist.project_id,
        is_public: false
      })
      .select()
      .single()

    if (!error && newPlaylist) {
      const { data: tracks } = await supabase
        .from('playlist_tracks')
        .select('*')
        .eq('playlist_id', playlistId)

      if (tracks && tracks.length > 0) {
        await supabase.from('playlist_tracks').insert(
          tracks.map(t => ({
            playlist_id: newPlaylist.id,
            track_id: t.track_id,
            position: t.position,
            folder_name: t.folder_name,
            notes: t.notes
          }))
        )
      }

      setPlaylists([{ ...newPlaylist, trackCount: tracks?.length || 0 }, ...playlists])
    }
    setContextMenu(null)
  }

  const deletePlaylist = async (id: string) => {
    if (!confirm('Delete this playlist?')) return

    await supabase.from('playlist_tracks').delete().eq('playlist_id', id)
    await supabase.from('playlists').delete().eq('id', id)
    setPlaylists(playlists.filter(p => p.id !== id))
    if (selectedPlaylist?.id === id) {
      setSelectedPlaylist(null)
      setPlaylistTracks([])
    }
    setContextMenu(null)
  }

  const sharePlaylist = async () => {
    if (!selectedPlaylist) return
    const shareToken = crypto.randomUUID()
    await supabase
      .from('playlists')
      .update({ is_public: true, share_token: shareToken })
      .eq('id', selectedPlaylist.id)
    const shareUrl = `${window.location.origin}/playlist/${shareToken}`
    navigator.clipboard.writeText(shareUrl)
    alert('Playlist link copied!')
  }

  const addTrackToPlaylist = async (track: Track) => {
    if (!selectedPlaylist) return

    const maxPosition = playlistTracks.reduce((max, pt) => Math.max(max, pt.position), 0)

    const { data, error } = await supabase
      .from('playlist_tracks')
      .insert({
        playlist_id: selectedPlaylist.id,
        track_id: track.id,
        position: maxPosition + 1,
        folder_name: activeFolder || null
      })
      .select('*, track:tracks(*)')
      .single()

    if (!error && data) {
      setPlaylistTracks([...playlistTracks, data as PlaylistTrackWithFolder])
      setPlaylists(playlists.map(p =>
        p.id === selectedPlaylist.id ? { ...p, trackCount: p.trackCount + 1 } : p
      ))
    }
  }

  const removeTrack = async (id: string) => {
    await supabase.from('playlist_tracks').delete().eq('id', id)
    setPlaylistTracks(playlistTracks.filter(pt => pt.id !== id))
    if (selectedPlaylist) {
      setPlaylists(playlists.map(p =>
        p.id === selectedPlaylist.id ? { ...p, trackCount: Math.max(0, p.trackCount - 1) } : p
      ))
    }
  }

  const createFolder = async () => {
    if (!newFolderName.trim() || !selectedPlaylist) return
    setActiveFolder(newFolderName.trim())
    setNewFolderName('')
    setShowNewFolderInput(false)
  }

  const deleteFolder = async (folderName: string) => {
    await supabase
      .from('playlist_tracks')
      .update({ folder_name: null })
      .eq('playlist_id', selectedPlaylist?.id)
      .eq('folder_name', folderName)

    setPlaylistTracks(playlistTracks.map(pt =>
      pt.folder_name === folderName ? { ...pt, folder_name: undefined } : pt
    ))
    if (activeFolder === folderName) setActiveFolder(null)
  }

  const handleDragStart = (e: React.DragEvent, data: { type: 'catalog' | 'playlist'; track?: Track; playlistTrack?: PlaylistTrackWithFolder }) => {
    e.dataTransfer.setData('application/json', JSON.stringify(data))
    e.dataTransfer.effectAllowed = 'move'
  }

  const handleDragOver = (e: React.DragEvent, folder?: string, position?: number) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
    setDragOverFolder(folder ?? null)
    if (position !== undefined) setDragOverPosition(position)
  }

  const handleDragLeave = () => {
    setDragOverFolder(null)
    setDragOverPosition(null)
  }

  const handleDrop = async (e: React.DragEvent, targetFolder?: string, targetPosition?: number) => {
    e.preventDefault()
    setDragOverFolder(null)
    setDragOverPosition(null)

    const rawData = e.dataTransfer.getData('application/json')
    if (!rawData || !selectedPlaylist) return

    const data = JSON.parse(rawData)

    if (data.type === 'catalog' && data.track) {
      const maxPosition = playlistTracks.reduce((max, pt) => Math.max(max, pt.position), 0)
      const position = targetPosition ?? maxPosition + 1

      const { data: newTrack, error } = await supabase
        .from('playlist_tracks')
        .insert({
          playlist_id: selectedPlaylist.id,
          track_id: data.track.id,
          position,
          folder_name: targetFolder || null
        })
        .select('*, track:tracks(*)')
        .single()

      if (!error && newTrack) {
        setPlaylistTracks([...playlistTracks, newTrack as PlaylistTrackWithFolder])
        setPlaylists(playlists.map(p =>
          p.id === selectedPlaylist.id ? { ...p, trackCount: p.trackCount + 1 } : p
        ))
      }
    } else if (data.type === 'playlist' && data.playlistTrack) {
      await supabase
        .from('playlist_tracks')
        .update({
          folder_name: targetFolder || null,
          position: targetPosition ?? data.playlistTrack.position
        })
        .eq('id', data.playlistTrack.id)

      setPlaylistTracks(playlistTracks.map(pt =>
        pt.id === data.playlistTrack.id
          ? { ...pt, folder_name: targetFolder || undefined, position: targetPosition ?? pt.position }
          : pt
      ))
    }
  }

  const toggleProjectExpanded = (projectId: string) => {
    const next = new Set(expandedProjects)
    if (next.has(projectId)) next.delete(projectId)
    else next.add(projectId)
    setExpandedProjects(next)
  }

  const toggleFolderCollapsed = (folderName: string) => {
    const next = new Set(collapsedFolders)
    if (next.has(folderName)) next.delete(folderName)
    else next.add(folderName)
    setCollapsedFolders(next)
  }

  const myPlaylists = playlists.filter(p => p.owner_id === profile.id)
  const demoPlaylists = playlists.filter(p => !p.owner_id && p.is_public)
  const standalonePlaylists = myPlaylists.filter(p => !p.project_id)
  const projectsWithPlaylists = projects.filter(proj => myPlaylists.some(p => p.project_id === proj.id))

  const folders = [...new Set(playlistTracks.map(pt => pt.folder_name).filter(Boolean))] as string[]
  const uncategorizedTracks = playlistTracks.filter(pt => !pt.folder_name)

  const filteredCatalog = catalogTracks.filter(track => {
    const matchesSearch = !catalogSearch ||
      track.title.toLowerCase().includes(catalogSearch.toLowerCase()) ||
      track.artist.toLowerCase().includes(catalogSearch.toLowerCase())
    const matchesMood = catalogMoodFilter === 'All' || track.mood === catalogMoodFilter
    return matchesSearch && matchesMood
  })

  const totalDuration = playlistTracks.reduce((sum, pt) => sum + (pt.track?.duration || 0), 0)
  const formatTotalDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const hrs = Math.floor(mins / 60)
    if (hrs > 0) return `${hrs}h ${mins % 60}m`
    return `${mins}m`
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full bg-[#0A0A0C]">
        <Spinner />
      </div>
    )
  }

  return (
    <div className="flex h-[calc(100vh-76px)] bg-[#0A0A0C]">
      <div className="w-[240px] bg-[#0D0D10] border-r border-[#1A1A1E] flex flex-col flex-shrink-0">
        <div className="p-4 border-b border-[#1A1A1E]">
          <div className="flex items-center justify-between">
            <h2 className="font-['Playfair_Display'] text-lg text-[#E8E8E8]">Playlists</h2>
            <button
              onClick={() => setShowCreateForm(true)}
              className="w-7 h-7 rounded-lg bg-[#C8A97E] flex items-center justify-center hover:bg-[#D4B88A] transition-colors"
            >
              <Plus className="w-4 h-4 text-[#0A0A0C]" />
            </button>
          </div>
        </div>

        {showCreateForm && (
          <div className="p-4 border-b border-[#1A1A1E] space-y-3">
            <input
              type="text"
              value={newPlaylistName}
              onChange={e => setNewPlaylistName(e.target.value)}
              placeholder="Playlist name"
              className="w-full bg-[#0A0A0C] border border-[#2A2A2E] rounded-lg px-3 py-2 text-sm text-[#E8E8E8] placeholder-[#555] focus:outline-none focus:border-[#C8A97E]"
              onKeyDown={e => e.key === 'Enter' && createPlaylist()}
              autoFocus
            />
            <select
              value={newPlaylistProject}
              onChange={e => setNewPlaylistProject(e.target.value)}
              className="w-full bg-[#0A0A0C] border border-[#2A2A2E] rounded-lg px-3 py-2 text-sm text-[#888] focus:outline-none focus:border-[#C8A97E]"
            >
              <option value="">Standalone (no project)</option>
              {projects.map(proj => (
                <option key={proj.id} value={proj.id}>{proj.name}</option>
              ))}
            </select>
            <div className="flex gap-2">
              <button
                onClick={() => { setShowCreateForm(false); setNewPlaylistName(''); setNewPlaylistProject('') }}
                className="flex-1 px-3 py-1.5 text-sm text-[#888] hover:text-[#E8E8E8] transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={createPlaylist}
                className="flex-1 px-3 py-1.5 text-sm bg-[#C8A97E] text-[#0A0A0C] rounded-lg hover:bg-[#D4B88A] transition-colors"
              >
                Create
              </button>
            </div>
          </div>
        )}

        <div className="flex-1 overflow-y-auto p-2">
          {standalonePlaylists.length > 0 && (
            <div className="mb-4">
              <p className="text-[10px] uppercase tracking-wider text-[#555] px-2 py-2">Standalone</p>
              {standalonePlaylists.map(playlist => (
                <PlaylistRow
                  key={playlist.id}
                  playlist={playlist}
                  isSelected={selectedPlaylist?.id === playlist.id}
                  onSelect={() => selectPlaylist(playlist)}
                  onContextMenu={(e) => {
                    e.preventDefault()
                    setContextMenu({ x: e.clientX, y: e.clientY, playlistId: playlist.id })
                  }}
                />
              ))}
            </div>
          )}

          {projectsWithPlaylists.length > 0 && (
            <div className="mb-4">
              <p className="text-[10px] uppercase tracking-wider text-[#555] px-2 py-2">Projects</p>
              {projectsWithPlaylists.map(project => {
                const projectPlaylists = myPlaylists.filter(p => p.project_id === project.id)
                const isExpanded = expandedProjects.has(project.id)

                return (
                  <div key={project.id} className="mb-1">
                    <button
                      onClick={() => toggleProjectExpanded(project.id)}
                      className="w-full flex items-center gap-2 px-2 py-1.5 text-sm text-[#888] hover:text-[#E8E8E8] transition-colors"
                    >
                      {isExpanded ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
                      <span className="truncate">{project.name}</span>
                      <span className="text-xs text-[#555]">({projectPlaylists.length})</span>
                    </button>
                    {isExpanded && (
                      <div className="ml-4">
                        {projectPlaylists.map(playlist => (
                          <PlaylistRow
                            key={playlist.id}
                            playlist={playlist}
                            isSelected={selectedPlaylist?.id === playlist.id}
                            onSelect={() => selectPlaylist(playlist)}
                            onContextMenu={(e) => {
                              e.preventDefault()
                              setContextMenu({ x: e.clientX, y: e.clientY, playlistId: playlist.id })
                            }}
                          />
                        ))}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )}

          {demoPlaylists.length > 0 && (
            <div className="mb-4">
              <p className="text-[10px] uppercase tracking-wider text-[#555] px-2 py-2">Demo Playlists</p>
              {demoPlaylists.map(playlist => (
                <PlaylistRow
                  key={playlist.id}
                  playlist={playlist}
                  isSelected={selectedPlaylist?.id === playlist.id}
                  onSelect={() => selectPlaylist(playlist)}
                  onContextMenu={(e) => e.preventDefault()}
                  isDemo
                />
              ))}
            </div>
          )}

          {playlists.length === 0 && (
            <div className="text-center py-8">
              <ListMusic className="w-8 h-8 text-[#333] mx-auto mb-2" />
              <p className="text-sm text-[#555]">No playlists yet</p>
            </div>
          )}
        </div>
      </div>

      <div className="flex-1 overflow-hidden flex flex-col min-w-0">
        {selectedPlaylist ? (
          <>
            <div className="p-5 border-b border-[#1A1A1E] flex items-center justify-between">
              <div className="flex items-center gap-3">
                {editingName ? (
                  <input
                    ref={nameInputRef}
                    type="text"
                    value={editedName}
                    onChange={e => setEditedName(e.target.value)}
                    onBlur={renamePlaylist}
                    onKeyDown={e => {
                      if (e.key === 'Enter') renamePlaylist()
                      if (e.key === 'Escape') setEditingName(false)
                    }}
                    className="text-xl font-['Playfair_Display'] font-semibold text-[#E8E8E8] bg-transparent border-b border-[#C8A97E] focus:outline-none"
                  />
                ) : (
                  <h2
                    onClick={() => setEditingName(true)}
                    className="text-xl font-['Playfair_Display'] font-semibold text-[#E8E8E8] cursor-pointer hover:text-[#C8A97E] transition-colors"
                  >
                    {selectedPlaylist.name}
                  </h2>
                )}
                <span className="text-sm text-[#666]">
                  {playlistTracks.length} tracks
                </span>
                <span className="text-sm text-[#555]">
                  {formatTotalDuration(totalDuration)}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={sharePlaylist}
                  className="flex items-center gap-2 px-3 py-1.5 text-sm text-[#888] hover:text-[#E8E8E8] border border-[#2A2A2E] rounded-lg hover:border-[#444] transition-colors"
                >
                  <Share2 className="w-4 h-4" /> Share
                </button>
                <button className="p-2 text-[#888] hover:text-[#E8E8E8] transition-colors">
                  <MoreHorizontal className="w-4 h-4" />
                </button>
              </div>
            </div>

            <div
              className="flex-1 overflow-y-auto p-5"
              onDragOver={(e) => handleDragOver(e)}
              onDragLeave={handleDragLeave}
              onDrop={(e) => handleDrop(e)}
            >
              {uncategorizedTracks.length > 0 && (
                <div className="mb-6">
                  <div className="flex items-center gap-2 mb-3">
                    <span className="text-sm text-[#666]">Uncategorized</span>
                    <span className="text-xs text-[#555]">({uncategorizedTracks.length})</span>
                  </div>
                  <div className="space-y-1">
                    {uncategorizedTracks.map((pt, index) => (
                      <TrackRow
                        key={pt.id}
                        playlistTrack={pt}
                        index={index + 1}
                        isPlaying={currentTrack?.id === pt.track_id && playing}
                        isCurrentTrack={currentTrack?.id === pt.track_id}
                        onPlay={() => pt.track && onPlayTrack(pt.track)}
                        onRemove={() => removeTrack(pt.id)}
                        onDragStart={(e) => handleDragStart(e, { type: 'playlist', playlistTrack: pt })}
                        isDragOver={dragOverPosition === pt.position}
                        onDragOver={(e) => handleDragOver(e, undefined, pt.position)}
                      />
                    ))}
                  </div>
                </div>
              )}

              {folders.map(folder => {
                const folderTracks = playlistTracks.filter(pt => pt.folder_name === folder)
                const isCollapsed = collapsedFolders.has(folder)
                const isActive = activeFolder === folder
                const isDragOverThisFolder = dragOverFolder === folder

                return (
                  <div
                    key={folder}
                    className={`mb-6 rounded-lg transition-colors ${isDragOverThisFolder ? 'bg-[#C8A97E]/10 ring-2 ring-[#C8A97E]/50' : ''}`}
                    onDragOver={(e) => handleDragOver(e, folder)}
                    onDragLeave={handleDragLeave}
                    onDrop={(e) => handleDrop(e, folder)}
                  >
                    <div className="flex items-center gap-2 mb-3 group">
                      <button
                        onClick={() => toggleFolderCollapsed(folder)}
                        className="text-[#666] hover:text-[#E8E8E8] transition-colors"
                      >
                        {isCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                      </button>
                      <button
                        onClick={() => setActiveFolder(isActive ? null : folder)}
                        className={`text-sm font-medium transition-colors ${isActive ? 'text-[#C8A97E]' : 'text-[#E8E8E8] hover:text-[#C8A97E]'}`}
                      >
                        {folder}
                      </button>
                      <span className="text-xs text-[#555]">({folderTracks.length})</span>
                      <div className="flex-1" />
                      <button
                        onClick={() => deleteFolder(folder)}
                        className="p-1 text-[#555] hover:text-red-400 transition-colors opacity-0 group-hover:opacity-100"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                    {!isCollapsed && (
                      <div className="space-y-1 ml-6">
                        {folderTracks.map((pt, index) => (
                          <TrackRow
                            key={pt.id}
                            playlistTrack={pt}
                            index={index + 1}
                            isPlaying={currentTrack?.id === pt.track_id && playing}
                            isCurrentTrack={currentTrack?.id === pt.track_id}
                            onPlay={() => pt.track && onPlayTrack(pt.track)}
                            onRemove={() => removeTrack(pt.id)}
                            onDragStart={(e) => handleDragStart(e, { type: 'playlist', playlistTrack: pt })}
                            isDragOver={dragOverPosition === pt.position}
                            onDragOver={(e) => handleDragOver(e, folder, pt.position)}
                          />
                        ))}
                      </div>
                    )}
                  </div>
                )
              })}

              {playlistTracks.length === 0 && (
                <div className={`flex flex-col items-center justify-center py-16 rounded-xl border-2 border-dashed transition-colors ${dragOverFolder === null && dragOverPosition === null ? 'border-[#2A2A2E]' : 'border-[#C8A97E] bg-[#C8A97E]/5'}`}>
                  <ListMusic className="w-12 h-12 text-[#333] mb-4" />
                  <p className="text-[#888] font-medium mb-1">Empty Playlist</p>
                  <p className="text-sm text-[#555]">Drag tracks from the catalog panel</p>
                </div>
              )}

              {showNewFolderInput ? (
                <div className="flex items-center gap-2 mt-4">
                  <input
                    ref={folderInputRef}
                    type="text"
                    value={newFolderName}
                    onChange={e => setNewFolderName(e.target.value)}
                    placeholder="Section name"
                    className="flex-1 bg-[#0A0A0C] border border-[#2A2A2E] rounded-lg px-3 py-2 text-sm text-[#E8E8E8] placeholder-[#555] focus:outline-none focus:border-[#C8A97E]"
                    onKeyDown={e => {
                      if (e.key === 'Enter') createFolder()
                      if (e.key === 'Escape') { setShowNewFolderInput(false); setNewFolderName('') }
                    }}
                  />
                  <button
                    onClick={() => { setShowNewFolderInput(false); setNewFolderName('') }}
                    className="px-3 py-2 text-sm text-[#888] hover:text-[#E8E8E8]"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={createFolder}
                    className="px-3 py-2 text-sm bg-[#C8A97E] text-[#0A0A0C] rounded-lg hover:bg-[#D4B88A]"
                  >
                    Add
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => setShowNewFolderInput(true)}
                  className="flex items-center gap-2 mt-4 px-3 py-2 text-sm text-[#666] hover:text-[#E8E8E8] transition-colors"
                >
                  <FolderPlus className="w-4 h-4" />
                  Add section
                </button>
              )}
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center">
            <EmptyState
              icon={<ListMusic className="w-12 h-12" />}
              title="Select a Playlist"
              description="Choose a playlist from the left panel or create a new one"
            />
          </div>
        )}
      </div>

      <div className={`bg-[#0D0D10] border-l border-[#1A1A1E] flex flex-col transition-all duration-200 ${catalogCollapsed ? 'w-12' : 'w-[320px]'}`}>
        <div className="p-4 border-b border-[#1A1A1E] flex items-center justify-between">
          {!catalogCollapsed && <h3 className="text-sm font-medium text-[#E8E8E8]">Catalog</h3>}
          <button
            onClick={() => setCatalogCollapsed(!catalogCollapsed)}
            className="p-1.5 text-[#666] hover:text-[#E8E8E8] transition-colors"
          >
            {catalogCollapsed ? <PanelRightOpen className="w-4 h-4" /> : <PanelRightClose className="w-4 h-4" />}
          </button>
        </div>

        {!catalogCollapsed && (
          <>
            <div className="p-4 space-y-3">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#555]" />
                <input
                  type="text"
                  value={catalogSearch}
                  onChange={e => setCatalogSearch(e.target.value)}
                  placeholder="Search catalog..."
                  className="w-full bg-[#0A0A0C] border border-[#2A2A2E] rounded-lg pl-10 pr-4 py-2 text-sm text-[#E8E8E8] placeholder-[#555] focus:outline-none focus:border-[#C8A97E]"
                />
              </div>

              <div className="flex gap-1.5 overflow-x-auto scrollbar-hide pb-1">
                {MOODS.map(mood => (
                  <button
                    key={mood}
                    onClick={() => setCatalogMoodFilter(mood)}
                    className={`px-2.5 py-1 rounded-full text-xs whitespace-nowrap transition-all ${
                      catalogMoodFilter === mood
                        ? 'bg-[#C8A97E] text-[#0A0A0C]'
                        : 'bg-[#1A1A1E] text-[#888] hover:text-[#E8E8E8]'
                    }`}
                  >
                    {mood}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex-1 overflow-y-auto">
              {catalogLoading ? (
                <div className="flex items-center justify-center py-12">
                  <Spinner />
                </div>
              ) : filteredCatalog.length > 0 ? (
                <div className="space-y-1 px-2">
                  {filteredCatalog.map(track => (
                    <CatalogTrackRow
                      key={track.id}
                      track={track}
                      onAdd={() => addTrackToPlaylist(track)}
                      onDragStart={(e) => handleDragStart(e, { type: 'catalog', track })}
                      disabled={!selectedPlaylist}
                    />
                  ))}
                </div>
              ) : (
                <div className="text-center py-12">
                  <p className="text-sm text-[#555]">No tracks found</p>
                </div>
              )}
            </div>
          </>
        )}
      </div>

      {contextMenu && (
        <div
          className="fixed bg-[#13131A] border border-[#1E1E22] rounded-xl shadow-xl py-1 z-50"
          style={{ left: contextMenu.x, top: contextMenu.y }}
        >
          <button
            onClick={() => {
              const playlist = playlists.find(p => p.id === contextMenu.playlistId)
              if (playlist) {
                selectPlaylist(playlist)
                setEditingName(true)
              }
              setContextMenu(null)
            }}
            className="w-full flex items-center gap-2 px-4 py-2 text-sm text-[#E8E8E8] hover:bg-[#1A1A1E] transition-colors"
          >
            <Edit3 className="w-4 h-4" /> Rename
          </button>
          <button
            onClick={() => duplicatePlaylist(contextMenu.playlistId)}
            className="w-full flex items-center gap-2 px-4 py-2 text-sm text-[#E8E8E8] hover:bg-[#1A1A1E] transition-colors"
          >
            <Copy className="w-4 h-4" /> Duplicate
          </button>
          <button
            onClick={() => {
              const playlist = playlists.find(p => p.id === contextMenu.playlistId)
              if (playlist) {
                selectPlaylist(playlist)
                sharePlaylist()
              }
              setContextMenu(null)
            }}
            className="w-full flex items-center gap-2 px-4 py-2 text-sm text-[#E8E8E8] hover:bg-[#1A1A1E] transition-colors"
          >
            <Share2 className="w-4 h-4" /> Share
          </button>
          <div className="h-px bg-[#1E1E22] my-1" />
          <button
            onClick={() => deletePlaylist(contextMenu.playlistId)}
            className="w-full flex items-center gap-2 px-4 py-2 text-sm text-red-400 hover:bg-[#1A1A1E] transition-colors"
          >
            <Trash2 className="w-4 h-4" /> Delete
          </button>
        </div>
      )}
    </div>
  )
}

function PlaylistRow({
  playlist,
  isSelected,
  onSelect,
  onContextMenu,
  isDemo = false
}: {
  playlist: PlaylistWithMeta
  isSelected: boolean
  onSelect: () => void
  onContextMenu: (e: React.MouseEvent) => void
  isDemo?: boolean
}) {
  return (
    <button
      onClick={onSelect}
      onContextMenu={onContextMenu}
      className={`w-full flex items-center gap-2 px-2 py-2 rounded-lg text-left transition-colors group ${
        isSelected
          ? 'bg-[#C8A97E]/10 border-l-[3px] border-[#C8A97E]'
          : 'hover:bg-[#1A1A1E] border-l-[3px] border-transparent'
      }`}
    >
      <ListMusic className={`w-4 h-4 flex-shrink-0 ${isSelected ? 'text-[#C8A97E]' : 'text-[#555]'}`} />
      <div className="flex-1 min-w-0">
        <p className={`text-sm truncate ${isSelected ? 'text-[#C8A97E]' : 'text-[#E8E8E8]'}`}>
          {playlist.name}
        </p>
        <p className="text-xs text-[#555]">
          {playlist.trackCount} tracks
        </p>
      </div>
      {!isDemo && (
        <button
          onClick={(e) => { e.stopPropagation(); onContextMenu(e) }}
          className="p-1 text-[#555] hover:text-[#E8E8E8] opacity-0 group-hover:opacity-100 transition-opacity"
        >
          <MoreHorizontal className="w-4 h-4" />
        </button>
      )}
    </button>
  )
}

function TrackRow({
  playlistTrack,
  index,
  isPlaying,
  isCurrentTrack,
  onPlay,
  onRemove,
  onDragStart,
  isDragOver,
  onDragOver
}: {
  playlistTrack: PlaylistTrackWithFolder
  index: number
  isPlaying: boolean
  isCurrentTrack: boolean
  onPlay: () => void
  onRemove: () => void
  onDragStart: (e: React.DragEvent) => void
  isDragOver?: boolean
  onDragOver: (e: React.DragEvent) => void
}) {
  const [hovered, setHovered] = useState(false)
  const track = playlistTrack.track
  if (!track) return null

  const moodColor = track.mood ? MOOD_COLORS[track.mood] : '#C8A97E'

  return (
    <div
      draggable
      onDragStart={onDragStart}
      onDragOver={onDragOver}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      className={`flex items-center gap-3 px-3 py-2 rounded-lg cursor-pointer transition-all ${
        isCurrentTrack ? 'bg-[#C8A97E]/10' : hovered ? 'bg-[#1A1A1E]' : 'bg-transparent'
      } ${isDragOver ? 'border-t-2 border-[#C8A97E]' : ''}`}
      onClick={onPlay}
    >
      <div className="w-5 text-center">
        {hovered ? (
          <GripVertical className="w-4 h-4 text-[#555] cursor-grab" />
        ) : (
          <span className={`text-sm ${isCurrentTrack ? 'text-[#C8A97E]' : 'text-[#666]'}`}>{index}</span>
        )}
      </div>

      <div
        className="w-10 h-10 rounded flex items-center justify-center flex-shrink-0"
        style={{ background: `linear-gradient(135deg, ${moodColor}60 0%, #1A1A1E 100%)` }}
      >
        {hovered || isPlaying ? (
          isPlaying ? (
            <Pause className="w-4 h-4 text-[#C8A97E]" />
          ) : (
            <Play className="w-4 h-4 text-[#E8E8E8] ml-0.5" />
          )
        ) : (
          <span className="text-sm font-semibold text-white/80">{track.title.charAt(0).toUpperCase()}</span>
        )}
      </div>

      <div className="flex-1 min-w-0">
        <p className={`text-sm font-medium truncate ${isCurrentTrack ? 'text-[#C8A97E]' : 'text-[#E8E8E8]'}`}>
          {track.title}
        </p>
        <p className="text-xs text-[#666] truncate">{track.artist}</p>
      </div>

      <span className="text-xs text-[#666] w-16 hidden lg:block">{track.genre || '-'}</span>
      <span className="text-xs text-[#666] w-12 hidden lg:block">{track.bpm || '-'}</span>
      <span className="text-xs text-[#666] w-12 hidden lg:block">
        {track.duration ? `${Math.floor(track.duration / 60)}:${String(Math.floor(track.duration % 60)).padStart(2, '0')}` : '-'}
      </span>

      {track.mood && <MoodPill mood={track.mood} />}
      {track.clearance_status && <ClearanceBadge status={track.clearance_status} />}

      <span className="text-xs text-[#C8A97E] font-medium w-16 text-right hidden lg:block">
        {track.one_stop_fee ? `$${track.one_stop_fee}` : '-'}
      </span>

      <div className={`flex items-center gap-1 transition-opacity ${hovered ? 'opacity-100' : 'opacity-0'}`}>
        <button className="p-1.5 text-[#666] hover:text-[#C8A97E] transition-colors">
          <Star className="w-4 h-4" />
        </button>
        <button className="p-1.5 text-[#666] hover:text-[#E8E8E8] transition-colors">
          <Share2 className="w-4 h-4" />
        </button>
        <button className="p-1.5 text-[#666] hover:text-[#E8E8E8] transition-colors">
          <Tag className="w-4 h-4" />
        </button>
        <button
          onClick={(e) => { e.stopPropagation(); onRemove() }}
          className="p-1.5 text-[#666] hover:text-red-400 transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  )
}

function CatalogTrackRow({
  track,
  onAdd,
  onDragStart,
  disabled
}: {
  track: Track
  onAdd: () => void
  onDragStart: (e: React.DragEvent) => void
  disabled: boolean
}) {
  const [hovered, setHovered] = useState(false)
  const moodColor = track.mood ? MOOD_COLORS[track.mood] : '#C8A97E'

  return (
    <div
      draggable={!disabled}
      onDragStart={onDragStart}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      className={`flex items-center gap-2 px-2 py-2 rounded-lg transition-colors ${hovered ? 'bg-[#1A1A1E]' : ''} ${disabled ? 'opacity-50' : 'cursor-grab'}`}
    >
      <div
        className="w-9 h-9 rounded flex items-center justify-center flex-shrink-0"
        style={{ background: `linear-gradient(135deg, ${moodColor}60 0%, #1A1A1E 100%)` }}
      >
        <span className="text-xs font-semibold text-white/80">{track.title.charAt(0).toUpperCase()}</span>
      </div>

      <div className="flex-1 min-w-0">
        <p className="text-sm text-[#E8E8E8] truncate">{track.title}</p>
        <p className="text-xs text-[#666] truncate">{track.artist}</p>
      </div>

      <span className="text-xs text-[#555]">{track.bpm || '-'}</span>

      {hovered && (
        <GripVertical className="w-4 h-4 text-[#555]" />
      )}

      <button
        onClick={(e) => { e.stopPropagation(); onAdd() }}
        disabled={disabled}
        className={`px-2 py-1 text-xs rounded transition-colors ${
          disabled
            ? 'text-[#555] cursor-not-allowed'
            : 'text-[#C8A97E] hover:bg-[#C8A97E]/10'
        }`}
      >
        + Add
      </button>
    </div>
  )
}
