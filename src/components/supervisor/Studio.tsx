import { useCallback, useEffect, useMemo, useState } from 'react'
import { supabase } from '../../lib/supabase'
import type { Profile, Track } from '../../lib/types'
import { formatTrackDurationMmSs } from '../../lib/trackDuration'
import { Music2, Search, Upload } from 'lucide-react'

const ACCENT = '#C9A84C'
const BG = '#050506'

interface StudioProps {
  profile: Profile
  /** Jump to the platform Upload tab (supervisor primary action). */
  onNavigateToUpload?: () => void
}

function statusLabel(s?: string) {
  if (!s) return '—'
  return s.charAt(0).toUpperCase() + s.slice(1)
}

export function Studio({ profile, onNavigateToUpload }: StudioProps) {
  const [tracks, setTracks] = useState<Track[]>([])
  const [loading, setLoading] = useState(true)
  const [loadErr, setLoadErr] = useState<string | null>(null)
  const [selected, setSelected] = useState<Track | null>(null)
  const [query, setQuery] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    setLoadErr(null)
    const { data, error } = await supabase
      .from('tracks')
      .select('*')
      .eq('status', 'active')
      .order('created_at', { ascending: false })
      .limit(200)
    if (error) setLoadErr(error.message)
    else setTracks(data || [])
    setLoading(false)
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return tracks
    return tracks.filter(
      t =>
        t.title.toLowerCase().includes(q) ||
        t.artist.toLowerCase().includes(q) ||
        (t.genre && t.genre.toLowerCase().includes(q)) ||
        (t.sub_genre && t.sub_genre.toLowerCase().includes(q))
    )
  }, [tracks, query])

  if (profile.role !== 'supervisor' && profile.role !== 'admin') {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-76px)]" style={{ background: BG }}>
        <p className="text-[#666] text-sm">Supervisor access only</p>
      </div>
    )
  }

  return (
    <div
      className="flex flex-col h-[calc(100vh-76px)] overflow-hidden"
      style={{ background: BG, color: '#E8E6E1' }}
    >
      <header className="flex flex-col gap-3 border-b border-white/[0.08] px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6 shrink-0">
        <div>
          <h1 className="font-['Playfair_Display',Georgia,serif] text-xl sm:text-2xl text-[#F4F2EC]">Studio</h1>
          <p className="text-xs text-[#6B6B74] mt-0.5">Prep tracks for sync — minimal, focused</p>
        </div>
        <button
          type="button"
          onClick={() => onNavigateToUpload?.()}
          className="min-h-[44px] px-5 rounded-lg text-sm font-medium text-[#0A0A0C] transition hover:brightness-110 w-full sm:w-auto"
          style={{ background: ACCENT }}
        >
          <span className="inline-flex items-center justify-center gap-2">
            <Upload className="w-4 h-4" aria-hidden />
            Upload Track
          </span>
        </button>
      </header>

      <div className="flex flex-1 min-h-0 flex-col lg:flex-row">
        <section className="flex flex-col border-b border-white/[0.08] lg:border-b-0 lg:border-r lg:w-[min(100%,400px)] shrink-0 min-h-0 lg:max-h-none max-h-[min(50vh,420px)] lg:max-h-none">
          <div className="p-3 border-b border-white/[0.06] shrink-0">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#555]" />
              <input
                value={query}
                onChange={e => setQuery(e.target.value)}
                placeholder="Search tracks…"
                className="w-full min-h-[44px] rounded-lg border border-white/[0.08] bg-[#0A0A10] py-2.5 pl-9 pr-3 text-sm text-[#E8E8E8] placeholder:text-[#555] outline-none focus:border-[rgba(201,168,76,0.45)]"
                aria-label="Search tracks"
              />
            </div>
          </div>

          <div className="flex-1 overflow-y-auto overscroll-contain">
            {loading ? (
              <p className="p-8 text-center text-sm text-[#666]">Loading…</p>
            ) : loadErr ? (
              <p className="p-4 text-sm text-red-400/90">{loadErr}</p>
            ) : filtered.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 px-6 text-center">
                <Music2 className="mb-4 h-12 w-12 text-[#3D3D45]" aria-hidden />
                <p className="text-sm text-[#6B6B74]">No tracks yet. Upload your first.</p>
              </div>
            ) : (
              filtered.map(t => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => setSelected(t)}
                  className={`flex w-full min-h-[48px] items-center gap-3 border-b border-white/[0.04] px-4 py-3 text-left transition ${
                    selected?.id === t.id ? 'bg-[rgba(201,168,76,0.08)]' : 'hover:bg-white/[0.03]'
                  }`}
                >
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-[#F4F2EC]">{t.title}</p>
                    <p className="truncate text-xs text-[#7D7D88]">{t.artist}</p>
                  </div>
                  <span className="shrink-0 tabular-nums text-xs text-[#7D7D88]">{formatTrackDurationMmSs(t)}</span>
                  <span className="hidden shrink-0 rounded border border-white/[0.12] px-2 py-0.5 text-[10px] uppercase tracking-wide text-[#BAB8B2] sm:inline">
                    {statusLabel(t.status)}
                  </span>
                </button>
              ))
            )}
          </div>
        </section>

        <section className="flex min-h-0 flex-1 flex-col overflow-y-auto p-4 sm:p-6 lg:p-8">
          {!selected ? (
            <div className="flex flex-1 flex-col items-center justify-center py-12 text-center">
              <Music2 className="mb-4 h-14 w-14 text-[#3D3D45] opacity-80" aria-hidden />
              <p className="max-w-xs text-sm text-[#6B6B74]">Select a track for detail, waveform, and notes</p>
            </div>
          ) : (
            <>
              <h2 className="mb-6 break-words font-['Playfair_Display'] text-2xl text-[#F4F2EC] sm:text-3xl">
                {selected.title}
              </h2>
              <p className="mb-6 text-sm text-[#7D7D88]">{selected.artist}</p>

              <div
                className="mb-8 flex h-24 items-center justify-center rounded-lg border border-white/[0.08] bg-gradient-to-r from-[#14141c] to-[#0a0a10]"
                aria-hidden
              >
                <span className="text-xs uppercase tracking-[0.2em] text-[#5C5C66]">Waveform</span>
              </div>

              <div className="mb-8 grid grid-cols-2 gap-3 sm:grid-cols-4 sm:gap-4">
                {[
                  ['BPM', selected.bpm != null ? String(selected.bpm) : '—'],
                  ['Key', selected.key ?? selected.musical_key ?? '—'],
                  ['Mood', selected.mood ?? '—'],
                  ['Genre', selected.genre ?? '—'],
                ].map(([k, v]) => (
                  <div key={k} className="rounded-lg border border-white/[0.08] bg-[#0A0A10] p-4">
                    <p className="mb-1 text-[10px] uppercase tracking-wider text-[#6B6B74]">{k}</p>
                    <p className="text-sm text-[#E8E8E8]">{v}</p>
                  </div>
                ))}
              </div>

              {selected.sub_genre ? (
                <p className="mb-6 text-sm text-[#9A9AA3]">
                  <span className="text-[#6B6B74]">Sub-genre</span> · {selected.sub_genre}
                </p>
              ) : null}

              <div>
                <p className="mb-2 text-[10px] uppercase tracking-wider" style={{ color: ACCENT }}>
                  Notes
                </p>
                <div className="min-h-[120px] rounded-lg border border-white/[0.08] bg-[#0A0A10] p-4 text-sm leading-relaxed text-[#BAB8B2] whitespace-pre-wrap">
                  {selected.notes || selected.ownership_notes || 'No notes for this track.'}
                </div>
              </div>
            </>
          )}
        </section>
      </div>
    </div>
  )
}
