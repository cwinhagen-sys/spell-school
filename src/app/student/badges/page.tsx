'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useDailyQuestBadges } from '@/hooks/useDailyQuestBadges'
import LogoutHandler from '@/components/LogoutHandler'
import { Trophy, ArrowLeft, Filter, Lock } from 'lucide-react'

export default function BadgesPage() {
  const { badges, stats, loading } = useDailyQuestBadges()
  
  console.log('BadgesPage render:', { badgesCount: badges.length, loading, stats })
  const [filter, setFilter] = useState<'all' | 'earned' | 'unearned'>('all')
  const [rarityFilter, setRarityFilter] = useState<'all' | 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary'>('all')

  const getRarityGradient = (rarity: string, earned: boolean) => {
    if (!earned) return 'from-gray-800 to-gray-900 border-gray-700'
    switch (rarity) {
      case 'common': return 'from-slate-600 to-slate-700 border-slate-500'
      case 'uncommon': return 'from-emerald-600 to-green-700 border-emerald-500'
      case 'rare': return 'from-blue-600 to-cyan-700 border-blue-500'
      case 'epic': return 'from-violet-600 to-purple-700 border-violet-500'
      case 'legendary': return 'from-amber-500 via-yellow-500 to-orange-500 border-amber-400'
      default: return 'from-slate-600 to-slate-700 border-slate-500'
    }
  }

  const getRarityGlow = (rarity: string, earned: boolean) => {
    if (!earned) return ''
    switch (rarity) {
      case 'common': return 'shadow-slate-500/30'
      case 'uncommon': return 'shadow-emerald-500/40'
      case 'rare': return 'shadow-blue-500/50'
      case 'epic': return 'shadow-violet-500/50'
      case 'legendary': return 'shadow-amber-500/60'
      default: return ''
    }
  }

  const getRarityTextColor = (rarity: string) => {
    switch (rarity) {
      case 'common': return 'text-slate-400'
      case 'uncommon': return 'text-emerald-400'
      case 'rare': return 'text-blue-400'
      case 'epic': return 'text-violet-400'
      case 'legendary': return 'text-amber-400'
      default: return 'text-slate-400'
    }
  }

  const getBadgeIcon = (badge: any) => {
    if (badge.earned) {
      return '🏆'
    }
    return badge.icon
  }

  const filteredBadges = badges.filter(badge => {
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

  const hasCache = typeof window !== 'undefined' && localStorage.getItem('daily_quest_badges')
  if (loading && badges.length === 0 && !hasCache) {
    return (
      <div className="container mx-auto px-6 py-12 min-h-[60vh] flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-2 border-amber-500/30 border-t-amber-500 rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-400">Laddar trofeer...</p>
        </div>
      </div>
    )
  }

  return (
    <>
      <LogoutHandler />
      <div className="container mx-auto px-6 py-8">
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center gap-4">
              <div className="relative">
                <div className="w-14 h-14 bg-gradient-to-br from-amber-500 to-orange-500 rounded-2xl flex items-center justify-center shadow-lg shadow-amber-500/30">
                  <Trophy className="w-7 h-7 text-white" />
                </div>
                <div className="absolute -inset-1 bg-gradient-to-br from-amber-500 to-orange-500 rounded-2xl blur opacity-30" />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-white">Trofésamling</h1>
                <p className="text-gray-400">Samla trofeer genom att klara dagliga uppdrag</p>
              </div>
            </div>
            <Link 
              href="/student" 
              className="flex items-center gap-2 px-4 py-2.5 bg-white/5 border border-white/10 text-gray-300 rounded-xl hover:bg-white/10 transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              Tillbaka
            </Link>
          </div>

          {/* Stats */}
          <div className="bg-white/5 backdrop-blur-sm rounded-2xl border border-white/10 p-6 mb-8">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
              <div className="text-center">
                <div className="text-4xl font-bold text-emerald-400">{stats.earned}</div>
                <div className="text-sm text-gray-400">Intjänade</div>
              </div>
              <div className="text-center">
                <div className="text-4xl font-bold text-gray-400">{stats.total - stats.earned}</div>
                <div className="text-sm text-gray-400">Kvarvarande</div>
              </div>
              <div className="text-center">
                <div className="text-4xl font-bold text-cyan-400">{stats.percentage}%</div>
                <div className="text-sm text-gray-400">Klart</div>
              </div>
              <div className="text-center">
                <div className="text-4xl font-bold text-white">{stats.total}</div>
                <div className="text-sm text-gray-400">Totalt</div>
              </div>
            </div>
            <div className="mt-6 w-full bg-white/10 rounded-full h-3 overflow-hidden">
              <div 
                className="bg-gradient-to-r from-emerald-500 to-cyan-500 h-3 rounded-full transition-all duration-700" 
                style={{ width: `${stats.percentage}%` }}
              />
            </div>
          </div>

          {/* Filters */}
          <div className="bg-white/5 backdrop-blur-sm rounded-2xl border border-white/10 p-4 mb-8 flex flex-wrap gap-4 items-center">
            <Filter className="w-5 h-5 text-gray-400" />
            <div className="flex items-center gap-2">
              <label className="text-sm text-gray-400">Status:</label>
              <select 
                value={filter} 
                onChange={(e) => setFilter(e.target.value as any)}
                className="px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-sm text-white focus:outline-none focus:border-violet-500/50 transition-colors"
              >
                <option value="all" className="bg-[#1a1a2e]">Alla</option>
                <option value="earned" className="bg-[#1a1a2e]">Intjänade</option>
                <option value="unearned" className="bg-[#1a1a2e]">Ej intjänade</option>
              </select>
            </div>
            <div className="flex items-center gap-2">
              <label className="text-sm text-gray-400">Raritet:</label>
              <select 
                value={rarityFilter} 
                onChange={(e) => setRarityFilter(e.target.value as any)}
                className="px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-sm text-white focus:outline-none focus:border-violet-500/50 transition-colors"
              >
                <option value="all" className="bg-[#1a1a2e]">Alla</option>
                <option value="legendary" className="bg-[#1a1a2e]">Legendarisk</option>
                <option value="epic" className="bg-[#1a1a2e]">Episk</option>
                <option value="rare" className="bg-[#1a1a2e]">Sällsynt</option>
                <option value="uncommon" className="bg-[#1a1a2e]">Ovanlig</option>
                <option value="common" className="bg-[#1a1a2e]">Vanlig</option>
              </select>
            </div>
          </div>

          {/* Badges Grid */}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
            {sortedBadges.map((badge) => (
              <div
                key={badge.id}
                className={`group relative aspect-square rounded-2xl bg-gradient-to-br ${getRarityGradient(badge.rarity, badge.earned)} border-2 ${badge.earned ? 'shadow-xl' : 'opacity-50'} ${getRarityGlow(badge.rarity, badge.earned)} hover:scale-105 transition-all duration-300 flex flex-col items-center justify-center p-4 cursor-pointer overflow-hidden`}
                title={`${badge.name} - ${badge.description}`}
              >
                {/* Glow effect for legendary */}
                {badge.earned && badge.rarity === 'legendary' && (
                  <div className="absolute inset-0 bg-gradient-to-br from-amber-400/20 to-orange-400/20 blur-xl animate-pulse" />
                )}
                
                {/* Earned indicator */}
                {badge.earned && (
                  <div className="absolute top-2 right-2 w-6 h-6 bg-emerald-500 rounded-full flex items-center justify-center shadow-lg">
                    <span className="text-white text-xs font-bold">✓</span>
                  </div>
                )}
                
                {/* Badge icon */}
                <div className="relative">
                  <div className={`text-5xl mb-3 ${badge.earned ? 'group-hover:scale-110 group-hover:rotate-6' : ''} transition-transform`}>
                    {getBadgeIcon(badge)}
                  </div>
                </div>
                
                {/* Badge name */}
                <div className="text-sm font-bold text-center leading-tight px-2 text-white mb-2">
                  {badge.name.replace(' Badge', '')}
                </div>
                
                {/* Rarity label */}
                <div className={`text-xs font-semibold px-3 py-1 rounded-full bg-black/30 capitalize ${getRarityTextColor(badge.rarity)}`}>
                  {badge.rarity === 'legendary' ? 'Legendarisk' : 
                   badge.rarity === 'epic' ? 'Episk' :
                   badge.rarity === 'rare' ? 'Sällsynt' :
                   badge.rarity === 'uncommon' ? 'Ovanlig' : 'Vanlig'}
                </div>
                
                {/* Earned date */}
                {badge.unlocked_at && (
                  <div className="text-xs mt-2 text-emerald-400 bg-emerald-500/20 px-2 py-1 rounded-full">
                    {new Date(badge.unlocked_at).toLocaleDateString('sv-SE')}
                  </div>
                )}
                
                {/* Lock icon for unearned badges */}
                {!badge.earned && (
                  <div className="absolute bottom-3 right-3">
                    <Lock className="w-5 h-5 text-gray-600" />
                  </div>
                )}
              </div>
            ))}
          </div>

          {filteredBadges.length === 0 && (
            <div className="text-center py-16 bg-white/5 rounded-2xl backdrop-blur-sm border border-white/10">
              <div className="text-8xl mb-4">🔍</div>
              <p className="text-gray-400 text-xl">Inga trofeer hittades med dessa filter</p>
              <button 
                onClick={() => {
                  setFilter('all')
                  setRarityFilter('all')
                }}
                className="mt-6 px-6 py-3 bg-gradient-to-r from-violet-500 to-cyan-500 text-white rounded-xl hover:from-violet-400 hover:to-cyan-400 transition-all font-medium shadow-lg"
              >
                Rensa filter
              </button>
            </div>
          )}
        </div>
      </div>
    </>
  )
}
