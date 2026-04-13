import { useState } from 'react'

interface HorizontalResizeHandleProps {
  onMouseDown: (e: React.MouseEvent) => void
}

interface VerticalResizeHandleProps {
  onMouseDown: (e: React.MouseEvent) => void
}

function DotRow({ count = 5, gold }: { count?: number; gold: boolean }) {
  return (
    <div className="flex gap-[3px]">
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          style={{
            width: 3,
            height: 3,
            borderRadius: '50%',
            background: gold ? '#C8A97E' : '#333',
            transition: 'background 0.15s',
          }}
        />
      ))}
    </div>
  )
}

function DotCol({ count = 5, gold }: { count?: number; gold: boolean }) {
  return (
    <div className="flex flex-col gap-[3px]">
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          style={{
            width: 3,
            height: 3,
            borderRadius: '50%',
            background: gold ? '#C8A97E' : '#333',
            transition: 'background 0.15s',
          }}
        />
      ))}
    </div>
  )
}

export function HorizontalResizeHandle({ onMouseDown }: HorizontalResizeHandleProps) {
  const [hovered, setHovered] = useState(false)

  return (
    <div
      style={{
        height: 6,
        flexShrink: 0,
        background: hovered ? '#16161E' : '#0A0A0E',
        cursor: 'ns-resize',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        transition: 'background 0.15s',
        userSelect: 'none',
      }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onMouseDown={onMouseDown}
    >
      <DotRow gold={hovered} />
    </div>
  )
}

export function VerticalResizeHandle({ onMouseDown }: VerticalResizeHandleProps) {
  const [hovered, setHovered] = useState(false)

  return (
    <div
      style={{
        width: 6,
        flexShrink: 0,
        background: hovered ? '#16161E' : '#0A0A0E',
        cursor: 'ew-resize',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        transition: 'background 0.15s',
        userSelect: 'none',
      }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onMouseDown={onMouseDown}
    >
      <DotCol gold={hovered} />
    </div>
  )
}
