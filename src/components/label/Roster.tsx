import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import { Card, Btn, PageTitle, Spinner, EmptyState } from '../shared/UI'
import { Plus, Users, Music2, Search, Trash2 } from 'lucide-react'
import type { Profile, LabelRosterMember, Track, Pitch } from '../../lib/types'

interface RosterProps {
  profile: Profile
}

export function Roster({ profile }: RosterProps) {
  const [members, setMembers] = useState<LabelRosterMember[]>([])
  const [artists, setArtists] = useState<Profile[]>([])
  const [tracks, setTracks] = useState<Track[]>([])
  const [pitches, setPitches] = useState<Pitch[]>([])
  const [loading, setLoading] = useState(true)

  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<Profile[]>([])
  const [selectedArtist, setSelectedArtist] = useState<LabelRosterMember | null>(null)

  useEffect(() => {
    loadData()
  }, [profile.id])

  const loadData = async () => {
    setLoading(true)
    const [membersRes, artistsRes, tracksRes, pitchesRes] = await Promise.all([
      supabase
        .from('label_roster_members')
        .select('*, artist:profiles(*)')
        .eq('label_id', profile.id),
      supabase.from('profiles').select('*').eq('role', 'artist'),
      supabase.from('tracks').select('*').eq('label_id', profile.id),
      supabase.from('pitches').select('*').eq('label_id', profile.id)
    ])

    if (membersRes.data) setMembers(membersRes.data)
    if (artistsRes.data) setArtists(artistsRes.data)
    if (tracksRes.data) setTracks(tracksRes.data)
    if (pitchesRes.data) setPitches(pitchesRes.data)
    setLoading(false)
  }

  const searchArtists = (query: string) => {
    setSearchQuery(query)
    if (!query.trim()) {
      setSearchResults([])
      return
    }

    const memberIds = new Set(members.map(m => m.artist_id))
    const results = artists.filter(a =>
      !memberIds.has(a.id) &&
      (a.full_name.toLowerCase().includes(query.toLowerCase()) ||
       a.email.toLowerCase().includes(query.toLowerCase()))
    )
    setSearchResults(results)
  }

  const addToRoster = async (artistId: string) => {
    const { data, error } = await supabase
      .from('label_roster_members')
      .insert({ label_id: profile.id, artist_id: artistId })
      .select('*, artist:profiles(*)')
      .single()

    if (!error && data) {
      setMembers([...members, data])
      setSearchQuery('')
      setSearchResults([])
    }
  }

  const removeFromRoster = async (id: string) => {
    if (!confirm('Remove this artist from your roster?')) return
    await supabase.from('label_roster_members').delete().eq('id', id)
    setMembers(members.filter(m => m.id !== id))
    if (selectedArtist?.id === id) setSelectedArtist(null)
  }

  const getArtistTracks = (artistId: string) => tracks.filter(t => t.uploaded_by === artistId)
  const getArtistPitches = (artistId: string) => {
    const artistTrackIds = getArtistTracks(artistId).map(t => t.id)
    return pitches.filter(p => artistTrackIds.includes(p.track_id))
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Spinner />
      </div>
    )
  }

  return (
    <div className="flex h-[calc(100vh-76px)]">
      <div className="w-[400px] bg-[#0D0D10] border-r border-[#1A1A1E] flex flex-col">
        <div className="p-4 border-b border-[#1A1A1E]">
          <PageTitle title="Roster" sub={`${members.length} artists`} />

          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#555]" />
            <input
              type="text"
              value={searchQuery}
              onChange={e => searchArtists(e.target.value)}
              placeholder="Search artists to add..."
              className="w-full bg-[#0A0A0C] border border-[#2A2A2E] rounded-lg pl-10 pr-4 py-2 text-sm text-[#E8E8E8] placeholder-[#555] focus:outline-none focus:border-[#C8A97E]"
            />
          </div>

          {searchResults.length > 0 && (
            <div className="mt-2 border border-[#2A2A2E] rounded-lg overflow-hidden">
              {searchResults.map(artist => (
                <button
                  key={artist.id}
                  onClick={() => addToRoster(artist.id)}
                  className="w-full flex items-center gap-3 p-3 hover:bg-[#1A1A1E] transition-colors text-left"
                >
                  <div className="w-8 h-8 bg-[#1A1A1E] rounded-full flex items-center justify-center">
                    <span className="text-sm font-medium text-[#C8A97E]">
                      {artist.full_name.charAt(0)}
                    </span>
                  </div>
                  <div className="flex-1">
                    <p className="text-sm text-[#E8E8E8]">{artist.full_name}</p>
                    <p className="text-xs text-[#666]">{artist.email}</p>
                  </div>
                  <Plus className="w-4 h-4 text-[#C8A97E]" />
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="flex-1 overflow-y-auto p-4">
          <div className="grid grid-cols-2 gap-3">
            {members.map(member => {
              const artistTracks = getArtistTracks(member.artist_id)
              const activePitches = getArtistPitches(member.artist_id).filter(
                p => !['passed', 'expired'].includes(p.status)
              )

              return (
                <Card
                  key={member.id}
                  onClick={() => setSelectedArtist(member)}
                  className={`p-3 cursor-pointer transition-colors ${
                    selectedArtist?.id === member.id
                      ? 'border-[#C8A97E]/50'
                      : 'hover:border-[#2A2A2E]'
                  }`}
                >
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-8 h-8 bg-[#1A1A1E] rounded-full flex items-center justify-center">
                      <span className="text-sm font-medium text-[#C8A97E]">
                        {member.artist?.full_name.charAt(0)}
                      </span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-[#E8E8E8] truncate">{member.artist?.full_name}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 text-xs text-[#666]">
                    <div className="flex items-center gap-1">
                      <Music2 className="w-3 h-3" />
                      <span>{artistTracks.length}</span>
                    </div>
                    <span>{activePitches.length} active</span>
                  </div>
                </Card>
              )
            })}
          </div>

          {members.length === 0 && (
            <EmptyState
              icon={<Users className="w-12 h-12" />}
              title="No Artists Yet"
              description="Search for artists to add to your roster"
            />
          )}
        </div>
      </div>

      <div className="flex-1 p-6 overflow-y-auto">
        {selectedArtist ? (
          <div>
            <div className="flex items-start justify-between mb-6">
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 bg-[#1A1A1E] rounded-full flex items-center justify-center">
                  <span className="text-2xl font-medium text-[#C8A97E]">
                    {selectedArtist.artist?.full_name.charAt(0)}
                  </span>
                </div>
                <div>
                  <h2 className="text-2xl font-['Playfair_Display'] font-semibold text-[#E8E8E8]">
                    {selectedArtist.artist?.full_name}
                  </h2>
                  <p className="text-[#666]">{selectedArtist.artist?.email}</p>
                </div>
              </div>
              <Btn variant="danger" onClick={() => removeFromRoster(selectedArtist.id)}>
                <Trash2 className="w-4 h-4" /> Remove
              </Btn>
            </div>

            <Card className="p-4 mb-6">
              <h3 className="text-sm font-medium text-[#888] mb-3">Tracks</h3>
              {getArtistTracks(selectedArtist.artist_id).length > 0 ? (
                <div className="space-y-2">
                  {getArtistTracks(selectedArtist.artist_id).map(track => (
                    <div key={track.id} className="flex items-center gap-3 p-2 bg-[#0A0A0C] rounded">
                      <Music2 className="w-4 h-4 text-[#C8A97E]" />
                      <div className="flex-1">
                        <p className="text-sm text-[#E8E8E8]">{track.title}</p>
                        <p className="text-xs text-[#666]">{track.genre}</p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-[#555] text-center py-4">No tracks</p>
              )}
            </Card>

            <Card className="p-4">
              <h3 className="text-sm font-medium text-[#888] mb-3">Pitch History</h3>
              {getArtistPitches(selectedArtist.artist_id).length > 0 ? (
                <div className="space-y-2">
                  {getArtistPitches(selectedArtist.artist_id).map(pitch => (
                    <div key={pitch.id} className="flex items-center gap-3 p-2 bg-[#0A0A0C] rounded">
                      <div className="flex-1">
                        <p className="text-sm text-[#E8E8E8]">{pitch.track?.title}</p>
                        <p className="text-xs text-[#666]">
                          {pitch.supervisor_name} - {pitch.project_name}
                        </p>
                      </div>
                      <span className={`px-2 py-0.5 rounded text-xs capitalize ${
                        pitch.status === 'licensed' ? 'bg-[#4DFFB4]/20 text-[#4DFFB4]' :
                        pitch.status === 'passed' ? 'bg-[#FF4D4D]/20 text-[#FF4D4D]' :
                        'bg-[#FFD700]/20 text-[#FFD700]'
                      }`}>
                        {pitch.status}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-[#555] text-center py-4">No pitches</p>
              )}
            </Card>
          </div>
        ) : (
          <EmptyState
            icon={<Users className="w-12 h-12" />}
            title="Select an Artist"
            description="Choose an artist from your roster to view details"
          />
        )}
      </div>
    </div>
  )
}
