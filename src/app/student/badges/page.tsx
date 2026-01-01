'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useDailyQuestBadges } from '@/hooks/useDailyQuestBadges'
import LogoutHandler from '@/components/LogoutHandler'
import { Trophy, ArrowLeft, Filter, Lock } from 'lucide-react'

export default function BadgesPage() {
  const { badges, stats, loading } = useDailyQuestBadges()
  const [hasCache, setHasCache] = useState(false)
  const [isClient, setIsClient] = useState(false)
  
  console.log('BadgesPage render:', { badgesCount: badges.length, loading, stats })
  const [filter, setFilter] = useState<'all' | 'earned' | 'unearned'>('all')
  const [rarityFilter, setRarityFilter] = useState<'all' | 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary'>('all')

  // Check for cache only on client side to avoid hydration mismatch
  useEffect(() => {
    setIsClient(true)
    const cache = localStorage.getItem('daily_quest_badges')
    setHasCache(!!cache)
  }, [])

  // Get glow color based on rarity
  const getRarityGlowColor = (rarity: string, earned: boolean) => {
    if (!earned) return 'rgba(255, 255, 255, 0.1)'
    switch (rarity) {
      case 'common': return 'rgba(148, 163, 184, 0.6)'
      case 'uncommon': return 'rgba(16, 185, 129, 0.7)'
      case 'rare': return 'rgba(59, 130, 246, 0.8)'
      case 'epic': return 'rgba(139, 92, 246, 0.9)'
      case 'legendary': return 'rgba(245, 158, 11, 1)'
      default: return 'rgba(255, 255, 255, 0.3)'
    }
  }

  // Get rarity text color
  const getRarityTextColor = (rarity: string, earned: boolean) => {
    if (!earned) return 'text-gray-500'
    switch (rarity) {
      case 'common': return 'text-slate-400'
      case 'uncommon': return 'text-emerald-400'
      case 'rare': return 'text-blue-400'
      case 'epic': return 'text-violet-400'
      case 'legendary': return 'text-amber-400'
      default: return 'text-gray-400'
    }
  }

  // Get rarity name
  const getRarityName = (rarity: string) => {
    switch (rarity) {
      case 'common': return 'Common'
      case 'uncommon': return 'Uncommon'
      case 'rare': return 'Rare'
      case 'epic': return 'Epic'
      case 'legendary': return 'Legendary'
      default: return 'Common'
    }
  }

  // Get glow size and intensity based on rarity
  const getGlowConfig = (rarity: string, earned: boolean) => {
    if (!earned) {
      return {
        outer: { size: 'w-16 h-16', blur: 'blur(12px)', opacity: 0.3 },
        middle: { size: 'w-12 h-12', blur: 'blur(8px)', opacity: 0.4 },
        inner: { size: 'w-8 h-8', blur: 'blur(4px)', opacity: 0.5 }
      }
    }
    switch (rarity) {
      case 'common':
        return {
          outer: { size: 'w-20 h-20', blur: 'blur(16px)', opacity: 0.5 },
          middle: { size: 'w-16 h-16', blur: 'blur(10px)', opacity: 0.6 },
          inner: { size: 'w-12 h-12', blur: 'blur(5px)', opacity: 0.7 }
        }
      case 'uncommon':
        return {
          outer: { size: 'w-24 h-24', blur: 'blur(18px)', opacity: 0.6 },
          middle: { size: 'w-18 h-18', blur: 'blur(12px)', opacity: 0.7 },
          inner: { size: 'w-14 h-14', blur: 'blur(6px)', opacity: 0.8 }
        }
      case 'rare':
        return {
          outer: { size: 'w-28 h-28', blur: 'blur(20px)', opacity: 0.7 },
          middle: { size: 'w-20 h-20', blur: 'blur(14px)', opacity: 0.8 },
          inner: { size: 'w-16 h-16', blur: 'blur(8px)', opacity: 0.9 }
        }
      case 'epic':
        return {
          outer: { size: 'w-32 h-32', blur: 'blur(22px)', opacity: 0.8 },
          middle: { size: 'w-24 h-24', blur: 'blur(16px)', opacity: 0.85 },
          inner: { size: 'w-18 h-18', blur: 'blur(10px)', opacity: 0.9 }
        }
      case 'legendary':
        return {
          outer: { size: 'w-36 h-36', blur: 'blur(24px)', opacity: 0.9 },
          middle: { size: 'w-28 h-28', blur: 'blur(18px)', opacity: 0.95 },
          inner: { size: 'w-20 h-20', blur: 'blur(12px)', opacity: 1 }
        }
      default:
        return {
          outer: { size: 'w-20 h-20', blur: 'blur(16px)', opacity: 0.5 },
          middle: { size: 'w-16 h-16', blur: 'blur(10px)', opacity: 0.6 },
          inner: { size: 'w-12 h-12', blur: 'blur(5px)', opacity: 0.7 }
        }
    }
  }

  // Get subtle background accent based on rarity
  const getRarityAccent = (rarity: string, earned: boolean) => {
    if (!earned) return ''
    switch (rarity) {
      case 'common': return ''
      case 'uncommon': return 'bg-emerald-500/5'
      case 'rare': return 'bg-blue-500/5'
      case 'epic': return 'bg-violet-500/5'
      case 'legendary': return 'bg-amber-500/10'
      default: return ''
    }
  }

  // Get rarity box colors for styling
  const getRarityBoxColors = (rarity: string, earned: boolean) => {
    if (!earned) {
      return {
        bg: 'rgba(148, 163, 184, 0.2)',
        border: 'rgba(148, 163, 184, 0.3)',
        text: 'rgba(148, 163, 184, 0.8)'
      }
    }
    switch (rarity) {
      case 'common':
        return {
          bg: 'rgba(148, 163, 184, 0.3)',
          border: 'rgba(148, 163, 184, 0.5)',
          text: 'rgb(203, 213, 225)'
        }
      case 'uncommon':
        return {
          bg: 'rgba(16, 185, 129, 0.3)',
          border: 'rgba(16, 185, 129, 0.5)',
          text: 'rgb(52, 211, 153)'
        }
      case 'rare':
        return {
          bg: 'rgba(59, 130, 246, 0.3)',
          border: 'rgba(59, 130, 246, 0.5)',
          text: 'rgb(96, 165, 250)'
        }
      case 'epic':
        return {
          bg: 'rgba(139, 92, 246, 0.3)',
          border: 'rgba(139, 92, 246, 0.5)',
          text: 'rgb(167, 139, 250)'
        }
      case 'legendary':
        return {
          bg: 'rgba(245, 158, 11, 0.3)',
          border: 'rgba(245, 158, 11, 0.5)',
          text: 'rgb(251, 191, 36)'
        }
      default:
        return {
          bg: 'rgba(148, 163, 184, 0.3)',
          border: 'rgba(148, 163, 184, 0.5)',
          text: 'rgb(203, 213, 225)'
        }
    }
  }

  // Get badge background image path
  const getBadgeBackgroundImage = (badge: any): string | null => {
    const name = badge.name?.toLowerCase() || ''
    
    // Map badge names to background image files
    const backgroundMap: { [key: string]: string } = {
      'word warrior': 'word_warrior.png',
      'memory champion': 'memory_champion.png',
      'spelling bee': 'spelling_bee.png',
      'choice master': 'choice_master.png',
      'gap filler': 'gap_filler.png',
      'spell slinger novice': 'spell_slinger_novice.png',
      'sentence builder': 'sentence_builder.png',
      'roulette master': 'roulette_master.png',
      'multi-game player': 'multi_game_player.png',
      'perfect score': 'perfect_score.png',
      'spell slinger expert': 'spell_slinger_expert.png',
      'grammar guru': 'grammar_guru.png',
      'roulette legend': 'roulette_legend.png',
      'marathon runner': 'marathon_runner.png',
      'perfectionist': 'perfectionist.png',
      'quiz god': 'quiz_god.png',
      'speed god': 'speed_god.png',
      'ultimate gamer': 'ultimate_gamer.png',
      'first steps': 'first_steps.png',
      'getting hot': 'getting_hot.png',
      'week warrior': 'week_warrior.png',
      'monthly master': 'monthly_master.png',
      'rising star': 'rising_star.png',
      'experienced learner': 'experienced_learner.png',
      'master student': 'master_student.png',
      'legendary scholar': 'legendary_scholar.png',
      'breakfast chef': 'breakfast_chef.png',
      'master chef': 'master_chef.png',
      'sentence starter': 'sentence_starter.png',
      'sentence expert': 'sentence_expert.png',
      'sentence master': 'sentence_master.png',
    }
    
    // Find matching background
    for (const [key, filename] of Object.entries(backgroundMap)) {
      if (name.includes(key)) {
        return `/images/badges/backgrounds/${filename}`
      }
    }
    
    return null
  }

  // Get custom design pattern for each badge type (kept for gradient fallback)
  const getBadgeDesign = (badge: any) => {
    const icon = badge.icon || '🏆'
    const earned = badge.earned
    const rarity = badge.rarity
    
    // Common patterns based on icon type
    if (icon.includes('⚔️') || icon.includes('Warrior')) {
      return {
        pattern: 'sword',
        gradient: earned ? 'from-amber-500/10 via-orange-500/5 to-amber-500/10' : '',
      }
    }
    if (icon.includes('🧠') || icon.includes('Memory') || icon.includes('Champion')) {
      return {
        pattern: 'brain',
        gradient: earned ? 'from-purple-500/10 via-blue-500/5 to-purple-500/10' : '',
      }
    }
    if (icon.includes('⌨️') || icon.includes('Spelling') || icon.includes('Typing')) {
      return {
        pattern: 'keyboard',
        gradient: earned ? 'from-cyan-500/10 via-blue-500/5 to-cyan-500/10' : '',
      }
    }
    if (icon.includes('✅') || icon.includes('Choice') || icon.includes('Master')) {
      return {
        pattern: 'check',
        gradient: earned ? 'from-emerald-500/10 via-green-500/5 to-emerald-500/10' : '',
      }
    }
    if (icon.includes('📝') || icon.includes('Gap') || icon.includes('Sentence')) {
      return {
        pattern: 'document',
        gradient: earned ? 'from-indigo-500/10 via-purple-500/5 to-indigo-500/10' : '',
      }
    }
    if (icon.includes('🎯') || icon.includes('Roulette')) {
      return {
        pattern: 'target',
        gradient: earned ? 'from-rose-500/10 via-pink-500/5 to-rose-500/10' : '',
      }
    }
    if (icon.includes('🎮') || icon.includes('Multi')) {
      return {
        pattern: 'gamepad',
        gradient: earned ? 'from-violet-500/10 via-purple-500/5 to-violet-500/10' : '',
      }
    }
    if (icon.includes('💯') || icon.includes('Perfect')) {
      return {
        pattern: 'perfect',
        gradient: earned ? 'from-amber-500/15 via-yellow-500/8 to-amber-500/15' : '',
      }
    }
    if (icon.includes('🏃') || icon.includes('Marathon')) {
      return {
        pattern: 'runner',
        gradient: earned ? 'from-orange-500/10 via-red-500/5 to-orange-500/10' : '',
      }
    }
    if (icon.includes('⭐') || icon.includes('Perfectionist')) {
      return {
        pattern: 'star',
        gradient: earned ? 'from-yellow-500/15 via-amber-500/8 to-yellow-500/15' : '',
      }
    }
    if (icon.includes('👑') || icon.includes('Legend')) {
      return {
        pattern: 'crown',
        gradient: earned ? 'from-amber-500/20 via-orange-500/10 to-amber-500/20' : '',
      }
    }
    
    // Default
    return {
      pattern: 'default',
      gradient: earned ? 'from-amber-500/10 via-orange-500/5 to-amber-500/10' : '',
    }
  }

  const getBadgeIcon = (badge: any) => {
    return badge.icon || '🏆'
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

  // Only show loading state if we're on client, loading, no badges, and no cache
  if (isClient && loading && badges.length === 0 && !hasCache) {
    return (
      <div className="container mx-auto px-6 py-12 min-h-[60vh] flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-2 border-amber-500/30 border-t-amber-500 rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-400">Loading badges...</p>
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
                <h1 className="text-3xl font-bold text-white">Badge Collection</h1>
                <p className="text-gray-400">Collect badges by completing daily quests</p>
              </div>
            </div>
            <Link 
              href="/student" 
              className="flex items-center gap-2 px-4 py-2.5 bg-white/5 border border-white/10 text-gray-300 rounded-xl hover:bg-white/10 transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              Back
            </Link>
          </div>

          {/* Stats */}
          <div className="bg-white/5 backdrop-blur-sm rounded-2xl border border-white/10 p-6 mb-8">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
              <div className="text-center">
                <div className="text-4xl font-bold text-white">{stats.earned}</div>
                <div className="text-sm text-gray-400">Earned</div>
              </div>
              <div className="text-center">
                <div className="text-4xl font-bold text-white">{stats.total - stats.earned}</div>
                <div className="text-sm text-gray-400">Remaining</div>
              </div>
              <div className="text-center">
                <div className="text-4xl font-bold text-white">{stats.percentage}%</div>
                <div className="text-sm text-gray-400">Complete</div>
              </div>
              <div className="text-center">
                <div className="text-4xl font-bold text-white">{stats.total}</div>
                <div className="text-sm text-gray-400">Total</div>
              </div>
            </div>
            <div className="mt-6 w-full bg-white/10 rounded-full h-3 overflow-hidden">
              <div 
                className="bg-gradient-to-r from-amber-500 to-orange-500 h-3 rounded-full transition-all duration-700" 
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
                className="px-3 py-2 bg-gray-900/80 border border-white/10 rounded-lg text-sm text-white focus:outline-none focus:border-amber-500/50 transition-colors appearance-none cursor-pointer"
                style={{
                  backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath fill='%23ffffff' d='M6 9L1 4h10z'/%3E%3C/svg%3E")`,
                  backgroundRepeat: 'no-repeat',
                  backgroundPosition: 'right 0.75rem center',
                  paddingRight: '2.5rem'
                }}
              >
                <option value="all" className="bg-gray-900 text-white">All</option>
                <option value="earned" className="bg-gray-900 text-white">Earned</option>
                <option value="unearned" className="bg-gray-900 text-white">Unearned</option>
              </select>
            </div>
            <div className="flex items-center gap-2">
              <label className="text-sm text-gray-400">Rarity:</label>
              <select 
                value={rarityFilter} 
                onChange={(e) => setRarityFilter(e.target.value as any)}
                className="px-3 py-2 bg-gray-900/80 border border-white/10 rounded-lg text-sm text-white focus:outline-none focus:border-amber-500/50 transition-colors appearance-none cursor-pointer"
                style={{
                  backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath fill='%23ffffff' d='M6 9L1 4h10z'/%3E%3C/svg%3E")`,
                  backgroundRepeat: 'no-repeat',
                  backgroundPosition: 'right 0.75rem center',
                  paddingRight: '2.5rem'
                }}
              >
                <option value="all" className="bg-gray-900 text-white">All</option>
                <option value="legendary" className="bg-gray-900 text-white">Legendary</option>
                <option value="epic" className="bg-gray-900 text-white">Epic</option>
                <option value="rare" className="bg-gray-900 text-white">Rare</option>
                <option value="uncommon" className="bg-gray-900 text-white">Uncommon</option>
                <option value="common" className="bg-gray-900 text-white">Common</option>
              </select>
            </div>
          </div>

          {/* Badges Grid */}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
            {sortedBadges.map((badge) => {
              const backgroundImage = getBadgeBackgroundImage(badge)
              const boxColors = getRarityBoxColors(badge.rarity, badge.earned)
              
              return (
                <div
                  key={badge.id}
                  className={`group relative aspect-square rounded-2xl bg-white/5 backdrop-blur-sm border border-white/10 ${
                    badge.earned ? 'hover:scale-[1.02]' : ''
                  } transition-all duration-300 flex flex-col items-center justify-end p-4 cursor-pointer overflow-hidden`}
                  title={`${badge.name} - ${badge.description}`}
                >
                  {/* Custom background image - shown for all badges */}
                  {backgroundImage && (
                    <div 
                      className={`absolute inset-0 transition-opacity duration-300 ${
                        badge.earned 
                          ? 'opacity-40 group-hover:opacity-70' 
                          : 'opacity-20'
                      }`}
                      style={{
                        backgroundImage: `url(${backgroundImage})`,
                        backgroundSize: 'cover',
                        backgroundPosition: 'center',
                        backgroundRepeat: 'no-repeat'
                      }}
                    />
                  )}
                  
                  {/* Dark overlay for better text readability */}
                  {backgroundImage && (
                    <div className={`absolute inset-0 transition-opacity duration-300 ${
                      badge.earned 
                        ? 'bg-gradient-to-b from-black/70 via-black/50 to-black/80 group-hover:from-black/50 group-hover:via-black/30 group-hover:to-black/60' 
                        : 'bg-gradient-to-b from-black/80 via-black/70 to-black/90'
                    }`} />
                  )}
                  
                  {/* Fallback gradient if no background image */}
                  {!backgroundImage && (
                    <div className="absolute inset-0 bg-gradient-to-br from-amber-500/10 via-orange-500/5 to-amber-500/10 opacity-50" />
                  )}
                  
                  {/* Content at bottom */}
                  <div className="relative z-20 w-full flex flex-col items-center gap-2">
                    {/* Rarity box */}
                    <div 
                      className="px-3 py-1.5 rounded-lg font-medium text-xs backdrop-blur-sm border"
                      style={{
                        backgroundColor: boxColors.bg,
                        borderColor: boxColors.border,
                        color: boxColors.text
                      }}
                    >
                      {getRarityName(badge.rarity)}
                    </div>
                    
                    {/* Badge name */}
                    <div className={`text-sm font-semibold text-center leading-tight px-2 ${
                      badge.earned ? 'text-white group-hover:text-white' : 'text-gray-400'
                    }`}>
                      {badge.name.replace(' Badge', '')}
                    </div>
                    
                    {/* Earned indicator - date */}
                    {badge.earned && badge.unlocked_at && (
                      <div className="text-[10px] text-gray-300/70 mt-1">
                        {new Date(badge.unlocked_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                      </div>
                    )}
                  </div>
                  
                  {/* Lock overlay for unearned badges */}
                  {!badge.earned && (
                    <div className="absolute inset-0 flex items-center justify-center bg-black/30 backdrop-blur-[1px] z-10">
                      <Lock className="w-6 h-6 text-gray-500/50" />
                    </div>
                  )}
                </div>
              )
            })}
          </div>

          {filteredBadges.length === 0 && (
            <div className="text-center py-16 bg-white/5 rounded-2xl backdrop-blur-sm border border-white/10">
              <div className="text-8xl mb-4">🔍</div>
              <p className="text-gray-400 text-xl">No badges found with these filters</p>
              <button 
                onClick={() => {
                  setFilter('all')
                  setRarityFilter('all')
                }}
                className="mt-6 px-6 py-3 bg-gradient-to-r from-amber-500 to-orange-500 text-white rounded-xl hover:from-amber-400 hover:to-orange-400 transition-all font-medium shadow-lg"
              >
                Clear filters
              </button>
            </div>
          )}
        </div>
      </div>
    </>
  )
}
