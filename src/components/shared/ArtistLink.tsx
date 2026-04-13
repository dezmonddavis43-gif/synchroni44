import type { MouseEvent } from 'react'

interface ArtistLinkProps {
  artistName: string
  className?: string
  stopPropagation?: boolean
}

export function ArtistLink({ artistName, className = '', stopPropagation = true }: ArtistLinkProps) {
  const handleClick = (event: MouseEvent<HTMLAnchorElement>) => {
    if (stopPropagation) event.stopPropagation()
    event.preventDefault()
    const nextPath = `/artist/${encodeURIComponent(artistName)}`
    if (window.location.pathname !== nextPath) {
      window.history.pushState({}, '', nextPath)
      window.dispatchEvent(new Event('app:navigate'))
    }
  }

  return (
    <a
      href={`/artist/${encodeURIComponent(artistName)}`}
      onClick={handleClick}
      className={`transition-all hover:underline hover:decoration-[#C8A97E] ${className}`}
    >
      {artistName}
    </a>
  )
}
