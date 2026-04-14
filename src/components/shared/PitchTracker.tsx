import { useEffect, useMemo, useState } from 'react'
import { supabase } from '../../lib/supabase'
import type { Pitch, Profile, Track } from '../../lib/types'

interface PitchTrackerProps { profile: Profile }

const columns = [
  { id: 'pitched', label: 'Pitched', color: '#7B9CFF' },
  { id: 'in_review', label: 'In Review', color: '#FDE047' },
  { id: 'passed', label: 'Passed', color: '#FB7185' },
  { id: 'licensed', label: 'Licensed', color: '#4DFFB4' },
  { id: 'expired', label: 'Expired', color: '#6B7280' }
] as const

type ColumnStatus = (typeof columns)[number]['id']

/** Board row: supervisor pitches and artist brief submissions share this shape in the UI */
interface PitchBoardRow {
  id: string
  track_id: string
  status: string
  created_at: string
  notes?: string
  supervisor_name?: string
  project_name?: string
  fee_offered?: number
  track?: Track
  label_id?: string
  submitted_by?: string
}

const seedPitches: PitchBoardRow[] = [
  {
    id: 'p1',
    track_id: 'demo-track-1',
    submitted_by: 'demo',
    supervisor_name: 'Morgan Lee',
    project_name: 'Adidas Summer',
    fee_offered: 4500,
    status: 'pitched',
    created_at: new Date().toISOString(),
    track: { id: 'demo-track-1', title: 'Afterlight', artist: 'Nova', uploaded_by: 'demo', created_at: new Date().toISOString() } as Track,
  },
  {
    id: 'p2',
    track_id: 'demo-track-2',
    submitted_by: 'demo',
    supervisor_name: 'Kai Brooks',
    project_name: 'Hulu Teaser',
    fee_offered: 7000,
    status: 'in_review',
    created_at: new Date().toISOString(),
    track: { id: 'demo-track-2', title: 'Signal Flare', artist: 'Drex', uploaded_by: 'demo', created_at: new Date().toISOString() } as Track,
  },
  {
    id: 'p3',
    track_id: 'demo-track-3',
    submitted_by: 'demo',
    supervisor_name: 'Lena Fox',
    project_name: 'Netflix Doc',
    fee_offered: 12000,
    status: 'licensed',
    created_at: new Date().toISOString(),
    track: { id: 'demo-track-3', title: 'Skyline Fade', artist: 'Arden', uploaded_by: 'demo', created_at: new Date().toISOString() } as Track,
  },
]

export function PitchTracker({ profile }: PitchTrackerProps) {
  const [pitches, setPitches] = useState<PitchBoardRow[]>([])
  const [tracks, setTracks] = useState<Track[]>([])
  const [expanded, setExpanded] = useState<string | null>(null)
  const [showNew, setShowNew] = useState(false)
  const [form, setForm] = useState({ track_id: '', supervisor_name: '', project_name: '', fee_offered: 0, notes: '' })

  useEffect(() => {
    const load = async () => {
      const pitchQuery = profile.role === 'artist'
        ? supabase.from('brief_submissions').select('id,track_id,created_at,status,notes,brief:briefs(title),track:tracks(*)').eq('artist_id', profile.id)
        : supabase.from('pitches').select('*, track:tracks(*)').eq('label_id', profile.id)
      const [pRes, tRes] = await Promise.all([pitchQuery, supabase.from('tracks').select('*').eq('status', 'active').limit(100)])

      const pitchRows = (pRes.data ?? []) as PitchBoardRow[]
      setPitches(pitchRows.length > 0 ? pitchRows : seedPitches)

      const trackRows = (tRes.data ?? []) as Track[]
      setTracks(trackRows.length > 0 ? trackRows : seedPitches.map(p => p.track).filter((t): t is Track => Boolean(t)))
    }
    void load()
  }, [profile.id, profile.role])

  const stats = useMemo(() => {
    const total = pitches.length
    const licensed = pitches.filter(p => p.status === 'licensed').length
    const passRate = total ? Math.round((licensed / total) * 100) : 0
    const pipeline = pitches
      .filter(p => ['pitched', 'in_review'].includes(p.status))
      .reduce((sum, p) => sum + (p.fee_offered || 0), 0)
    return { total, licensed, passRate, pipeline }
  }, [pitches])

  const movePitch = async (id: string, status: ColumnStatus) => {
    setPitches(prev => prev.map(p => (p.id === id ? { ...p, status } : p)))
    if (profile.role !== 'artist') {
      await supabase.from('pitches').update({ status }).eq('id', id)
    }
  }

  const createPitch = async () => {
    const track = tracks.find(t => t.id === form.track_id)
    const newPitch: PitchBoardRow = {
      id: crypto.randomUUID(),
      track_id: form.track_id,
      submitted_by: profile.id,
      supervisor_name: form.supervisor_name,
      project_name: form.project_name,
      fee_offered: form.fee_offered,
      notes: form.notes,
      status: 'pitched',
      created_at: new Date().toISOString(),
      track,
    }
    setPitches(prev => [newPitch, ...prev])
    if (profile.role !== 'artist') {
      const insertPayload: Partial<Pitch> & { label_id: string; track_id: string; status: Pitch['status'] } = {
        track_id: form.track_id,
        label_id: profile.id,
        supervisor_name: form.supervisor_name,
        project_name: form.project_name,
        fee_offered: form.fee_offered,
        notes: form.notes,
        status: 'pitched',
      }
      await supabase.from('pitches').insert(insertPayload)
    }
    setShowNew(false)
  }

  return (
    <div className="h-[calc(100vh-76px)] overflow-hidden p-4 text-[#E8E8E8] md:p-6">
      <div className="mb-4 flex justify-between">
        <h2 className="text-xl font-semibold">Pitch Tracker</h2>
        <button
          type="button"
          className="rounded bg-[#C8A97E] px-3 py-2 text-[#0A0A0C]"
          onClick={() => setShowNew(true)}
        >
          New pitch
        </button>
      </div>
      <div className="mb-4 grid grid-cols-2 gap-3 text-sm md:grid-cols-4">
        <div className="rounded bg-[#13131A] p-3">Total pitched: {stats.total}</div>
        <div className="rounded bg-[#13131A] p-3">Licensed: {stats.licensed}</div>
        <div className="rounded bg-[#13131A] p-3">Pass rate: {stats.passRate}%</div>
        <div className="rounded bg-[#13131A] p-3">Pipeline value: ${stats.pipeline.toLocaleString()}</div>
      </div>

      {showNew && (
        <div className="mb-4 grid grid-cols-5 gap-2 rounded bg-[#13131A] p-3">
          <select className="rounded bg-[#0B0B10] px-2" onChange={e => setForm(prev => ({ ...prev, track_id: e.target.value }))}>
            <option value="">Track</option>
            {tracks.map(t => (
              <option key={t.id} value={t.id}>{t.title}</option>
            ))}
          </select>
          <input className="rounded bg-[#0B0B10] px-2" placeholder="Supervisor" onChange={e => setForm(prev => ({ ...prev, supervisor_name: e.target.value }))} />
          <input className="rounded bg-[#0B0B10] px-2" placeholder="Project" onChange={e => setForm(prev => ({ ...prev, project_name: e.target.value }))} />
          <input className="rounded bg-[#0B0B10] px-2" type="number" placeholder="Fee" onChange={e => setForm(prev => ({ ...prev, fee_offered: Number(e.target.value) }))} />
          <button type="button" className="rounded bg-[#C8A97E] text-[#0A0A0C]" onClick={() => void createPitch()}>Add</button>
        </div>
      )}

      <div className="h-[calc(100%-170px)] overflow-x-auto">
        <div className="flex h-full min-w-max gap-3">
          {columns.map(col => (
            <div
              key={col.id}
              className="h-full w-[260px] rounded-lg border border-[#1E1E24] bg-[#101016] p-2"
              onDragOver={e => e.preventDefault()}
              onDrop={e => void movePitch(e.dataTransfer.getData('pitch_id'), col.id)}
            >
              <div className="mb-2 text-sm" style={{ color: col.color }}>{col.label}</div>
              <div className="h-[calc(100%-24px)] space-y-2 overflow-y-auto">
                {pitches.filter(p => p.status === col.id).map(pitch => {
                  const deadlineDays = 10 - Math.floor((Date.now() - new Date(pitch.created_at).getTime()) / 86400000)
                  return (
                    <div
                      key={pitch.id}
                      draggable
                      onDragStart={e => e.dataTransfer.setData('pitch_id', pitch.id)}
                      className="cursor-grab rounded bg-[#1A1A23] p-2 text-xs"
                    >
                      <div className="text-sm font-medium">{pitch.track?.title || 'Track'}</div>
                      <div className="text-[#888]">{pitch.track?.artist || 'Artist'}</div>
                      <div className="mt-1">{pitch.supervisor_name || 'Supervisor'} / {pitch.project_name || 'Project'}</div>
                      <div>Budget: ${pitch.fee_offered || 0}</div>
                      <div>Date pitched: {new Date(pitch.created_at).toLocaleDateString()}</div>
                      <div>Deadline: {deadlineDays > 0 ? `${deadlineDays} days` : 'Expired'}</div>
                      <button type="button" className="mt-1 text-[#C8A97E]" onClick={() => setExpanded(expanded === pitch.id ? null : pitch.id)}>{expanded === pitch.id ? 'Hide' : 'Details'}</button>
                      {expanded === pitch.id && (
                        <textarea
                          className="mt-1 w-full rounded bg-[#0D0D12] p-1"
                          value={pitch.notes || ''}
                          onChange={e => setPitches(prev => prev.map(p => (p.id === pitch.id ? { ...p, notes: e.target.value } : p)))}
                        />
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
