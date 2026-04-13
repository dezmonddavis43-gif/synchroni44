import { spawn } from 'node:child_process'
import { setTimeout as delay } from 'node:timers/promises'

const checks = []

function logResult(ok, label, details = '') {
  checks.push({ ok, label, details })
  const icon = ok ? '✅' : '❌'
  console.log(`${icon} ${label}${details ? ` — ${details}` : ''}`)
}

async function fetchWithTimeout(url, timeoutMs = 5000) {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeoutMs)
  try {
    return await fetch(url, { signal: controller.signal })
  } finally {
    clearTimeout(timer)
  }
}

function killProcessTree(pid) {
  if (!pid) return
  try {
    process.kill(-pid, 'SIGTERM')
  } catch {
    // ignore
  }
}

async function runLocalDevServerCheck() {
  const port = Number(process.env.SMOKE_PORT || 4173)
  const child = spawn('npm', ['run', 'dev', '--', '--host', '127.0.0.1', '--port', String(port)], {
    stdio: ['ignore', 'pipe', 'pipe'],
    detached: true
  })

  let stdout = ''
  let stderr = ''
  child.stdout.on('data', chunk => {
    stdout += chunk.toString()
  })
  child.stderr.on('data', chunk => {
    stderr += chunk.toString()
  })

  try {
    let ready = false
    for (let i = 0; i < 12; i++) {
      await delay(500)
      try {
        const res = await fetchWithTimeout(`http://127.0.0.1:${port}`)
        if (res.ok) {
          ready = true
          break
        }
      } catch {
        // retry
      }
    }

    if (!ready) {
      logResult(false, 'Dev server startup', 'Could not get HTTP 200 from local server')
      return
    }

    const res = await fetchWithTimeout(`http://127.0.0.1:${port}`)
    const html = await res.text()
    const hasAppShell = html.includes('<div id="root"></div>')
    logResult(hasAppShell, 'Dev server startup', hasAppShell ? 'App shell served correctly' : 'Missing root mount point')
  } finally {
    killProcessTree(child.pid)
    await delay(400)
  }

  if (stderr.trim()) {
    console.log('--- dev server stderr ---')
    console.log(stderr.trim())
  }
  if (stdout.trim()) {
    console.log('--- dev server stdout (tail) ---')
    console.log(stdout.split('\n').slice(-10).join('\n').trim())
  }
}

async function runOptionalSupabaseChecks() {
  const email = process.env.SUPABASE_SMOKE_EMAIL
  const password = process.env.SUPABASE_SMOKE_PASSWORD
  const url = process.env.VITE_SUPABASE_URL
  const anonKey = process.env.VITE_SUPABASE_ANON_KEY

  if (!email || !password || !url || !anonKey) {
    console.log('⚠️ Skipping authenticated Supabase smoke checks (missing SUPABASE_SMOKE_EMAIL, SUPABASE_SMOKE_PASSWORD, VITE_SUPABASE_URL, or VITE_SUPABASE_ANON_KEY).')
    return
  }

  const { createClient } = await import('@supabase/supabase-js')
  const supabase = createClient(url, anonKey)

  const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({ email, password })
  if (signInError || !signInData.user) {
    logResult(false, 'Supabase auth sign in', signInError?.message || 'No user returned')
    return
  }

  logResult(true, 'Supabase auth sign in', signInData.user.email || signInData.user.id)

  const [profilesRes, briefsRes, tracksRes] = await Promise.all([
    supabase.from('profiles').select('id').limit(1),
    supabase.from('briefs').select('id').limit(1),
    supabase.from('tracks').select('id').limit(1)
  ])

  logResult(!profilesRes.error, 'Profiles table query', profilesRes.error?.message)
  logResult(!briefsRes.error, 'Briefs table query', briefsRes.error?.message)
  logResult(!tracksRes.error, 'Tracks table query', tracksRes.error?.message)

  await supabase.auth.signOut()
}

await runLocalDevServerCheck()
await runOptionalSupabaseChecks()

const failed = checks.filter(c => !c.ok)
process.exit(failed.length > 0 ? 1 : 0)
