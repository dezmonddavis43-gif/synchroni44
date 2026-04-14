import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../../lib/supabase'
import { Card, PageTitle, StatCard, Spinner } from '../shared/UI'
import type { Profile, Track, Pitch } from '../../lib/types'

interface LabelAnalyticsProps {
  profile: Profile
}

interface TrackStats {
  track: Track
  pitches: number
  licensed: number
  revenue: number
}

interface ArtistStats {
  artistId: string
  artistName: string
  tracks: number
  pitches: number
  licensed: number
  revenue: number
}

export function LabelAnalytics({ profile }: LabelAnalyticsProps) {
  const [tracks, setTracks] = useState<Track[]>([])
  const [pitches, setPitches] = useState<Pitch[]>([])
  const [loading, setLoading] = useState(true)

  const [totalLicensed, setTotalLicensed] = useState(0)
  const [thisMonth, setThisMonth] = useState(0)
  const [pipelineValue, setPipelineValue] = useState(0)

  const loadData = useCallback(async () => {
    setLoading(true)
    const [tracksRes, pitchesRes] = await Promise.all([
      supabase.from('tracks').select('*').eq('label_id', profile.id),
      supabase.from('pitches').select('*, track:tracks(*)').eq('label_id', profile.id)
    ])

    if (tracksRes.data) setTracks(tracksRes.data)
    if (pitchesRes.data) {
      setPitches(pitchesRes.data)

      const licensedPitches = pitchesRes.data.filter(p => p.status === 'licensed')
      const total = licensedPitches.reduce((sum, p) => sum + (p.fee_agreed || p.fee_offered || 0), 0)
      setTotalLicensed(total)

      const now = new Date()
      const thisMonthPitches = licensedPitches.filter(p => {
        const date = new Date(p.created_at)
        return date.getMonth() === now.getMonth() && date.getFullYear() === now.getFullYear()
      })
      setThisMonth(thisMonthPitches.reduce((sum, p) => sum + (p.fee_agreed || p.fee_offered || 0), 0))

      const activePitches = pitchesRes.data.filter(p => ['pitched', 'in_review'].includes(p.status))
      setPipelineValue(activePitches.reduce((sum, p) => sum + (p.fee_offered || 0), 0))
    }

    setLoading(false)
  }, [profile.id])

  useEffect(() => {
    void loadData()
  }, [loadData])

  const getTrackStats = (): TrackStats[] => {
    return tracks.map(track => {
      const trackPitches = pitches.filter(p => p.track_id === track.id)
      const licensed = trackPitches.filter(p => p.status === 'licensed')
      const revenue = licensed.reduce((sum, p) => sum + (p.fee_agreed || p.fee_offered || 0), 0)

      return {
        track,
        pitches: trackPitches.length,
        licensed: licensed.length,
        revenue
      }
    }).sort((a, b) => b.revenue - a.revenue)
  }

  const getArtistStats = (): ArtistStats[] => {
    const artistMap = new Map<string, ArtistStats>()

    tracks.forEach(track => {
      const artistId = track.uploaded_by
      const artistName = track.artist

      if (!artistMap.has(artistId)) {
        artistMap.set(artistId, {
          artistId,
          artistName,
          tracks: 0,
          pitches: 0,
          licensed: 0,
          revenue: 0
        })
      }

      const stats = artistMap.get(artistId)!
      stats.tracks++

      const trackPitches = pitches.filter(p => p.track_id === track.id)
      stats.pitches += trackPitches.length

      const licensed = trackPitches.filter(p => p.status === 'licensed')
      stats.licensed += licensed.length
      stats.revenue += licensed.reduce((sum, p) => sum + (p.fee_agreed || p.fee_offered || 0), 0)
    })

    return Array.from(artistMap.values()).sort((a, b) => b.revenue - a.revenue)
  }

  const successRate = pitches.length > 0
    ? Math.round((pitches.filter(p => p.status === 'licensed').length / pitches.length) * 100)
    : 0

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Spinner />
      </div>
    )
  }

  return (
    <div className="p-6 h-[calc(100vh-76px)] overflow-y-auto">
      <PageTitle title="Analytics & Revenue" sub="Label performance overview" />

      <div className="grid grid-cols-4 gap-4 mb-6">
        <StatCard label="Total Licensed" value={`$${totalLicensed.toLocaleString()}`} />
        <StatCard label="This Month" value={`$${thisMonth.toLocaleString()}`} />
        <StatCard label="Pipeline Value" value={`$${pipelineValue.toLocaleString()}`} />
        <StatCard label="Success Rate" value={`${successRate}%`} />
      </div>

      <div className="grid grid-cols-2 gap-6">
        <Card className="p-4">
          <h3 className="text-lg font-medium text-[#E8E8E8] mb-4">Top Performing Tracks</h3>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="text-left text-xs text-[#666] border-b border-[#1E1E22]">
                  <th className="pb-3 font-medium">Track</th>
                  <th className="pb-3 font-medium text-center">Pitches</th>
                  <th className="pb-3 font-medium text-center">Licensed</th>
                  <th className="pb-3 font-medium text-right">Revenue</th>
                </tr>
              </thead>
              <tbody>
                {getTrackStats().slice(0, 10).map(stat => (
                  <tr key={stat.track.id} className="border-b border-[#1E1E22]/50">
                    <td className="py-3">
                      <div>
                        <p className="text-[#E8E8E8] font-medium">{stat.track.title}</p>
                        <p className="text-xs text-[#666]">{stat.track.artist}</p>
                      </div>
                    </td>
                    <td className="py-3 text-center text-[#888]">{stat.pitches}</td>
                    <td className="py-3 text-center text-[#888]">{stat.licensed}</td>
                    <td className="py-3 text-right text-[#C8A97E] font-medium">
                      ${stat.revenue.toLocaleString()}
                    </td>
                  </tr>
                ))}
                {getTrackStats().length === 0 && (
                  <tr>
                    <td colSpan={4} className="py-8 text-center text-[#666]">
                      No track data yet
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </Card>

        <Card className="p-4">
          <h3 className="text-lg font-medium text-[#E8E8E8] mb-4">Per-Artist Breakdown</h3>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="text-left text-xs text-[#666] border-b border-[#1E1E22]">
                  <th className="pb-3 font-medium">Artist</th>
                  <th className="pb-3 font-medium text-center">Tracks</th>
                  <th className="pb-3 font-medium text-center">Licensed</th>
                  <th className="pb-3 font-medium text-right">Revenue</th>
                </tr>
              </thead>
              <tbody>
                {getArtistStats().map(stat => (
                  <tr key={stat.artistId} className="border-b border-[#1E1E22]/50">
                    <td className="py-3">
                      <p className="text-[#E8E8E8] font-medium">{stat.artistName}</p>
                    </td>
                    <td className="py-3 text-center text-[#888]">{stat.tracks}</td>
                    <td className="py-3 text-center text-[#888]">{stat.licensed}</td>
                    <td className="py-3 text-right text-[#C8A97E] font-medium">
                      ${stat.revenue.toLocaleString()}
                    </td>
                  </tr>
                ))}
                {getArtistStats().length === 0 && (
                  <tr>
                    <td colSpan={4} className="py-8 text-center text-[#666]">
                      No artist data yet
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </Card>
      </div>

      <Card className="p-4 mt-6">
        <h3 className="text-lg font-medium text-[#E8E8E8] mb-4">Pitch Success Rate</h3>
        <div className="flex items-end gap-2 h-40">
          {['pitched', 'in_review', 'passed', 'licensed', 'expired'].map(status => {
            const count = pitches.filter(p => p.status === status).length
            const maxCount = Math.max(...['pitched', 'in_review', 'passed', 'licensed', 'expired'].map(
              s => pitches.filter(p => p.status === s).length
            ), 1)
            const height = (count / maxCount) * 100

            const colors: Record<string, string> = {
              pitched: '#7B9CFF',
              in_review: '#FFD700',
              passed: '#FF4D4D',
              licensed: '#4DFFB4',
              expired: '#888'
            }

            return (
              <div key={status} className="flex-1 flex flex-col items-center gap-2">
                <div
                  className="w-full rounded-t"
                  style={{
                    height: `${height}%`,
                    backgroundColor: colors[status],
                    minHeight: count > 0 ? '4px' : '0'
                  }}
                />
                <span className="text-xs text-[#666] capitalize">{status.replace('_', ' ')}</span>
                <span className="text-sm text-[#E8E8E8]">{count}</span>
              </div>
            )
          })}
        </div>
      </Card>
    </div>
  )
}
