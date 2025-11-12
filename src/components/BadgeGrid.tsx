'use client'

import Link from 'next/link'
import { useDailyQuestBadges } from '@/hooks/useDailyQuestBadges'

interface BadgeGridProps {
  maxItems?: number
  showTitle?: boolean
  showStats?: boolean
  highlightedBadgeId?: string | null
}

export default function BadgeGrid({ maxItems = 6, showTitle = true, showStats = true, highlightedBadgeId }: BadgeGridProps) {
  // Use original badges hook but optimized
  const { badges, recentBadges, stats, loading } = useDailyQuestBadges()

  const getRarityColor = (rarity: string) => {
    switch (rarity) {
      case 'common': return 'bg-gray-100 border-gray-300 text-gray-700'
      case 'uncommon': return 'bg-green-100 border-green-300 text-green-700'
      case 'rare': return 'bg-blue-100 border-blue-300 text-blue-700'
      case 'epic': return 'bg-purple-100 border-purple-300 text-purple-700'
      case 'legendary': return 'bg-yellow-100 border-yellow-300 text-yellow-700'
      default: return 'bg-gray-100 border-gray-300 text-gray-700'
    }
  }

  const getRarityGlow = (rarity: string) => {
    switch (rarity) {
      case 'rare': return 'shadow-blue-200'
      case 'epic': return 'shadow-purple-200'
      case 'legendary': return 'shadow-yellow-200'
      default: return 'shadow-gray-200'
    }
  }

  // Use recent badges if available, otherwise fall back to earned badges
  const earnedBadges = badges.filter(badge => badge.earned).sort((a, b) => {
    // Sort by unlocked_at date (newest first), then by rarity
    if (a.unlocked_at && b.unlocked_at) {
      const dateComparison = new Date(b.unlocked_at).getTime() - new Date(a.unlocked_at).getTime()
      if (dateComparison !== 0) return dateComparison
    }
    const rarityOrder = { legendary: 0, epic: 1, rare: 2, uncommon: 3, common: 4 }
    return rarityOrder[a.rarity] - rarityOrder[b.rarity]
  })
  
  // Recent badges should be sorted by date (newest first) to show most recent at top
  const sortedRecentBadges = recentBadges.sort((a, b) => {
    if (a.unlocked_at && b.unlocked_at) {
      return new Date(b.unlocked_at).getTime() - new Date(a.unlocked_at).getTime()
    }
    return 0
  })
  
  const displayBadges = recentBadges.length > 0 ? sortedRecentBadges : earnedBadges

  // Show loading only if no badges at all and still loading
  // Always prioritize showing recent badges if available, even during loading
  // Show loading only if no badges at all, still loading, and no cache available
  const hasCache = typeof window !== 'undefined' && localStorage.getItem('daily_quest_badges')
  if (loading && displayBadges.length === 0 && recentBadges.length === 0 && !hasCache) {
    return (
      <div className="rounded-2xl border border-gray-200 bg-white/80 backdrop-blur-sm shadow-lg p-8">
        {showTitle && <h3 className="text-2xl font-bold text-gray-800 mb-6">Daily Quest Badges</h3>}
        <div className="space-y-3">
          {[...Array(maxItems)].map((_, i) => (
            <div key={i} className="h-16 bg-gray-100 rounded-lg animate-pulse"></div>
          ))}
        </div>
      </div>
    )
  }

  const displayBadgesLimited = displayBadges.slice(0, maxItems)

  return (
    <div className="rounded-2xl border border-gray-200 bg-white/80 backdrop-blur-sm shadow-lg p-8">
      {showTitle && (
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center">
            <h3 className="text-2xl font-bold text-gray-800">
              {recentBadges.length > 0 ? 'Recent Badges' : 'Daily Quest Badges'}
            </h3>
          </div>
          <Link 
            href="/student/badges" 
            className="text-sm text-indigo-600 hover:text-indigo-700 font-medium"
          >
            View All
          </Link>
        </div>
      )}

      {showStats && (
        <div className="mb-6 p-4 bg-gray-50 rounded-lg">
          <div className="flex items-center justify-between text-sm mb-2">
            <span className="text-gray-600">Badge Progress</span>
            <span className="font-medium text-gray-800">
              {stats.earned} / {stats.total} ({stats.percentage}%)
            </span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div 
              className="bg-gradient-to-r from-indigo-500 to-purple-600 h-2 rounded-full transition-all duration-300" 
              style={{ width: `${stats.percentage}%` }}
            ></div>
          </div>
        </div>
      )}

      <div className="space-y-3">
        {displayBadgesLimited.map((badge) => (
          <div
            key={badge.id}
            className={`rounded-lg border-2 ${getRarityColor(badge.rarity)} ${getRarityGlow(badge.rarity)} shadow-sm hover:shadow-md transition-all duration-200 flex items-center p-3 group cursor-pointer ${
              highlightedBadgeId === badge.id ? 'animate-pulse scale-105 ring-2 ring-indigo-500 ring-opacity-50' : ''
            }`}
            title={`${badge.name} - ${badge.description}`}
          >
            <div className="flex items-center justify-center w-12 h-12 mr-4">
              <span className="text-2xl group-hover:scale-110 transition-transform duration-200">
                🏆
              </span>
            </div>
            <div className="flex-1">
              <div className="font-medium text-sm leading-tight">
                {badge.name.replace(' Badge', '')}
              </div>
              <div className="text-xs opacity-75 capitalize mt-1">
                {badge.rarity} • {badge.unlocked_at && new Date(badge.unlocked_at).toLocaleDateString()}
              </div>
            </div>
            <div className="text-xs opacity-75">
              {badge.rarity}
            </div>
          </div>
        ))}
      </div>

      {displayBadgesLimited.length === 0 && (
        <div className="text-center py-12 text-gray-500">
          <div className="text-6xl mb-4">🏆</div>
          <p className="text-lg font-medium">No badges earned yet</p>
          <p className="text-sm mt-2">Complete daily quests to earn your first badges!</p>
        </div>
      )}
    </div>
  )
}
