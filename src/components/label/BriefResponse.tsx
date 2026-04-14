import { useState, useEffect, useCallback, useMemo } from 'react'
import { supabase } from '../../lib/supabase'
import { Spinner, MoodPill } from '../shared/UI'
import { MOOD_COLORS } from '../../lib/constants'
import {
  X, Plus, Trash2, Play, Pause, Search, FileText, DollarSign,
  Globe, Shield, Sparkles, GripVertical, ChevronDown, Send, Save
} from 'lucide-react'
import type { Profile, Brief, BriefBucket, BriefSend, Track } from '../../lib/types'

interface BriefResponseProps {
  profile: Profile
  briefSend: BriefSend & { brief: Brief & { buckets?: BriefBucket[]; supervisor?: Profile } }
  onClose: () => void
  onSuccess: () => void
  onPlayTrack: (track: Track) => void
  currentTrack: Track | null
  playing: boolean
}

interface BucketTrack {
  id: string
  track: Track
  quote: number | ''
  notes: string
}

function getDeadlineCountdown(deadline?: string): string {
  if (!deadline) return 'No deadline'
  const now = new Date()
  const deadlineDate = new Date(deadline)
  const diffMs = deadlineDate.getTime() - now.getTime()
  const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24))

  if (diffDays < 0) return 'Expired'
  if (diffDays === 0) return 'Due today'
  if (diffDays === 1) return '1 day left'
  return `${diffDays} days left`
}

export function BriefResponse({
  profile,
  briefSend,
  onClose,
  onSuccess,
  onPlayTrack,
  currentTrack,
  playing
}: BriefResponseProps) {
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [catalogTracks, setCatalogTracks] = useState<Track[]>([])
  const [bucketTracks, setBucketTracks] = useState<Record<string, BucketTrack[]>>({})
  const [message, setMessage] = useState('')
  const [showTrackSearch, setShowTrackSearch] = useState<string | null>(null)
  const [trackSearch, setTrackSearch] = useState('')
  const [aiSuggestions, setAiSuggestions] = useState<Record<string, { track: Track; score: number; reason: string }[]>>({})

  const brief = briefSend.brief
  const buckets = useMemo(() => brief.buckets || [], [brief.buckets])

  const markAsOpened = useCallback(async () => {
    if (!briefSend.opened) {
      await supabase
        .from('brief_sends')
        .update({ opened: true, opened_at: new Date().toISOString() })
        .eq('id', briefSend.id)
    }
  }, [briefSend.opened, briefSend.id])

  const generateAiSuggestions = useCallback(async (tracks: Track[]) => {
    const suggestions: Record<string, { track: Track; score: number; reason: string }[]> = {}

    buckets.forEach(bucket => {
      const matchingTracks = tracks
        .filter(track => {
          const moodMatch = brief.moods?.includes(track.mood || '') ? 30 : 0
          const genreMatch = brief.genres?.includes(track.genre || '') ? 30 : 0
          const bpmMatch = track.bpm &&
            (!brief.bpm_min || track.bpm >= brief.bpm_min) &&
            (!brief.bpm_max || track.bpm <= brief.bpm_max) ? 20 : 0
          const feeMatch = track.one_stop_fee &&
            bucket.min_amount && bucket.max_amount &&
            track.one_stop_fee >= bucket.min_amount &&
            track.one_stop_fee <= bucket.max_amount ? 20 : 0

          return moodMatch + genreMatch + bpmMatch + feeMatch > 30
        })
        .map(track => {
          let score = 0
          const reasons: string[] = []

          if (brief.moods?.includes(track.mood || '')) {
            score += 30
            reasons.push(`Mood: ${track.mood}`)
          }
          if (brief.genres?.includes(track.genre || '')) {
            score += 30
            reasons.push(`Genre: ${track.genre}`)
          }
          if (track.bpm && (!brief.bpm_min || track.bpm >= brief.bpm_min) && (!brief.bpm_max || track.bpm <= brief.bpm_max)) {
            score += 20
            reasons.push(`BPM: ${track.bpm}`)
          }
          if (track.one_stop_fee && bucket.min_amount && bucket.max_amount &&
            track.one_stop_fee >= bucket.min_amount && track.one_stop_fee <= bucket.max_amount) {
            score += 20
            reasons.push(`Fee within range`)
          }

          return { track, score, reason: reasons.join(', ') }
        })
        .sort((a, b) => b.score - a.score)
        .slice(0, 5)

      suggestions[bucket.id] = matchingTracks
    })

    setAiSuggestions(suggestions)
  }, [brief, buckets])

  const loadData = useCallback(async () => {
    setLoading(true)

    const { data: tracks } = await supabase
      .from('tracks')
      .select('*')
      .eq('uploaded_by', profile.id)
      .eq('status', 'active')
      .order('created_at', { ascending: false })

    if (tracks) {
      setCatalogTracks(tracks)
      void generateAiSuggestions(tracks)
    }

    const { data: existingResponse } = await supabase
      .from('brief_responses')
      .select('*, tracks:brief_response_tracks(*, track:tracks(*))')
      .eq('brief_id', brief.id)
      .eq('responder_id', profile.id)
      .maybeSingle()

    if (existingResponse) {
      setMessage(existingResponse.message || '')
      const loadedBucketTracks: Record<string, BucketTrack[]> = {}

      buckets.forEach(bucket => {
        loadedBucketTracks[bucket.id] = []
      })
      loadedBucketTracks['uncategorized'] = []

      existingResponse.tracks?.forEach((rt: { id: string; bucket_id?: string; track?: Track; quote_amount?: number; notes?: string }) => {
        if (rt.track) {
          const bucketId = rt.bucket_id || 'uncategorized'
          if (!loadedBucketTracks[bucketId]) loadedBucketTracks[bucketId] = []
          loadedBucketTracks[bucketId].push({
            id: rt.id,
            track: rt.track,
            quote: rt.quote_amount || '',
            notes: rt.notes || ''
          })
        }
      })

      setBucketTracks(loadedBucketTracks)
    } else {
      const initialBucketTracks: Record<string, BucketTrack[]> = {}
      buckets.forEach(bucket => {
        initialBucketTracks[bucket.id] = []
      })
      initialBucketTracks['uncategorized'] = []
      setBucketTracks(initialBucketTracks)
    }

    setLoading(false)
  }, [profile.id, brief.id, buckets, generateAiSuggestions])

  useEffect(() => {
    void loadData()
    void markAsOpened()
  }, [loadData, markAsOpened])

  const addTrackToBucket = (bucketId: string, track: Track) => {
    const existsInBucket = bucketTracks[bucketId]?.some(bt => bt.track.id === track.id)
    if (existsInBucket) return

    setBucketTracks(prev => ({
      ...prev,
      [bucketId]: [...(prev[bucketId] || []), {
        id: crypto.randomUUID(),
        track,
        quote: track.one_stop_fee || '',
        notes: ''
      }]
    }))
    setShowTrackSearch(null)
    setTrackSearch('')
  }

  const removeTrackFromBucket = (bucketId: string, trackId: string) => {
    setBucketTracks(prev => ({
      ...prev,
      [bucketId]: prev[bucketId].filter(bt => bt.id !== trackId)
    }))
  }

  const updateTrackQuote = (bucketId: string, trackId: string, quote: number | '') => {
    setBucketTracks(prev => ({
      ...prev,
      [bucketId]: prev[bucketId].map(bt =>
        bt.id === trackId ? { ...bt, quote } : bt
      )
    }))
  }

  const updateTrackNotes = (bucketId: string, trackId: string, notes: string) => {
    setBucketTracks(prev => ({
      ...prev,
      [bucketId]: prev[bucketId].map(bt =>
        bt.id === trackId ? { ...bt, notes } : bt
      )
    }))
  }

  const filteredCatalog = catalogTracks.filter(track =>
    !trackSearch ||
    track.title.toLowerCase().includes(trackSearch.toLowerCase()) ||
    track.artist.toLowerCase().includes(trackSearch.toLowerCase())
  )

  const getTotalTracks = () => {
    return Object.values(bucketTracks).reduce((sum, tracks) => sum + tracks.length, 0)
  }

  const getTotalQuotes = () => {
    return Object.values(bucketTracks)
      .flat()
      .reduce((sum, bt) => sum + (typeof bt.quote === 'number' ? bt.quote : 0), 0)
  }

  const saveResponse = async (submit: boolean) => {
    setSaving(true)

    const { data: existingResponse } = await supabase
      .from('brief_responses')
      .select('id')
      .eq('brief_id', brief.id)
      .eq('responder_id', profile.id)
      .maybeSingle()

    let responseId = existingResponse?.id

    if (existingResponse) {
      await supabase
        .from('brief_responses')
        .update({
          message,
          status: submit ? 'submitted' : 'draft',
          submitted_at: submit ? new Date().toISOString() : null
        })
        .eq('id', existingResponse.id)

      await supabase.from('brief_response_tracks').delete().eq('response_id', existingResponse.id)
    } else {
      const { data: newResponse, error } = await supabase
        .from('brief_responses')
        .insert({
          brief_id: brief.id,
          send_id: briefSend.id,
          responder_id: profile.id,
          message,
          status: submit ? 'submitted' : 'draft',
          submitted_at: submit ? new Date().toISOString() : null
        })
        .select()
        .single()

      if (error) {
        console.error('Error creating response:', error)
        setSaving(false)
        return
      }

      responseId = newResponse.id
    }

    if (responseId) {
      const tracksToInsert: {
        response_id: string
        track_id: string
        bucket_id: string | null
        quote_amount: number | null
        notes: string | null
        position: number
      }[] = []

      Object.entries(bucketTracks).forEach(([bucketId, tracks]) => {
        tracks.forEach((bt, index) => {
          tracksToInsert.push({
            response_id: responseId!,
            track_id: bt.track.id,
            bucket_id: bucketId === 'uncategorized' ? null : bucketId,
            quote_amount: typeof bt.quote === 'number' ? bt.quote : null,
            notes: bt.notes || null,
            position: index
          })
        })
      })

      if (tracksToInsert.length > 0) {
        const { error } = await supabase.from('brief_response_tracks').insert(tracksToInsert)
        if (error) console.error('Error saving tracks:', error)
      }

      if (submit) {
        await supabase
          .from('brief_sends')
          .update({ submitted: true, submitted_at: new Date().toISOString() })
          .eq('id', briefSend.id)
      }
    }

    setSaving(false)
    onSuccess()
  }

  if (loading) {
    return (
      <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50">
        <Spinner />
      </div>
    )
  }

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
      <div className="bg-[#0D0D10] rounded-2xl w-full max-w-5xl max-h-[90vh] overflow-hidden flex flex-col">
        <div className="flex items-center justify-between p-4 border-b border-[#1A1A1E]">
          <div>
            <h2 className="font-['Playfair_Display'] text-xl text-white">{brief.title}</h2>
            <p className="text-sm text-[#888]">
              From: {brief.supervisor?.full_name || 'Unknown'} - {getDeadlineCountdown(brief.deadline)}
            </p>
          </div>
          <button onClick={onClose} className="p-2 text-[#666] hover:text-white transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto">
          <div className="grid grid-cols-3 gap-6 p-6">
            <div className="col-span-2 space-y-6">
              {brief.scene_description && (
                <div className="bg-[#1A1A1E] rounded-lg p-4">
                  <h3 className="flex items-center gap-2 text-xs font-semibold text-[#C8A97E] mb-2">
                    <FileText className="w-4 h-4" />
                    SCENE DESCRIPTION
                  </h3>
                  <p className="text-sm text-[#E8E8E8]">{brief.scene_description}</p>
                </div>
              )}

              {brief.usage_terms && (
                <div className="bg-[#1A1A1E] rounded-lg p-4">
                  <h3 className="flex items-center gap-2 text-xs font-semibold text-[#C8A97E] mb-2">
                    <Globe className="w-4 h-4" />
                    USAGE & TERMS
                  </h3>
                  <p className="text-sm text-[#E8E8E8] mb-2">{brief.usage_terms}</p>
                  <div className="flex flex-wrap gap-2 text-xs text-[#888]">
                    {brief.term_length && <span>- Term: {brief.term_length}</span>}
                    {brief.exclusivity && (
                      <span className="flex items-center gap-1 text-[#C8A97E]">
                        <Shield className="w-3 h-3" /> Exclusive
                      </span>
                    )}
                  </div>
                </div>
              )}

              {buckets.length > 0 && (
                <div>
                  <h3 className="flex items-center gap-2 text-xs font-semibold text-[#C8A97E] mb-3">
                    <DollarSign className="w-4 h-4" />
                    BUDGET BUCKETS
                  </h3>
                  <div className="flex gap-3">
                    {buckets.map(bucket => (
                      <div
                        key={bucket.id}
                        className="flex-1 bg-[#1A1A1E] rounded-lg p-3 border border-[#2A2A2E]"
                      >
                        <p className="text-sm font-medium text-[#E8E8E8]">{bucket.label}</p>
                        <p className="text-xs text-[#C8A97E]">
                          ${bucket.min_amount || 0} - ${bucket.max_amount || '?'}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {Object.keys(aiSuggestions).length > 0 && (
                <div className="bg-gradient-to-r from-[#C8A97E]/10 to-transparent rounded-lg p-4 border border-[#C8A97E]/20">
                  <h3 className="flex items-center gap-2 text-sm font-semibold text-[#C8A97E] mb-3">
                    <Sparkles className="w-4 h-4" />
                    AI Suggested Tracks
                  </h3>
                  <div className="space-y-4">
                    {buckets.map(bucket => {
                      const suggestions = aiSuggestions[bucket.id] || []
                      if (suggestions.length === 0) return null

                      return (
                        <div key={bucket.id}>
                          <p className="text-xs text-[#888] mb-2">{bucket.label}</p>
                          <div className="space-y-1">
                            {suggestions.slice(0, 3).map(({ track, score, reason }) => (
                              <div
                                key={track.id}
                                className="flex items-center gap-3 p-2 bg-[#0A0A0C] rounded-lg"
                              >
                                <button
                                  onClick={() => onPlayTrack(track)}
                                  className="w-8 h-8 rounded flex-shrink-0 flex items-center justify-center bg-[#1A1A1E]"
                                >
                                  {currentTrack?.id === track.id && playing ? (
                                    <Pause className="w-3 h-3 text-[#C8A97E]" />
                                  ) : (
                                    <Play className="w-3 h-3 text-[#E8E8E8] ml-0.5" />
                                  )}
                                </button>
                                <div className="flex-1 min-w-0">
                                  <p className="text-xs font-medium text-[#E8E8E8] truncate">{track.title}</p>
                                  <p className="text-[10px] text-[#666]">{reason}</p>
                                </div>
                                <span className="text-xs text-[#C8A97E]">{score}%</span>
                                <button
                                  onClick={() => addTrackToBucket(bucket.id, track)}
                                  className="px-2 py-1 bg-[#C8A97E] text-[#0A0A0C] rounded text-xs font-medium"
                                >
                                  Add
                                </button>
                              </div>
                            ))}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}
            </div>

            <div className="space-y-4">
              <div className="bg-[#1A1A1E] rounded-lg p-4">
                <h3 className="text-xs font-semibold text-[#888] mb-2">CREATIVE REQUIREMENTS</h3>
                {brief.moods && brief.moods.length > 0 && (
                  <div className="mb-3">
                    <p className="text-[10px] text-[#666] mb-1">Moods</p>
                    <div className="flex flex-wrap gap-1">
                      {brief.moods.map(mood => (
                        <MoodPill key={mood} mood={mood} />
                      ))}
                    </div>
                  </div>
                )}
                {brief.genres && brief.genres.length > 0 && (
                  <div className="mb-3">
                    <p className="text-[10px] text-[#666] mb-1">Genres</p>
                    <p className="text-xs text-[#E8E8E8]">{brief.genres.join(', ')}</p>
                  </div>
                )}
                {(brief.bpm_min || brief.bpm_max) && (
                  <div className="mb-3">
                    <p className="text-[10px] text-[#666] mb-1">BPM Range</p>
                    <p className="text-xs text-[#E8E8E8]">{brief.bpm_min || '?'} - {brief.bpm_max || '?'}</p>
                  </div>
                )}
                {brief.vocal_preference && (
                  <div>
                    <p className="text-[10px] text-[#666] mb-1">Vocals</p>
                    <p className="text-xs text-[#E8E8E8] capitalize">{brief.vocal_preference.replace('_', ' ')}</p>
                  </div>
                )}
              </div>

              {brief.reference_tracks && (
                <div className="bg-[#1A1A1E] rounded-lg p-4">
                  <h3 className="text-xs font-semibold text-[#888] mb-2">REFERENCES</h3>
                  <p className="text-xs text-[#E8E8E8]">{brief.reference_tracks}</p>
                </div>
              )}
            </div>
          </div>

          <div className="border-t border-[#1A1A1E] p-6">
            <h3 className="flex items-center gap-2 text-sm font-semibold text-[#C8A97E] mb-4">
              <FileText className="w-4 h-4" />
              YOUR RESPONSE
            </h3>

            <div className="space-y-4">
              {buckets.length > 0 ? (
                buckets.map(bucket => (
                  <BucketSection
                    key={bucket.id}
                    bucket={bucket}
                    tracks={bucketTracks[bucket.id] || []}
                    onAddTrack={() => setShowTrackSearch(bucket.id)}
                    onRemoveTrack={(trackId) => removeTrackFromBucket(bucket.id, trackId)}
                    onUpdateQuote={(trackId, quote) => updateTrackQuote(bucket.id, trackId, quote)}
                    onUpdateNotes={(trackId, notes) => updateTrackNotes(bucket.id, trackId, notes)}
                    onPlayTrack={onPlayTrack}
                    currentTrack={currentTrack}
                    playing={playing}
                    usageTerms={brief.usage_terms}
                  />
                ))
              ) : (
                <BucketSection
                  bucket={{ id: 'uncategorized', label: 'Tracks', brief_id: brief.id, position: 0, created_at: '' }}
                  tracks={bucketTracks['uncategorized'] || []}
                  onAddTrack={() => setShowTrackSearch('uncategorized')}
                  onRemoveTrack={(trackId) => removeTrackFromBucket('uncategorized', trackId)}
                  onUpdateQuote={(trackId, quote) => updateTrackQuote('uncategorized', trackId, quote)}
                  onUpdateNotes={(trackId, notes) => updateTrackNotes('uncategorized', trackId, notes)}
                  onPlayTrack={onPlayTrack}
                  currentTrack={currentTrack}
                  playing={playing}
                  usageTerms={brief.usage_terms}
                />
              )}

              <div>
                <label className="block text-xs text-[#888] mb-2">Message to Supervisor (optional)</label>
                <textarea
                  value={message}
                  onChange={e => setMessage(e.target.value)}
                  placeholder="I've pulled our best matches for this brief..."
                  rows={3}
                  className="w-full bg-[#1A1A1E] border border-[#2A2A2E] rounded-lg px-3 py-2 text-sm text-[#E8E8E8] placeholder-[#555] focus:outline-none focus:border-[#C8A97E] resize-none"
                />
              </div>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-between p-4 border-t border-[#1A1A1E]">
          <div className="text-sm text-[#888]">
            {getTotalTracks()} tracks - ${getTotalQuotes()} total quotes
          </div>
          <div className="flex gap-3">
            <button
              onClick={() => saveResponse(false)}
              disabled={saving}
              className="flex items-center gap-2 px-4 py-2 text-sm text-[#888] hover:text-[#E8E8E8] transition-colors disabled:opacity-50"
            >
              <Save className="w-4 h-4" />
              Save Draft
            </button>
            <button
              onClick={() => saveResponse(true)}
              disabled={saving || getTotalTracks() === 0}
              className="flex items-center gap-2 px-6 py-2 bg-[#C8A97E] text-[#0A0A0C] rounded-lg text-sm font-medium hover:bg-[#D4B88A] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {saving ? <Spinner /> : <Send className="w-4 h-4" />}
              Send Response
            </button>
          </div>
        </div>

        {showTrackSearch && (
          <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
            <div className="bg-[#0D0D10] rounded-xl w-full max-w-lg max-h-[70vh] overflow-hidden flex flex-col">
              <div className="flex items-center justify-between p-4 border-b border-[#1A1A1E]">
                <h3 className="text-sm font-medium text-[#E8E8E8]">Add Track</h3>
                <button
                  onClick={() => { setShowTrackSearch(null); setTrackSearch('') }}
                  className="p-1 text-[#666] hover:text-white"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
              <div className="p-4 border-b border-[#1A1A1E]">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#666]" />
                  <input
                    type="text"
                    value={trackSearch}
                    onChange={e => setTrackSearch(e.target.value)}
                    placeholder="Search your catalog..."
                    className="w-full bg-[#1A1A1E] border border-[#2A2A2E] rounded-lg pl-9 pr-3 py-2 text-sm text-[#E8E8E8] placeholder-[#555] focus:outline-none focus:border-[#C8A97E]"
                    autoFocus
                  />
                </div>
              </div>
              <div className="flex-1 overflow-y-auto">
                {filteredCatalog.length > 0 ? (
                  filteredCatalog.map(track => {
                    const moodColor = track.mood ? MOOD_COLORS[track.mood] : '#C8A97E'
                    return (
                      <button
                        key={track.id}
                        onClick={() => addTrackToBucket(showTrackSearch, track)}
                        className="w-full flex items-center gap-3 p-3 hover:bg-[#1A1A1E] transition-colors"
                      >
                        <div
                          className="w-10 h-10 rounded flex-shrink-0 flex items-center justify-center"
                          style={{ background: `linear-gradient(135deg, ${moodColor}60 0%, #1A1A1E 100%)` }}
                        >
                          <span className="text-sm font-semibold text-white/80">
                            {track.title.charAt(0).toUpperCase()}
                          </span>
                        </div>
                        <div className="flex-1 text-left">
                          <p className="text-sm font-medium text-[#E8E8E8]">{track.title}</p>
                          <p className="text-xs text-[#666]">{track.artist}</p>
                        </div>
                        {track.one_stop_fee && (
                          <span className="text-sm text-[#C8A97E]">${track.one_stop_fee}</span>
                        )}
                        <Plus className="w-4 h-4 text-[#C8A97E]" />
                      </button>
                    )
                  })
                ) : (
                  <div className="p-8 text-center text-[#666]">
                    No tracks found
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

function BucketSection({
  bucket,
  tracks,
  onAddTrack,
  onRemoveTrack,
  onUpdateQuote,
  onUpdateNotes,
  onPlayTrack,
  currentTrack,
  playing,
  usageTerms
}: {
  bucket: BriefBucket
  tracks: BucketTrack[]
  onAddTrack: () => void
  onRemoveTrack: (trackId: string) => void
  onUpdateQuote: (trackId: string, quote: number | '') => void
  onUpdateNotes: (trackId: string, notes: string) => void
  onPlayTrack: (track: Track) => void
  currentTrack: Track | null
  playing: boolean
  usageTerms?: string
}) {
  const [isExpanded, setIsExpanded] = useState(true)
  const totalQuotes = tracks.reduce((sum, t) => sum + (typeof t.quote === 'number' ? t.quote : 0), 0)

  return (
    <div className="bg-[#0D0D10] rounded-lg border border-[#1A1A1E] overflow-hidden">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center justify-between p-3 hover:bg-[#1A1A1E]/50 transition-colors"
      >
        <div className="flex items-center gap-3">
          <ChevronDown className={`w-4 h-4 text-[#666] transition-transform ${isExpanded ? '' : '-rotate-90'}`} />
          <span className="text-sm font-medium text-[#E8E8E8]">{bucket.label}</span>
          {bucket.min_amount !== undefined && bucket.max_amount !== undefined && (
            <span className="text-xs text-[#C8A97E]">
              ${bucket.min_amount} - ${bucket.max_amount}
            </span>
          )}
        </div>
        <div className="flex items-center gap-3 text-xs text-[#888]">
          <span>{tracks.length} tracks</span>
          {totalQuotes > 0 && <span className="text-[#C8A97E]">${totalQuotes}</span>}
        </div>
      </button>

      {isExpanded && (
        <div className="border-t border-[#1A1A1E]">
          {tracks.length > 0 ? (
            <div className="divide-y divide-[#1A1A1E]/50">
              {tracks.map(bt => {
                const moodColor = bt.track.mood ? MOOD_COLORS[bt.track.mood] : '#C8A97E'
                const isCurrentTrack = currentTrack?.id === bt.track.id

                return (
                  <div key={bt.id} className="flex items-center gap-3 p-3">
                    <GripVertical className="w-4 h-4 text-[#333] cursor-grab" />

                    <button
                      onClick={() => onPlayTrack(bt.track)}
                      className="w-10 h-10 rounded flex-shrink-0 flex items-center justify-center"
                      style={{ background: `linear-gradient(135deg, ${moodColor}60 0%, #1A1A1E 100%)` }}
                    >
                      {isCurrentTrack && playing ? (
                        <Pause className="w-4 h-4 text-[#C8A97E]" />
                      ) : (
                        <Play className="w-4 h-4 text-[#E8E8E8] ml-0.5" />
                      )}
                    </button>

                    <div className="flex-1 min-w-0">
                      <p className={`text-sm font-medium truncate ${isCurrentTrack ? 'text-[#C8A97E]' : 'text-[#E8E8E8]'}`}>
                        {bt.track.title}
                      </p>
                      <p className="text-xs text-[#666] truncate">{bt.track.artist}</p>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="text-xs text-[#666]">$</span>
                      <input
                        type="number"
                        value={bt.quote}
                        onChange={e => onUpdateQuote(bt.id, e.target.value ? parseInt(e.target.value) : '')}
                        placeholder="Quote"
                        className="w-20 bg-[#1A1A1E] border border-[#2A2A2E] rounded px-2 py-1 text-sm text-[#E8E8E8] focus:outline-none focus:border-[#C8A97E]"
                      />
                    </div>

                    <input
                      type="text"
                      value={bt.notes}
                      onChange={e => onUpdateNotes(bt.id, e.target.value)}
                      placeholder="Notes..."
                      className="w-32 bg-[#1A1A1E] border border-[#2A2A2E] rounded px-2 py-1 text-sm text-[#E8E8E8] placeholder-[#555] focus:outline-none focus:border-[#C8A97E]"
                    />

                    <button
                      onClick={() => onRemoveTrack(bt.id)}
                      className="p-1 text-[#666] hover:text-red-400 transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                )
              })}
            </div>
          ) : (
            <div className="p-6 text-center">
              <p className="text-sm text-[#666] mb-2">No tracks added yet</p>
              {usageTerms && (
                <p className="text-xs text-[#555] mb-3">Quote for: {usageTerms}</p>
              )}
            </div>
          )}

          <div className="p-3 border-t border-[#1A1A1E]">
            <button
              onClick={onAddTrack}
              className="flex items-center gap-2 px-3 py-2 text-sm text-[#C8A97E] hover:bg-[#C8A97E]/10 rounded-lg transition-colors"
            >
              <Plus className="w-4 h-4" />
              Add Track
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
