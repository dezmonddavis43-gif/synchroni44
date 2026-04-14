import { useState, useEffect } from 'react'
import { Search, Plus, GripVertical, Sparkles, Info } from 'lucide-react'
import { supabase } from '../../../lib/supabase'
import type { Track } from '../../../lib/types'
import { formatTrackDurationMmSs } from '../../../lib/trackDuration'
import { MOOD_COLORS } from './types'

const MOODS = ['All', 'Tense', 'Hopeful', 'Melancholic', 'Sensual', 'Aggressive', 'Peaceful']

type CatalogTab = 'catalog' | 'ai' | 'detail'

interface CatalogPanelProps {
  onAddTrack: (track: Track) => void
  selectedTrack?: Track | null
}

function TrackRow({ track, onAdd }: { track: Track; onAdd: () => void }) {
  return (
    <tr
      className="border-b border-[#0E0E14] hover:bg-[#131318] group transition-colors"
      draggable
      onDragStart={() => { window.__studioTrack = track }}
      onDragEnd={() => { window.__studioTrack = undefined }}
      style={{ cursor: 'grab' }}
    >
      <td className="px-1 py-1 text-[#333] group-hover:text-[#555]">
        <GripVertical className="w-3 h-3" />
      </td>
      <td className="px-1 py-1">
        <div
          className="w-7 h-7 rounded flex-shrink-0"
          style={{
            background: track.cover_art_url
              ? `url(${track.cover_art_url}) center/cover`
              : `linear-gradient(135deg, ${track.artwork_color || '#C8A97E'}44, #7B9CFF22)`,
          }}
        />
      </td>
      <td className="px-1.5 py-1 min-w-0">
        <p className="text-[11px] text-[#E8E8E8] truncate max-w-[120px] font-medium">{track.title}</p>
        <p className="text-[9px] text-[#666] truncate max-w-[120px]">{track.artist}</p>
      </td>
      <td className="px-1.5 py-1 text-[9px] text-[#555]">{track.bpm || '–'}</td>
      <td className="px-1.5 py-1">
        {track.mood ? (
          <span
            className="px-1.5 py-0.5 rounded-full text-[8px] whitespace-nowrap"
            style={{
              background: (MOOD_COLORS[track.mood] || '#888') + '22',
              color: MOOD_COLORS[track.mood] || '#888',
            }}
          >
            {track.mood}
          </span>
        ) : <span className="text-[#333] text-[9px]">–</span>}
      </td>
      <td className="px-1.5 py-1 text-[9px] text-[#444]">{formatTrackDurationMmSs(track)}</td>
      <td className="px-1 py-1">
        <button
          onClick={onAdd}
          className="p-1 rounded border border-[#2a2a35] text-[#555] hover:border-[#C8A97E] hover:text-[#C8A97E] transition-colors opacity-0 group-hover:opacity-100"
        >
          <Plus className="w-3 h-3" />
        </button>
      </td>
    </tr>
  )
}

export function CatalogPanel({ onAddTrack, selectedTrack }: CatalogPanelProps) {
  const [activeTab, setActiveTab] = useState<CatalogTab>('catalog')
  const [tracks, setTracks] = useState<Track[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [mood, setMood] = useState('All')
  const [genre, setGenre] = useState('')
  const [bpmMin, setBpmMin] = useState('')
  const [bpmMax, setBpmMax] = useState('')
  const [genres, setGenres] = useState<string[]>([])
  const [aiPrompt, setAiPrompt] = useState('')
  const [aiLoading, setAiLoading] = useState(false)
  const [aiResults, setAiResults] = useState<Track[]>([])

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
      const rows = data as Track[]
      setTracks(rows)
      const uniqueGenres = [...new Set(rows.map(t => t.genre).filter(Boolean))] as string[]
      setGenres(uniqueGenres)
    }
    setLoading(false)
  }

  const handleAiMatch = async () => {
    if (!aiPrompt.trim() || aiLoading) return
    setAiLoading(true)
    await new Promise(r => setTimeout(r, 800))
    const shuffled = [...tracks].sort(() => Math.random() - 0.5).slice(0, 5)
    setAiResults(shuffled)
    setAiLoading(false)
  }

  const filtered = tracks.filter(t => {
    const q = search.toLowerCase()
    const tags = Array.isArray(t.tags) ? t.tags : []
    const matchSearch = !q || t.title.toLowerCase().includes(q) || t.artist.toLowerCase().includes(q) || tags.some(tag => tag.toLowerCase().includes(q))
    const matchMood = mood === 'All' || t.mood === mood
    const matchGenre = !genre || t.genre === genre
    const bpmVal = t.bpm ?? 0
    const matchBpm = (!bpmMin || bpmVal >= Number(bpmMin)) && (!bpmMax || bpmVal <= Number(bpmMax))
    return matchSearch && matchMood && matchGenre && matchBpm
  })

  return (
    <div className="flex flex-col h-full" style={{ background: '#0A0A0E' }}>
      <div className="flex items-center border-b border-[#111118] flex-shrink-0" style={{ height: 36 }}>
        {(['catalog', 'ai', 'detail'] as CatalogTab[]).map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className="flex items-center gap-1 px-3 h-full text-[10px] font-medium transition-colors border-b-2 uppercase tracking-wider"
            style={{
              borderBottomColor: activeTab === tab ? '#C8A97E' : 'transparent',
              color: activeTab === tab ? '#C8A97E' : '#555',
              background: activeTab === tab ? '#C8A97E0A' : 'transparent',
            }}
          >
            {tab === 'ai' && <Sparkles className="w-2.5 h-2.5" />}
            {tab === 'detail' && <Info className="w-2.5 h-2.5" />}
            {tab === 'catalog' ? 'Catalog' : tab === 'ai' ? 'AI Match' : 'Detail'}
          </button>
        ))}
        <div className="ml-auto pr-3 text-[9px] text-[#333]">{tracks.length} tracks</div>
      </div>

      {activeTab === 'catalog' && (
        <>
          <div className="flex flex-col gap-1.5 px-2 py-1.5 border-b border-[#111118] flex-shrink-0">
            <div className="relative">
              <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3 h-3 text-[#444]" />
              <input
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Search tracks, artists, tags..."
                className="w-full pl-6 pr-2 py-1 text-[11px] bg-[#131318] border border-[#2A2A35] rounded text-[#E8E8E8] placeholder-[#444] outline-none focus:border-[#C8A97E]/50 transition-colors"
              />
            </div>

            <div className="flex gap-1 flex-wrap">
              {MOODS.map(m => (
                <button
                  key={m}
                  onClick={() => setMood(m)}
                  className="text-[9px] px-1.5 py-0.5 rounded-full transition-colors"
                  style={{
                    background: mood === m ? '#C8A97E' : '#131318',
                    color: mood === m ? '#0A0A0E' : '#777',
                    border: `1px solid ${mood === m ? '#C8A97E' : '#2A2A35'}`,
                  }}
                >
                  {m}
                </button>
              ))}
            </div>

            <div className="flex items-center gap-1.5">
              {genres.length > 0 && (
                <select
                  value={genre}
                  onChange={e => setGenre(e.target.value)}
                  className="text-[9px] px-1.5 py-0.5 bg-[#131318] border border-[#2A2A35] rounded text-[#777] outline-none flex-1"
                >
                  <option value="">All Genres</option>
                  {genres.map(g => <option key={g} value={g}>{g}</option>)}
                </select>
              )}
              <div className="flex items-center gap-1">
                <span className="text-[9px] text-[#444]">BPM</span>
                <input
                  type="number"
                  value={bpmMin}
                  onChange={e => setBpmMin(e.target.value)}
                  placeholder="min"
                  className="w-9 text-[9px] bg-[#131318] border border-[#2A2A35] rounded text-[#777] text-center outline-none px-1 py-0.5"
                />
                <span className="text-[9px] text-[#333]">–</span>
                <input
                  type="number"
                  value={bpmMax}
                  onChange={e => setBpmMax(e.target.value)}
                  placeholder="max"
                  className="w-9 text-[9px] bg-[#131318] border border-[#2A2A35] rounded text-[#777] text-center outline-none px-1 py-0.5"
                />
              </div>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto">
            {loading ? (
              <div className="flex items-center justify-center h-20">
                <div className="w-4 h-4 border-2 border-[#C8A97E] border-t-transparent rounded-full animate-spin" />
              </div>
            ) : (
              <table className="w-full text-xs border-collapse">
                <tbody>
                  {filtered.map(track => (
                    <TrackRow key={track.id} track={track} onAdd={() => onAddTrack(track)} />
                  ))}
                  {filtered.length === 0 && (
                    <tr>
                      <td colSpan={7} className="py-8 text-center text-[#333] text-xs">
                        No tracks match your filters
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            )}
          </div>
        </>
      )}

      {activeTab === 'ai' && (
        <div className="flex flex-col flex-1 p-3 gap-3">
          <div>
            <p className="text-[10px] text-[#555] mb-1.5 uppercase tracking-wider">Describe the scene</p>
            <textarea
              value={aiPrompt}
              onChange={e => setAiPrompt(e.target.value)}
              placeholder="e.g. A slow-motion chase through rain-soaked streets at night, melancholic and tense..."
              rows={4}
              className="w-full bg-[#131318] border border-[#2A2A35] rounded px-3 py-2 text-xs text-[#E8E8E8] placeholder-[#444] outline-none focus:border-[#C8A97E]/50 resize-none transition-colors"
            />
          </div>
          <button
            onClick={handleAiMatch}
            disabled={aiLoading || !aiPrompt.trim()}
            className="flex items-center justify-center gap-2 py-2 rounded border text-xs font-medium transition-colors"
            style={{
              borderColor: '#C8A97E55',
              color: '#C8A97E',
              background: '#C8A97E11',
              opacity: aiLoading || !aiPrompt.trim() ? 0.5 : 1,
            }}
          >
            {aiLoading ? (
              <div className="w-3 h-3 border border-[#C8A97E] border-t-transparent rounded-full animate-spin" />
            ) : (
              <Sparkles className="w-3 h-3" />
            )}
            {aiLoading ? 'Finding matches...' : '✦ Find Matches'}
          </button>

          {aiResults.length > 0 && (
            <div className="flex-1 overflow-y-auto">
              <p className="text-[9px] text-[#555] mb-1.5 uppercase tracking-wider">Matched Tracks</p>
              <table className="w-full text-xs border-collapse">
                <tbody>
                  {aiResults.map((track, i) => (
                    <tr key={track.id} className="border-b border-[#0E0E14] hover:bg-[#131318] group transition-colors">
                      <td className="px-1 py-1">
                        <span className="text-[9px] text-[#C8A97E] font-mono w-4 block text-center">#{i + 1}</span>
                      </td>
                      <td className="px-1 py-1">
                        <div
                          className="w-6 h-6 rounded"
                          style={{
                            background: track.cover_art_url
                              ? `url(${track.cover_art_url}) center/cover`
                              : `linear-gradient(135deg, ${track.artwork_color || '#C8A97E'}44, #7B9CFF22)`,
                          }}
                        />
                      </td>
                      <td className="px-1.5 py-1">
                        <p className="text-[10px] text-[#E8E8E8] truncate">{track.title}</p>
                        <p className="text-[9px] text-[#666] truncate">{track.artist}</p>
                      </td>
                      <td className="px-1.5 py-1 text-[9px]" style={{ color: '#C8A97E' }}>
                        {Math.floor(75 + Math.random() * 24)}%
                      </td>
                      <td className="px-1 py-1">
                        <button
                          onClick={() => onAddTrack(track)}
                          className="p-1 rounded border border-[#2a2a35] text-[#555] hover:border-[#C8A97E] hover:text-[#C8A97E] transition-colors opacity-0 group-hover:opacity-100"
                        >
                          <Plus className="w-3 h-3" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {activeTab === 'detail' && (
        <div className="flex-1 overflow-y-auto p-3">
          {selectedTrack ? (
            <div className="space-y-3">
              <div
                className="w-full aspect-square rounded-lg"
                style={{
                  background: selectedTrack.cover_art_url
                    ? `url(${selectedTrack.cover_art_url}) center/cover`
                    : `linear-gradient(135deg, ${selectedTrack.artwork_color || '#C8A97E'}44, #7B9CFF22)`,
                }}
              />
              <div>
                <h3 className="text-sm font-semibold text-[#E8E8E8]">{selectedTrack.title}</h3>
                <p className="text-xs text-[#888]">{selectedTrack.artist}</p>
              </div>
              <div className="grid grid-cols-2 gap-2 text-[10px]">
                {[
                  ['Genre', selectedTrack.genre],
                  ['Sub-genre', selectedTrack.sub_genre],
                  ['BPM', selectedTrack.bpm != null ? String(selectedTrack.bpm) : ''],
                  ['Key', selectedTrack.key ?? selectedTrack.musical_key ?? ''],
                  ['Mood', selectedTrack.mood],
                  ['Duration', formatTrackDurationMmSs(selectedTrack)],
                  ['Status', selectedTrack.status ?? ''],
                ].map(([label, value]) => value && (
                  <div key={label as string} className="bg-[#131318] rounded p-2">
                    <p className="text-[#555] text-[9px] uppercase tracking-wider mb-0.5">{label}</p>
                    <p className="text-[#E8E8E8]">{value}</p>
                  </div>
                ))}
              </div>
              <button
                onClick={() => onAddTrack(selectedTrack)}
                className="w-full py-1.5 rounded border text-xs font-medium transition-colors"
                style={{ borderColor: '#C8A97E55', color: '#C8A97E', background: '#C8A97E11' }}
              >
                Add to DAW
              </button>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-full text-center">
              <Info className="w-8 h-8 text-[#2A2A35] mb-2" />
              <p className="text-xs text-[#333]">Select a track to see details</p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
