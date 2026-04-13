import { useState } from 'react'
import { Music2 } from 'lucide-react'
import { supabase } from '../../lib/supabase'

interface AuthScreenProps {
  onAuth: (user: any) => void
}

const ROLE_OPTIONS = [
  { value: 'supervisor', label: 'Music Supervisor' },
  { value: 'artist', label: 'Artist' },
  { value: 'label', label: 'Label / Publisher' },
  { value: 'admin', label: 'Admin' },
]

export function AuthScreen({ onAuth }: AuthScreenProps) {
  const [mode, setMode] = useState<'signin' | 'signup'>('signin')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [fullName, setFullName] = useState('')
  const [role, setRole] = useState('supervisor')

  const switchMode = (m: 'signin' | 'signup') => {
    setMode(m)
    setError('')
  }

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const { data, error: authError } = await supabase.auth.signInWithPassword({ email, password })
      if (authError) throw authError
      if (!data.user) throw new Error('Sign in failed')

      const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', data.user.id)
        .maybeSingle()

      if (profile) {
        onAuth({ ...data.user, full_name: profile.full_name, role: profile.role })
      } else {
        await supabase.from('profiles').upsert({
          id: data.user.id,
          full_name: data.user.email?.split('@')[0] || 'User',
          role: 'supervisor',
          onboarding_complete: false,
          plan: 'free',
        })
        onAuth({ ...data.user, role: 'supervisor', full_name: data.user.email?.split('@')[0] || 'User' })
      }
    } catch (err: any) {
      setError(err.message || 'Failed to sign in')
    } finally {
      setLoading(false)
    }
  }

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const { data, error: signUpError } = await supabase.auth.signUp({
        email,
        password,
        options: { data: { full_name: fullName, role } },
      })
      if (signUpError) throw signUpError
      if (!data.user) throw new Error('Sign up failed')

      await supabase.from('profiles').upsert({
        id: data.user.id,
        full_name: fullName,
        role,
        onboarding_complete: false,
        plan: 'free',
      })

      const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({ email, password })
      if (signInError) throw signInError
      if (!signInData.user) throw new Error('Sign in after sign up failed')

      onAuth({ ...signInData.user, full_name: fullName, role })
    } catch (err: any) {
      setError(err.message || 'Failed to create account')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4" style={{ background: '#070709' }}>
      <div
        className="w-full max-w-[440px] rounded-2xl border p-8"
        style={{ background: '#0D0D12', borderColor: '#1E1E22' }}
      >
        <div className="text-center mb-8">
          <div
            className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-4"
            style={{ background: '#C8A97E18' }}
          >
            <Music2 className="w-7 h-7" style={{ color: '#C8A97E' }} />
          </div>
          <h1 className="text-2xl font-semibold tracking-widest text-[#E8E8E8]">SYNCHRONI</h1>
          <p className="text-sm mt-1" style={{ color: '#C8A97E' }}>Sync Intelligence</p>
        </div>

        <div className="flex gap-1 mb-6 p-1 rounded-xl" style={{ background: '#13131A' }}>
          {(['signin', 'signup'] as const).map(m => (
            <button
              key={m}
              onClick={() => switchMode(m)}
              className="flex-1 py-2 rounded-lg text-sm font-medium transition-all"
              style={
                mode === m
                  ? { background: '#C8A97E', color: '#0A0A0C' }
                  : { color: '#666' }
              }
            >
              {m === 'signin' ? 'Sign In' : 'Sign Up'}
            </button>
          ))}
        </div>

        {error && (
          <div className="mb-4 rounded-lg p-3" style={{ background: '#FF4D4D12', border: '1px solid #FF4D4D30' }}>
            <p className="text-sm" style={{ color: '#FF6B6B' }}>{error}</p>
          </div>
        )}

        <form onSubmit={mode === 'signin' ? handleSignIn : handleSignUp} className="space-y-4">
          {mode === 'signup' && (
            <>
              <Field label="Full Name">
                <input
                  type="text"
                  value={fullName}
                  onChange={e => setFullName(e.target.value)}
                  placeholder="Jane Smith"
                  required
                  className="auth-input"
                />
              </Field>
              <Field label="Role">
                <select
                  value={role}
                  onChange={e => setRole(e.target.value)}
                  className="auth-input"
                >
                  {ROLE_OPTIONS.map(o => (
                    <option key={o.value} value={o.value}>{o.label}</option>
                  ))}
                </select>
              </Field>
            </>
          )}

          <Field label="Email">
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="you@example.com"
              required
              className="auth-input"
            />
          </Field>

          <Field label="Password">
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="••••••••"
              required
              minLength={6}
              className="auth-input"
            />
          </Field>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 rounded-xl font-semibold text-sm transition-all flex items-center justify-center gap-2 mt-2"
            style={{
              background: '#C8A97E',
              color: '#0A0A0C',
              opacity: loading ? 0.75 : 1,
              cursor: loading ? 'not-allowed' : 'pointer',
            }}
          >
            {loading ? (
              <>
                <span className="w-4 h-4 border-2 border-[#0A0A0C] border-t-transparent rounded-full animate-spin" />
                {mode === 'signin' ? 'Signing in...' : 'Creating account...'}
              </>
            ) : (
              mode === 'signin' ? 'Sign In' : 'Create Account'
            )}
          </button>
        </form>

        <p className="text-center text-xs mt-5" style={{ color: '#444' }}>
          {mode === 'signin' ? "Don't have an account? " : 'Already have an account? '}
          <button
            onClick={() => switchMode(mode === 'signin' ? 'signup' : 'signin')}
            className="underline transition-colors"
            style={{ color: '#C8A97E' }}
          >
            {mode === 'signin' ? 'Sign up' : 'Sign in'}
          </button>
        </p>
      </div>

      <style>{`
        .auth-input {
          width: 100%;
          background: #0A0A10;
          border: 1px solid #2A2A35;
          border-radius: 10px;
          padding: 10px 14px;
          font-size: 14px;
          color: #E8E8E8;
          outline: none;
          transition: border-color 0.2s;
        }
        .auth-input::placeholder { color: #444; }
        .auth-input:focus { border-color: #C8A97E; }
        .auth-input option { background: #13131A; }
      `}</style>
    </div>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-xs font-medium" style={{ color: '#888' }}>{label}</label>
      {children}
    </div>
  )
}
