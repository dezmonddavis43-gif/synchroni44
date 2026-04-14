import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../../lib/supabase'
import { Card, Btn, Input, Textarea, Select, PageTitle, Spinner, EmptyState } from '../shared/UI'
import { MOODS, GENRES } from '../../lib/constants'
import { Plus, X, Search, Star, Send, Music2, Trash2 } from 'lucide-react'
import type { Profile, HitListMember, Brief } from '../../lib/types'

interface HitListProps {
  profile: Profile
}

export function HitList({ profile }: HitListProps) {
  const [members, setMembers] = useState<HitListMember[]>([])
  const [artists, setArtists] = useState<Profile[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<Profile[]>([])
  const [showBriefForm, setShowBriefForm] = useState(false)
  const [selectedRecipients, setSelectedRecipients] = useState<string[]>([])

  const [briefForm, setBriefForm] = useState<Partial<Brief>>({
    title: '',
    description: '',
    scene_type: '',
    mood: '',
    genre: '',
    bpm_min: 80,
    bpm_max: 140,
    budget: 0,
    deadline: '',
    is_private: true
  })

  const loadData = useCallback(async () => {
    setLoading(true)
    const [membersRes, artistsRes] = await Promise.all([
      supabase
        .from('hit_list_members')
        .select('*, artist:profiles(*)')
        .eq('supervisor_id', profile.id),
      supabase
        .from('profiles')
        .select('*')
        .eq('role', 'artist')
    ])

    if (membersRes.data) setMembers(membersRes.data)
    if (artistsRes.data) setArtists(artistsRes.data)
    setLoading(false)
  }, [profile.id])

  useEffect(() => {
    void loadData()
  }, [loadData])

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
       a.email.toLowerCase().includes(query.toLowerCase()) ||
       a.company?.toLowerCase().includes(query.toLowerCase()))
    )
    setSearchResults(results)
  }

  const addToHitList = async (artistId: string) => {
    const { data, error } = await supabase
      .from('hit_list_members')
      .insert({ supervisor_id: profile.id, artist_id: artistId })
      .select('*, artist:profiles(*)')
      .single()

    if (!error && data) {
      setMembers([...members, data])
      setSearchQuery('')
      setSearchResults([])
    }
  }

  const removeFromHitList = async (id: string) => {
    await supabase.from('hit_list_members').delete().eq('id', id)
    setMembers(members.filter(m => m.id !== id))
  }

  const toggleRecipient = (artistId: string) => {
    setSelectedRecipients(prev =>
      prev.includes(artistId)
        ? prev.filter(id => id !== artistId)
        : [...prev, artistId]
    )
  }

  const sendBrief = async () => {
    if (!briefForm.title || selectedRecipients.length === 0) return

    const { data: brief, error } = await supabase
      .from('briefs')
      .insert({
        ...briefForm,
        supervisor_id: profile.id,
        status: 'open'
      })
      .select()
      .single()

    if (error || !brief) return

    const recipients = selectedRecipients.map(artist_id => ({
      brief_id: brief.id,
      artist_id
    }))

    await supabase.from('brief_recipients').insert(recipients)

    setShowBriefForm(false)
    setBriefForm({
      title: '',
      description: '',
      scene_type: '',
      mood: '',
      genre: '',
      bpm_min: 80,
      bpm_max: 140,
      budget: 0,
      deadline: '',
      is_private: true
    })
    setSelectedRecipients([])
    alert('Brief sent successfully!')
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
        <PageTitle title="Hit List" sub="Your favorite artists for quick access and private briefs" />
        <Btn onClick={() => setShowBriefForm(true)}>
          <Send className="w-4 h-4" /> Send Private Brief
        </Btn>
      </div>

      <Card className="p-4 mb-6">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#555]" />
          <input
            type="text"
            value={searchQuery}
            onChange={e => searchArtists(e.target.value)}
            placeholder="Search artists to add..."
            className="w-full bg-[#0A0A0C] border border-[#2A2A2E] rounded-lg pl-10 pr-4 py-3 text-[#E8E8E8] placeholder-[#555] focus:outline-none focus:border-[#C8A97E]"
          />
        </div>

        {searchResults.length > 0 && (
          <div className="mt-2 border border-[#2A2A2E] rounded-lg overflow-hidden">
            {searchResults.map(artist => (
              <button
                key={artist.id}
                onClick={() => addToHitList(artist.id)}
                className="w-full flex items-center gap-3 p-3 hover:bg-[#1A1A1E] transition-colors text-left"
              >
                <div className="w-8 h-8 bg-[#1A1A1E] rounded-full flex items-center justify-center">
                  <span className="text-sm font-medium text-[#C8A97E]">
                    {artist.full_name.charAt(0)}
                  </span>
                </div>
                <div className="flex-1">
                  <p className="text-sm text-[#E8E8E8]">{artist.full_name}</p>
                  <p className="text-xs text-[#666]">{artist.company || artist.email}</p>
                </div>
                <Plus className="w-4 h-4 text-[#C8A97E]" />
              </button>
            ))}
          </div>
        )}
      </Card>

      {showBriefForm && (
        <Card className="p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-medium text-[#E8E8E8]">Send Private Brief</h3>
            <button onClick={() => setShowBriefForm(false)} className="text-[#666]">
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="grid grid-cols-2 gap-4 mb-4">
            <Input
              label="Brief Title"
              value={briefForm.title || ''}
              onChange={e => setBriefForm({ ...briefForm, title: e.target.value })}
              placeholder="e.g., Upbeat indie track for car commercial"
            />
            <Input
              label="Scene Type"
              value={briefForm.scene_type || ''}
              onChange={e => setBriefForm({ ...briefForm, scene_type: e.target.value })}
              placeholder="e.g., Montage, Emotional climax"
            />
            <Select
              label="Mood"
              value={briefForm.mood || ''}
              onChange={e => setBriefForm({ ...briefForm, mood: e.target.value })}
            >
              <option value="">Select mood</option>
              {MOODS.filter(m => m !== 'All').map(mood => (
                <option key={mood} value={mood}>{mood}</option>
              ))}
            </Select>
            <Select
              label="Genre"
              value={briefForm.genre || ''}
              onChange={e => setBriefForm({ ...briefForm, genre: e.target.value })}
            >
              <option value="">Select genre</option>
              {GENRES.filter(g => g !== 'All').map(genre => (
                <option key={genre} value={genre}>{genre}</option>
              ))}
            </Select>
            <div className="flex gap-2">
              <Input
                label="BPM Min"
                type="number"
                value={briefForm.bpm_min || ''}
                onChange={e => setBriefForm({ ...briefForm, bpm_min: parseInt(e.target.value) })}
              />
              <Input
                label="BPM Max"
                type="number"
                value={briefForm.bpm_max || ''}
                onChange={e => setBriefForm({ ...briefForm, bpm_max: parseInt(e.target.value) })}
              />
            </div>
            <Input
              label="Budget"
              type="number"
              value={briefForm.budget || ''}
              onChange={e => setBriefForm({ ...briefForm, budget: parseInt(e.target.value) })}
              placeholder="$0"
            />
            <Input
              label="Deadline"
              type="date"
              value={briefForm.deadline || ''}
              onChange={e => setBriefForm({ ...briefForm, deadline: e.target.value })}
            />
          </div>

          <Textarea
            label="Description"
            value={briefForm.description || ''}
            onChange={e => setBriefForm({ ...briefForm, description: e.target.value })}
            placeholder="Describe the scene, emotion, and any reference tracks..."
            rows={4}
          />

          <div className="mt-4">
            <label className="text-sm text-[#888] mb-2 block">Select Recipients</label>
            <div className="flex flex-wrap gap-2">
              {members.map(member => (
                <button
                  key={member.id}
                  onClick={() => toggleRecipient(member.artist_id)}
                  className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors ${
                    selectedRecipients.includes(member.artist_id)
                      ? 'bg-[#C8A97E] text-[#0A0A0C]'
                      : 'bg-[#1A1A1E] text-[#888] hover:text-[#E8E8E8]'
                  }`}
                >
                  {member.artist?.full_name}
                </button>
              ))}
            </div>
          </div>

          <div className="flex justify-end gap-2 mt-4">
            <Btn variant="ghost" onClick={() => setShowBriefForm(false)}>Cancel</Btn>
            <Btn onClick={sendBrief} disabled={!briefForm.title || selectedRecipients.length === 0}>
              <Send className="w-4 h-4" /> Send Brief
            </Btn>
          </div>
        </Card>
      )}

      <div className="grid grid-cols-3 gap-4">
        {members.length > 0 ? (
          members.map(member => (
            <Card key={member.id} className="p-4">
              <div className="flex items-start gap-3">
                <div className="w-12 h-12 bg-[#1A1A1E] rounded-full flex items-center justify-center">
                  <span className="text-lg font-medium text-[#C8A97E]">
                    {member.artist?.full_name.charAt(0)}
                  </span>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <h4 className="text-[#E8E8E8] font-medium truncate">{member.artist?.full_name}</h4>
                    <Star className="w-3 h-3 text-[#FFD700] fill-[#FFD700]" />
                  </div>
                  <p className="text-xs text-[#666]">{member.artist?.company || 'Independent'}</p>
                </div>
              </div>

              <div className="flex items-center gap-2 mt-4 text-xs text-[#666]">
                <Music2 className="w-3 h-3" />
                <span>0 tracks</span>
              </div>

              <div className="flex gap-2 mt-4">
                <Btn
                  size="sm"
                  variant="ghost"
                  className="flex-1"
                  onClick={() => {
                    setSelectedRecipients([member.artist_id])
                    setShowBriefForm(true)
                  }}
                >
                  <Send className="w-3 h-3" /> Brief
                </Btn>
                <Btn
                  size="sm"
                  variant="danger"
                  onClick={() => removeFromHitList(member.id)}
                >
                  <Trash2 className="w-3 h-3" />
                </Btn>
              </div>
            </Card>
          ))
        ) : (
          <div className="col-span-3">
            <EmptyState
              icon={<Star className="w-12 h-12" />}
              title="Your Hit List is Empty"
              description="Search for artists above to add them to your hit list"
            />
          </div>
        )}
      </div>
    </div>
  )
}
