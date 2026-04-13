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

const seedPitches: Pitch[] = [
  { id: 'p1', track_id: 'demo-track-1', submitted_by: 'demo', supervisor_name: 'Morgan Lee', project_name: 'Adidas Summer', fee_offered: 4500, status: 'pitched', created_at: new Date().toISOString(), track: { id: 'demo-track-1', title: 'Afterlight', artist: 'Nova', uploaded_by: 'demo', created_at: new Date().toISOString() } as Track },
  { id: 'p2', track_id: 'demo-track-2', submitted_by: 'demo', supervisor_name: 'Kai Brooks', project_name: 'Hulu Teaser', fee_offered: 7000, status: 'in_review', created_at: new Date().toISOString(), track: { id: 'demo-track-2', title: 'Signal Flare', artist: 'Drex', uploaded_by: 'demo', created_at: new Date().toISOString() } as Track },
  { id: 'p3', track_id: 'demo-track-3', submitted_by: 'demo', supervisor_name: 'Lena Fox', project_name: 'Netflix Doc', fee_offered: 12000, status: 'licensed', created_at: new Date().toISOString(), track: { id: 'demo-track-3', title: 'Skyline Fade', artist: 'Arden', uploaded_by: 'demo', created_at: new Date().toISOString() } as Track }
] as any

export function PitchTracker({ profile }: PitchTrackerProps) {
  const [pitches, setPitches] = useState<Pitch[]>([])
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
      setPitches((pRes.data as any)?.length ? (pRes.data as any) : seedPitches)
      setTracks((tRes.data as any)?.length ? (tRes.data as any) : seedPitches.map(p => p.track!).filter(Boolean))
    }
    load()
  }, [profile.id, profile.role])

  const stats = useMemo(() => {
    const total = pitches.length
    const licensed = pitches.filter((p: any) => p.status === 'licensed').length
    const passRate = total ? Math.round((licensed / total) * 100) : 0
    const pipeline = pitches.filter((p: any) => ['pitched', 'in_review'].includes(p.status)).reduce((sum, p: any) => sum + (p.fee_offered || 0), 0)
    return { total, licensed, passRate, pipeline }
  }, [pitches])

  const movePitch = async (id: string, status: Pitch['status']) => {
    setPitches(prev => prev.map(p => p.id === id ? ({ ...p, status } as Pitch) : p))
    if (profile.role !== 'artist') await supabase.from('pitches').update({ status }).eq('id', id)
  }

  const createPitch = async () => {
    const track = tracks.find(t => t.id === form.track_id)
    const newPitch: Pitch = { id: crypto.randomUUID(), track_id: form.track_id, submitted_by: profile.id, supervisor_name: form.supervisor_name, project_name: form.project_name, fee_offered: form.fee_offered, notes: form.notes, status: 'pitched', created_at: new Date().toISOString(), track } as any
    setPitches(prev => [newPitch, ...prev])
    if (profile.role !== 'artist') await supabase.from('pitches').insert({ ...newPitch, label_id: profile.id })
    setShowNew(false)
  }

  return (
    <div className='h-[calc(100vh-76px)] p-4 md:p-6 overflow-hidden text-[#E8E8E8]'>
      <div className='flex justify-between mb-4'>
        <h2 className='text-xl font-semibold'>Pitch Tracker</h2>
        <button className='px-3 py-2 rounded bg-[#C8A97E] text-[#0A0A0C]' onClick={() => setShowNew(true)}>New pitch</button>
      </div>
      <div className='grid grid-cols-4 gap-3 mb-4 text-sm'>
        <div className='bg-[#13131A] p-3 rounded'>Total pitched: {stats.total}</div>
        <div className='bg-[#13131A] p-3 rounded'>Licensed: {stats.licensed}</div>
        <div className='bg-[#13131A] p-3 rounded'>Pass rate: {stats.passRate}%</div>
        <div className='bg-[#13131A] p-3 rounded'>Pipeline value: ${stats.pipeline.toLocaleString()}</div>
      </div>

      {showNew && <div className='bg-[#13131A] p-3 rounded mb-4 grid grid-cols-5 gap-2'>
        <select className='bg-[#0B0B10] rounded px-2' onChange={(e)=>setForm(prev => ({ ...prev, track_id: e.target.value }))}><option value=''>Track</option>{tracks.map(t => <option key={t.id} value={t.id}>{t.title}</option>)}</select>
        <input className='bg-[#0B0B10] rounded px-2' placeholder='Supervisor' onChange={(e)=>setForm(prev => ({ ...prev, supervisor_name: e.target.value }))}/>
        <input className='bg-[#0B0B10] rounded px-2' placeholder='Project' onChange={(e)=>setForm(prev => ({ ...prev, project_name: e.target.value }))}/>
        <input className='bg-[#0B0B10] rounded px-2' type='number' placeholder='Fee' onChange={(e)=>setForm(prev => ({ ...prev, fee_offered: Number(e.target.value) }))}/>
        <button className='bg-[#C8A97E] text-[#0A0A0C] rounded' onClick={createPitch}>Add</button>
      </div>}

      <div className='h-[calc(100%-170px)] overflow-x-auto'>
        <div className='flex gap-3 h-full min-w-max'>
          {columns.map(col => <div key={col.id} className='w-[260px] h-full bg-[#101016] border border-[#1E1E24] rounded-lg p-2' onDragOver={(e) => e.preventDefault()} onDrop={(e) => movePitch(e.dataTransfer.getData('pitch_id'), col.id as Pitch['status'])}>
            <div className='text-sm mb-2' style={{ color: col.color }}>{col.label}</div>
            <div className='space-y-2 overflow-y-auto h-[calc(100%-24px)]'>
              {pitches.filter((p: any) => p.status === col.id).map((pitch: any) => {
                const deadlineDays = 10 - Math.floor((Date.now() - new Date(pitch.created_at).getTime()) / 86400000)
                return <div key={pitch.id} draggable onDragStart={(e) => e.dataTransfer.setData('pitch_id', pitch.id)} className='bg-[#1A1A23] rounded p-2 text-xs cursor-grab'>
                  <div className='font-medium text-sm'>{pitch.track?.title || 'Track'}</div>
                  <div className='text-[#888]'>{pitch.track?.artist || 'Artist'}</div>
                  <div className='mt-1'>{pitch.supervisor_name || 'Supervisor'} / {pitch.project_name || 'Project'}</div>
                  <div>Budget: ${pitch.fee_offered || 0}</div>
                  <div>Date pitched: {new Date(pitch.created_at).toLocaleDateString()}</div>
                  <div>Deadline: {deadlineDays > 0 ? `${deadlineDays} days` : 'Expired'}</div>
                  <button className='text-[#C8A97E] mt-1' onClick={() => setExpanded(expanded === pitch.id ? null : pitch.id)}>{expanded === pitch.id ? 'Hide' : 'Details'}</button>
                  {expanded === pitch.id && <textarea className='w-full mt-1 bg-[#0D0D12] rounded p-1' value={pitch.notes || ''} onChange={(e)=>setPitches(prev => prev.map(p => p.id===pitch.id ? ({ ...p, notes: e.target.value } as any) : p))} />}
                </div>
              })}
            </div>
          </div>)}
        </div>
      </div>
    </div>
  )
}
