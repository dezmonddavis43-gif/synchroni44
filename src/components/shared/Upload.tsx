import { useState, useRef } from 'react'
import { supabase } from '../../lib/supabase'
import { Card, Btn, Input, Select, PageTitle, Spinner } from './UI'
import { MOODS, GENRES } from '../../lib/constants'
import { Upload as UploadIcon, X, Music2, Check, AlertCircle, Sparkles, FileAudio, Layers, Mic2, Image, ChevronDown, Plus } from 'lucide-react'
import type { Profile } from '../../lib/types'
import { validateUploadFile } from '../../lib/businessRules'

const TAG_CATEGORIES: Record<string, string[]> = {
  'Scene Types': ['chase', 'romance', 'montage', 'opening credits', 'climax', 'flashback', 'training', 'celebration', 'funeral', 'road trip', 'heist', 'battle'],
  'Emotions': ['triumphant', 'melancholic', 'tense', 'euphoric', 'nostalgic', 'mysterious', 'hopeful', 'heartbroken', 'determined', 'peaceful'],
  'Settings': ['urban', 'nature', 'nightclub', 'office', 'beach', 'space', 'forest', 'stadium', 'home', 'street'],
  'Production': ['cinematic', 'lo-fi', 'anthemic', 'minimalist', 'orchestral', 'trap', 'acoustic', 'electronic', 'soulful', 'experimental'],
  'Usage': ['TV drama', 'TV comedy', 'film', 'advertising', 'trailer', 'gaming', 'documentary', 'social media']
}

interface UploadProps {
  profile: Profile
}

interface AdditionalFile {
  file: File
  type: 'instrumental' | 'acapella' | 'stem'
  label: string
}

interface CoWriter {
  name: string
  split: number
}

interface UploadFile {
  file: File
  id: string
  title: string
  artist: string
  mood: string
  genre: string
  bpm: string
  key: string
  tags: string
  status: 'pending' | 'uploading' | 'success' | 'error'
  progress: number
  error?: string
  aiSuggesting?: boolean
  aiSuggestion?: AISuggestion
  coverArt?: File
  coverArtPreview?: string
  instrumental?: AdditionalFile
  acapella?: AdditionalFile
  stems: AdditionalFile[]
  microFeeMin: string
  microFeeMax: string
  oneStopFee: string
  clearanceStatus: 'CLEAR' | 'PRO' | 'PENDING' | ''
  proAffiliation: string
  publisher: string
  coWriters: CoWriter[]
}

interface AISuggestion {
  genre: string
  mood: string
  bpm_range: string
  key: string
  tags: string[]
  clearance: string
  fee_suggested: number
  fee_range: string
  sync_potential: string
  sync_note: string
}

export function Upload({ profile }: UploadProps) {
  const [step, setStep] = useState(1)
  const [files, setFiles] = useState<UploadFile[]>([])
  const [sharedArtist, setSharedArtist] = useState('')
  const [sharedMood, setSharedMood] = useState('')
  const [sharedGenre, setSharedGenre] = useState('')
  const [uploading, setUploading] = useState(false)
  const [rightsConfirmed, setRightsConfirmed] = useState(false)
  const [expandedFile, setExpandedFile] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const coverArtInputRef = useRef<HTMLInputElement>(null)
  const instrumentalInputRef = useRef<HTMLInputElement>(null)
  const acapellaInputRef = useRef<HTMLInputElement>(null)
  const stemInputRef = useRef<HTMLInputElement>(null)
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
      title: file.name.replace(/\.[^/.]+$/, ''),
      artist: sharedArtist || profile.full_name,
      mood: sharedMood,
      genre: sharedGenre,
      bpm: '',
      key: '',
      tags: '',
      status: 'pending',
      progress: 0,
      stems: [],
      microFeeMin: '29',
      microFeeMax: '149',
      oneStopFee: '',
      clearanceStatus: '',
      proAffiliation: '',
      publisher: '',
      coWriters: []
    }))
    setFiles([...files, ...newFiles])
  }

  const handleCoverArtSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!activeFileId || !e.target.files?.[0]) return
    const file = e.target.files[0]
    const preview = URL.createObjectURL(file)
    updateFile(activeFileId, { coverArt: file, coverArtPreview: preview })
  }

  const handleInstrumentalSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!activeFileId || !e.target.files?.[0]) return
    const file = e.target.files[0]
    updateFile(activeFileId, {
      instrumental: { file, type: 'instrumental', label: 'Instrumental' }
    })
  }

  const handleAcapellaSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!activeFileId || !e.target.files?.[0]) return
    const file = e.target.files[0]
    updateFile(activeFileId, {
      acapella: { file, type: 'acapella', label: 'Acapella' }
    })
  }

  const handleStemSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!activeFileId || !e.target.files) return
    const currentFile = files.find(f => f.id === activeFileId)
    if (!currentFile) return

    const newStems: AdditionalFile[] = Array.from(e.target.files).map(file => ({
      file,
      type: 'stem',
      label: file.name.replace(/\.[^/.]+$/, '')
    }))

    updateFile(activeFileId, {
      stems: [...currentFile.stems, ...newStems]
    })
  }

  const removeStem = (fileId: string, stemIndex: number) => {
    const file = files.find(f => f.id === fileId)
    if (!file) return
    const newStems = file.stems.filter((_, i) => i !== stemIndex)
    updateFile(fileId, { stems: newStems })
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
      genre: sharedGenre || f.genre
    })))
  }

  const suggestMetadata = async (fileId: string) => {
    const file = files.find(f => f.id === fileId)
    if (!file) return

    const anthropicKey = import.meta.env.VITE_ANTHROPIC_API_KEY
    if (!anthropicKey) {
      alert('AI metadata suggestions are disabled. Set VITE_ANTHROPIC_API_KEY to enable this feature.')
      return
    }

    updateFile(fileId, { aiSuggesting: true })

    const systemPrompt = `You are a music metadata specialist for sync licensing. Given a track title and artist name, suggest the most likely and sync-relevant metadata. Think about what a music supervisor would search for.

For tags, think like a music supervisor searching for tracks: use scene types (chase, romance, montage), emotions (triumphant, melancholic, tense), settings (urban, nature, nightclub), and production descriptors (cinematic, lo-fi, anthemic).

For fee range, use these benchmarks:
- Indie/unknown artist: $300-800
- Mid-level artist: $800-2500
- Established/PRO artist: $2500-10000
- Cinematic/orchestral: $2000-15000`

    try {
      const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': anthropicKey,
          'anthropic-version': '2023-06-01'
        },
        body: JSON.stringify({
          model: 'claude-sonnet-4-20250514',
          max_tokens: 1024,
          system: systemPrompt,
          messages: [{
            role: 'user',
            content: `Suggest metadata for this track:

Title: ${file.title}
Artist: ${file.artist}
${file.mood ? `Current Mood: ${file.mood}` : ''}
${file.genre ? `Current Genre: ${file.genre}` : ''}

Return ONLY valid JSON:
{
  "genre": "suggested genre",
  "mood": "suggested mood from: Tense/Hopeful/Melancholic/Sensual/Aggressive/Peaceful/Suspenseful/Nostalgic",
  "bpm_range": "estimated BPM range e.g. 90-110",
  "key": "estimated key if determinable",
  "tags": ["tag1", "tag2", "tag3", "tag4", "tag5", "tag6", "tag7", "tag8", "tag9", "tag10"],
  "clearance": "CLEAR or PRO or PENDING with reason",
  "fee_suggested": 1200,
  "fee_range": "$800 - $2,500",
  "sync_potential": "High/Medium/Low",
  "sync_note": "Brief note on sync potential and best use cases"
}`
          }]
        })
      })

      if (response.ok) {
        const data = await response.json()
        const content = data.content[0]?.text || '{}'
        const parsed = JSON.parse(content) as AISuggestion
        updateFile(fileId, { aiSuggesting: false, aiSuggestion: parsed })
      } else {
        updateFile(fileId, { aiSuggesting: false })
      }
    } catch (error) {
      console.error('AI suggestion failed:', error)
      updateFile(fileId, { aiSuggesting: false })
    }
  }

  const applySuggestion = (fileId: string, field: keyof AISuggestion) => {
    const file = files.find(f => f.id === fileId)
    if (!file?.aiSuggestion) return

    const suggestion = file.aiSuggestion
    const updates: Partial<UploadFile> = {}

    if (field === 'genre' && GENRES.includes(suggestion.genre)) {
      updates.genre = suggestion.genre
    } else if (field === 'mood' && MOODS.includes(suggestion.mood)) {
      updates.mood = suggestion.mood
    } else if (field === 'bpm_range') {
      const match = suggestion.bpm_range.match(/\d+/)
      if (match) updates.bpm = match[0]
    } else if (field === 'key') {
      updates.key = suggestion.key
    } else if (field === 'tags') {
      updates.tags = suggestion.tags.join(', ')
    }

    updateFile(fileId, updates)
  }

  const applyAllSuggestions = (fileId: string) => {
    const file = files.find(f => f.id === fileId)
    if (!file?.aiSuggestion) return

    const suggestion = file.aiSuggestion
    const updates: Partial<UploadFile> = {}

    if (GENRES.includes(suggestion.genre)) updates.genre = suggestion.genre
    if (MOODS.includes(suggestion.mood)) updates.mood = suggestion.mood
    const bpmMatch = suggestion.bpm_range.match(/\d+/)
    if (bpmMatch) updates.bpm = bpmMatch[0]
    updates.key = suggestion.key
    updates.tags = suggestion.tags.join(', ')

    updateFile(fileId, updates)
  }

  const uploadAdditionalFile = async (additionalFile: AdditionalFile, baseFileName: string): Promise<string | null> => {
    try {
      const fileExt = additionalFile.file.name.split('.').pop()
      const fileName = `${baseFileName}_${additionalFile.type}_${crypto.randomUUID().slice(0, 8)}.${fileExt}`

      const { error: uploadError } = await supabase.storage
        .from('audio-tracks')
        .upload(fileName, additionalFile.file)

      if (uploadError) throw uploadError

      const { data: urlData } = supabase.storage
        .from('audio-tracks')
        .getPublicUrl(fileName)

      return urlData.publicUrl
    } catch (error) {
      console.error('Additional file upload failed:', error)
      return null
    }
  }

  const uploadFiles = async () => {
    if (!rightsConfirmed) return
    setUploading(true)

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      alert('You must be logged in to upload tracks')
      setUploading(false)
      return
    }

    const userId = user.id
    console.log('Starting upload with authenticated user ID:', userId)
    console.log('Profile ID for reference:', profile.id)

    for (const uploadFile of files) {
      try {
        updateFile(uploadFile.id, { status: 'uploading', progress: 0 })

        const fileExt = uploadFile.file.name.split('.').pop()
        const basePath = `${userId}/${uploadFile.id}`
        const fileName = `${basePath}.${fileExt}`

        console.log('Uploading to storage:', fileName)
        console.log('Current authenticated user:', userId)

        const { data: storageData, error: uploadError } = await supabase.storage
          .from('audio-tracks')
          .upload(fileName, uploadFile.file)

        if (uploadError) {
          console.error('Storage error:', uploadError)
          throw new Error(`Storage upload failed: ${uploadError.message}`)
        }

        console.log('Storage upload success:', storageData)
        updateFile(uploadFile.id, { progress: 50 })

        updateFile(uploadFile.id, { progress: 55 })

        let coverArtUrl: string | null = null
        if (uploadFile.coverArt) {
          const imgExt = uploadFile.coverArt.name.split('.').pop()
          const coverBasePath = `${userId}/${uploadFile.id}`
          const coverFileName = `${coverBasePath}_cover.${imgExt}`
          const { error: coverUploadError } = await supabase.storage
            .from('audio-tracks')
            .upload(coverFileName, uploadFile.coverArt)

          if (!coverUploadError) {
            const { data: coverUrlData } = supabase.storage
              .from('audio-tracks')
              .getPublicUrl(coverFileName)
            coverArtUrl = coverUrlData.publicUrl
          }
        }

        updateFile(uploadFile.id, { progress: 60 })

        let instrumentalUrl: string | null = null
        let acapellaUrl: string | null = null
        const stemUrls: string[] = []

        if (uploadFile.instrumental) {
          instrumentalUrl = await uploadAdditionalFile(uploadFile.instrumental, basePath)
        }

        updateFile(uploadFile.id, { progress: 70 })

        if (uploadFile.acapella) {
          acapellaUrl = await uploadAdditionalFile(uploadFile.acapella, basePath)
        }

        updateFile(uploadFile.id, { progress: 80 })

        for (const stem of uploadFile.stems) {
          const stemUrl = await uploadAdditionalFile(stem, basePath)
          if (stemUrl) stemUrls.push(stemUrl)
        }

        updateFile(uploadFile.id, { progress: 90 })

        const { data: urlData } = supabase.storage
          .from('audio-tracks')
          .getPublicUrl(fileName)

        console.log('Inserting track with uploaded_by:', userId)

        const trackData = {
          title: uploadFile.title,
          artist: uploadFile.artist,
          mood: uploadFile.mood || null,
          genre: uploadFile.genre || null,
          bpm: uploadFile.bpm ? parseInt(uploadFile.bpm) : null,
          key: uploadFile.key || null,
          tags: uploadFile.tags ? uploadFile.tags.split(',').map(t => t.trim()) : [],
          audio_url: urlData.publicUrl,
          cover_art_url: coverArtUrl,
          instrumental_url: instrumentalUrl,
          acapella_url: acapellaUrl,
          stems_urls: stemUrls.length > 0 ? stemUrls : null,
          uploaded_by: userId,
          label_id: profile.role === 'label' ? userId : null,
          status: 'review',
          clearance_status: uploadFile.clearanceStatus || 'PENDING',
          micro_fee_min: uploadFile.microFeeMin ? parseInt(uploadFile.microFeeMin) : 29,
          micro_fee_max: uploadFile.microFeeMax ? parseInt(uploadFile.microFeeMax) : 149,
          one_stop_fee: uploadFile.oneStopFee ? parseInt(uploadFile.oneStopFee) : null,
          pro_affiliation: uploadFile.proAffiliation || null,
          publisher: uploadFile.publisher || null,
          co_writers: uploadFile.coWriters.length > 0 ? uploadFile.coWriters : null,
          writers: uploadFile.coWriters.filter(w => w.name.trim()).map(w => w.name.trim()),
          vocal_type: uploadFile.instrumental ? 'instrumental' : 'vocal',
          one_stop: Boolean(uploadFile.oneStopFee),
          easy_clear: (uploadFile.clearanceStatus || 'PENDING') === 'CLEAR',
          pro_info: uploadFile.proAffiliation || null,
          publishing_info: uploadFile.publisher || null
        }

        console.log('Track data to insert:', trackData)

        const { error: insertError } = await supabase.from('tracks').insert(trackData)

        if (insertError) {
          console.error('Insert error:', insertError)
          throw new Error(`Database insert failed: ${insertError.message}`)
        }

        console.log('Track inserted successfully')

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

  const completedCount = files.filter(f => f.status === 'success').length
  const uploadingFile = files.find(f => f.status === 'uploading')

  const getAdditionalFilesCount = (file: UploadFile) => {
    let count = 0
    if (file.instrumental) count++
    if (file.acapella) count++
    count += file.stems.length
    return count
  }

  return (
    <div className="p-4 md:p-6 h-[calc(100vh-76px)] md:h-[calc(100vh-76px)] overflow-y-auto pb-40 md:pb-6">
      <PageTitle title="Upload Tracks" sub="Add new tracks to your catalog" />

      <div className="flex gap-2 mb-6 overflow-x-auto">
        {[1, 2, 3].map(s => (
          <button
            key={s}
            onClick={() => setStep(s)}
            disabled={s > 1 && files.length === 0}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors whitespace-nowrap ${
              step === s
                ? 'bg-[#C8A97E] text-[#0A0A0C]'
                : 'bg-[#1A1A1E] text-[#888] hover:text-[#E8E8E8]'
            } disabled:opacity-50 disabled:cursor-not-allowed`}
          >
            {s === 1 ? 'Select Files' : s === 2 ? 'Track Details' : 'Upload'}
          </button>
        ))}
      </div>

      <input ref={coverArtInputRef} type="file" accept="image/*" onChange={handleCoverArtSelect} className="hidden" />
      <input ref={instrumentalInputRef} type="file" accept="audio/*" onChange={handleInstrumentalSelect} className="hidden" />
      <input ref={acapellaInputRef} type="file" accept="audio/*" onChange={handleAcapellaSelect} className="hidden" />
      <input ref={stemInputRef} type="file" accept="audio/*" multiple onChange={handleStemSelect} className="hidden" />

      {step === 1 && (
        <div className="space-y-6">
          <Card className="p-4 md:p-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
              <Input
                label="Default Artist Name"
                value={sharedArtist}
                onChange={e => setSharedArtist(e.target.value)}
                placeholder={profile.full_name}
              />
              <Select
                label="Default Mood"
                value={sharedMood}
                onChange={e => setSharedMood(e.target.value)}
              >
                <option value="">Select mood</option>
                {MOODS.filter(m => m !== 'All').map(mood => (
                  <option key={mood} value={mood}>{mood}</option>
                ))}
              </Select>
              <Select
                label="Default Genre"
                value={sharedGenre}
                onChange={e => setSharedGenre(e.target.value)}
              >
                <option value="">Select genre</option>
                {GENRES.filter(g => g !== 'All').map(genre => (
                  <option key={genre} value={genre}>{genre}</option>
                ))}
              </Select>
            </div>

            <div
              onClick={() => fileInputRef.current?.click()}
              className="border-2 border-dashed border-[#2A2A2E] rounded-xl p-8 md:p-12 text-center cursor-pointer hover:border-[#C8A97E] transition-colors"
            >
              <UploadIcon className="w-12 h-12 text-[#555] mx-auto mb-4" />
              <p className="text-[#E8E8E8] font-medium mb-2">
                Click or drag to upload audio files
              </p>
              <p className="text-sm text-[#666]">
                Supports MP3, WAV, AIFF, FLAC
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

            {files.length > 0 && (
              <div className="mt-6 space-y-2">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-sm text-[#888]">{files.length} files selected</p>
                  <Btn size="sm" variant="ghost" onClick={applySharedMetadata}>
                    Apply Defaults
                  </Btn>
                </div>
                {files.map(file => (
                  <div key={file.id} className="flex items-center gap-3 p-3 bg-[#0A0A0C] rounded-lg">
                    <Music2 className="w-5 h-5 text-[#C8A97E] flex-shrink-0" />
                    <span className="flex-1 text-sm text-[#E8E8E8] truncate">{file.file.name}</span>
                    <span className="text-xs text-[#555] hidden md:block">
                      {(file.file.size / 1024 / 1024).toFixed(1)} MB
                    </span>
                    <button onClick={() => removeFile(file.id)} className="text-[#666] hover:text-red-400 flex-shrink-0">
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </Card>

          {files.length > 0 && (
            <Btn onClick={() => setStep(2)}>
              Continue to Details
            </Btn>
          )}
        </div>
      )}

      {step === 2 && (
        <div className="space-y-4">
          {files.map((file, index) => (
            <Card key={file.id} className="p-4">
              <div className="flex items-center gap-2 mb-4">
                <span className="text-sm text-[#666]">Track {index + 1}</span>
                <span className="flex-1 text-sm text-[#888] truncate">{file.file.name}</span>
                <Btn
                  size="sm"
                  variant="ghost"
                  onClick={() => suggestMetadata(file.id)}
                  disabled={file.aiSuggesting || !file.title.trim()}
                >
                  {file.aiSuggesting ? <Spinner /> : <><Sparkles className="w-3 h-3" /> AI Suggest</>}
                </Btn>
              </div>

              <div className="flex gap-4 mb-4">
                <div className="flex-shrink-0">
                  {file.coverArtPreview ? (
                    <div className="relative w-24 h-24 rounded-lg overflow-hidden group">
                      <img src={file.coverArtPreview} alt="Cover art" className="w-full h-full object-cover" />
                      <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                        <button
                          onClick={() => removeCoverArt(file.id)}
                          className="p-1.5 bg-red-500/80 rounded-full text-white hover:bg-red-500"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ) : (
                    <button
                      onClick={() => { setActiveFileId(file.id); coverArtInputRef.current?.click() }}
                      className="w-24 h-24 rounded-lg border-2 border-dashed border-[#2A2A2E] flex flex-col items-center justify-center text-[#555] hover:border-[#C8A97E] hover:text-[#C8A97E] transition-colors"
                    >
                      <Image className="w-6 h-6 mb-1" />
                      <span className="text-xs">Cover Art</span>
                    </button>
                  )}
                </div>
                <div className="flex-1 grid grid-cols-2 gap-4">
                  <Input
                    label="Title"
                    value={file.title}
                    onChange={e => updateFile(file.id, { title: e.target.value })}
                  />
                  <Input
                    label="Artist"
                    value={file.artist}
                    onChange={e => updateFile(file.id, { artist: e.target.value })}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div>
                  <Select
                    label="Mood"
                    value={file.mood}
                    onChange={e => updateFile(file.id, { mood: e.target.value })}
                  >
                    <option value="">Select mood</option>
                    {MOODS.filter(m => m !== 'All').map(mood => (
                      <option key={mood} value={mood}>{mood}</option>
                    ))}
                  </Select>
                  {file.aiSuggestion?.mood && file.mood !== file.aiSuggestion.mood && (
                    <button
                      onClick={() => applySuggestion(file.id, 'mood')}
                      className="text-xs text-[#C8A97E] hover:underline mt-1"
                    >
                      Suggested: {file.aiSuggestion.mood}
                    </button>
                  )}
                </div>
                <div>
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
                  {file.aiSuggestion?.genre && file.genre !== file.aiSuggestion.genre && (
                    <button
                      onClick={() => applySuggestion(file.id, 'genre')}
                      className="text-xs text-[#C8A97E] hover:underline mt-1"
                    >
                      Suggested: {file.aiSuggestion.genre}
                    </button>
                  )}
                </div>
                <div>
                  <Input
                    label="BPM"
                    type="number"
                    value={file.bpm}
                    onChange={e => updateFile(file.id, { bpm: e.target.value })}
                    placeholder="120"
                  />
                  {file.aiSuggestion?.bpm_range && (
                    <button
                      onClick={() => applySuggestion(file.id, 'bpm_range')}
                      className="text-xs text-[#C8A97E] hover:underline mt-1"
                    >
                      Suggested: {file.aiSuggestion.bpm_range}
                    </button>
                  )}
                </div>
                <div>
                  <Input
                    label="Key"
                    value={file.key}
                    onChange={e => updateFile(file.id, { key: e.target.value })}
                    placeholder="C Major"
                  />
                  {file.aiSuggestion?.key && file.key !== file.aiSuggestion.key && (
                    <button
                      onClick={() => applySuggestion(file.id, 'key')}
                      className="text-xs text-[#C8A97E] hover:underline mt-1"
                    >
                      Suggested: {file.aiSuggestion.key}
                    </button>
                  )}
                </div>
                <div className="col-span-2">
                  <SmartTagSelector
                    selectedTags={file.tags ? file.tags.split(',').map(t => t.trim()).filter(Boolean) : []}
                    onChange={(tags) => updateFile(file.id, { tags: tags.join(', ') })}
                    aiSuggestedTags={file.aiSuggestion?.tags}
                    onApplyAISuggestion={() => applySuggestion(file.id, 'tags')}
                  />
                </div>
              </div>

              <div className="mt-4 pt-4 border-t border-[#1E1E22]">
                <h4 className="text-sm font-medium text-[#E8E8E8] mb-3">License Fee Ranges</h4>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <Input
                    label="Micro Min ($)"
                    type="number"
                    value={file.microFeeMin}
                    onChange={e => updateFile(file.id, { microFeeMin: e.target.value })}
                    placeholder="29"
                  />
                  <Input
                    label="Micro Max ($)"
                    type="number"
                    value={file.microFeeMax}
                    onChange={e => updateFile(file.id, { microFeeMax: e.target.value })}
                    placeholder="149"
                  />
                  <div className="col-span-2">
                    <Input
                      label="One-Stop Fee ($)"
                      type="number"
                      value={file.oneStopFee}
                      onChange={e => updateFile(file.id, { oneStopFee: e.target.value })}
                      placeholder="2500"
                    />
                    {file.aiSuggestion?.fee_suggested && (
                      <p className="text-xs text-[#C8A97E] mt-1">
                        AI Suggested: {file.aiSuggestion.fee_range}
                      </p>
                    )}
                  </div>
                </div>
              </div>

              <div className="mt-4 pt-4 border-t border-[#1E1E22]">
                <h4 className="text-sm font-medium text-[#E8E8E8] mb-3">Rights Information</h4>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <Select
                    label="Clearance Status"
                    value={file.clearanceStatus}
                    onChange={e => updateFile(file.id, { clearanceStatus: e.target.value as typeof file.clearanceStatus })}
                  >
                    <option value="">Select status</option>
                    <option value="CLEAR">CLEAR - No samples or issues</option>
                    <option value="PRO">PRO - PRO registered</option>
                    <option value="PENDING">PENDING - Awaiting clearance</option>
                  </Select>
                  <Select
                    label="PRO Affiliation"
                    value={file.proAffiliation}
                    onChange={e => updateFile(file.id, { proAffiliation: e.target.value })}
                  >
                    <option value="">None</option>
                    <option value="ASCAP">ASCAP</option>
                    <option value="BMI">BMI</option>
                    <option value="SESAC">SESAC</option>
                    <option value="GMR">GMR</option>
                    <option value="PRS">PRS</option>
                    <option value="SOCAN">SOCAN</option>
                  </Select>
                  <div className="col-span-2">
                    <Input
                      label="Publisher (optional)"
                      value={file.publisher}
                      onChange={e => updateFile(file.id, { publisher: e.target.value })}
                      placeholder="Publisher name"
                    />
                  </div>
                </div>
                <div className="mt-4">
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-xs text-[#888]">Co-Writers</label>
                    <button
                      type="button"
                      onClick={() => updateFile(file.id, {
                        coWriters: [...file.coWriters, { name: '', split: 0 }]
                      })}
                      className="text-xs text-[#C8A97E] hover:underline"
                    >
                      + Add Co-Writer
                    </button>
                  </div>
                  {file.coWriters.length > 0 && (
                    <div className="space-y-2">
                      {file.coWriters.map((writer, writerIndex) => (
                        <div key={writerIndex} className="flex items-center gap-2">
                          <input
                            type="text"
                            value={writer.name}
                            onChange={e => {
                              const newWriters = [...file.coWriters]
                              newWriters[writerIndex] = { ...writer, name: e.target.value }
                              updateFile(file.id, { coWriters: newWriters })
                            }}
                            placeholder="Writer name"
                            className="flex-1 bg-[#0D0D10] border border-[#2A2A2E] rounded-lg px-3 py-2 text-sm text-[#E8E8E8] placeholder-[#555]"
                          />
                          <input
                            type="number"
                            value={writer.split || ''}
                            onChange={e => {
                              const newWriters = [...file.coWriters]
                              newWriters[writerIndex] = { ...writer, split: parseInt(e.target.value) || 0 }
                              updateFile(file.id, { coWriters: newWriters })
                            }}
                            placeholder="%"
                            className="w-20 bg-[#0D0D10] border border-[#2A2A2E] rounded-lg px-3 py-2 text-sm text-[#E8E8E8] placeholder-[#555]"
                          />
                          <button
                            onClick={() => {
                              const newWriters = file.coWriters.filter((_, i) => i !== writerIndex)
                              updateFile(file.id, { coWriters: newWriters })
                            }}
                            className="p-2 text-[#666] hover:text-red-400"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              <div className="mt-4 pt-4 border-t border-[#1E1E22]">
                <button
                  onClick={() => setExpandedFile(expandedFile === file.id ? null : file.id)}
                  className="flex items-center gap-2 text-sm text-[#888] hover:text-[#E8E8E8] transition-colors"
                >
                  <Layers className="w-4 h-4" />
                  Additional Files
                  {getAdditionalFilesCount(file) > 0 && (
                    <span className="px-1.5 py-0.5 bg-[#C8A97E]/20 text-[#C8A97E] text-xs rounded">
                      {getAdditionalFilesCount(file)}
                    </span>
                  )}
                </button>

                {expandedFile === file.id && (
                  <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="p-3 bg-[#0A0A0C] rounded-lg">
                      <div className="flex items-center gap-2 mb-2">
                        <FileAudio className="w-4 h-4 text-[#7B9CFF]" />
                        <span className="text-sm text-[#E8E8E8]">Instrumental</span>
                      </div>
                      {file.instrumental ? (
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-[#888] truncate flex-1">{file.instrumental.file.name}</span>
                          <button
                            onClick={() => updateFile(file.id, { instrumental: undefined })}
                            className="text-[#666] hover:text-red-400"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => { setActiveFileId(file.id); instrumentalInputRef.current?.click() }}
                          className="text-xs text-[#C8A97E] hover:underline"
                        >
                          + Add Instrumental
                        </button>
                      )}
                    </div>

                    <div className="p-3 bg-[#0A0A0C] rounded-lg">
                      <div className="flex items-center gap-2 mb-2">
                        <Mic2 className="w-4 h-4 text-[#FF6B9D]" />
                        <span className="text-sm text-[#E8E8E8]">Acapella</span>
                      </div>
                      {file.acapella ? (
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-[#888] truncate flex-1">{file.acapella.file.name}</span>
                          <button
                            onClick={() => updateFile(file.id, { acapella: undefined })}
                            className="text-[#666] hover:text-red-400"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => { setActiveFileId(file.id); acapellaInputRef.current?.click() }}
                          className="text-xs text-[#C8A97E] hover:underline"
                        >
                          + Add Acapella
                        </button>
                      )}
                    </div>

                    <div className="p-3 bg-[#0A0A0C] rounded-lg">
                      <div className="flex items-center gap-2 mb-2">
                        <Layers className="w-4 h-4 text-[#4DFFB4]" />
                        <span className="text-sm text-[#E8E8E8]">Stems</span>
                      </div>
                      {file.stems.length > 0 && (
                        <div className="space-y-1 mb-2">
                          {file.stems.map((stem, i) => (
                            <div key={i} className="flex items-center gap-2">
                              <span className="text-xs text-[#888] truncate flex-1">{stem.file.name}</span>
                              <button
                                onClick={() => removeStem(file.id, i)}
                                className="text-[#666] hover:text-red-400"
                              >
                                <X className="w-3 h-3" />
                              </button>
                            </div>
                          ))}
                        </div>
                      )}
                      <button
                        onClick={() => { setActiveFileId(file.id); stemInputRef.current?.click() }}
                        className="text-xs text-[#C8A97E] hover:underline"
                      >
                        + Add Stems
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {file.aiSuggestion && (
                <div className="mt-4 pt-4 border-t border-[#1E1E22]">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-sm text-[#888]">AI Analysis</span>
                    <Btn size="sm" variant="ghost" onClick={() => applyAllSuggestions(file.id)}>
                      Apply All
                    </Btn>
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                    <div>
                      <span className="text-[#666] text-xs">Sync Potential</span>
                      <p className={`font-medium ${
                        file.aiSuggestion.sync_potential === 'High' ? 'text-[#4DFFB4]' :
                        file.aiSuggestion.sync_potential === 'Medium' ? 'text-[#FFD700]' :
                        'text-[#888]'
                      }`}>
                        {file.aiSuggestion.sync_potential}
                      </p>
                    </div>
                    <div>
                      <span className="text-[#666] text-xs">Suggested Fee</span>
                      <p className="text-[#C8A97E] font-medium">{file.aiSuggestion.fee_range}</p>
                    </div>
                    <div>
                      <span className="text-[#666] text-xs">Clearance</span>
                      <p className="text-[#E8E8E8]">{file.aiSuggestion.clearance}</p>
                    </div>
                    <div className="col-span-2 md:col-span-1">
                      <span className="text-[#666] text-xs">Sync Note</span>
                      <p className="text-[#888] text-xs line-clamp-2">{file.aiSuggestion.sync_note}</p>
                    </div>
                  </div>
                </div>
              )}
            </Card>
          ))}

          <div className="flex gap-2">
            <Btn variant="ghost" onClick={() => setStep(1)}>Back</Btn>
            <Btn onClick={() => setStep(3)}>Continue to Upload</Btn>
          </div>
        </div>
      )}

      {step === 3 && (
        <div className="space-y-6">
          <Card className="p-4 md:p-6">
            <h3 className="text-lg font-medium text-[#E8E8E8] mb-4">Rights Confirmation</h3>

            <label className="flex items-start gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={rightsConfirmed}
                onChange={e => setRightsConfirmed(e.target.checked)}
                className="mt-1 w-5 h-5 rounded bg-[#1A1A1E] border-[#2A2A2E] text-[#C8A97E] focus:ring-[#C8A97E]"
              />
              <span className="text-sm text-[#888]">
                I confirm that I own or have the rights to distribute these tracks for sync licensing.
                I understand that tracks will be reviewed before becoming available on the platform.
              </span>
            </label>
          </Card>

          <Card className="p-4 md:p-6">
            <h3 className="text-lg font-medium text-[#E8E8E8] mb-4">Upload Queue</h3>

            {uploadingFile && (
              <div className="mb-4 p-3 bg-[#C8A97E]/10 rounded-lg">
                <p className="text-sm text-[#C8A97E] mb-2">
                  Uploading {completedCount + 1} of {files.length}...
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
              {files.map(file => (
                <div key={file.id} className="flex items-center gap-3 p-3 bg-[#0A0A0C] rounded-lg">
                  {file.status === 'pending' && <Music2 className="w-5 h-5 text-[#555]" />}
                  {file.status === 'uploading' && <Spinner />}
                  {file.status === 'success' && <Check className="w-5 h-5 text-[#4DFFB4]" />}
                  {file.status === 'error' && <AlertCircle className="w-5 h-5 text-[#FF4D4D]" />}

                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-[#E8E8E8] truncate">{file.title}</p>
                    <div className="flex items-center gap-2">
                      <p className="text-xs text-[#666]">{file.artist}</p>
                      {getAdditionalFilesCount(file) > 0 && (
                        <span className="text-xs text-[#888]">+{getAdditionalFilesCount(file)} files</span>
                      )}
                    </div>
                  </div>

                  {file.status === 'uploading' && (
                    <span className="text-xs text-[#C8A97E]">{file.progress}%</span>
                  )}
                  {file.status === 'success' && (
                    <span className="text-xs text-[#4DFFB4]">Uploaded</span>
                  )}
                  {file.status === 'error' && (
                    <span className="text-xs text-[#FF4D4D] truncate max-w-[100px]">{file.error}</span>
                  )}
                </div>
              ))}
            </div>
          </Card>

          <div className="flex gap-2">
            <Btn variant="ghost" onClick={() => setStep(2)} disabled={uploading}>Back</Btn>
            <Btn onClick={uploadFiles} disabled={!rightsConfirmed || uploading}>
              {uploading ? (
                <>
                  <Spinner /> Uploading...
                </>
              ) : (
                <>
                  <UploadIcon className="w-4 h-4" /> Upload {files.length} Tracks
                </>
              )}
            </Btn>
          </div>
        </div>
      )}
    </div>
  )
}

interface SmartTagSelectorProps {
  selectedTags: string[]
  onChange: (tags: string[]) => void
  aiSuggestedTags?: string[]
  onApplyAISuggestion?: () => void
}

function SmartTagSelector({ selectedTags, onChange, aiSuggestedTags, onApplyAISuggestion }: SmartTagSelectorProps) {
  const [customTag, setCustomTag] = useState('')
  const [expandedCategory, setExpandedCategory] = useState<string | null>(null)

  const toggleTag = (tag: string) => {
    if (selectedTags.length >= 15 && !selectedTags.includes(tag)) return
    if (selectedTags.includes(tag)) {
      onChange(selectedTags.filter(t => t !== tag))
    } else {
      onChange([...selectedTags, tag])
    }
  }

  const addCustomTag = () => {
    if (!customTag.trim() || selectedTags.length >= 15) return
    if (!selectedTags.includes(customTag.trim())) {
      onChange([...selectedTags, customTag.trim()])
    }
    setCustomTag('')
  }

  const applyAISuggestions = () => {
    if (!aiSuggestedTags) return
    const newTags = aiSuggestedTags.filter(t => !selectedTags.includes(t)).slice(0, 15 - selectedTags.length)
    onChange([...selectedTags, ...newTags])
    onApplyAISuggestion?.()
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <label className="text-xs text-[#888]">Tags ({selectedTags.length}/15)</label>
        {aiSuggestedTags && aiSuggestedTags.length > 0 && (
          <button
            onClick={applyAISuggestions}
            className="flex items-center gap-1 text-xs text-[#C8A97E] hover:underline"
          >
            <Sparkles className="w-3 h-3" /> Apply AI Suggestions
          </button>
        )}
      </div>

      {selectedTags.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mb-3 p-2 bg-[#0A0A0C] rounded-lg">
          {selectedTags.map(tag => (
            <span
              key={tag}
              className="inline-flex items-center gap-1 px-2 py-1 bg-[#C8A97E]/20 text-[#C8A97E] text-xs rounded-full"
            >
              {tag}
              <button onClick={() => toggleTag(tag)} className="hover:text-red-400">
                <X className="w-3 h-3" />
              </button>
            </span>
          ))}
        </div>
      )}

      <div className="space-y-2 max-h-[240px] overflow-y-auto border border-[#2A2A2E] rounded-lg p-3 bg-[#13131A]">
        {Object.entries(TAG_CATEGORIES).map(([category, tags]) => (
          <div key={category}>
            <button
              onClick={() => setExpandedCategory(expandedCategory === category ? null : category)}
              className="flex items-center justify-between w-full text-left text-xs font-medium text-[#888] hover:text-[#E8E8E8] py-1.5"
            >
              {category}
              <ChevronDown className={`w-3 h-3 transition-transform ${expandedCategory === category ? 'rotate-180' : ''}`} />
            </button>
            {expandedCategory === category && (
              <div className="flex flex-wrap gap-1.5 py-2">
                {tags.map(tag => {
                  const isSelected = selectedTags.includes(tag)
                  const isAISuggested = aiSuggestedTags?.includes(tag) && !isSelected
                  return (
                    <button
                      key={tag}
                      onClick={() => toggleTag(tag)}
                      disabled={selectedTags.length >= 15 && !isSelected}
                      className={`px-2 py-1 text-xs rounded-full transition-all ${
                        isSelected
                          ? 'bg-[#C8A97E] text-[#0A0A0C] font-medium'
                          : isAISuggested
                          ? 'bg-[#C8A97E]/10 text-[#C8A97E] border border-[#C8A97E]/30'
                          : 'bg-[#1A1A1E] text-[#888] hover:text-[#E8E8E8] border border-[#2A2A2E]'
                      } ${selectedTags.length >= 15 && !isSelected ? 'opacity-50 cursor-not-allowed' : ''}`}
                    >
                      {tag}
                    </button>
                  )
                })}
              </div>
            )}
          </div>
        ))}
      </div>

      <div className="flex gap-2 mt-3">
        <input
          type="text"
          value={customTag}
          onChange={e => setCustomTag(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && addCustomTag()}
          placeholder="Add custom tag..."
          className="flex-1 bg-[#1A1A1E] border border-[#2A2A2E] rounded-lg px-3 py-2 text-sm text-[#E8E8E8] placeholder-[#555] focus:outline-none focus:border-[#C8A97E]"
          disabled={selectedTags.length >= 15}
        />
        <button
          onClick={addCustomTag}
          disabled={!customTag.trim() || selectedTags.length >= 15}
          className="px-3 py-2 bg-[#1A1A1E] border border-[#2A2A2E] rounded-lg text-[#888] hover:text-[#C8A97E] hover:border-[#C8A97E] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          <Plus className="w-4 h-4" />
        </button>
      </div>
    </div>
  )
}
