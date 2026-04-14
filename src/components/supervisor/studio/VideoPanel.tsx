import { useRef, useState } from 'react'
import { Upload, Share2, Film } from 'lucide-react'
import { supabase } from '../../../lib/supabase'
import type { SceneStatus } from './types'
import { STATUS_COLORS } from './types'
import type { Profile } from '../../../lib/types'

interface VideoPanelProps {
  profile: Profile
  projectName: string
  sceneName: string
  status: SceneStatus
  videoUrl: string | null
  syncVideo: boolean
  videoRef: React.RefObject<HTMLVideoElement>
  onProjectNameChange: (v: string) => void
  onSceneNameChange: (v: string) => void
  onStatusChange: (s: SceneStatus) => void
  onVideoUrlChange: (url: string) => void
  timecode: string
}

const STATUSES: SceneStatus[] = ['Searching', 'Options Found', 'Client Review', 'Approved', 'Licensed']

export function VideoPanel({
  profile,
  projectName,
  sceneName,
  status,
  videoUrl,
  syncVideo,
  videoRef,
  onProjectNameChange,
  onSceneNameChange,
  onStatusChange,
  onVideoUrlChange,
  timecode,
}: VideoPanelProps) {
  void profile
  void syncVideo
  const [draggingOver, setDraggingOver] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [editingProject, setEditingProject] = useState(false)
  const [editingScene, setEditingScene] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleVideoUpload = async (file: File) => {
    setUploading(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { setUploading(false); return }
    const safeName = file.name.replace(/[#\s]/g, '_')
    const path = `${user.id}/${Date.now()}_${safeName}`
    const { error } = await supabase.storage.from('studio').upload(path, file, { upsert: true })
    if (!error) {
      const { data: { publicUrl } } = supabase.storage.from('studio').getPublicUrl(path)
      onVideoUrlChange(publicUrl)
    }
    setUploading(false)
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setDraggingOver(false)
    const file = e.dataTransfer.files[0]
    if (file && file.type.startsWith('video/')) handleVideoUpload(file)
  }

  return (
    <div className="flex flex-col h-full" style={{ background: '#050508' }}>
      <div
        className="flex items-center justify-between px-4 flex-shrink-0 border-b border-[#111118]"
        style={{ height: 40 }}
      >
        <div className="flex items-center gap-2 text-sm min-w-0">
          {editingProject ? (
            <input
              autoFocus
              value={projectName}
              onChange={e => onProjectNameChange(e.target.value)}
              onBlur={() => setEditingProject(false)}
              onKeyDown={e => e.key === 'Enter' && setEditingProject(false)}
              className="bg-transparent border-b border-[#C8A97E] outline-none text-[#E8E8E8] font-semibold min-w-0"
              style={{ fontFamily: 'Playfair Display, Georgia, serif', maxWidth: 160 }}
            />
          ) : (
            <button
              onClick={() => setEditingProject(true)}
              className="font-semibold text-[#E8E8E8] hover:text-[#C8A97E] transition-colors truncate"
              style={{ fontFamily: 'Playfair Display, Georgia, serif', maxWidth: 160 }}
            >
              {projectName}
            </button>
          )}
          <span className="text-[#444] flex-shrink-0">/</span>
          {editingScene ? (
            <input
              autoFocus
              value={sceneName}
              onChange={e => onSceneNameChange(e.target.value)}
              onBlur={() => setEditingScene(false)}
              onKeyDown={e => e.key === 'Enter' && setEditingScene(false)}
              className="bg-transparent border-b border-[#C8A97E] outline-none text-[#AAA] text-sm min-w-0"
              style={{ maxWidth: 120 }}
            />
          ) : (
            <button
              onClick={() => setEditingScene(true)}
              className="text-[#888] hover:text-[#C8A97E] transition-colors text-sm truncate"
              style={{ maxWidth: 120 }}
            >
              {sceneName}
            </button>
          )}
        </div>

        <div className="flex-shrink-0 mx-4">
          <select
            value={status}
            onChange={e => onStatusChange(e.target.value as SceneStatus)}
            className="text-xs px-2 py-1 rounded border outline-none bg-[#0D0D14] cursor-pointer"
            style={{
              color: STATUS_COLORS[status],
              borderColor: STATUS_COLORS[status] + '55',
            }}
          >
            {STATUSES.map(s => (
              <option key={s} value={s} style={{ color: STATUS_COLORS[s], background: '#0D0D14' }}>
                {s}
              </option>
            ))}
          </select>
        </div>

        <div className="flex items-center gap-2 flex-shrink-0">
          <button
            onClick={() => fileInputRef.current?.click()}
            className="flex items-center gap-1 px-2 py-1 text-xs border border-[#2a2a35] rounded text-[#888] hover:border-[#C8A97E] hover:text-[#C8A97E] transition-colors"
          >
            <Upload className="w-3 h-3" /> Upload
          </button>
          <button className="flex items-center gap-1 px-2 py-1 text-xs border border-[#2a2a35] rounded text-[#888] hover:border-[#C8A97E] hover:text-[#C8A97E] transition-colors">
            <Share2 className="w-3 h-3" /> Share
          </button>
          <span className="text-xs text-[#555] font-mono">{timecode}</span>
        </div>
      </div>

      <div
        className="flex-1 relative overflow-hidden"
        onDragOver={e => { e.preventDefault(); setDraggingOver(true) }}
        onDragLeave={() => setDraggingOver(false)}
        onDrop={handleDrop}
      >
        {videoUrl ? (
          <>
            <video
              ref={videoRef}
              src={videoUrl}
              className="w-full h-full"
              style={{ objectFit: 'contain', background: '#000' }}
              playsInline
            />
            <div className="absolute bottom-2 left-3 text-xs font-mono text-[#C8A97E] bg-black/60 px-2 py-0.5 rounded pointer-events-none">
              {timecode}
            </div>
          </>
        ) : (
          <div
            className="w-full h-full flex flex-col items-center justify-center cursor-pointer transition-all"
            style={{
              background: draggingOver ? '#0D0D20' : '#0A0A14',
              border: draggingOver ? '2px dashed #C8A97E' : '2px dashed #1E1E2E',
            }}
            onClick={() => fileInputRef.current?.click()}
          >
            {uploading ? (
              <div className="flex flex-col items-center gap-3">
                <div className="w-8 h-8 border-2 border-[#C8A97E] border-t-transparent rounded-full animate-spin" />
                <p className="text-sm text-[#888]">Uploading...</p>
              </div>
            ) : (
              <>
                <Film className="w-12 h-12 text-[#2A2A3A] mb-3" />
                <p className="text-sm text-[#555]">Drop video reference here or click to upload</p>
                <p className="text-xs text-[#333] mt-1">MP4, MOV, WebM supported</p>
              </>
            )}
          </div>
        )}
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept="video/*"
        className="hidden"
        onChange={e => { const f = e.target.files?.[0]; if (f) handleVideoUpload(f) }}
      />
    </div>
  )
}
