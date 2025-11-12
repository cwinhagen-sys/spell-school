'use client'

import { useState, useEffect } from 'react'

interface BadgeNotificationProps {
  badge: {
    id: string
    name: string
    description: string
    icon: string
    rarity: 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary'
  }
  onClose: () => void
  onFlyToGrid?: (badgeId: string) => void
  duration?: number
}

export default function BadgeNotification({ badge, onClose, onFlyToGrid, duration = 5000 }: BadgeNotificationProps) {
  const [isVisible, setIsVisible] = useState(false)
  const [isAnimating, setIsAnimating] = useState(false)

  const getRarityGradient = (rarity: string) => {
    switch (rarity) {
      case 'common': return 'from-slate-100 to-slate-200 border-slate-300'
      case 'uncommon': return 'from-green-100 to-emerald-200 border-green-300'
      case 'rare': return 'from-blue-100 to-cyan-200 border-blue-400'
      case 'epic': return 'from-purple-200 to-pink-200 border-purple-400'
      case 'legendary': return 'from-amber-200 via-yellow-200 to-orange-200 border-amber-400'
      default: return 'from-slate-100 to-slate-200 border-slate-300'
    }
  }

  const getRarityGlow = (rarity: string) => {
    switch (rarity) {
      case 'common': return 'shadow-slate-300/50'
      case 'uncommon': return 'shadow-green-300/60'
      case 'rare': return 'shadow-blue-400/60'
      case 'epic': return 'shadow-purple-400/60'
      case 'legendary': return 'shadow-amber-400/80'
      default: return 'shadow-slate-300/50'
    }
  }

  useEffect(() => {
    // Trigger entrance animation
    setIsVisible(true)
    setTimeout(() => setIsAnimating(true), 50)
    
    // Auto close after duration
    const timer = setTimeout(() => {
      handleClose()
    }, duration)

    return () => clearTimeout(timer)
  }, [duration])

  const handleClose = () => {
    setIsVisible(false)
    // Trigger fly-to-grid animation before closing
    if (onFlyToGrid) {
      setTimeout(() => {
        onFlyToGrid(badge.id)
        setTimeout(onClose, 800) // Wait for fly animation to complete
      }, 150)
    } else {
      setTimeout(onClose, 300)
    }
  }

  return (
    <div className="fixed top-4 right-4 z-50 pointer-events-none">
      {/* Compact horizontal notification */}
      <div 
        className={`bg-white rounded-xl border-2 border-gray-200 shadow-2xl transform transition-all duration-500 pointer-events-auto ${
          isVisible ? 'translate-x-0 opacity-100' : 'translate-x-full opacity-0'
        }`}
        style={{ minWidth: '320px', maxWidth: '420px' }}
      >
        <div className="flex items-center gap-4 p-4">
          {/* Badge Icon - same as badges page */}
          <div 
            className={`flex-shrink-0 w-16 h-16 rounded-xl bg-gradient-to-br ${getRarityGradient(badge.rarity)} border-4 border-white shadow-lg ${getRarityGlow(badge.rarity)} flex items-center justify-center transform transition-all duration-300 ${
              isAnimating ? 'scale-110 rotate-6' : 'scale-100'
            }`}
          >
            <span className="text-3xl">{badge.icon}</span>
          </div>

          {/* Badge Info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xs font-bold text-yellow-600 uppercase tracking-wide">Badge Earned!</span>
            </div>
            <h3 className="text-base font-bold text-gray-800 truncate mb-0.5">
              {badge.name}
            </h3>
            <p className="text-xs text-gray-500 truncate">
              {badge.description}
            </p>
          </div>

          {/* Close Button */}
          <button
            onClick={handleClose}
            className="flex-shrink-0 text-gray-400 hover:text-gray-600 transition-colors p-1"
            aria-label="Close"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Bottom accent bar - matches rarity gradient */}
        <div className={`h-1 rounded-b-xl ${
          badge.rarity === 'common' ? 'bg-gradient-to-r from-slate-200 to-slate-300' :
          badge.rarity === 'uncommon' ? 'bg-gradient-to-r from-green-200 to-emerald-300' :
          badge.rarity === 'rare' ? 'bg-gradient-to-r from-blue-300 to-cyan-400' :
          badge.rarity === 'epic' ? 'bg-gradient-to-r from-purple-300 to-pink-300' :
          'bg-gradient-to-r from-amber-300 via-yellow-300 to-orange-300'
        }`} />
      </div>
    </div>
  )
}
