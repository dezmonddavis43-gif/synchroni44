import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import { Spinner, EmptyState } from '../shared/UI'
import { MOOD_COLORS } from '../../lib/constants'
import {
  Clock, Eye, Check, Play, Pause, Users, DollarSign,
  Plus, Calendar, Mail, MailOpen, Send
} from 'lucide-react'
import { BriefCreator } from './BriefCreator'
import type { Profile, Brief, BriefSend, BriefBucket, BriefResponse, Track } from '../../lib/types'

interface BriefTrackingProps {
  profile: Profile
  onPlayTrack: (track: Track) => void
  currentTrack: Track | null
  playing: boolean
}

interface BriefWithDetails extends Brief {
  sends: BriefSendWithDetails[]
  responses: BriefResponseWithDetails[]
  buckets: BriefBucket[]
}

interface BriefSendWithDetails extends BriefSend {
  contact?: { name: string; company?: string; email: string }
}

interface BriefResponseWithDetails extends Omit<BriefResponse, 'tracks'> {
  tracks: {
    id: string
    track_id: string
    bucket_id?: string
    quote_amount?: number
    notes?: string
    track?: Track
  }[]
}

function formatDate(dateStr?: string): string {
  if (!dateStr) return '-'
  return new Date(dateStr).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  })
}

function formatDateTime(dateStr?: string): string {
  if (!dateStr) return '-'
  return new Date(dateStr).toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit'
  })
}

function getDeadlineStatus(deadline?: string): { label: string; color: string } {
  if (!deadline) return { label: 'No deadline', color: '#666' }

  const now = new Date()
  const deadlineDate = new Date(deadline)
  const diffMs = deadlineDate.getTime() - now.getTime()
  const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24))

  if (diffDays < 0) return { label: 'Expired', color: '#EF4444' }
  if (diffDays === 0) return { label: 'Due today', color: '#EF4444' }
  if (diffDays === 1) return { label: '1 day left', color: '#F59E0B' }
  if (diffDays <= 3) return { label: `${diffDays} days left`, color: '#F59E0B' }
  return { label: `${diffDays} days left`, color: '#888' }
}

function getBriefStatus(brief: BriefWithDetails): { label: string; color: string } {
  if (brief.status === 'draft') return { label: 'Draft', color: '#666' }
  if (brief.status === 'closed') return { label: 'Closed', color: '#666' }

  const hasResponses = brief.responses.some(r => r.status === 'submitted')
  if (hasResponses) return { label: 'Responses In', color: '#10B981' }

  return { label: 'Sent', color: '#3B82F6' }
}

export function BriefTracking({ profile, onPlayTrack, currentTrack, playing }: BriefTrackingProps) {
  const [briefs, setBriefs] = useState<BriefWithDetails[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedBriefId, setSelectedBriefId] = useState<string | null>(null)
  const [showCreator, setShowCreator] = useState(false)

  useEffect(() => {
    loadBriefs()
  }, [profile.id])

  const loadBriefs = async () => {
    setLoading(true)

    const { data: briefsData, error } = await supabase
      .from('briefs')
      .select('*')
      .eq('supervisor_id', profile.id)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error loading briefs:', error)
      setLoading(false)
      return
    }

    if (briefsData && briefsData.length > 0) {
      const briefIds = briefsData.map(b => b.id)

      const [sendsRes, responsesRes, bucketsRes] = await Promise.all([
        supabase.from('brief_sends').select('*').in('brief_id', briefIds),
        supabase.from('brief_responses').select('*, tracks:brief_response_tracks(*, track:tracks(*))').in('brief_id', briefIds),
        supabase.from('brief_buckets').select('*').in('brief_id', briefIds)
      ])

      const briefsWithDetails = briefsData.map(brief => ({
        ...brief,
        sends: (sendsRes.data || []).filter(s => s.brief_id === brief.id),
        responses: (responsesRes.data || []).filter(r => r.brief_id === brief.id),
        buckets: (bucketsRes.data || []).filter(b => b.brief_id === brief.id).sort((a, b) => a.position - b.position)
      }))

      setBriefs(briefsWithDetails)
      if (briefsWithDetails.length > 0 && !selectedBriefId) {
        setSelectedBriefId(briefsWithDetails[0].id)
      }
    }

    setLoading(false)
  }

  const selectedBrief = briefs.find(b => b.id === selectedBriefId)

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full bg-[#0A0A0C]">
        <Spinner />
      </div>
    )
  }

  return (
    <>
    <div className="h-[calc(100vh-76px)] flex bg-[#0A0A0C]">
      <div className="w-80 border-r border-[#1A1A1E] flex flex-col">
        <div className="p-4 border-b border-[#1A1A1E]">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-['Playfair_Display'] text-lg text-white">Briefs</h2>
            <button
              onClick={() => setShowCreator(true)}
              className="flex items-center gap-1 px-3 py-1.5 bg-[#C8A97E] text-[#0A0A0C] rounded-lg text-sm font-medium hover:bg-[#D4B88A] transition-colors"
            >
              <Plus className="w-4 h-4" />
              New
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">
          {briefs.length > 0 ? (
            <div className="divide-y divide-[#1A1A1E]">
              {briefs.map(brief => {
                const status = getBriefStatus(brief)
                const deadline = getDeadlineStatus(brief.deadline)
                const responseCount = brief.responses.filter(r => r.status === 'submitted').length

                return (
                  <button
                    key={brief.id}
                    onClick={() => setSelectedBriefId(brief.id)}
                    className={`w-full p-4 text-left transition-colors ${
                      selectedBriefId === brief.id
                        ? 'bg-[#C8A97E]/10 border-l-[3px] border-[#C8A97E]'
                        : 'hover:bg-[#1A1A1E] border-l-[3px] border-transparent'
                    }`}
                  >
                    <div className="flex items-start justify-between mb-1">
                      <h3 className="text-sm font-medium text-[#E8E8E8] truncate flex-1">
                        {brief.title}
                      </h3>
                      <span
                        className="ml-2 px-2 py-0.5 rounded text-[10px] font-medium"
                        style={{ backgroundColor: `${status.color}20`, color: status.color }}
                      >
                        {status.label}
                      </span>
                    </div>
                    {brief.client && (
                      <p className="text-xs text-[#666] mb-2">{brief.client}</p>
                    )}
                    <div className="flex items-center gap-3 text-xs text-[#666]">
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        {formatDate(brief.sent_at || brief.created_at)}
                      </span>
                      <span
                        className="flex items-center gap-1"
                        style={{ color: deadline.color }}
                      >
                        <Clock className="w-3 h-3" />
                        {deadline.label}
                      </span>
                    </div>
                    <div className="flex items-center gap-3 mt-2 text-xs">
                      <span className="text-[#888]">
                        <Users className="w-3 h-3 inline mr-1" />
                        {brief.sends.length}
                      </span>
                      {responseCount > 0 && (
                        <span className="text-[#10B981]">
                          <Check className="w-3 h-3 inline mr-1" />
                          {responseCount} responses
                        </span>
                      )}
                    </div>
                  </button>
                )
              })}
            </div>
          ) : (
            <div className="p-4">
              <EmptyState
                title="No Briefs Yet"
                description="Create your first brief to start receiving music submissions"
              />
            </div>
          )}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        {selectedBrief ? (
          <BriefDetail
            brief={selectedBrief}
            onPlayTrack={onPlayTrack}
            currentTrack={currentTrack}
            playing={playing}
          />
        ) : (
          <div className="flex items-center justify-center h-full">
            <p className="text-[#666]">Select a brief to view details</p>
          </div>
        )}
      </div>
    </div>

    {showCreator && (
      <BriefCreator
        profile={profile}
        onClose={() => setShowCreator(false)}
        onSuccess={() => {
          setShowCreator(false)
          loadBriefs()
        }}
      />
    )}
    </>
  )
}

function BriefDetail({
  brief,
  onPlayTrack,
  currentTrack,
  playing
}: {
  brief: BriefWithDetails
  onPlayTrack: (track: Track) => void
  currentTrack: Track | null
  playing: boolean
}) {
  const [activeTab, setActiveTab] = useState<'tracking' | 'responses'>('tracking')

  const submittedResponses = brief.responses.filter(r => r.status === 'submitted')
  const totalTracks = submittedResponses.reduce((sum, r) => sum + (r.tracks?.length || 0), 0)

  return (
    <div className="p-6">
      <div className="mb-6">
        <div className="flex items-start justify-between mb-2">
          <div>
            <h1 className="font-['Playfair_Display'] text-2xl text-white mb-1">{brief.title}</h1>
            {brief.client && <p className="text-sm text-[#888]">{brief.client}</p>}
          </div>
          <div className="flex items-center gap-2">
            {brief.priority === 'urgent' && (
              <span className="px-2 py-1 rounded text-xs font-medium bg-[#F59E0B]/20 text-[#F59E0B]">
                Urgent
              </span>
            )}
            {brief.priority === 'rush' && (
              <span className="px-2 py-1 rounded text-xs font-medium bg-[#EF4444]/20 text-[#EF4444]">
                Rush
              </span>
            )}
          </div>
        </div>

        <div className="flex items-center gap-6 text-sm">
          <div className="flex items-center gap-2 text-[#888]">
            <Send className="w-4 h-4" />
            Sent to {brief.sends.length} recipients
          </div>
          <div className="flex items-center gap-2 text-[#888]">
            <Eye className="w-4 h-4" />
            {brief.sends.filter(s => s.opened).length} opened
          </div>
          <div className="flex items-center gap-2 text-[#10B981]">
            <Check className="w-4 h-4" />
            {submittedResponses.length} responses ({totalTracks} tracks)
          </div>
        </div>
      </div>

      <div className="flex gap-1 mb-6 border-b border-[#1A1A1E]">
        <button
          onClick={() => setActiveTab('tracking')}
          className={`px-4 py-3 text-sm font-medium transition-colors relative ${
            activeTab === 'tracking' ? 'text-[#E8E8E8]' : 'text-[#666]'
          }`}
        >
          Tracking
          {activeTab === 'tracking' && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#C8A97E]" />}
        </button>
        <button
          onClick={() => setActiveTab('responses')}
          className={`px-4 py-3 text-sm font-medium transition-colors relative ${
            activeTab === 'responses' ? 'text-[#E8E8E8]' : 'text-[#666]'
          }`}
        >
          Responses
          {submittedResponses.length > 0 && (
            <span className="ml-2 px-1.5 py-0.5 rounded-full bg-[#10B981] text-[#0A0A0C] text-xs">
              {submittedResponses.length}
            </span>
          )}
          {activeTab === 'responses' && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#C8A97E]" />}
        </button>
      </div>

      {activeTab === 'tracking' ? (
        <TrackingTable sends={brief.sends} />
      ) : (
        <ResponsesView
          responses={submittedResponses}
          buckets={brief.buckets}
          onPlayTrack={onPlayTrack}
          currentTrack={currentTrack}
          playing={playing}
        />
      )}

      {brief.buckets.length > 0 && (
        <div className="mt-8 pt-6 border-t border-[#1A1A1E]">
          <h3 className="flex items-center gap-2 text-sm font-semibold text-[#C8A97E] mb-4">
            <DollarSign className="w-4 h-4" />
            BUDGET BUCKETS SUMMARY
          </h3>
          <div className="grid grid-cols-3 gap-4">
            {brief.buckets.map(bucket => {
              const tracksInBucket = submittedResponses.flatMap(r =>
                (r.tracks || []).filter(t => t.bucket_id === bucket.id)
              )
              const quotes = tracksInBucket.filter(t => t.quote_amount).map(t => t.quote_amount!)
              const avgQuote = quotes.length > 0 ? Math.round(quotes.reduce((a, b) => a + b, 0) / quotes.length) : 0

              return (
                <div key={bucket.id} className="bg-[#1A1A1E] rounded-lg p-4">
                  <h4 className="text-sm font-medium text-[#E8E8E8] mb-1">{bucket.label}</h4>
                  <p className="text-xs text-[#666] mb-3">
                    ${bucket.min_amount || 0} - ${bucket.max_amount || '?'}
                  </p>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-[#888]">{tracksInBucket.length} tracks</span>
                    {avgQuote > 0 && (
                      <span className="text-sm text-[#C8A97E] font-medium">Avg: ${avgQuote}</span>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}

function TrackingTable({ sends }: { sends: BriefSendWithDetails[] }) {
  const getSendStatus = (send: BriefSendWithDetails) => {
    if (send.submitted) return { label: 'Submitted', color: '#10B981', icon: Check }
    if (send.opened) return { label: 'Opened', color: '#3B82F6', icon: MailOpen }
    return { label: 'Sent', color: '#888', icon: Mail }
  }

  return (
    <div className="bg-[#0D0D10] rounded-xl overflow-hidden">
      <div className="grid grid-cols-[2fr_1fr_1fr_1fr_100px] gap-4 px-4 py-3 text-xs text-[#666] uppercase tracking-wider border-b border-[#1A1A1E]">
        <span>Recipient</span>
        <span>Sent</span>
        <span>Opened</span>
        <span>Submitted</span>
        <span>Status</span>
      </div>

      {sends.length > 0 ? (
        sends.map(send => {
          const status = getSendStatus(send)
          const StatusIcon = status.icon

          return (
            <div
              key={send.id}
              className="grid grid-cols-[2fr_1fr_1fr_1fr_100px] gap-4 px-4 py-3 border-b border-[#1A1A1E]/50 items-center"
            >
              <div>
                <p className="text-sm text-[#E8E8E8]">{send.recipient_name || 'Unknown'}</p>
                {send.recipient_company && (
                  <p className="text-xs text-[#666]">{send.recipient_company}</p>
                )}
              </div>
              <span className="text-sm text-[#888]">{formatDateTime(send.sent_at)}</span>
              <span className="text-sm text-[#888]">
                {send.opened ? formatDateTime(send.opened_at) : '-'}
              </span>
              <span className="text-sm text-[#888]">
                {send.submitted ? formatDateTime(send.submitted_at) : '-'}
              </span>
              <span
                className="inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-medium"
                style={{ backgroundColor: `${status.color}20`, color: status.color }}
              >
                <StatusIcon className="w-3 h-3" />
                {status.label}
              </span>
            </div>
          )
        })
      ) : (
        <div className="p-8 text-center text-[#666]">
          No recipients yet
        </div>
      )}
    </div>
  )
}

function ResponsesView({
  responses,
  buckets,
  onPlayTrack,
  currentTrack,
  playing
}: {
  responses: BriefResponseWithDetails[]
  buckets: BriefBucket[]
  onPlayTrack: (track: Track) => void
  currentTrack: Track | null
  playing: boolean
}) {
  if (responses.length === 0) {
    return (
      <EmptyState
        title="No Responses Yet"
        description="Check back later for submissions"
      />
    )
  }

  return (
    <div className="space-y-6">
      {responses.map(response => (
        <div key={response.id} className="bg-[#0D0D10] rounded-xl overflow-hidden">
          <div className="p-4 border-b border-[#1A1A1E]">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-medium text-[#E8E8E8]">
                  {response.responder?.full_name || response.responder?.label_name || 'Unknown'}
                </h3>
                {response.responder?.company && (
                  <p className="text-xs text-[#666]">{response.responder.company}</p>
                )}
              </div>
              <span className="text-xs text-[#888]">
                Submitted {formatDateTime(response.submitted_at)}
              </span>
            </div>
            {response.message && (
              <p className="mt-3 text-sm text-[#888] italic">"{response.message}"</p>
            )}
          </div>

          {buckets.length > 0 ? (
            <div className="divide-y divide-[#1A1A1E]">
              {buckets.map(bucket => {
                const bucketTracks = (response.tracks || []).filter(t => t.bucket_id === bucket.id)
                if (bucketTracks.length === 0) return null

                return (
                  <div key={bucket.id} className="p-4">
                    <h4 className="text-xs font-semibold text-[#C8A97E] mb-3">
                      {bucket.label} (${bucket.min_amount || 0} - ${bucket.max_amount || '?'})
                    </h4>
                    <div className="space-y-2">
                      {bucketTracks.map(rt => (
                        <ResponseTrackRow
                          key={rt.id}
                          trackData={rt}
                          onPlay={() => rt.track && onPlayTrack(rt.track)}
                          isPlaying={rt.track?.id === currentTrack?.id && playing}
                        />
                      ))}
                    </div>
                  </div>
                )
              })}
            </div>
          ) : (
            <div className="p-4 space-y-2">
              {(response.tracks || []).map(rt => (
                <ResponseTrackRow
                  key={rt.id}
                  trackData={rt}
                  onPlay={() => rt.track && onPlayTrack(rt.track)}
                  isPlaying={rt.track?.id === currentTrack?.id && playing}
                />
              ))}
            </div>
          )}
        </div>
      ))}
    </div>
  )
}

function ResponseTrackRow({
  trackData,
  onPlay,
  isPlaying
}: {
  trackData: { track?: Track; quote_amount?: number; notes?: string }
  onPlay: () => void
  isPlaying: boolean
}) {
  const track = trackData.track
  if (!track) return null

  const moodColor = track.mood ? MOOD_COLORS[track.mood] : '#C8A97E'

  return (
    <div className="flex items-center gap-3 p-2 rounded-lg hover:bg-[#1A1A1E] transition-colors">
      <button
        onClick={onPlay}
        className="w-10 h-10 rounded flex-shrink-0 flex items-center justify-center"
        style={{ background: `linear-gradient(135deg, ${moodColor}60 0%, #1A1A1E 100%)` }}
      >
        {isPlaying ? (
          <Pause className="w-4 h-4 text-[#C8A97E]" />
        ) : (
          <Play className="w-4 h-4 text-[#E8E8E8] ml-0.5" />
        )}
      </button>

      <div className="flex-1 min-w-0">
        <p className={`text-sm font-medium truncate ${isPlaying ? 'text-[#C8A97E]' : 'text-[#E8E8E8]'}`}>
          {track.title}
        </p>
        <p className="text-xs text-[#666] truncate">{track.artist}</p>
      </div>

      {trackData.quote_amount && (
        <span className="text-sm text-[#C8A97E] font-medium">
          ${trackData.quote_amount}
        </span>
      )}

      <button className="px-3 py-1.5 bg-[#1A1A1E] text-[#888] rounded text-xs hover:text-[#E8E8E8] transition-colors">
        Save to Project
      </button>
      <button className="px-3 py-1.5 bg-[#C8A97E] text-[#0A0A0C] rounded text-xs font-medium hover:bg-[#D4B88A] transition-colors">
        Request License
      </button>
    </div>
  )
}
