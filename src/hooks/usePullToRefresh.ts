import { useState, useRef, useCallback, useEffect } from 'react'

interface UsePullToRefreshOptions {
  onRefresh: () => Promise<void>
  threshold?: number
  maxPull?: number
}

interface UsePullToRefreshReturn {
  pullDistance: number
  isRefreshing: boolean
  handlers: {
    onTouchStart: (e: React.TouchEvent) => void
    onTouchMove: (e: React.TouchEvent) => void
    onTouchEnd: () => void
  }
}

export function usePullToRefresh({
  onRefresh,
  threshold = 60,
  maxPull = 120
}: UsePullToRefreshOptions): UsePullToRefreshReturn {
  const [pullDistance, setPullDistance] = useState(0)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const startY = useRef(0)
  const currentY = useRef(0)
  const isPulling = useRef(false)
  const containerScrollTop = useRef(0)

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    const target = e.currentTarget as HTMLElement
    containerScrollTop.current = target.scrollTop

    if (containerScrollTop.current <= 0 && !isRefreshing) {
      startY.current = e.touches[0].clientY
      isPulling.current = true
    }
  }, [isRefreshing])

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (!isPulling.current || isRefreshing) return

    currentY.current = e.touches[0].clientY
    const diff = currentY.current - startY.current

    if (diff > 0 && containerScrollTop.current <= 0) {
      const resistance = 0.5
      const newDistance = Math.min(diff * resistance, maxPull)
      setPullDistance(newDistance)
    }
  }, [isRefreshing, maxPull])

  const handleTouchEnd = useCallback(async () => {
    if (!isPulling.current) return
    isPulling.current = false

    if (pullDistance >= threshold && !isRefreshing) {
      setIsRefreshing(true)
      setPullDistance(threshold)

      try {
        await onRefresh()
      } finally {
        setIsRefreshing(false)
        setPullDistance(0)
      }
    } else {
      setPullDistance(0)
    }
  }, [pullDistance, threshold, isRefreshing, onRefresh])

  useEffect(() => {
    if (!isRefreshing) {
      setPullDistance(0)
    }
  }, [isRefreshing])

  return {
    pullDistance,
    isRefreshing,
    handlers: {
      onTouchStart: handleTouchStart,
      onTouchMove: handleTouchMove,
      onTouchEnd: handleTouchEnd
    }
  }
}
