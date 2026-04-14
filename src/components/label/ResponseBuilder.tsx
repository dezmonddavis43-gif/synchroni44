import { useEffect, useMemo, useState } from 'react'
import { supabase } from '../../lib/supabase'
import type { Brief, BriefSend, Profile, Track } from '../../lib/types'

interface ResponseBuilderProps { profile: Profile; onPlayTrack: (track: Track) => void; currentTrack: Track | null; playing: boolean }
interface BucketTrack { id: string; bucket: string; track: Track; quote: number; notes: string }

const demoBriefs = [
  { id: 'b1', title: 'Sports Promo', description: 'High energy for playoff trailer', mood: 'Aggressive', genre: 'Hip-Hop', bpm_min: 110, bpm_max: 145, usage_terms: 'Worldwide digital' },
  { id: 'b2', title: 'Lifestyle Brand Film', description: 'Hopeful indie pop', mood: 'Hopeful', genre: 'Pop', bpm_min: 90, bpm_max: 120, usage_terms: '12 month campaign' },
  { id: 'b3', title: 'Docu Teaser', description: 'Minimal emotional cue', mood: 'Nostalgic', genre: 'Ambient', bpm_min: 70, bpm_max: 100, usage_terms: 'Festival + streaming' },
  { id: 'b4', title: 'Reality TV Open', description: 'Punchy pop transitions', mood: 'Energetic', genre: 'Pop', bpm_min: 100, bpm_max: 130, usage_terms: 'Broadcast + social' },
  { id: 'b5', title: 'Tech Launch', description: 'Futuristic tension', mood: 'Tense', genre: 'Electronic', bpm_min: 95, bpm_max: 130, usage_terms: 'Global paid media' }
] as Partial<Brief>[]

export function ResponseBuilder({ profile }: ResponseBuilderProps) {
  const [briefs, setBriefs] = useState<(BriefSend & { brief?: Brief })[]>([])
  const [selectedBriefId, setSelectedBriefId] = useState('')
  const [catalog, setCatalog] = useState<Track[]>([])
  const [search, setSearch] = useState('')
  const [message, setMessage] = useState('')
  const [bucketTracks, setBucketTracks] = useState<Record<string, BucketTrack[]>>({ indie: [], mid: [], premium: [] })

  useEffect(() => {
    const load = async () => {
      const [briefRes, trackRes] = await Promise.all([
        supabase.from('brief_sends').select('*, brief:briefs(*)').eq('recipient_id', profile.id),
        supabase.from('tracks').select('*').eq('status', 'active').eq('label_id', profile.id)
      ])
      const demoRows: (BriefSend & { brief?: Brief })[] = demoBriefs.map((b, i) => ({
        id: `demo-send-${i}`,
        brief_id: b.id!,
        recipient_id: profile.id,
        sent_at: new Date().toISOString(),
        opened: false,
        submitted: false,
        brief: b as Brief,
      }))
      setBriefs(briefRes.data?.length ? (briefRes.data as (BriefSend & { brief?: Brief })[]) : demoRows)
      setSelectedBriefId((briefRes.data?.[0]?.brief_id || demoBriefs[0].id) as string)
      setCatalog((trackRes.data && trackRes.data.length ? trackRes.data : [{ id: 't1', title: 'Neon Pulse', artist: 'Nova', uploaded_by: profile.id, created_at: new Date().toISOString(), mood: 'Tense', bpm: 122 } as Track]))
    }
    load()
  }, [profile.id])

  const selectedBrief = useMemo(() => briefs.find(b => b.brief_id === selectedBriefId)?.brief || (demoBriefs.find(b => b.id === selectedBriefId) as Brief | undefined), [briefs, selectedBriefId])
  const filtered = catalog.filter(t => !search || t.title.toLowerCase().includes(search.toLowerCase()) || t.artist.toLowerCase().includes(search.toLowerCase()))

  const addTrack = (bucket: string, track: Track) => setBucketTracks(prev => ({ ...prev, [bucket]: [...prev[bucket], { id: crypto.randomUUID(), bucket, track, quote: track.one_stop_fee || 0, notes: '' }] }))
  const sendResponse = async () => {
    const { data: response } = await supabase.from('brief_responses').insert({ brief_id: selectedBriefId, responder_id: profile.id, message, status: 'submitted', submitted_at: new Date().toISOString() }).select('id').single()
    if (!response) return
    const rows = Object.values(bucketTracks).flat().map((bt, i) => ({ response_id: response.id, track_id: bt.track.id, quote_amount: bt.quote, notes: bt.notes, position: i }))
    if (rows.length) await supabase.from('brief_response_tracks').insert(rows)
    alert('Response sent')
  }

  const bucketMeta = [{ id: 'indie', label: '$500-$2k', color: '#7B9CFF' }, { id: 'mid', label: '$2k-$10k', color: '#C8A97E' }, { id: 'premium', label: '$10k+', color: '#4DFFB4' }]

  return (
    <div className='h-[calc(100vh-76px)] p-4 md:p-6 bg-[#0A0A0C] text-[#E8E8E8]'>
      <div className='h-full grid grid-cols-[380px_1fr_280px] gap-3'>
        <div className='bg-[#111118] border border-[#1E1E24] rounded-lg p-3 overflow-y-auto'>
          <select className='w-full bg-[#1B1B24] rounded px-2 py-2 mb-3' value={selectedBriefId} onChange={(e) => setSelectedBriefId(e.target.value)}>
            {briefs.map(b => <option key={b.id} value={b.brief_id}>{b.brief?.title || 'Brief'}</option>)}
          </select>
          <h3 className='font-semibold'>{selectedBrief?.title}</h3>
          <p className='text-sm text-[#888] mt-2'>{selectedBrief?.description}</p>
          <div className='text-xs text-[#aaa] mt-2'>Mood: {selectedBrief?.mood} • Genre: {selectedBrief?.genre} • BPM: {selectedBrief?.bpm_min}-{selectedBrief?.bpm_max}</div>
          <div className='text-xs text-[#aaa] mt-1'>Usage terms: {selectedBrief?.usage_terms || 'Standard sync'}</div>
          <div className='mt-4 space-y-2'>{bucketMeta.map(b => <div key={b.id} className='rounded p-2 text-xs' style={{ background: `${b.color}22`, border: `1px solid ${b.color}55` }}>{b.label}</div>)}</div>
          <button className='mt-4 w-full py-2 rounded bg-[#7B9CFF]/20 text-[#95B1FF]'>✦ AI Pre-fill</button>
        </div>

        <div className='bg-[#111118] border border-[#1E1E24] rounded-lg p-3 overflow-y-auto'>
          {bucketMeta.map(b => {
            const total = bucketTracks[b.id].reduce((sum, t) => sum + (t.quote || 0), 0)
            return <details key={b.id} open className='mb-3 rounded border border-[#2A2A33]'>
              <summary className='cursor-pointer px-3 py-2 text-sm flex items-center justify-between' style={{ background: `${b.color}1A` }}><span>{b.label}</span><span>${total.toLocaleString()}</span></summary>
              <div className='p-2 space-y-2'>
                {bucketTracks[b.id].map(item => <div key={item.id} className='grid grid-cols-[20px_1fr_90px_1fr] gap-2 items-center text-sm bg-[#181821] p-2 rounded'>
                  <span>⋮⋮</span><span>{item.track.title} — {item.track.artist}</span>
                  <input type='number' className='bg-[#0E0E13] rounded px-2 py-1' value={item.quote} onChange={(e) => setBucketTracks(prev => ({ ...prev, [b.id]: prev[b.id].map(t => t.id===item.id ? { ...t, quote: Number(e.target.value) } : t) }))} />
                  <input className='bg-[#0E0E13] rounded px-2 py-1' placeholder='notes' value={item.notes} onChange={(e) => setBucketTracks(prev => ({ ...prev, [b.id]: prev[b.id].map(t => t.id===item.id ? { ...t, notes: e.target.value } : t) }))} />
                </div>)}
                <button className='text-xs text-[#C8A97E]'>Add Track</button>
              </div>
            </details>
          })}
          <textarea className='w-full h-24 bg-[#1B1B24] rounded p-2 text-sm mt-2' placeholder='Response message' value={message} onChange={(e)=>setMessage(e.target.value)} />
          <button onClick={sendResponse} className='mt-2 px-3 py-2 rounded bg-[#C8A97E] text-[#0A0A0C]'>Send Response</button>
        </div>

        <div className='bg-[#111118] border border-[#1E1E24] rounded-lg p-3 overflow-y-auto'>
          <input className='w-full bg-[#1B1B24] rounded px-2 py-2 mb-2' placeholder='Search catalog' value={search} onChange={(e) => setSearch(e.target.value)} />
          {filtered.map(track => <button key={track.id} onClick={() => addTrack('mid', track)} className='w-full text-left bg-[#191922] rounded p-2 mb-2 text-sm hover:bg-[#20202B]'>
            <div>{track.title}</div><div className='text-xs text-[#888]'>{track.artist} • {track.mood || 'Mixed'}</div>
          </button>)}
        </div>
      </div>
    </div>
  )
}
