import { useState, useRef, useEffect } from 'react'
import { Settings, Bell, CreditCard, LogOut, X } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import type { Profile } from '../../lib/types'

interface ProfileDropdownProps {
  profile: Profile
  onSignOut: () => void
}

export function ProfileDropdown({ profile, onSignOut }: ProfileDropdownProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [showSettings, setShowSettings] = useState(false)
  const [editName, setEditName] = useState(profile.full_name)
  const [editCompany, setEditCompany] = useState(profile.company || '')
  const [saving, setSaving] = useState(false)
  const [isMobile, setIsMobile] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768)
    checkMobile()
    window.addEventListener('resize', checkMobile)
    return () => window.removeEventListener('resize', checkMobile)
  }, [])

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false)
      }
    }
    if (!isMobile) {
      document.addEventListener('mousedown', handleClickOutside)
      return () => document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [isMobile])

  useEffect(() => {
    if (isOpen && isMobile) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => {
      document.body.style.overflow = ''
    }
  }, [isOpen, isMobile])

  const getInitials = (name: string) => {
    return name.split(' ').map(n => n.charAt(0)).join('').toUpperCase().slice(0, 2)
  }

  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case 'supervisor': return 'bg-[#7B9CFF]/20 text-[#7B9CFF]'
      case 'artist': return 'bg-[#4DFFB4]/20 text-[#4DFFB4]'
      case 'label': return 'bg-[#FF6B9D]/20 text-[#FF6B9D]'
      case 'admin': return 'bg-[#C8A97E]/20 text-[#C8A97E]'
      default: return 'bg-[#888]/20 text-[#888]'
    }
  }

  const saveProfile = async () => {
    setSaving(true)
    await supabase
      .from('profiles')
      .update({ full_name: editName, company: editCompany || null })
      .eq('id', profile.id)
    setSaving(false)
    setShowSettings(false)
  }

  const handleOpenSettings = () => {
    setShowSettings(true)
    setIsOpen(false)
  }

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-9 h-9 rounded-full bg-[#C8A97E] flex items-center justify-center text-sm font-semibold text-[#0A0A0C] hover:bg-[#D4B88A] transition-colors touch-manipulation"
      >
        {getInitials(profile.full_name)}
      </button>

      {isOpen && !isMobile && (
        <div className="absolute right-0 top-full mt-2 w-64 bg-[#13131A] border border-[#1E1E22] rounded-xl shadow-2xl overflow-hidden z-50">
          <div className="p-4 border-b border-[#1E1E22]">
            <p className="text-[#E8E8E8] font-semibold">{profile.full_name}</p>
            <div className="flex items-center gap-2 mt-1">
              <span className={`px-2 py-0.5 rounded text-xs font-medium capitalize ${getRoleBadgeColor(profile.role)}`}>
                {profile.role}
              </span>
            </div>
            <p className="text-xs text-[#666] mt-2 truncate">{profile.email}</p>
          </div>

          <div className="py-1">
            <button
              onClick={handleOpenSettings}
              className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-[#E8E8E8] hover:bg-[#1A1A1E] transition-colors"
            >
              <Settings className="w-4 h-4 text-[#888]" />
              Profile Settings
            </button>
            <button
              className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-[#E8E8E8] hover:bg-[#1A1A1E] transition-colors"
            >
              <Bell className="w-4 h-4 text-[#888]" />
              Notifications
            </button>
            <button
              className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-[#E8E8E8] hover:bg-[#1A1A1E] transition-colors"
            >
              <CreditCard className="w-4 h-4 text-[#888]" />
              <div className="flex-1 text-left">
                <span>Subscription</span>
                <span className="ml-2 text-xs text-[#C8A97E]">Pro</span>
              </div>
            </button>
          </div>

          <div className="border-t border-[#1E1E22] py-1">
            <button
              onClick={onSignOut}
              className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-red-400 hover:bg-[#1A1A1E] transition-colors"
            >
              <LogOut className="w-4 h-4" />
              Sign Out
            </button>
          </div>
        </div>
      )}

      {isOpen && isMobile && (
        <>
          <div
            className="fixed inset-0 bg-black/60 z-[60]"
            onClick={() => setIsOpen(false)}
          />
          <div
            className="fixed bottom-0 left-0 right-0 bg-[#13131A] rounded-t-[20px] z-[61] animate-slide-up"
            style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
          >
            <div className="flex justify-center pt-3 pb-2">
              <div className="w-10 h-1 bg-[#333] rounded-full" />
            </div>

            <div className="p-4 border-b border-[#1E1E22]">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-full bg-[#C8A97E] flex items-center justify-center text-xl font-semibold text-[#0A0A0C]">
                  {getInitials(profile.full_name)}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-lg text-[#E8E8E8] font-semibold truncate">{profile.full_name}</p>
                  <div className="flex items-center gap-2 mt-1">
                    <span className={`px-2 py-0.5 rounded text-xs font-medium capitalize ${getRoleBadgeColor(profile.role)}`}>
                      {profile.role}
                    </span>
                  </div>
                  <p className="text-sm text-[#666] mt-1 truncate">{profile.email}</p>
                </div>
              </div>
            </div>

            <div className="py-2">
              <button
                onClick={handleOpenSettings}
                className="w-full flex items-center gap-4 px-4 py-4 text-base text-[#E8E8E8] active:bg-[#1A1A1E] transition-colors touch-manipulation"
                style={{ minHeight: '56px' }}
              >
                <Settings className="w-5 h-5 text-[#888]" />
                Profile Settings
              </button>
              <button
                className="w-full flex items-center gap-4 px-4 py-4 text-base text-[#E8E8E8] active:bg-[#1A1A1E] transition-colors touch-manipulation"
                style={{ minHeight: '56px' }}
              >
                <Bell className="w-5 h-5 text-[#888]" />
                Notifications
              </button>
              <button
                className="w-full flex items-center gap-4 px-4 py-4 text-base text-[#E8E8E8] active:bg-[#1A1A1E] transition-colors touch-manipulation"
                style={{ minHeight: '56px' }}
              >
                <CreditCard className="w-5 h-5 text-[#888]" />
                <div className="flex-1 text-left">
                  <span>Subscription</span>
                  <span className="ml-2 text-sm text-[#C8A97E]">Pro</span>
                </div>
              </button>
            </div>

            <div className="border-t border-[#1E1E22] py-2">
              <button
                onClick={onSignOut}
                className="w-full flex items-center gap-4 px-4 py-4 text-base text-red-400 active:bg-[#1A1A1E] transition-colors touch-manipulation"
                style={{ minHeight: '56px' }}
              >
                <LogOut className="w-5 h-5" />
                Sign Out
              </button>
            </div>

            <button
              onClick={() => setIsOpen(false)}
              className="w-full flex items-center justify-center gap-2 py-4 border-t border-[#1A1A1E] text-[#666] touch-manipulation"
              style={{ minHeight: '56px' }}
            >
              <X className="w-5 h-5" />
              <span className="text-base font-medium">Close</span>
            </button>
          </div>
        </>
      )}

      {showSettings && (
        <div className="fixed inset-0 bg-black/60 flex items-end md:items-center justify-center z-50">
          <div
            className="bg-[#13131A] border-t md:border border-[#1E1E22] rounded-t-xl md:rounded-xl w-full md:max-w-md shadow-2xl"
            style={{ paddingBottom: isMobile ? 'env(safe-area-inset-bottom)' : 0 }}
          >
            <div className="flex items-center justify-between p-4 border-b border-[#1E1E22]">
              <h2 className="text-lg font-semibold text-[#E8E8E8]">Profile Settings</h2>
              <button
                onClick={() => setShowSettings(false)}
                className="p-2 text-[#666] hover:text-[#E8E8E8] transition-colors touch-manipulation"
                style={{ minWidth: '44px', minHeight: '44px' }}
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-4 space-y-4">
              <div>
                <label className="block text-sm text-[#888] mb-1.5">Full Name</label>
                <input
                  type="text"
                  value={editName}
                  onChange={e => setEditName(e.target.value)}
                  className="w-full bg-[#0A0A0C] border border-[#2A2A2E] rounded-lg px-4 py-3 text-[#E8E8E8] focus:outline-none focus:border-[#C8A97E] text-base"
                />
              </div>
              <div>
                <label className="block text-sm text-[#888] mb-1.5">Company</label>
                <input
                  type="text"
                  value={editCompany}
                  onChange={e => setEditCompany(e.target.value)}
                  placeholder="Your company or organization"
                  className="w-full bg-[#0A0A0C] border border-[#2A2A2E] rounded-lg px-4 py-3 text-[#E8E8E8] placeholder-[#555] focus:outline-none focus:border-[#C8A97E] text-base"
                />
              </div>
              <div>
                <label className="block text-sm text-[#888] mb-1.5">Email</label>
                <input
                  type="text"
                  value={profile.email}
                  disabled
                  className="w-full bg-[#0A0A0C] border border-[#2A2A2E] rounded-lg px-4 py-3 text-[#666] cursor-not-allowed text-base"
                />
              </div>
              <div>
                <label className="block text-sm text-[#888] mb-1.5">Role</label>
                <input
                  type="text"
                  value={profile.role}
                  disabled
                  className="w-full bg-[#0A0A0C] border border-[#2A2A2E] rounded-lg px-4 py-3 text-[#666] capitalize cursor-not-allowed text-base"
                />
              </div>
            </div>

            <div className="flex flex-col md:flex-row justify-end gap-2 p-4 border-t border-[#1E1E22]">
              <button
                onClick={saveProfile}
                disabled={saving}
                className="w-full md:w-auto px-6 py-3 text-base bg-[#C8A97E] text-[#0A0A0C] rounded-lg hover:bg-[#D4B88A] transition-colors disabled:opacity-50 font-medium touch-manipulation"
                style={{ minHeight: '48px' }}
              >
                {saving ? 'Saving...' : 'Save Changes'}
              </button>
              <button
                onClick={() => setShowSettings(false)}
                className="w-full md:w-auto px-6 py-3 text-base text-[#888] hover:text-[#E8E8E8] transition-colors touch-manipulation"
                style={{ minHeight: '48px' }}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
