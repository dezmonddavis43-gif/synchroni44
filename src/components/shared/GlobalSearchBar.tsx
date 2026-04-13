import { useState, useEffect, useCallback, useRef } from 'react'
import { Search, X } from 'lucide-react'

interface GlobalSearchBarProps {
  onSearch: (query: string) => void
  resultCount?: number
  placeholder?: string
}

export function GlobalSearchBar({ onSearch, resultCount, placeholder }: GlobalSearchBarProps) {
  const [query, setQuery] = useState('')
  const [isSearching, setIsSearching] = useState(false)
  const debounceRef = useRef<NodeJS.Timeout | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const debouncedSearch = useCallback((value: string) => {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current)
    }

    setIsSearching(value.length > 0)

    debounceRef.current = setTimeout(() => {
      onSearch(value)
      setIsSearching(false)
    }, 300)
  }, [onSearch])

  useEffect(() => {
    debouncedSearch(query)
    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current)
      }
    }
  }, [query, debouncedSearch])

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setQuery('')
        inputRef.current?.blur()
      }
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        inputRef.current?.focus()
      }
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [])

  const handleClear = () => {
    setQuery('')
    inputRef.current?.focus()
  }

  return (
    <div className="w-full">
      <div className="relative">
        <div
          className={`absolute left-4 top-1/2 -translate-y-1/2 transition-colors ${
            isSearching ? 'text-[#C8A97E] animate-pulse' : 'text-[#666]'
          }`}
        >
          <Search className="w-5 h-5" />
        </div>
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={e => setQuery(e.target.value)}
          placeholder={placeholder || "Search tracks, artists, moods, genres, tags..."}
          className="w-full h-12 bg-[#16161A] border border-[#2a2a2a] rounded-[10px] pl-12 pr-20 text-[#E8E8E8] placeholder-[#555] focus:outline-none focus:border-[#C8A97E] transition-colors text-sm"
        />
        <div className="absolute right-4 top-1/2 -translate-y-1/2 flex items-center gap-2">
          {query && (
            <button
              onClick={handleClear}
              className="p-1 text-[#666] hover:text-[#E8E8E8] transition-colors touch-manipulation"
            >
              <X className="w-4 h-4" />
            </button>
          )}
          {resultCount !== undefined && query && (
            <span className="text-xs text-[#888] whitespace-nowrap">
              {resultCount} tracks
            </span>
          )}
        </div>
      </div>
    </div>
  )
}
