import { createClient } from '@supabase/supabase-js'

const url = process.env.VITE_SUPABASE_URL
const anonKey = process.env.VITE_SUPABASE_ANON_KEY
const email = process.env.SUPABASE_SMOKE_EMAIL
const password = process.env.SUPABASE_SMOKE_PASSWORD

const checks = []
const log = (ok, label, detail = '') => {
  checks.push(ok)
  console.log(`${ok ? '✅' : '❌'} ${label}${detail ? ` — ${detail}` : ''}`)
}

if (!url || !anonKey || !email || !password) {
  console.log('⚠️ Skipping critical-flow-smoke (missing Supabase env vars/credentials).')
  process.exit(0)
}

const supabase = createClient(url, anonKey)

const { data: signIn, error: signInError } = await supabase.auth.signInWithPassword({ email, password })
if (signInError || !signIn.user) {
  log(false, 'Auth sign-in', signInError?.message || 'No user returned')
  process.exit(1)
}

log(true, 'Auth sign-in', signIn.user.email || signIn.user.id)

const userId = signIn.user.id

const profileRes = await supabase.from('profiles').select('id,role').eq('id', userId).maybeSingle()
log(!profileRes.error && Boolean(profileRes.data?.id), 'Profile lookup', profileRes.error?.message)

const briefsRes = await supabase
  .from('briefs')
  .select('id,title,status,supervisor_id')
  .or(`supervisor_id.eq.${userId},and(is_private.eq.false,status.eq.open)`)
  .limit(5)
log(!briefsRes.error, 'Brief query', briefsRes.error?.message)

const tracksRes = await supabase
  .from('tracks')
  .select('id,title,status,uploaded_by')
  .or(`uploaded_by.eq.${userId},status.eq.active`)
  .limit(5)
log(!tracksRes.error, 'Track query', tracksRes.error?.message)

const submissionsRes = await supabase
  .from('brief_submissions')
  .select('id,status,artist_id')
  .or(`artist_id.eq.${userId}`)
  .limit(5)
log(!submissionsRes.error, 'Submission query', submissionsRes.error?.message)

await supabase.auth.signOut()

if (checks.every(Boolean)) {
  process.exit(0)
}
process.exit(1)
