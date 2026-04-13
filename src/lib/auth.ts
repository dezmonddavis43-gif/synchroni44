import type { Profile } from './types'

export type CanonicalRole = Profile['role']

const ROLE_ALIASES: Record<string, CanonicalRole> = {
  admin: 'admin',
  artist: 'artist',
  creator: 'artist',
  rights_holder: 'artist',
  rights_holder_creator: 'artist',
  label: 'label',
  supervisor: 'supervisor',
  client: 'supervisor',
  music_supervisor: 'supervisor',
  brand_user: 'supervisor'
}

export function normalizeRole(role?: string | null): CanonicalRole {
  if (!role) return 'supervisor'
  return ROLE_ALIASES[role] ?? 'supervisor'
}

export function getDefaultTabForRole(role: CanonicalRole): string {
  if (role === 'artist') return 'my-catalog'
  if (role === 'label') return 'catalog-search'
  return 'search'
}

export function getAllowedTabs(role: CanonicalRole): Set<string> {
  if (role === 'admin') {
    return new Set([
      'search', 'projects', 'playlists', 'studio', 'sync-studio', 'hitlist', 'inbox', 'briefs', 'licensing', 'my-library', 'messages',
      'my-catalog', 'upload', 'ai-pitch', 'opportunities', 'earnings',
      'catalog-search', 'pitch-tracker', 'roster', 'label-earnings', 'label-briefs', 'admin'
    ])
  }
  if (role === 'artist') {
    return new Set(['my-catalog', 'upload', 'playlists', 'studio', 'ai-pitch', 'opportunities', 'earnings', 'messages'])
  }
  if (role === 'label') {
    return new Set(['catalog-search', 'upload', 'playlists', 'studio', 'pitch-tracker', 'roster', 'label-briefs', 'label-earnings', 'messages'])
  }
  return new Set(['search', 'projects', 'playlists', 'studio', 'sync-studio', 'hitlist', 'inbox', 'briefs', 'licensing', 'my-library', 'messages'])
}
