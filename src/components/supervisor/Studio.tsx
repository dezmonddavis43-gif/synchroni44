import { useEffect, useMemo, useState } from 'react'
import { supabase } from '../../lib/supabase'
import type { Profile, Track } from '../../lib/types'
import { Music2, Upload, Play, Pause, Share2, Download, Plus, GripVertical } from 'lucide-react'

interface StudioProps { profile: Profile }
type SceneStatus = 'Searching' | 'Options Found' | 'Client Review' | 'Approved' | 'Licensed'
interface Scene { id: string; title: string; description: string; status: SceneStatus; duration: number; video_url?: string; tracks: (Track & { matchScore?: number; primary?: boolean })[] }

const statusColor: Record<SceneStatus, string> = { 'Searching': '#6B7280', 'Options Found': '#3B82F6', 'Client Review': '#F59E0B', 'Approved': '#22C55E', 'Licensed': '#C8A97E' }
const demoScenes: Scene[] = [
  { id: 's1', title: 'Opening Drone', description: 'Wide skyline reveal.', status: 'Options Found', duration: 12, tracks: [] },
  { id: 's2', title: 'Hero Product', description: 'Slow motion detail shot.', status: 'Client Review', duration: 18, tracks: [] }
]

export function Studio({ profile }: StudioProps) {
  const [projectName, setProjectName] = useState('Demo Project')
  const [clientName] = useState('111 Collective')
  const [tracks, setTracks] = useState<Track[]>([])
  const [scenes, setScenes] = useState<Scene[]>(demoScenes)
  const [activeSceneId, setActiveSceneId] = useState(demoScenes[0].id)
  const [search, setSearch] = useState('')
  const [moodFilter, setMoodFilter] = useState('All')
  const [playingTrack, setPlayingTrack] = useState<string | null>(null)

  useEffect(() => {
    const load = async () => {
      const { data } = await supabase.from('tracks').select('*').eq('status', 'active').limit(20)
      if (data && data.length > 0) {
        setTracks(data as Track[])
      }
    }
    load()
  }, [profile.id])

  const activeScene = scenes.find(s => s.id === activeSceneId) || scenes[0]

  const filteredTracks = useMemo(() => tracks.filter(t => {
    const q = search.toLowerCase()
    const matches = !q || t.title.toLowerCase().includes(q) || t.artist.toLowerCase().includes(q)
    const mood = moodFilter === 'All' || t.mood === moodFilter
    return matches && mood
  }), [tracks, search, moodFilter])

  const attachTrack = (track: Track) => {
    setScenes(prev => prev.map(s => s.id === activeSceneId ? { ...s, tracks: [...s.tracks, { ...track, matchScore: Math.floor(Math.random()*35)+65 }] } : s))
  }

  const setPrimary = (trackId: string) => setScenes(prev => prev.map(s => s.id === activeSceneId ? { ...s, tracks: s.tracks.map(t => ({ ...t, primary: t.id === trackId })) } : s))
  const removeTrack = (trackId: string) => setScenes(prev => prev.map(s => s.id === activeSceneId ? { ...s, tracks: s.tracks.filter(t => t.id !== trackId) } : s))

  const uploadVideoReference = async (file?: File) => {
    if (!file) return
    const path = `${profile.id}/${crypto.randomUUID()}-${file.name}`
    await supabase.storage.from('studio').upload(path, file)
  }

  return (
    <div className='h-[calc(100vh-76px)] p-4 md:p-6 bg-[#0A0A0C] text-[#E8E8E8] overflow-hidden flex flex-col gap-3'>
      <div className='flex items-center justify-between rounded-lg bg-[#111118] border border-[#1E1E24] px-4 py-3'>
        <div className='flex items-center gap-3'>
          <input className='bg-transparent text-lg font-semibold outline-none' value={projectName} onChange={(e) => setProjectName(e.target.value)} />
          <span className='text-sm text-[#888]'>Client: {clientName}</span>
        </div>
        <div className='flex items-center gap-2'>
          <button className='px-3 py-1.5 rounded bg-[#1A1A20] border border-[#2A2A2E] text-sm flex items-center gap-2'><Share2 className='w-4 h-4'/>Share</button>
          <button className='px-3 py-1.5 rounded bg-[#C8A97E] text-[#0A0A0C] text-sm flex items-center gap-2'><Download className='w-4 h-4'/>Export playlist</button>
        </div>
      </div>

      <div className='grid grid-cols-5 gap-3' style={{ height: '55%' }}>
        <div className='col-span-2 bg-[#101015] border border-[#1E1E24] rounded-lg p-3 flex flex-col'>
          <div className='flex-1 rounded bg-black/50 border border-[#222] flex items-center justify-center'>
            {activeScene?.video_url ? <video src={activeScene.video_url} className='w-full h-full object-contain' controls /> : <div className='text-center text-[#777]'><Music2 className='w-8 h-8 mx-auto mb-2' />{activeScene?.title || 'No scene selected'}</div>}
          </div>
          <div className='mt-2 text-xs text-[#888] flex items-center justify-between'><span>00:00:12</span><div className='flex gap-2'><button><Play className='w-4 h-4'/></button><button><Pause className='w-4 h-4'/></button></div><span>Vol 80%</span></div>
        </div>
        <div className='col-span-3 bg-[#101015] border border-[#1E1E24] rounded-lg p-3 flex flex-col'>
          <div className='flex gap-2 mb-2'><input className='flex-1 bg-[#191923] border border-[#2B2B34] rounded px-3 py-2 text-sm' placeholder='Search tracks' value={search} onChange={(e)=>setSearch(e.target.value)} />
            {['All','Cinematic','Hopeful','Tense'].map(m => <button key={m} onClick={() => setMoodFilter(m)} className={`px-2 py-1 text-xs rounded ${moodFilter===m?'bg-[#C8A97E] text-[#0A0A0C]':'bg-[#1B1B24] text-[#aaa]'}`}>{m}</button>)}
            <button className='px-2 py-1 text-xs rounded bg-[#7B9CFF]/20 text-[#8FB0FF]'>✦ AI Match This Scene</button>
          </div>
          <div className='overflow-y-auto space-y-2'>
            {filteredTracks.map(track => <div key={track.id} className='flex items-center gap-2 text-sm bg-[#15151D] border border-[#252532] rounded px-2 py-1'>
              <div className='w-8 h-8 rounded bg-[#2B2B34]' />
              <div className='flex-1'><p>{track.title}</p><p className='text-xs text-[#888]'>{track.artist} • {track.bpm || '-'} BPM • {track.mood || 'Mixed'}</p></div>
              <button onClick={() => setPlayingTrack(track.id)}>{playingTrack===track.id ? <Pause className='w-4 h-4'/> : <Play className='w-4 h-4'/>}</button>
              <button onClick={() => attachTrack(track)} className='text-xs text-[#C8A97E]'><GripVertical className='w-4 h-4'/></button>
            </div>)}
          </div>
        </div>
      </div>

      <div className='h-[20%] bg-[#101015] border border-[#1E1E24] rounded-lg p-3 overflow-y-auto'>
        <div className='flex gap-2 items-center mb-2'>
          <input value={activeScene.title} onChange={(e)=>setScenes(prev => prev.map(s => s.id===activeSceneId ? { ...s, title: e.target.value } : s))} className='bg-[#1A1A20] rounded px-2 py-1 text-sm' />
          <textarea value={activeScene.description} onChange={(e)=>setScenes(prev => prev.map(s => s.id===activeSceneId ? { ...s, description: e.target.value } : s))} className='flex-1 bg-[#1A1A20] rounded px-2 py-1 text-sm'/>
          <select value={activeScene.status} onChange={(e)=>setScenes(prev => prev.map(s => s.id===activeSceneId ? { ...s, status: e.target.value as SceneStatus } : s))} className='bg-[#1A1A20] rounded px-2 py-1 text-sm'>
            {Object.keys(statusColor).map(status => <option key={status}>{status}</option>)}
          </select>
          <label className='px-2 py-1 rounded border border-[#2A2A33] text-xs cursor-pointer'><Upload className='w-3 h-3 inline mr-1'/>Upload Video Reference<input type='file' className='hidden' onChange={(e) => uploadVideoReference(e.target.files?.[0])} /></label>
        </div>
        <div className='flex gap-2 flex-wrap'>
          {activeScene.tracks.map(track => <div key={track.id} className={`px-2 py-1 rounded border text-xs ${track.primary ? 'border-[#C8A97E] bg-[#C8A97E]/10' : 'border-[#2A2A33]'}`}>
            {track.title} • {track.artist} • {track.matchScore}%
            <button className='ml-2 text-[#C8A97E]' onClick={() => setPrimary(track.id)}>Set as Primary</button>
            <button className='ml-2 text-[#FF7B7B]' onClick={() => removeTrack(track.id)}>Remove</button>
          </div>)}
        </div>
      </div>

      <div className='h-[25%] bg-[#101015] border border-[#1E1E24] rounded-lg p-3 overflow-x-auto'>
        <div className='flex gap-3 h-full items-stretch'>
          {scenes.map(scene => <button key={scene.id} onClick={() => setActiveSceneId(scene.id)} className={`min-w-[220px] text-left rounded-lg border p-2 ${activeSceneId===scene.id ? 'border-[#C8A97E]' : 'border-[#2A2A33]'}`}>
            <p className='font-medium'>{scene.title}</p><p className='text-xs text-[#888]'>{scene.duration}s</p>
            <p className='text-xs mt-1' style={{ color: statusColor[scene.status] }}>{scene.status}</p>
            <p className='text-xs text-[#aaa] mt-1'>{scene.tracks.find(t => t.primary)?.title || 'No primary track'}</p>
          </button>)}
          <button onClick={() => setScenes(prev => [...prev, { id: crypto.randomUUID(), title: `Scene ${prev.length + 1}`, description: 'New scene', status: 'Searching', duration: 15, tracks: [] }])} className='min-w-[180px] rounded-lg border border-dashed border-[#2A2A33] text-[#aaa]'>
            <Plus className='w-4 h-4 inline mr-1'/> Add Scene
          </button>
        </div>
      </div>
    </div>
  )
}
