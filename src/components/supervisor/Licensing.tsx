import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import { Card, Btn, Input, Select, PageTitle, StatCard, StatusBadge, Spinner, EmptyState, Tabs } from '../shared/UI'
import { Plus, X, Scale } from 'lucide-react'
import type { Profile, LicenseRequest, Track, Project } from '../../lib/types'

interface LicensingProps {
  profile: Profile
}

export function Licensing({ profile }: LicensingProps) {
  const [requests, setRequests] = useState<LicenseRequest[]>([])
  const [tracks, setTracks] = useState<Track[]>([])
  const [projects, setProjects] = useState<Project[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [activeTab, setActiveTab] = useState('All')

  const [form, setForm] = useState<Partial<LicenseRequest>>({
    track_id: '',
    project_id: '',
    license_type: 'one_stop',
    term: '',
    fee_offered: 0
  })

  useEffect(() => {
    loadData()
  }, [profile.id])

  const loadData = async () => {
    setLoading(true)
    const [requestsRes, tracksRes, projectsRes] = await Promise.all([
      supabase
        .from('license_requests')
        .select('*, track:tracks(*), project:projects(*)')
        .eq('supervisor_id', profile.id)
        .order('created_at', { ascending: false }),
      supabase.from('tracks').select('*').eq('status', 'active'),
      supabase.from('projects').select('*').eq('supervisor_id', profile.id)
    ])

    if (requestsRes.data) setRequests(requestsRes.data)
    if (tracksRes.data) setTracks(tracksRes.data)
    if (projectsRes.data) setProjects(projectsRes.data)
    setLoading(false)
  }

  const createRequest = async () => {
    if (!form.track_id) return

    const { data, error } = await supabase
      .from('license_requests')
      .insert({
        track_id: form.track_id,
        project_id: form.project_id || null,
        license_type: form.license_type || 'one_stop',
        term: form.term || null,
        fee_offered: form.fee_offered ?? null,
        supervisor_id: profile.id,
        status: 'pending'
      })
      .select('*, track:tracks(*), project:projects(*)')
      .single()

    if (!error && data) {
      setRequests([data, ...requests])
      setShowForm(false)
      setForm({
        track_id: '',
        project_id: '',
        license_type: 'one_stop',
        term: '',
        fee_offered: 0
      })
    }
  }

  const updateRequestStatus = async (id: string, status: LicenseRequest['status']) => {
    await supabase.from('license_requests').update({ status }).eq('id', id)
    setRequests(requests.map(r => r.id === id ? { ...r, status } : r))
  }

  const filteredRequests = requests.filter(r =>
    activeTab === 'All' || r.status === activeTab.toLowerCase().replace(' ', '_')
  )

  const stats = {
    total: requests.length,
    approved: requests.filter(r => r.status === 'approved').length,
    inProgress: requests.filter(r => ['pending', 'in_review', 'negotiating'].includes(r.status)).length,
    totalValue: requests.filter(r => r.status === 'approved').reduce((sum, r) => sum + (r.fee_agreed || r.fee_offered || 0), 0)
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
      <div className="flex items-center justify-between mb-6">
        <PageTitle title="Licensing" sub="Manage license requests and negotiations" />
        <Btn onClick={() => setShowForm(true)}>
          <Plus className="w-4 h-4" /> New Request
        </Btn>
      </div>

      <div className="grid grid-cols-4 gap-4 mb-6">
        <StatCard label="Total Requests" value={stats.total} />
        <StatCard label="Approved" value={stats.approved} />
        <StatCard label="In Progress" value={stats.inProgress} />
        <StatCard label="Total Value" value={`$${stats.totalValue.toLocaleString()}`} />
      </div>

      {showForm && (
        <Card className="p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-medium text-[#E8E8E8]">New License Request</h3>
            <button onClick={() => setShowForm(false)} className="text-[#666]">
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Select
              label="Track"
              value={form.track_id || ''}
              onChange={e => setForm({ ...form, track_id: e.target.value })}
            >
              <option value="">Select track</option>
              {tracks.map(track => (
                <option key={track.id} value={track.id}>{track.title} - {track.artist}</option>
              ))}
            </Select>
            <Select
              label="Project"
              value={form.project_id || ''}
              onChange={e => setForm({ ...form, project_id: e.target.value })}
            >
              <option value="">Select project (optional)</option>
              {projects.map(project => (
                <option key={project.id} value={project.id}>{project.name}</option>
              ))}
            </Select>
            <Select
              label="License Type"
              value={form.license_type || 'one_stop'}
              onChange={e => setForm({ ...form, license_type: e.target.value as 'one_stop' | 'quote' })}
            >
              <option value="one_stop">One-Stop (Instant)</option>
              <option value="quote">Quote Request</option>
            </Select>
            <Input
              label="Term"
              value={form.term || ''}
              onChange={e => setForm({ ...form, term: e.target.value })}
              placeholder="e.g., 1 Year, In Perpetuity"
            />
            <Input
              label="Fee Offered"
              type="number"
              value={form.fee_offered || ''}
              onChange={e => setForm({ ...form, fee_offered: parseInt(e.target.value) })}
              placeholder="$0"
            />
          </div>

          <div className="flex justify-end gap-2 mt-4">
            <Btn variant="ghost" onClick={() => setShowForm(false)}>Cancel</Btn>
            <Btn onClick={createRequest} disabled={!form.track_id}>Submit Request</Btn>
          </div>
        </Card>
      )}

      <div className="mb-4">
        <Tabs
          tabs={[
            { id: 'All', label: 'All' },
            { id: 'Pending', label: 'Pending' },
            { id: 'In Review', label: 'In Review' },
            { id: 'Negotiating', label: 'Negotiating' },
            { id: 'Approved', label: 'Approved' },
            { id: 'Rejected', label: 'Rejected' }
          ]}
          active={activeTab}
          onChange={setActiveTab}
        />
      </div>

      <div className="space-y-3">
        {filteredRequests.length > 0 ? (
          filteredRequests.map(request => (
            <Card key={request.id} className="p-4">
              <div className="flex items-center gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <h4 className="text-[#E8E8E8] font-medium truncate">{request.track?.title}</h4>
                    <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                      request.license_type === 'one_stop'
                        ? 'bg-[#4DFFB4]/20 text-[#4DFFB4]'
                        : 'bg-[#7B9CFF]/20 text-[#7B9CFF]'
                    }`}>
                      {request.license_type === 'one_stop' ? 'One-Stop' : 'Quote'}
                    </span>
                  </div>
                  <p className="text-sm text-[#666]">{request.track?.artist}</p>
                </div>

                <div className="text-right">
                  <p className="text-sm text-[#888]">{request.project?.name || 'No project'}</p>
                  {request.term && <p className="text-xs text-[#555]">{request.term}</p>}
                </div>

                <div className="text-right">
                  <p className="text-sm text-[#C8A97E] font-medium">
                    ${request.fee_agreed || request.fee_offered || 0}
                  </p>
                  {request.fee_agreed && request.fee_offered && request.fee_agreed !== request.fee_offered && (
                    <p className="text-xs text-[#555] line-through">${request.fee_offered}</p>
                  )}
                </div>

                <StatusBadge status={request.status} variant="license" />

                <div className="flex gap-2">
                  {request.status === 'pending' && (
                    <Btn size="sm" variant="ghost" onClick={() => updateRequestStatus(request.id, 'in_review')}>
                      Start Review
                    </Btn>
                  )}
                  {request.status === 'in_review' && (
                    <>
                      <Btn size="sm" onClick={() => updateRequestStatus(request.id, 'approved')}>
                        Approve
                      </Btn>
                      <Btn size="sm" variant="ghost" onClick={() => updateRequestStatus(request.id, 'negotiating')}>
                        Negotiate
                      </Btn>
                    </>
                  )}
                </div>
              </div>
            </Card>
          ))
        ) : (
          <EmptyState
            icon={<Scale className="w-12 h-12" />}
            title="No License Requests"
            description={activeTab === 'All' ? 'Create a license request to start the process' : `No ${activeTab.toLowerCase()} requests`}
          />
        )}
      </div>
    </div>
  )
}
