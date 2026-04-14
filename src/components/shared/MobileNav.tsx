import type { Profile } from '../../lib/types'
import { ROLE_COLORS } from '../../lib/constants'

interface MobileNavProps {
  viewingRole: Profile['role']
  activeTab: string
  onTabChange: (tab: string) => void
}

const tabsByRole: Record<Profile['role'], { id: string; label: string }[]> = {
  supervisor: [
    { id: 'search', label: 'Search' },
    { id: 'studio', label: 'Studio' },
    { id: 'projects', label: 'Projects' },
    { id: 'inbox', label: 'Inbox' },
    { id: 'messages', label: 'Messages' }
  ],
  artist: [
    { id: 'my-catalog', label: 'Catalog' },
    { id: 'upload', label: 'Upload' },
    { id: 'ai-pitch', label: 'AI Pitch' },
    { id: 'pitch-tracker', label: 'Tracker' },
    { id: 'messages', label: 'Messages' },
  ],
  label: [
    { id: 'catalog-search', label: 'Catalog' },
    { id: 'upload', label: 'Upload' },
    { id: 'label-briefs', label: 'Briefs' },
    { id: 'pitch-tracker', label: 'Tracker' },
    { id: 'messages', label: 'Messages' },
  ],
  admin: [
    { id: 'search', label: 'Search' },
    { id: 'studio', label: 'Studio' },
    { id: 'playlists', label: 'Lists' },
    { id: 'briefs', label: 'Briefs' },
    { id: 'admin', label: 'Admin' },
  ],
}

export function MobileNav({ viewingRole, activeTab, onTabChange }: MobileNavProps) {
  const tabs = tabsByRole[viewingRole]
  const accent = ROLE_COLORS[viewingRole] || ROLE_COLORS.supervisor
  return (
    <nav
      className="fixed bottom-0 left-0 right-0 bg-[#0D0D12] border-t border-[#1A1A22] flex md:hidden z-50 min-h-[56px] pb-[env(safe-area-inset-bottom,0px)]"
    >
      {tabs.map(tab => (
        <button
          key={tab.id}
          type="button"
          onClick={() => onTabChange(tab.id)}
          className={`min-h-[48px] flex-1 flex items-center justify-center px-1 text-xs leading-tight transition-colors ${activeTab === tab.id ? '' : 'text-[#666]'}`}
          style={activeTab === tab.id ? { color: accent } : undefined}
        >
          {tab.label}
        </button>
      ))}
    </nav>
  )
}
