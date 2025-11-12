'use client'

import { useState, useEffect, useRef } from 'react'

interface BadgeFlyAnimationProps {
  badgeId: string | null
  onAnimationComplete: () => void
}

export default function BadgeFlyAnimation({ badgeId, onAnimationComplete }: BadgeFlyAnimationProps) {
  const [isAnimating, setIsAnimating] = useState(false)
  const badgeRef = useRef<HTMLDivElement>(null)
  const [badgeData, setBadgeData] = useState<any>(null)

  useEffect(() => {
    if (!badgeId) return

    // Get badge data from localStorage or state
    const getBadgeData = () => {
      try {
        const cachedBadges = localStorage.getItem('daily_quest_badges')
        if (cachedBadges) {
          const badges = JSON.parse(cachedBadges)
          const badge = badges.find((b: any) => b.id === badgeId || b.id === `temp-${badgeId}`)
          if (badge) {
            setBadgeData(badge)
            return badge
          }
        }
        
        // Fallback badge data
        return {
          id: badgeId,
          name: 'Quest Badge',
          description: 'Badge for completing quest',
          icon: '🏆',
          rarity: 'common'
        }
      } catch (error) {
        console.error('Error getting badge data:', error)
        return {
          id: badgeId,
          name: 'Quest Badge',
          description: 'Badge for completing quest',
          icon: '🏆',
          rarity: 'common'
        }
      }
    }

    const badge = getBadgeData()
    setBadgeData(badge)
    setIsAnimating(true)

    // Calculate animation path (from center of screen to dashboard grid)
    const startX = window.innerWidth / 2
    const startY = window.innerHeight / 2
    const endX = window.innerWidth - 300 // Approximate dashboard grid position (right side)
    const endY = Math.min(400, window.innerHeight * 0.4) // Approximate dashboard grid position

    if (badgeRef.current) {
      badgeRef.current.style.left = `${startX}px`
      badgeRef.current.style.top = `${startY}px`
      badgeRef.current.style.transform = 'scale(1)'
    }

    // Start fly animation with bounce effect
    setTimeout(() => {
      if (badgeRef.current) {
        badgeRef.current.style.transition = 'all 1000ms cubic-bezier(0.175, 0.885, 0.32, 1.275)'
        badgeRef.current.style.left = `${endX}px`
        badgeRef.current.style.top = `${endY}px`
        badgeRef.current.style.transform = 'scale(0.4)'
        badgeRef.current.style.opacity = '0.8'
      }
    }, 100)

    // Complete animation
    setTimeout(() => {
      setIsAnimating(false)
      onAnimationComplete()
    }, 1100)
  }, [badgeId, onAnimationComplete])

  if (!isAnimating || !badgeData) return null

  const getRarityGlow = (rarity: string) => {
    switch (rarity) {
      case 'common': return 'shadow-gray-400'
      case 'uncommon': return 'shadow-green-400'
      case 'rare': return 'shadow-blue-400'
      case 'epic': return 'shadow-purple-400'
      case 'legendary': return 'shadow-yellow-400'
      default: return 'shadow-gray-400'
    }
  }

  const getRarityGradient = (rarity: string) => {
    switch (rarity) {
      case 'common': return 'from-gray-500 to-gray-600'
      case 'uncommon': return 'from-green-500 to-emerald-600'
      case 'rare': return 'from-blue-500 to-cyan-600'
      case 'epic': return 'from-purple-500 to-violet-600'
      case 'legendary': return 'from-yellow-500 to-orange-500'
      default: return 'from-gray-500 to-gray-600'
    }
  }

  return (
    <div className="fixed inset-0 z-40 pointer-events-none">
      <div
        ref={badgeRef}
        className={`absolute w-16 h-16 rounded-xl bg-gradient-to-br ${getRarityGradient(badgeData.rarity)} ${getRarityGlow(badgeData.rarity)} shadow-lg flex items-center justify-center text-2xl transform -translate-x-8 -translate-y-8`}
        style={{
          transition: 'all 800ms cubic-bezier(0.25, 0.46, 0.45, 0.94)',
          zIndex: 50
        }}
      >
        <span className="drop-shadow-sm">{badgeData.icon}</span>
      </div>
    </div>
  )
}
