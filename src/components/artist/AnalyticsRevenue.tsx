import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import { Card, PageTitle, StatCard, Spinner, EmptyState } from '../shared/UI'
import { DollarSign } from 'lucide-react'
import type { Profile, Track, LicenseRequest } from '../../lib/types'

interface AnalyticsRevenueProps {
  profile: Profile
}

interface TrackStats {
  track: Track
  plays: number
  saves: number
  submissions: number
  licenses: number
  earnings: number
}

export function AnalyticsRevenue({ profile }: AnalyticsRevenueProps) {
  const [trackStats, setTrackStats] = useState<TrackStats[]>([])
  const [licenses, setLicenses] = useState<LicenseRequest[]>([])
  const [loading, setLoading] = useState(true)

  const [totalEarned, setTotalEarned] = useState(0)
  const [pending, setPending] = useState(0)
  const [thisMonth, setThisMonth] = useState(0)

  useEffect(() => {
    loadData()
  }, [profile.id])

  const loadData = async () => {
    setLoading(true)

    const [tracksRes, licensesRes, analyticsRes] = await Promise.all([
      supabase.from('tracks').select('*').eq('uploaded_by', profile.id),
      supabase
        .from('license_requests')
        .select('*, track:tracks(*), project:projects(*)')
        .eq('track.uploaded_by', profile.id),
      supabase
        .from('track_analytics')
        .select('*')
        .in('track_id', (await supabase.from('tracks').select('id').eq('uploaded_by', profile.id)).data?.map(t => t.id) || [])
    ])

    if (tracksRes.data) {
      const analytics = analyticsRes.data || []
      const stats: TrackStats[] = tracksRes.data.map(track => {
        const trackAnalytics = analytics.filter(a => a.track_id === track.id)
        const trackLicenses = (licensesRes.data || []).filter(l => l.track_id === track.id && l.status === 'approved')
        const earnings = trackLicenses.reduce((sum, l) => sum + ((l.fee_agreed || l.fee_offered || 0) * 0.8), 0)

        return {
          track,
          plays: trackAnalytics.filter(a => a.event_type === 'play').length,
          saves: trackAnalytics.filter(a => a.event_type === 'save').length,
          submissions: 0,
          licenses: trackLicenses.length,
          earnings
        }
      })

      setTrackStats(stats)

      const total = stats.reduce((sum, s) => sum + s.earnings, 0)
      setTotalEarned(total)
    }

    if (licensesRes.data) {
      setLicenses(licensesRes.data)
      const pendingLicenses = licensesRes.data.filter(l => ['pending', 'in_review', 'negotiating'].includes(l.status))
      setPending(pendingLicenses.reduce((sum, l) => sum + ((l.fee_offered || 0) * 0.8), 0))

      const now = new Date()
      const thisMonthLicenses = licensesRes.data.filter(l => {
        const date = new Date(l.created_at)
        return l.status === 'approved' && date.getMonth() === now.getMonth() && date.getFullYear() === now.getFullYear()
      })
      setThisMonth(thisMonthLicenses.reduce((sum, l) => sum + ((l.fee_agreed || l.fee_offered || 0) * 0.8), 0))
    }

    setLoading(false)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Spinner />
      </div>
    )
  }

  return (
    <div className="p-6 h-[calc(100vh-76px)] overflow-y-auto">
      <PageTitle title="Analytics & Revenue" sub="Track your performance and earnings" />

      <div className="grid grid-cols-3 gap-4 mb-6">
        <StatCard label="Total Earned" value={`$${totalEarned.toLocaleString()}`} subtext="80% artist share" />
        <StatCard label="Pending" value={`$${pending.toLocaleString()}`} />
        <StatCard label="This Month" value={`$${thisMonth.toLocaleString()}`} />
      </div>

      <Card className="p-4 mb-6">
        <h3 className="text-lg font-medium text-[#E8E8E8] mb-4">Track Performance</h3>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="text-left text-xs text-[#666] border-b border-[#1E1E22]">
                <th className="pb-3 font-medium">Track</th>
                <th className="pb-3 font-medium text-center">Plays</th>
                <th className="pb-3 font-medium text-center">Saves</th>
                <th className="pb-3 font-medium text-center">Submissions</th>
                <th className="pb-3 font-medium text-center">Licenses</th>
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
                    <td className="py-3 text-center text-[#888]">{stat.licenses}</td>
                    <td className="py-3 text-right text-[#C8A97E] font-medium">
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

      <Card className="p-4">
        <h3 className="text-lg font-medium text-[#E8E8E8] mb-4">License Deals</h3>
        {licenses.filter(l => l.status === 'approved').length > 0 ? (
          <div className="space-y-3">
            {licenses.filter(l => l.status === 'approved').map(license => (
              <div key={license.id} className="flex items-center gap-4 p-3 bg-[#0A0A0C] rounded-lg">
                <div className="flex-1">
                  <p className="text-[#E8E8E8] font-medium">{license.track?.title}</p>
                  <p className="text-sm text-[#666]">{license.project?.name || 'Direct license'}</p>
                </div>
                <div className="text-right">
                  <p className="text-[#C8A97E] font-medium">
                    ${((license.fee_agreed || license.fee_offered || 0) * 0.8).toLocaleString()}
                  </p>
                  <p className="text-xs text-[#555]">80% of ${(license.fee_agreed || license.fee_offered || 0).toLocaleString()}</p>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <EmptyState
            icon={<DollarSign className="w-12 h-12" />}
            title="No License Deals Yet"
            description="When your tracks get licensed, they'll appear here"
          />
        )}
      </Card>
    </div>
  )
}
