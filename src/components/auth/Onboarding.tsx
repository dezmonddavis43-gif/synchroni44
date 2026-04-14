import { useState } from 'react'
import { ChevronRight, ChevronLeft, Check, User, Briefcase, Music, Building2 } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { GENRES } from '../../lib/constants'
import type { Profile } from '../../lib/types'

interface OnboardingProps {
  profile: Profile
  onComplete: (updatedProfile: Profile) => void
}

const PROJECT_TYPES = ['TV Drama', 'TV Comedy', 'Film', 'Advertising', 'Gaming', 'Documentary', 'Podcast', 'Web Series']
const LABEL_TYPES = ['Major', 'Independent', 'Boutique', 'DIY/Self']

const SUPERVISOR_PLANS = [
  { id: 'basic', name: 'Basic', price: 19, features: ['Search catalog', '10 playlists', 'Basic analytics'] },
  { id: 'professional', name: 'Professional', price: 199, features: ['Unlimited playlists', 'Priority support', 'Team collaboration', 'Advanced analytics'] },
  { id: 'studio', name: 'Studio', price: 399, features: ['Everything in Pro', 'Dedicated account manager', 'Custom integrations', 'White-label exports'] },
]

const ARTIST_PLANS = [
  { id: 'starter', name: 'Starter', price: 9.99, features: ['Upload 20 tracks', 'Basic analytics', 'Profile page'] },
  { id: 'pro', name: 'Pro', price: 19.99, features: ['Unlimited uploads', 'AI pitch tool', 'Priority placement', 'Detailed analytics'] },
  { id: 'elite', name: 'Elite', price: 39.99, features: ['Everything in Pro', 'Curator outreach', 'Stems support', 'Dedicated support'] },
]

const LABEL_PLANS = [
  { id: 'indie', name: 'Indie', price: 299, features: ['Manage 10 artists', 'Basic pitch tracker', 'Team accounts'] },
  { id: 'mid', name: 'Mid-Size', price: 799, features: ['Manage 50 artists', 'Advanced analytics', 'Priority placement', 'API access'] },
  { id: 'enterprise', name: 'Enterprise', price: 0, features: ['Unlimited artists', 'Custom integrations', 'Dedicated support', 'White-label options'] },
]

export function Onboarding({ profile, onComplete }: OnboardingProps) {
  const [step, setStep] = useState(1)
  const [saving, setSaving] = useState(false)
  const [formData, setFormData] = useState({
    full_name: profile.full_name,
    company: profile.company || '',
    location: '',
    bio: '',
    website: '',
    artist_name: '',
    publisher: '',
    project_types: [] as string[],
    genre_specialties: [] as string[],
    label_name: '',
    label_type: '',
    roster_size: '',
    social_links: {
      spotify: '',
      soundcloud: '',
      apple_music: ''
    },
    plan: 'free'
  })

  const totalSteps = 4

  const toggleArrayItem = (arr: string[], item: string) => {
    return arr.includes(item) ? arr.filter(i => i !== item) : [...arr, item]
  }

  const handleNext = async () => {
    if (step < totalSteps) {
      setStep(step + 1)
    } else {
      await saveAndComplete()
    }
  }

  const saveAndComplete = async () => {
    setSaving(true)
    const { error } = await supabase
      .from('profiles')
      .update({
        full_name: formData.full_name,
        company: formData.company || null,
        location: formData.location || null,
        website: formData.website || null,
        publisher: formData.publisher || null,
        project_types: formData.project_types.length > 0 ? formData.project_types : null,
        genre_specialties: formData.genre_specialties.length > 0 ? formData.genre_specialties : null,
        artist_name: formData.artist_name || null,
        label_name: formData.label_name || null,
        label_type: formData.label_type || null,
        roster_size: formData.roster_size || null,
        social_links: Object.keys(formData.social_links).some(k => formData.social_links[k as keyof typeof formData.social_links]) ? formData.social_links : null,
        plan: formData.plan,
        onboarding_complete: true
      })
      .eq('id', profile.id)

    if (!error) {
      onComplete({
        ...profile,
        ...formData,
        onboarding_complete: true
      })
    }
    setSaving(false)
  }

  const getPlans = () => {
    switch (profile.role) {
      case 'supervisor': return SUPERVISOR_PLANS
      case 'artist': return ARTIST_PLANS
      case 'label': return LABEL_PLANS
      default: return SUPERVISOR_PLANS
    }
  }

  const getRoleIcon = () => {
    switch (profile.role) {
      case 'supervisor': return <Briefcase className="w-6 h-6" />
      case 'artist': return <Music className="w-6 h-6" />
      case 'label': return <Building2 className="w-6 h-6" />
      default: return <User className="w-6 h-6" />
    }
  }

  const getRoleDefaultTab = () => {
    switch (profile.role) {
      case 'supervisor': return 'Search'
      case 'artist': return 'My Catalog'
      case 'label': return 'Catalog Search'
      default: return 'Search'
    }
  }

  return (
    <div className="min-h-screen bg-[#0A0A0C] flex items-center justify-center p-4">
      <div className="w-full max-w-2xl">
        <div className="flex items-center justify-center gap-2 mb-8">
          {[1, 2, 3, 4].map(s => (
            <div
              key={s}
              className={`h-1 rounded-full transition-all ${
                s === step ? 'w-8 bg-[#C8A97E]' : s < step ? 'w-4 bg-[#C8A97E]/60' : 'w-4 bg-[#2A2A2E]'
              }`}
            />
          ))}
        </div>

        <div className="bg-[#13131A] border border-[#1E1E22] rounded-2xl p-6 md:p-8">
          {step === 1 && (
            <div className="text-center">
              <div className="w-16 h-16 rounded-full bg-[#C8A97E]/20 flex items-center justify-center mx-auto mb-6 text-[#C8A97E]">
                {getRoleIcon()}
              </div>
              <h1 className="font-['Playfair_Display'] text-2xl md:text-3xl text-white font-semibold mb-2">
                Welcome to Synchroni, {profile.full_name.split(' ')[0]}!
              </h1>
              <p className="text-[#888] mb-8 max-w-md mx-auto">
                {profile.role === 'supervisor' && "Discover and license music for your projects. Search our curated catalog, create playlists, and manage your sync licensing workflow."}
                {profile.role === 'artist' && "Get your music placed in TV, film, and advertising. Upload your catalog, receive briefs, and track your earnings all in one place."}
                {profile.role === 'label' && "Manage your roster, track pitches, and streamline your sync licensing operations with powerful tools built for music supervisors and labels."}
                {profile.role === 'admin' && "Full access to manage the platform, users, and content."}
              </p>
              <button
                onClick={handleNext}
                className="px-8 py-3 bg-[#C8A97E] text-[#0A0A0C] rounded-xl font-medium hover:bg-[#D4B88A] transition-colors flex items-center gap-2 mx-auto"
              >
                Let's set up your profile
                <ChevronRight className="w-5 h-5" />
              </button>
            </div>
          )}

          {step === 2 && (
            <div>
              <h2 className="font-['Playfair_Display'] text-xl text-white font-semibold mb-6">Profile Details</h2>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm text-[#888] mb-1.5">Full Name</label>
                  <input
                    type="text"
                    value={formData.full_name}
                    onChange={e => setFormData({ ...formData, full_name: e.target.value })}
                    className="w-full bg-[#0A0A0C] border border-[#2A2A2E] rounded-xl px-4 py-3 text-[#E8E8E8] focus:outline-none focus:border-[#C8A97E]"
                  />
                </div>

                <div>
                  <label className="block text-sm text-[#888] mb-1.5">
                    {profile.role === 'label' ? 'Label Name' : 'Company / Organization'}
                  </label>
                  <input
                    type="text"
                    value={profile.role === 'label' ? formData.label_name : formData.company}
                    onChange={e => setFormData(profile.role === 'label'
                      ? { ...formData, label_name: e.target.value }
                      : { ...formData, company: e.target.value }
                    )}
                    className="w-full bg-[#0A0A0C] border border-[#2A2A2E] rounded-xl px-4 py-3 text-[#E8E8E8] focus:outline-none focus:border-[#C8A97E]"
                  />
                </div>

                {profile.role === 'artist' && (
                  <div>
                    <label className="block text-sm text-[#888] mb-1.5">Artist / Stage Name</label>
                    <input
                      type="text"
                      value={formData.artist_name}
                      onChange={e => setFormData({ ...formData, artist_name: e.target.value })}
                      className="w-full bg-[#0A0A0C] border border-[#2A2A2E] rounded-xl px-4 py-3 text-[#E8E8E8] focus:outline-none focus:border-[#C8A97E]"
                    />
                  </div>
                )}

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm text-[#888] mb-1.5">Location</label>
                    <input
                      type="text"
                      value={formData.location}
                      onChange={e => setFormData({ ...formData, location: e.target.value })}
                      placeholder="City, Country"
                      className="w-full bg-[#0A0A0C] border border-[#2A2A2E] rounded-xl px-4 py-3 text-[#E8E8E8] placeholder-[#555] focus:outline-none focus:border-[#C8A97E]"
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-[#888] mb-1.5">Website</label>
                    <input
                      type="url"
                      value={formData.website}
                      onChange={e => setFormData({ ...formData, website: e.target.value })}
                      placeholder="https://"
                      className="w-full bg-[#0A0A0C] border border-[#2A2A2E] rounded-xl px-4 py-3 text-[#E8E8E8] placeholder-[#555] focus:outline-none focus:border-[#C8A97E]"
                    />
                  </div>
                </div>

                {profile.role === 'supervisor' && (
                  <>
                    <div>
                      <label className="block text-sm text-[#888] mb-2">Project Types</label>
                      <div className="flex flex-wrap gap-2">
                        {PROJECT_TYPES.map(type => (
                          <button
                            key={type}
                            onClick={() => setFormData({ ...formData, project_types: toggleArrayItem(formData.project_types, type) })}
                            className={`px-3 py-1.5 rounded-lg text-sm transition-colors ${
                              formData.project_types.includes(type)
                                ? 'bg-[#C8A97E] text-[#0A0A0C]'
                                : 'bg-[#1A1A1E] text-[#888] hover:text-[#E8E8E8]'
                            }`}
                          >
                            {type}
                          </button>
                        ))}
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm text-[#888] mb-2">Preferred Genres</label>
                      <div className="flex flex-wrap gap-2 max-h-32 overflow-y-auto">
                        {GENRES.filter(g => g !== 'All').map(genre => (
                          <button
                            key={genre}
                            onClick={() => setFormData({ ...formData, genre_specialties: toggleArrayItem(formData.genre_specialties, genre) })}
                            className={`px-3 py-1.5 rounded-lg text-sm transition-colors ${
                              formData.genre_specialties.includes(genre)
                                ? 'bg-[#C8A97E] text-[#0A0A0C]'
                                : 'bg-[#1A1A1E] text-[#888] hover:text-[#E8E8E8]'
                            }`}
                          >
                            {genre}
                          </button>
                        ))}
                      </div>
                    </div>
                  </>
                )}

                {profile.role === 'artist' && (
                  <>
                    <div>
                      <label className="block text-sm text-[#888] mb-1.5">Publisher (optional)</label>
                      <input
                        type="text"
                        value={formData.publisher}
                        onChange={e => setFormData({ ...formData, publisher: e.target.value })}
                        className="w-full bg-[#0A0A0C] border border-[#2A2A2E] rounded-xl px-4 py-3 text-[#E8E8E8] focus:outline-none focus:border-[#C8A97E]"
                      />
                    </div>
                    <div>
                      <label className="block text-sm text-[#888] mb-2">Genre Specialties</label>
                      <div className="flex flex-wrap gap-2 max-h-32 overflow-y-auto">
                        {GENRES.filter(g => g !== 'All').map(genre => (
                          <button
                            key={genre}
                            onClick={() => setFormData({ ...formData, genre_specialties: toggleArrayItem(formData.genre_specialties, genre) })}
                            className={`px-3 py-1.5 rounded-lg text-sm transition-colors ${
                              formData.genre_specialties.includes(genre)
                                ? 'bg-[#C8A97E] text-[#0A0A0C]'
                                : 'bg-[#1A1A1E] text-[#888] hover:text-[#E8E8E8]'
                            }`}
                          >
                            {genre}
                          </button>
                        ))}
                      </div>
                    </div>
                  </>
                )}

                {profile.role === 'label' && (
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm text-[#888] mb-1.5">Label Type</label>
                      <select
                        value={formData.label_type}
                        onChange={e => setFormData({ ...formData, label_type: e.target.value })}
                        className="w-full bg-[#0A0A0C] border border-[#2A2A2E] rounded-xl px-4 py-3 text-[#E8E8E8] focus:outline-none focus:border-[#C8A97E]"
                      >
                        <option value="">Select Type</option>
                        {LABEL_TYPES.map(type => (
                          <option key={type} value={type}>{type}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm text-[#888] mb-1.5">Roster Size</label>
                      <select
                        value={formData.roster_size}
                        onChange={e => setFormData({ ...formData, roster_size: e.target.value })}
                        className="w-full bg-[#0A0A0C] border border-[#2A2A2E] rounded-xl px-4 py-3 text-[#E8E8E8] focus:outline-none focus:border-[#C8A97E]"
                      >
                        <option value="">Select Size</option>
                        <option value="1-10">1-10 artists</option>
                        <option value="11-50">11-50 artists</option>
                        <option value="51-200">51-200 artists</option>
                        <option value="200+">200+ artists</option>
                      </select>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {step === 3 && (
            <div>
              <h2 className="font-['Playfair_Display'] text-xl text-white font-semibold mb-2">Choose Your Plan</h2>
              <p className="text-sm text-[#888] mb-6">Start with a free trial. Cancel anytime.</p>
              <div className="grid md:grid-cols-3 gap-4">
                {getPlans().map((plan) => (
                  <button
                    key={plan.id}
                    onClick={() => setFormData({ ...formData, plan: plan.id })}
                    className={`p-4 rounded-xl border text-left transition-all ${
                      formData.plan === plan.id
                        ? 'border-[#C8A97E] bg-[#C8A97E]/10'
                        : 'border-[#2A2A2E] hover:border-[#3A3A3E]'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="text-base font-semibold text-[#E8E8E8]">{plan.name}</h3>
                      {formData.plan === plan.id && (
                        <Check className="w-4 h-4 text-[#C8A97E]" />
                      )}
                    </div>
                    <p className="text-xl font-bold text-[#C8A97E] mb-3">
                      {plan.price === 0 ? 'Contact Us' : `$${plan.price}/mo`}
                    </p>
                    <ul className="space-y-1">
                      {plan.features.map(feature => (
                        <li key={feature} className="text-xs text-[#888] flex items-start gap-1.5">
                          <Check className="w-3 h-3 text-[#4DFFB4] mt-0.5 flex-shrink-0" />
                          {feature}
                        </li>
                      ))}
                    </ul>
                  </button>
                ))}
              </div>
            </div>
          )}

          {step === 4 && (
            <div className="text-center">
              <div className="w-16 h-16 rounded-full bg-[#4DFFB4]/20 flex items-center justify-center mx-auto mb-6">
                <Check className="w-8 h-8 text-[#4DFFB4]" />
              </div>
              <h2 className="font-['Playfair_Display'] text-2xl text-white font-semibold mb-2">
                You're all set!
              </h2>
              <p className="text-[#888] mb-6 max-w-md mx-auto">
                Your profile is ready. Here are a few quick tips to get started:
              </p>
              <div className="bg-[#16161A] rounded-xl p-4 mb-6 text-left max-w-md mx-auto">
                <ul className="space-y-3 text-sm">
                  {profile.role === 'supervisor' && (
                    <>
                      <li className="flex items-start gap-3 text-[#E8E8E8]">
                        <span className="text-[#C8A97E]">1.</span>
                        Use the global search to find tracks by mood, genre, or BPM
                      </li>
                      <li className="flex items-start gap-3 text-[#E8E8E8]">
                        <span className="text-[#C8A97E]">2.</span>
                        Create playlists for your projects and share them with your team
                      </li>
                      <li className="flex items-start gap-3 text-[#E8E8E8]">
                        <span className="text-[#C8A97E]">3.</span>
                        Post briefs to receive submissions from artists
                      </li>
                    </>
                  )}
                  {profile.role === 'artist' && (
                    <>
                      <li className="flex items-start gap-3 text-[#E8E8E8]">
                        <span className="text-[#C8A97E]">1.</span>
                        Upload your tracks with detailed metadata for better discoverability
                      </li>
                      <li className="flex items-start gap-3 text-[#E8E8E8]">
                        <span className="text-[#C8A97E]">2.</span>
                        Check Opportunities for open briefs and submission requests
                      </li>
                      <li className="flex items-start gap-3 text-[#E8E8E8]">
                        <span className="text-[#C8A97E]">3.</span>
                        Use the AI Pitch Tool to find the best tracks for each brief
                      </li>
                    </>
                  )}
                  {profile.role === 'label' && (
                    <>
                      <li className="flex items-start gap-3 text-[#E8E8E8]">
                        <span className="text-[#C8A97E]">1.</span>
                        Add artists to your roster and manage their catalogs
                      </li>
                      <li className="flex items-start gap-3 text-[#E8E8E8]">
                        <span className="text-[#C8A97E]">2.</span>
                        Track all pitches and licensing activity in one dashboard
                      </li>
                      <li className="flex items-start gap-3 text-[#E8E8E8]">
                        <span className="text-[#C8A97E]">3.</span>
                        Upload tracks on behalf of your artists
                      </li>
                    </>
                  )}
                </ul>
              </div>
            </div>
          )}

          <div className="flex items-center justify-between mt-8 pt-6 border-t border-[#1E1E22]">
            {step > 1 ? (
              <button
                onClick={() => setStep(step - 1)}
                className="flex items-center gap-2 text-[#888] hover:text-[#E8E8E8] transition-colors"
              >
                <ChevronLeft className="w-4 h-4" />
                Back
              </button>
            ) : (
              <div />
            )}
            <button
              onClick={handleNext}
              disabled={saving}
              className="px-6 py-2.5 bg-[#C8A97E] text-[#0A0A0C] rounded-xl font-medium hover:bg-[#D4B88A] transition-colors flex items-center gap-2 disabled:opacity-50"
            >
              {saving ? 'Saving...' : step === totalSteps ? `Go to ${getRoleDefaultTab()}` : 'Continue'}
              {!saving && <ChevronRight className="w-4 h-4" />}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
