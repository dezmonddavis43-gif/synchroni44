import { useState, useEffect } from 'react'
import { Search, Plus, GripVertical } from 'lucide-react'
import { supabase } from '../../../lib/supabase'
import type { Track } from '../../../lib/types'
import { MOOD_COLORS } from './types'

const MOODS = ['All', 'Tense', 'Hopeful', 'Melancholic', 'Sensual', 'Aggressive', 'Peaceful']

interface CatalogPanelProps {
  onAddTrack: (track: Track) => void
}

function formatDuration(s?: number) {
  if (!s) return '--'
  const m = Math.floor(s / 60)
  const sec = Math.floor(s % 60)
  return `${m}:${String(sec).padStart(2, '0')}`
}

export function CatalogPanel({ onAddTrack }: CatalogPanelProps) {
  const [tracks, setTracks] = useState<Track[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [mood, setMood] = useState('All')
  const [genre, setGenre] = useState('')
  const [bpmMin, setBpmMin] = useState('')
  const [bpmMax, setBpmMax] = useState('')
  const [genres, setGenres] = useState<string[]>([])

  useEffect(() => {
    loadTracks()
  }, [])

  const loadTracks = async () => {
    setLoading(true)
    const { data } = await supabase
      .from('tracks')
      .select('*')
      .eq('status', 'active')
      .order('play_count', { ascending: false })

    if (data) {
      setTracks(data as Track[])
      const uniqueGenres = [...new Set(data.map((t: any) => t.genre).filter(Boolean))] as string[]
      setGenres(uniqueGenres)
    }
    setLoading(false)
  }

  const filtered = tracks.filter(t => {
    const q = search.toLowerCase()
    const matchSearch = !q || t.title.toLowerCase().includes(q) || t.artist.toLowerCase().includes(q) || (t.tags || []).some((tag: string) => tag.toLowerCase().includes(q))
    const matchMood = mood === 'All' || t.mood === mood
    const matchGenre = !genre || t.genre === genre
    const matchBpm = (!bpmMin || (t.bpm || 0) >= Number(bpmMin)) && (!bpmMax || (t.bpm || 0) <= Number(bpmMax))
    return matchSearch && matchMood && matchGenre && matchBpm
  })

  return (
    <div className="flex flex-col h-full" style={{ background: '#0A0A0E' }}>
      <div className="flex items-center gap-2 px-3 py-2 border-b border-[#111118] flex-shrink-0 flex-wrap">
        <div className="relative">
          <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3 h-3 text-[#555]" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search tracks, artists, tags..."
            className="pl-6 pr-3 py-1 text-xs bg-[#131318] border border-[#2A2A35] rounded text-[#E8E8E8] placeholder-[#444] outline-none focus:border-[#C8A97E] transition-colors"
            style={{ width: 200 }}
          />
        </div>

        <div className="flex gap-1 flex-wrap">
          {MOODS.map(m => (
            <button
              key={m}
              onClick={() => setMood(m)}
              className="text-[10px] px-2 py-0.5 rounded-full transition-colors"
              style={{
                background: mood === m ? '#C8A97E' : '#131318',
                color: mood === m ? '#0A0A0E' : '#888',
                border: `1px solid ${mood === m ? '#C8A97E' : '#2A2A35'}`,
              }}
            >
              {m}
            </button>
          ))}
        </div>

        {genres.length > 0 && (
          <select
            value={genre}
            onChange={e => setGenre(e.target.value)}
            className="text-[10px] px-2 py-0.5 bg-[#131318] border border-[#2A2A35] rounded text-[#888] outline-none"
          >
            <option value="">All Genres</option>
            {genres.map(g => <option key={g} value={g}>{g}</option>)}
          </select>
        )}

        <div className="flex items-center gap-1">
          <span className="text-[9px] text-[#555]">BPM</span>
          <input
            type="number"
            value={bpmMin}
            onChange={e => setBpmMin(e.target.value)}
            placeholder="min"
            className="w-10 text-[10px] bg-[#131318] border border-[#2A2A35] rounded text-[#888] text-center outline-none px-1 py-0.5"
          />
          <span className="text-[9px] text-[#444]">–</span>
          <input
            type="number"
            value={bpmMax}
            onChange={e => setBpmMax(e.target.value)}
            placeholder="max"
            className="w-10 text-[10px] bg-[#131318] border border-[#2A2A35] rounded text-[#888] text-center outline-none px-1 py-0.5"
          />
        </div>

        <span className="ml-auto text-[10px] text-[#444]">{filtered.length} tracks</span>
      </div>

      <div className="flex-1 overflow-y-auto">
        {loading ? (
          <div className="flex items-center justify-center h-full">
            <div className="w-5 h-5 border-2 border-[#C8A97E] border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (
          <table className="w-full text-xs">
            <colgroup>
              <col style={{ width: 24 }} />
              <col style={{ width: 32 }} />
              <col />
              <col style={{ width: 80 }} />
              <col style={{ width: 50 }} />
              <col style={{ width: 70 }} />
              <col style={{ width: 42 }} />
              <col style={{ width: 60 }} />
              <col style={{ width: 36 }} />
            </colgroup>
            <thead>
              <tr className="text-left border-b border-[#111118]">
                <th className="py-1 px-1" />
                <th className="py-1 px-1" />
                <th className="py-1 px-2 text-[9px] text-[#555] font-normal tracking-wider uppercase">Title</th>
                <th className="py-1 px-2 text-[9px] text-[#555] font-normal tracking-wider uppercase">Genre</th>
                <th className="py-1 px-2 text-[9px] text-[#555] font-normal tracking-wider uppercase">BPM</th>
                <th className="py-1 px-2 text-[9px] text-[#555] font-normal tracking-wider uppercase">Mood</th>
                <th className="py-1 px-2 text-[9px] text-[#555] font-normal tracking-wider uppercase">Dur</th>
                <th className="py-1 px-2 text-[9px] text-[#555] font-normal tracking-wider uppercase">Clear</th>
                <th className="py-1 px-1" />
              </tr>
            </thead>
            <tbody>
              {filtered.map(track => (
                <tr
                  key={track.id}
                  className="border-b border-[#0E0E14] hover:bg-[#131318] group transition-colors cursor-grab"
                  draggable
                  onDragStart={() => { (window as any).__studioTrack = track }}
                  onDragEnd={() => { delete (window as any).__studioTrack }}
                >
                  <td className="px-1 py-1 text-[#444] group-hover:text-[#666]">
                    <GripVertical className="w-3 h-3" />
                  </td>
                  <td className="px-1 py-1">
                    {track.cover_art_url || track.artwork_url ? (
                      <div
                        className="w-7 h-7 rounded"
                        style={{
                          background: `url(${track.cover_art_url || track.artwork_url}) center/cover`,
                        }}
                      />
                    ) : (
                      <div
                        className="w-7 h-7 rounded"
                        style={{
                          background: `linear-gradient(135deg, ${track.artwork_color || '#C8A97E'}44, ${track.artwork_color || '#7B9CFF'}22)`,
                        }}
                      />
                    )}
                  </td>
                  <td className="px-2 py-1">
                    <p className="text-[#E8E8E8] truncate max-w-[160px]">{track.title}</p>
                    <p className="text-[#666] truncate max-w-[160px]">{track.artist}</p>
                  </td>
                  <td className="px-2 py-1 text-[#666]">{track.genre || '–'}</td>
                  <td className="px-2 py-1 text-[#666]">{track.bpm || '–'}</td>
                  <td className="px-2 py-1">
                    {track.mood ? (
                      <span
                        className="px-1.5 py-0.5 rounded-full text-[9px]"
                        style={{
                          background: (MOOD_COLORS[track.mood] || '#888') + '22',
                          color: MOOD_COLORS[track.mood] || '#888',
                        }}
                      >
                        {track.mood}
                      </span>
                    ) : <span className="text-[#444]">–</span>}
                  </td>
                  <td className="px-2 py-1 text-[#555]">{formatDuration(track.duration || track.duration_seconds)}</td>
                  <td className="px-2 py-1">
                    {track.clearance_status && (
                      <span
                        className="px-1.5 py-0.5 rounded text-[9px]"
                        style={{
                          background: track.clearance_status === 'CLEAR' ? '#22C55E22' : '#F59E0B22',
                          color: track.clearance_status === 'CLEAR' ? '#22C55E' : '#F59E0B',
                        }}
                      >
                        {track.clearance_status}
                      </span>
                    )}
                  </td>
                  <td className="px-1 py-1">
                    <button
                      onClick={() => onAddTrack(track)}
                      className="p-1 rounded border border-[#2a2a35] text-[#666] hover:border-[#C8A97E] hover:text-[#C8A97E] transition-colors opacity-0 group-hover:opacity-100"
                    >
                      <Plus className="w-3 h-3" />
                    </button>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && !loading && (
                <tr>
                  <td colSpan={9} className="py-6 text-center text-[#444] text-xs">
                    No tracks match your filters
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
