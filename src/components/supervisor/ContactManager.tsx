import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../../lib/supabase'
import { Spinner, EmptyState } from '../shared/UI'
import { Plus, Search, X, CreditCard as Edit2, Trash2, Upload, Send, User, Mail } from 'lucide-react'
import type { Profile, BriefContact } from '../../lib/types'

interface ContactManagerProps {
  profile: Profile
  onSendBrief?: (contactIds: string[]) => void
}

const CONTACT_TYPES = ['all', 'label', 'publisher', 'artist', 'other']

export function ContactManager({ profile, onSendBrief }: ContactManagerProps) {
  const [contacts, setContacts] = useState<BriefContact[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [filterType, setFilterType] = useState('all')
  const [showAddForm, setShowAddForm] = useState(false)
  const [editingContact, setEditingContact] = useState<BriefContact | null>(null)
  const [showCsvUpload, setShowCsvUpload] = useState(false)
  const [csvData, setCsvData] = useState<{ name: string; company: string; email: string; type: string }[]>([])
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())

  const [formName, setFormName] = useState('')
  const [formCompany, setFormCompany] = useState('')
  const [formEmail, setFormEmail] = useState('')
  const [formType, setFormType] = useState('label')

  const loadContacts = useCallback(async () => {
    setLoading(true)
    const { data, error } = await supabase
      .from('brief_contacts')
      .select('*')
      .eq('supervisor_id', profile.id)
      .order('name')

    if (error) {
      console.error('Error loading contacts:', error)
    } else if (data) {
      setContacts(data)
    }
    setLoading(false)
  }, [profile.id])

  useEffect(() => {
    void loadContacts()
  }, [loadContacts])

  const filteredContacts = contacts.filter(contact => {
    const matchesSearch = !searchQuery ||
      contact.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      contact.company?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      contact.email.toLowerCase().includes(searchQuery.toLowerCase())

    const matchesType = filterType === 'all' || contact.contact_type === filterType

    return matchesSearch && matchesType
  })

  const resetForm = () => {
    setFormName('')
    setFormCompany('')
    setFormEmail('')
    setFormType('label')
    setShowAddForm(false)
    setEditingContact(null)
  }

  const handleAddContact = async () => {
    if (!formName.trim() || !formEmail.trim()) return

    const { data, error } = await supabase
      .from('brief_contacts')
      .insert({
        supervisor_id: profile.id,
        name: formName,
        company: formCompany || null,
        email: formEmail,
        contact_type: formType
      })
      .select()
      .single()

    if (error) {
      console.error('Error adding contact:', error)
      return
    }

    if (data) {
      setContacts(prev => [...prev, data])
      resetForm()
    }
  }

  const handleUpdateContact = async () => {
    if (!editingContact || !formName.trim() || !formEmail.trim()) return

    const { error } = await supabase
      .from('brief_contacts')
      .update({
        name: formName,
        company: formCompany || null,
        email: formEmail,
        contact_type: formType
      })
      .eq('id', editingContact.id)

    if (error) {
      console.error('Error updating contact:', error)
      return
    }

    setContacts(prev => prev.map(c =>
      c.id === editingContact.id
        ? { ...c, name: formName, company: formCompany || undefined, email: formEmail, contact_type: formType as BriefContact['contact_type'] }
        : c
    ))
    resetForm()
  }

  const handleDeleteContact = async (id: string) => {
    if (!confirm('Delete this contact?')) return

    const { error } = await supabase.from('brief_contacts').delete().eq('id', id)

    if (error) {
      console.error('Error deleting contact:', error)
      return
    }

    setContacts(prev => prev.filter(c => c.id !== id))
    setSelectedIds(prev => {
      const next = new Set(prev)
      next.delete(id)
      return next
    })
  }

  const startEdit = (contact: BriefContact) => {
    setEditingContact(contact)
    setFormName(contact.name)
    setFormCompany(contact.company || '')
    setFormEmail(contact.email)
    setFormType(contact.contact_type)
    setShowAddForm(true)
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
        if (parts.length >= 3 && parts[2].includes('@')) {
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
      company: c.company || null,
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
      setCsvData([])
      setShowCsvUpload(false)
    }
  }

  const toggleSelect = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const selectAll = () => {
    setSelectedIds(new Set(filteredContacts.map(c => c.id)))
  }

  const clearSelection = () => {
    setSelectedIds(new Set())
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full bg-[#0A0A0C]">
        <Spinner />
      </div>
    )
  }

  return (
    <div className="h-[calc(100vh-76px)] overflow-hidden bg-[#0A0A0C] flex flex-col">
      <div className="p-4 border-b border-[#1A1A1E]">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-['Playfair_Display'] text-lg text-white">Contacts</h2>
          <div className="flex gap-2">
            <button
              onClick={() => setShowCsvUpload(true)}
              className="flex items-center gap-2 px-3 py-1.5 text-sm text-[#888] hover:text-[#E8E8E8] border border-[#2A2A2E] rounded-lg transition-colors"
            >
              <Upload className="w-4 h-4" />
              Import CSV
            </button>
            <button
              onClick={() => { resetForm(); setShowAddForm(true) }}
              className="flex items-center gap-2 px-3 py-1.5 bg-[#C8A97E] text-[#0A0A0C] rounded-lg text-sm font-medium hover:bg-[#D4B88A] transition-colors"
            >
              <Plus className="w-4 h-4" />
              Add Contact
            </button>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#666]" />
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Search by name, company, or email..."
              className="w-full bg-[#1A1A1E] border border-[#2A2A2E] rounded-lg pl-9 pr-3 py-2 text-sm text-[#E8E8E8] placeholder-[#555] focus:outline-none focus:border-[#C8A97E]"
            />
          </div>

          <div className="flex gap-1">
            {CONTACT_TYPES.map(type => (
              <button
                key={type}
                onClick={() => setFilterType(type)}
                className={`px-3 py-2 rounded-lg text-xs font-medium transition-colors capitalize ${
                  filterType === type
                    ? 'bg-[#C8A97E] text-[#0A0A0C]'
                    : 'bg-[#1A1A1E] text-[#888] hover:text-[#E8E8E8]'
                }`}
              >
                {type}
              </button>
            ))}
          </div>
        </div>

        {selectedIds.size > 0 && (
          <div className="flex items-center justify-between mt-3 pt-3 border-t border-[#1A1A1E]">
            <span className="text-sm text-[#888]">{selectedIds.size} selected</span>
            <div className="flex gap-2">
              <button
                onClick={clearSelection}
                className="px-3 py-1.5 text-sm text-[#888] hover:text-[#E8E8E8] transition-colors"
              >
                Clear
              </button>
              {onSendBrief && (
                <button
                  onClick={() => onSendBrief(Array.from(selectedIds))}
                  className="flex items-center gap-2 px-3 py-1.5 bg-[#C8A97E] text-[#0A0A0C] rounded-lg text-sm font-medium hover:bg-[#D4B88A] transition-colors"
                >
                  <Send className="w-4 h-4" />
                  Send Brief
                </button>
              )}
            </div>
          </div>
        )}
      </div>

      <div className="flex-1 overflow-y-auto">
        {filteredContacts.length > 0 ? (
          <div className="divide-y divide-[#1A1A1E]">
            <div className="grid grid-cols-[40px_2fr_1fr_1.5fr_100px_100px] gap-4 px-4 py-3 text-xs text-[#666] uppercase tracking-wider bg-[#0D0D10]">
              <div className="flex items-center">
                <input
                  type="checkbox"
                  checked={selectedIds.size === filteredContacts.length && filteredContacts.length > 0}
                  onChange={e => e.target.checked ? selectAll() : clearSelection()}
                  className="w-4 h-4 rounded border-[#333] bg-[#1A1A1E] accent-[#C8A97E]"
                />
              </div>
              <span>Name</span>
              <span>Company</span>
              <span>Email</span>
              <span>Type</span>
              <span className="text-right">Actions</span>
            </div>

            {filteredContacts.map(contact => (
              <div
                key={contact.id}
                className="grid grid-cols-[40px_2fr_1fr_1.5fr_100px_100px] gap-4 px-4 py-3 items-center hover:bg-[#1A1A1E]/50 transition-colors"
              >
                <div>
                  <input
                    type="checkbox"
                    checked={selectedIds.has(contact.id)}
                    onChange={() => toggleSelect(contact.id)}
                    className="w-4 h-4 rounded border-[#333] bg-[#1A1A1E] accent-[#C8A97E]"
                  />
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-[#1A1A1E] flex items-center justify-center">
                    <User className="w-4 h-4 text-[#666]" />
                  </div>
                  <span className="text-sm text-[#E8E8E8]">{contact.name}</span>
                </div>
                <span className="text-sm text-[#888]">{contact.company || '-'}</span>
                <span className="text-sm text-[#888]">{contact.email}</span>
                <span className={`px-2 py-1 rounded text-xs font-medium capitalize ${
                  contact.contact_type === 'label' ? 'bg-[#3B82F6]/20 text-[#3B82F6]' :
                    contact.contact_type === 'publisher' ? 'bg-[#8B5CF6]/20 text-[#8B5CF6]' :
                      contact.contact_type === 'artist' ? 'bg-[#10B981]/20 text-[#10B981]' :
                        'bg-[#666]/20 text-[#666]'
                }`}>
                  {contact.contact_type}
                </span>
                <div className="flex items-center justify-end gap-2">
                  <button
                    onClick={() => startEdit(contact)}
                    className="p-1.5 text-[#666] hover:text-[#E8E8E8] transition-colors"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleDeleteContact(contact.id)}
                    className="p-1.5 text-[#666] hover:text-red-400 transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="p-8">
            <EmptyState
              title={searchQuery ? `No contacts found for '${searchQuery}'` : "No Contacts Yet"}
              description="Add contacts to send them briefs"
            />
          </div>
        )}
      </div>

      {showAddForm && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-[#0D0D10] rounded-xl w-full max-w-md p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-medium text-[#E8E8E8]">
                {editingContact ? 'Edit Contact' : 'Add Contact'}
              </h3>
              <button onClick={resetForm} className="p-1 text-[#666] hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-xs text-[#888] mb-1">Name *</label>
                <input
                  type="text"
                  value={formName}
                  onChange={e => setFormName(e.target.value)}
                  placeholder="John Smith"
                  className="w-full bg-[#1A1A1E] border border-[#2A2A2E] rounded-lg px-3 py-2 text-sm text-[#E8E8E8] placeholder-[#555] focus:outline-none focus:border-[#C8A97E]"
                />
              </div>

              <div>
                <label className="block text-xs text-[#888] mb-1">Company</label>
                <input
                  type="text"
                  value={formCompany}
                  onChange={e => setFormCompany(e.target.value)}
                  placeholder="Universal Music"
                  className="w-full bg-[#1A1A1E] border border-[#2A2A2E] rounded-lg px-3 py-2 text-sm text-[#E8E8E8] placeholder-[#555] focus:outline-none focus:border-[#C8A97E]"
                />
              </div>

              <div>
                <label className="block text-xs text-[#888] mb-1">Email *</label>
                <input
                  type="email"
                  value={formEmail}
                  onChange={e => setFormEmail(e.target.value)}
                  placeholder="john@universalmusic.com"
                  className="w-full bg-[#1A1A1E] border border-[#2A2A2E] rounded-lg px-3 py-2 text-sm text-[#E8E8E8] placeholder-[#555] focus:outline-none focus:border-[#C8A97E]"
                />
              </div>

              <div>
                <label className="block text-xs text-[#888] mb-1">Type</label>
                <select
                  value={formType}
                  onChange={e => setFormType(e.target.value)}
                  className="w-full bg-[#1A1A1E] border border-[#2A2A2E] rounded-lg px-3 py-2 text-sm text-[#E8E8E8] focus:outline-none focus:border-[#C8A97E]"
                >
                  <option value="label">Label</option>
                  <option value="publisher">Publisher</option>
                  <option value="artist">Artist</option>
                  <option value="other">Other</option>
                </select>
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={resetForm}
                className="flex-1 px-4 py-2 text-sm text-[#888] hover:text-[#E8E8E8] transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={editingContact ? handleUpdateContact : handleAddContact}
                disabled={!formName.trim() || !formEmail.trim()}
                className="flex-1 px-4 py-2 bg-[#C8A97E] text-[#0A0A0C] rounded-lg text-sm font-medium hover:bg-[#D4B88A] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {editingContact ? 'Save Changes' : 'Add Contact'}
              </button>
            </div>
          </div>
        </div>
      )}

      {showCsvUpload && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-[#0D0D10] rounded-xl w-full max-w-lg p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-medium text-[#E8E8E8]">Import Contacts</h3>
              <button
                onClick={() => { setShowCsvUpload(false); setCsvData([]) }}
                className="p-1 text-[#666] hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="bg-[#1A1A1E] border border-dashed border-[#2A2A2E] rounded-lg p-6 text-center mb-4">
              <Upload className="w-8 h-8 text-[#666] mx-auto mb-2" />
              <p className="text-sm text-[#888] mb-2">Upload CSV file</p>
              <p className="text-xs text-[#555] mb-4">Expected format: name, company, email, type</p>
              <input
                type="file"
                accept=".csv"
                onChange={handleCsvUpload}
                className="hidden"
                id="csv-upload-manager"
              />
              <label
                htmlFor="csv-upload-manager"
                className="inline-flex items-center gap-2 px-4 py-2 bg-[#C8A97E] text-[#0A0A0C] rounded-lg text-sm font-medium cursor-pointer hover:bg-[#D4B88A] transition-colors"
              >
                Choose File
              </label>
            </div>

            {csvData.length > 0 && (
              <div>
                <div className="flex items-center justify-between mb-2">
                  <p className="text-sm text-[#888]">{csvData.length} contacts found</p>
                </div>
                <div className="max-h-40 overflow-y-auto bg-[#0A0A0C] rounded-lg p-3 mb-4">
                  {csvData.slice(0, 5).map((c, i) => (
                    <div key={i} className="flex items-center gap-2 text-xs text-[#888] py-1">
                      <User className="w-3 h-3" />
                      {c.name}
                      {c.company && <span className="text-[#666]">@ {c.company}</span>}
                      <Mail className="w-3 h-3 ml-2" />
                      {c.email}
                    </div>
                  ))}
                  {csvData.length > 5 && (
                    <div className="text-xs text-[#555] py-1">...and {csvData.length - 5} more</div>
                  )}
                </div>
                <button
                  onClick={importCsvContacts}
                  className="w-full px-4 py-2 bg-[#C8A97E] text-[#0A0A0C] rounded-lg text-sm font-medium hover:bg-[#D4B88A] transition-colors"
                >
                  Import All Contacts
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
