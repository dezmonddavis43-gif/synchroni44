import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import { Card, Btn, PageTitle, Spinner, EmptyState, Tabs, MoodPill } from '../shared/UI'
import { FileText, Sparkles, Send, Calendar, DollarSign } from 'lucide-react'
import type { Profile, Brief } from '../../lib/types'

interface ArtistBriefsProps {
  profile: Profile
  onUseBrief: (brief: Brief) => void
}

export function ArtistBriefs({ profile, onUseBrief }: ArtistBriefsProps) {
  const [privateBriefs, setPrivateBriefs] = useState<Brief[]>([])
  const [publicBriefs, setPublicBriefs] = useState<Brief[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('For You')

  useEffect(() => {
    loadBriefs()
  }, [profile.id])

  const loadBriefs = async () => {
    setLoading(true)

    const [privateRes, publicRes] = await Promise.all([
      supabase
        .from('brief_recipients')
        .select('brief:briefs(*)')
        .eq('artist_id', profile.id),
      supabase
        .from('briefs')
        .select('*')
        .eq('is_private', false)
        .in('status', ['open', 'published'])
        .order('created_at', { ascending: false })
    ])

    if (privateRes.data) {
      const briefs = privateRes.data
        .map(br => br.brief as unknown as Brief)
        .filter(Boolean)
        .filter(b => b.status === 'open' || b.status === 'published')
      setPrivateBriefs(briefs)
    }

    if (publicRes.data) {
      setPublicBriefs(publicRes.data)
    }

    setLoading(false)
  }

  const getDaysUntilDeadline = (deadline?: string) => {
    if (!deadline) return null
    const diff = new Date(deadline).getTime() - new Date().getTime()
    return Math.ceil(diff / (1000 * 60 * 60 * 24))
  }

  const briefs = activeTab === 'For You' ? privateBriefs : publicBriefs

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Spinner />
      </div>
    )
  }

  return (
    <div className="p-6 h-[calc(100vh-76px)] overflow-y-auto">
      <PageTitle title="Briefs" sub="Find sync opportunities that match your style" />

      <div className="mb-6">
        <Tabs
          tabs={[
            { id: 'For You', label: 'For You', count: privateBriefs.length > 0 ? privateBriefs.length : undefined },
            { id: 'Open', label: 'Open' }
          ]}
          active={activeTab}
          onChange={setActiveTab}
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        {briefs.length > 0 ? (
          briefs.map(brief => {
            const daysUntil = getDaysUntilDeadline(brief.deadline)

            return (
              <Card key={brief.id} className="p-4">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <h3 className="text-[#E8E8E8] font-medium mb-1">{brief.title}</h3>
                    <p className="text-xs text-[#666]">{brief.scene_type}</p>
                  </div>
                  {activeTab === 'For You' && (
                    <span className="px-2 py-0.5 rounded text-xs bg-[#C8A97E]/20 text-[#C8A97E]">
                      Private
                    </span>
                  )}
                </div>

                {brief.description && (
                  <p className="text-sm text-[#888] mb-3 line-clamp-2">{brief.description}</p>
                )}

                <div className="flex flex-wrap gap-2 mb-4">
                  {brief.mood && <MoodPill mood={brief.mood} />}
                  {brief.genre && (
                    <span className="px-2 py-0.5 rounded text-xs bg-[#1A1A1E] text-[#888]">
                      {brief.genre}
                    </span>
                  )}
                  {brief.bpm_min && brief.bpm_max && (
                    <span className="px-2 py-0.5 rounded text-xs bg-[#1A1A1E] text-[#888]">
                      {brief.bpm_min}-{brief.bpm_max} BPM
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-4 mb-4 text-xs text-[#666]">
                  {brief.budget && (
                    <div className="flex items-center gap-1">
                      <DollarSign className="w-3 h-3" />
                      <span>${brief.budget.toLocaleString()}</span>
                    </div>
                  )}
                  {daysUntil !== null && (
                    <div className={`flex items-center gap-1 ${daysUntil <= 7 ? 'text-[#FF9B4D]' : ''}`}>
                      <Calendar className="w-3 h-3" />
                      <span>
                        {daysUntil > 0 ? `${daysUntil} days left` : daysUntil === 0 ? 'Due today' : 'Expired'}
                      </span>
                    </div>
                  )}
                </div>

                <div className="flex gap-2">
                  <Btn size="sm" className="flex-1" onClick={() => onUseBrief(brief)}>
                    <Sparkles className="w-3 h-3" /> Use in AI Creator
                  </Btn>
                  <Btn size="sm" variant="ghost">
                    <Send className="w-3 h-3" /> Submit Track
                  </Btn>
                </div>
              </Card>
            )
          })
        ) : (
          <div className="col-span-2">
            <EmptyState
              icon={<FileText className="w-12 h-12" />}
              title={activeTab === 'For You' ? 'No Private Briefs' : 'No Open Briefs'}
              description={activeTab === 'For You'
                ? 'When supervisors add you to their hit list and send briefs, they\'ll appear here'
                : 'Check back later for new sync opportunities'}
            />
          </div>
        )}
      </div>
    </div>
  )
}
