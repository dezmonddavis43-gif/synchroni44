import React from 'react'
import { MOOD_COLORS, CLEARANCE_CONFIG, ROLE_COLORS } from '../../lib/constants'

export function MoodPill({ mood, size = 'sm' }: { mood: string; size?: 'sm' | 'md' }) {
  const color = MOOD_COLORS[mood] || '#888'
  const sizeClasses = size === 'sm' ? 'px-2 py-0.5 text-xs' : 'px-3 py-1 text-sm'
  return (
    <span
      className={`inline-flex items-center rounded-full font-medium ${sizeClasses}`}
      style={{ backgroundColor: `${color}20`, color, border: `1px solid ${color}40` }}
    >
      {mood}
    </span>
  )
}

export function ClearanceBadge({ status }: { status: string }) {
  const config = CLEARANCE_CONFIG[status] || { label: status, color: '#888' }
  return (
    <span
      className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium"
      style={{ backgroundColor: `${config.color}20`, color: config.color }}
    >
      {config.label}
    </span>
  )
}

export function RoleBadge({ role }: { role: string }) {
  const color = ROLE_COLORS[role] || '#888'
  const labels: Record<string, string> = {
    supervisor: 'Client / Supervisor',
    artist: 'Creator / Rights Holder',
    label: 'Label',
    admin: 'Admin'
  }
  return (
    <span
      className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium"
      style={{ backgroundColor: `${color}20`, color }}
    >
      {labels[role] || role}
    </span>
  )
}

interface BtnProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'gold' | 'ghost' | 'danger' | 'dark'
  size?: 'sm' | 'md' | 'lg'
}

export function Btn({ children, variant = 'gold', size = 'md', className = '', ...props }: BtnProps) {
  const baseStyles = 'inline-flex items-center justify-center font-medium rounded-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed'
  const variants = {
    gold: 'bg-[#C8A97E] text-[#0A0A0C] hover:bg-[#D4B88A] active:bg-[#B89A6F]',
    ghost: 'bg-transparent text-[#E8E8E8] border border-[#333] hover:bg-[#1A1A1E] hover:border-[#444]',
    danger: 'bg-red-600/20 text-red-400 border border-red-600/30 hover:bg-red-600/30',
    dark: 'bg-[#1A1A1E] text-[#E8E8E8] border border-[#2A2A2E] hover:bg-[#222228]'
  }
  const sizes = {
    sm: 'px-3 py-1.5 text-xs gap-1.5',
    md: 'px-4 py-2 text-sm gap-2',
    lg: 'px-6 py-3 text-base gap-2'
  }
  return (
    <button className={`${baseStyles} ${variants[variant]} ${sizes[size]} ${className}`} {...props}>
      {children}
    </button>
  )
}

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string
  error?: string
}

export function Input({ label, error, className = '', ...props }: InputProps) {
  return (
    <div className="flex flex-col gap-1.5">
      {label && <label className="text-sm text-[#888]">{label}</label>}
      <input
        className={`w-full bg-[#0D0D10] border rounded-lg px-4 py-2.5 text-[#E8E8E8] placeholder-[#555] focus:outline-none transition-colors ${
          error ? 'border-[#FF4D4D]' : 'border-[#2A2A2E] focus:border-[#C8A97E]'
        } ${className}`}
        {...props}
      />
      {error && <p className="text-xs text-[#FF4D4D]">{error}</p>}
    </div>
  )
}

interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string
  children: React.ReactNode
}

export function Select({ label, children, className = '', ...props }: SelectProps) {
  return (
    <div className="flex flex-col gap-1.5">
      {label && <label className="text-sm text-[#888]">{label}</label>}
      <select
        className={`w-full bg-[#0D0D10] border border-[#2A2A2E] rounded-lg px-4 py-2.5 text-[#E8E8E8] focus:outline-none focus:border-[#C8A97E] transition-colors appearance-none cursor-pointer ${className}`}
        {...props}
      >
        {children}
      </select>
    </div>
  )
}

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode
  className?: string
  style?: React.CSSProperties
}

export function Card({ children, className = '', style, ...props }: CardProps) {
  return (
    <div className={`bg-[#13131A] border border-[#1E1E22] rounded-xl ${className}`} style={style} {...props}>
      {children}
    </div>
  )
}

export function PageTitle({ title, sub }: { title: string; sub?: string }) {
  return (
    <div className="mb-6">
      <h1 className="font-display text-2xl font-semibold text-[#E8E8E8]">{title}</h1>
      {sub && <p className="text-[#666] text-sm mt-1">{sub}</p>}
    </div>
  )
}

export function StatCard({ label, value, subtext, icon }: { label: string; value: string | number; subtext?: string; icon?: React.ReactNode }) {
  return (
    <Card className="p-4">
      <div className="flex items-center justify-between mb-1">
        <p className="text-[#666] text-xs uppercase tracking-wider">{label}</p>
        {icon && <div className="text-[#C8A97E]">{icon}</div>}
      </div>
      <p className="text-2xl font-semibold text-[#E8E8E8]">{value}</p>
      {subtext && <p className="text-[#555] text-xs mt-1">{subtext}</p>}
    </Card>
  )
}

export function StatusBadge({ status, variant = 'project' }: { status: string; variant?: 'project' | 'submission' | 'license' | 'track' }) {
  const colors: Record<string, Record<string, string>> = {
    project: { active: '#4DFFB4', completed: '#7B9CFF', on_hold: '#FFD700', cancelled: '#FF4D4D' },
    submission: { pending: '#FFD700', accepted: '#4DFFB4', passed: '#FF4D4D' },
    license: { pending: '#FFD700', in_review: '#7B9CFF', negotiating: '#FF6B9D', approved: '#4DFFB4', rejected: '#FF4D4D' },
    track: { active: '#4DFFB4', review: '#FFD700', rejected: '#FF4D4D', draft: '#888' }
  }
  const color = colors[variant]?.[status] || '#888'
  return (
    <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium capitalize" style={{ backgroundColor: `${color}20`, color }}>
      {status.replace(/_/g, ' ')}
    </span>
  )
}

interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string
}

export function Textarea({ label, className = '', ...props }: TextareaProps) {
  return (
    <div className="flex flex-col gap-1.5">
      {label && <label className="text-sm text-[#888]">{label}</label>}
      <textarea
        className={`w-full bg-[#0D0D10] border border-[#2A2A2E] rounded-lg px-4 py-2.5 text-[#E8E8E8] placeholder-[#555] focus:outline-none focus:border-[#C8A97E] transition-colors resize-none ${className}`}
        {...props}
      />
    </div>
  )
}

export function Tabs({ tabs, active, onChange }: { tabs: { id: string; label: string; count?: number }[]; active: string; onChange: (tab: string) => void }) {
  return (
    <div className="flex gap-1 bg-[#0D0D10] p-1 rounded-lg">
      {tabs.map(tab => (
        <button
          key={tab.id}
          onClick={() => onChange(tab.id)}
          className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
            active === tab.id ? 'bg-[#C8A97E] text-[#0A0A0C]' : 'text-[#888] hover:text-[#E8E8E8]'
          }`}
        >
          {tab.label}
          {tab.count !== undefined && (
            <span className={`ml-2 ${active === tab.id ? 'text-[#0A0A0C]/70' : 'text-[#555]'}`}>{tab.count}</span>
          )}
        </button>
      ))}
    </div>
  )
}

export function TabsUnderline({ tabs, active, onChange }: { tabs: { id: string; label: string; count?: number }[]; active: string; onChange: (tab: string) => void }) {
  return (
    <div className="flex border-b border-[#1E1E22]">
      {tabs.map(tab => (
        <button
          key={tab.id}
          onClick={() => onChange(tab.id)}
          className={`px-4 py-3 text-sm font-medium transition-all border-b-2 -mb-px ${
            active === tab.id ? 'text-[#C8A97E] border-[#C8A97E]' : 'text-[#888] border-transparent hover:text-[#E8E8E8]'
          }`}
        >
          {tab.label}
          {tab.count !== undefined && (
            <span className={`ml-2 px-1.5 py-0.5 rounded text-xs ${active === tab.id ? 'bg-[#C8A97E]/20' : 'bg-[#1A1A1E]'}`}>{tab.count}</span>
          )}
        </button>
      ))}
    </div>
  )
}

export function Spinner({ size = 'md' }: { size?: 'sm' | 'md' | 'lg' }) {
  const sizeClasses = { sm: 'w-4 h-4', md: 'w-6 h-6', lg: 'w-8 h-8' }
  return <div className={`${sizeClasses[size]} border-2 border-[#333] border-t-[#C8A97E] rounded-full animate-spin`} />
}

export function EmptyState({ icon, title, description, action }: { icon?: React.ReactNode; title: string; description?: string; action?: React.ReactNode }) {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-center">
      {icon && <div className="text-[#333] mb-4">{icon}</div>}
      <h3 className="text-[#888] font-medium mb-1">{title}</h3>
      {description && <p className="text-[#555] text-sm max-w-sm">{description}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  )
}

export function TrackArtwork({ track, size = 'md', className = '' }: { track: { title: string; mood?: string; artwork_color?: string; artwork_url?: string }; size?: 'sm' | 'md' | 'lg' | 'xl'; className?: string }) {
  const color = track.artwork_color || (track.mood ? MOOD_COLORS[track.mood] : '#C8A97E')
  const sizeClasses = { sm: 'w-8 h-8 text-xs', md: 'w-10 h-10 text-sm', lg: 'w-12 h-12 text-base', xl: 'w-16 h-16 text-lg' }
  const hasArtwork = track.artwork_url && track.artwork_url.trim() !== ''
  return (
    <div
      className={`rounded flex-shrink-0 flex items-center justify-center ${sizeClasses[size]} ${className}`}
      style={hasArtwork
        ? { backgroundImage: `url(${track.artwork_url})`, backgroundSize: 'cover', backgroundPosition: 'center' }
        : { background: `linear-gradient(135deg, ${color}60 0%, #1A1A1E 100%)` }
      }
    >
      {!hasArtwork && <span className="font-semibold text-white/80">{track.title.charAt(0).toUpperCase()}</span>}
    </div>
  )
}

export function Avatar({ name, url, size = 'md', className = '' }: { name: string; url?: string; size?: 'sm' | 'md' | 'lg'; className?: string }) {
  const sizeClasses = { sm: 'w-8 h-8 text-xs', md: 'w-10 h-10 text-sm', lg: 'w-12 h-12 text-base' }
  const initials = name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
  if (url) return <img src={url} alt={name} className={`rounded-full object-cover ${sizeClasses[size]} ${className}`} />
  return (
    <div className={`rounded-full bg-[#C8A97E]/20 text-[#C8A97E] flex items-center justify-center font-medium ${sizeClasses[size]} ${className}`}>
      {initials}
    </div>
  )
}

export function Modal({ isOpen, onClose, title, children, size = 'md' }: { isOpen: boolean; onClose: () => void; title?: string; children: React.ReactNode; size?: 'sm' | 'md' | 'lg' | 'xl' | 'full' }) {
  if (!isOpen) return null
  const sizeClasses = { sm: 'max-w-md', md: 'max-w-lg', lg: 'max-w-2xl', xl: 'max-w-4xl', full: 'max-w-6xl' }
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className={`relative w-full ${sizeClasses[size]} bg-[#13131A] border border-[#1E1E22] rounded-2xl shadow-2xl max-h-[90vh] overflow-hidden animate-fade-in`}>
        {title && (
          <div className="flex items-center justify-between px-6 py-4 border-b border-[#1E1E22]">
            <h2 className="text-lg font-semibold text-[#E8E8E8] font-display">{title}</h2>
            <button onClick={onClose} className="p-1 text-[#666] hover:text-[#E8E8E8] transition-colors">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        )}
        <div className="overflow-y-auto max-h-[calc(90vh-80px)]">{children}</div>
      </div>
    </div>
  )
}

export function Tooltip({ children, text }: { children: React.ReactNode; text: string }) {
  return (
    <div className="relative group">
      {children}
      <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 bg-[#1A1A1E] border border-[#2A2A2E] rounded text-xs text-[#E8E8E8] whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50">
        {text}
      </div>
    </div>
  )
}
