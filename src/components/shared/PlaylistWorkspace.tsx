import { useState, useEffect, useRef, useCallback } from 'react'
import { supabase } from '../../lib/supabase'
import { MoodPill, ClearanceBadge, Spinner, EmptyState } from './UI'
import { MOOD_COLORS, MOODS, GENRES } from '../../lib/constants'
import {
  Plus, Play, Pause, Heart, GripVertical, X, ChevronDown, MoreHorizontal, Search,
  FolderPlus, Share2, Trash2, Copy, ListMusic, ArrowUp, Check
} from 'lucide-react'
import type { Profile, Playlist, PlaylistTrack, Track, Project } from '../../lib/types'
import { ArtistLink } from './ArtistLink'

declare global {
  interface Window {
    __draggedTrack?: Track
  }
}

interface PlaylistWorkspaceProps {
  profile: Profile
  onPlayTrack: (track: Track) => void
  currentTrack: Track | null
  playing: boolean
}

interface PlaylistColumn extends Playlist {
  tracks: PlaylistTrackWithFolder[]
  totalDuration: number
  project?: Project
}

interface PlaylistTrackWithFolder extends PlaylistTrack {
  folder_name?: string
}

const CLEARANCE_OPTIONS = ['All', 'Cleared', 'PRO', 'Pending']

function formatDuration(seconds?: number): string {
  if (!seconds) return '--:--'
  const mins = Math.floor(seconds / 60)
  const secs = Math.floor(seconds % 60)
  return `${mins}:${secs.toString().padStart(2, '0')}`
}

function formatTotalDuration(seconds: number): string {
  const mins = Math.floor(seconds / 60)
  const hrs = Math.floor(mins / 60)
  if (hrs > 0) return `${hrs}h ${mins % 60}m`
  return `${mins}m`
}

export function PlaylistWorkspace({ profile, onPlayTrack, currentTrack, playing }: PlaylistWorkspaceProps) {
  const [columns, setColumns] = useState<PlaylistColumn[]>([])
  const [projects, setProjects] = useState<Project[]>([])
  const [catalogTracks, setCatalogTracks] = useState<Track[]>([])
  const [savedTracks, setSavedTracks] = useState<Set<string>>(new Set())
  const [loading, setLoading] = useState(true)
  const [catalogLoading, setCatalogLoading] = useState(true)

  const [searchQuery, setSearchQuery] = useState('')
  const [selectedMood, setSelectedMood] = useState('All')
  const [selectedGenre, setSelectedGenre] = useState('All')
  const [bpmRange, setBpmRange] = useState<[number, number]>([60, 180])
  const [clearanceFilter, setClearanceFilter] = useState('All')

  const [showNewPlaylist, setShowNewPlaylist] = useState(false)
  const [newPlaylistName, setNewPlaylistName] = useState('')
  const [newPlaylistProject, setNewPlaylistProject] = useState('')

  const [splitRatio, setSplitRatio] = useState(() => {
    const saved = localStorage.getItem('playlistWorkspaceSplit')
    return saved ? parseFloat(saved) : 50
  })
  const [isDraggingDivider, setIsDraggingDivider] = useState(false)

  const [dragOverColumnId, setDragOverColumnId] = useState<string | null>(null)
  const [dragOverAddButton, setDragOverAddButton] = useState(false)
  const [draggedTrack, setDraggedTrack] = useState<Track | null>(null)

  const [editingPlaylistId, setEditingPlaylistId] = useState<string | null>(null)
  const [editingName, setEditingName] = useState('')
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; playlistId: string } | null>(null)
  const [collapsedFolders, setCollapsedFolders] = useState<Set<string>>(new Set())
  const [showNewFolderInput, setShowNewFolderInput] = useState<string | null>(null)
  const [newFolderName, setNewFolderName] = useState('')

  const containerRef = useRef<HTMLDivElement>(null)
  const columnsScrollRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    loadData()
  }, [profile.id])

  useEffect(() => {
    const handleClickOutside = () => setContextMenu(null)
    document.addEventListener('click', handleClickOutside)
    return () => document.removeEventListener('click', handleClickOutside)
  }, [])

  useEffect(() => {
    localStorage.setItem('playlistWorkspaceSplit', splitRatio.toString())
  }, [splitRatio])

  const loadData = async () => {
    setLoading(true)
    const { data: authData } = await supabase.auth.getUser()
    const userId = authData.user?.id ?? profile.id

    const [ownPlaylistsRes, projectsRes, savedRes] = await Promise.all([
      supabase.from('playlists').select('*').eq('owner_id', userId).order('created_at', { ascending: false }).limit(12),
      supabase.from('projects').select('*').eq('owner_id', userId).order('name'),
      supabase.from('saved_tracks').select('track_id').eq('user_id', userId)
    ])

    if (projectsRes.data) setProjects(projectsRes.data)
    if (savedRes.data) setSavedTracks(new Set(savedRes.data.map(s => s.track_id)))

    if (ownPlaylistsRes.data) {
      const columnsData = await Promise.all(
        ownPlaylistsRes.data.map(async (playlist) => {
          const { data: tracks } = await supabase
            .from('playlist_tracks')
            .select('*, track:tracks(*)')
            .eq('playlist_id', playlist.id)
            .order('position')

          const project = projectsRes.data?.find(p => p.id === playlist.project_id)
          const totalDuration = (tracks || []).reduce((sum, pt) => sum + (pt.track?.duration || 0), 0)

          return {
            ...playlist,
            tracks: tracks || [],
            totalDuration,
            project
          } as PlaylistColumn
        })
      )
      setColumns(columnsData)
    }

    setLoading(false)
    loadCatalog()
  }

  const loadCatalog = async () => {
    setCatalogLoading(true)

    let query = supabase.from('tracks').select('*').order('created_at', { ascending: false }).limit(200)

    query = query.eq('status', 'active')

    const { data } = await query

    if (data) setCatalogTracks(data)
    setCatalogLoading(false)
  }

  const filteredCatalog = catalogTracks.filter(track => {
    const matchesSearch = !searchQuery ||
      track.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      track.artist.toLowerCase().includes(searchQuery.toLowerCase()) ||
      track.mood?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      track.genre?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      track.tags?.some(t => t.toLowerCase().includes(searchQuery.toLowerCase()))

    const matchesMood = selectedMood === 'All' || track.mood === selectedMood
    const matchesGenre = selectedGenre === 'All' || track.genre === selectedGenre
    const matchesBpm = !track.bpm || (track.bpm >= bpmRange[0] && track.bpm <= bpmRange[1])

    let matchesClearance = true
    if (clearanceFilter !== 'All') {
      const statusMap: Record<string, string> = { 'Cleared': 'CLEAR', 'PRO': 'PRO', 'Pending': 'PENDING' }
      matchesClearance = track.clearance_status === statusMap[clearanceFilter]
    }

    return matchesSearch && matchesMood && matchesGenre && matchesBpm && matchesClearance
  })

  const createPlaylist = async (initialTrack?: Track) => {
    const name = newPlaylistName.trim() || (initialTrack ? `Playlist with ${initialTrack.title}` : 'New Playlist')
    const { data: authData } = await supabase.auth.getUser()
    const userId = authData.user?.id ?? profile.id

    const { data, error } = await supabase
      .from('playlists')
      .insert({
        name,
        owner_id: userId,
        project_id: newPlaylistProject || null,
        is_public: false
      })
      .select()
      .single()

    if (error) {
      console.error('Error creating playlist:', error)
      return null
    }

    if (data) {
      const project = projects.find(p => p.id === newPlaylistProject)
      const newColumn: PlaylistColumn = {
        ...data,
        tracks: [],
        totalDuration: 0,
        project
      }
      setColumns(prev => [...prev, newColumn])
      setNewPlaylistName('')
      setNewPlaylistProject('')
      setShowNewPlaylist(false)
      return data
    }
    return null
  }

  const renamePlaylist = async (playlistId: string, newName: string) => {
    if (!newName.trim()) return

    const { error } = await supabase.from('playlists').update({ name: newName }).eq('id', playlistId)
    if (error) {
      console.error('Error renaming playlist:', error)
      return
    }

    setColumns(columns.map(c => c.id === playlistId ? { ...c, name: newName } : c))
    setEditingPlaylistId(null)
    setEditingName('')
  }

  const duplicatePlaylist = async (playlistId: string) => {
    const column = columns.find(c => c.id === playlistId)
    if (!column) return
    const { data: authData } = await supabase.auth.getUser()
    const userId = authData.user?.id ?? profile.id

    const { data: newPlaylist, error } = await supabase
      .from('playlists')
      .insert({
        name: `${column.name} (Copy)`,
        owner_id: userId,
        project_id: column.project_id,
        is_public: false
      })
      .select()
      .single()

    if (error) {
      console.error('Error duplicating playlist:', error)
      return
    }

    if (newPlaylist && column.tracks.length > 0) {
      const { error: tracksError } = await supabase.from('playlist_tracks').insert(
        column.tracks.map(t => ({
          playlist_id: newPlaylist.id,
          track_id: t.track_id,
          position: t.position,
          folder_name: t.folder_name,
          notes: t.notes
        }))
      )

      if (tracksError) {
        console.error('Error duplicating playlist tracks:', tracksError)
      }

      setColumns([...columns, {
        ...newPlaylist,
        tracks: column.tracks.map(t => ({ ...t, id: crypto.randomUUID(), playlist_id: newPlaylist.id })),
        totalDuration: column.totalDuration,
        project: column.project
      }])
    } else if (newPlaylist) {
      setColumns([...columns, {
        ...newPlaylist,
        tracks: [],
        totalDuration: 0,
        project: column.project
      }])
    }
    setContextMenu(null)
  }

  const deletePlaylist = async (playlistId: string) => {
    if (!confirm('Delete this playlist?')) return

    const { error: tracksError } = await supabase.from('playlist_tracks').delete().eq('playlist_id', playlistId)
    if (tracksError) console.error('Error deleting playlist tracks:', tracksError)

    const { error } = await supabase.from('playlists').delete().eq('id', playlistId)
    if (error) {
      console.error('Error deleting playlist:', error)
      return
    }

    setColumns(columns.filter(c => c.id !== playlistId))
    setContextMenu(null)
  }

  const addTrackToPlaylist = async (playlistId: string, track: Track) => {
    const targetColumn = columns.find(c => c.id === playlistId)
    if (!targetColumn) return
    const { data: authData } = await supabase.auth.getUser()
    const userId = authData.user?.id ?? profile.id

    const { error } = await supabase
      .from('playlist_tracks')
      .insert({
        playlist_id: playlistId,
        track_id: track.id,
        added_by: userId,
        position: targetColumn.tracks.length,
        folder_name: null
      })

    if (error) {
      console.error('Insert failed:', error)
      return
    }

    const { data: newTrackData } = await supabase
      .from('playlist_tracks')
      .select('*, track:tracks(*)')
      .eq('playlist_id', playlistId)
      .eq('track_id', track.id)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (newTrackData) {
      setColumns(columns.map(c => {
        if (c.id === playlistId) {
          return {
            ...c,
            tracks: [...c.tracks, newTrackData as PlaylistTrackWithFolder],
            totalDuration: c.totalDuration + (track.duration || 0)
          }
        }
        return c
      }))
    }
  }

  const removeTrackFromPlaylist = async (playlistId: string, trackId: string, duration: number) => {
    const { error } = await supabase.from('playlist_tracks').delete().eq('id', trackId)
    if (error) {
      console.error('Error removing track:', error)
      return
    }

    setColumns(columns.map(c => {
      if (c.id === playlistId) {
        return {
          ...c,
          tracks: c.tracks.filter(pt => pt.id !== trackId),
          totalDuration: c.totalDuration - duration
        }
      }
      return c
    }))
  }

  const toggleSave = async (e: React.MouseEvent, trackId: string) => {
    e.stopPropagation()
    const { data: authData } = await supabase.auth.getUser()
    const userId = authData.user?.id ?? profile.id
    if (savedTracks.has(trackId)) {
      const { error } = await supabase.from('saved_tracks').delete().eq('user_id', userId).eq('track_id', trackId)
      if (error) {
        console.error('Error removing saved track:', error)
        return
      }
      setSavedTracks(prev => {
        const next = new Set(prev)
        next.delete(trackId)
        return next
      })
    } else {
      const { error } = await supabase.from('saved_tracks').insert({ user_id: userId, track_id: trackId })
      if (error) {
        console.error('Error saving track:', error)
        return
      }
      setSavedTracks(prev => new Set([...prev, trackId]))
    }
  }

  const createFolder = async (_playlistId: string) => {
    if (!newFolderName.trim()) return
    setShowNewFolderInput(null)
    setNewFolderName('')
  }

  const handleDividerMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault()
    setIsDraggingDivider(true)
  }, [])

  useEffect(() => {
    if (!isDraggingDivider) return

    const handleMouseMove = (e: MouseEvent) => {
      if (!containerRef.current) return
      const rect = containerRef.current.getBoundingClientRect()
      const newRatio = ((e.clientY - rect.top) / rect.height) * 100
      setSplitRatio(Math.max(15, Math.min(85, newRatio)))
    }

    const handleMouseUp = () => {
      setIsDraggingDivider(false)
    }

    document.addEventListener('mousemove', handleMouseMove)
    document.addEventListener('mouseup', handleMouseUp)

    return () => {
      document.removeEventListener('mousemove', handleMouseMove)
      document.removeEventListener('mouseup', handleMouseUp)
    }
  }, [isDraggingDivider])

  const clearAllFilters = () => {
    setSearchQuery('')
    setSelectedMood('All')
    setSelectedGenre('All')
    setBpmRange([60, 180])
    setClearanceFilter('All')
  }

  const hasActiveFilters = searchQuery || selectedMood !== 'All' || selectedGenre !== 'All' ||
    bpmRange[0] !== 60 || bpmRange[1] !== 180 || clearanceFilter !== 'All'

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full bg-[#0A0A0C]">
        <Spinner />
      </div>
    )
  }

  const getCatalogDescription = () => {
    if (profile.role === 'admin') return 'All tracks (including pending)'
    return 'All active platform tracks'
  }

  return (
    <div ref={containerRef} className="h-[calc(100vh-76px)] flex flex-col bg-[#0A0A0C]" style={{ userSelect: 'none' }}>
      <div style={{ height: `${splitRatio}%` }} className="flex flex-col min-h-[200px]">
        <div className="flex items-center gap-3 px-4 py-3 border-b border-[#1A1A1E] flex-shrink-0">
          <h2 className="font-['Playfair_Display'] text-lg text-white">Playlists</h2>
          <span className="text-sm text-[#666]">{columns.length} playlists</span>
        </div>

        <div ref={columnsScrollRef} className="flex-1 flex gap-4 p-4 overflow-x-auto overflow-y-auto">
          {columns.map(column => {
            const folders = [...new Set(column.tracks.map(pt => pt.folder_name).filter(Boolean))] as string[]
            const uncategorized = column.tracks.filter(pt => !pt.folder_name)
            const isDragOver = dragOverColumnId === column.id

            return (
              <div
                key={column.id}
                className="flex-shrink-0 w-[280px] bg-[#0D0D10] rounded-xl flex flex-col"
                style={{
                  border: isDragOver ? '2px solid #C8A97E' : '2px solid #1A1A1E',
                  minHeight: '150px',
                  transition: 'all 0.15s'
                }}
                onDragEnter={(e) => {
                  e.preventDefault()
                  e.stopPropagation()
                  setDragOverColumnId(column.id)
                }}
                onDragOver={(e) => {
                  e.preventDefault()
                  e.stopPropagation()
                  e.dataTransfer.dropEffect = 'copy'
                  if (dragOverColumnId !== column.id) {
                    setDragOverColumnId(column.id)
                  }
                  return false
                }}
                onDragLeave={(e) => {
                  e.preventDefault()
                  const rect = e.currentTarget.getBoundingClientRect()
                  const isOutside = e.clientX < rect.left || e.clientX > rect.right || e.clientY < rect.top || e.clientY > rect.bottom
                  if (isOutside) {
                    setDragOverColumnId(null)
                  }
                }}
                onDrop={async (e) => {
                  e.preventDefault()
                  e.stopPropagation()
                  setDragOverColumnId(null)
                  const rawData = e.dataTransfer.getData('application/json') || e.dataTransfer.getData('text/plain')
                  let trackData: Track | null = null
                  try {
                    trackData = JSON.parse(rawData) as Track
                  } catch (err) {
                    trackData = draggedTrack || window.__draggedTrack || null
                  }
                  if (trackData) {
                    await addTrackToPlaylist(column.id, trackData)
                  }
                  setDraggedTrack(null)
                  window.__draggedTrack = undefined
                }}
              >
                <div className="p-3 border-b border-[#1A1A1E]">
                  <div className="flex items-center justify-between mb-1">
                    {editingPlaylistId === column.id ? (
                      <input
                        type="text"
                        value={editingName}
                        onChange={e => setEditingName(e.target.value)}
                        onBlur={() => renamePlaylist(column.id, editingName)}
                        onKeyDown={e => {
                          if (e.key === 'Enter') renamePlaylist(column.id, editingName)
                          if (e.key === 'Escape') { setEditingPlaylistId(null); setEditingName('') }
                        }}
                        className="flex-1 bg-transparent text-sm font-medium text-[#E8E8E8] border-b border-[#C8A97E] focus:outline-none"
                        autoFocus
                      />
                    ) : (
                      <button
                        onClick={() => { setEditingPlaylistId(column.id); setEditingName(column.name) }}
                        className="text-sm font-medium text-[#E8E8E8] hover:text-[#C8A97E] transition-colors truncate"
                      >
                        {column.name}
                      </button>
                    )}
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        setContextMenu({ x: e.clientX, y: e.clientY, playlistId: column.id })
                      }}
                      className="p-1 text-[#666] hover:text-[#E8E8E8] transition-colors"
                    >
                      <MoreHorizontal className="w-4 h-4" />
                    </button>
                  </div>
                  {column.project && (
                    <p className="text-xs text-[#555] truncate">{column.project.name}</p>
                  )}
                  <div className="flex items-center gap-2 mt-2 text-xs text-[#666]">
                    <span>{column.tracks.length} tracks</span>
                    <span className="text-[#333]">|</span>
                    <span>{formatTotalDuration(column.totalDuration)}</span>
                  </div>
                </div>

                <div className="flex-1 overflow-y-auto p-2">
                  {uncategorized.length > 0 && (
                    <div className="space-y-1 mb-3">
                      {uncategorized.map((pt, index) => (
                        <PlaylistTrackRow
                          key={pt.id}
                          playlistTrack={pt}
                          index={index + 1}
                          isPlaying={currentTrack?.id === pt.track_id && playing}
                          isCurrentTrack={currentTrack?.id === pt.track_id}
                          onPlay={() => pt.track && onPlayTrack(pt.track)}
                          onRemove={() => removeTrackFromPlaylist(column.id, pt.id, pt.track?.duration || 0)}
                        />
                      ))}
                    </div>
                  )}

                  {folders.map(folder => {
                    const folderTracks = column.tracks.filter(pt => pt.folder_name === folder)
                    const isCollapsed = collapsedFolders.has(`${column.id}-${folder}`)

                    return (
                      <div key={folder} className="mb-3">
                        <div className="flex items-center gap-2 w-full px-2 py-1.5 rounded">
                          <button
                            onClick={() => {
                              const key = `${column.id}-${folder}`
                              const next = new Set(collapsedFolders)
                              if (next.has(key)) next.delete(key)
                              else next.add(key)
                              setCollapsedFolders(next)
                            }}
                            className="flex items-center gap-2 flex-1 text-xs text-[#888] hover:text-[#E8E8E8] transition-colors"
                          >
                            <ChevronDown className={`w-3 h-3 transition-transform ${isCollapsed ? '-rotate-90' : ''}`} />
                            <span className="flex-1 text-left truncate">{folder}</span>
                            <span className="text-[#555]">({folderTracks.length})</span>
                          </button>
                        </div>
                        {!isCollapsed && (
                          <div className="space-y-1 ml-3 pl-2 border-l border-[#2A2A2E]">
                            {folderTracks.map((pt, index) => (
                              <PlaylistTrackRow
                                key={pt.id}
                                playlistTrack={pt}
                                index={index + 1}
                                isPlaying={currentTrack?.id === pt.track_id && playing}
                                isCurrentTrack={currentTrack?.id === pt.track_id}
                                onPlay={() => pt.track && onPlayTrack(pt.track)}
                                onRemove={() => removeTrackFromPlaylist(column.id, pt.id, pt.track?.duration || 0)}
                              />
                            ))}
                          </div>
                        )}
                      </div>
                    )
                  })}

                  {column.tracks.length === 0 && (
                    <div className={`flex flex-col items-center justify-center py-8 rounded-lg border-2 border-dashed transition-colors ${
                      isDragOver ? 'border-[#C8A97E] bg-[#C8A97E]/5' : 'border-[#2A2A2E]'
                    }`}>
                      <ListMusic className="w-6 h-6 text-[#333] mb-2" />
                      <p className="text-xs text-[#555] text-center px-4">Drop tracks here</p>
                      <ArrowUp className="w-4 h-4 text-[#555] mt-1 rotate-180" />
                    </div>
                  )}

                  {showNewFolderInput === column.id ? (
                    <div className="flex items-center gap-1 mt-2">
                      <input
                        type="text"
                        value={newFolderName}
                        onChange={e => setNewFolderName(e.target.value)}
                        placeholder="Section name"
                        className="flex-1 bg-[#0A0A0C] border border-[#2A2A2E] rounded px-2 py-1 text-xs text-[#E8E8E8] focus:outline-none focus:border-[#C8A97E]"
                        onKeyDown={e => {
                          if (e.key === 'Enter') createFolder(column.id)
                          if (e.key === 'Escape') { setShowNewFolderInput(null); setNewFolderName('') }
                        }}
                        autoFocus
                      />
                      <button
                        onClick={() => { setShowNewFolderInput(null); setNewFolderName('') }}
                        className="p-1 text-[#666]"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => setShowNewFolderInput(column.id)}
                      className="flex items-center gap-1 w-full mt-2 px-2 py-1.5 text-xs text-[#555] hover:text-[#888] transition-colors"
                    >
                      <FolderPlus className="w-3 h-3" />
                      Add section
                    </button>
                  )}
                </div>
              </div>
            )
          })}

          {columns.length < 6 && (
            showNewPlaylist ? (
              <div className="flex-shrink-0 w-[280px] bg-[#0D0D10] border border-[#1A1A1E] rounded-xl p-3">
                <input
                  type="text"
                  value={newPlaylistName}
                  onChange={e => setNewPlaylistName(e.target.value)}
                  placeholder="Playlist name"
                  className="w-full bg-[#0A0A0C] border border-[#2A2A2E] rounded-lg px-3 py-2 text-sm text-[#E8E8E8] placeholder-[#555] focus:outline-none focus:border-[#C8A97E] mb-2"
                  onKeyDown={e => e.key === 'Enter' && createPlaylist()}
                  autoFocus
                />
                <select
                  value={newPlaylistProject}
                  onChange={e => setNewPlaylistProject(e.target.value)}
                  className="w-full bg-[#0A0A0C] border border-[#2A2A2E] rounded-lg px-3 py-2 text-sm text-[#888] focus:outline-none focus:border-[#C8A97E] mb-3"
                >
                  <option value="">Standalone</option>
                  {projects.map(p => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
                <div className="flex gap-2">
                  <button
                    onClick={() => { setShowNewPlaylist(false); setNewPlaylistName(''); setNewPlaylistProject('') }}
                    className="flex-1 px-3 py-1.5 text-sm text-[#888] hover:text-[#E8E8E8]"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() => createPlaylist()}
                    className="flex-1 px-3 py-1.5 text-sm bg-[#C8A97E] text-[#0A0A0C] rounded-lg hover:bg-[#D4B88A]"
                  >
                    Create
                  </button>
                </div>
              </div>
            ) : (
              <div
                className={`flex-shrink-0 w-[280px] h-full flex flex-col items-center justify-center gap-2 bg-[#0D0D10] rounded-xl transition-all cursor-pointer ${
                  dragOverAddButton ? 'bg-[#C8A97E]/10' : 'hover:bg-[#C8A97E]/5'
                }`}
                style={{
                  border: dragOverAddButton ? '2px solid #C8A97E' : '2px dashed #2A2A2E',
                  minHeight: '150px',
                  transition: 'all 0.15s'
                }}
                onClick={() => setShowNewPlaylist(true)}
                onDragEnter={(e) => {
                  e.preventDefault()
                  e.stopPropagation()
                  setDragOverAddButton(true)
                }}
                onDragOver={(e) => {
                  e.preventDefault()
                  e.stopPropagation()
                  e.dataTransfer.dropEffect = 'copy'
                  if (!dragOverAddButton) {
                    setDragOverAddButton(true)
                  }
                  return false
                }}
                onDragLeave={(e) => {
                  e.preventDefault()
                  const rect = e.currentTarget.getBoundingClientRect()
                  const isOutside = e.clientX < rect.left || e.clientX > rect.right || e.clientY < rect.top || e.clientY > rect.bottom
                  if (isOutside) {
                    setDragOverAddButton(false)
                  }
                }}
                onDrop={async (e) => {
                  e.preventDefault()
                  e.stopPropagation()
                  setDragOverAddButton(false)
                  const rawData = e.dataTransfer.getData('application/json') || e.dataTransfer.getData('text/plain')
                  let trackData: Track | null = null
                  try {
                    trackData = JSON.parse(rawData) as Track
                  } catch (err) {
                    trackData = draggedTrack || window.__draggedTrack || null
                  }
                  if (trackData) {
                    const newPlaylist = await createPlaylist(trackData)
                    if (newPlaylist) {
                      await addTrackToPlaylist(newPlaylist.id, trackData)
                    }
                  }
                  setDraggedTrack(null)
                  window.__draggedTrack = undefined
                }}
              >
                <Plus className="w-8 h-8 text-[#555]" />
                <span className="text-sm text-[#666]">{dragOverAddButton ? 'Drop to create playlist' : 'Add Playlist'}</span>
              </div>
            )
          )}
        </div>
      </div>

      <div
        className={`h-1.5 flex-shrink-0 cursor-ns-resize transition-colors ${
          isDraggingDivider ? 'bg-[#C8A97E]' : 'bg-[#1A1A1E] hover:bg-[#C8A97E]/50'
        }`}
        onMouseDown={handleDividerMouseDown}
      />

      <div style={{ height: `${100 - splitRatio}%` }} className="flex flex-col min-h-[200px] overflow-hidden">
        <div className="px-4 pt-3 pb-2 border-b border-[#1A1A1E]">
          <div className="flex items-center gap-2 mb-3">
            <ArrowUp className="w-4 h-4 text-[#C8A97E]" />
            <span className="text-sm text-[#888]">Drag tracks into a playlist above</span>
            <span className="text-xs text-[#555] ml-auto">{getCatalogDescription()}</span>
          </div>
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-[#666]" />
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Search catalog by title, artist, mood, genre, or tags..."
              className="w-full bg-[#1A1A1E] border border-[#2A2A2E] rounded-full pl-12 pr-10 py-3 text-[#E8E8E8] placeholder-[#555] focus:outline-none focus:border-[#C8A97E] transition-colors text-sm"
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
        </div>

        <div className="px-4 py-2 border-b border-[#1A1A1E]">
          <div className="flex items-center gap-3 overflow-x-auto scrollbar-hide pb-1">
            <div className="flex gap-2 flex-shrink-0">
              {MOODS.map(mood => {
                const isActive = selectedMood === mood
                const moodColor = mood === 'All' ? '#C8A97E' : MOOD_COLORS[mood]
                return (
                  <button
                    key={mood}
                    onClick={() => setSelectedMood(mood)}
                    className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all whitespace-nowrap ${
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

            <div className="h-5 w-px bg-[#2A2A2E] flex-shrink-0" />

            <select
              value={selectedGenre}
              onChange={e => setSelectedGenre(e.target.value)}
              className="bg-[#1A1A1E] border border-[#2A2A2E] rounded-full px-3 py-1.5 text-xs text-[#888] focus:outline-none focus:border-[#C8A97E] appearance-none cursor-pointer flex-shrink-0"
            >
              {GENRES.map(genre => (
                <option key={genre} value={genre}>{genre === 'All' ? 'All Genres' : genre}</option>
              ))}
            </select>

            <div className="flex items-center gap-2 bg-[#1A1A1E] border border-[#2A2A2E] rounded-full px-3 py-1.5 flex-shrink-0">
              <span className="text-xs text-[#666]">BPM:</span>
              <input
                type="range"
                min="60"
                max="180"
                value={bpmRange[0]}
                onChange={e => setBpmRange([parseInt(e.target.value), bpmRange[1]])}
                className="w-12 h-1 bg-[#333] rounded-full appearance-none cursor-pointer accent-[#C8A97E]"
              />
              <span className="text-xs text-[#888] w-14 text-center">{bpmRange[0]}-{bpmRange[1]}</span>
              <input
                type="range"
                min="60"
                max="180"
                value={bpmRange[1]}
                onChange={e => setBpmRange([bpmRange[0], parseInt(e.target.value)])}
                className="w-12 h-1 bg-[#333] rounded-full appearance-none cursor-pointer accent-[#C8A97E]"
              />
            </div>

            <select
              value={clearanceFilter}
              onChange={e => setClearanceFilter(e.target.value)}
              className="bg-[#1A1A1E] border border-[#2A2A2E] rounded-full px-3 py-1.5 text-xs text-[#888] focus:outline-none focus:border-[#C8A97E] appearance-none cursor-pointer flex-shrink-0"
            >
              {CLEARANCE_OPTIONS.map(option => (
                <option key={option} value={option}>{option === 'All' ? 'All Clearance' : option}</option>
              ))}
            </select>

            {hasActiveFilters && (
              <button
                onClick={clearAllFilters}
                className="flex items-center gap-1 px-3 py-1.5 rounded-full text-xs text-[#FF6B9D] bg-[#FF6B9D]/10 border border-[#FF6B9D]/20 hover:bg-[#FF6B9D]/20 transition-colors flex-shrink-0"
              >
                <X className="w-3 h-3" />
                Clear
              </button>
            )}

            <span className="text-xs text-[#666] flex-shrink-0 ml-auto">{filteredCatalog.length} tracks</span>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">
          {catalogLoading ? (
            <div className="flex items-center justify-center py-12">
              <Spinner />
            </div>
          ) : filteredCatalog.length > 0 ? (
            <div className="divide-y divide-[#1A1A1E]/50">
              {filteredCatalog.map((track) => (
                <CatalogTrackRow
                  key={track.id}
                  track={track}
                  isPlaying={currentTrack?.id === track.id && playing}
                  isCurrentTrack={currentTrack?.id === track.id}
                  isSaved={savedTracks.has(track.id)}
                  onPlay={() => onPlayTrack(track)}
                  onToggleSave={(e) => toggleSave(e, track.id)}
                  playlists={columns}
                  onAddToPlaylist={(playlistId) => addTrackToPlaylist(playlistId, track)}
                  onDragStartTrack={(dragTrack) => setDraggedTrack(dragTrack)}
                  onDragEndTrack={() => setDraggedTrack(null)}
                />
              ))}
            </div>
          ) : (
            <EmptyState
              title={searchQuery ? `No tracks found for '${searchQuery}'` : "No Tracks Found"}
              description={profile.role === 'artist' ? "Upload tracks to see them here" : "Try adjusting your search or filters"}
            />
          )}
        </div>
      </div>

      {contextMenu && (
        <div
          className="fixed bg-[#13131A] border border-[#1E1E22] rounded-xl shadow-2xl py-1 z-50"
          style={{ left: contextMenu.x, top: contextMenu.y }}
        >
          <button
            onClick={() => {
              const column = columns.find(c => c.id === contextMenu.playlistId)
              if (column) {
                setEditingPlaylistId(column.id)
                setEditingName(column.name)
              }
              setContextMenu(null)
            }}
            className="w-full flex items-center gap-2 px-4 py-2 text-sm text-[#E8E8E8] hover:bg-[#1A1A1E]"
          >
            Rename
          </button>
          <button
            onClick={() => {
              const column = columns.find(c => c.id === contextMenu.playlistId)
              if (column) {
                const shareToken = crypto.randomUUID()
                navigator.clipboard.writeText(`${window.location.origin}/playlist/${shareToken}`)
                alert('Link copied!')
              }
              setContextMenu(null)
            }}
            className="w-full flex items-center gap-2 px-4 py-2 text-sm text-[#E8E8E8] hover:bg-[#1A1A1E]"
          >
            <Share2 className="w-4 h-4" /> Share
          </button>
          <button
            onClick={() => duplicatePlaylist(contextMenu.playlistId)}
            className="w-full flex items-center gap-2 px-4 py-2 text-sm text-[#E8E8E8] hover:bg-[#1A1A1E]"
          >
            <Copy className="w-4 h-4" /> Duplicate
          </button>
          <div className="h-px bg-[#1E1E22] my-1" />
          <button
            onClick={() => deletePlaylist(contextMenu.playlistId)}
            className="w-full flex items-center gap-2 px-4 py-2 text-sm text-red-400 hover:bg-[#1A1A1E]"
          >
            <Trash2 className="w-4 h-4" /> Delete
          </button>
        </div>
      )}
    </div>
  )
}

function PlaylistTrackRow({
  playlistTrack,
  index,
  isPlaying,
  isCurrentTrack,
  onPlay,
  onRemove
}: {
  playlistTrack: PlaylistTrackWithFolder
  index: number
  isPlaying: boolean
  isCurrentTrack: boolean
  onPlay: () => void
  onRemove: () => void
}) {
  const [hovered, setHovered] = useState(false)
  const track = playlistTrack.track
  if (!track) return null

  const artworkColor = (track as Track & { artwork_color?: string }).artwork_color
  const moodColor = artworkColor || (track.mood ? MOOD_COLORS[track.mood] : '#C8A97E')

  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      className={`flex items-center gap-2 px-2 py-1.5 rounded transition-all cursor-pointer ${
        isCurrentTrack ? 'bg-[#C8A97E]/10' : hovered ? 'bg-[#1A1A1E]' : ''
      }`}
      onClick={onPlay}
    >
      <div className="w-4 flex items-center justify-center">
        {isPlaying ? (
          <Pause className="w-3 h-3 text-[#C8A97E]" />
        ) : (
          <span className="text-[10px] text-[#666]">{index}</span>
        )}
      </div>

      <div
        className="w-8 h-8 rounded flex-shrink-0 flex items-center justify-center"
        style={{ background: `linear-gradient(135deg, ${moodColor}60 0%, #1A1A1E 100%)` }}
      >
        <span className="text-[10px] font-semibold text-white/80">{track.title.charAt(0).toUpperCase()}</span>
      </div>

      <div className="flex-1 min-w-0">
        <p className={`text-xs font-medium truncate ${isCurrentTrack ? 'text-[#C8A97E]' : 'text-[#E8E8E8]'}`}>
          {track.title}
        </p>
        <ArtistLink artistName={track.artist} className="text-[10px] text-[#666] truncate block" />
      </div>

      <span className="text-[10px] text-[#666]">{track.bpm || '-'}</span>
      <span className="text-[10px] text-[#666]">{formatDuration(track.duration)}</span>

      {hovered && (
        <button
          onClick={(e) => { e.stopPropagation(); onRemove() }}
          className="p-1 text-[#666] hover:text-red-400 transition-colors"
        >
          <X className="w-3 h-3" />
        </button>
      )}
    </div>
  )
}

function CatalogTrackRow({
  track,
  isPlaying,
  isCurrentTrack,
  isSaved,
  onPlay,
  onToggleSave,
  playlists,
  onAddToPlaylist,
  onDragStartTrack,
  onDragEndTrack
}: {
  track: Track
  isPlaying: boolean
  isCurrentTrack: boolean
  isSaved: boolean
  onPlay: () => void
  onToggleSave: (e: React.MouseEvent) => void
  playlists: PlaylistColumn[]
  onAddToPlaylist: (playlistId: string) => void
  onDragStartTrack: (track: Track) => void
  onDragEndTrack: () => void
}) {
  const [hovered, setHovered] = useState(false)
  const [isDragging, setIsDragging] = useState(false)
  const [showAddDropdown, setShowAddDropdown] = useState(false)
  const [justAdded, setJustAdded] = useState<string | null>(null)
  const dropdownRef = useRef<HTMLDivElement>(null)
  const artworkColor = (track as Track & { artwork_color?: string }).artwork_color
  const moodColor = artworkColor || (track.mood ? MOOD_COLORS[track.mood] : '#C8A97E')

  useEffect(() => {
    if (!showAddDropdown) return
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setShowAddDropdown(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [showAddDropdown])

  const handleAddToPlaylist = (playlistId: string) => {
    onAddToPlaylist(playlistId)
    setJustAdded(playlistId)
    setTimeout(() => {
      setJustAdded(null)
      setShowAddDropdown(false)
    }, 800)
  }

  const trackData = {
    id: track.id,
    title: track.title,
    artist: track.artist,
    genre: track.genre,
    mood: track.mood,
    bpm: track.bpm,
    key: track.key,
    audio_url: track.audio_url,
    clearance_status: track.clearance_status,
    one_stop_fee: track.one_stop_fee,
    tags: track.tags,
    duration: track.duration
  }

  return (
    <div
      draggable={true}
      onDragStart={(e) => {
        setIsDragging(true)
        onDragStartTrack(track)
        e.dataTransfer.effectAllowed = 'copy'
        e.dataTransfer.setData('application/json', JSON.stringify(trackData))
        e.dataTransfer.setData('text/plain', JSON.stringify(trackData))
        window.__draggedTrack = track
      }}
      onDragEnd={() => {
        setIsDragging(false)
        onDragEndTrack()
        window.__draggedTrack = undefined
      }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => { setHovered(false); if (!showAddDropdown) setShowAddDropdown(false) }}
      className={`flex items-center gap-4 px-4 py-2.5 transition-colors ${
        isCurrentTrack ? 'bg-[#C8A97E]/10' : hovered ? 'bg-[#1A1A1E] shadow-sm' : ''
      } ${isDragging ? 'opacity-50' : ''}`}
      style={{ cursor: 'grab', userSelect: 'none' }}
      onClick={onPlay}
    >
      <div className="w-5 flex items-center justify-center">
        <GripVertical className={`w-4 h-4 ${hovered ? 'text-[#888]' : 'text-[#444]'}`} style={{ cursor: 'grab' }} />
      </div>

      <div
        className="w-10 h-10 rounded flex-shrink-0 flex items-center justify-center"
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
        <ArtistLink artistName={track.artist} className="text-xs text-[#666] truncate block" />
      </div>

      <span className="text-sm text-[#888] w-20 hidden md:block truncate">{track.genre || '-'}</span>
      <span className="text-sm text-[#888] w-12 hidden md:block">{track.bpm || '-'}</span>
      <span className="text-sm text-[#888] w-10 hidden lg:block">{track.key || '-'}</span>
      <span className="text-sm text-[#888] w-12">{formatDuration(track.duration)}</span>

      <div className="w-20 hidden lg:block">
        {track.mood && <MoodPill mood={track.mood} />}
      </div>

      <div className="w-14 hidden lg:block">
        {track.clearance_status && <ClearanceBadge status={track.clearance_status} />}
      </div>

      <span className="text-sm text-[#C8A97E] font-medium w-16 text-right">
        {track.one_stop_fee ? `$${track.one_stop_fee}` : '-'}
      </span>

      <div className="relative" ref={dropdownRef}>
        <button
          onClick={(e) => {
            e.stopPropagation()
            setShowAddDropdown(!showAddDropdown)
          }}
          className={`p-1.5 rounded transition-all ${
            showAddDropdown
              ? 'bg-[#C8A97E] text-[#0A0A0C]'
              : hovered
              ? 'text-[#C8A97E] hover:bg-[#C8A97E]/20'
              : 'text-transparent'
          }`}
          title="Add to playlist"
        >
          <Plus className="w-4 h-4" />
        </button>

        {showAddDropdown && (
          <div className="absolute right-0 bottom-full mb-1 bg-[#13131A] border border-[#1E1E22] rounded-lg shadow-2xl py-1 z-50 min-w-[180px]">
            <div className="px-3 py-1.5 text-xs text-[#666] border-b border-[#1E1E22]">
              Add to playlist
            </div>
            {playlists.length > 0 ? (
              playlists.map(playlist => (
                <button
                  key={playlist.id}
                  onClick={(e) => {
                    e.stopPropagation()
                    handleAddToPlaylist(playlist.id)
                  }}
                  className="w-full flex items-center gap-2 px-3 py-2 text-sm text-[#E8E8E8] hover:bg-[#1A1A1E] transition-colors"
                >
                  {justAdded === playlist.id ? (
                    <Check className="w-4 h-4 text-green-400" />
                  ) : (
                    <ListMusic className="w-4 h-4 text-[#666]" />
                  )}
                  <span className="truncate">{playlist.name}</span>
                  <span className="text-xs text-[#555] ml-auto">{playlist.tracks.length}</span>
                </button>
              ))
            ) : (
              <div className="px-3 py-2 text-sm text-[#666]">No playlists yet</div>
            )}
          </div>
        )}
      </div>

      <button
        onClick={onToggleSave}
        className={`p-1.5 rounded transition-colors ${
          isSaved ? 'text-[#FF6B9D]' : hovered ? 'text-[#888] hover:text-[#FF6B9D]' : 'text-transparent'
        }`}
      >
        <Heart className={`w-4 h-4 ${isSaved ? 'fill-current' : ''}`} />
      </button>
    </div>
  )
}
