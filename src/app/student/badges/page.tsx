'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useDailyQuestBadges } from '@/hooks/useDailyQuestBadges'
import LogoutHandler from '@/components/LogoutHandler'

export default function BadgesPage() {
  // Use original badges hook but optimized
  const { badges, stats, loading } = useDailyQuestBadges()
  
  // Debug logging
  console.log('BadgesPage render:', { badgesCount: badges.length, loading, stats })
  const [filter, setFilter] = useState<'all' | 'earned' | 'unearned'>('all')
  const [rarityFilter, setRarityFilter] = useState<'all' | 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary'>('all')

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

  // Get drop-shadow glow for earned badges (gradient from legendary to common)
  const getRarityGlowEffect = (rarity: string, earned: boolean) => {
    if (!earned) return undefined
    
    switch (rarity) {
      case 'legendary':
        // Strongest glow - amber/yellow
        return 'drop-shadow(0 0 20px rgba(251, 191, 36, 0.8)) drop-shadow(0 0 10px rgba(251, 191, 36, 0.6))'
      case 'epic':
        // Strong purple/pink glow
        return 'drop-shadow(0 0 18px rgba(168, 85, 247, 0.7)) drop-shadow(0 0 8px rgba(236, 72, 153, 0.5))'
      case 'rare':
        // Medium blue/cyan glow
        return 'drop-shadow(0 0 15px rgba(59, 130, 246, 0.6)) drop-shadow(0 0 6px rgba(34, 211, 238, 0.4))'
      case 'uncommon':
        // Medium-weak green glow
        return 'drop-shadow(0 0 12px rgba(34, 197, 94, 0.5)) drop-shadow(0 0 5px rgba(16, 185, 129, 0.3))'
      case 'common':
        // Weakest glow - gray
        return 'drop-shadow(0 0 10px rgba(148, 163, 184, 0.4)) drop-shadow(0 0 4px rgba(148, 163, 184, 0.2))'
      default:
        return undefined
    }
  }

  // Get blur glow background for earned badges (gradient intensity)
  const getRarityBlurGlow = (rarity: string, earned: boolean) => {
    if (!earned) return null
    
    switch (rarity) {
      case 'legendary':
        // Strongest blur glow
        return <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-amber-400/30 to-orange-400/30 blur-xl animate-pulse" />
      case 'epic':
        // Strong purple blur
        return <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-purple-400/25 to-pink-400/25 blur-xl animate-pulse" />
      case 'rare':
        // Medium blue blur
        return <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-blue-400/20 to-cyan-400/20 blur-lg animate-pulse" />
      case 'uncommon':
        // Medium-weak green blur
        return <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-green-400/15 to-emerald-400/15 blur-lg" />
      case 'common':
        // Weakest blur - subtle gray
        return <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-slate-400/10 to-slate-300/10 blur-md" />
      default:
        return null
    }
  }

  const getBadgeIcon = (badge: any) => {
    // Unique icon styling for earned badges
    if (badge.earned) {
      return '🏆'
    }
    return badge.icon
  }

  const filteredBadges = badges.filter(badge => {
    // Filter out spell slinger related badges
    const isSpellSlingerBadge = badge.id?.includes('spell_slinger') ||
                                 badge.name?.toLowerCase().includes('spell slinger') ||
                                 badge.quest_id?.includes('spell_slinger')
    
    if (isSpellSlingerBadge) {
      return false
    }
    
    const matchesEarnedFilter = 
      filter === 'all' || 
      (filter === 'earned' && badge.earned) || 
      (filter === 'unearned' && !badge.earned)
    
    const matchesRarityFilter = 
      rarityFilter === 'all' || badge.rarity === rarityFilter

    return matchesEarnedFilter && matchesRarityFilter
  })

  const rarityOrder = { legendary: 0, epic: 1, rare: 2, uncommon: 3, common: 4 }
  const sortedBadges = [...filteredBadges].sort((a, b) => {
    if (a.earned !== b.earned) return a.earned ? -1 : 1
    return rarityOrder[a.rarity] - rarityOrder[b.rarity]
  })

  // Show loading only if no badges at all, still loading, and no cache available
  const hasCache = typeof window !== 'undefined' && localStorage.getItem('daily_quest_badges')
  if (loading && badges.length === 0 && !hasCache) {
    console.log('BadgesPage: Showing loading state')
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50 text-gray-800">
        <LogoutHandler />
        <div className="border-b border-gray-200 bg-white/80 backdrop-blur-sm">
          <div className="max-w-7xl mx-auto px-6 py-6 flex items-center justify-between">
            <h1 className="text-3xl font-bold text-black">
              Trophy Collection
            </h1>
            <Link href="/student" className="px-4 py-2 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-lg hover:from-indigo-700 hover:to-purple-700 transition-all duration-300 font-medium shadow-lg">
              ← Back to Dashboard
            </Link>
          </div>
        </div>
        <div className="max-w-7xl mx-auto px-6 py-8">
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
            {[...Array(15)].map((_, i) => (
              <div key={i} className="aspect-square bg-gradient-to-br from-slate-100 to-slate-200 rounded-2xl animate-pulse"></div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50 text-gray-800">
      <LogoutHandler />
      
      {/* Header */}
      <div className="border-b border-gray-200 bg-white/80 backdrop-blur-sm shadow-sm">
        <div className="max-w-7xl mx-auto px-6 py-6 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-black">
              Trophy Collection
            </h1>
            <p className="text-gray-600 mt-1">Collect badges by completing daily quests</p>
          </div>
          <Link href="/student" className="px-4 py-2 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-lg hover:from-indigo-700 hover:to-purple-700 transition-all duration-300 font-medium shadow-lg hover:shadow-xl transform hover:-translate-y-0.5">
            ← Back to Dashboard
          </Link>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-8">
        {/* Stats */}
        <div className="bg-white/90 backdrop-blur-sm rounded-2xl border-2 border-gray-200 p-8 mb-8 shadow-lg">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            <div className="text-center">
              <div className="text-4xl font-bold text-black">{stats.earned}</div>
              <div className="text-sm text-gray-600 font-medium">Earned</div>
            </div>
            <div className="text-center">
              <div className="text-4xl font-bold text-black">{stats.total - stats.earned}</div>
              <div className="text-sm text-gray-600 font-medium">Remaining</div>
            </div>
            <div className="text-center">
              <div className="text-4xl font-bold text-black">{stats.percentage}%</div>
              <div className="text-sm text-gray-600 font-medium">Complete</div>
            </div>
            <div className="text-center">
              <div className="text-4xl font-bold text-black">{stats.total}</div>
              <div className="text-sm text-gray-600 font-medium">Total</div>
            </div>
          </div>
          <div className="mt-6 w-full bg-gray-200 rounded-full h-4 overflow-hidden">
            <div 
              className="bg-gradient-to-r from-green-500 to-emerald-500 h-4 rounded-full transition-all duration-700 shadow-lg" 
              style={{ width: `${stats.percentage}%` }}
            ></div>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white/90 backdrop-blur-sm rounded-2xl border-2 border-gray-200 p-6 mb-8 shadow-lg">
          <div className="flex flex-wrap gap-4 items-center">
            <div>
              <label className="text-sm font-semibold text-gray-700 mr-2">Status:</label>
              <select 
                value={filter} 
                onChange={(e) => setFilter(e.target.value as any)}
                className="px-4 py-2 border-2 border-gray-300 rounded-lg text-sm font-medium focus:outline-none focus:border-indigo-500 transition-colors shadow-sm"
              >
                <option value="all">All Badges</option>
                <option value="earned">Earned</option>
                <option value="unearned">Not Earned</option>
              </select>
            </div>
            <div>
              <label className="text-sm font-semibold text-gray-700 mr-2">Rarity:</label>
              <select 
                value={rarityFilter} 
                onChange={(e) => setRarityFilter(e.target.value as any)}
                className="px-4 py-2 border-2 border-gray-300 rounded-lg text-sm font-medium focus:outline-none focus:border-indigo-500 transition-colors shadow-sm"
              >
                <option value="all">All Rarities</option>
                <option value="legendary">Legendary</option>
                <option value="epic">Epic</option>
                <option value="rare">Rare</option>
                <option value="uncommon">Uncommon</option>
                <option value="common">Common</option>
              </select>
            </div>
          </div>
        </div>

        {/* Badges Grid */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
          {sortedBadges.map((badge) => (
            <div
              key={badge.id}
              className={`group relative aspect-square rounded-2xl bg-gradient-to-br ${getRarityGradient(badge.rarity)} border-4 ${badge.earned ? 'border-white' : 'border-gray-300'} shadow-lg ${getRarityGlow(badge.rarity)} hover:shadow-2xl transition-all duration-300 flex flex-col items-center justify-center p-4 cursor-pointer transform hover:-translate-y-2 hover:scale-105 ${
                !badge.earned && 'grayscale opacity-60'
              }`}
              style={{
                background: badge.earned 
                  ? `linear-gradient(135deg, var(--tw-gradient-stops))` 
                  : `linear-gradient(135deg, var(--tw-gradient-stops))`,
                filter: getRarityGlowEffect(badge.rarity, badge.earned)
              }}
              title={`${badge.name} - ${badge.description}`}
            >
              {/* Glowing effect for all earned badges - gradient intensity based on rarity */}
              {getRarityBlurGlow(badge.rarity, badge.earned)}
              
              {/* Earned indicator */}
              {badge.earned && (
                <div className="absolute top-2 right-2 w-6 h-6 bg-gradient-to-r from-green-500 to-emerald-500 rounded-full flex items-center justify-center animate-pulse shadow-lg ring-2 ring-white">
                  <span className="text-white text-xs font-bold">✓</span>
                </div>
              )}
              
              {/* Badge icon with 3D effect */}
              <div className="relative">
                <div className="text-5xl mb-3 transform group-hover:scale-110 group-hover:rotate-12 transition-all duration-300 drop-shadow-lg">
                  {getBadgeIcon(badge)}
                </div>
                {badge.earned && badge.rarity === 'legendary' && (
                  <div className="absolute inset-0 text-5xl opacity-30 blur-md animate-pulse">👑</div>
                )}
              </div>
              
              {/* Badge name */}
              <div className="text-sm font-bold text-center leading-tight px-2 text-gray-800 mb-1">
                {badge.name.replace(' Badge', '')}
              </div>
              
              {/* Rarity label */}
              <div className="text-xs font-semibold mt-1 px-3 py-1 bg-white/80 rounded-full backdrop-blur-sm capitalize border border-gray-200 shadow-sm">
                {badge.rarity}
              </div>
              
              {/* Earned date */}
              {badge.unlocked_at && (
                <div className="text-xs mt-2 text-center font-medium text-green-700 bg-green-100/80 px-2 py-1 rounded-full">
                  {new Date(badge.unlocked_at).toLocaleDateString()}
                </div>
              )}
              
              {/* Lock icon for unearned badges */}
              {!badge.earned && (
                <div className="absolute bottom-3 right-3 text-gray-400 text-2xl opacity-50">
                  🔒
                </div>
              )}
            </div>
          ))}
        </div>

        {filteredBadges.length === 0 && badges.length === 0 && !loading && (
          <div className="text-center py-16 bg-white/50 rounded-2xl backdrop-blur-sm">
            <div className="text-8xl mb-4">🔍</div>
            <p className="text-gray-600 text-xl font-medium">No badges found with current filters</p>
            <button 
              onClick={() => {
                setFilter('all')
                setRarityFilter('all')
              }}
              className="mt-6 px-6 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-lg hover:from-indigo-700 hover:to-purple-700 transition-all duration-300 font-medium shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
            >
              Clear Filters
            </button>
          </div>
        )}
        
        {filteredBadges.length === 0 && badges.length > 0 && (
          <div className="text-center py-16 bg-white/50 rounded-2xl backdrop-blur-sm">
            <div className="text-8xl mb-4">🔍</div>
            <p className="text-gray-600 text-xl font-medium">No badges found with current filters</p>
            <button 
              onClick={() => {
                setFilter('all')
                setRarityFilter('all')
              }}
              className="mt-6 px-6 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-lg hover:from-indigo-700 hover:to-purple-700 transition-all duration-300 font-medium shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
            >
              Clear Filters
            </button>
          </div>
        )}
      </div>
    </div>
  )
}