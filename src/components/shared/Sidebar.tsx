import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import { Search, Sparkles, Clapperboard, ListMusic, FolderKanban, FileText, Inbox, Star, Scale, MessageSquare, Music2, Upload, DollarSign, Settings, Disc3 } from 'lucide-react'
import type { Profile } from '../../lib/types'
import { ROLE_COLORS } from '../../lib/constants'

interface SidebarProps {
  profile: Profile
  viewingRole: Profile['role']
  activeTab: string
  onTabChange: (tab: string) => void
}

interface NavSection { label: string; items: { id: string; label: string; icon: React.ReactNode }[] }

const supervisorSections: NavSection[] = [
  { label: 'DISCOVER', items: [{ id: 'search', label: '⌕ Search', icon: <Search className='w-4 h-4' /> }, { id: 'ai-match', label: '✦ AI Match', icon: <Sparkles className='w-4 h-4' /> }] },
  { label: 'WORK', items: [{ id: 'studio', label: '🎬 Studio', icon: <Clapperboard className='w-4 h-4' /> }, { id: 'playlists', label: '♫ Playlists', icon: <ListMusic className='w-4 h-4' /> }] },
  { label: 'PIPELINE', items: [{ id: 'projects', label: '⊞ Projects', icon: <FolderKanban className='w-4 h-4' /> }, { id: 'briefs', label: '📋 Briefs', icon: <FileText className='w-4 h-4' /> }, { id: 'inbox', label: '📥 Inbox', icon: <Inbox className='w-4 h-4' /> }, { id: 'hitlist', label: '★ Hit List', icon: <Star className='w-4 h-4' /> }] },
  { label: 'LICENSE', items: [{ id: 'licensing', label: '⚖ Licensing', icon: <Scale className='w-4 h-4' /> }, { id: 'messages', label: '💬 Messages', icon: <MessageSquare className='w-4 h-4' /> }] },
  { label: 'LABELS', items: [{ id: '111-collective', label: '111 Collective', icon: <Disc3 className='w-4 h-4' /> }] },
]

const artistSections: NavSection[] = [
  { label: 'MY MUSIC', items: [{ id: 'my-catalog', label: '🎵 My Catalog', icon: <Music2 className='w-4 h-4' /> }, { id: 'upload', label: '↑ Upload', icon: <Upload className='w-4 h-4' /> }] },
  { label: 'GET WORK', items: [{ id: 'opportunities', label: '📋 Opportunities', icon: <FileText className='w-4 h-4' /> }, { id: 'ai-pitch', label: '✦ AI Pitch Tool', icon: <Sparkles className='w-4 h-4' /> }] },
  { label: 'TRACK IT', items: [{ id: 'pitch-tracker', label: '📤 Pitch Tracker', icon: <FolderKanban className='w-4 h-4' /> }, { id: 'earnings', label: '💰 Earnings', icon: <DollarSign className='w-4 h-4' /> }, { id: 'messages', label: '💬 Messages', icon: <MessageSquare className='w-4 h-4' /> }] }
]

const labelSections: NavSection[] = [
  { label: 'MY MUSIC', items: [{ id: 'catalog-search', label: '🔍 Catalog Search', icon: <Search className='w-4 h-4' /> }, { id: 'upload', label: '↑ Upload', icon: <Upload className='w-4 h-4' /> }] },
  { label: 'GET WORK', items: [{ id: 'label-briefs', label: '📥 Brief Inbox', icon: <Inbox className='w-4 h-4' /> }, { id: 'ai-pitch', label: '✦ AI Pitch Tool', icon: <Sparkles className='w-4 h-4' /> }, { id: 'response-builder', label: '🎵 Response Builder', icon: <ListMusic className='w-4 h-4' /> }] },
  { label: 'TRACK IT', items: [{ id: 'pitch-tracker', label: '📤 Pitch Tracker', icon: <FolderKanban className='w-4 h-4' /> }, { id: 'earnings', label: '💰 Earnings', icon: <DollarSign className='w-4 h-4' /> }, { id: 'messages', label: '💬 Messages', icon: <MessageSquare className='w-4 h-4' /> }] },
  { label: 'LABELS', items: [{ id: '111-collective', label: '111 Collective', icon: <Disc3 className='w-4 h-4' /> }] },
]

export function Sidebar({ profile, viewingRole, activeTab, onTabChange }: SidebarProps) {
  const [unreadCount, setUnreadCount] = useState(0)
  const roleColor = ROLE_COLORS[viewingRole] || '#C8A97E'

  useEffect(() => {
    const load = async () => {
      const { count } = await supabase.from('messages').select('*', { count: 'exact', head: true }).eq('recipient_id', profile.id).eq('read', false)
      setUnreadCount(count || 0)
    }
    load()
  }, [profile.id])

  const sections =
    viewingRole === 'artist' ? artistSections : viewingRole === 'label' ? labelSections : supervisorSections
  const adminSections: NavSection[] = [
    ...supervisorSections,
    { label: 'ADMIN', items: [{ id: 'admin', label: '⚙ Admin Panel', icon: <Settings className='w-4 h-4' /> }] },
  ]
  const finalSections = viewingRole === 'admin' ? adminSections : sections

  return (
    <aside className="w-[220px] h-screen bg-[#0D0D12] border-r border-[#1A1A22] flex-col hidden md:flex">
      <div className="p-4 border-b border-[#1A1A22]"><span className="font-display text-lg font-semibold text-[#E8E8E8]">SYNCHRONI</span></div>
      <nav className="flex-1 overflow-y-auto py-2 px-2">
        {finalSections.map((section, idx) => (
          <div key={idx}>
            <div className="pt-4 pb-1 px-3 text-[10px] uppercase tracking-wider text-[#555] font-medium">{section.label}</div>
            <div className="space-y-0.5">
              {section.items.map(item => (
                <button key={`${section.label}-${item.id}`} onClick={() => onTabChange(item.id)} className={`min-h-[44px] w-full flex items-center gap-2 px-3 py-2 text-sm rounded-lg ${activeTab === item.id ? 'text-[#E8E8E8]' : 'text-[#888] hover:bg-[#1A1A1E]'}`} style={activeTab === item.id ? { backgroundColor: `${roleColor}15`, borderLeft: `3px solid ${roleColor}` } : {}}>
                  <span>{item.icon}</span><span className='flex-1 text-left'>{item.label}</span>
                  {item.id === 'messages' && unreadCount > 0 ? <span className='text-xs text-[#0A0A0C] rounded-full px-1.5' style={{ background: roleColor }}>{unreadCount}</span> : null}
                </button>
              ))}
            </div>
          </div>
        ))}
      </nav>
    </aside>
  )
}
