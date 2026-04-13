import { useRef, useState, useEffect } from 'react'
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
  syncVideo: _syncVideo,
  videoRef,
  onProjectNameChange,
  onSceneNameChange,
  onStatusChange,
  onVideoUrlChange,
  timecode,
}: VideoPanelProps) {
  const [draggingOver, setDraggingOver] = useState(false)
  const [uploading, setUploading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [editingProject, setEditingProject] = useState(false)
  const [editingScene, setEditingScene] = useState(false)

  const uploadVideo = async (file: File) => {
    setUploading(true)
    const path = `${profile.id}/${Date.now()}_${file.name}`
    const { error } = await supabase.storage.from('studio').upload(path, file, { upsert: true })
    if (!error) {
      const { data } = supabase.storage.from('studio').getPublicUrl(path)
      onVideoUrlChange(data.publicUrl)
    }
    setUploading(false)
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setDraggingOver(false)
    const file = e.dataTransfer.files[0]
    if (file && file.type.startsWith('video/')) uploadVideo(file)
  }

  return (
    <div className="flex flex-col h-full" style={{ background: '#050508' }}>
      <div
        className="flex items-center justify-between px-4 flex-shrink-0 border-b border-[#111118]"
        style={{ height: 40 }}
      >
        <div className="flex items-center gap-2 text-sm">
          {editingProject ? (
            <input
              autoFocus
              value={projectName}
              onChange={e => onProjectNameChange(e.target.value)}
              onBlur={() => setEditingProject(false)}
              className="bg-transparent border-b border-[#C8A97E] outline-none text-[#E8E8E8] font-semibold"
              style={{ fontFamily: 'Playfair Display, serif', minWidth: 80 }}
            />
          ) : (
            <button
              onClick={() => setEditingProject(true)}
              className="font-semibold text-[#E8E8E8] hover:text-[#C8A97E] transition-colors"
              style={{ fontFamily: 'Playfair Display, serif' }}
            >
              {projectName}
            </button>
          )}
          <span className="text-[#444]">/</span>
          {editingScene ? (
            <input
              autoFocus
              value={sceneName}
              onChange={e => onSceneNameChange(e.target.value)}
              onBlur={() => setEditingScene(false)}
              className="bg-transparent border-b border-[#C8A97E] outline-none text-[#AAA] text-sm"
              style={{ minWidth: 60 }}
            />
          ) : (
            <button
              onClick={() => setEditingScene(true)}
              className="text-[#888] hover:text-[#C8A97E] transition-colors text-sm"
            >
              {sceneName}
            </button>
          )}
        </div>

        <div className="flex items-center gap-2">
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
              <option key={s} value={s} style={{ color: STATUS_COLORS[s] }}>
                {s}
              </option>
            ))}
          </select>

          <button
            onClick={() => fileInputRef.current?.click()}
            className="flex items-center gap-1 px-2 py-1 text-xs border border-[#2a2a35] rounded text-[#888] hover:border-[#C8A97E] hover:text-[#C8A97E] transition-colors"
          >
            <Upload className="w-3 h-3" /> Upload Video
          </button>
          <button className="flex items-center gap-1 px-2 py-1 text-xs border border-[#2a2a35] rounded text-[#888] hover:border-[#C8A97E] hover:text-[#C8A97E] transition-colors">
            <Share2 className="w-3 h-3" /> Share
          </button>
          <span className="text-xs text-[#444] font-mono">{timecode}</span>
        </div>
      </div>

      <div
        className="flex-1 relative"
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
            <div className="absolute bottom-2 left-3 text-xs font-mono text-[#C8A97E] bg-black/60 px-2 py-0.5 rounded">
              {timecode}
            </div>
          </>
        ) : (
          <div
            className="w-full h-full flex flex-col items-center justify-center cursor-pointer transition-colors"
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
                <Film className="w-14 h-14 text-[#333] mb-4" />
                <p className="text-[#666] text-sm">Drop video reference here or click to upload</p>
                <p className="text-[#444] text-xs mt-1">MP4, MOV, WebM supported</p>
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
        onChange={e => { const f = e.target.files?.[0]; if (f) uploadVideo(f) }}
      />
    </div>
  )
}
