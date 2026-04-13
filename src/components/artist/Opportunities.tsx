import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import { Card, PageTitle, Spinner, MoodPill } from '../shared/UI'
import { Briefcase, Send, Clock, CheckCircle, XCircle, Calendar, DollarSign, Music2, ChevronRight, Filter, ArrowRight } from 'lucide-react'
import type { Profile, Brief, Track } from '../../lib/types'

interface OpportunitiesProps {
  profile: Profile
}

interface Submission {
  id: string
  brief_id: string
  track_id: string
  status: 'submitted' | 'shortlisted' | 'in_review' | 'selected' | 'licensed' | 'rejected'
  created_at: string
  notes?: string
  brief?: Brief
  track?: Track
}

type TabType = 'briefs' | 'submissions'
type BriefFilter = 'all' | 'open' | 'closing-soon'
type SubmissionFilter = 'all' | 'submitted' | 'in_review' | 'shortlisted' | 'selected' | 'licensed' | 'rejected'
const SEEDED_BRIEFS: Brief[] = [
  { id: 'seed-1', title: 'Global Sports Campaign', description: 'High-energy anthem for playoff promos.', mood: 'Aggressive', genre: 'Hip-Hop', is_private: false, supervisor_id: 'demo', status: 'open', created_at: new Date().toISOString() },
  { id: 'seed-2', title: 'Luxury Auto Spot', description: 'Cinematic tension with premium feel.', mood: 'Cinematic', genre: 'Electronic', is_private: false, supervisor_id: 'demo', status: 'open', created_at: new Date().toISOString() },
  { id: 'seed-3', title: 'Streaming Drama Teaser', description: 'Dark emotional arc.', mood: 'Melancholic', genre: 'Alternative', is_private: false, supervisor_id: 'demo', status: 'published', created_at: new Date().toISOString() },
  { id: 'seed-4', title: 'Lifestyle Brand UGC', description: 'Hopeful, feel-good cue.', mood: 'Hopeful', genre: 'Pop', is_private: false, supervisor_id: 'demo', status: 'open', created_at: new Date().toISOString() },
  { id: 'seed-5', title: 'Documentary Series', description: 'Organic, reflective underscore.', mood: 'Nostalgic', genre: 'Ambient', is_private: false, supervisor_id: 'demo', status: 'open', created_at: new Date().toISOString() }
] as Brief[]

export function Opportunities({ profile }: OpportunitiesProps) {
  const [activeTab, setActiveTab] = useState<TabType>('briefs')
  const [loading, setLoading] = useState(true)
  const [briefs, setBriefs] = useState<Brief[]>([])
  const [submissions, setSubmissions] = useState<Submission[]>([])
  const [tracks, setTracks] = useState<Track[]>([])
  const [briefFilter, setBriefFilter] = useState<BriefFilter>('all')
  const [submissionFilter, setSubmissionFilter] = useState<SubmissionFilter>('all')
  const [selectedBrief, setSelectedBrief] = useState<Brief | null>(null)
  const [selectedTrack, setSelectedTrack] = useState<string>('')
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    loadData()
  }, [profile.id])

  const loadData = async () => {
    setLoading(true)

    const [briefsResult, submissionsResult, tracksResult] = await Promise.all([
      supabase
        .from('briefs')
        .select('*')
        .eq('is_private', false)
        .eq('status', 'open'),

      supabase
        .from('brief_submissions')
        .select(`
          *,
          brief:briefs(*),
          track:tracks(*)
        `)
        .eq('artist_id', profile.id)
        .order('created_at', { ascending: false }),

      supabase
        .from('tracks')
        .select('*')
        .eq('uploaded_by', profile.id)
        .eq('status', 'active')
    ])

    setBriefs((briefsResult.data && briefsResult.data.length > 0 ? briefsResult.data : SEEDED_BRIEFS))
    setSubmissions(submissionsResult.data || [])
    setTracks(tracksResult.data || [])
    setLoading(false)
  }

  const filteredBriefs = briefs.filter(brief => {
    if (!brief.deadline) return briefFilter === 'all'
    if (briefFilter === 'open') {
      return new Date(brief.deadline) > new Date()
    }
    if (briefFilter === 'closing-soon') {
      const deadline = new Date(brief.deadline)
      const now = new Date()
      const threeDays = 3 * 24 * 60 * 60 * 1000
      return deadline > now && (deadline.getTime() - now.getTime()) < threeDays
    }
    return true
  })

  const filteredSubmissions = submissions.filter(sub => {
    if (submissionFilter === 'all') return true
    return sub.status === submissionFilter
  })

  const submitToBrief = async () => {
    if (!selectedBrief || !selectedTrack) return

    setSubmitting(true)
    const { error } = await supabase.from('brief_submissions').insert({
      brief_id: selectedBrief.id,
      track_id: selectedTrack,
      artist_id: profile.id,
      status: 'submitted'
    })

    if (error && !error.message.toLowerCase().includes('duplicate')) {
      alert(error.message)
    }

    setSelectedBrief(null)
    setSelectedTrack('')
    await loadData()
    setSubmitting(false)
  }

  const formatDeadline = (deadline: string) => {
    const date = new Date(deadline)
    const now = new Date()
    const diff = date.getTime() - now.getTime()
    const days = Math.ceil(diff / (1000 * 60 * 60 * 24))

    if (days < 0) return 'Closed'
    if (days === 0) return 'Today'
    if (days === 1) return 'Tomorrow'
    if (days <= 7) return `${days} days left`
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'submitted': return 'text-[#FFB74D] bg-[#FFB74D]/10'
      case 'in_review': return 'text-[#8FD3FF] bg-[#8FD3FF]/10'
      case 'licensed': return 'text-[#4DFFB4] bg-[#4DFFB4]/10'
      case 'shortlisted': return 'text-[#7B9CFF] bg-[#7B9CFF]/10'
      case 'selected': return 'text-[#4DFFB4] bg-[#4DFFB4]/10'
      case 'rejected': return 'text-[#FF6B6B] bg-[#FF6B6B]/10'
      default: return 'text-[#888] bg-[#888]/10'
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'submitted': return <Clock className="w-4 h-4" />
      case 'in_review': return <Clock className="w-4 h-4" />
      case 'licensed': return <CheckCircle className="w-4 h-4" />
      case 'shortlisted': return <CheckCircle className="w-4 h-4" />
      case 'selected': return <CheckCircle className="w-4 h-4" />
      case 'rejected': return <XCircle className="w-4 h-4" />
      default: return <Clock className="w-4 h-4" />
    }
  }

  const hasSubmitted = (briefId: string) => {
    return submissions.some(s => s.brief_id === briefId)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-76px)]">
        <Spinner />
      </div>
    )
  }

  return (
    <div className="p-4 md:p-6 h-[calc(100vh-76px)] overflow-y-auto pb-40 md:pb-6">
      <PageTitle title="Opportunities" sub="Browse briefs and track your submissions" />

      <div className="flex gap-2 mb-6">
        <button
          onClick={() => setActiveTab('briefs')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
            activeTab === 'briefs'
              ? 'bg-[#C8A97E] text-[#0A0A0C]'
              : 'bg-[#1A1A1E] text-[#888] hover:text-[#E8E8E8]'
          }`}
        >
          <Briefcase className="w-4 h-4" />
          Active Briefs
          {briefs.length > 0 && (
            <span className={`px-1.5 py-0.5 rounded text-xs ${
              activeTab === 'briefs' ? 'bg-[#0A0A0C]/20' : 'bg-[#C8A97E]/20 text-[#C8A97E]'
            }`}>
              {briefs.length}
            </span>
          )}
        </button>
        <button
          onClick={() => setActiveTab('submissions')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
            activeTab === 'submissions'
              ? 'bg-[#C8A97E] text-[#0A0A0C]'
              : 'bg-[#1A1A1E] text-[#888] hover:text-[#E8E8E8]'
          }`}
        >
          <Send className="w-4 h-4" />
          My Submissions
          {submissions.length > 0 && (
            <span className={`px-1.5 py-0.5 rounded text-xs ${
              activeTab === 'submissions' ? 'bg-[#0A0A0C]/20' : 'bg-[#C8A97E]/20 text-[#C8A97E]'
            }`}>
              {submissions.length}
            </span>
          )}
        </button>
      </div>

      {activeTab === 'briefs' && (
        <>
          <div className="flex items-center gap-2 mb-4 overflow-x-auto pb-2">
            <Filter className="w-4 h-4 text-[#666] flex-shrink-0" />
            {(['all', 'open', 'closing-soon'] as const).map(filter => (
              <button
                key={filter}
                onClick={() => setBriefFilter(filter)}
                className={`px-3 py-1 rounded-full text-xs font-medium transition-colors whitespace-nowrap ${
                  briefFilter === filter
                    ? 'bg-[#C8A97E]/20 text-[#C8A97E]'
                    : 'bg-[#1A1A1E] text-[#666] hover:text-[#888]'
                }`}
              >
                {filter === 'all' ? 'All Briefs' : filter === 'open' ? 'Open' : 'Closing Soon'}
              </button>
            ))}
          </div>

          {filteredBriefs.length === 0 ? (
            <Card className="p-8 text-center">
              <Briefcase className="w-12 h-12 text-[#333] mx-auto mb-3" />
              <p className="text-[#666]">No active briefs at the moment</p>
              <p className="text-sm text-[#555]">Check back later for new opportunities</p>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {filteredBriefs.map(brief => {
                const submitted = hasSubmitted(brief.id)
                const deadline = brief.deadline ? new Date(brief.deadline) : null
                const isClosingSoon = deadline ? (deadline.getTime() - Date.now() < 3 * 24 * 60 * 60 * 1000) : false

                return (
                  <Card key={brief.id} className="p-4">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex-1">
                        <h3 className="text-lg font-medium text-[#E8E8E8]">{brief.title}</h3>
                        <p className="text-sm text-[#888]">{brief.usage_type || brief.scene_type || 'Sync Placement'}</p>
                      </div>
                      {isClosingSoon && (
                        <span className="px-2 py-0.5 bg-[#FF6B6B]/10 text-[#FF6B6B] text-xs rounded-full">
                          Closing Soon
                        </span>
                      )}
                    </div>

                    <p className="text-sm text-[#666] mb-4 line-clamp-2">{brief.description}</p>

                    <div className="flex flex-wrap gap-2 mb-4">
                      {brief.genre && (
                        <span className="px-2 py-0.5 bg-[#1A1A1E] text-[#888] text-xs rounded">
                          {brief.genre}
                        </span>
                      )}
                      {brief.mood && <MoodPill mood={brief.mood} />}
                    </div>

                    <div className="flex items-center gap-4 text-sm text-[#666] mb-4">
                      <div className="flex items-center gap-1">
                        <Calendar className="w-4 h-4" />
                        {brief.deadline ? formatDeadline(brief.deadline) : 'No deadline'}
                      </div>
                      {brief.budget && (
                        <div className="flex items-center gap-1">
                          <DollarSign className="w-4 h-4" />
                          ${brief.budget.toLocaleString()}
                        </div>
                      )}
                    </div>

                    {submitted ? (
                      <div className="flex items-center gap-2 text-sm text-[#4DFFB4]">
                        <CheckCircle className="w-4 h-4" />
                        Already Submitted
                      </div>
                    ) : (
                      <button
                        onClick={() => setSelectedBrief(brief)}
                        className="flex items-center gap-2 px-4 py-2 bg-[#C8A97E] text-[#0A0A0C] rounded-lg text-sm font-medium hover:bg-[#D4B88A] transition-colors"
                      >
                        Submit Track
                        <ArrowRight className="w-4 h-4" />
                      </button>
                    )}
                  </Card>
                )
              })}
            </div>
          )}
        </>
      )}

      {activeTab === 'submissions' && (
        <>
          <div className="flex items-center gap-2 mb-4 overflow-x-auto pb-2">
            <Filter className="w-4 h-4 text-[#666] flex-shrink-0" />
            {(['all', 'submitted', 'in_review', 'shortlisted', 'selected', 'licensed', 'rejected'] as const).map(filter => (
              <button
                key={filter}
                onClick={() => setSubmissionFilter(filter)}
                className={`px-3 py-1 rounded-full text-xs font-medium transition-colors whitespace-nowrap ${
                  submissionFilter === filter
                    ? 'bg-[#C8A97E]/20 text-[#C8A97E]'
                    : 'bg-[#1A1A1E] text-[#666] hover:text-[#888]'
                }`}
              >
                {filter === 'all' ? 'All' : filter.replace('_', ' ').replace(/\b\w/g, c => c.toUpperCase())}
              </button>
            ))}
          </div>

          {filteredSubmissions.length === 0 ? (
            <Card className="p-8 text-center">
              <Send className="w-12 h-12 text-[#333] mx-auto mb-3" />
              <p className="text-[#666]">No submissions yet</p>
              <p className="text-sm text-[#555]">Submit tracks to active briefs to see them here</p>
            </Card>
          ) : (
            <div className="space-y-3">
              {filteredSubmissions.map(submission => (
                <Card key={submission.id} className="p-4">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-[#1A1A1E] rounded-lg flex items-center justify-center flex-shrink-0">
                      <Music2 className="w-6 h-6 text-[#C8A97E]" />
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <p className="text-sm font-medium text-[#E8E8E8] truncate">
                          {submission.track?.title || 'Unknown Track'}
                        </p>
                        <ChevronRight className="w-4 h-4 text-[#555]" />
                        <p className="text-sm text-[#888] truncate">
                          {submission.brief?.title || 'Unknown Brief'}
                        </p>
                      </div>
                      <p className="text-xs text-[#666]">
                        Submitted {new Date(submission.created_at).toLocaleDateString()}
                      </p>
                    </div>

                    <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full ${getStatusColor(submission.status)}`}>
                      {getStatusIcon(submission.status)}
                      <span className="text-xs font-medium capitalize">{submission.status}</span>
                    </div>
                  </div>

                  {submission.notes && (
                    <div className="mt-3 p-3 bg-[#0A0A0C] rounded-lg">
                      <p className="text-xs text-[#666] mb-1">Feedback</p>
                      <p className="text-sm text-[#888]">{submission.notes}</p>
                    </div>
                  )}
                </Card>
              ))}
            </div>
          )}
        </>
      )}

      {selectedBrief && (
        <div className="fixed inset-0 bg-black/60 flex items-end md:items-center justify-center z-50">
          <div
            className="bg-[#13131A] border-t md:border border-[#1E1E22] rounded-t-xl md:rounded-xl w-full md:max-w-lg shadow-2xl"
            style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
          >
            <div className="p-4 border-b border-[#1E1E22]">
              <h3 className="text-lg font-medium text-[#E8E8E8]">Submit to Brief</h3>
              <p className="text-sm text-[#888]">{selectedBrief.title}</p>
            </div>

            <div className="p-4">
              <label className="block text-sm text-[#888] mb-2">Select a Track</label>

              {tracks.length === 0 ? (
                <div className="p-6 text-center bg-[#0A0A0C] rounded-lg">
                  <Music2 className="w-10 h-10 text-[#333] mx-auto mb-2" />
                  <p className="text-sm text-[#666]">No approved tracks</p>
                  <p className="text-xs text-[#555]">Upload and get tracks approved first</p>
                </div>
              ) : (
                <div className="space-y-2 max-h-[300px] overflow-y-auto">
                  {tracks.map(track => (
                    <button
                      key={track.id}
                      onClick={() => setSelectedTrack(track.id)}
                      className={`w-full flex items-center gap-3 p-3 rounded-lg transition-colors ${
                        selectedTrack === track.id
                          ? 'bg-[#C8A97E]/20 border border-[#C8A97E]'
                          : 'bg-[#0A0A0C] hover:bg-[#1A1A1E]'
                      }`}
                    >
                      <div className="w-10 h-10 bg-[#1A1A1E] rounded-lg flex items-center justify-center">
                        <Music2 className="w-5 h-5 text-[#C8A97E]" />
                      </div>
                      <div className="flex-1 text-left min-w-0">
                        <p className="text-sm text-[#E8E8E8] truncate">{track.title}</p>
                        <p className="text-xs text-[#666]">{track.genre} {track.mood && `- ${track.mood}`}</p>
                      </div>
                      {selectedTrack === track.id && (
                        <CheckCircle className="w-5 h-5 text-[#C8A97E]" />
                      )}
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div className="flex flex-col md:flex-row gap-2 p-4 border-t border-[#1E1E22]">
              <button
                onClick={() => { setSelectedBrief(null); setSelectedTrack('') }}
                className="flex-1 px-4 py-3 text-[#888] hover:text-[#E8E8E8] transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={submitToBrief}
                disabled={!selectedTrack || submitting}
                className="flex-1 px-4 py-3 bg-[#C8A97E] text-[#0A0A0C] rounded-lg font-medium hover:bg-[#D4B88A] transition-colors disabled:opacity-50"
              >
                {submitting ? 'Submitting...' : 'Submit Track'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
