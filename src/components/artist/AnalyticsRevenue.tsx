import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../../lib/supabase'
import { Card, PageTitle, StatCard, Spinner, EmptyState } from '../shared/UI'
import { DollarSign } from 'lucide-react'
import type { Profile, Track, LicenseRequest } from '../../lib/types'
import { ROLE_COLORS } from '../../lib/constants'

interface AnalyticsRevenueProps {
  profile: Profile
}

interface TrackStats {
  track: Track
  plays: number
  saves: number
  submissions: number
  /** Approved sync placement count (from platform records). */
  placements: number
  earnings: number
}

export function AnalyticsRevenue({ profile }: AnalyticsRevenueProps) {
  const accent = ROLE_COLORS.artist
  const [trackStats, setTrackStats] = useState<TrackStats[]>([])
  const [placementRows, setPlacementRows] = useState<LicenseRequest[]>([])
  const [loading, setLoading] = useState(true)

  const [totalEarned, setTotalEarned] = useState(0)
  const [pending, setPending] = useState(0)
  const [thisMonth, setThisMonth] = useState(0)

  const loadData = useCallback(async () => {
    setLoading(true)

    const { data: idRows } = await supabase.from('tracks').select('id').eq('uploaded_by', profile.id)
    const trackIds = idRows?.map(t => t.id) ?? []

    const tracksRes = await supabase.from('tracks').select('*').eq('uploaded_by', profile.id)

    const placementsRes = trackIds.length
      ? await supabase
          .from('license_requests')
          .select('*, track:tracks(*), project:projects(*)')
          .in('track_id', trackIds)
      : { data: [] as LicenseRequest[] | null }

    const analyticsRes = trackIds.length
      ? await supabase.from('track_analytics').select('*').in('track_id', trackIds)
      : { data: [] as { track_id: string; event_type: string }[] | null }

    if (tracksRes.data) {
      const analytics = analyticsRes.data || []
      const stats: TrackStats[] = tracksRes.data.map(track => {
        const trackAnalytics = analytics.filter(a => a.track_id === track.id)
        const approved = (placementsRes.data || []).filter(l => l.track_id === track.id && l.status === 'approved')
        const earnings = approved.reduce((sum, l) => sum + ((l.fee_agreed || l.fee_offered || 0) * 0.8), 0)

        return {
          track,
          plays: trackAnalytics.filter(a => a.event_type === 'play').length,
          saves: trackAnalytics.filter(a => a.event_type === 'save').length,
          submissions: 0,
          placements: approved.length,
          earnings
        }
      })

      setTrackStats(stats)

      const total = stats.reduce((sum, s) => sum + s.earnings, 0)
      setTotalEarned(total)
    }

    if (placementsRes.data) {
      setPlacementRows(placementsRes.data)
      const pendingPayouts = placementsRes.data.filter(l => ['pending', 'in_review', 'negotiating'].includes(l.status))
      setPending(pendingPayouts.reduce((sum, l) => sum + ((l.fee_offered || 0) * 0.8), 0))

      const now = new Date()
      const monthApproved = placementsRes.data.filter(l => {
        const date = new Date(l.created_at)
        return l.status === 'approved' && date.getMonth() === now.getMonth() && date.getFullYear() === now.getFullYear()
      })
      setThisMonth(monthApproved.reduce((sum, l) => sum + ((l.fee_agreed || l.fee_offered || 0) * 0.8), 0))
    }

    setLoading(false)
  }, [profile.id])

  useEffect(() => {
    void loadData()
  }, [loadData])

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Spinner />
      </div>
    )
  }

  return (
    <div className="p-4 md:p-6 h-[calc(100vh-76px)] overflow-y-auto pb-24 md:pb-6">
      <PageTitle title="Analytics & Revenue" sub="Track usage, sync placements, and platform payouts" />

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <StatCard label="Total earned" value={`$${totalEarned.toLocaleString()}`} subtext="80% artist share after platform fee" />
        <StatCard label="Pending" value={`$${pending.toLocaleString()}`} subtext="Estimated from open deals" />
        <StatCard label="This month" value={`$${thisMonth.toLocaleString()}`} />
      </div>

      <Card className="p-4 mb-6 border border-white/[0.06]" style={{ borderLeftColor: accent, borderLeftWidth: 3 }}>
        <h3 className="text-lg font-medium text-[#E8E8E8] mb-4">Track performance</h3>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[480px]">
            <thead>
              <tr className="text-left text-xs text-[#666] border-b border-[#1E1E22]">
                <th className="pb-3 font-medium">Track</th>
                <th className="pb-3 font-medium text-center">Plays</th>
                <th className="pb-3 font-medium text-center">Saves</th>
                <th className="pb-3 font-medium text-center">Submissions</th>
                <th className="pb-3 font-medium text-center">Placements</th>
                <th className="pb-3 font-medium text-right">Earnings</th>
              </tr>
            </thead>
            <tbody>
              {trackStats.length > 0 ? (
                trackStats.map(stat => (
                  <tr key={stat.track.id} className="border-b border-[#1E1E22]/50">
                    <td className="py-3">
                      <div>
                        <p className="text-[#E8E8E8] font-medium">{stat.track.title}</p>
                        <p className="text-xs text-[#666]">{stat.track.artist}</p>
                      </div>
                    </td>
                    <td className="py-3 text-center text-[#888]">{stat.plays}</td>
                    <td className="py-3 text-center text-[#888]">{stat.saves}</td>
                    <td className="py-3 text-center text-[#888]">{stat.submissions}</td>
                    <td className="py-3 text-center text-[#888]">{stat.placements}</td>
                    <td className="py-3 text-right font-medium" style={{ color: accent }}>
                      ${stat.earnings.toLocaleString()}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-[#666]">
                    No tracks in your catalog yet
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>

      <Card className="p-4 border border-white/[0.06]">
        <h3 className="text-lg font-medium text-[#E8E8E8] mb-4">Completed sync placements</h3>
        {placementRows.filter(l => l.status === 'approved').length > 0 ? (
          <div className="space-y-3">
            {placementRows.filter(l => l.status === 'approved').map(row => (
              <div key={row.id} className="flex items-center gap-4 p-3 bg-[#0A0A0C] rounded-lg">
                <div className="flex-1 min-w-0">
                  <p className="text-[#E8E8E8] font-medium truncate">{row.track?.title}</p>
                  <p className="text-sm text-[#666] truncate">{row.project?.name || 'Direct placement'}</p>
                </div>
                <div className="text-right shrink-0">
                  <p className="font-medium" style={{ color: accent }}>
                    ${((row.fee_agreed || row.fee_offered || 0) * 0.8).toLocaleString()}
                  </p>
                  <p className="text-xs text-[#555]">80% of ${(row.fee_agreed || row.fee_offered || 0).toLocaleString()}</p>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <EmptyState
            icon={<DollarSign className="w-12 h-12" />}
            title="No payouts yet"
            description="When your tracks earn from sync placements, payouts will show here."
          />
        )}
      </Card>
    </div>
  )
}
