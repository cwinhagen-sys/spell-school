'use client'

import { useEffect, useState } from 'react'
import { Trophy, Star, Sparkles } from 'lucide-react'

interface TrophyAnimationProps {
  badge: {
    id: string
    title: string
    description: string
    icon: string
    rarity: 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary'
  }
  onClose: () => void
}

export default function TrophyAnimation({ badge, onClose }: TrophyAnimationProps) {
  const [show, setShow] = useState(false)
  const [stars, setStars] = useState<Array<{ id: number; x: number; y: number; delay: number }>>([])

  useEffect(() => {
    setShow(true)
    
    // Generate random stars
    const newStars = Array.from({ length: 12 }, (_, i) => ({
      id: i,
      x: Math.random() * 100,
      y: Math.random() * 100,
      delay: Math.random() * 1000
    }))
    setStars(newStars)

    // Auto close after 4 seconds
    const timer = setTimeout(() => {
      setShow(false)
      setTimeout(onClose, 500) // Wait for animation to finish
    }, 4000)

    return () => clearTimeout(timer)
  }, [onClose])

  const getRarityColor = (rarity: string) => {
    const colors = {
      common: 'from-gray-400 to-gray-600',
      uncommon: 'from-green-400 to-green-600',
      rare: 'from-blue-400 to-blue-600',
      epic: 'from-purple-400 to-purple-600',
      legendary: 'from-yellow-400 to-yellow-600'
    }
    return colors[rarity as keyof typeof colors] || colors.common
  }

  const getRarityGlow = (rarity: string) => {
    const glows = {
      common: 'shadow-gray-500/50',
      uncommon: 'shadow-green-500/50',
      rare: 'shadow-blue-500/50',
      epic: 'shadow-purple-500/50',
      legendary: 'shadow-yellow-500/50'
    }
    return glows[rarity as keyof typeof glows] || glows.common
  }

  if (!show) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      {/* Animated background stars */}
      {stars.map((star) => (
        <div
          key={star.id}
          className="absolute animate-ping"
          style={{
            left: `${star.x}%`,
            top: `${star.y}%`,
            animationDelay: `${star.delay}ms`,
            animationDuration: '2s'
          }}
        >
          <Star className="w-4 h-4 text-yellow-400 opacity-80" />
        </div>
      ))}

      {/* Main trophy container */}
      <div className="relative">
        {/* Trophy glow effect */}
        <div className={`absolute inset-0 rounded-full blur-3xl bg-gradient-to-r ${getRarityColor(badge.rarity)} opacity-30 scale-150 animate-pulse`} />
        
        {/* Trophy card */}
        <div className={`relative bg-white rounded-3xl p-8 shadow-2xl ${getRarityGlow(badge.rarity)} transform transition-all duration-1000 ${
          show ? 'scale-100 opacity-100' : 'scale-50 opacity-0'
        }`}>
          {/* Sparkles around trophy */}
          <div className="absolute -top-2 -right-2 animate-spin">
            <Sparkles className="w-6 h-6 text-yellow-400" />
          </div>
          <div className="absolute -bottom-2 -left-2 animate-spin" style={{ animationDirection: 'reverse' }}>
            <Sparkles className="w-4 h-4 text-yellow-400" />
          </div>
          <div className="absolute top-4 -left-4 animate-bounce">
            <Star className="w-3 h-3 text-yellow-400" />
          </div>
          <div className="absolute -top-4 left-1/2 animate-bounce" style={{ animationDelay: '0.5s' }}>
            <Star className="w-2 h-2 text-yellow-400" />
          </div>

          {/* Trophy icon */}
          <div className="text-center mb-6">
            <div className={`w-24 h-24 mx-auto rounded-full bg-gradient-to-br ${getRarityColor(badge.rarity)} flex items-center justify-center text-4xl shadow-lg animate-bounce`}>
              {badge.icon}
            </div>
          </div>

          {/* Badge info */}
          <div className="text-center">
            <div className="text-2xl font-bold text-gray-800 mb-2 animate-pulse">
              🏆 Badge Earned! 🏆
            </div>
            <div className={`text-xl font-bold bg-gradient-to-r ${getRarityColor(badge.rarity)} bg-clip-text text-transparent mb-2`}>
              {badge.title}
            </div>
            <div className="text-sm text-gray-600 mb-4">
              {badge.description}
            </div>
            <div className={`text-xs px-3 py-1 rounded-full bg-gradient-to-r ${getRarityColor(badge.rarity)} text-white font-medium`}>
              {badge.rarity.toUpperCase()}
            </div>
          </div>

          {/* Close button */}
          <button
            onClick={() => {
              setShow(false)
              setTimeout(onClose, 500)
            }}
            className="absolute top-4 right-4 w-8 h-8 bg-gray-100 hover:bg-gray-200 rounded-full flex items-center justify-center transition-colors"
          >
            ×
          </button>
        </div>

        {/* Celebration particles */}
        <div className="absolute inset-0 pointer-events-none">
          {Array.from({ length: 8 }, (_, i) => (
            <div
              key={i}
              className="absolute w-2 h-2 bg-yellow-400 rounded-full animate-ping"
              style={{
                left: `${20 + i * 10}%`,
                top: `${30 + (i % 2) * 40}%`,
                animationDelay: `${i * 200}ms`,
                animationDuration: '1s'
              }}
            />
          ))}
        </div>
      </div>
    </div>
  )
}





