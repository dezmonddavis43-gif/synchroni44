import { useState, useEffect } from 'react'
import { X, Play, Pause, Download, Check, FileAudio, Music } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { MoodPill, ClearanceBadge, Spinner } from './UI'
import { MOOD_COLORS } from '../../lib/constants'
import type { Track, Profile, LicenseRequest } from '../../lib/types'
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

type TabType = 'license' | 'details' | 'similar' | 'history'

const MICRO_LICENSES = [
  { id: 'ugc', name: 'UGC / Social Media', price: 29, description: 'YouTube, TikTok, Instagram, personal use' },
  { id: 'small_brand', name: 'Small Brand', price: 79, description: 'Small business, local advertising, web' },
  { id: 'digital_ads', name: 'Digital Ads', price: 149, description: 'Online advertising campaigns, brand content' },
]

export function TrackDetailModal({
  track,
  profile,
  isOpen,
  isPlaying,
  onPlay,
  onClose,
  onLoginPrompt
}: TrackDetailModalProps) {
  const [activeTab, setActiveTab] = useState<TabType>('license')
  const [similarTracks, setSimilarTracks] = useState<Track[]>([])
  const [licenseHistory, setLicenseHistory] = useState<LicenseRequest[]>([])
  const [loading, setLoading] = useState(false)
  const [quoteForm, setQuoteForm] = useState({
    usage_type: '',
    territory: '',
    term_length: '',
    budget: '',
    notes: ''
  })
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState<'one_stop' | 'quote' | null>(null)

  const moodColor = track.mood ? MOOD_COLORS[track.mood] || '#C8A97E' : '#C8A97E'

  useEffect(() => {
    if (activeTab === 'similar') {
      loadSimilarTracks()
    } else if (activeTab === 'history' && profile) {
      loadHistory()
    }
  }, [activeTab, track.id, profile])

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

  const loadHistory = async () => {
    if (!profile) return
    setLoading(true)
    const { data } = await supabase
      .from('license_requests')
      .select('*')
      .eq('track_id', track.id)
      .order('created_at', { ascending: false })
    if (data) setLicenseHistory(data)
    setLoading(false)
  }

  const handleOneStopRequest = async () => {
    if (!profile) {
      onLoginPrompt?.('request a license')
      return
    }
    setSubmitting(true)
    await supabase.from('license_requests').insert({
      track_id: track.id,
      supervisor_id: profile.id,
      license_type: 'one_stop',
      status: 'pending'
    })
    setSubmitted('one_stop')
    setSubmitting(false)
  }

  const handleQuoteRequest = async () => {
    if (!profile) {
      onLoginPrompt?.('request a quote')
      return
    }
    setSubmitting(true)
    await supabase.from('license_requests').insert({
      track_id: track.id,
      supervisor_id: profile.id,
      license_type: 'quote',
      usage_type: quoteForm.usage_type,
      territory: quoteForm.territory,
      term: quoteForm.term_length,
      budget: quoteForm.budget,
      notes: quoteForm.notes,
      status: 'pending'
    })
    setSubmitted('quote')
    setSubmitting(false)
  }

  const handleMicroLicense = (licenseType: string, price: number) => {
    if (!profile) {
      onLoginPrompt?.('purchase a license')
      return
    }
    alert(`Stripe checkout for ${licenseType} at $${price} - Coming Soon!`)
  }

  const formatDuration = (seconds?: number) => {
    if (!seconds) return '--:--'
    const mins = Math.floor(seconds / 60)
    const secs = Math.floor(seconds % 60)
    return `${mins}:${secs.toString().padStart(2, '0')}`
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
            {[...Array(40)].map((_, i) => (
              <div
                key={i}
                className="w-1 bg-[#C8A97E] rounded-t transition-all"
                style={{
                  height: `${Math.random() * 100}%`,
                  opacity: isPlaying ? 0.6 + Math.random() * 0.4 : 0.3
                }}
              />
            ))}
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
              <p className="text-xs text-[#E8E8E8]">{track.key || '-'}</p>
            </div>
            <div className="bg-[#16161A] rounded-lg p-2 text-center">
              <p className="text-[10px] text-[#666] uppercase">Duration</p>
              <p className="text-xs text-[#E8E8E8]">{formatDuration(track.duration)}</p>
            </div>
            <div className="bg-[#16161A] rounded-lg p-2 text-center">
              <p className="text-[10px] text-[#666] uppercase">Status</p>
              <div className="flex justify-center">
                {track.clearance_status ? (
                  <ClearanceBadge status={track.clearance_status} />
                ) : (
                  <span className="text-xs text-[#555]">-</span>
                )}
              </div>
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
            {(['license', 'details', 'similar', 'history'] as TabType[]).map(tab => (
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
            {activeTab === 'license' && (
              <div className="space-y-6">
                <section>
                  <h3 className="text-sm font-semibold text-[#E8E8E8] mb-3 flex items-center gap-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-[#4DFFB4]" />
                    Digital & Content Licensing
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    {MICRO_LICENSES.map(license => (
                      <div
                        key={license.id}
                        className="bg-[#16161A] border border-[#2A2A2E] rounded-xl p-4 hover:border-[#C8A97E]/30 transition-colors"
                      >
                        <h4 className="text-sm font-medium text-[#E8E8E8] mb-1">{license.name}</h4>
                        <p className="text-[10px] text-[#666] mb-3 line-clamp-2">{license.description}</p>
                        <div className="flex items-center justify-between">
                          <span className="text-lg font-bold text-[#C8A97E]">${license.price}</span>
                          <button
                            onClick={() => handleMicroLicense(license.id, license.price)}
                            className="px-3 py-1.5 bg-[#C8A97E] text-[#0A0A0C] text-xs font-medium rounded-lg hover:bg-[#D4B88A] transition-colors"
                          >
                            Buy Now
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                  <p className="text-[10px] text-[#555] mt-2">
                    Instant license. Download immediately after purchase.
                  </p>
                </section>

                <section>
                  <h3 className="text-sm font-semibold text-[#E8E8E8] mb-3 flex items-center gap-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-[#7B9CFF]" />
                    Professional Sync Licensing
                  </h3>

                  {submitted === 'one_stop' ? (
                    <div className="bg-[#4DFFB4]/10 border border-[#4DFFB4]/20 rounded-xl p-4 flex items-center gap-3">
                      <Check className="w-5 h-5 text-[#4DFFB4]" />
                      <p className="text-sm text-[#4DFFB4]">One-Stop license request submitted successfully!</p>
                    </div>
                  ) : (
                    <div className="bg-[#16161A] border border-[#2A2A2E] rounded-xl p-4 mb-3">
                      <div className="flex items-start justify-between mb-2">
                        <div>
                          <h4 className="text-sm font-medium text-[#E8E8E8]">One-Stop License</h4>
                          <p className="text-[10px] text-[#666]">Master + Sync rights cleared. Instant licensing.</p>
                        </div>
                        <span className="text-lg font-bold text-[#C8A97E]">
                          {track.one_stop_fee ? `$${track.one_stop_fee.toLocaleString()}` : 'Quote'}
                        </span>
                      </div>
                      <button
                        onClick={handleOneStopRequest}
                        disabled={submitting}
                        className="w-full py-2 bg-[#7B9CFF] text-white text-sm font-medium rounded-lg hover:bg-[#8EABFF] transition-colors disabled:opacity-50"
                      >
                        {submitting ? 'Submitting...' : 'Request One-Stop License'}
                      </button>
                    </div>
                  )}

                  {submitted === 'quote' ? (
                    <div className="bg-[#4DFFB4]/10 border border-[#4DFFB4]/20 rounded-xl p-4 flex items-center gap-3">
                      <Check className="w-5 h-5 text-[#4DFFB4]" />
                      <p className="text-sm text-[#4DFFB4]">Quote request submitted successfully!</p>
                    </div>
                  ) : (
                    <div className="bg-[#16161A] border border-[#2A2A2E] rounded-xl p-4">
                      <h4 className="text-sm font-medium text-[#E8E8E8] mb-1">Request Quote</h4>
                      <p className="text-[10px] text-[#666] mb-3">For TV, Film, major advertising campaigns</p>
                      <div className="grid grid-cols-2 gap-3 mb-3">
                        <select
                          value={quoteForm.usage_type}
                          onChange={e => setQuoteForm({ ...quoteForm, usage_type: e.target.value })}
                          className="bg-[#0D0D10] border border-[#2A2A2E] rounded-lg px-3 py-2 text-xs text-[#E8E8E8]"
                        >
                          <option value="">Usage Type</option>
                          <option value="tv">TV</option>
                          <option value="film">Film</option>
                          <option value="advertising">Advertising</option>
                          <option value="trailer">Trailer</option>
                          <option value="gaming">Gaming</option>
                        </select>
                        <select
                          value={quoteForm.territory}
                          onChange={e => setQuoteForm({ ...quoteForm, territory: e.target.value })}
                          className="bg-[#0D0D10] border border-[#2A2A2E] rounded-lg px-3 py-2 text-xs text-[#E8E8E8]"
                        >
                          <option value="">Territory</option>
                          <option value="us">US Only</option>
                          <option value="north_america">North America</option>
                          <option value="worldwide">Worldwide</option>
                        </select>
                        <select
                          value={quoteForm.term_length}
                          onChange={e => setQuoteForm({ ...quoteForm, term_length: e.target.value })}
                          className="bg-[#0D0D10] border border-[#2A2A2E] rounded-lg px-3 py-2 text-xs text-[#E8E8E8]"
                        >
                          <option value="">Term Length</option>
                          <option value="3_months">3 Months</option>
                          <option value="6_months">6 Months</option>
                          <option value="1_year">1 Year</option>
                          <option value="2_years">2 Years</option>
                          <option value="perpetuity">In Perpetuity</option>
                        </select>
                        <input
                          type="text"
                          value={quoteForm.budget}
                          onChange={e => setQuoteForm({ ...quoteForm, budget: e.target.value })}
                          placeholder="Budget (optional)"
                          className="bg-[#0D0D10] border border-[#2A2A2E] rounded-lg px-3 py-2 text-xs text-[#E8E8E8] placeholder-[#555]"
                        />
                      </div>
                      <textarea
                        value={quoteForm.notes}
                        onChange={e => setQuoteForm({ ...quoteForm, notes: e.target.value })}
                        placeholder="Additional notes about your project..."
                        rows={2}
                        className="w-full bg-[#0D0D10] border border-[#2A2A2E] rounded-lg px-3 py-2 text-xs text-[#E8E8E8] placeholder-[#555] resize-none mb-3"
                      />
                      <button
                        onClick={handleQuoteRequest}
                        disabled={submitting}
                        className="w-full py-2 bg-[#2A2A2E] text-[#E8E8E8] text-sm font-medium rounded-lg hover:bg-[#333] transition-colors disabled:opacity-50"
                      >
                        {submitting ? 'Submitting...' : 'Send Quote Request'}
                      </button>
                    </div>
                  )}
                </section>

                <section>
                  <h3 className="text-sm font-semibold text-[#E8E8E8] mb-3 flex items-center gap-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-[#FF6B9D]" />
                    Available Files
                  </h3>
                  <div className="grid grid-cols-2 gap-2">
                    <FileVersionRow label="Master (Full Mix)" available={!!track.audio_url} />
                    <FileVersionRow label="Instrumental" available={!!track.instrumental_url} />
                    <FileVersionRow label="Stems" available={!!track.stems_urls?.length} />
                    <FileVersionRow label="Acapella" available={!!track.acapella_url} />
                  </div>
                </section>
              </div>
            )}

            {activeTab === 'details' && (
              <div className="space-y-4">
                <DetailRow label="Title" value={track.title} />
                <DetailRow label="Artist" value={track.artist} />
                <DetailRow label="Genre" value={track.genre} />
                <DetailRow label="Mood" value={track.mood} />
                <DetailRow label="BPM" value={track.bpm?.toString()} />
                <DetailRow label="Key" value={track.key} />
                <DetailRow label="Duration" value={formatDuration(track.duration)} />
                <DetailRow label="Tags" value={track.tags?.join(', ')} />
                <div className="border-t border-[#1E1E22] pt-4">
                  <DetailRow label="Clearance Status" value={track.clearance_status} />
                  <DetailRow label="PRO Affiliation" value={track.pro_affiliation} />
                  <DetailRow label="Publisher" value={track.publisher} />
                </div>
                <div className="border-t border-[#1E1E22] pt-4">
                  <DetailRow label="Upload Date" value={new Date(track.created_at).toLocaleDateString()} />
                  <DetailRow label="Plays" value={track.play_count?.toString() || '0'} />
                  <DetailRow label="Saves" value={track.save_count?.toString() || '0'} />
                  <DetailRow label="Licenses" value={track.license_count?.toString() || '0'} />
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

            {activeTab === 'history' && (
              <div>
                {!profile ? (
                  <p className="text-center text-[#666] py-8">Sign in to view license history</p>
                ) : profile.role !== 'admin' && profile.role !== 'supervisor' ? (
                  <p className="text-center text-[#666] py-8">History is only visible to supervisors and admins</p>
                ) : loading ? (
                  <div className="flex justify-center py-8"><Spinner /></div>
                ) : licenseHistory.length > 0 ? (
                  <div className="space-y-2">
                    {licenseHistory.map(req => (
                      <div key={req.id} className="p-3 bg-[#16161A] rounded-lg">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-sm text-[#E8E8E8] capitalize">{req.license_type.replace('_', ' ')}</span>
                          <span className={`text-xs px-2 py-0.5 rounded ${
                            req.status === 'approved' ? 'bg-[#4DFFB4]/20 text-[#4DFFB4]' :
                            req.status === 'rejected' ? 'bg-red-500/20 text-red-400' :
                            'bg-[#C8A97E]/20 text-[#C8A97E]'
                          }`}>
                            {req.status}
                          </span>
                        </div>
                        <p className="text-xs text-[#666]">
                          {new Date(req.created_at).toLocaleDateString()}
                          {req.fee_agreed && ` - $${req.fee_agreed.toLocaleString()}`}
                        </p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-center text-[#666] py-8">No license history for this track</p>
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
