import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../../lib/supabase'
import { Card, Btn, Input, PageTitle, StatCard, Spinner } from '../shared/UI'
import { Plus, X, GripVertical } from 'lucide-react'
import type { Profile, Pitch, Track } from '../../lib/types'

interface PitchTrackerProps {
  profile: Profile
}

const COLUMNS = [
  { id: 'pitched', label: 'Pitched', color: '#7B9CFF' },
  { id: 'in_review', label: 'In Review', color: '#FFD700' },
  { id: 'passed', label: 'Passed', color: '#FF4D4D' },
  { id: 'licensed', label: 'Licensed', color: '#4DFFB4' },
  { id: 'expired', label: 'Expired', color: '#888' }
]

export function PitchTracker({ profile }: PitchTrackerProps) {
  const [pitches, setPitches] = useState<Pitch[]>([])
  const [tracks, setTracks] = useState<Track[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [expandedPitch, setExpandedPitch] = useState<string | null>(null)

  const [form, setForm] = useState<Partial<Pitch>>({
    track_id: '',
    supervisor_name: '',
    project_name: '',
    fee_offered: 0,
    notes: ''
  })

  const loadData = useCallback(async () => {
    setLoading(true)
    const [pitchesRes, tracksRes] = await Promise.all([
      supabase.from('pitches').select('*, track:tracks(*)').eq('label_id', profile.id).order('created_at', { ascending: false }),
      supabase.from('tracks').select('*').eq('label_id', profile.id)
    ])

    if (pitchesRes.data) setPitches(pitchesRes.data)
    if (tracksRes.data) setTracks(tracksRes.data)
    setLoading(false)
  }, [profile.id])

  useEffect(() => {
    void loadData()
  }, [loadData])

  const createPitch = async () => {
    if (!form.track_id || !form.supervisor_name) return

    const { data, error } = await supabase
      .from('pitches')
      .insert({
        ...form,
        label_id: profile.id,
        status: 'pitched'
      })
      .select('*, track:tracks(*)')
      .single()

    if (!error && data) {
      setPitches([data, ...pitches])
      setShowForm(false)
      setForm({ track_id: '', supervisor_name: '', project_name: '', fee_offered: 0, notes: '' })
    }
  }

  const updatePitchStatus = async (id: string, status: Pitch['status']) => {
    await supabase.from('pitches').update({ status }).eq('id', id)
    setPitches(pitches.map(p => p.id === id ? { ...p, status } : p))
  }

  const updatePitch = async (id: string, updates: Partial<Pitch>) => {
    await supabase.from('pitches').update(updates).eq('id', id)
    setPitches(pitches.map(p => p.id === id ? { ...p, ...updates } : p))
  }

  const handleDrop = (e: React.DragEvent, status: Pitch['status']) => {
    e.preventDefault()
    const pitchId = e.dataTransfer.getData('pitchId')
    if (pitchId) {
      updatePitchStatus(pitchId, status)
    }
  }

  const getPitchesByStatus = (status: string) => pitches.filter(p => p.status === status)

  const stats = {
    total: pitches.length,
    licensed: pitches.filter(p => p.status === 'licensed').length,
    passRate: pitches.length > 0
      ? Math.round((pitches.filter(p => p.status === 'passed').length / pitches.length) * 100)
      : 0,
    totalValue: pitches.filter(p => p.status === 'licensed').reduce((sum, p) => sum + (p.fee_agreed || p.fee_offered || 0), 0)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Spinner />
      </div>
    )
  }

  return (
    <div className="p-6 h-[calc(100vh-76px)] overflow-hidden flex flex-col">
      <div className="flex items-center justify-between mb-4">
        <PageTitle title="Pitch Tracker" />
        <Btn onClick={() => setShowForm(true)}>
          <Plus className="w-4 h-4" /> New Pitch
        </Btn>
      </div>

      <div className="grid grid-cols-4 gap-4 mb-4">
        <StatCard label="Total Pitched" value={stats.total} />
        <StatCard label="Licensed" value={stats.licensed} />
        <StatCard label="Pass Rate" value={`${stats.passRate}%`} />
        <StatCard label="Total Value" value={`$${stats.totalValue.toLocaleString()}`} />
      </div>

      {showForm && (
        <Card className="p-4 mb-4">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-medium text-[#E8E8E8]">New Pitch</h3>
            <button onClick={() => setShowForm(false)} className="text-[#666]">
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="grid grid-cols-5 gap-4">
            <select
              value={form.track_id || ''}
              onChange={e => setForm({ ...form, track_id: e.target.value })}
              className="bg-[#0A0A0C] border border-[#2A2A2E] rounded-lg px-3 py-2 text-sm text-[#E8E8E8]"
            >
              <option value="">Select track</option>
              {tracks.map(track => (
                <option key={track.id} value={track.id}>{track.title}</option>
              ))}
            </select>
            <Input
              value={form.supervisor_name || ''}
              onChange={e => setForm({ ...form, supervisor_name: e.target.value })}
              placeholder="Supervisor name"
            />
            <Input
              value={form.project_name || ''}
              onChange={e => setForm({ ...form, project_name: e.target.value })}
              placeholder="Project name"
            />
            <Input
              type="number"
              value={form.fee_offered || ''}
              onChange={e => setForm({ ...form, fee_offered: parseInt(e.target.value) })}
              placeholder="Fee offered"
            />
            <Btn onClick={createPitch}>Add Pitch</Btn>
          </div>
        </Card>
      )}

      <div className="flex-1 overflow-x-auto">
        <div className="flex gap-4 h-full min-w-max">
          {COLUMNS.map(column => (
            <div
              key={column.id}
              className="w-[250px] flex flex-col"
              onDrop={e => handleDrop(e, column.id as Pitch['status'])}
              onDragOver={e => e.preventDefault()}
            >
              <div className="flex items-center gap-2 mb-3">
                <div className="w-2 h-2 rounded-full" style={{ backgroundColor: column.color }} />
                <span className="text-sm font-medium text-[#888]">{column.label}</span>
                <span className="text-xs text-[#555]">({getPitchesByStatus(column.id).length})</span>
              </div>

              <div className="flex-1 space-y-2 overflow-y-auto">
                {getPitchesByStatus(column.id).map(pitch => (
                  <Card
                    key={pitch.id}
                    className="p-3 cursor-grab"
                    draggable
                    onDragStart={e => e.dataTransfer.setData('pitchId', pitch.id)}
                  >
                    <div className="flex items-start gap-2 mb-2">
                      <GripVertical className="w-4 h-4 text-[#444] mt-0.5" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-[#E8E8E8] font-medium truncate">
                          {pitch.track?.title}
                        </p>
                        <p className="text-xs text-[#666] truncate">{pitch.track?.artist}</p>
                      </div>
                    </div>

                    <div className="text-xs text-[#888] space-y-1">
                      <p>To: {pitch.supervisor_name}</p>
                      {pitch.project_name && <p>Project: {pitch.project_name}</p>}
                      <p className="text-[#C8A97E]">
                        ${pitch.fee_agreed || pitch.fee_offered || 0}
                      </p>
                    </div>

                    <button
                      onClick={() => setExpandedPitch(expandedPitch === pitch.id ? null : pitch.id)}
                      className="text-xs text-[#555] hover:text-[#888] mt-2"
                    >
                      {expandedPitch === pitch.id ? 'Less' : 'More'}
                    </button>

                    {expandedPitch === pitch.id && (
                      <div className="mt-3 pt-3 border-t border-[#1E1E22] space-y-2">
                        <Input
                          value={pitch.notes || ''}
                          onChange={e => updatePitch(pitch.id, { notes: e.target.value })}
                          placeholder="Notes..."
                        />
                        {column.id === 'licensed' && (
                          <Input
                            type="number"
                            value={pitch.fee_agreed || ''}
                            onChange={e => updatePitch(pitch.id, { fee_agreed: parseInt(e.target.value) })}
                            placeholder="Final fee"
                          />
                        )}
                      </div>
                    )}
                  </Card>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
