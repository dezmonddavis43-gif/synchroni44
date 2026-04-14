import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import { Card, PageTitle, StatCard, StatusBadge, Spinner, EmptyState, Tabs } from '../shared/UI'
import { Send, Music2 } from 'lucide-react'
import type { Profile, InboxSubmission } from '../../lib/types'

interface SubmissionsProps {
  profile: Profile
}

export function Submissions({ profile }: SubmissionsProps) {
  const [submissions, setSubmissions] = useState<InboxSubmission[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('All')

  useEffect(() => {
    loadSubmissions()
  }, [profile.id])

  const loadSubmissions = async () => {
    setLoading(true)
    const { data } = await supabase
      .from('inbox_submissions')
      .select('*, track:tracks(*), supervisor:profiles(*)')
      .eq('artist_id', profile.id)
      .order('created_at', { ascending: false })

    if (data) setSubmissions(data)
    setLoading(false)
  }

  const filteredSubmissions = submissions.filter(s =>
    activeTab === 'All' || s.status === activeTab.toLowerCase()
  )

  const stats = {
    total: submissions.length,
    pending: submissions.filter(s => s.status === 'pending').length,
    accepted: submissions.filter(s => s.status === 'accepted').length,
    acceptanceRate: submissions.length > 0
      ? Math.round((submissions.filter(s => s.status === 'accepted').length / submissions.length) * 100)
      : 0
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Spinner />
      </div>
    )
  }

  return (
    <div className="p-6 h-[calc(100vh-76px)] overflow-y-auto">
      <PageTitle title="Submissions" sub="Track your pitch history" />

      <div className="grid grid-cols-4 gap-4 mb-6">
        <StatCard label="Total Submitted" value={stats.total} />
        <StatCard label="Active Pitches" value={stats.pending} />
        <StatCard label="Accepted" value={stats.accepted} />
        <StatCard label="Acceptance Rate" value={`${stats.acceptanceRate}%`} />
      </div>

      <div className="mb-4">
        <Tabs
          tabs={[
            { id: 'All', label: 'All' },
            { id: 'Pending', label: 'Pending' },
            { id: 'Accepted', label: 'Accepted' },
            { id: 'Passed', label: 'Passed' }
          ]}
          active={activeTab}
          onChange={setActiveTab}
        />
      </div>

      <div className="space-y-3">
        {filteredSubmissions.length > 0 ? (
          filteredSubmissions.map(submission => (
            <Card key={submission.id} className="p-4">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 bg-[#C8A97E]/10 rounded-full flex items-center justify-center">
                  <Music2 className="w-5 h-5 text-[#C8A97E]" />
                </div>

                <div className="flex-1 min-w-0">
                  <p className="text-[#E8E8E8] font-medium truncate">{submission.track?.title}</p>
                  <p className="text-sm text-[#666]">
                    To: {submission.supervisor?.full_name || 'Unknown'}
                  </p>
                </div>

                {submission.message && (
                  <p className="text-sm text-[#888] max-w-xs truncate" title={submission.message}>
                    "{submission.message}"
                  </p>
                )}

                <p className="text-xs text-[#555]">
                  {new Date(submission.created_at).toLocaleDateString()}
                </p>

                <StatusBadge status={submission.status} variant="submission" />
              </div>
            </Card>
          ))
        ) : (
          <EmptyState
            icon={<Send className="w-12 h-12" />}
            title="No Submissions"
            description={activeTab === 'All'
              ? 'Use the AI Playlist Creator to send tracks to supervisors'
              : `No ${activeTab.toLowerCase()} submissions`}
          />
        )}
      </div>
    </div>
  )
}
