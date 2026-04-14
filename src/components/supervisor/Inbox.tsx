import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../../lib/supabase'
import { Card, Btn, PageTitle, StatCard, StatusBadge, Spinner, EmptyState, Tabs } from '../shared/UI'
import { Play, Pause, Check, X, ListMusic, Copy, Inbox as InboxIcon } from 'lucide-react'
import type { Profile, InboxSubmission, Playlist, Track } from '../../lib/types'

interface InboxProps {
  profile: Profile
  onPlayTrack: (track: Track) => void
  currentTrack: Track | null
  playing: boolean
}

export function Inbox({ profile, onPlayTrack, currentTrack, playing }: InboxProps) {
  const [submissions, setSubmissions] = useState<InboxSubmission[]>([])
  const [playlists, setPlaylists] = useState<Playlist[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('All')
  const [showPlaylistPicker, setShowPlaylistPicker] = useState<string | null>(null)

  const loadData = useCallback(async () => {
    setLoading(true)
    const [submissionsRes, playlistsRes] = await Promise.all([
      supabase
        .from('inbox_submissions')
        .select('*, track:tracks(*), artist:profiles(*)')
        .eq('supervisor_id', profile.id)
        .order('created_at', { ascending: false }),
      supabase
        .from('playlists')
        .select('*')
        .eq('owner_id', profile.id)
    ])

    if (submissionsRes.data) setSubmissions(submissionsRes.data)
    if (playlistsRes.data) setPlaylists(playlistsRes.data)
    setLoading(false)
  }, [profile.id])

  useEffect(() => {
    void loadData()
  }, [loadData])

  const updateSubmissionStatus = async (id: string, status: 'accepted' | 'passed') => {
    await supabase.from('inbox_submissions').update({ status }).eq('id', id)
    setSubmissions(submissions.map(s => s.id === id ? { ...s, status } : s))
  }

  const addToPlaylist = async (submissionId: string, playlistId: string) => {
    const submission = submissions.find(s => s.id === submissionId)
    if (!submission) return

    const { data: existingTracks } = await supabase
      .from('playlist_tracks')
      .select('position')
      .eq('playlist_id', playlistId)
      .order('position', { ascending: false })
      .limit(1)

    const position = existingTracks?.[0]?.position ?? -1

    await supabase.from('playlist_tracks').insert({
      playlist_id: playlistId,
      track_id: submission.track_id,
      position: position + 1
    })

    await updateSubmissionStatus(submissionId, 'accepted')
    setShowPlaylistPicker(null)
  }

  const copySubmissionLink = () => {
    const link = `${window.location.origin}/submit/${profile.id}`
    navigator.clipboard.writeText(link)
    alert('Submission link copied!')
  }

  const filteredSubmissions = submissions.filter(s =>
    activeTab === 'All' || s.status === activeTab.toLowerCase()
  )

  const stats = {
    total: submissions.length,
    accepted: submissions.filter(s => s.status === 'accepted').length,
    passed: submissions.filter(s => s.status === 'passed').length,
    pending: submissions.filter(s => s.status === 'pending').length
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
      <div className="flex items-center justify-between mb-6">
        <PageTitle title="Inbox" sub="Track submissions from artists" />
        <Btn variant="ghost" onClick={copySubmissionLink}>
          <Copy className="w-4 h-4" /> Copy Submission Link
        </Btn>
      </div>

      <div className="grid grid-cols-4 gap-4 mb-6">
        <StatCard label="Total Received" value={stats.total} />
        <StatCard label="Accepted" value={stats.accepted} />
        <StatCard label="Passed" value={stats.passed} />
        <StatCard label="Pending" value={stats.pending} />
      </div>

      <div className="mb-4">
        <Tabs
          tabs={[
            { id: 'All', label: 'All' },
            { id: 'Pending', label: 'Pending' },
            { id: 'Accepted', label: 'Accepted' },
            { id: 'Passed', label: 'Passed' }
          ]}
          active={activeTab}
          onChange={setActiveTab}
        />
      </div>

      <div className="space-y-3">
        {filteredSubmissions.length > 0 ? (
          filteredSubmissions.map(submission => (
            <Card key={submission.id} className="p-4">
              <div className="flex items-center gap-4">
                <button
                  onClick={() => submission.track && onPlayTrack(submission.track)}
                  className="w-10 h-10 rounded-full bg-[#C8A97E]/10 flex items-center justify-center hover:bg-[#C8A97E]/20"
                >
                  {currentTrack?.id === submission.track_id && playing ? (
                    <Pause className="w-5 h-5 text-[#C8A97E]" />
                  ) : (
                    <Play className="w-5 h-5 text-[#C8A97E] ml-0.5" />
                  )}
                </button>

                <div className="flex-1 min-w-0">
                  <p className="text-[#E8E8E8] font-medium truncate">{submission.track?.title}</p>
                  <p className="text-sm text-[#666]">{submission.artist?.full_name}</p>
                </div>

                {submission.message && (
                  <p className="text-sm text-[#888] max-w-xs truncate">{submission.message}</p>
                )}

                <p className="text-xs text-[#555]">
                  {new Date(submission.created_at).toLocaleDateString()}
                </p>

                <StatusBadge status={submission.status} variant="submission" />

                {submission.status === 'pending' && (
                  <div className="flex items-center gap-2">
                    <Btn size="sm" onClick={() => updateSubmissionStatus(submission.id, 'accepted')}>
                      <Check className="w-3 h-3" /> Accept
                    </Btn>
                    <Btn size="sm" variant="danger" onClick={() => updateSubmissionStatus(submission.id, 'passed')}>
                      <X className="w-3 h-3" /> Pass
                    </Btn>
                    <div className="relative">
                      <Btn
                        size="sm"
                        variant="ghost"
                        onClick={() => setShowPlaylistPicker(
                          showPlaylistPicker === submission.id ? null : submission.id
                        )}
                      >
                        <ListMusic className="w-3 h-3" /> Save
                      </Btn>
                      {showPlaylistPicker === submission.id && (
                        <div className="absolute right-0 top-full mt-1 w-48 bg-[#13131A] border border-[#2A2A2E] rounded-lg shadow-xl z-10">
                          {playlists.map(playlist => (
                            <button
                              key={playlist.id}
                              onClick={() => addToPlaylist(submission.id, playlist.id)}
                              className="w-full px-3 py-2 text-left text-sm text-[#888] hover:text-[#E8E8E8] hover:bg-[#1A1A1E]"
                            >
                              {playlist.name}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </Card>
          ))
        ) : (
          <EmptyState
            icon={<InboxIcon className="w-12 h-12" />}
            title="No Submissions"
            description={activeTab === 'All' ? 'Share your submission link with artists to receive tracks' : `No ${activeTab.toLowerCase()} submissions`}
          />
        )}
      </div>
    </div>
  )
}
