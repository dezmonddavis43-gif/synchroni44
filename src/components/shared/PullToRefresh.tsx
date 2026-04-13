import { usePullToRefresh } from '../../hooks/usePullToRefresh'

interface PullToRefreshProps {
  onRefresh: () => Promise<void>
  children: React.ReactNode
  className?: string
}

export function PullToRefresh({ onRefresh, children, className = '' }: PullToRefreshProps) {
  const { pullDistance, isRefreshing, handlers } = usePullToRefresh({
    onRefresh,
    threshold: 60,
    maxPull: 120
  })

  return (
    <div
      className={`relative ${className}`}
      style={{ overscrollBehavior: 'none' }}
      {...handlers}
    >
      <div
        className="absolute left-1/2 -translate-x-1/2 flex items-center justify-center transition-opacity md:hidden"
        style={{
          top: Math.max(0, pullDistance - 40),
          opacity: pullDistance > 20 ? 1 : 0,
          zIndex: 10
        }}
      >
        <div
          className={`w-8 h-8 border-2 border-[#333] border-t-[#C8A97E] rounded-full ${
            isRefreshing ? 'animate-spin' : ''
          }`}
          style={{
            transform: isRefreshing ? 'none' : `rotate(${pullDistance * 3}deg)`
          }}
        />
      </div>

      <div
        style={{
          transform: pullDistance > 0 ? `translateY(${pullDistance}px)` : 'none',
          transition: pullDistance === 0 ? 'transform 0.3s ease-out' : 'none'
        }}
      >
        {children}
      </div>
    </div>
  )
}
