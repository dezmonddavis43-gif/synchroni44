import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import { Card, Spinner, EmptyState } from '../shared/UI'
import { Music2, Users, Play, Pause, ArrowLeft, ChevronRight } from 'lucide-react'
import type { Profile, Track } from '../../lib/types'

interface LabelPageProps {
  profile: Profile
  onPlayTrack: (track: Track) => void
  currentTrack: Track | null
  playing: boolean
  onNavigateBack: () => void
}

const LABEL_NAME = '111 Collective'

const COLLECTIVE_ARTISTS = [
  'Naïka',
  'Tia Tia',
  'Darkchild Collective',
  'Cody Tarpley',
  'Leather Jacket',
  'Timothy Williams'
]

interface ArtistData {
  name: string
  trackCount: number
  tracks: Track[]
}

export function LabelPage({ profile, onPlayTrack, currentTrack, playing, onNavigateBack }: LabelPageProps) {
  void profile
  const [loading, setLoading] = useState(true)
  const [artists, setArtists] = useState<ArtistData[]>([])
  const [selectedArtist, setSelectedArtist] = useState<string | null>(null)

  useEffect(() => {
    loadArtistData()
  }, [])

  const loadArtistData = async () => {
    setLoading(true)

    const { data: tracks } = await supabase
      .from('tracks')
      .select('*')
      .in('artist', COLLECTIVE_ARTISTS)

    const artistMap: Record<string, Track[]> = {}
    COLLECTIVE_ARTISTS.forEach(name => {
      artistMap[name] = []
    })

    if (tracks) {
      tracks.forEach(track => {
        if (artistMap[track.artist]) {
          artistMap[track.artist].push(track)
        }
      })
    }

    const artistData: ArtistData[] = COLLECTIVE_ARTISTS.map(name => ({
      name,
      trackCount: artistMap[name].length,
      tracks: artistMap[name]
    }))

    setArtists(artistData)
    setLoading(false)
  }

  const selectedArtistData = selectedArtist
    ? artists.find(a => a.name === selectedArtist)
    : null

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Spinner size="lg" />
      </div>
    )
  }

  if (selectedArtist && selectedArtistData) {
    return (
      <ArtistProfile
        artist={selectedArtistData}
        onBack={() => setSelectedArtist(null)}
        onPlayTrack={onPlayTrack}
        currentTrack={currentTrack}
        playing={playing}
      />
    )
  }

  return (
    <div className="h-full overflow-y-auto">
      <div className="max-w-6xl mx-auto p-6">
        <button
          onClick={onNavigateBack}
          className="flex items-center gap-2 text-[#888] hover:text-[#E8E8E8] transition-colors mb-4"
        >
          <ArrowLeft className="w-4 h-4" />
          <span className="text-sm">Back</span>
        </button>

        <div className="mb-8">
          <div className="flex items-center gap-4 mb-2">
            <div className="w-16 h-16 bg-gradient-to-br from-[#C8A97E] to-[#8B7355] rounded-xl flex items-center justify-center">
              <span className="text-2xl font-bold text-white">111</span>
            </div>
            <div>
              <h1 className="font-['Playfair_Display'] text-3xl font-semibold text-[#E8E8E8]">
                {LABEL_NAME}
              </h1>
              <p className="text-[#888] mt-1">
                {artists.length} Artists / {artists.reduce((sum, a) => sum + a.trackCount, 0)} Tracks
              </p>
            </div>
          </div>
        </div>

        <div className="mb-6">
          <h2 className="text-sm font-medium text-[#888] uppercase tracking-wider mb-4">
            Artists
          </h2>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {artists.map(artist => (
            <Card
              key={artist.name}
              onClick={() => setSelectedArtist(artist.name)}
              className="p-5 cursor-pointer hover:border-[#C8A97E]/50 transition-all group"
            >
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 bg-gradient-to-br from-[#2A2A2E] to-[#1A1A1E] rounded-full flex items-center justify-center flex-shrink-0 group-hover:from-[#C8A97E]/20 group-hover:to-[#C8A97E]/5 transition-all">
                  <span className="text-lg font-semibold text-[#C8A97E]">
                    {artist.name.charAt(0).toUpperCase()}
                  </span>
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="text-[#E8E8E8] font-medium truncate group-hover:text-[#C8A97E] transition-colors">
                    {artist.name}
                  </h3>
                  <div className="flex items-center gap-1.5 mt-1 text-[#666]">
                    <Music2 className="w-3.5 h-3.5" />
                    <span className="text-sm">{artist.trackCount} tracks</span>
                  </div>
                </div>
                <ChevronRight className="w-5 h-5 text-[#333] group-hover:text-[#C8A97E] transition-colors" />
              </div>
            </Card>
          ))}
        </div>

        {artists.length === 0 && (
          <EmptyState
            icon={<Users className="w-12 h-12" />}
            title="No Artists Found"
            description="No artists are currently in this collective"
          />
        )}
      </div>
    </div>
  )
}

interface ArtistProfileProps {
  artist: ArtistData
  onBack: () => void
  onPlayTrack: (track: Track) => void
  currentTrack: Track | null
  playing: boolean
}

function ArtistProfile({ artist, onBack, onPlayTrack, currentTrack, playing }: ArtistProfileProps) {
  const isTrackPlaying = (track: Track) => currentTrack?.id === track.id && playing

  return (
    <div className="h-full overflow-y-auto">
      <div className="max-w-4xl mx-auto p-6">
        <button
          onClick={onBack}
          className="flex items-center gap-2 text-[#888] hover:text-[#E8E8E8] transition-colors mb-6"
        >
          <ArrowLeft className="w-4 h-4" />
          <span className="text-sm">Back to {LABEL_NAME}</span>
        </button>

        <div className="flex items-center gap-6 mb-8">
          <div className="w-24 h-24 bg-gradient-to-br from-[#C8A97E]/30 to-[#1A1A1E] rounded-full flex items-center justify-center">
            <span className="text-3xl font-bold text-[#C8A97E]">
              {artist.name.charAt(0).toUpperCase()}
            </span>
          </div>
          <div>
            <h1 className="font-['Playfair_Display'] text-3xl font-semibold text-[#E8E8E8]">
              {artist.name}
            </h1>
            <p className="text-[#888] mt-1">{artist.trackCount} tracks</p>
            <p className="text-[#C8A97E] text-sm mt-1">{LABEL_NAME}</p>
          </div>
        </div>

        <div className="mb-4">
          <h2 className="text-sm font-medium text-[#888] uppercase tracking-wider">
            Tracks
          </h2>
        </div>

        {artist.tracks.length > 0 ? (
          <div className="space-y-2">
            {artist.tracks.map((track, index) => (
              <Card
                key={track.id}
                className="p-4 hover:border-[#2A2A2E] transition-colors"
              >
                <div className="flex items-center gap-4">
                  <button
                    onClick={() => onPlayTrack(track)}
                    className="w-10 h-10 rounded-full bg-[#C8A97E] flex items-center justify-center flex-shrink-0 hover:bg-[#D4B88A] transition-colors"
                  >
                    {isTrackPlaying(track) ? (
                      <Pause className="w-4 h-4 text-[#0A0A0C]" />
                    ) : (
                      <Play className="w-4 h-4 text-[#0A0A0C] ml-0.5" />
                    )}
                  </button>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-[#555] text-sm w-6">{index + 1}</span>
                      <h3 className={`font-medium truncate ${isTrackPlaying(track) ? 'text-[#C8A97E]' : 'text-[#E8E8E8]'}`}>
                        {track.title}
                      </h3>
                    </div>
                    <div className="flex items-center gap-4 mt-1 ml-8">
                      {track.bpm && (
                        <span className="text-xs text-[#666]">{track.bpm} BPM</span>
                      )}
                      {track.genre && (
                        <span className="text-xs text-[#666]">{track.genre}</span>
                      )}
                      {track.mood && (
                        <span className="text-xs text-[#666]">{track.mood}</span>
                      )}
                    </div>
                  </div>

                  {track.duration && (
                    <span className="text-sm text-[#555]">
                      {Math.floor(track.duration / 60)}:{String(track.duration % 60).padStart(2, '0')}
                    </span>
                  )}
                </div>
              </Card>
            ))}
          </div>
        ) : (
          <EmptyState
            icon={<Music2 className="w-12 h-12" />}
            title="No Tracks Available"
            description="This artist hasn't uploaded any tracks yet"
          />
        )}
      </div>
    </div>
  )
}
