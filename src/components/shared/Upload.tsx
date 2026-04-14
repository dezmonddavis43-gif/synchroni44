import { useState, useRef } from 'react'
import { supabase } from '../../lib/supabase'
import { Card, Btn, Input, Select, PageTitle, Spinner, Textarea } from './UI'
import { MOODS, GENRES, MOOD_COLORS } from '../../lib/constants'
import { Upload as UploadIcon, X, Music2, Check, AlertCircle, Image } from 'lucide-react'
import type { Profile } from '../../lib/types'
import { validateUploadFile } from '../../lib/businessRules'
import { getAudioDurationMsFromFile } from '../../lib/trackDuration'

interface UploadProps {
  profile: Profile
}

interface UploadFile {
  file: File
  id: string
  title: string
  artist: string
  mood: string
  genre: string
  sub_genre: string
  bpm: string
  key: string
  notes: string
  status: 'pending' | 'uploading' | 'success' | 'error'
  progress: number
  error?: string
  coverArt?: File
  coverArtPreview?: string
}

const MOOD_OPTIONS = MOODS.filter(m => m !== 'All')

function parseBpmForDb(raw: string): number | null {
  const n = parseInt(raw, 10)
  if (!Number.isFinite(n)) return null
  if (n < 1 || n > 260) return null
  return n
}

function uploadQueueLabel(count: number): string {
  if (count === 1) return 'Upload 1 track'
  return `Upload ${count} tracks`
}

export function Upload({ profile }: UploadProps) {
  const [files, setFiles] = useState<UploadFile[]>([])
  const [sharedArtist, setSharedArtist] = useState('')
  const [sharedMood, setSharedMood] = useState('')
  const [sharedGenre, setSharedGenre] = useState('')
  const [uploading, setUploading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const coverArtInputRef = useRef<HTMLInputElement>(null)
  const [activeFileId, setActiveFileId] = useState<string | null>(null)

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = Array.from(e.target.files || [])
    const validFiles = selectedFiles.filter(file => {
      const validation = validateUploadFile({ type: file.type, size: file.size })
      if (!validation.valid) {
        alert(`${file.name}: ${validation.reason}`)
      }
      return validation.valid
    })
    const newFiles: UploadFile[] = validFiles.map(file => ({
      file,
      id: crypto.randomUUID(),
      title: '',
      artist: sharedArtist || profile.full_name,
      mood: sharedMood,
      genre: sharedGenre,
      sub_genre: '',
      bpm: '',
      key: '',
      notes: '',
      status: 'pending',
      progress: 0,
    }))
    setFiles(prev => [...prev, ...newFiles])
  }

  const handleCoverArtSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!activeFileId || !e.target.files?.[0]) return
    const file = e.target.files[0]
    const preview = URL.createObjectURL(file)
    updateFile(activeFileId, { coverArt: file, coverArtPreview: preview })
  }

  const removeFile = (id: string) => {
    const file = files.find(f => f.id === id)
    if (file?.coverArtPreview) {
      URL.revokeObjectURL(file.coverArtPreview)
    }
    setFiles(files.filter(f => f.id !== id))
  }

  const removeCoverArt = (id: string) => {
    const file = files.find(f => f.id === id)
    if (file?.coverArtPreview) {
      URL.revokeObjectURL(file.coverArtPreview)
    }
    updateFile(id, { coverArt: undefined, coverArtPreview: undefined })
  }

  const updateFile = (id: string, updates: Partial<UploadFile>) => {
    setFiles(files.map(f => f.id === id ? { ...f, ...updates } : f))
  }

  const applySharedMetadata = () => {
    setFiles(files.map(f => ({
      ...f,
      artist: sharedArtist || f.artist,
      mood: sharedMood || f.mood,
      genre: sharedGenre || f.genre,
    })))
  }

  const uploadFiles = async () => {
    if (files.length === 0) return
    setUploading(true)

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      alert('You must be logged in to upload tracks')
      setUploading(false)
      return
    }

    const userId = user.id

    for (const uploadFile of files) {
      try {
        const titleTrim = uploadFile.title.trim()
        if (!titleTrim) {
          updateFile(uploadFile.id, {
            status: 'error',
            error: 'Title is required for each track (do not rely on the file name).',
          })
          continue
        }

        updateFile(uploadFile.id, { status: 'uploading', progress: 0 })

        const safeName = uploadFile.file.name.replace(/[#\s]/g, '_')
        const basePrefix = `${Date.now()}_${uploadFile.id}`
        const audioPath = `${userId}/${basePrefix}_${safeName}`

        const { error: uploadError } = await supabase.storage
          .from('audio-tracks')
          .upload(audioPath, uploadFile.file, { upsert: true })

        if (uploadError) {
          throw new Error(`Storage upload failed: ${uploadError.message}`)
        }

        updateFile(uploadFile.id, { progress: 50 })

        const durationMs = await getAudioDurationMsFromFile(uploadFile.file)

        let coverArtUrl: string | null = null
        if (uploadFile.coverArt) {
          const coverSafe = uploadFile.coverArt.name.replace(/[#\s]/g, '_')
          const coverPath = `${userId}/${basePrefix}_cover_${coverSafe}`
          const { error: coverUploadError } = await supabase.storage
            .from('audio-tracks')
            .upload(coverPath, uploadFile.coverArt, { upsert: true })

          if (!coverUploadError) {
            const { data: coverUrlData } = supabase.storage
              .from('audio-tracks')
              .getPublicUrl(coverPath)
            coverArtUrl = coverUrlData.publicUrl
          }
        }

        updateFile(uploadFile.id, { progress: 80 })

        const { data: urlData } = supabase.storage
          .from('audio-tracks')
          .getPublicUrl(audioPath)

        const notesTrim = uploadFile.notes.trim()
        const subTrim = uploadFile.sub_genre.trim()
        const keyTrim = uploadFile.key.trim()
        const trackData: Record<string, unknown> = {
          title: titleTrim,
          artist: uploadFile.artist.trim() || profile.full_name || 'Unknown',
          mood: uploadFile.mood || null,
          genre: uploadFile.genre || null,
          sub_genre: subTrim || null,
          bpm: parseBpmForDb(uploadFile.bpm),
          key: keyTrim || null,
          musical_key: keyTrim || null,
          tags: [] as string[],
          audio_url: urlData.publicUrl,
          cover_art_url: coverArtUrl,
          uploaded_by: userId,
          label_id: profile.role === 'label' ? userId : null,
          status: 'active',
          artwork_color: (uploadFile.mood && MOOD_COLORS[uploadFile.mood]) || '#C8A97E',
          ...(durationMs != null ? { duration_ms: durationMs } : {}),
        }
        if (notesTrim) {
          trackData.notes = notesTrim
        }

        const { error: insertError } = await supabase.from('tracks').insert(trackData)

        if (insertError) {
          const detail = [insertError.message, insertError.details, insertError.hint].filter(Boolean).join(' — ')
          throw new Error(detail ? `Database insert failed: ${detail}` : `Database insert failed: ${insertError.message}`)
        }

        updateFile(uploadFile.id, { status: 'success', progress: 100 })
      } catch (err) {
        updateFile(uploadFile.id, {
          status: 'error',
          error: err instanceof Error ? err.message : 'Upload failed'
        })
      }
    }

    setUploading(false)
  }

  const uploadingFile = files.find(f => f.status === 'uploading')

  return (
    <div className="p-4 md:p-6 h-[calc(100vh-76px)] md:h-[calc(100vh-76px)] overflow-y-auto pb-40 md:pb-6">
      <PageTitle title="Upload Tracks" sub="Add audio, core metadata, and optional cover art or notes — keep it simple." />

      <div className="space-y-6">
        <input ref={coverArtInputRef} type="file" accept="image/*" onChange={handleCoverArtSelect} className="hidden" />

        <Card className="p-4 md:p-6">
          <p className="text-sm text-[#888] mb-4">
            Select one or more files, set optional defaults, then fill each row. Cover art and notes are optional.
          </p>
          <div
            onClick={() => fileInputRef.current?.click()}
            onDragOver={e => { e.preventDefault(); e.stopPropagation() }}
            onDrop={e => {
              e.preventDefault()
              e.stopPropagation()
              const dropped = Array.from(e.dataTransfer.files || []).filter(f => f.type.startsWith('audio/'))
              if (dropped.length) {
                const synthetic = { target: { files: e.dataTransfer.files } } as unknown as React.ChangeEvent<HTMLInputElement>
                handleFileSelect(synthetic)
              }
            }}
            className="border-2 border-dashed border-[#2A2A2E] rounded-xl p-8 md:p-12 text-center cursor-pointer hover:border-[#C8A97E] transition-colors"
          >
            <UploadIcon className="w-12 h-12 text-[#555] mx-auto mb-4" />
            <p className="text-[#E8E8E8] font-medium mb-2">
              Click or drag to upload one or more audio files
            </p>
            <p className="text-sm text-[#666]">
              MP3, WAV, AIFF, FLAC, M4A — multi-select supported
            </p>
            <input
              ref={fileInputRef}
              type="file"
              accept="audio/*"
              multiple
              onChange={handleFileSelect}
              className="hidden"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6 pt-6 border-t border-[#1E1E22]">
            <Input
              label="Default artist"
              value={sharedArtist}
              onChange={e => setSharedArtist(e.target.value)}
              placeholder={profile.full_name}
            />
            <Select
              label="Default mood"
              value={sharedMood}
              onChange={e => setSharedMood(e.target.value)}
            >
              <option value="">Select mood</option>
              {MOOD_OPTIONS.map(mood => (
                <option key={mood} value={mood}>{mood}</option>
              ))}
            </Select>
            <Select
              label="Default genre"
              value={sharedGenre}
              onChange={e => setSharedGenre(e.target.value)}
            >
              <option value="">Select genre</option>
              {GENRES.filter(g => g !== 'All').map(genre => (
                <option key={genre} value={genre}>{genre}</option>
              ))}
            </Select>
          </div>

          {files.length > 0 && (
            <div className="mt-6 space-y-2">
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm text-[#888]">{files.length} file{files.length !== 1 ? 's' : ''} queued</p>
                <Btn size="sm" variant="ghost" onClick={applySharedMetadata}>
                  Apply defaults to all
                </Btn>
              </div>
              {files.map(file => (
                <div key={file.id} className="flex items-center gap-3 p-3 bg-[#0A0A0C] rounded-lg">
                  <Music2 className="w-5 h-5 text-[#C8A97E] flex-shrink-0" />
                  <span className="flex-1 text-sm text-[#E8E8E8] truncate">{file.file.name}</span>
                  <span className="text-xs text-[#555] hidden md:block">
                    {(file.file.size / 1024 / 1024).toFixed(1)} MB
                  </span>
                  <button type="button" onClick={() => removeFile(file.id)} className="text-[#666] hover:text-red-400 flex-shrink-0">
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </Card>

        {files.map((file, index) => (
          <Card key={file.id} className="p-4">
            <div className="flex items-center gap-2 mb-4">
              <span className="text-sm text-[#666]">Track {index + 1}</span>
              <span className="flex-1 text-sm text-[#888] truncate">{file.file.name}</span>
            </div>

            <div className="flex gap-4 mb-4">
              <div className="flex-shrink-0">
                {file.coverArtPreview ? (
                  <div className="relative w-24 h-24 rounded-lg overflow-hidden group">
                    <img src={file.coverArtPreview} alt="" className="w-full h-full object-cover" />
                    <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                      <button
                        type="button"
                        onClick={() => removeCoverArt(file.id)}
                        className="p-1.5 bg-red-500/80 rounded-full text-white hover:bg-red-500"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => { setActiveFileId(file.id); coverArtInputRef.current?.click() }}
                    className="w-24 h-24 rounded-lg border-2 border-dashed border-[#2A2A2E] flex flex-col items-center justify-center text-[#555] hover:border-[#C8A97E] hover:text-[#C8A97E] transition-colors"
                  >
                    <Image className="w-6 h-6 mb-1" />
                    <span className="text-xs">Cover</span>
                  </button>
                )}
              </div>
              <div className="flex-1 grid grid-cols-2 gap-4">
                <Input
                  label="Title"
                  value={file.title}
                  onChange={e => updateFile(file.id, { title: e.target.value })}
                  placeholder="Track title (required)"
                />
                <Input
                  label="Artist"
                  value={file.artist}
                  onChange={e => updateFile(file.id, { artist: e.target.value })}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
              <Select
                label="Mood"
                value={file.mood}
                onChange={e => updateFile(file.id, { mood: e.target.value })}
              >
                <option value="">Select mood</option>
                {MOOD_OPTIONS.map(mood => (
                  <option key={mood} value={mood}>{mood}</option>
                ))}
              </Select>
              <Select
                label="Genre"
                value={file.genre}
                onChange={e => updateFile(file.id, { genre: e.target.value })}
              >
                <option value="">Select genre</option>
                {GENRES.filter(g => g !== 'All').map(genre => (
                  <option key={genre} value={genre}>{genre}</option>
                ))}
              </Select>
              <Input
                label="Sub-genre (optional)"
                value={file.sub_genre}
                onChange={e => updateFile(file.id, { sub_genre: e.target.value })}
                placeholder="e.g. Dark pop, Trap soul"
              />
              <Input
                label="BPM"
                type="number"
                value={file.bpm}
                onChange={e => updateFile(file.id, { bpm: e.target.value })}
                placeholder="120"
              />
              <div className="md:col-span-2">
                <Input
                  label="Key"
                  value={file.key}
                  onChange={e => updateFile(file.id, { key: e.target.value })}
                  placeholder="C Major"
                />
              </div>
            </div>

            <div className="mt-4">
              <Textarea
                label="Notes (optional)"
                value={file.notes}
                onChange={e => updateFile(file.id, { notes: e.target.value })}
                placeholder="Internal notes — not shown on the public catalog card"
                rows={3}
                className="bg-[#0D0D10] border border-[#2A2A2E] rounded-lg"
              />
            </div>
          </Card>
        ))}

        {files.length > 0 && (
          <Card className="p-4 md:p-6">
            <h3 className="text-lg font-medium text-[#E8E8E8] mb-4">Upload queue</h3>

            {uploadingFile && (
              <div className="mb-4 p-3 bg-[#C8A97E]/10 rounded-lg">
                <p className="text-sm text-[#C8A97E] mb-2">
                  Uploading…
                </p>
                <div className="h-2 bg-[#1A1A1E] rounded-full overflow-hidden">
                  <div
                    className="h-full bg-[#C8A97E] transition-all duration-300"
                    style={{ width: `${uploadingFile.progress}%` }}
                  />
                </div>
              </div>
            )}

            <div className="space-y-2">
              {files.map(f => (
                <div key={f.id} className="flex items-center gap-3 p-3 bg-[#0A0A0C] rounded-lg">
                  {f.status === 'pending' && <Music2 className="w-5 h-5 text-[#555]" />}
                  {f.status === 'uploading' && <Spinner />}
                  {f.status === 'success' && <Check className="w-5 h-5 text-[#4DFFB4]" />}
                  {f.status === 'error' && <AlertCircle className="w-5 h-5 text-[#FF4D4D]" />}

                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-[#E8E8E8] truncate">{f.title}</p>
                    <p className="text-xs text-[#666]">{f.artist}</p>
                  </div>

                  {f.status === 'uploading' && (
                    <span className="text-xs text-[#C8A97E]">{f.progress}%</span>
                  )}
                  {f.status === 'success' && (
                    <span className="text-xs text-[#4DFFB4]">Uploaded</span>
                  )}
                  {f.status === 'error' && (
                    <span className="max-w-[min(100%,320px)] text-xs text-[#FF4D4D] break-words text-right" title={f.error}>{f.error}</span>
                  )}
                </div>
              ))}
            </div>
          </Card>
        )}

        {files.length > 0 && (
          <div className="flex gap-2 justify-end">
            <Btn onClick={uploadFiles} disabled={uploading}>
              {uploading ? (
                <>
                  <Spinner /> Uploading…
                </>
              ) : (
                <>
                  <UploadIcon className="w-4 h-4" /> {uploadQueueLabel(files.length)}
                </>
              )}
            </Btn>
          </div>
        )}
      </div>
    </div>
  )
}
