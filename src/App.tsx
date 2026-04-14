import { useEffect, useMemo, useState } from 'react'
import { X } from 'lucide-react'
import { supabase } from './lib/supabase'
import { useAudioPlayer } from './hooks/useAudioPlayer'
import type { Profile, Track } from './lib/types'

import { AuthScreen } from './components/auth/AuthScreen'
import { Sidebar } from './components/shared/Sidebar'
import { TopBar } from './components/shared/TopBar'
import { NowPlayingBar } from './components/shared/NowPlayingBar'
import { MobileNav } from './components/shared/MobileNav'

import { Search } from './components/supervisor/Search'
import { Projects } from './components/supervisor/Projects'
import { PlaylistWorkspace } from './components/shared/PlaylistWorkspace'
import { HitList } from './components/supervisor/HitList'
import { Inbox } from './components/supervisor/Inbox'
import { Briefs } from './components/supervisor/Briefs'
import { Licensing } from './components/supervisor/Licensing'
import { Studio } from './components/supervisor/Studio'
import { AISearch } from './components/supervisor/AISearch'

import { MyCatalog } from './components/artist/MyCatalog'
import { AIPlaylistCreator } from './components/artist/AIPlaylistCreator'
import { Earnings } from './components/artist/Earnings'
import { Opportunities } from './components/artist/Opportunities'

import { LabelCatalog } from './components/label/LabelCatalog'
import { BriefInbox } from './components/label/BriefInbox'
import { ResponseBuilder } from './components/label/ResponseBuilder'
import { LabelPage } from './components/label/LabelPage'

import { Upload } from './components/shared/Upload'
import { Messages } from './components/shared/Messages'
import { AdminPanel } from './components/admin/AdminPanel'
import { PitchTracker } from './components/shared/PitchTracker'
import { ArtistProfilePage } from './components/shared/ArtistProfilePage'

const DEFAULT_TAB: Record<string, string> = {
  supervisor: 'search',
  artist: 'my-catalog',
  label: 'catalog-search',
  admin: 'search',
}

const SUPERVISOR_TABS = ['search', 'ai-match', 'studio', 'playlists', 'projects', 'briefs', 'inbox', 'hitlist', 'licensing', 'messages', '111-collective'] as const

const tabsByRole: Record<string, string[]> = {
  supervisor: [...SUPERVISOR_TABS],
  artist: ['my-catalog', 'upload', 'opportunities', 'ai-pitch', 'pitch-tracker', 'earnings', 'messages'],
  label: ['catalog-search', 'upload', 'label-briefs', 'ai-pitch', 'response-builder', 'pitch-tracker', 'earnings', 'messages'],
  admin: [...SUPERVISOR_TABS, 'admin'],
}

function App() {
  const [user, setUser] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)
  const [viewingRole, setViewingRole] = useState<string>('supervisor')
  const [activeTab, setActiveTab] = useState('search')
  const [globalSearch, setGlobalSearch] = useState('')
  const [artistSlug, setArtistSlug] = useState<string | null>(null)

  const player = useAudioPlayer()

  useEffect(() => {
    let cancelled = false
    const maxTimer = window.setTimeout(() => {
      if (!cancelled) setLoading(false)
    }, 3000)

    supabase.auth
      .getSession()
      .then(async ({ data: { session } }) => {
        if (cancelled) return
        if (session?.user) {
          const { data: profile } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', session.user.id)
            .maybeSingle()

          if (profile) {
            const p = profile as Profile
            setUser(p)
            setViewingRole(p.role)
            setActiveTab(DEFAULT_TAB[p.role] || 'search')
          } else {
            await supabase.from('profiles').upsert({
              id: session.user.id,
              full_name: session.user.email?.split('@')[0] || 'User',
              role: 'supervisor',
              onboarding_complete: false,
              plan: 'free',
            })
            const fallback: Profile = {
              id: session.user.id,
              email: session.user.email || '',
              full_name: session.user.email?.split('@')[0] || 'User',
              role: 'supervisor',
              created_at: new Date().toISOString(),
            }
            setUser(fallback)
            setViewingRole('supervisor')
            setActiveTab('search')
          }
        }
      })
      .catch(() => {})
      .finally(() => {
        window.clearTimeout(maxTimer)
        if (!cancelled) setLoading(false)
      })

    return () => {
      cancelled = true
      window.clearTimeout(maxTimer)
    }
  }, [])

  useEffect(() => {
    const checkRoute = () => {
      const path = window.location.pathname
      const artistMatch = path.match(/^\/artist\/(.+)$/)
      if (artistMatch) setArtistSlug(artistMatch[1])
      else setArtistSlug(null)
    }
    checkRoute()
    window.addEventListener('app:navigate', checkRoute)
    window.addEventListener('popstate', checkRoute)
    return () => {
      window.removeEventListener('app:navigate', checkRoute)
      window.removeEventListener('popstate', checkRoute)
    }
  }, [])

  const handleAuth = (authUser: {
    id: string
    email?: string
    full_name?: string
    role?: string
    created_at?: string
    onboarding_complete?: boolean
    plan?: string
  }) => {
    const role = (authUser.role || 'supervisor') as Profile['role']
    const profile: Profile = {
      id: authUser.id,
      email: authUser.email || '',
      full_name: authUser.full_name || authUser.email?.split('@')[0] || 'User',
      role,
      created_at: authUser.created_at || new Date().toISOString(),
      onboarding_complete: authUser.onboarding_complete,
      plan: authUser.plan,
    }
    setUser(profile)
    setViewingRole(role)
    setActiveTab(DEFAULT_TAB[role] || 'search')
  }

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    setUser(null)
    setViewingRole('supervisor')
    setActiveTab('search')
    window.location.reload()
  }

  const handleViewingRoleChange = (role: string) => {
    setViewingRole(role)
    setActiveTab(DEFAULT_TAB[role] || 'search')
  }

  const navigateBackFromArtist = () => {
    setArtistSlug(null)
    window.history.pushState({}, '', '/')
  }

  const allowedTabs = useMemo(() => new Set(tabsByRole[viewingRole] || []), [viewingRole])

  useEffect(() => {
    if (!allowedTabs.has(activeTab)) {
      setActiveTab(DEFAULT_TAB[viewingRole] || 'search')
    }
  }, [activeTab, allowedTabs, viewingRole])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: '#070709' }}>
        <div className="text-center">
          <div
            className="w-12 h-12 border-2 border-t-transparent rounded-full animate-spin mx-auto mb-4"
            style={{ borderColor: '#C8A97E', borderTopColor: 'transparent' }}
          />
          <p className="text-sm tracking-widest font-semibold" style={{ color: '#C8A97E' }}>SYNCHRONI</p>
        </div>
      </div>
    )
  }

  if (!user) {
    return <AuthScreen onAuth={handleAuth} />
  }

  const previewProfile = { ...user, role: viewingRole as Profile['role'] }
  const isAdminPreviewing = user.role === 'admin' && viewingRole !== 'admin'

  const handlePlayTrack = (track: Track) => {
    if (player.currentTrack?.id === track.id) player.togglePlay()
    else player.loadTrack(track, user.id)
  }

  const renderContent = () => {
    switch (activeTab) {
      case 'search': return <Search profile={previewProfile} onPlayTrack={handlePlayTrack} currentTrack={player.currentTrack} playing={player.playing} globalSearch={globalSearch} />
      case 'ai-match': return <AISearch profile={previewProfile} onPlayTrack={handlePlayTrack} currentTrack={player.currentTrack} playing={player.playing} />
      case 'projects': return <Projects profile={previewProfile} />
      case 'playlists': return <PlaylistWorkspace profile={previewProfile} onPlayTrack={handlePlayTrack} currentTrack={player.currentTrack} playing={player.playing} />
      case 'studio': return <Studio profile={previewProfile} />
      case 'hitlist': return <HitList profile={previewProfile} />
      case 'inbox': return <Inbox profile={previewProfile} onPlayTrack={handlePlayTrack} currentTrack={player.currentTrack} playing={player.playing} />
      case 'briefs': return <Briefs profile={previewProfile} onPlayTrack={handlePlayTrack} currentTrack={player.currentTrack} playing={player.playing} />
      case 'licensing': return <Licensing profile={previewProfile} />
      case 'my-catalog': return <MyCatalog profile={previewProfile} onPlayTrack={handlePlayTrack} currentTrack={player.currentTrack} playing={player.playing} onNavigateToSearch={() => setActiveTab('search')} />
      case 'upload': return <Upload profile={previewProfile} />
      case 'opportunities': return <Opportunities profile={previewProfile} />
      case 'ai-pitch': return <AIPlaylistCreator profile={previewProfile} onPlayTrack={handlePlayTrack} currentTrack={player.currentTrack} playing={player.playing} />
      case 'catalog-search': return <LabelCatalog profile={previewProfile} onPlayTrack={handlePlayTrack} currentTrack={player.currentTrack} playing={player.playing} />
      case 'label-briefs': return <BriefInbox profile={previewProfile} onPlayTrack={handlePlayTrack} currentTrack={player.currentTrack} playing={player.playing} />
      case 'response-builder': return <ResponseBuilder profile={previewProfile} onPlayTrack={handlePlayTrack} currentTrack={player.currentTrack} playing={player.playing} />
      case 'pitch-tracker': return <PitchTracker profile={previewProfile} />
      case 'earnings': return <Earnings profile={previewProfile} />
      case 'messages': return <Messages profile={previewProfile} />
      case 'admin': return <AdminPanel profile={previewProfile} onPlayTrack={handlePlayTrack} currentTrack={player.currentTrack} playing={player.playing} />
      case '111-collective': return <LabelPage profile={previewProfile} onPlayTrack={handlePlayTrack} currentTrack={player.currentTrack} playing={player.playing} onNavigateBack={() => setActiveTab('search')} />
      default: return <Search profile={previewProfile} onPlayTrack={handlePlayTrack} currentTrack={player.currentTrack} playing={player.playing} globalSearch={globalSearch} />
    }
  }

  return (
    <div className="min-h-screen flex" style={{ background: '#070709' }}>
      <Sidebar profile={user} viewingRole={viewingRole as Profile['role']} activeTab={activeTab} onTabChange={setActiveTab} />
      <div className="flex-1 flex flex-col min-w-0">
        {isAdminPreviewing && (
          <div
            className="flex items-center justify-between px-4 py-2 text-sm font-semibold flex-shrink-0"
            style={{ background: '#C8A97E', color: '#0A0A0C' }}
          >
            <span>Admin Preview: Viewing as {viewingRole.charAt(0).toUpperCase() + viewingRole.slice(1)}</span>
            <button
              onClick={() => handleViewingRoleChange('admin')}
              className="hover:opacity-70 transition-opacity"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}
        <TopBar
          profile={user}
          searchQuery={globalSearch}
          onSearchChange={setGlobalSearch}
          viewingRole={viewingRole as Profile['role']}
          onViewingRoleChange={handleViewingRoleChange}
          onSignOut={handleSignOut}
        />
        <main className="flex-1 overflow-hidden pb-[68px]">
          {artistSlug ? (
            <ArtistProfilePage
              artistSlug={artistSlug}
              onPlayTrack={handlePlayTrack}
              currentTrack={player.currentTrack}
              playing={player.playing}
              onBack={navigateBackFromArtist}
            />
          ) : (
            renderContent()
          )}
        </main>
      </div>

      <NowPlayingBar
        currentTrack={player.currentTrack}
        playing={player.playing}
        progress={player.progress}
        duration={player.duration}
        volume={player.volume}
        onTogglePlay={player.togglePlay}
        onSeek={player.seek}
        onVolumeChange={player.setVolume}
        onPrevious={() => void player.playPrevious(user.id)}
        onNext={() => void player.playNext(user.id)}
        isFavorite={player.isFavorite}
        onToggleFavorite={() => void player.toggleFavorite(user.id)}
      />
      <MobileNav viewingRole={viewingRole as Profile['role']} activeTab={activeTab} onTabChange={setActiveTab} />
    </div>
  )
}

export default App
