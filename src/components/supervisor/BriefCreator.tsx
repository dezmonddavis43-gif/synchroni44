import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../../lib/supabase'
import { Spinner } from '../shared/UI'
import { MOODS, GENRES } from '../../lib/constants'
import {
  X, Plus, Trash2, Upload, Users, Star, Search, Check, AlertCircle,
  Calendar, Clock, FileText, DollarSign, Globe, Shield
} from 'lucide-react'
import type { Profile, BriefBucket, BriefContact, HitListMember } from '../../lib/types'

interface BriefCreatorProps {
  profile: Profile
  onClose: () => void
  onSuccess: () => void
  editBriefId?: string
}

interface RecipientSelection {
  type: 'contact' | 'hitlist' | 'platform'
  id: string
  name: string
  company?: string
  email?: string
}

const TERM_OPTIONS = ['3 months', '6 months', '1 year', '2 years', 'In Perpetuity', 'Custom']
const VOCAL_OPTIONS = [
  { value: 'instrumental', label: 'Instrumental Only' },
  { value: 'vocal_ok', label: 'Vocal OK' },
  { value: 'vocal_preferred', label: 'Vocal Preferred' }
]
const PRIORITY_OPTIONS = [
  { value: 'standard', label: 'Standard', color: '#888' },
  { value: 'urgent', label: 'Urgent', color: '#F59E0B' },
  { value: 'rush', label: 'Rush', color: '#EF4444' }
]

export function BriefCreator({ profile, onClose, onSuccess, editBriefId }: BriefCreatorProps) {
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)

  const [title, setTitle] = useState('')
  const [client, setClient] = useState('')
  const [sceneDescription, setSceneDescription] = useState('')
  const [selectedMoods, setSelectedMoods] = useState<string[]>([])
  const [selectedGenres, setSelectedGenres] = useState<string[]>([])
  const [bpmMin, setBpmMin] = useState<number | ''>('')
  const [bpmMax, setBpmMax] = useState<number | ''>('')
  const [vocalPreference, setVocalPreference] = useState('vocal_ok')
  const [referenceTracks, setReferenceTracks] = useState('')

  const [usageTerms, setUsageTerms] = useState('')
  const [termLength, setTermLength] = useState('')
  const [exclusivity, setExclusivity] = useState(false)

  const [budgetBuckets, setBudgetBuckets] = useState<{ id: string; label: string; min: number | ''; max: number | '' }[]>([])

  const [deadline, setDeadline] = useState('')
  const [priority, setPriority] = useState('standard')
  const [internalNotes, setInternalNotes] = useState('')

  const [recipientTab, setRecipientTab] = useState<'contacts' | 'hitlist' | 'upload'>('contacts')
  const [contacts, setContacts] = useState<BriefContact[]>([])
  const [hitlistMembers, setHitlistMembers] = useState<HitListMember[]>([])
  const [selectedRecipients, setSelectedRecipients] = useState<RecipientSelection[]>([])
  const [contactSearch, setContactSearch] = useState('')
  const [csvData, setCsvData] = useState<{ name: string; company: string; email: string; type: string }[]>([])

  const loadData = useCallback(async () => {
    setLoading(true)

    const [contactsRes, hitlistRes] = await Promise.all([
      supabase.from('brief_contacts').select('*').eq('supervisor_id', profile.id).order('name'),
      supabase.from('hit_list_members').select('*, artist:profiles(*)').eq('supervisor_id', profile.id)
    ])

    if (contactsRes.data) setContacts(contactsRes.data)
    if (hitlistRes.data) setHitlistMembers(hitlistRes.data)

    if (editBriefId) {
      const { data: brief } = await supabase
        .from('briefs')
        .select('*, buckets:brief_buckets(*)')
        .eq('id', editBriefId)
        .single()

      if (brief) {
        setTitle(brief.title || '')
        setClient(brief.client || '')
        setSceneDescription(brief.scene_description || '')
        setSelectedMoods(brief.moods || [])
        setSelectedGenres(brief.genres || [])
        setBpmMin(brief.bpm_min || '')
        setBpmMax(brief.bpm_max || '')
        setVocalPreference(brief.vocal_preference || 'vocal_ok')
        setReferenceTracks(brief.reference_tracks || '')
        setUsageTerms(brief.usage_terms || '')
        setTermLength(brief.term_length || '')
        setExclusivity(brief.exclusivity || false)
        setDeadline(brief.deadline ? brief.deadline.split('T')[0] : '')
        setPriority(brief.priority || 'standard')
        setInternalNotes(brief.internal_notes || '')
        if (brief.buckets) {
          setBudgetBuckets(brief.buckets.map((b: BriefBucket) => ({
            id: b.id,
            label: b.label,
            min: b.min_amount || '',
            max: b.max_amount || ''
          })))
        }
      }
    }

    setLoading(false)
  }, [profile.id, editBriefId])

  useEffect(() => {
    void loadData()
  }, [loadData])

  const toggleMood = (mood: string) => {
    setSelectedMoods(prev =>
      prev.includes(mood) ? prev.filter(m => m !== mood) : [...prev, mood]
    )
  }

  const toggleGenre = (genre: string) => {
    setSelectedGenres(prev =>
      prev.includes(genre) ? prev.filter(g => g !== genre) : [...prev, genre]
    )
  }

  const addBudgetBucket = () => {
    setBudgetBuckets(prev => [...prev, { id: crypto.randomUUID(), label: '', min: '', max: '' }])
  }

  const updateBucket = (id: string, field: 'label' | 'min' | 'max', value: string | number) => {
    setBudgetBuckets(prev => prev.map(b =>
      b.id === id ? { ...b, [field]: value } : b
    ))
  }

  const removeBucket = (id: string) => {
    setBudgetBuckets(prev => prev.filter(b => b.id !== id))
  }

  const toggleRecipient = (recipient: RecipientSelection) => {
    setSelectedRecipients(prev => {
      const exists = prev.find(r => r.id === recipient.id && r.type === recipient.type)
      if (exists) {
        return prev.filter(r => !(r.id === recipient.id && r.type === recipient.type))
      }
      return [...prev, recipient]
    })
  }

  const isRecipientSelected = (id: string, type: string) => {
    return selectedRecipients.some(r => r.id === id && r.type === type)
  }

  const selectAllContacts = () => {
    const filtered = contacts.filter(c =>
      !contactSearch || c.name.toLowerCase().includes(contactSearch.toLowerCase()) ||
      c.company?.toLowerCase().includes(contactSearch.toLowerCase())
    )
    const newRecipients = filtered.map(c => ({
      type: 'contact' as const,
      id: c.id,
      name: c.name,
      company: c.company,
      email: c.email
    }))
    setSelectedRecipients(prev => {
      const nonContacts = prev.filter(r => r.type !== 'contact')
      return [...nonContacts, ...newRecipients]
    })
  }

  const selectAllHitlist = () => {
    const newRecipients = hitlistMembers.map(h => ({
      type: 'hitlist' as const,
      id: h.artist_id,
      name: h.artist?.full_name || h.artist?.artist_name || 'Unknown',
      company: h.artist?.company
    }))
    setSelectedRecipients(prev => {
      const nonHitlist = prev.filter(r => r.type !== 'hitlist')
      return [...nonHitlist, ...newRecipients]
    })
  }

  const handleCsvUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = (event) => {
      const text = event.target?.result as string
      const lines = text.split('\n').filter(l => l.trim())
      const parsed: { name: string; company: string; email: string; type: string }[] = []

      lines.slice(1).forEach(line => {
        const parts = line.split(',').map(p => p.trim().replace(/"/g, ''))
        if (parts.length >= 3) {
          parsed.push({
            name: parts[0] || '',
            company: parts[1] || '',
            email: parts[2] || '',
            type: parts[3] || 'other'
          })
        }
      })

      setCsvData(parsed)
    }
    reader.readAsText(file)
  }

  const importCsvContacts = async () => {
    if (csvData.length === 0) return

    const toInsert = csvData.map(c => ({
      supervisor_id: profile.id,
      name: c.name,
      company: c.company,
      email: c.email,
      contact_type: c.type
    }))

    const { data, error } = await supabase.from('brief_contacts').insert(toInsert).select()

    if (error) {
      console.error('Error importing contacts:', error)
      return
    }

    if (data) {
      setContacts(prev => [...prev, ...data])
      const newRecipients = data.map(c => ({
        type: 'contact' as const,
        id: c.id,
        name: c.name,
        company: c.company,
        email: c.email
      }))
      setSelectedRecipients(prev => [...prev, ...newRecipients])
      setCsvData([])
    }
  }

  const saveBrief = async (send: boolean) => {
    if (!title.trim()) {
      alert('Please enter a brief title')
      return
    }

    setSaving(true)

    const briefData = {
      title,
      client: client || null,
      scene_description: sceneDescription || null,
      moods: selectedMoods,
      genres: selectedGenres,
      bpm_min: bpmMin || null,
      bpm_max: bpmMax || null,
      vocal_preference: vocalPreference,
      reference_tracks: referenceTracks || null,
      usage_terms: usageTerms || null,
      term_length: termLength || null,
      exclusivity,
      deadline: deadline || null,
      priority,
      internal_notes: internalNotes || null,
      supervisor_id: profile.id,
      status: send ? 'open' : 'draft',
      sent_at: send ? new Date().toISOString() : null
    }

    let briefId = editBriefId

    if (editBriefId) {
      const { error } = await supabase.from('briefs').update(briefData).eq('id', editBriefId)
      if (error) {
        console.error('Error updating brief:', error)
        setSaving(false)
        return
      }
    } else {
      const { data, error } = await supabase.from('briefs').insert(briefData).select().single()
      if (error) {
        console.error('Error creating brief:', error)
        setSaving(false)
        return
      }
      briefId = data.id
    }

    if (briefId) {
      await supabase.from('brief_buckets').delete().eq('brief_id', briefId)

      if (budgetBuckets.length > 0) {
        const bucketsToInsert = budgetBuckets
          .filter(b => b.label.trim())
          .map((b, i) => ({
            brief_id: briefId,
            label: b.label,
            min_amount: b.min || null,
            max_amount: b.max || null,
            position: i
          }))

        if (bucketsToInsert.length > 0) {
          const { error } = await supabase.from('brief_buckets').insert(bucketsToInsert)
          if (error) console.error('Error saving buckets:', error)
        }
      }

      if (send && selectedRecipients.length > 0) {
        const sendsToInsert = selectedRecipients.map(r => ({
          brief_id: briefId,
          recipient_id: r.type === 'hitlist' ? r.id : null,
          contact_id: r.type === 'contact' ? r.id : null,
          recipient_email: r.email || null,
          recipient_name: r.name,
          recipient_company: r.company || null
        }))

        const { error } = await supabase.from('brief_sends').insert(sendsToInsert)
        if (error) console.error('Error creating sends:', error)
      }
    }

    setSaving(false)
    onSuccess()
  }

  const filteredContacts = contacts.filter(c =>
    !contactSearch ||
    c.name.toLowerCase().includes(contactSearch.toLowerCase()) ||
    c.company?.toLowerCase().includes(contactSearch.toLowerCase()) ||
    c.email.toLowerCase().includes(contactSearch.toLowerCase())
  )

  if (loading) {
    return (
      <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50">
        <Spinner />
      </div>
    )
  }

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
      <div className="bg-[#0D0D10] rounded-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        <div className="flex items-center justify-between p-4 border-b border-[#1A1A1E]">
          <h2 className="font-['Playfair_Display'] text-xl text-white">
            {editBriefId ? 'Edit Brief' : 'Create Brief'}
          </h2>
          <button onClick={onClose} className="p-2 text-[#666] hover:text-white transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-8">
          <section>
            <h3 className="flex items-center gap-2 text-sm font-semibold text-[#C8A97E] mb-4">
              <FileText className="w-4 h-4" />
              CREATIVE BRIEF
            </h3>

            <div className="grid grid-cols-2 gap-4 mb-4">
              <div>
                <label className="block text-xs text-[#888] mb-1">Project/Spot Name *</label>
                <input
                  type="text"
                  value={title}
                  onChange={e => setTitle(e.target.value)}
                  placeholder="e.g. Nike Summer Campaign"
                  className="w-full bg-[#1A1A1E] border border-[#2A2A2E] rounded-lg px-3 py-2 text-sm text-[#E8E8E8] placeholder-[#555] focus:outline-none focus:border-[#C8A97E]"
                />
              </div>
              <div>
                <label className="block text-xs text-[#888] mb-1">Client Name (optional)</label>
                <input
                  type="text"
                  value={client}
                  onChange={e => setClient(e.target.value)}
                  placeholder="e.g. Nike, Inc."
                  className="w-full bg-[#1A1A1E] border border-[#2A2A2E] rounded-lg px-3 py-2 text-sm text-[#E8E8E8] placeholder-[#555] focus:outline-none focus:border-[#C8A97E]"
                />
              </div>
            </div>

            <div className="mb-4">
              <label className="block text-xs text-[#888] mb-1">Scene Description</label>
              <textarea
                value={sceneDescription}
                onChange={e => setSceneDescription(e.target.value)}
                placeholder="Describe the scene, emotion, story moment..."
                rows={4}
                className="w-full bg-[#1A1A1E] border border-[#2A2A2E] rounded-lg px-3 py-2 text-sm text-[#E8E8E8] placeholder-[#555] focus:outline-none focus:border-[#C8A97E] resize-none"
              />
            </div>

            <div className="mb-4">
              <label className="block text-xs text-[#888] mb-2">Mood (select multiple)</label>
              <div className="flex flex-wrap gap-2">
                {MOODS.filter(m => m !== 'All').map(mood => (
                  <button
                    key={mood}
                    onClick={() => toggleMood(mood)}
                    className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
                      selectedMoods.includes(mood)
                        ? 'bg-[#C8A97E] text-[#0A0A0C]'
                        : 'bg-[#1A1A1E] text-[#888] hover:text-[#E8E8E8] border border-[#2A2A2E]'
                    }`}
                  >
                    {mood}
                  </button>
                ))}
              </div>
            </div>

            <div className="mb-4">
              <label className="block text-xs text-[#888] mb-2">Genre Preferences (select multiple)</label>
              <div className="flex flex-wrap gap-2">
                {GENRES.filter(g => g !== 'All').map(genre => (
                  <button
                    key={genre}
                    onClick={() => toggleGenre(genre)}
                    className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
                      selectedGenres.includes(genre)
                        ? 'bg-[#C8A97E] text-[#0A0A0C]'
                        : 'bg-[#1A1A1E] text-[#888] hover:text-[#E8E8E8] border border-[#2A2A2E]'
                    }`}
                  >
                    {genre}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4 mb-4">
              <div>
                <label className="block text-xs text-[#888] mb-1">BPM Min</label>
                <input
                  type="number"
                  value={bpmMin}
                  onChange={e => setBpmMin(e.target.value ? parseInt(e.target.value) : '')}
                  placeholder="60"
                  className="w-full bg-[#1A1A1E] border border-[#2A2A2E] rounded-lg px-3 py-2 text-sm text-[#E8E8E8] placeholder-[#555] focus:outline-none focus:border-[#C8A97E]"
                />
              </div>
              <div>
                <label className="block text-xs text-[#888] mb-1">BPM Max</label>
                <input
                  type="number"
                  value={bpmMax}
                  onChange={e => setBpmMax(e.target.value ? parseInt(e.target.value) : '')}
                  placeholder="180"
                  className="w-full bg-[#1A1A1E] border border-[#2A2A2E] rounded-lg px-3 py-2 text-sm text-[#E8E8E8] placeholder-[#555] focus:outline-none focus:border-[#C8A97E]"
                />
              </div>
              <div>
                <label className="block text-xs text-[#888] mb-1">Vocal Preference</label>
                <select
                  value={vocalPreference}
                  onChange={e => setVocalPreference(e.target.value)}
                  className="w-full bg-[#1A1A1E] border border-[#2A2A2E] rounded-lg px-3 py-2 text-sm text-[#E8E8E8] focus:outline-none focus:border-[#C8A97E]"
                >
                  {VOCAL_OPTIONS.map(opt => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs text-[#888] mb-1">Reference Tracks</label>
              <textarea
                value={referenceTracks}
                onChange={e => setReferenceTracks(e.target.value)}
                placeholder="Sounds like... (describe similar artists, songs, or vibe)"
                rows={2}
                className="w-full bg-[#1A1A1E] border border-[#2A2A2E] rounded-lg px-3 py-2 text-sm text-[#E8E8E8] placeholder-[#555] focus:outline-none focus:border-[#C8A97E] resize-none"
              />
            </div>
          </section>

          <section>
            <h3 className="flex items-center gap-2 text-sm font-semibold text-[#C8A97E] mb-4">
              <Globe className="w-4 h-4" />
              USAGE & TERMS
            </h3>

            <div className="mb-4">
              <label className="block text-xs text-[#888] mb-1">Usage & Terms</label>
              <textarea
                value={usageTerms}
                onChange={e => setUsageTerms(e.target.value)}
                placeholder="e.g. 6 Months - National Broadcast TV, Internet, New Media, Paid Media, Industrial, Exclusivity"
                rows={3}
                className="w-full bg-[#1A1A1E] border border-[#2A2A2E] rounded-lg px-3 py-2 text-sm text-[#E8E8E8] placeholder-[#555] focus:outline-none focus:border-[#C8A97E] resize-none"
              />
            </div>

            <div className="grid grid-cols-2 gap-4 mb-4">
              <div>
                <label className="block text-xs text-[#888] mb-1">Term Length</label>
                <select
                  value={termLength}
                  onChange={e => setTermLength(e.target.value)}
                  className="w-full bg-[#1A1A1E] border border-[#2A2A2E] rounded-lg px-3 py-2 text-sm text-[#E8E8E8] focus:outline-none focus:border-[#C8A97E]"
                >
                  <option value="">Select term...</option>
                  {TERM_OPTIONS.map(term => (
                    <option key={term} value={term}>{term}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs text-[#888] mb-1">Exclusivity</label>
                <div className="flex gap-2 mt-1">
                  <button
                    onClick={() => setExclusivity(true)}
                    className={`flex-1 px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                      exclusivity
                        ? 'bg-[#C8A97E] text-[#0A0A0C]'
                        : 'bg-[#1A1A1E] text-[#888] border border-[#2A2A2E]'
                    }`}
                  >
                    <Shield className="w-4 h-4 inline mr-1" />
                    Exclusive
                  </button>
                  <button
                    onClick={() => setExclusivity(false)}
                    className={`flex-1 px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                      !exclusivity
                        ? 'bg-[#C8A97E] text-[#0A0A0C]'
                        : 'bg-[#1A1A1E] text-[#888] border border-[#2A2A2E]'
                    }`}
                  >
                    Non-Exclusive
                  </button>
                </div>
              </div>
            </div>
          </section>

          <section>
            <h3 className="flex items-center gap-2 text-sm font-semibold text-[#C8A97E] mb-4">
              <DollarSign className="w-4 h-4" />
              BUDGET RANGES (Optional)
            </h3>
            <p className="text-xs text-[#666] mb-4">
              Add one or more budget ranges. Recipients will organize their submissions by these ranges.
            </p>

            <div className="space-y-3 mb-4">
              {budgetBuckets.map((bucket, index) => (
                <div key={bucket.id} className="flex items-center gap-3">
                  <span className="text-xs text-[#666] w-6">{index + 1}.</span>
                  <input
                    type="text"
                    value={bucket.label}
                    onChange={e => updateBucket(bucket.id, 'label', e.target.value)}
                    placeholder="Label (e.g. Indie Artists)"
                    className="flex-1 bg-[#1A1A1E] border border-[#2A2A2E] rounded-lg px-3 py-2 text-sm text-[#E8E8E8] placeholder-[#555] focus:outline-none focus:border-[#C8A97E]"
                  />
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-[#666]">$</span>
                    <input
                      type="number"
                      value={bucket.min}
                      onChange={e => updateBucket(bucket.id, 'min', e.target.value ? parseInt(e.target.value) : '')}
                      placeholder="Min"
                      className="w-20 bg-[#1A1A1E] border border-[#2A2A2E] rounded-lg px-2 py-2 text-sm text-[#E8E8E8] placeholder-[#555] focus:outline-none focus:border-[#C8A97E]"
                    />
                    <span className="text-xs text-[#666]">-</span>
                    <input
                      type="number"
                      value={bucket.max}
                      onChange={e => updateBucket(bucket.id, 'max', e.target.value ? parseInt(e.target.value) : '')}
                      placeholder="Max"
                      className="w-20 bg-[#1A1A1E] border border-[#2A2A2E] rounded-lg px-2 py-2 text-sm text-[#E8E8E8] placeholder-[#555] focus:outline-none focus:border-[#C8A97E]"
                    />
                  </div>
                  <button
                    onClick={() => removeBucket(bucket.id)}
                    className="p-2 text-[#666] hover:text-red-400 transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>

            <button
              onClick={addBudgetBucket}
              className="flex items-center gap-2 px-3 py-2 text-sm text-[#C8A97E] hover:bg-[#C8A97E]/10 rounded-lg transition-colors"
            >
              <Plus className="w-4 h-4" />
              Add Budget Range
            </button>
          </section>

          <section>
            <h3 className="flex items-center gap-2 text-sm font-semibold text-[#C8A97E] mb-4">
              <Calendar className="w-4 h-4" />
              DEADLINE
            </h3>

            <div className="grid grid-cols-2 gap-4 mb-4">
              <div>
                <label className="block text-xs text-[#888] mb-1">Deadline Date</label>
                <input
                  type="date"
                  value={deadline}
                  onChange={e => setDeadline(e.target.value)}
                  className="w-full bg-[#1A1A1E] border border-[#2A2A2E] rounded-lg px-3 py-2 text-sm text-[#E8E8E8] focus:outline-none focus:border-[#C8A97E]"
                />
              </div>
              <div>
                <label className="block text-xs text-[#888] mb-1">Priority Level</label>
                <div className="flex gap-2">
                  {PRIORITY_OPTIONS.map(opt => (
                    <button
                      key={opt.value}
                      onClick={() => setPriority(opt.value)}
                      className={`flex-1 px-3 py-2 rounded-lg text-sm font-medium transition-all border ${
                        priority === opt.value
                          ? 'text-[#0A0A0C]'
                          : 'bg-[#1A1A1E] text-[#888] border-[#2A2A2E]'
                      }`}
                      style={priority === opt.value ? { backgroundColor: opt.color, borderColor: opt.color } : {}}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div>
              <label className="block text-xs text-[#888] mb-1">Internal Notes (private)</label>
              <textarea
                value={internalNotes}
                onChange={e => setInternalNotes(e.target.value)}
                placeholder="Notes for yourself, not sent to recipients..."
                rows={2}
                className="w-full bg-[#1A1A1E] border border-[#2A2A2E] rounded-lg px-3 py-2 text-sm text-[#E8E8E8] placeholder-[#555] focus:outline-none focus:border-[#C8A97E] resize-none"
              />
            </div>
          </section>

          <section>
            <h3 className="flex items-center gap-2 text-sm font-semibold text-[#C8A97E] mb-4">
              <Users className="w-4 h-4" />
              RECIPIENTS
            </h3>

            <div className="flex gap-1 mb-4 border-b border-[#1A1A1E]">
              <button
                onClick={() => setRecipientTab('contacts')}
                className={`px-4 py-2 text-sm font-medium transition-colors relative ${
                  recipientTab === 'contacts' ? 'text-[#E8E8E8]' : 'text-[#666]'
                }`}
              >
                My Contacts
                {recipientTab === 'contacts' && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#C8A97E]" />}
              </button>
              <button
                onClick={() => setRecipientTab('hitlist')}
                className={`px-4 py-2 text-sm font-medium transition-colors relative ${
                  recipientTab === 'hitlist' ? 'text-[#E8E8E8]' : 'text-[#666]'
                }`}
              >
                <Star className="w-4 h-4 inline mr-1" />
                Hit List
                {recipientTab === 'hitlist' && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#C8A97E]" />}
              </button>
              <button
                onClick={() => setRecipientTab('upload')}
                className={`px-4 py-2 text-sm font-medium transition-colors relative ${
                  recipientTab === 'upload' ? 'text-[#E8E8E8]' : 'text-[#666]'
                }`}
              >
                <Upload className="w-4 h-4 inline mr-1" />
                Upload Contacts
                {recipientTab === 'upload' && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#C8A97E]" />}
              </button>
            </div>

            {recipientTab === 'contacts' && (
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#666]" />
                    <input
                      type="text"
                      value={contactSearch}
                      onChange={e => setContactSearch(e.target.value)}
                      placeholder="Search contacts..."
                      className="w-full bg-[#1A1A1E] border border-[#2A2A2E] rounded-lg pl-9 pr-3 py-2 text-sm text-[#E8E8E8] placeholder-[#555] focus:outline-none focus:border-[#C8A97E]"
                    />
                  </div>
                  <button
                    onClick={selectAllContacts}
                    className="px-3 py-2 text-sm text-[#C8A97E] hover:bg-[#C8A97E]/10 rounded-lg transition-colors"
                  >
                    Select All
                  </button>
                </div>

                <div className="max-h-48 overflow-y-auto space-y-1">
                  {filteredContacts.length > 0 ? (
                    filteredContacts.map(contact => (
                      <button
                        key={contact.id}
                        onClick={() => toggleRecipient({
                          type: 'contact',
                          id: contact.id,
                          name: contact.name,
                          company: contact.company,
                          email: contact.email
                        })}
                        className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg transition-colors ${
                          isRecipientSelected(contact.id, 'contact')
                            ? 'bg-[#C8A97E]/20 border border-[#C8A97E]'
                            : 'bg-[#1A1A1E] border border-transparent hover:border-[#2A2A2E]'
                        }`}
                      >
                        <div className={`w-5 h-5 rounded border flex items-center justify-center ${
                          isRecipientSelected(contact.id, 'contact')
                            ? 'bg-[#C8A97E] border-[#C8A97E]'
                            : 'border-[#333]'
                        }`}>
                          {isRecipientSelected(contact.id, 'contact') && <Check className="w-3 h-3 text-[#0A0A0C]" />}
                        </div>
                        <div className="flex-1 text-left">
                          <p className="text-sm text-[#E8E8E8]">{contact.name}</p>
                          <p className="text-xs text-[#666]">{contact.company} - {contact.email}</p>
                        </div>
                        <span className="px-2 py-0.5 rounded text-xs bg-[#2A2A2E] text-[#888] capitalize">
                          {contact.contact_type}
                        </span>
                      </button>
                    ))
                  ) : (
                    <p className="text-sm text-[#666] text-center py-4">No contacts found</p>
                  )}
                </div>
              </div>
            )}

            {recipientTab === 'hitlist' && (
              <div>
                <div className="flex justify-end mb-3">
                  <button
                    onClick={selectAllHitlist}
                    className="px-3 py-2 text-sm text-[#C8A97E] hover:bg-[#C8A97E]/10 rounded-lg transition-colors"
                  >
                    Select All
                  </button>
                </div>

                <div className="max-h-48 overflow-y-auto space-y-1">
                  {hitlistMembers.length > 0 ? (
                    hitlistMembers.map(member => (
                      <button
                        key={member.id}
                        onClick={() => toggleRecipient({
                          type: 'hitlist',
                          id: member.artist_id,
                          name: member.artist?.full_name || member.artist?.artist_name || 'Unknown',
                          company: member.artist?.company
                        })}
                        className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg transition-colors ${
                          isRecipientSelected(member.artist_id, 'hitlist')
                            ? 'bg-[#C8A97E]/20 border border-[#C8A97E]'
                            : 'bg-[#1A1A1E] border border-transparent hover:border-[#2A2A2E]'
                        }`}
                      >
                        <div className={`w-5 h-5 rounded border flex items-center justify-center ${
                          isRecipientSelected(member.artist_id, 'hitlist')
                            ? 'bg-[#C8A97E] border-[#C8A97E]'
                            : 'border-[#333]'
                        }`}>
                          {isRecipientSelected(member.artist_id, 'hitlist') && <Check className="w-3 h-3 text-[#0A0A0C]" />}
                        </div>
                        <div className="flex-1 text-left">
                          <p className="text-sm text-[#E8E8E8]">
                            {member.artist?.full_name || member.artist?.artist_name || 'Unknown'}
                          </p>
                          {member.artist?.company && (
                            <p className="text-xs text-[#666]">{member.artist.company}</p>
                          )}
                        </div>
                        <Star className="w-4 h-4 text-[#C8A97E] fill-current" />
                      </button>
                    ))
                  ) : (
                    <p className="text-sm text-[#666] text-center py-4">No hit list members</p>
                  )}
                </div>
              </div>
            )}

            {recipientTab === 'upload' && (
              <div>
                <div className="bg-[#1A1A1E] border border-dashed border-[#2A2A2E] rounded-lg p-6 text-center mb-4">
                  <Upload className="w-8 h-8 text-[#666] mx-auto mb-2" />
                  <p className="text-sm text-[#888] mb-2">Upload CSV file</p>
                  <p className="text-xs text-[#555] mb-4">Expected format: name, company, email, type</p>
                  <input
                    type="file"
                    accept=".csv"
                    onChange={handleCsvUpload}
                    className="hidden"
                    id="csv-upload"
                  />
                  <label
                    htmlFor="csv-upload"
                    className="inline-flex items-center gap-2 px-4 py-2 bg-[#C8A97E] text-[#0A0A0C] rounded-lg text-sm font-medium cursor-pointer hover:bg-[#D4B88A] transition-colors"
                  >
                    Choose File
                  </label>
                </div>

                {csvData.length > 0 && (
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-sm text-[#888]">{csvData.length} contacts parsed</p>
                      <button
                        onClick={importCsvContacts}
                        className="px-3 py-1.5 bg-[#C8A97E] text-[#0A0A0C] rounded-lg text-sm font-medium hover:bg-[#D4B88A] transition-colors"
                      >
                        Import & Select All
                      </button>
                    </div>
                    <div className="max-h-32 overflow-y-auto bg-[#0A0A0C] rounded-lg p-2">
                      {csvData.slice(0, 5).map((c, i) => (
                        <div key={i} className="text-xs text-[#666] py-1">
                          {c.name} - {c.company} - {c.email}
                        </div>
                      ))}
                      {csvData.length > 5 && (
                        <div className="text-xs text-[#555] py-1">...and {csvData.length - 5} more</div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}

            {selectedRecipients.length > 0 && (
              <div className="mt-4 pt-4 border-t border-[#1A1A1E]">
                <p className="text-sm text-[#888] mb-2">{selectedRecipients.length} recipients selected</p>
                <div className="flex flex-wrap gap-2">
                  {selectedRecipients.slice(0, 10).map(r => (
                    <span
                      key={`${r.type}-${r.id}`}
                      className="inline-flex items-center gap-1 px-2 py-1 bg-[#1A1A1E] rounded-full text-xs text-[#E8E8E8]"
                    >
                      {r.name}
                      <button
                        onClick={() => toggleRecipient(r)}
                        className="text-[#666] hover:text-[#E8E8E8]"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </span>
                  ))}
                  {selectedRecipients.length > 10 && (
                    <span className="px-2 py-1 text-xs text-[#666]">
                      +{selectedRecipients.length - 10} more
                    </span>
                  )}
                </div>
              </div>
            )}
          </section>
        </div>

        <div className="flex items-center justify-between p-4 border-t border-[#1A1A1E]">
          <div className="flex items-center gap-2 text-xs text-[#666]">
            {selectedRecipients.length > 0 && (
              <>
                <AlertCircle className="w-4 h-4" />
                Brief will be sent to {selectedRecipients.length} recipients
              </>
            )}
          </div>
          <div className="flex gap-3">
            <button
              onClick={() => saveBrief(false)}
              disabled={saving}
              className="px-4 py-2 text-sm text-[#888] hover:text-[#E8E8E8] transition-colors disabled:opacity-50"
            >
              Save Draft
            </button>
            <button
              onClick={() => saveBrief(true)}
              disabled={saving || selectedRecipients.length === 0}
              className="px-6 py-2 bg-[#C8A97E] text-[#0A0A0C] rounded-lg text-sm font-medium hover:bg-[#D4B88A] transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {saving ? <Spinner /> : <Clock className="w-4 h-4" />}
              Send Brief
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
