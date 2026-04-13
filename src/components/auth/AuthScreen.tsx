import { useState } from 'react'
import { supabase } from '../../lib/supabase'
import { Btn, Input, Select, Card } from '../shared/UI'
import { Music2, ArrowRight } from 'lucide-react'

interface AuthScreenProps {
  onAuth: (user: any) => void
}

export function AuthScreen({ onAuth }: AuthScreenProps) {
  const [mode, setMode] = useState<'signin' | 'signup'>('signin')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [existingEmailError, setExistingEmailError] = useState(false)

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [fullName, setFullName] = useState('')
  const [role, setRole] = useState<'supervisor' | 'artist' | 'label' | 'admin'>('supervisor')

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      const { data, error: authError } = await supabase.auth.signInWithPassword({ email, password })

      if (authError) {
        setError(authError.message || 'Failed to sign in')
        setLoading(false)
        return
      }
      if (!data.user) {
        setError('No authenticated user returned from sign in')
        setLoading(false)
        return
      }

      const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', data.user.id)
        .maybeSingle()

      onAuth({ ...data.user, role: profile?.role || 'supervisor', full_name: profile?.full_name || '' })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to sign in')
    } finally {
      setLoading(false)
    }
  }

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setExistingEmailError(false)
    setLoading(true)

    try {
      const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: { full_name: fullName, role }
        }
      })

      if (signUpError) {
        if (signUpError.message.includes('already registered') || signUpError.message.includes('already exists')) {
          setExistingEmailError(true)
          setError('An account with this email already exists.')
          setLoading(false)
          return
        }
        throw signUpError
      }
      if (!signUpData.user) throw new Error('Sign up failed')

      const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({ email, password })
      if (signInError) throw signInError
      if (!signInData.user) throw new Error('Sign in failed after sign up')

      const newProfile = {
        id: signInData.user.id,
        full_name: fullName || signInData.user.user_metadata?.full_name || '',
        role
      }

      const { data: createdProfile, error: createError } = await supabase
        .from('profiles')
        .insert(newProfile)
        .select()
        .single()

      if (createError) throw createError
      onAuth({ ...signInData.user, ...createdProfile })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to sign up')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-[#0A0A0C] flex items-center justify-center p-4">
      <Card className="w-full max-w-md p-8 bg-[#0D0D10]">
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-[#C8A97E]/10 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <Music2 className="w-8 h-8 text-[#C8A97E]" />
          </div>
          <h1 className="font-display text-3xl font-semibold text-[#E8E8E8] mb-2">SYNCHRONI</h1>
          <p className="text-[#666] text-sm">Sync Intelligence</p>
        </div>

        <div className="flex gap-2 mb-6">
          <button
            onClick={() => { setMode('signin'); setError(''); setExistingEmailError(false) }}
            className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors ${
              mode === 'signin' ? 'bg-[#C8A97E] text-[#0A0A0C]' : 'bg-[#1A1A1E] text-[#888] hover:text-[#E8E8E8]'
            }`}
          >
            Sign In
          </button>
          <button
            onClick={() => { setMode('signup'); setError(''); setExistingEmailError(false) }}
            className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors ${
              mode === 'signup' ? 'bg-[#C8A97E] text-[#0A0A0C]' : 'bg-[#1A1A1E] text-[#888] hover:text-[#E8E8E8]'
            }`}
          >
            Sign Up
          </button>
        </div>

        {error && (
          <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-3 mb-4">
            <p className="text-red-400 text-sm">{error}</p>
            {existingEmailError && (
              <button
                type="button"
                onClick={() => { setMode('signin'); setError(''); setExistingEmailError(false) }}
                className="mt-2 flex items-center gap-1 text-[#C8A97E] text-sm font-medium hover:text-[#D4B88A] transition-colors"
              >
                Sign in instead? <ArrowRight className="w-3 h-3" />
              </button>
            )}
          </div>
        )}

        <form onSubmit={mode === 'signin' ? handleSignIn : handleSignUp} className="space-y-4">
          {mode === 'signup' && (
            <>
              <Input
                label="Full Name"
                type="text"
                value={fullName}
                onChange={e => setFullName(e.target.value)}
                placeholder="John Doe"
                required
              />
              <Select label="Role" value={role} onChange={e => setRole(e.target.value as typeof role)}>
                <option value="supervisor">Client / Music Supervisor</option>
                <option value="artist">Creator / Rights Holder</option>
                <option value="label">Label</option>
                <option value="admin">Admin</option>
              </Select>
            </>
          )}

          <Input
            label="Email"
            type="email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            placeholder="you@example.com"
            required
          />

          <Input
            label="Password"
            type="password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            placeholder="********"
            required
            minLength={6}
          />

          <Btn type="submit" disabled={loading} className="w-full">
            {loading ? 'Loading...' : mode === 'signin' ? 'Sign In' : 'Create Account'}
          </Btn>
        </form>
      </Card>
    </div>
  )
}
