import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../../lib/supabase'
import { Card, Btn, Input, Textarea, Select, PageTitle, StatusBadge, Spinner, EmptyState } from '../shared/UI'
import { MOODS, GENRES } from '../../lib/constants'
import { Plus, X, FileText, Eye, EyeOff, Save } from 'lucide-react'
import type { Profile, Brief, Track } from '../../lib/types'

interface BriefsProps {
  profile: Profile
  onPlayTrack: (track: Track) => void
  currentTrack: Track | null
  playing: boolean
}

interface BriefSubmission {
  id: string
  brief_id: string
  track_id: string
  artist_id: string
  status: 'submitted' | 'shortlisted' | 'in_review' | 'selected' | 'licensed' | 'rejected'
  notes?: string | null
  created_at: string
  track?: Track
  artist?: Profile
}

const SUBMISSION_STATUSES: BriefSubmission['status'][] = ['submitted', 'in_review', 'shortlisted', 'selected', 'licensed', 'rejected']

export function Briefs({ profile }: BriefsProps) {
  const [briefs, setBriefs] = useState<Brief[]>([])
  const [submissions, setSubmissions] = useState<Record<string, BriefSubmission[]>>({})
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [selectedBrief, setSelectedBrief] = useState<Brief | null>(null)

  const [briefForm, setBriefForm] = useState<Partial<Brief>>({
    title: '',
    description: '',
    scene_type: '',
    mood: '',
    genre: '',
    bpm_min: 80,
    bpm_max: 140,
    budget: 0,
    budget_min: 0,
    budget_max: 0,
    client: '',
    client_name: '',
    project_name: '',
    media_type: '',
    sonic_direction: '',
    reference_tracks: '',
    reference_artists: '',
    reference_links: [],
    usage_terms: '',
    rights_needed: '',
    term_length: '',
    deadline: '',
    is_private: false,
    status: 'draft',
    exclusivity: false
  })

  const loadData = useCallback(async () => {
    setLoading(true)
    const { data: briefsData } = await supabase
      .from('briefs')
      .select('*')
      .eq('supervisor_id', profile.id)
      .order('created_at', { ascending: false })

    if (briefsData) {
      setBriefs(briefsData)

      const briefIds = briefsData.map(b => b.id)
      if (briefIds.length > 0) {
        const { data: submissionData } = await supabase
          .from('brief_submissions')
          .select('*, track:tracks(*), artist:profiles(*)')
          .in('brief_id', briefIds)
          .order('created_at', { ascending: false })

        const submissionsMap: Record<string, BriefSubmission[]> = {}
        for (const briefId of briefIds) {
          submissionsMap[briefId] = (submissionData || []).filter(sub => sub.brief_id === briefId)
        }
        setSubmissions(submissionsMap)
      } else {
        setSubmissions({})
      }
    }

    setLoading(false)
  }, [profile.id])

  useEffect(() => {
    void loadData()
  }, [loadData])

  const saveBrief = async () => {
    if (!briefForm.title) return

    const { usage_type: _usage, territory: _territory, ...briefRest } = briefForm as Partial<Brief> & { usage_type?: string; territory?: string }
    void _usage
    void _territory
    const payload = {
      ...briefRest,
      created_by: profile.id,
      supervisor_id: profile.id
    }

    const query = selectedBrief
      ? supabase.from('briefs').update(payload).eq('id', selectedBrief.id).select().single()
      : supabase.from('briefs').insert(payload).select().single()

    const { data, error } = await query

    if (!error && data) {
      if (selectedBrief) {
        setBriefs(briefs.map(b => (b.id === selectedBrief.id ? data : b)))
      } else {
        setBriefs([data, ...briefs])
      }
      resetBriefForm()
    }
  }

  const resetBriefForm = () => {
    setShowForm(false)
    setSelectedBrief(null)
    setBriefForm({
      title: '',
      description: '',
      scene_type: '',
      mood: '',
      genre: '',
      bpm_min: 80,
      bpm_max: 140,
      budget: 0,
      budget_min: 0,
      budget_max: 0,
      client: '',
      client_name: '',
      project_name: '',
      media_type: '',
      sonic_direction: '',
      reference_tracks: '',
      reference_artists: '',
      reference_links: [],
      usage_terms: '',
      rights_needed: '',
      term_length: '',
      deadline: '',
      is_private: false,
      status: 'draft',
      exclusivity: false
    })
  }

  const startEdit = (brief: Brief) => {
    setSelectedBrief(brief)
    setBriefForm(brief)
    setShowForm(true)
  }

  const updateBriefStatus = async (brief: Brief, status: Brief['status']) => {
    await supabase.from('briefs').update({ status }).eq('id', brief.id)
    setBriefs(briefs.map(b => (b.id === brief.id ? { ...b, status } : b)))
  }

  const deleteBrief = async (id: string) => {
    if (!confirm('Delete this brief?')) return
    await supabase.from('briefs').delete().eq('id', id)
    setBriefs(briefs.filter(b => b.id !== id))
  }

  const updateSubmissionStatus = async (submissionId: string, briefId: string, status: BriefSubmission['status']) => {
    await supabase.from('brief_submissions').update({ status }).eq('id', submissionId)
    setSubmissions(prev => ({
      ...prev,
      [briefId]: (prev[briefId] || []).map(sub => (sub.id === submissionId ? { ...sub, status } : sub))
    }))
  }

  if (loading) {
    return <div className="flex items-center justify-center h-full"><Spinner /></div>
  }

  return (
    <div className="p-6 h-[calc(100vh-76px)] overflow-y-auto pb-40 md:pb-6">
      <div className="flex items-center justify-between mb-6">
        <PageTitle title="Briefs" sub="Create, publish, and review sync briefs" />
        <Btn onClick={() => setShowForm(true)}>
          <Plus className="w-4 h-4" /> Create Brief
        </Btn>
      </div>

      {showForm && (
        <Card className="p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-medium text-[#E8E8E8]">{selectedBrief ? 'Edit Brief' : 'New Brief'}</h3>
            <button onClick={resetBriefForm} className="text-[#666]"><X className="w-5 h-5" /></button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <Input label="Brief Title" value={briefForm.title || ''} onChange={e => setBriefForm({ ...briefForm, title: e.target.value })} />
            <Input label="Brand / Client" value={briefForm.client || ''} onChange={e => setBriefForm({ ...briefForm, client: e.target.value })} />
            <Input label="Client Name" value={briefForm.client_name || ''} onChange={e => setBriefForm({ ...briefForm, client_name: e.target.value })} />
            <Input label="Project Name" value={briefForm.project_name || ''} onChange={e => setBriefForm({ ...briefForm, project_name: e.target.value })} />
            <Input label="Scene / Sonic Direction" value={briefForm.scene_type || ''} onChange={e => setBriefForm({ ...briefForm, scene_type: e.target.value })} />
            <Input label="Sonic Direction Notes" value={briefForm.sonic_direction || ''} onChange={e => setBriefForm({ ...briefForm, sonic_direction: e.target.value })} />
            <Input label="Media Type" value={briefForm.media_type || ''} onChange={e => setBriefForm({ ...briefForm, media_type: e.target.value })} />
            <Select label="Mood" value={briefForm.mood || ''} onChange={e => setBriefForm({ ...briefForm, mood: e.target.value })}>
              <option value="">Select mood</option>
              {MOODS.filter(m => m !== 'All').map(mood => <option key={mood} value={mood}>{mood}</option>)}
            </Select>
            <Select label="Genre" value={briefForm.genre || ''} onChange={e => setBriefForm({ ...briefForm, genre: e.target.value })}>
              <option value="">Select genre</option>
              {GENRES.filter(g => g !== 'All').map(genre => <option key={genre} value={genre}>{genre}</option>)}
            </Select>
            <Input label="Reference Artists / Tracks" value={briefForm.reference_tracks || ''} onChange={e => setBriefForm({ ...briefForm, reference_tracks: e.target.value })} />
            <Input label="Reference Artists" value={briefForm.reference_artists || ''} onChange={e => setBriefForm({ ...briefForm, reference_artists: e.target.value })} />
            <Input
              label="Reference Links (comma separated)"
              value={(briefForm.reference_links || []).join(', ')}
              onChange={e => setBriefForm({ ...briefForm, reference_links: e.target.value.split(',').map(link => link.trim()).filter(Boolean) })}
            />
            <Input label="Term" value={briefForm.term_length || ''} onChange={e => setBriefForm({ ...briefForm, term_length: e.target.value })} />
            <Input label="Rights Needed" value={briefForm.usage_terms || ''} onChange={e => setBriefForm({ ...briefForm, usage_terms: e.target.value })} />
            <Input label="Budget" type="number" value={briefForm.budget || ''} onChange={e => setBriefForm({ ...briefForm, budget: parseInt(e.target.value) || 0 })} />
            <Input label="Budget Min" type="number" value={briefForm.budget_min || ''} onChange={e => setBriefForm({ ...briefForm, budget_min: parseInt(e.target.value) || 0 })} />
            <Input label="Budget Max" type="number" value={briefForm.budget_max || ''} onChange={e => setBriefForm({ ...briefForm, budget_max: parseInt(e.target.value) || 0 })} />
            <Input label="Rights Needed (detailed)" value={briefForm.rights_needed || ''} onChange={e => setBriefForm({ ...briefForm, rights_needed: e.target.value })} />
            <Input label="Deadline" type="date" value={briefForm.deadline || ''} onChange={e => setBriefForm({ ...briefForm, deadline: e.target.value })} />
            <Select label="Brief Status" value={briefForm.status || 'draft'} onChange={e => setBriefForm({ ...briefForm, status: e.target.value as Brief['status'] })}>
              <option value="draft">Draft</option>
              <option value="published">Published</option>
              <option value="open">Open (Legacy)</option>
              <option value="closed">Closed</option>
              <option value="archived">Archived</option>
            </Select>
            <div className="flex items-center gap-4">
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={Boolean(briefForm.is_private)} onChange={e => setBriefForm({ ...briefForm, is_private: e.target.checked })} className="w-4 h-4" />
                <span className="text-sm text-[#888]">Private brief</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={Boolean(briefForm.exclusivity)} onChange={e => setBriefForm({ ...briefForm, exclusivity: e.target.checked })} className="w-4 h-4" />
                <span className="text-sm text-[#888]">Exclusive</span>
              </label>
            </div>
          </div>

          <Textarea label="Description" value={briefForm.description || ''} onChange={e => setBriefForm({ ...briefForm, description: e.target.value })} rows={4} />

          <div className="flex justify-end gap-2 mt-4">
            <Btn variant="ghost" onClick={resetBriefForm}>Cancel</Btn>
            <Btn onClick={saveBrief} disabled={!briefForm.title}><Save className="w-4 h-4" /> Save Brief</Btn>
          </div>
        </Card>
      )}

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        {briefs.length > 0 ? briefs.map(brief => {
          const briefSubmissions = submissions[brief.id] || []
          return (
            <Card key={brief.id} className="p-4">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="text-[#E8E8E8] font-medium">{brief.title}</h3>
                    {brief.is_private ? <EyeOff className="w-3 h-3 text-[#666]" /> : <Eye className="w-3 h-3 text-[#666]" />}
                  </div>
                  <p className="text-xs text-[#666]">{brief.client || brief.scene_type}</p>
                </div>
                <StatusBadge status={brief.status} variant="project" />
              </div>

              {brief.description && <p className="text-sm text-[#888] mb-3 line-clamp-2">{brief.description}</p>}

              <div className="flex flex-wrap gap-2 mb-3 text-xs text-[#666]">
                {brief.mood && <span className="px-2 py-1 bg-[#1A1A1E] rounded">{brief.mood}</span>}
                {brief.genre && <span className="px-2 py-1 bg-[#1A1A1E] rounded">{brief.genre}</span>}
                {brief.budget && <span className="px-2 py-1 bg-[#1A1A1E] rounded">${brief.budget.toLocaleString()}</span>}
              </div>

              <div className="flex gap-2 flex-wrap mb-3">
                <Btn size="sm" variant="ghost" onClick={() => startEdit(brief)}>Edit</Btn>
                <Btn
                  size="sm"
                  variant="ghost"
                  onClick={() => updateBriefStatus(brief, brief.status === 'open' || brief.status === 'published' ? 'closed' : 'published')}
                >
                  {brief.status === 'open' || brief.status === 'published' ? 'Close' : 'Publish'}
                </Btn>
                <Btn size="sm" variant="ghost" onClick={() => updateBriefStatus(brief, 'archived')}>Archive</Btn>
                <Btn size="sm" variant="danger" onClick={() => deleteBrief(brief.id)}>Delete</Btn>
              </div>

              <div className="border-t border-[#1A1A1E] pt-3">
                <p className="text-xs text-[#666] mb-2">{briefSubmissions.length} submissions</p>
                {briefSubmissions.slice(0, 4).map(sub => (
                  <div key={sub.id} className="flex items-center justify-between gap-2 mb-2 bg-[#0A0A0C] rounded p-2">
                    <div>
                      <p className="text-sm text-[#E8E8E8]">{sub.track?.title || 'Unknown Track'}</p>
                      <p className="text-xs text-[#666]">{sub.artist?.full_name || 'Unknown Artist'}</p>
                    </div>
                    <Select value={sub.status} onChange={e => updateSubmissionStatus(sub.id, brief.id, e.target.value as BriefSubmission['status'])} className="w-36 text-xs">
                      {SUBMISSION_STATUSES.map(status => <option key={status} value={status}>{status.replace('_', ' ')}</option>)}
                    </Select>
                  </div>
                ))}
              </div>
            </Card>
          )
        }) : (
          <div className="col-span-2">
            <EmptyState icon={<FileText className="w-12 h-12" />} title="No Briefs Yet" description="Create a brief to receive track submissions" action={<Btn onClick={() => setShowForm(true)}><Plus className="w-4 h-4" /> Create Brief</Btn>} />
          </div>
        )}
      </div>
    </div>
  )
}
