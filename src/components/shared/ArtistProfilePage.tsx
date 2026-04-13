import { useEffect, useMemo, useState } from 'react'
import { ArrowLeft, Play, Pause } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import type { Track } from '../../lib/types'
import { MoodPill, Spinner, TrackArtwork } from './UI'

interface ArtistProfilePageProps {
  artistSlug: string
  onPlayTrack: (track: Track) => void
  currentTrack: Track | null
  playing: boolean
  onBack: () => void
}

export function ArtistProfilePage({ artistSlug, onPlayTrack, currentTrack, playing, onBack }: ArtistProfilePageProps) {
  const [tracks, setTracks] = useState<Track[]>([])
  const [loading, setLoading] = useState(true)
  const [hoveredTrack, setHoveredTrack] = useState<string | null>(null)

  const artistName = useMemo(() => decodeURIComponent(artistSlug || '').trim(), [artistSlug])

  useEffect(() => {
    const loadArtistTracks = async () => {
      setLoading(true)
      const { data } = await supabase
        .from('tracks')
        .select('id, title, artist, bpm, mood, genre, audio_url, artwork_url, artwork_color, created_at')
        .eq('artist', artistName)
        .eq('status', 'active')
        .order('created_at', { ascending: false })

      setTracks((data || []) as Track[])
      setLoading(false)
    }

    if (artistName) {
      loadArtistTracks()
    }
  }, [artistName])

  if (loading) {
    return <div className="flex items-center justify-center h-full"><Spinner size="lg" /></div>
  }

  const heroTrack = tracks.find(t => t.artwork_url) || tracks[0]
  const heroColor = heroTrack?.artwork_color || '#1A1A1E'

  return (
    <div className="h-full overflow-y-auto bg-[#070709]">
      <section className="relative h-[300px]">
        {heroTrack?.artwork_url ? (
          <div
            className="absolute inset-0"
            style={{
              backgroundImage: `url(${heroTrack.artwork_url})`,
              backgroundSize: 'cover',
              backgroundPosition: 'center'
            }}
          />
        ) : (
          <div
            className="absolute inset-0"
            style={{ background: `linear-gradient(135deg, ${heroColor}80 0%, #070709 100%)` }}
          />
        )}
        <div className="absolute inset-0 bg-gradient-to-b from-black/50 via-black/60 to-[#070709]" />

        <button
          onClick={onBack}
          className="absolute top-6 left-6 z-20 w-10 h-10 rounded-full bg-black/40 backdrop-blur-sm border border-white/10 text-white flex items-center justify-center hover:bg-black/60 transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>

        <div className="absolute bottom-8 left-8 z-20">
          <h1 className="text-5xl font-bold text-white tracking-tight drop-shadow-lg">{artistName}</h1>
          <p className="text-sm text-white/70 mt-3">{tracks.length} track{tracks.length !== 1 ? 's' : ''} &bull; 111 Collective</p>
        </div>
      </section>

      <section className="px-6 py-8">
        <h2 className="text-xl font-semibold text-[#E8E8E8] mb-6">All Tracks</h2>
        {tracks.length > 0 ? (
          <div className="bg-[#0D0D10] rounded-xl border border-[#1A1A1E] overflow-hidden">
            {tracks.map((track, index) => {
              const isPlaying = currentTrack?.id === track.id && playing
              const isCurrent = currentTrack?.id === track.id
              const isHovered = hoveredTrack === track.id
              return (
                <div
                  key={track.id}
                  onClick={() => onPlayTrack(track)}
                  onMouseEnter={() => setHoveredTrack(track.id)}
                  onMouseLeave={() => setHoveredTrack(null)}
                  className={`grid grid-cols-[40px_1fr_100px_80px_100px_50px] gap-4 px-4 py-3 items-center cursor-pointer transition-colors ${
                    isCurrent ? 'bg-[#C8A97E]/10' : isHovered ? 'bg-[#1A1A1E]' : ''
                  }`}
                >
                  <div className="flex items-center justify-center">
                    {isHovered || isPlaying ? (
                      <button className="text-[#C8A97E]">
                        {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                      </button>
                    ) : (
                      <span className="text-sm text-[#666]">{index + 1}</span>
                    )}
                  </div>
                  <div className="flex items-center gap-3 min-w-0">
                    <TrackArtwork track={{ title: track.title || 'Untitled', mood: track.mood, artwork_color: track.artwork_color, artwork_url: track.artwork_url }} size="sm" />
                    <p className={`text-sm font-medium truncate ${isCurrent ? 'text-[#C8A97E]' : 'text-[#E8E8E8]'}`}>{track.title || 'Untitled'}</p>
                  </div>
                  <span className="text-sm text-[#888]">{track.bpm || '-'} BPM</span>
                  <span className="text-sm text-[#888] truncate">{track.genre || '-'}</span>
                  <div>{track.mood ? <MoodPill mood={track.mood} /> : <span className="text-sm text-[#555]">-</span>}</div>
                  <button
                    onClick={(e) => { e.stopPropagation(); onPlayTrack(track) }}
                    className="w-8 h-8 rounded-full bg-[#C8A97E] flex items-center justify-center justify-self-end hover:scale-105 transition-transform"
                  >
                    {isPlaying ? <Pause className="w-4 h-4 text-[#0A0A0C]" /> : <Play className="w-4 h-4 text-[#0A0A0C] ml-0.5" />}
                  </button>
                </div>
              )
            })}
          </div>
        ) : (
          <div className="text-center py-12 text-[#666]">
            <p>No tracks found for this artist.</p>
          </div>
        )}
      </section>
    </div>
  )
}
