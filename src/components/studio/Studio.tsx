import { useState, useEffect, useMemo, useRef } from 'react'
import { supabase } from '../../lib/supabase'
import { Card, Btn, Input, Spinner } from '../shared/UI'
import { Plus, Film, Clock, Globe, CreditCard as Edit2, Trash2, Play, Pause, Music2, Upload, Link2, X, ArrowLeft, Save, Search, Image } from 'lucide-react'
import type { Profile, StudioEntry, Track } from '../../lib/types'
import {
  validateStudioVideoFile,
  validateStudioAudioFile,
  validateStudioThumbnail,
  validateVideoUrl,
  extractVideoEmbedUrl
} from '../../lib/businessRules'

interface StudioProps {
  profile: Profile
}

type ViewMode = 'list' | 'editor'

const STUDIO_DEMO_ENTRIES = [
  {
    title: 'Launch Film - Hero Cut (Studio Audio + Catalog)',
    description: 'Includes a locked picture, a Studio-uploaded style score, and attached catalog alternates so the workflow is clear instantly.',
    tags: ['launch', 'cinematic', 'brand'],
    status: 'published' as const,
    video_mode: 'url' as const,
    video_url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4',
    thumbnail_url: 'https://images.unsplash.com/photo-1492684223066-81342ee5ff30?w=1280&auto=format&fit=crop'
  },
  {
    title: 'Docu Teaser - Music First (Audio Only)',
    description: 'No picture yet on purpose. Demonstrates Studio audio playback first, then optional catalog comparisons.',
    tags: ['documentary', 'teaser', 'music-first', 'audio-only'],
    status: 'published' as const,
    thumbnail_url: 'https://images.unsplash.com/photo-1511379938547-c1f69419868d?w=1280&auto=format&fit=crop'
  },
  {
    title: 'Social Spot - Catalog Track Compare',
    description: 'Short social cut designed to audition attached catalog tracks directly against picture.',
    tags: ['social', 'catalog', 'comparison'],
    status: 'published' as const,
    video_mode: 'url' as const,
    video_url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ElephantsDream.mp4',
    thumbnail_url: 'https://images.unsplash.com/photo-1470229722913-7c0e2dbbafd3?w=1280&auto=format&fit=crop'
  }
]

const SUPPORTED_AUDIO_BUCKETS = ['audio-tracks', 'studio', 'tracks'] as const
const STORAGE_PUBLIC_SEGMENT = '/storage/v1/object/public/'

function normalizeMediaUrl(rawUrl?: string | null): string | null {
  if (!rawUrl) return null
  const candidate = rawUrl.trim()
  if (!candidate) return null
  if (candidate.startsWith('blob:') || candidate.startsWith('data:')) return candidate
  if (candidate.startsWith('//')) return `https:${candidate}`
  if (/^https?:\/\//i.test(candidate)) return candidate
  return null
}

function extractStoragePath(urlOrPath: string, bucket: string): string | null {
  if (!urlOrPath) return null
  const trimmed = urlOrPath.trim().replace(/^\/+/, '')
  if (!trimmed) return null

  if (trimmed.startsWith(`${bucket}/`)) {
    return trimmed.slice(bucket.length + 1)
  }

  const marker = `${STORAGE_PUBLIC_SEGMENT}${bucket}/`
  const markerIndex = trimmed.indexOf(marker)
  if (markerIndex >= 0) {
    return trimmed.slice(markerIndex + marker.length)
  }

  if (!trimmed.includes('://') && !trimmed.startsWith('www.')) {
    return trimmed
  }

  return null
}

function resolveMediaUrl(urlOrPath?: string | null, preferredBuckets: readonly string[] = SUPPORTED_AUDIO_BUCKETS): string | null {
  const normalized = normalizeMediaUrl(urlOrPath)
  if (normalized) return normalized
  if (!urlOrPath) return null

  for (const bucket of preferredBuckets) {
    const path = extractStoragePath(urlOrPath, bucket)
    if (!path) continue
    const { data } = supabase.storage.from(bucket).getPublicUrl(path)
    if (data?.publicUrl) return data.publicUrl
  }

  return null
}

export function Studio({ profile }: StudioProps) {
  const [entries, setEntries] = useState<StudioEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [viewMode, setViewMode] = useState<ViewMode>('list')
  const [selectedEntry, setSelectedEntry] = useState<StudioEntry | null>(null)
  const [deleting, setDeleting] = useState<string | null>(null)

  useEffect(() => {
    loadEntries()
  }, [profile.id])

  const fetchEntries = () =>
    supabase
      .from('studio_entries')
      .select(`
        *,
        creator:profiles!studio_entries_created_by_fkey(id, full_name, avatar_url),
        attached_tracks:studio_entry_tracks(
          id,
          track_id,
          position,
          created_at,
          track:tracks(id, title, artist, cover_art_url, audio_url, preview_url, instrumental_url, acapella_url)
        )
      `)
      .eq('created_by', profile.id)
      .order('created_at', { ascending: false })

  const seedDemoEntries = async () => {
    const payload = STUDIO_DEMO_ENTRIES.map((demo) => ({
      ...demo,
      created_by: profile.id
    }))

    const { data: createdRows, error: insertError } = await supabase
      .from('studio_entries')
      .insert(payload)
      .select('id,title')

    if (insertError || !createdRows?.length) return

    const { data: tracks } = await supabase
      .from('tracks')
      .select('id')
      .eq('status', 'active')
      .limit(6)

    if (!tracks?.length) return

    const attachRows = []
    const firstDemo = createdRows.find((row) => row.title === 'Launch Film - Hero Cut (Studio Audio + Catalog)')
    const thirdDemo = createdRows.find((row) => row.title === 'Social Spot - Catalog Track Compare')

    if (firstDemo) {
      attachRows.push(
        { studio_entry_id: firstDemo.id, track_id: tracks[0]?.id, position: 0 },
        { studio_entry_id: firstDemo.id, track_id: tracks[1]?.id, position: 1 }
      )
    }

    if (thirdDemo) {
      attachRows.push(
        { studio_entry_id: thirdDemo.id, track_id: tracks[2]?.id, position: 0 },
        { studio_entry_id: thirdDemo.id, track_id: tracks[3]?.id, position: 1 }
      )
    }

    const validAttachRows = attachRows.filter((row) => row.track_id)
    if (validAttachRows.length > 0) {
      await supabase.from('studio_entry_tracks').insert(validAttachRows)
    }
  }

  const loadEntries = async () => {
    setLoading(true)
    const { data, error } = await fetchEntries()

    if (!error && data) {
      if (data.length === 0) {
        await seedDemoEntries()
        const { data: seededData } = await fetchEntries()
        setEntries((seededData as StudioEntry[]) || [])
      } else {
        setEntries(data as StudioEntry[])
      }
    }
    setLoading(false)
  }

  const handleCreate = () => {
    setSelectedEntry(null)
    setViewMode('editor')
  }

  const handleEdit = (entry: StudioEntry) => {
    setSelectedEntry(entry)
    setViewMode('editor')
  }

  const handleDelete = async (entryId: string) => {
    if (!confirm('Delete this Studio entry?')) return

    setDeleting(entryId)
    const entry = entries.find(e => e.id === entryId)

    if (entry) {
      const filesToDelete: string[] = []
      if (entry.video_file_path) filesToDelete.push(entry.video_file_path)
      if (entry.audio_file_path) filesToDelete.push(entry.audio_file_path)
      if (entry.thumbnail_url?.includes('studio/')) {
        const path = entry.thumbnail_url.split('/studio/')[1]
        if (path) filesToDelete.push(path)
      }

      if (filesToDelete.length > 0) {
        await supabase.storage.from('studio').remove(filesToDelete)
      }
    }

    const { error } = await supabase
      .from('studio_entries')
      .delete()
      .eq('id', entryId)

    if (!error) {
      setEntries(entries.filter(e => e.id !== entryId))
    }
    setDeleting(null)
  }

  const handleSaved = () => {
    loadEntries()
    setViewMode('list')
    setSelectedEntry(null)
  }

  const handleBack = () => {
    setViewMode('list')
    setSelectedEntry(null)
  }

  if (viewMode === 'editor') {
    return (
      <StudioEditor
        entry={selectedEntry}
        onSave={handleSaved}
        onCancel={handleBack}
      />
    )
  }

  return (
    <div className="p-4 md:p-6 h-[calc(100vh-76px)] overflow-y-auto pb-40 md:pb-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-[#888]">Studio</p>
          <h1 className="font-display text-xl md:text-2xl mt-1 text-[#E8E8E8]">Create and manage projects</h1>
        </div>
        <Btn onClick={handleCreate}>
          <Plus className="w-4 h-4" /> New Project
        </Btn>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Spinner size="lg" />
        </div>
      ) : entries.length === 0 ? (
        <Card className="p-8 text-center">
          <Film className="w-12 h-12 text-[#555] mx-auto mb-4" />
          <h3 className="text-lg font-medium text-[#E8E8E8] mb-2">No Projects Yet</h3>
          <p className="text-sm text-[#888] mb-4">
            Create your first project to start working with video and audio.
          </p>
          <Btn onClick={handleCreate}>
            <Plus className="w-4 h-4" /> Create Project
          </Btn>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {entries.map(entry => (
            <StudioEntryCard
              key={entry.id}
              entry={entry}
              onEdit={() => handleEdit(entry)}
              onDelete={() => handleDelete(entry.id)}
              deleting={deleting === entry.id}
            />
          ))}
        </div>
      )}
    </div>
  )
}

interface StudioEntryCardProps {
  entry: StudioEntry
  onEdit: () => void
  onDelete: () => void
  deleting: boolean
}

function StudioEntryCard({ entry, onEdit, onDelete, deleting }: StudioEntryCardProps) {
  const hasVideo = entry.video_url || entry.video_file_path
  const hasAudio = entry.audio_file_path
  const trackCount = entry.attached_tracks?.length || 0

  return (
    <Card className="overflow-hidden group hover:border-[#C8A97E]/30 transition-colors cursor-pointer" onClick={onEdit}>
      <div className="relative aspect-video bg-[#0A0A0C]">
        {entry.thumbnail_url ? (
          <img src={entry.thumbnail_url} alt={entry.title} className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <Film className="w-12 h-12 text-[#333]" />
          </div>
        )}

        <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
          <button
            onClick={(e) => { e.stopPropagation(); onEdit() }}
            className="px-4 py-2 bg-[#C8A97E] rounded-full text-[#0A0A0C] text-sm font-medium"
          >
            Edit Project
          </button>
        </div>

        <div className="absolute top-2 right-2">
          {entry.status === 'draft' ? (
            <span className="px-2 py-0.5 bg-[#333]/90 text-[#888] text-xs rounded-full">Draft</span>
          ) : (
            <span className="px-2 py-0.5 bg-[#4DFFB4]/20 text-[#4DFFB4] text-xs rounded-full flex items-center gap-1">
              <Globe className="w-3 h-3" /> Published
            </span>
          )}
        </div>
      </div>

      <div className="p-4">
        <h3 className="font-medium text-[#E8E8E8] truncate mb-1">{entry.title || 'Untitled Project'}</h3>

        <div className="flex items-center gap-3 text-xs text-[#666] mb-3">
          {hasVideo && <span className="flex items-center gap-1"><Film className="w-3 h-3" /> Video</span>}
          {hasAudio && <span className="flex items-center gap-1"><Music2 className="w-3 h-3" /> Audio</span>}
          {trackCount > 0 && <span className="flex items-center gap-1"><Music2 className="w-3 h-3" /> {trackCount} tracks</span>}
        </div>

        <div className="flex items-center justify-between pt-3 border-t border-[#1E1E22]">
          <span className="text-xs text-[#555] flex items-center gap-1">
            <Clock className="w-3 h-3" />
            {new Date(entry.created_at).toLocaleDateString()}
          </span>

          <div className="flex items-center gap-1">
            <button
              onClick={(e) => { e.stopPropagation(); onEdit() }}
              className="p-1.5 text-[#666] hover:text-[#C8A97E] transition-colors"
            >
              <Edit2 className="w-4 h-4" />
            </button>
            <button
              onClick={(e) => { e.stopPropagation(); onDelete() }}
              className="p-1.5 text-[#666] hover:text-red-400 transition-colors"
              disabled={deleting}
            >
              {deleting ? <Spinner /> : <Trash2 className="w-4 h-4" />}
            </button>
          </div>
        </div>
      </div>
    </Card>
  )
}

interface StudioEditorProps {
  entry: StudioEntry | null
  onSave: () => void
  onCancel: () => void
}

function StudioEditor({ entry, onSave, onCancel }: StudioEditorProps) {
  const isEditing = !!entry

  const [title, setTitle] = useState(entry?.title || '')
  const [description, setDescription] = useState(entry?.description || '')
  const [tags, setTags] = useState<string[]>(entry?.tags || [])
  const [tagInput, setTagInput] = useState('')
  const [status, setStatus] = useState<'draft' | 'published'>(entry?.status || 'draft')

  const [videoMode, setVideoMode] = useState<'upload' | 'url' | null>(entry?.video_mode || null)
  const [videoUrl, setVideoUrl] = useState(entry?.video_url || '')
  const [videoFile, setVideoFile] = useState<File | null>(null)
  const [videoFileName, setVideoFileName] = useState(entry?.video_file_name || '')
  const [existingVideoPath, setExistingVideoPath] = useState(entry?.video_file_path || '')

  const [audioFile, setAudioFile] = useState<File | null>(null)
  const [audioFileName, setAudioFileName] = useState(entry?.audio_file_name || '')
  const [existingAudioPath, setExistingAudioPath] = useState(entry?.audio_file_path || '')
  const [audioUrl, setAudioUrl] = useState(entry?.audio_url || '')

  const [thumbnailFile, setThumbnailFile] = useState<File | null>(null)
  const [thumbnailPreview, setThumbnailPreview] = useState(entry?.thumbnail_url || '')

  const [attachedTracks, setAttachedTracks] = useState<Array<{ track_id: string; track: Track }>>([])
  const [catalogTracks, setCatalogTracks] = useState<Track[]>([])
  const [loadingCatalog, setLoadingCatalog] = useState(true)
  const [trackSearchQuery, setTrackSearchQuery] = useState('')
  const [trackSearchResults, setTrackSearchResults] = useState<Track[]>([])
  const [searchingTracks, setSearchingTracks] = useState(false)
  const [showTrackSearch, setShowTrackSearch] = useState(false)

  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showDetails, setShowDetails] = useState(false)

  const videoInputRef = useRef<HTMLInputElement>(null)
  const audioInputRef = useRef<HTMLInputElement>(null)
  const thumbnailInputRef = useRef<HTMLInputElement>(null)
  const videoPreviewRef = useRef<HTMLVideoElement>(null)
  const audioPreviewRef = useRef<HTMLAudioElement>(null)

  const [videoPlaying, setVideoPlaying] = useState(false)
  const [audioPlaying, setAudioPlaying] = useState(false)
  const [videoLoadError, setVideoLoadError] = useState<string | null>(null)
  const [audioLoadError, setAudioLoadError] = useState<string | null>(null)
  const [catalogTrackErrors, setCatalogTrackErrors] = useState<Record<string, string>>({})

  useEffect(() => {
    if (entry?.attached_tracks) {
      setAttachedTracks(entry.attached_tracks.map(at => ({
        track_id: at.track_id,
        track: at.track as Track
      })))
    }
  }, [entry])

  useEffect(() => {
    loadCatalogTracks()
  }, [])

  const loadCatalogTracks = async () => {
    setLoadingCatalog(true)
    const { data } = await supabase
      .from('tracks')
      .select('id, title, artist, cover_art_url, audio_url, preview_url, instrumental_url, acapella_url, genre, mood')
      .eq('status', 'active')
      .order('created_at', { ascending: false })
      .limit(20)

    if (data) {
      setCatalogTracks(data as Track[])
    }
    setLoadingCatalog(false)
  }

  useEffect(() => {
    const debounce = setTimeout(() => {
      if (trackSearchQuery) searchTracks(trackSearchQuery)
    }, 300)
    return () => clearTimeout(debounce)
  }, [trackSearchQuery])

  const searchTracks = async (query: string) => {
    if (!query.trim()) {
      setTrackSearchResults([])
      return
    }
    setSearchingTracks(true)
    const { data } = await supabase
      .from('tracks')
      .select('id, title, artist, cover_art_url, audio_url, preview_url, instrumental_url, acapella_url')
      .or(`title.ilike.%${query}%,artist.ilike.%${query}%`)
      .eq('status', 'active')
      .limit(10)

    if (data) {
      const attachedIds = new Set(attachedTracks.map(t => t.track_id))
      setTrackSearchResults(data.filter(t => !attachedIds.has(t.id)) as Track[])
    }
    setSearchingTracks(false)
  }

  const handleVideoFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    const validation = validateStudioVideoFile({ type: file.type, size: file.size })
    if (!validation.valid) {
      setError(validation.reason || 'Invalid video')
      return
    }

    setVideoFile(file)
    setVideoFileName(file.name)
    setVideoMode('upload')
    setVideoUrl('')
    setExistingVideoPath('')
    setVideoLoadError(null)
    setError(null)
  }

  const handleAudioFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    const validation = validateStudioAudioFile({ type: file.type, size: file.size })
    if (!validation.valid) {
      setError(validation.reason || 'Invalid audio')
      return
    }

    setAudioFile(file)
    setAudioFileName(file.name)
    setExistingAudioPath('')
    setAudioUrl('')
    setAudioLoadError(null)
    setError(null)
  }

  const handleThumbnailSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    const validation = validateStudioThumbnail({ type: file.type, size: file.size })
    if (!validation.valid) {
      setError(validation.reason || 'Invalid image')
      return
    }

    setThumbnailFile(file)
    setThumbnailPreview(URL.createObjectURL(file))
    setError(null)
  }

  const removeVideo = () => {
    setVideoFile(null)
    setVideoFileName('')
    setVideoUrl('')
    setVideoMode(null)
    setExistingVideoPath('')
    setVideoLoadError(null)
  }

  const removeAudio = () => {
    setAudioFile(null)
    setAudioFileName('')
    setExistingAudioPath('')
    setAudioUrl('')
    setAudioLoadError(null)
  }

  const removeThumbnail = () => {
    if (thumbnailPreview && thumbnailFile) URL.revokeObjectURL(thumbnailPreview)
    setThumbnailFile(null)
    setThumbnailPreview('')
  }

  const attachTrack = (track: Track) => {
    setAttachedTracks(prev => [...prev, { track_id: track.id, track }])
    setTrackSearchQuery('')
    setTrackSearchResults([])
    setShowTrackSearch(false)
  }

  const removeTrack = (trackId: string) => {
    setAttachedTracks(prev => prev.filter(t => t.track_id !== trackId))
  }

  const addTag = () => {
    const tag = tagInput.trim().toLowerCase()
    if (tag && !tags.includes(tag) && tags.length < 10) {
      setTags([...tags, tag])
      setTagInput('')
    }
  }

  const toggleVideoPlay = () => {
    if (!videoPreviewRef.current) return
    if (videoPlaying) {
      videoPreviewRef.current.pause()
      setVideoPlaying(false)
    } else {
      videoPreviewRef.current.play()
        .then(() => setVideoPlaying(true))
        .catch(() => setVideoLoadError('Playback was blocked or failed. Use browser controls to retry.'))
    }
  }

  const toggleAudioPlay = () => {
    if (!audioPreviewRef.current) return
    if (audioPlaying) {
      audioPreviewRef.current.pause()
      setAudioPlaying(false)
    } else {
      audioPreviewRef.current.play()
        .then(() => setAudioPlaying(true))
        .catch(() => setAudioLoadError('Playback was blocked or failed. Use browser controls to retry.'))
    }
  }

  const handleSave = async () => {
    setError(null)
    setSaving(true)

    try {
      if (videoMode === 'url' && videoUrl.trim()) {
        const videoValidation = validateVideoUrl(videoUrl.trim())
        if (!videoValidation.valid) {
          setError(videoValidation.reason || 'Invalid video URL')
          setSaving(false)
          return
        }
      }

      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        setError('You must be logged in')
        setSaving(false)
        return
      }

      const entryId = entry?.id || crypto.randomUUID()
      const basePath = `${user.id}/${entryId}`
      const finalTitle = title.trim() || 'Untitled Project'

      let thumbnailUrl = entry?.thumbnail_url || null
      let videoFilePath = entry?.video_file_path || null
      let finalVideoFileName = entry?.video_file_name || null
      let videoFileSize = entry?.video_file_size || null
      let videoMimeType = entry?.video_mime_type || null
      let audioFilePath = entry?.audio_file_path || null
      let finalAudioFileName = entry?.audio_file_name || null
      let audioFileSize = entry?.audio_file_size || null
      let audioMimeType = entry?.audio_mime_type || null

      if (thumbnailFile) {
        const ext = thumbnailFile.name.split('.').pop()
        const path = `${basePath}/thumbnail/cover.${ext}`
        const { error: uploadError } = await supabase.storage.from('studio').upload(path, thumbnailFile, { upsert: true })
        if (!uploadError) {
          const { data: urlData } = supabase.storage.from('studio').getPublicUrl(path)
          thumbnailUrl = urlData.publicUrl
        }
      } else if (!thumbnailPreview && entry?.thumbnail_url) {
        thumbnailUrl = null
      }

      if (videoFile) {
        const ext = videoFile.name.split('.').pop()
        const path = `${basePath}/video/main.${ext}`
        const { error: uploadError } = await supabase.storage.from('studio').upload(path, videoFile, { upsert: true })
        if (!uploadError) {
          videoFilePath = path
          finalVideoFileName = videoFile.name
          videoFileSize = videoFile.size
          videoMimeType = videoFile.type
        }
      } else if (!videoFileName && !videoUrl && entry?.video_file_path) {
        videoFilePath = null
        finalVideoFileName = null
        videoFileSize = null
        videoMimeType = null
      }

      if (audioFile) {
        const ext = audioFile.name.split('.').pop()
        const path = `${basePath}/audio/main.${ext}`
        const { error: uploadError } = await supabase.storage.from('studio').upload(path, audioFile, { upsert: true })
        if (!uploadError) {
          audioFilePath = path
          finalAudioFileName = audioFile.name
          audioFileSize = audioFile.size
          audioMimeType = audioFile.type
        }
      } else if (!audioFileName && entry?.audio_file_path) {
        audioFilePath = null
        finalAudioFileName = null
        audioFileSize = null
        audioMimeType = null
      }

      const publishedAt = status === 'published' && !entry?.published_at ? new Date().toISOString() : entry?.published_at || null

      const entryData = {
        id: entryId,
        created_by: user.id,
        title: finalTitle,
        description: description.trim() || null,
        thumbnail_url: thumbnailUrl,
        video_mode: videoMode,
        video_url: videoMode === 'url' ? videoUrl.trim() : null,
        video_file_path: videoMode === 'upload' ? videoFilePath : null,
        video_file_name: videoMode === 'upload' ? finalVideoFileName : null,
        video_file_size: videoMode === 'upload' ? videoFileSize : null,
        video_mime_type: videoMode === 'upload' ? videoMimeType : null,
        audio_file_path: audioFilePath,
        audio_url: audioFilePath ? null : (audioUrl.trim() || null),
        audio_file_name: finalAudioFileName,
        audio_file_size: audioFileSize,
        audio_mime_type: audioMimeType,
        status,
        tags,
        published_at: publishedAt
      }

      if (isEditing) {
        const { error: updateError } = await supabase
          .from('studio_entries')
          .update(entryData)
          .eq('id', entryId)
        if (updateError) throw updateError
      } else {
        const { error: insertError } = await supabase
          .from('studio_entries')
          .insert(entryData)
        if (insertError) throw insertError
      }

      await supabase.from('studio_entry_tracks').delete().eq('studio_entry_id', entryId)

      if (attachedTracks.length > 0) {
        const trackRows = attachedTracks.map((t, idx) => ({
          studio_entry_id: entryId,
          track_id: t.track_id,
          position: idx
        }))
        await supabase.from('studio_entry_tracks').insert(trackRows)
      }

      onSave()
    } catch (err) {
      console.error('Save failed:', err)
      setError(err instanceof Error ? err.message : 'Failed to save')
    } finally {
      setSaving(false)
    }
  }

  const videoPreviewUrl = useMemo(() => {
    if (videoFile) return URL.createObjectURL(videoFile)
    if (videoMode === 'url' && videoUrl) {
      return extractVideoEmbedUrl(videoUrl.trim())
    }
    if (existingVideoPath) {
      const { data } = supabase.storage.from('studio').getPublicUrl(existingVideoPath)
      return data.publicUrl
    }
    return null
  }, [videoFile, videoMode, videoUrl, existingVideoPath])

  const audioPreviewUrl = useMemo(() => {
    if (audioFile) return URL.createObjectURL(audioFile)
    if (existingAudioPath) {
      const { data } = supabase.storage.from('studio').getPublicUrl(existingAudioPath)
      return data.publicUrl
    }
    return resolveMediaUrl(audioUrl, ['studio', 'audio-tracks'])
  }, [audioFile, existingAudioPath, audioUrl])

  useEffect(() => {
    return () => {
      if (videoFile && videoPreviewUrl?.startsWith('blob:')) URL.revokeObjectURL(videoPreviewUrl)
    }
  }, [videoFile, videoPreviewUrl])

  useEffect(() => {
    return () => {
      if (audioFile && audioPreviewUrl?.startsWith('blob:')) URL.revokeObjectURL(audioPreviewUrl)
    }
  }, [audioFile, audioPreviewUrl])

  const isYoutubeOrVimeo = videoMode === 'url' && videoUrl && (videoUrl.includes('youtube') || videoUrl.includes('vimeo'))

  return (
    <div className="h-[calc(100vh-76px)] flex flex-col bg-[#070709]">
      <div className="flex items-center justify-between p-4 border-b border-[#1A1A22]">
        <div className="flex items-center gap-4">
          <button onClick={onCancel} className="p-2 text-[#888] hover:text-[#E8E8E8]">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Project title..."
            className="text-xl font-semibold text-[#E8E8E8] bg-transparent border-none outline-none placeholder-[#555]"
          />
        </div>
        <div className="flex items-center gap-2">
          <Btn onClick={() => setShowDetails(!showDetails)} variant="ghost" size="sm">
            {showDetails ? 'Hide Details' : 'Details'}
          </Btn>
          <Btn onClick={handleSave} disabled={saving}>
            {saving ? <><Spinner /> Saving...</> : <><Save className="w-4 h-4" /> Save</>}
          </Btn>
        </div>
      </div>

      {error && (
        <div className="mx-4 mt-4 p-3 bg-red-500/10 border border-red-500/30 rounded-lg text-red-400 text-sm">
          {error}
        </div>
      )}

      <div className="flex-1 overflow-hidden flex">
        <div className="flex-1 overflow-y-auto p-4">
          <div className="max-w-4xl mx-auto space-y-4">
            <Card className="p-0 bg-[#101014] border-[#1F1F25] overflow-hidden">
              <div className="relative aspect-video bg-black">
                {videoPreviewUrl ? (
                  isYoutubeOrVimeo ? (
                    <iframe
                      src={videoPreviewUrl}
                      className="w-full h-full"
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                      allowFullScreen
                    />
                  ) : (
                    <video
                      ref={videoPreviewRef}
                      src={videoPreviewUrl}
                      controls
                      crossOrigin="anonymous"
                      className="w-full h-full object-contain"
                      preload="auto"
                      playsInline
                      onEnded={() => setVideoPlaying(false)}
                      onPause={() => setVideoPlaying(false)}
                      onPlay={() => setVideoPlaying(true)}
                      onCanPlay={() => setVideoLoadError(null)}
                      onError={() => setVideoLoadError('Video could not be loaded. Check the file or URL.')}
                    />
                  )
                ) : (
                  <div className="w-full h-full flex flex-col items-center justify-center text-[#555]">
                    <Film className="w-16 h-16 mb-4" />
                    <p className="text-lg mb-4">Add a video to get started</p>
                    <div className="flex gap-2">
                      <Btn onClick={() => videoInputRef.current?.click()} variant="ghost">
                        <Upload className="w-4 h-4" /> Upload Video
                      </Btn>
                      <Btn onClick={() => setVideoMode('url')} variant="ghost">
                        <Link2 className="w-4 h-4" /> Paste URL
                      </Btn>
                    </div>
                  </div>
                )}

                {videoPreviewUrl && !isYoutubeOrVimeo && (
                  <button
                    onClick={toggleVideoPlay}
                    className="absolute bottom-4 left-4 p-3 bg-[#C8A97E] rounded-full text-[#0A0A0C] hover:bg-[#D4B88F] transition-colors"
                  >
                    {videoPlaying ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5" />}
                  </button>
                )}

                {videoPreviewUrl && (
                  <button
                    onClick={removeVideo}
                    className="absolute top-4 right-4 p-2 bg-black/60 rounded-full text-white hover:bg-black/80"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>
              {videoLoadError && (
                <div className="px-4 py-2 border-t border-red-500/30 bg-red-500/10 text-red-400 text-xs">
                  {videoLoadError}
                </div>
              )}

              <input ref={videoInputRef} type="file" accept="video/*" onChange={handleVideoFileSelect} className="hidden" />
            </Card>

            {videoMode === 'url' && (
              <Card className="p-4 bg-[#101014] border-[#1F1F25]">
                <Input
                  value={videoUrl}
                  onChange={(e) => {
                    setVideoUrl(e.target.value)
                    if (e.target.value.trim()) setVideoMode('url')
                    setVideoLoadError(null)
                  }}
                  placeholder="Paste YouTube, Vimeo, or direct video URL..."
                  autoFocus
                />
              </Card>
            )}

            {(videoPreviewUrl || videoMode === null) && (
              <div className="flex gap-2">
                <Btn onClick={() => videoInputRef.current?.click()} variant="ghost" size="sm">
                  <Upload className="w-4 h-4" /> {videoPreviewUrl ? 'Replace Video' : 'Upload Video'}
                </Btn>
                {!videoPreviewUrl && (
                  <Btn onClick={() => setVideoMode('url')} variant="ghost" size="sm">
                    <Link2 className="w-4 h-4" /> Video URL
                  </Btn>
                )}
              </div>
            )}

            <Card className="p-4 bg-[#101014] border-[#1F1F25]">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2 text-[#C8A97E]">
                  <Music2 className="w-4 h-4" />
                  <span className="text-sm font-medium">Studio Uploaded Audio</span>
                </div>
                <span className="text-[10px] px-2 py-0.5 rounded-full border border-[#2A2A2E] text-[#777]">
                  Primary audio lane
                </span>
              </div>
              <p className="text-xs text-[#666] mb-3">
                Use this for the dedicated Studio stem/upload tied to the project itself.
              </p>

              {audioPreviewUrl ? (
                <div className="space-y-3">
                  <div className="flex items-center gap-3">
                  <button
                    onClick={toggleAudioPlay}
                    className="p-3 bg-[#C8A97E] rounded-full text-[#0A0A0C] hover:bg-[#D4B88F] transition-colors"
                  >
                    {audioPlaying ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5" />}
                  </button>
                  <div className="flex-1">
                    <p className="text-sm text-[#E8E8E8]">{audioFileName || 'Studio audio'}</p>
                    {!audioFileName && audioUrl && <p className="text-xs text-[#777]">Source: linked URL</p>}
                  </div>
                  <button onClick={removeAudio} className="p-2 text-[#666] hover:text-red-400">
                    <X className="w-4 h-4" />
                  </button>
                </div>
                  <audio
                    ref={audioPreviewRef}
                    src={audioPreviewUrl}
                    controls
                    className="w-full"
                    preload="metadata"
                    onEnded={() => setAudioPlaying(false)}
                    onPause={() => setAudioPlaying(false)}
                    onPlay={() => setAudioPlaying(true)}
                    onCanPlay={() => setAudioLoadError(null)}
                    onError={() => setAudioLoadError('Audio could not be loaded. Check the file or URL.')}
                  />
                  {audioLoadError && <p className="text-xs text-red-400">{audioLoadError}</p>}
                </div>
              ) : (
                <div
                  onClick={() => audioInputRef.current?.click()}
                  className="border-2 border-dashed border-[#2A2A2E] rounded-lg p-6 text-center cursor-pointer hover:border-[#C8A97E] transition-colors"
                >
                  <Music2 className="w-8 h-8 text-[#555] mx-auto mb-2" />
                  <p className="text-sm text-[#888]">Click to upload audio</p>
                  <p className="text-xs text-[#555] mt-1">MP3, WAV, AIFF, FLAC up to 100MB</p>
                </div>
              )}
              <input ref={audioInputRef} type="file" accept="audio/*" onChange={handleAudioFileSelect} className="hidden" />
            </Card>

            <Card className="p-4 bg-[#101014] border-[#1F1F25]">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2 text-[#C8A97E]">
                  <Music2 className="w-4 h-4" />
                  <span className="text-sm font-medium">Catalog Tracks</span>
                </div>
                <span className="text-[10px] px-2 py-0.5 rounded-full border border-[#2A2A2E] text-[#777]">
                  Alternate options
                </span>
                <Btn onClick={() => setShowTrackSearch(!showTrackSearch)} size="sm" variant="ghost">
                  {showTrackSearch ? <X className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
                </Btn>
              </div>
              <p className="text-xs text-[#666] mb-3">
                Attach and audition catalog alternatives. These do not replace Studio uploaded audio.
              </p>

              {showTrackSearch && (
                <div className="mb-4 p-3 bg-[#0A0A0C] rounded-lg">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#555]" />
                    <Input
                      value={trackSearchQuery}
                      onChange={(e) => setTrackSearchQuery(e.target.value)}
                      placeholder="Search tracks..."
                      className="pl-10"
                      autoFocus
                    />
                  </div>

                  {searchingTracks && <div className="flex justify-center py-4"><Spinner /></div>}

                  {!searchingTracks && trackSearchResults.length > 0 && (
                    <div className="mt-2 space-y-1 max-h-48 overflow-y-auto">
                      {trackSearchResults.map(track => (
                        <button
                          key={track.id}
                          onClick={() => attachTrack(track)}
                          className="w-full flex items-center gap-3 p-2 rounded-lg hover:bg-[#1A1A1E] text-left"
                        >
                          {track.cover_art_url ? (
                            <img src={track.cover_art_url} alt="" className="w-10 h-10 rounded object-cover" />
                          ) : (
                            <div className="w-10 h-10 rounded bg-[#1A1A1E] flex items-center justify-center">
                              <Music2 className="w-5 h-5 text-[#555]" />
                            </div>
                          )}
                          <div className="flex-1 min-w-0">
                            <p className="text-sm text-[#E8E8E8] truncate">{track.title}</p>
                            <p className="text-xs text-[#888] truncate">{track.artist}</p>
                          </div>
                          <Plus className="w-4 h-4 text-[#C8A97E]" />
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {attachedTracks.length > 0 && (
                <>
                  <p className="text-xs text-[#C8A97E] mb-2 font-medium">Attached ({attachedTracks.length})</p>
                  <div className="space-y-2 mb-4">
                    {attachedTracks.map(at => {
                      const catalogPreviewUrl = resolveMediaUrl(
                        at.track?.audio_url || at.track?.preview_url || at.track?.instrumental_url || at.track?.acapella_url
                      )

                      return (
                        <div key={at.track_id} className="flex items-center gap-3 p-2 bg-[#0A0A0C] rounded-lg">
                          {at.track?.cover_art_url ? (
                            <img src={at.track.cover_art_url} alt="" className="w-10 h-10 rounded object-cover" />
                          ) : (
                            <div className="w-10 h-10 rounded bg-[#1A1A1E] flex items-center justify-center">
                              <Music2 className="w-5 h-5 text-[#555]" />
                            </div>
                          )}
                          <div className="flex-1 min-w-0">
                            <p className="text-sm text-[#E8E8E8] truncate">{at.track?.title}</p>
                            <p className="text-xs text-[#888] truncate">{at.track?.artist}</p>
                            {catalogPreviewUrl ? (
                              <audio
                                src={catalogPreviewUrl}
                                controls
                                className="w-full mt-2"
                                preload="metadata"
                                onCanPlay={() => setCatalogTrackErrors(prev => ({ ...prev, [at.track_id]: '' }))}
                                onError={() => setCatalogTrackErrors(prev => ({ ...prev, [at.track_id]: 'Track preview unavailable' }))}
                              />
                            ) : (
                              <p className="text-xs text-[#666] mt-1">No track preview URL available.</p>
                            )}
                            {catalogTrackErrors[at.track_id] && (
                              <p className="text-xs text-red-400 mt-1">{catalogTrackErrors[at.track_id]}</p>
                            )}
                          </div>
                          <button onClick={() => removeTrack(at.track_id)} className="p-1.5 text-[#666] hover:text-red-400">
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      )
                    })}
                  </div>
                </>
              )}

              <p className="text-xs text-[#888] mb-2">Available from Catalog</p>
              {loadingCatalog ? (
                <div className="flex justify-center py-4"><Spinner /></div>
              ) : (
                <div className="space-y-1 max-h-48 overflow-y-auto">
                  {catalogTracks
                    .filter(t => !attachedTracks.some(at => at.track_id === t.id))
                    .map(track => (
                      <button
                        key={track.id}
                        onClick={() => attachTrack(track)}
                        className="w-full flex items-center gap-3 p-2 rounded-lg hover:bg-[#1A1A1E] text-left transition-colors"
                      >
                        {track.cover_art_url ? (
                          <img src={track.cover_art_url} alt="" className="w-10 h-10 rounded object-cover" />
                        ) : (
                          <div className="w-10 h-10 rounded bg-[#1A1A1E] flex items-center justify-center">
                            <Music2 className="w-5 h-5 text-[#555]" />
                          </div>
                        )}
                        <div className="flex-1 min-w-0">
                          <p className="text-sm text-[#E8E8E8] truncate">{track.title}</p>
                          <p className="text-xs text-[#888] truncate">{track.artist}</p>
                        </div>
                        <Plus className="w-4 h-4 text-[#C8A97E]" />
                      </button>
                    ))}
                  {catalogTracks.filter(t => !attachedTracks.some(at => at.track_id === t.id)).length === 0 && (
                    <p className="text-xs text-[#666] text-center py-2">All catalog tracks attached</p>
                  )}
                </div>
              )}
            </Card>
          </div>
        </div>

        {showDetails && (
          <div className="w-80 border-l border-[#1A1A22] overflow-y-auto p-4 space-y-4">
            <div>
              <label className="block text-xs text-[#888] mb-1">Thumbnail</label>
              {thumbnailPreview ? (
                <div className="relative aspect-video rounded-lg overflow-hidden mb-2">
                  <img src={thumbnailPreview} alt="Thumbnail" className="w-full h-full object-cover" />
                  <button
                    onClick={removeThumbnail}
                    className="absolute top-2 right-2 p-1.5 bg-black/60 rounded-full text-white hover:bg-black/80"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              ) : (
                <div
                  onClick={() => thumbnailInputRef.current?.click()}
                  className="aspect-video border-2 border-dashed border-[#2A2A2E] rounded-lg flex flex-col items-center justify-center cursor-pointer hover:border-[#C8A97E] transition-colors mb-2"
                >
                  <Image className="w-6 h-6 text-[#555] mb-1" />
                  <p className="text-xs text-[#666]">Add thumbnail</p>
                </div>
              )}
              <input ref={thumbnailInputRef} type="file" accept="image/*" onChange={handleThumbnailSelect} className="hidden" />
            </div>

            <div>
              <label className="block text-xs text-[#888] mb-1">Description</label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Add a description..."
                rows={3}
                className="w-full bg-[#0D0D10] border border-[#2A2A2E] rounded-lg px-3 py-2 text-sm text-[#E8E8E8] placeholder-[#555] focus:outline-none focus:border-[#C8A97E] resize-none"
              />
            </div>

            <div>
              <label className="block text-xs text-[#888] mb-2">Tags</label>
              <div className="flex flex-wrap gap-1 mb-2">
                {tags.map(tag => (
                  <span key={tag} className="inline-flex items-center gap-1 px-2 py-0.5 bg-[#C8A97E]/20 text-[#C8A97E] text-xs rounded-full">
                    {tag}
                    <button onClick={() => setTags(tags.filter(t => t !== tag))} className="hover:text-red-400">
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                ))}
              </div>
              <div className="flex gap-2">
                <Input
                  value={tagInput}
                  onChange={(e) => setTagInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addTag())}
                  placeholder="Add tag..."
                  className="text-xs"
                />
                <Btn onClick={addTag} size="sm" variant="ghost" disabled={!tagInput.trim()}>
                  <Plus className="w-3 h-3" />
                </Btn>
              </div>
            </div>

            <div>
              <label className="block text-xs text-[#888] mb-2">Status</label>
              <div className="space-y-2">
                <label className="flex items-center gap-2 p-2 rounded-lg border border-[#2A2A2E] cursor-pointer hover:border-[#C8A97E]/50">
                  <input
                    type="radio"
                    checked={status === 'draft'}
                    onChange={() => setStatus('draft')}
                    className="w-4 h-4 text-[#C8A97E]"
                  />
                  <div>
                    <p className="text-sm text-[#E8E8E8]">Draft</p>
                    <p className="text-xs text-[#666]">Only visible to you</p>
                  </div>
                </label>
                <label className="flex items-center gap-2 p-2 rounded-lg border border-[#2A2A2E] cursor-pointer hover:border-[#C8A97E]/50">
                  <input
                    type="radio"
                    checked={status === 'published'}
                    onChange={() => setStatus('published')}
                    className="w-4 h-4 text-[#C8A97E]"
                  />
                  <div>
                    <p className="text-sm text-[#E8E8E8]">Published</p>
                    <p className="text-xs text-[#666]">Visible to others</p>
                  </div>
                </label>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
