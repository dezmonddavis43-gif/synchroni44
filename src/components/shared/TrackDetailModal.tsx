import { useState, useEffect } from 'react'
import { X, Play, Pause, Download, FileAudio, Music } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { MoodPill, Spinner } from './UI'
import { MOOD_COLORS } from '../../lib/constants'
import type { Track, Profile } from '../../lib/types'
import { formatTrackDurationMmSs } from '../../lib/trackDuration'
import { ArtistLink } from './ArtistLink'

interface TrackDetailModalProps {
  track: Track
  profile: Profile | null
  isOpen: boolean
  isPlaying: boolean
  isSaved?: boolean
  onPlay: () => void
  onClose: () => void
  onToggleSave?: () => void
  onLoginPrompt?: (action: string) => void
}

type TabType = 'details' | 'similar'

function formatStatus(status?: string): string {
  if (!status) return '-'
  return status.charAt(0).toUpperCase() + status.slice(1)
}

export function TrackDetailModal({
  track,
  profile: _profile,
  isOpen,
  isPlaying,
  onPlay,
  onClose
}: TrackDetailModalProps) {
  void _profile
  const [activeTab, setActiveTab] = useState<TabType>('details')
  const [similarTracks, setSimilarTracks] = useState<Track[]>([])
  const [loading, setLoading] = useState(false)

  const moodColor = track.mood ? MOOD_COLORS[track.mood] || '#C8A97E' : '#C8A97E'

  useEffect(() => {
    if (activeTab === 'similar') {
      loadSimilarTracks()
    }
  }, [activeTab, track.id])

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', handleEscape)
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', handleEscape)
      document.body.style.overflow = ''
    }
  }, [onClose])

  const loadSimilarTracks = async () => {
    setLoading(true)
    const { data } = await supabase
      .from('tracks')
      .select('*')
      .eq('status', 'active')
      .neq('id', track.id)
      .or(`mood.eq.${track.mood},genre.eq.${track.genre}`)
      .limit(6)
    if (data) setSimilarTracks(data)
    setLoading(false)
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />

      <div className="relative w-full max-w-[860px] max-h-[90vh] bg-[#0D0D10] border border-[#1E1E22] rounded-2xl overflow-hidden flex flex-col md:flex-row">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 z-10 p-2 rounded-full bg-black/40 text-[#888] hover:text-white transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="w-full md:w-[340px] flex-shrink-0 p-6 border-b md:border-b-0 md:border-r border-[#1E1E22] overflow-y-auto">
          <div
            className="w-full aspect-square max-w-[260px] mx-auto rounded-xl flex items-center justify-center mb-6"
            style={{ background: `linear-gradient(135deg, ${moodColor}99 0%, #0A0A0C 100%)` }}
          >
            <div className="w-20 h-20 rounded-full bg-black/20 backdrop-blur-sm flex items-center justify-center">
              <span className="text-4xl font-bold text-white/80">
                {track.title.charAt(0).toUpperCase()}
              </span>
            </div>
          </div>

          <h2 className="font-['Playfair_Display'] text-xl md:text-[22px] text-white font-semibold text-center mb-1">
            {track.title}
          </h2>
          <ArtistLink artistName={track.artist} className="text-[#888] text-sm text-center block mb-4" />

          <button
            onClick={onPlay}
            className="w-full py-3 rounded-xl bg-[#C8A97E] text-[#0A0A0C] font-medium flex items-center justify-center gap-2 hover:bg-[#D4B88A] transition-colors mb-4"
          >
            {isPlaying ? (
              <>
                <Pause className="w-5 h-5" />
                Pause
              </>
            ) : (
              <>
                <Play className="w-5 h-5 ml-0.5" />
                Play
              </>
            )}
          </button>

          <div className="h-8 flex items-end gap-0.5 justify-center mb-6">
            {[...Array(40)].map((_, i) => {
              const h = 25 + ((i * 17) % 55)
              return (
                <div
                  key={i}
                  className="w-1 bg-[#C8A97E] rounded-t transition-all"
                  style={{
                    height: `${h}%`,
                    opacity: isPlaying ? 0.65 + (i % 5) * 0.07 : 0.35
                  }}
                />
              )
            })}
          </div>

          <div className="grid grid-cols-3 gap-2 mb-4">
            <div className="bg-[#16161A] rounded-lg p-2 text-center">
              <p className="text-[10px] text-[#666] uppercase">Genre</p>
              <p className="text-xs text-[#E8E8E8] truncate">{track.genre || '-'}</p>
            </div>
            <div className="bg-[#16161A] rounded-lg p-2 text-center">
              <p className="text-[10px] text-[#666] uppercase">Mood</p>
              <p className="text-xs text-[#E8E8E8] truncate">{track.mood || '-'}</p>
            </div>
            <div className="bg-[#16161A] rounded-lg p-2 text-center">
              <p className="text-[10px] text-[#666] uppercase">BPM</p>
              <p className="text-xs text-[#E8E8E8]">{track.bpm || '-'}</p>
            </div>
            <div className="bg-[#16161A] rounded-lg p-2 text-center">
              <p className="text-[10px] text-[#666] uppercase">Key</p>
              <p className="text-xs text-[#E8E8E8]">{track.key ?? track.musical_key ?? '-'}</p>
            </div>
            <div className="bg-[#16161A] rounded-lg p-2 text-center">
              <p className="text-[10px] text-[#666] uppercase">Duration</p>
              <p className="text-xs text-[#E8E8E8]">{formatTrackDurationMmSs(track)}</p>
            </div>
            <div className="bg-[#16161A] rounded-lg p-2 text-center">
              <p className="text-[10px] text-[#666] uppercase">Status</p>
              <p className="text-xs text-[#E8E8E8] truncate">{formatStatus(track.status)}</p>
            </div>
          </div>

          {track.tags && track.tags.length > 0 && (
            <div className="flex flex-wrap gap-1 mb-4">
              {track.tags.map(tag => (
                <span key={tag} className="px-2 py-0.5 bg-[#1A1A1E] rounded text-[10px] text-[#888]">
                  {tag}
                </span>
              ))}
            </div>
          )}
        </div>

        <div className="flex-1 flex flex-col overflow-hidden">
          <div className="flex border-b border-[#1E1E22] px-4">
            {(['details', 'similar'] as TabType[]).map(tab => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-4 py-3 text-sm font-medium capitalize transition-colors relative ${
                  activeTab === tab ? 'text-[#E8E8E8]' : 'text-[#666] hover:text-[#888]'
                }`}
              >
                {tab}
                {activeTab === tab && (
                  <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#C8A97E]" />
                )}
              </button>
            ))}
          </div>

          <div className="flex-1 overflow-y-auto p-4 md:p-6">
            {activeTab === 'details' && (
              <div className="space-y-4">
                <DetailRow label="Title" value={track.title} />
                <DetailRow label="Artist" value={track.artist} />
                <DetailRow label="Genre" value={track.genre} />
                {track.sub_genre ? <DetailRow label="Sub-genre" value={track.sub_genre} /> : null}
                <DetailRow label="Mood" value={track.mood} />
                <DetailRow label="BPM" value={track.bpm?.toString()} />
                <DetailRow label="Key" value={track.key ?? track.musical_key} />
                <DetailRow label="Duration" value={formatTrackDurationMmSs(track)} />
                <DetailRow label="Tags" value={track.tags?.join(', ')} />
                {(track.notes || track.ownership_notes) && (
                  <div className="border-t border-[#1E1E22] pt-4">
                    <p className="text-xs text-[#666] mb-1">Notes</p>
                    <p className="text-sm text-[#E8E8E8] whitespace-pre-wrap">{track.notes || track.ownership_notes}</p>
                  </div>
                )}
                <div className="border-t border-[#1E1E22] pt-4 space-y-3">
                  <h3 className="text-sm font-semibold text-[#E8E8E8]">Available files</h3>
                  <div className="grid grid-cols-2 gap-2">
                    <FileVersionRow label="Master (Full Mix)" available={!!track.audio_url} />
                    <FileVersionRow label="Instrumental" available={!!track.instrumental_url} />
                    <FileVersionRow label="Stems" available={!!track.stems_urls?.length} />
                    <FileVersionRow label="Acapella" available={!!track.acapella_url} />
                  </div>
                </div>
                <div className="border-t border-[#1E1E22] pt-4">
                  <DetailRow label="Upload Date" value={new Date(track.created_at).toLocaleDateString()} />
                  <DetailRow label="Plays" value={track.play_count?.toString() || '0'} />
                  <DetailRow label="Saves" value={track.save_count?.toString() || '0'} />
                </div>
              </div>
            )}

            {activeTab === 'similar' && (
              <div>
                {loading ? (
                  <div className="flex justify-center py-8"><Spinner /></div>
                ) : similarTracks.length > 0 ? (
                  <div className="space-y-2">
                    {similarTracks.map(t => (
                      <div
                        key={t.id}
                        className="flex items-center gap-3 p-3 bg-[#16161A] rounded-lg hover:bg-[#1A1A1E] transition-colors"
                      >
                        <div
                          className="w-10 h-10 rounded flex items-center justify-center flex-shrink-0"
                          style={{ background: `linear-gradient(135deg, ${MOOD_COLORS[t.mood || ''] || '#C8A97E'}60 0%, #1A1A1E 100%)` }}
                        >
                          <Music className="w-4 h-4 text-white/60" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm text-[#E8E8E8] font-medium truncate">{t.title}</p>
                          <p className="text-xs text-[#666] truncate">{t.artist}</p>
                        </div>
                        <div className="flex items-center gap-2">
                          {t.mood && <MoodPill mood={t.mood} />}
                          <span className="text-xs text-[#666]">{t.bpm} BPM</span>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-center text-[#666] py-8">No similar tracks found</p>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

function FileVersionRow({ label, available }: { label: string; available: boolean }) {
  return (
    <div className={`flex items-center justify-between p-3 rounded-lg ${available ? 'bg-[#16161A]' : 'bg-[#0D0D10] opacity-50'}`}>
      <div className="flex items-center gap-2">
        <FileAudio className="w-4 h-4 text-[#888]" />
        <span className="text-xs text-[#E8E8E8]">{label}</span>
      </div>
      {available ? (
        <button className="p-1.5 rounded bg-[#2A2A2E] text-[#888] hover:text-[#E8E8E8] transition-colors" disabled>
          <Download className="w-3.5 h-3.5" />
        </button>
      ) : (
        <span className="text-[10px] text-[#555]">N/A</span>
      )}
    </div>
  )
}

function DetailRow({ label, value }: { label: string; value?: string }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-xs text-[#666]">{label}</span>
      <span className="text-sm text-[#E8E8E8]">{value || '-'}</span>
    </div>
  )
}
