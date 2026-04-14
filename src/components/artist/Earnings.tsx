import { useState } from 'react'
import { Card, PageTitle } from '../shared/UI'
import { DollarSign, TrendingUp, Music2, FileText, Download, ChevronRight, ArrowUpRight, Play, Briefcase, Percent, Info } from 'lucide-react'
import type { Profile } from '../../lib/types'

interface EarningsProps {
  profile: Profile
}

const DEMO_DATA = {
  artist: {
    totalEarned: 47250,
    thisMonth: 3840,
    pending: 8500,
    totalPlays: 47832,
    proSyncDeals: { count: 12, total: 38500 },
    microLicenses: { count: 143, total: 8750 },
    platformFee: 9450,
    netEarnings: 37800
  },
  label: {
    totalLicensedValue: 2847500,
    thisMonth: 184000,
    activePipeline: 650000,
    totalTracks: 847,
    dealsClosed: 34,
    avgDealValue: 83750
  }
}

const DEMO_TRANSACTIONS = [
  { id: '1', date: '2026-03-24', type: 'license' as const, description: 'Nike Summer Campaign - "Golden Summer"', amount: 8500, status: 'completed' as const },
  { id: '2', date: '2026-03-20', type: 'license' as const, description: 'Netflix Drama - "Midnight Protocol"', amount: 4200, status: 'completed' as const },
  { id: '3', date: '2026-03-18', type: 'micro' as const, description: 'YouTube Creator License - "Electric Feel"', amount: 89, status: 'completed' as const },
  { id: '4', date: '2026-03-15', type: 'license' as const, description: 'Toyota Holiday Campaign - "Harvest Moon"', amount: 12500, status: 'completed' as const },
  { id: '5', date: '2026-03-12', type: 'micro' as const, description: 'Podcast License - "Velvet Sunrise"', amount: 49, status: 'completed' as const },
  { id: '6', date: '2026-03-10', type: 'license' as const, description: 'HBO Documentary - "Freedom March"', amount: 6800, status: 'completed' as const },
  { id: '7', date: '2026-03-08', type: 'payout' as const, description: 'Monthly Payout - February', amount: 15200, status: 'completed' as const },
]

const TOP_TRACKS = [
  { id: '1', title: 'Golden Summer', totalEarnings: 12500, licenseCount: 3 },
  { id: '2', title: 'Freedom March', totalEarnings: 9800, licenseCount: 2 },
  { id: '3', title: 'Midnight Protocol', totalEarnings: 7400, licenseCount: 2 },
  { id: '4', title: 'Harvest Moon', totalEarnings: 6200, licenseCount: 1 },
  { id: '5', title: 'Electric Feel', totalEarnings: 4350, licenseCount: 4 },
]

export function Earnings({ profile }: EarningsProps) {
  const [period, setPeriod] = useState<'all' | 'year' | 'month'>('all')
  const isLabel = profile.role === 'label'

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount)
  }

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    })
  }

  if (isLabel) {
    return (
      <div className="p-4 md:p-6 h-[calc(100vh-76px)] overflow-y-auto pb-40 md:pb-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
          <PageTitle title="Label Analytics" sub="Track your catalog's licensing performance" />
          <div className="flex items-center gap-2">
            <span className="px-2 py-1 bg-[#C8A97E]/10 text-[#C8A97E] text-xs rounded-full flex items-center gap-1">
              <Info className="w-3 h-3" /> Demo data
            </span>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-6">
          <Card className="p-4">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 bg-[#4DFFB4]/10 rounded-lg flex items-center justify-center">
                <DollarSign className="w-5 h-5 text-[#4DFFB4]" />
              </div>
            </div>
            <p className="text-2xl md:text-3xl font-semibold text-[#E8E8E8]">{formatCurrency(DEMO_DATA.label.totalLicensedValue)}</p>
            <p className="text-xs text-[#666] mt-1">Total Licensed</p>
          </Card>

          <Card className="p-4">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 bg-[#FFB74D]/10 rounded-lg flex items-center justify-center">
                <TrendingUp className="w-5 h-5 text-[#FFB74D]" />
              </div>
            </div>
            <p className="text-2xl md:text-3xl font-semibold text-[#E8E8E8]">{formatCurrency(DEMO_DATA.label.thisMonth)}</p>
            <div className="flex items-center gap-1 mt-1">
              <ArrowUpRight className="w-3 h-3 text-[#4DFFB4]" />
              <p className="text-xs text-[#4DFFB4]">+12% vs last month</p>
            </div>
          </Card>

          <Card className="p-4">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 bg-[#7B9CFF]/10 rounded-lg flex items-center justify-center">
                <Briefcase className="w-5 h-5 text-[#7B9CFF]" />
              </div>
            </div>
            <p className="text-2xl md:text-3xl font-semibold text-[#E8E8E8]">{formatCurrency(DEMO_DATA.label.activePipeline)}</p>
            <p className="text-xs text-[#666] mt-1">Active Pipeline</p>
          </Card>

          <Card className="p-4">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 bg-[#C8A97E]/10 rounded-lg flex items-center justify-center">
                <Music2 className="w-5 h-5 text-[#C8A97E]" />
              </div>
            </div>
            <p className="text-2xl md:text-3xl font-semibold text-[#E8E8E8]">{DEMO_DATA.label.totalTracks.toLocaleString()}</p>
            <p className="text-xs text-[#666] mt-1">Total Tracks</p>
          </Card>

          <Card className="p-4">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 bg-[#FF6B9D]/10 rounded-lg flex items-center justify-center">
                <FileText className="w-5 h-5 text-[#FF6B9D]" />
              </div>
            </div>
            <p className="text-2xl md:text-3xl font-semibold text-[#E8E8E8]">{DEMO_DATA.label.dealsClosed}</p>
            <p className="text-xs text-[#666] mt-1">Deals Closed</p>
          </Card>

          <Card className="p-4">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 bg-[#00CED1]/10 rounded-lg flex items-center justify-center">
                <DollarSign className="w-5 h-5 text-[#00CED1]" />
              </div>
            </div>
            <p className="text-2xl md:text-3xl font-semibold text-[#E8E8E8]">{formatCurrency(DEMO_DATA.label.avgDealValue)}</p>
            <p className="text-xs text-[#666] mt-1">Avg Deal Value</p>
          </Card>
        </div>
      </div>
    )
  }

  return (
    <div className="p-4 md:p-6 h-[calc(100vh-76px)] overflow-y-auto pb-40 md:pb-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
        <PageTitle title="Earnings" sub="Track your sync licensing revenue" />
        <div className="flex items-center gap-2">
          <span className="px-2 py-1 bg-[#C8A97E]/10 text-[#C8A97E] text-xs rounded-full flex items-center gap-1">
            <Info className="w-3 h-3" /> Demo data
          </span>
          <div className="flex gap-2">
            {(['all', 'year', 'month'] as const).map(p => (
              <button
                key={p}
                onClick={() => setPeriod(p)}
                className={`px-3 py-1.5 text-sm rounded-lg transition-colors ${
                  period === p
                    ? 'bg-[#C8A97E] text-[#0A0A0C]'
                    : 'bg-[#1A1A1E] text-[#888] hover:text-[#E8E8E8]'
                }`}
              >
                {p === 'all' ? 'All Time' : p === 'year' ? 'This Year' : 'This Month'}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <Card className="p-4">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 bg-[#4DFFB4]/10 rounded-lg flex items-center justify-center">
              <DollarSign className="w-5 h-5 text-[#4DFFB4]" />
            </div>
          </div>
          <p className="text-2xl md:text-3xl font-semibold text-[#E8E8E8]">{formatCurrency(DEMO_DATA.artist.totalEarned)}</p>
          <p className="text-xs text-[#666] mt-1">Total Earned</p>
        </Card>

        <Card className="p-4">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 bg-[#FFB74D]/10 rounded-lg flex items-center justify-center">
              <TrendingUp className="w-5 h-5 text-[#FFB74D]" />
            </div>
          </div>
          <p className="text-2xl md:text-3xl font-semibold text-[#E8E8E8]">{formatCurrency(DEMO_DATA.artist.thisMonth)}</p>
          <div className="flex items-center gap-1 mt-1">
            <ArrowUpRight className="w-3 h-3 text-[#4DFFB4]" />
            <p className="text-xs text-[#4DFFB4]">+18% vs last month</p>
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 bg-[#7B9CFF]/10 rounded-lg flex items-center justify-center">
              <FileText className="w-5 h-5 text-[#7B9CFF]" />
            </div>
          </div>
          <p className="text-2xl md:text-3xl font-semibold text-[#E8E8E8]">{formatCurrency(DEMO_DATA.artist.pending)}</p>
          <p className="text-xs text-[#666] mt-1">Pending</p>
        </Card>

        <Card className="p-4">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 bg-[#C8A97E]/10 rounded-lg flex items-center justify-center">
              <Play className="w-5 h-5 text-[#C8A97E]" />
            </div>
          </div>
          <p className="text-2xl md:text-3xl font-semibold text-[#E8E8E8]">{DEMO_DATA.artist.totalPlays.toLocaleString()}</p>
          <p className="text-xs text-[#666] mt-1">Total Plays</p>
        </Card>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <Card className="p-4">
          <div className="flex items-center justify-between mb-3">
            <h4 className="text-sm font-medium text-[#888]">Professional Sync Deals</h4>
            <Briefcase className="w-4 h-4 text-[#C8A97E]" />
          </div>
          <p className="text-2xl font-semibold text-[#E8E8E8]">{formatCurrency(DEMO_DATA.artist.proSyncDeals.total)}</p>
          <p className="text-xs text-[#666]">{DEMO_DATA.artist.proSyncDeals.count} deals</p>
        </Card>

        <Card className="p-4">
          <div className="flex items-center justify-between mb-3">
            <h4 className="text-sm font-medium text-[#888]">Micro Licenses</h4>
            <FileText className="w-4 h-4 text-[#7B9CFF]" />
          </div>
          <p className="text-2xl font-semibold text-[#E8E8E8]">{formatCurrency(DEMO_DATA.artist.microLicenses.total)}</p>
          <p className="text-xs text-[#666]">{DEMO_DATA.artist.microLicenses.count} licenses</p>
        </Card>

        <Card className="p-4 border-l-4 border-l-[#FF6B6B]">
          <div className="flex items-center justify-between mb-3">
            <h4 className="text-sm font-medium text-[#888]">Platform Fee (20%)</h4>
            <Percent className="w-4 h-4 text-[#FF6B6B]" />
          </div>
          <p className="text-2xl font-semibold text-[#FF6B6B]">-{formatCurrency(DEMO_DATA.artist.platformFee)}</p>
          <p className="text-xs text-[#4DFFB4]">Net: {formatCurrency(DEMO_DATA.artist.netEarnings)}</p>
        </Card>
      </div>

      {DEMO_DATA.artist.pending > 0 && (
        <Card className="p-4 mb-6 border-l-4 border-l-[#FFB74D]">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-[#888]">Pending Payouts</p>
              <p className="text-xl font-semibold text-[#E8E8E8]">{formatCurrency(DEMO_DATA.artist.pending)}</p>
            </div>
            <button className="flex items-center gap-2 px-4 py-2 bg-[#C8A97E] text-[#0A0A0C] rounded-lg font-medium text-sm hover:bg-[#D4B88A] transition-colors">
              <Download className="w-4 h-4" />
              Request Payout
            </button>
          </div>
        </Card>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <Card className="p-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-medium text-[#E8E8E8]">Recent Transactions</h3>
              <button className="text-sm text-[#C8A97E] hover:underline flex items-center gap-1">
                View All <ChevronRight className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-2">
              {DEMO_TRANSACTIONS.map(txn => (
                <div
                  key={txn.id}
                  className="flex items-center gap-4 p-3 bg-[#0A0A0C] rounded-lg"
                >
                  <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                    txn.type === 'license' ? 'bg-[#4DFFB4]/10' :
                    txn.type === 'micro' ? 'bg-[#7B9CFF]/10' :
                    txn.type === 'payout' ? 'bg-[#FF6B9D]/10' : 'bg-[#666]/10'
                  }`}>
                    {txn.type === 'license' ? (
                      <Briefcase className="w-5 h-5 text-[#4DFFB4]" />
                    ) : txn.type === 'micro' ? (
                      <FileText className="w-5 h-5 text-[#7B9CFF]" />
                    ) : (
                      <Download className="w-5 h-5 text-[#FF6B9D]" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-[#E8E8E8] truncate">{txn.description}</p>
                    <p className="text-xs text-[#666]">{formatDate(txn.date)}</p>
                  </div>
                  <div className="text-right">
                    <p className={`text-sm font-medium ${
                      txn.type === 'payout' ? 'text-[#FF6B9D]' : 'text-[#4DFFB4]'
                    }`}>
                      {txn.type === 'payout' ? '-' : '+'}{formatCurrency(txn.amount)}
                    </p>
                    <p className="text-xs text-[#4DFFB4]">{txn.status}</p>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </div>

        <div>
          <Card className="p-4">
            <h3 className="text-lg font-medium text-[#E8E8E8] mb-4">Top Earning Tracks</h3>

            <div className="space-y-3">
              {TOP_TRACKS.map((track, index) => (
                <div
                  key={track.id}
                  className="flex items-center gap-3 p-3 bg-[#0A0A0C] rounded-lg"
                >
                  <div className="w-8 h-8 bg-[#C8A97E]/20 rounded-lg flex items-center justify-center text-sm font-bold text-[#C8A97E]">
                    {index + 1}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-[#E8E8E8] truncate">{track.title}</p>
                    <p className="text-xs text-[#666]">{track.licenseCount} license{track.licenseCount !== 1 ? 's' : ''}</p>
                  </div>
                  <p className="text-sm font-medium text-[#4DFFB4]">
                    {formatCurrency(track.totalEarnings)}
                  </p>
                </div>
              ))}
            </div>
          </Card>

          <Card className="p-4 mt-4">
            <h3 className="text-sm font-medium text-[#E8E8E8] mb-3">Payment Settings</h3>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-[#888]">Payment Method</span>
                <span className="text-sm text-[#E8E8E8]">Bank Transfer</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-[#888]">Minimum Payout</span>
                <span className="text-sm text-[#E8E8E8]">$100</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-[#888]">Payout Schedule</span>
                <span className="text-sm text-[#E8E8E8]">Monthly</span>
              </div>
              <button className="w-full mt-2 py-2 text-sm text-[#C8A97E] hover:bg-[#C8A97E]/10 rounded-lg transition-colors">
                Update Payment Settings
              </button>
            </div>
          </Card>
        </div>
      </div>
    </div>
  )
}
