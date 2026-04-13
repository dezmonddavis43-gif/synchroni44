import { useRef, useState } from 'react'

interface ResizeHandleProps {
  onDrag: (deltaY: number) => void
}

export function ResizeHandle({ onDrag }: ResizeHandleProps) {
  const [hovered, setHovered] = useState(false)
  const [dragging, setDragging] = useState(false)
  const lastY = useRef(0)

  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault()
    setDragging(true)
    lastY.current = e.clientY

    const onMove = (ev: MouseEvent) => {
      const delta = ev.clientY - lastY.current
      lastY.current = ev.clientY
      onDrag(delta)
    }

    const onUp = () => {
      setDragging(false)
      document.removeEventListener('mousemove', onMove)
      document.removeEventListener('mouseup', onUp)
    }

    document.addEventListener('mousemove', onMove)
    document.addEventListener('mouseup', onUp)
  }

  const isActive = hovered || dragging

  return (
    <div
      className="flex-shrink-0 flex items-center justify-center select-none"
      style={{
        height: 6,
        background: isActive ? '#16161E' : '#0A0A0E',
        cursor: 'ns-resize',
        transition: 'background 0.15s',
      }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onMouseDown={handleMouseDown}
    >
      <div className="flex gap-1">
        {[0,1,2,3,4].map(i => (
          <div
            key={i}
            style={{
              width: 3,
              height: 3,
              borderRadius: '50%',
              background: isActive ? '#C8A97E' : '#333',
              transition: 'background 0.15s',
            }}
          />
        ))}
      </div>
    </div>
  )
}
