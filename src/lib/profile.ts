import type { User } from '@supabase/supabase-js'
import { supabase } from './supabase'
import type { Profile } from './types'

export function profileFromUser(user: User): Profile {
  return {
    id: user.id,
    email: user.email || '',
    full_name: user.user_metadata?.full_name || user.email?.split('@')[0] || 'User',
    role: user.user_metadata?.role || 'supervisor',
    onboarding_complete: false,
    created_at: new Date().toISOString()
  }
}

export async function ensureProfile(user: User): Promise<Profile> {
  const draft = profileFromUser(user)

  const { data: existing, error: fetchError } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', draft.id)
    .maybeSingle()

  if (fetchError) throw fetchError

  if (existing) {
    return { ...draft, ...existing }
  }

  const { data: created, error: insertError } = await supabase
    .from('profiles')
    .insert({
      id: draft.id,
      full_name: draft.full_name,
      role: draft.role,
      onboarding_complete: draft.onboarding_complete
    })
    .select()
    .single()

  if (insertError) throw insertError
  return { ...draft, ...created }
}
