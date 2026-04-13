import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import { Card, Btn, Select, PageTitle, StatCard, Spinner, EmptyState, Tabs } from '../shared/UI'
import { ArtistLink } from '../shared/ArtistLink'
import { Play, Pause, Check, X, Music2, Send } from 'lucide-react'
import type { Profile, Track } from '../../lib/types'

interface AdminPanelProps {
  profile: Profile
  onPlayTrack: (track: Track) => void
  currentTrack: Track | null
  playing: boolean
}

interface BriefSubmissionRow {
  id: string
  status: 'submitted' | 'shortlisted' | 'in_review' | 'selected' | 'licensed' | 'rejected'
  created_at: string
}

export function AdminPanel({ profile, onPlayTrack, currentTrack, playing }: AdminPanelProps) {
  const [pendingTracks, setPendingTracks] = useState<Track[]>([])
  const [users, setUsers] = useState<Profile[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('Tracks')
  const [recentSubmissions, setRecentSubmissions] = useState<BriefSubmissionRow[]>([])

  const [stats, setStats] = useState({
    totalUsers: 0,
    totalTracks: 0,
    totalLicenses: 0,
    totalBriefs: 0,
    totalSubmissions: 0,
    pendingReview: 0
  })

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    setLoading(true)

    const [tracksRes, usersRes, licensesRes, briefsRes, submissionsCountRes, submissionsRecentRes] = await Promise.all([
      supabase.from('tracks').select('*').order('created_at', { ascending: false }),
      supabase.from('profiles').select('*').order('created_at', { ascending: false }),
      supabase.from('license_requests').select('id').eq('status', 'approved'),
      supabase.from('briefs').select('id').order('created_at', { ascending: false }),
      supabase.from('brief_submissions').select('id', { count: 'exact', head: true }),
      supabase.from('brief_submissions').select('id,status,created_at').order('created_at', { ascending: false }).limit(8)
    ])

    if (tracksRes.data) {
      const pending = tracksRes.data.filter(t => t.status === 'review')
      setPendingTracks(pending)
      setStats(prev => ({
        ...prev,
        totalTracks: tracksRes.data.length,
        pendingReview: pending.length
      }))
    }

    if (usersRes.data) {
      setUsers(usersRes.data)
      setStats(prev => ({ ...prev, totalUsers: usersRes.data.length }))
    }

    if (licensesRes.data) {
      setStats(prev => ({ ...prev, totalLicenses: licensesRes.data.length }))
    }

    if (briefsRes.data) {
      setStats(prev => ({ ...prev, totalBriefs: briefsRes.data.length }))
    }

    setStats(prev => ({ ...prev, totalSubmissions: submissionsCountRes.count || 0 }))

    if (submissionsRecentRes.data) {
      setRecentSubmissions(submissionsRecentRes.data as BriefSubmissionRow[])
    }

    setLoading(false)
  }

  const approveTrack = async (id: string) => {
    await supabase.from('tracks').update({ status: 'active' }).eq('id', id)
    setPendingTracks(pendingTracks.filter(t => t.id !== id))
    setStats(prev => ({ ...prev, pendingReview: prev.pendingReview - 1 }))
  }

  const rejectTrack = async (id: string) => {
    await supabase.from('tracks').update({ status: 'rejected' }).eq('id', id)
    setPendingTracks(pendingTracks.filter(t => t.id !== id))
    setStats(prev => ({ ...prev, pendingReview: prev.pendingReview - 1 }))
  }

  const updateUserRole = async (userId: string, role: Profile['role']) => {
    await supabase.from('profiles').update({ role }).eq('id', userId)
    setUsers(users.map(u => u.id === userId ? { ...u, role } : u))
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
      <PageTitle title="Admin Panel" sub="Platform management and moderation" />

      <div className="grid grid-cols-2 lg:grid-cols-6 gap-4 mb-6">
        <StatCard label="Total Users" value={stats.totalUsers} />
        <StatCard label="Total Tracks" value={stats.totalTracks} />
        <StatCard label="Total Briefs" value={stats.totalBriefs} />
        <StatCard label="Submissions" value={stats.totalSubmissions} />
        <StatCard label="Total Licenses" value={stats.totalLicenses} />
        <StatCard label="Pending Review" value={stats.pendingReview} />
      </div>

      <div className="mb-6">
        <Tabs
          tabs={[
            { id: 'Tracks', label: 'Tracks' },
            { id: 'Users', label: 'Users' },
            { id: 'Settings', label: 'Settings' }
          ]}
          active={activeTab}
          onChange={setActiveTab}
        />
      </div>


      {activeTab === 'Tracks' && recentSubmissions.length > 0 && (
        <Card className="p-4 mb-6">
          <div className="flex items-center gap-2 mb-3">
            <Send className="w-4 h-4 text-[#C8A97E]" />
            <h3 className="text-sm font-medium text-[#E8E8E8]">Recent Brief Submission Activity</h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-2">
            {recentSubmissions.map(sub => (
              <div key={sub.id} className="p-2 rounded bg-[#0A0A0C] border border-[#1E1E22]">
                <p className="text-xs text-[#E8E8E8] font-medium">{sub.status.replace('_', ' ')}</p>
                <p className="text-[11px] text-[#666]">{new Date(sub.created_at).toLocaleString()}</p>
              </div>
            ))}
          </div>
        </Card>
      )}

      {activeTab === 'Tracks' && (
        <Card className="p-4">
          <h3 className="text-lg font-medium text-[#E8E8E8] mb-4">Pending Review</h3>

          {pendingTracks.length > 0 ? (
            <div className="space-y-3">
              {pendingTracks.map(track => (
                <div key={track.id} className="flex items-center gap-4 p-4 bg-[#0A0A0C] rounded-lg">
                  <button
                    onClick={() => onPlayTrack(track)}
                    className="w-10 h-10 rounded-full bg-[#C8A97E]/10 flex items-center justify-center hover:bg-[#C8A97E]/20"
                  >
                    {currentTrack?.id === track.id && playing ? (
                      <Pause className="w-5 h-5 text-[#C8A97E]" />
                    ) : (
                      <Play className="w-5 h-5 text-[#C8A97E] ml-0.5" />
                    )}
                  </button>

                  <div className="flex-1 min-w-0">
                    <p className="text-[#E8E8E8] font-medium truncate">{track.title}</p>
                    <ArtistLink artistName={track.artist} className="text-sm text-[#666] block" />
                  </div>

                  <div className="text-sm text-[#888]">
                    {track.genre && <span className="mr-3">{track.genre}</span>}
                    {track.mood && <span className="mr-3">{track.mood}</span>}
                    {track.bpm && <span>{track.bpm} BPM</span>}
                  </div>

                  <p className="text-xs text-[#555]">
                    {new Date(track.created_at).toLocaleDateString()}
                  </p>

                  <div className="flex gap-2">
                    <Btn size="sm" onClick={() => approveTrack(track.id)}>
                      <Check className="w-3 h-3" /> Approve
                    </Btn>
                    <Btn size="sm" variant="danger" onClick={() => rejectTrack(track.id)}>
                      <X className="w-3 h-3" /> Reject
                    </Btn>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <EmptyState
              icon={<Music2 className="w-12 h-12" />}
              title="No Pending Tracks"
              description="All tracks have been reviewed"
            />
          )}
        </Card>
      )}

      {activeTab === 'Users' && (
        <Card className="p-4">
          <h3 className="text-lg font-medium text-[#E8E8E8] mb-4">User Management</h3>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="text-left text-xs text-[#666] border-b border-[#1E1E22]">
                  <th className="pb-3 font-medium">User</th>
                  <th className="pb-3 font-medium">Email</th>
                  <th className="pb-3 font-medium">Role</th>
                  <th className="pb-3 font-medium">Joined</th>
                  <th className="pb-3 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {users.map(user => (
                  <tr key={user.id} className="border-b border-[#1E1E22]/50">
                    <td className="py-3">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-[#1A1A1E] rounded-full flex items-center justify-center">
                          <span className="text-sm font-medium text-[#C8A97E]">
                            {user.full_name.charAt(0)}
                          </span>
                        </div>
                        <span className="text-[#E8E8E8]">{user.full_name}</span>
                      </div>
                    </td>
                    <td className="py-3 text-[#888]">{user.email}</td>
                    <td className="py-3">
                      <Select
                        value={user.role}
                        onChange={e => updateUserRole(user.id, e.target.value as Profile['role'])}
                        className="w-32"
                      >
                        <option value="supervisor">Supervisor</option>
                        <option value="artist">Artist</option>
                        <option value="label">Label</option>
                        <option value="admin">Admin</option>
                      </Select>
                    </td>
                    <td className="py-3 text-[#666] text-sm">
                      {new Date(user.created_at).toLocaleDateString()}
                    </td>
                    <td className="py-3">
                      {user.id !== profile.id && (
                        <Btn size="sm" variant="ghost">View</Btn>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {activeTab === 'Settings' && (
        <Card className="p-4">
          <h3 className="text-lg font-medium text-[#E8E8E8] mb-4">Platform Settings</h3>

          <div className="space-y-6">
            <div>
              <label className="text-sm text-[#888] mb-2 block">Platform Fee (%)</label>
              <input
                type="number"
                defaultValue={20}
                className="w-32 bg-[#0A0A0C] border border-[#2A2A2E] rounded-lg px-4 py-2 text-[#E8E8E8] focus:outline-none focus:border-[#C8A97E]"
              />
              <p className="text-xs text-[#555] mt-1">Default: 20% platform, 80% artist</p>
            </div>

            <div>
              <label className="text-sm text-[#888] mb-2 block">Auto-approve verified artists</label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  className="w-4 h-4 rounded bg-[#1A1A1E] border-[#2A2A2E] text-[#C8A97E] focus:ring-[#C8A97E]"
                />
                <span className="text-sm text-[#E8E8E8]">Skip review for verified artists</span>
              </label>
            </div>

            <Btn>Save Settings</Btn>
          </div>
        </Card>
      )}
    </div>
  )
}
