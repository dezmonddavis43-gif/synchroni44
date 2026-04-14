import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../../lib/supabase'
import { Spinner, EmptyState, MoodPill } from '../shared/UI'
import { BriefResponse } from './BriefResponse'
import { Clock, Calendar, DollarSign, FileText, User } from 'lucide-react'
import type { Profile, Brief, BriefBucket, BriefSend, Track } from '../../lib/types'

interface BriefInboxProps {
  profile: Profile
  onPlayTrack: (track: Track) => void
  currentTrack: Track | null
  playing: boolean
}

interface BriefSendWithDetails extends BriefSend {
  brief: Brief & { buckets?: BriefBucket[]; supervisor?: Profile }
}

function formatDate(dateStr?: string): string {
  if (!dateStr) return '-'
  return new Date(dateStr).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  })
}

function getDeadlineStatus(deadline?: string): { label: string; color: string; urgent: boolean } {
  if (!deadline) return { label: 'No deadline', color: '#666', urgent: false }

  const now = new Date()
  const deadlineDate = new Date(deadline)
  const diffMs = deadlineDate.getTime() - now.getTime()
  const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24))

  if (diffDays < 0) return { label: 'Expired', color: '#EF4444', urgent: true }
  if (diffDays === 0) return { label: 'Due today', color: '#EF4444', urgent: true }
  if (diffDays === 1) return { label: '1 day left', color: '#F59E0B', urgent: true }
  if (diffDays <= 3) return { label: `${diffDays} days left`, color: '#F59E0B', urgent: false }
  return { label: `${diffDays} days left`, color: '#888', urgent: false }
}

function getBriefSendStatus(send: BriefSendWithDetails): { label: string; color: string } {
  if (send.submitted) return { label: 'Responded', color: '#10B981' }

  const deadline = getDeadlineStatus(send.brief.deadline)
  if (deadline.label === 'Expired') return { label: 'Expired', color: '#EF4444' }

  if (!send.opened) return { label: 'New', color: '#C8A97E' }
  return { label: 'In Progress', color: '#3B82F6' }
}

export function BriefInbox({ profile, onPlayTrack, currentTrack, playing }: BriefInboxProps) {
  const [briefs, setBriefs] = useState<BriefSendWithDetails[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedBrief, setSelectedBrief] = useState<BriefSendWithDetails | null>(null)

  const loadBriefs = useCallback(async () => {
    setLoading(true)

    const { data, error } = await supabase
      .from('brief_sends')
      .select(`
        *,
        brief:briefs(
          *,
          buckets:brief_buckets(*),
          supervisor:profiles(*)
        )
      `)
      .eq('recipient_id', profile.id)
      .order('sent_at', { ascending: false })

    if (error) {
      console.error('Error loading briefs:', error)
    } else if (data?.length) {
      setBriefs(data.filter(d => d.brief) as BriefSendWithDetails[])
    } else {
      const seeded = Array.from({ length: 5 }).map((_, i) => ({
        id: `seed-send-${i + 1}`,
        brief_id: `seed-brief-${i + 1}`,
        recipient_id: profile.id,
        sent_at: new Date(Date.now() - i * 86400000).toISOString(),
        opened: false,
        submitted: false,
        brief: {
          id: `seed-brief-${i + 1}`,
          title: ['Sports Promo', 'Lifestyle Film', 'Docu Teaser', 'Auto Spot', 'Tech Launch'][i],
          description: 'Seeded demo brief shown when Supabase is empty.',
          mood: ['Aggressive', 'Hopeful', 'Nostalgic', 'Cinematic', 'Tense'][i],
          genre: ['Hip-Hop', 'Pop', 'Ambient', 'Electronic', 'Electronic'][i],
          is_private: false,
          supervisor_id: 'demo',
          status: 'open',
          created_at: new Date().toISOString(),
          buckets: [],
          supervisor: { id: 'demo', email: 'supervisor@synchroni.demo', full_name: 'Demo Supervisor', role: 'supervisor', created_at: new Date().toISOString() }
        }
      })) as unknown as BriefSendWithDetails[]
      setBriefs(seeded)
    }

    setLoading(false)
  }, [profile.id])

  useEffect(() => {
    void loadBriefs()
  }, [loadBriefs])

  const handleBriefClick = async (briefSend: BriefSendWithDetails) => {
    if (!briefSend.opened) {
      await supabase
        .from('brief_sends')
        .update({ opened: true, opened_at: new Date().toISOString() })
        .eq('id', briefSend.id)

      setBriefs(prev => prev.map(b =>
        b.id === briefSend.id ? { ...b, opened: true, opened_at: new Date().toISOString() } : b
      ))
    }
    setSelectedBrief(briefSend)
  }

  const handleResponseSuccess = () => {
    setSelectedBrief(null)
    loadBriefs()
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full bg-[#0A0A0C]">
        <Spinner />
      </div>
    )
  }

  const newBriefs = briefs.filter(b => !b.opened && !b.submitted)
  const inProgressBriefs = briefs.filter(b => b.opened && !b.submitted)
  const respondedBriefs = briefs.filter(b => b.submitted)

  return (
    <div className="h-[calc(100vh-76px)] overflow-y-auto bg-[#0A0A0C] p-6">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <h1 className="font-['Playfair_Display'] text-2xl text-white">Briefs</h1>
          <div className="flex items-center gap-4 text-sm">
            <span className="flex items-center gap-1 text-[#C8A97E]">
              <span className="w-2 h-2 rounded-full bg-[#C8A97E]" />
              {newBriefs.length} New
            </span>
            <span className="flex items-center gap-1 text-[#3B82F6]">
              <span className="w-2 h-2 rounded-full bg-[#3B82F6]" />
              {inProgressBriefs.length} In Progress
            </span>
            <span className="flex items-center gap-1 text-[#10B981]">
              <span className="w-2 h-2 rounded-full bg-[#10B981]" />
              {respondedBriefs.length} Responded
            </span>
          </div>
        </div>

        {briefs.length > 0 ? (
          <div className="space-y-3">
            {briefs.map(briefSend => {
              const status = getBriefSendStatus(briefSend)
              const deadline = getDeadlineStatus(briefSend.brief.deadline)
              const isNew = !briefSend.opened && !briefSend.submitted

              return (
                <button
                  key={briefSend.id}
                  onClick={() => handleBriefClick(briefSend)}
                  className={`w-full text-left bg-[#0D0D10] rounded-xl p-4 transition-all hover:bg-[#1A1A1E] ${
                    isNew ? 'border-l-4 border-[#C8A97E]' : 'border-l-4 border-transparent'
                  }`}
                >
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className={`text-base font-medium ${isNew ? 'text-[#E8E8E8]' : 'text-[#888]'}`}>
                          {briefSend.brief.title}
                        </h3>
                        {briefSend.brief.priority === 'urgent' && (
                          <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-[#F59E0B]/20 text-[#F59E0B]">
                            Urgent
                          </span>
                        )}
                        {briefSend.brief.priority === 'rush' && (
                          <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-[#EF4444]/20 text-[#EF4444]">
                            Rush
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-3 text-sm text-[#666]">
                        <span className="flex items-center gap-1">
                          <User className="w-3 h-3" />
                          {briefSend.brief.supervisor?.full_name || 'Unknown'}
                        </span>
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          {formatDate(briefSend.sent_at)}
                        </span>
                        <span
                          className="flex items-center gap-1"
                          style={{ color: deadline.color }}
                        >
                          <Clock className="w-3 h-3" />
                          {deadline.label}
                        </span>
                      </div>
                    </div>
                    <span
                      className="px-2 py-1 rounded text-xs font-medium"
                      style={{ backgroundColor: `${status.color}20`, color: status.color }}
                    >
                      {status.label}
                    </span>
                  </div>

                  {briefSend.brief.scene_description && (
                    <p className="text-sm text-[#666] mb-3 line-clamp-2">
                      {briefSend.brief.scene_description}
                    </p>
                  )}

                  <div className="flex items-center gap-4">
                    {briefSend.brief.moods && briefSend.brief.moods.length > 0 && (
                      <div className="flex gap-1">
                        {briefSend.brief.moods.slice(0, 3).map(mood => (
                          <MoodPill key={mood} mood={mood} />
                        ))}
                        {briefSend.brief.moods.length > 3 && (
                          <span className="text-xs text-[#666]">+{briefSend.brief.moods.length - 3}</span>
                        )}
                      </div>
                    )}

                    {briefSend.brief.buckets && briefSend.brief.buckets.length > 0 && (
                      <div className="flex items-center gap-1 text-xs text-[#888]">
                        <DollarSign className="w-3 h-3" />
                        {briefSend.brief.buckets.length} budget {briefSend.brief.buckets.length === 1 ? 'tier' : 'tiers'}
                      </div>
                    )}

                    {briefSend.brief.usage_terms && (
                      <div className="flex items-center gap-1 text-xs text-[#888]">
                        <FileText className="w-3 h-3" />
                        Terms included
                      </div>
                    )}
                  </div>
                </button>
              )
            })}
          </div>
        ) : (
          <EmptyState
            title="No Briefs Yet"
            description="When music supervisors send you briefs, they'll appear here"
          />
        )}
      </div>

      {selectedBrief && (
        <BriefResponse
          profile={profile}
          briefSend={selectedBrief}
          onClose={() => setSelectedBrief(null)}
          onSuccess={handleResponseSuccess}
          onPlayTrack={onPlayTrack}
          currentTrack={currentTrack}
          playing={playing}
        />
      )}
    </div>
  )
}
