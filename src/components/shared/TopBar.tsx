import { useState, useRef, useEffect, useCallback } from 'react'
import { Search, Bell, ChevronDown, LogOut } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { RoleBadge } from './UI'
import { ROLE_COLORS } from '../../lib/constants'
import type { Profile } from '../../lib/types'

interface TopBarProps {
  profile: Profile
  searchQuery: string
  onSearchChange: (query: string) => void
  viewingRole: Profile['role']
  onViewingRoleChange: (role: Profile['role']) => void
  onSignOut?: () => void
}

const VIEW_ROLE_OPTIONS: { role: Profile['role']; label: string }[] = [
  { role: 'admin', label: '👁 Admin' },
  { role: 'supervisor', label: '🎬 Supervisor' },
  { role: 'artist', label: '🎵 Artist' },
  { role: 'label', label: '🏢 Label' },
]

export function TopBar({ profile, searchQuery, onSearchChange, viewingRole, onViewingRoleChange, onSignOut }: TopBarProps) {
  const [showDropdown, setShowDropdown] = useState(false)
  const [showRoleMenu, setShowRoleMenu] = useState(false)
  const [notifications, setNotifications] = useState(0)
  const dropdownRef = useRef<HTMLDivElement>(null)
  const roleMenuRef = useRef<HTMLDivElement>(null)
  const roleColor = ROLE_COLORS[viewingRole] || '#C8A97E'

  const loadNotifications = useCallback(async () => {
    const { count } = await supabase
      .from('messages')
      .select('*', { count: 'exact', head: true })
      .eq('recipient_id', profile.id)
      .eq('read', false)
    setNotifications(count || 0)
  }, [profile.id])

  useEffect(() => {
    void loadNotifications()
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) setShowDropdown(false)
      if (roleMenuRef.current && !roleMenuRef.current.contains(e.target as Node)) setShowRoleMenu(false)
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [loadNotifications])

  const initials = profile.full_name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()

  return (
    <header className="h-14 bg-[#0D0D12] border-b border-[#1A1A22] flex items-center px-4 gap-4 flex-shrink-0">
      <div className="flex-1 max-w-2xl mx-auto">
        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-[#555]" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Search tracks, artists, playlists..."
            className="w-full bg-[#1A1A1E] border border-[#2A2A2E] rounded-full pl-11 pr-4 py-2 text-sm text-[#E8E8E8] placeholder-[#555] focus:outline-none focus:border-[#C8A97E]"
          />
        </div>
      </div>

      {profile.role === 'admin' && (
        <div className="relative" ref={roleMenuRef}>
          <button
            onClick={() => setShowRoleMenu(!showRoleMenu)}
            className="text-sm rounded-lg border border-[#2A2A2E] bg-[#17171C] text-[#E8E8E8] px-3 py-1.5"
          >
            Viewing as: {viewingRole[0].toUpperCase() + viewingRole.slice(1)} <ChevronDown className="w-3 h-3 inline ml-1" />
          </button>
          {showRoleMenu && (
            <div className="absolute right-0 mt-2 w-52 rounded-lg border border-[#2A2A2E] bg-[#13131A] z-50 py-1">
              {VIEW_ROLE_OPTIONS.map(({ role, label }) => (
                <button
                  key={role}
                  onClick={() => {
                    onViewingRoleChange(role)
                    setShowRoleMenu(false)
                  }}
                  className={`w-full text-left px-3 py-2 text-sm ${viewingRole === role ? 'text-[#C8A97E] bg-[#C8A97E]/10' : 'text-[#CFCFD2] hover:bg-[#1D1D25]'}`}
                >
                  {label}
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      <button className="relative p-2 text-[#666] hover:text-[#E8E8E8]">
        <Bell className="w-5 h-5" />
        {notifications > 0 && <span className="absolute top-1 right-1 w-4 h-4 rounded-full text-[10px] flex items-center justify-center font-medium text-[#0A0A0C]" style={{ backgroundColor: roleColor }}>{notifications > 9 ? '9+' : notifications}</span>}
      </button>

      <div className="relative" ref={dropdownRef}>
        <button onClick={() => setShowDropdown(!showDropdown)} className="flex items-center gap-2 p-1 rounded-lg hover:bg-[#1A1A1E]">
          <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-medium" style={{ backgroundColor: `${roleColor}20`, color: roleColor }}>{initials}</div>
          <ChevronDown className={`w-4 h-4 text-[#666] transition-transform ${showDropdown ? 'rotate-180' : ''}`} />
        </button>

        {showDropdown && (
          <div className="absolute right-0 top-full mt-2 w-64 bg-[#13131A] border border-[#1E1E22] rounded-xl py-2 z-50">
            <div className="px-4 py-3 border-b border-[#1E1E22]">
              <p className="text-sm font-medium text-[#E8E8E8]">{profile.full_name}</p>
              <p className="text-xs text-[#666] mt-0.5">{profile.email}</p>
              <div className="mt-2"><RoleBadge role={profile.role} /></div>
            </div>
            {onSignOut && (
              <button
                onClick={onSignOut}
                className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-[#FF6B6B] hover:bg-[#FF6B6B]/10 transition-colors"
              >
                <LogOut className="w-4 h-4" />
                Sign Out
              </button>
            )}
          </div>
        )}
      </div>
    </header>
  )
}
