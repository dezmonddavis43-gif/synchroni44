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

const tabsByRole: Record<Profile['role'], string[]> = {
  supervisor: ['search', 'ai-match', 'studio', 'playlists', 'projects', 'briefs', 'inbox', 'hitlist', 'licensing', 'messages', '111-collective'],
  artist: ['my-catalog', 'upload', 'opportunities', 'ai-pitch', 'pitch-tracker', 'earnings', 'messages'],
  label: ['catalog-search', 'upload', 'label-briefs', 'ai-pitch', 'response-builder', 'pitch-tracker', 'earnings', 'messages', '111-collective'],
  admin: ['search', 'ai-match', 'studio', 'playlists', 'projects', 'briefs', 'inbox', 'hitlist', 'licensing', 'my-catalog', 'upload', 'opportunities', 'ai-pitch', 'catalog-search', 'label-briefs', 'response-builder', 'pitch-tracker', 'earnings', 'messages', 'admin', '111-collective']
}

function App() {
  const [user, setUser] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)
  const [viewingRole, setViewingRole] = useState<Profile['role']>('supervisor')
  const [showPreviewBanner, setShowPreviewBanner] = useState(true)
  const [activeTab, setActiveTab] = useState('search')
  const [globalSearch, setGlobalSearch] = useState('')
  const [artistSlug, setArtistSlug] = useState<string | null>(null)
  const [previousTab, setPreviousTab] = useState('search')

  const player = useAudioPlayer()

  useEffect(() => {
    const timeout = setTimeout(() => setLoading(false), 3000)
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      clearTimeout(timeout)
      if (session?.user) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', session.user.id)
          .maybeSingle()
        if (profile) {
          setUser(profile as Profile)
          setViewingRole(profile.role)
        } else {
          setUser({
            id: session.user.id,
            email: session.user.email || '',
            full_name: session.user.email?.split('@')[0] || 'User',
            role: 'supervisor',
            created_at: new Date().toISOString()
          })
          setViewingRole('supervisor')
        }
      }
      setLoading(false)
    }).catch(() => {
      clearTimeout(timeout)
      setLoading(false)
    })
  }, [])

  useEffect(() => {
    const checkRoute = () => {
      const path = window.location.pathname
      const artistMatch = path.match(/^\/artist\/(.+)$/)
      if (artistMatch) {
        setArtistSlug(artistMatch[1])
      } else {
        setArtistSlug(null)
      }
    }
    checkRoute()
    const handleNavigate = () => checkRoute()
    window.addEventListener('app:navigate', handleNavigate)
    window.addEventListener('popstate', handleNavigate)
    return () => {
      window.removeEventListener('app:navigate', handleNavigate)
      window.removeEventListener('popstate', handleNavigate)
    }
  }, [])

  const handleAuth = (authUser: any) => {
    const profile: Profile = {
      id: authUser.id,
      email: authUser.email || '',
      full_name: authUser.full_name || authUser.email?.split('@')[0] || 'User',
      role: authUser.role || 'supervisor',
      created_at: authUser.created_at || new Date().toISOString()
    }
    setUser(profile)
    setViewingRole(profile.role)
  }

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    setUser(null)
    window.location.reload()
  }

  const navigateToArtist = (slug: string) => {
    setPreviousTab(activeTab)
    setArtistSlug(slug)
    window.history.pushState({}, '', `/artist/${encodeURIComponent(slug)}`)
  }

  const navigateBackFromArtist = () => {
    setArtistSlug(null)
    window.history.pushState({}, '', '/')
  }

  const allowedTabs = useMemo(() => new Set(tabsByRole[viewingRole]), [viewingRole])

  useEffect(() => {
    if (!allowedTabs.has(activeTab)) setActiveTab(tabsByRole[viewingRole][0])
  }, [activeTab, allowedTabs, viewingRole])

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0A0A0C] flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-2 border-[#C8A97E] border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-[#888]">Loading...</p>
        </div>
      </div>
    )
  }

  if (!user) {
    return <AuthScreen onAuth={handleAuth} />
  }

  const previewProfile = { ...user, role: viewingRole } as Profile

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
    <div className="min-h-screen bg-[#070709] flex">
      <Sidebar profile={user} viewingRole={viewingRole} activeTab={activeTab} onTabChange={setActiveTab} />
      <div className="flex-1 flex flex-col min-w-0">
        {user.role === 'admin' && showPreviewBanner && (
          <div className="bg-[#C8A97E] text-[#0A0A0C] px-4 py-2 text-sm flex items-center justify-between">
            <span>Admin Preview Mode - Viewing as {viewingRole[0].toUpperCase() + viewingRole.slice(1)}</span>
            <button onClick={() => setShowPreviewBanner(false)}><X className='w-4 h-4' /></button>
          </div>
        )}
        <TopBar
          profile={user}
          searchQuery={globalSearch}
          onSearchChange={setGlobalSearch}
          viewingRole={viewingRole}
          onViewingRoleChange={(role) => { setViewingRole(role); setShowPreviewBanner(true) }}
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

      <NowPlayingBar currentTrack={player.currentTrack} playing={player.playing} onPlayPause={player.togglePlay} onSkipNext={player.skipNext} onSkipPrevious={player.skipPrevious} onToggleFavorite={player.toggleFavorite} isFavorite={player.isFavorite} onSeek={player.seek} onVolumeChange={player.setVolume} currentTime={player.currentTime} duration={player.duration} volume={player.volume} queue={player.queue} queueIndex={player.queueIndex} onSelectTrack={player.selectTrack} />
      <MobileNav viewingRole={viewingRole} activeTab={activeTab} onTabChange={setActiveTab} />
    </div>
  )
}

export default App
