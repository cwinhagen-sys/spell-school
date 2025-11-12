'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase/client'

export interface Badge {
  id: string
  title: string
  description: string
  icon: string
  category: 'daily' | 'achievement'
  rarity: 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary'
  earnedAt?: string
  questId?: string // For daily quest badges
}

export interface UserBadge {
  id: string
  badgeId: string
  earnedAt: string
}

export function useBadges() {
  const [badges, setBadges] = useState<Badge[]>([])
  const [userBadges, setUserBadges] = useState<UserBadge[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [newlyEarnedBadge, setNewlyEarnedBadge] = useState<Badge | null>(null)
  const [badgeQueue, setBadgeQueue] = useState<Badge[]>([])
  const [isAnimating, setIsAnimating] = useState(false)

  // Load all available badges from database
  const loadBadges = async () => {
    try {
      setLoading(true)
      
      // First try to load from database
      const { data: dbBadges, error: dbError } = await supabase
        .from('badges')
        .select('*')
        .order('created_at', { ascending: true })

      if (dbError) {
        console.warn('Could not load badges from database, using fallback:', dbError)
        // Fallback to hardcoded badges if database fails
        const fallbackBadges: Badge[] = [
          // Daily Quest Badges - Unika Trophy Designs
          { id: 'daily_word_warrior', title: 'Word Warrior', description: 'Complete 3 games of any type', icon: '🏆⚔️', category: 'daily', rarity: 'common', questId: 'play_3_games' },
          { id: 'daily_memory_champion', title: 'Memory Champion', description: 'Complete 2 Memory Games', icon: '🏆🧠', category: 'daily', rarity: 'common', questId: 'memory_2' },
          { id: 'daily_spelling_bee', title: 'Spelling Bee', description: 'Complete 1 Typing Challenge', icon: '🏆⌨️', category: 'daily', rarity: 'common', questId: 'typing_1' },
          { id: 'daily_choice_master', title: 'Choice Master', description: 'Complete 3 perfect games of multiple choice', icon: '🏆✅', category: 'daily', rarity: 'uncommon', questId: 'choice_3_perfect' },
          { id: 'daily_gap_filler', title: 'Gap Filler', description: 'Get a perfect result in sentence gap', icon: '🏆📝', category: 'daily', rarity: 'uncommon', questId: 'sentence_gap_perfect' },
          { id: 'daily_sentence_builder', title: 'Sentence Builder', description: 'Complete 2 Sentence Gap games', icon: '🏆📝', category: 'daily', rarity: 'rare', questId: 'sentence_gap_2' },
          { id: 'daily_roulette_master', title: 'Roulette Master', description: 'Get 3 perfect sentences in Word Roulette', icon: '🏆🎯', category: 'daily', rarity: 'rare', questId: 'roulette_3' },
          { id: 'daily_multi_game', title: 'Multi-Game Player', description: 'Play 4 different game types today', icon: '🏆🎮', category: 'daily', rarity: 'epic', questId: 'multi_game_4' },
          { id: 'daily_perfect_score', title: 'Perfect Score', description: 'Get 100% accuracy in any game', icon: '🏆💯', category: 'daily', rarity: 'epic', questId: 'perfect_score_1' },
          { id: 'daily_grammar_guru', title: 'Grammar Guru', description: 'Complete 5 Sentence Gap games perfectly', icon: '🏆📖', category: 'daily', rarity: 'legendary', questId: 'sentence_gap_5' },
          { id: 'daily_roulette_legend', title: 'Roulette Legend', description: 'Get 5 perfect sentences in Word Roulette', icon: '🏆👑', category: 'daily', rarity: 'legendary', questId: 'roulette_5' },
          { id: 'daily_marathon_runner', title: 'Marathon Runner', description: 'Complete 10 games in one day', icon: '🏆🏃‍♂️', category: 'daily', rarity: 'legendary', questId: 'marathon_10' },
          { id: 'daily_perfectionist', title: 'Perfectionist', description: 'Get 100% accuracy in 3 different games', icon: '🏆⭐', category: 'daily', rarity: 'legendary', questId: 'perfect_3' },
          { id: 'daily_quiz_god', title: 'Quiz God', description: 'Get 100% accuracy in Quiz', icon: '🏆🎓', category: 'daily', rarity: 'legendary', questId: 'quiz_perfect' },
          { id: 'daily_speed_god', title: 'Speed God', description: 'Complete Typing Challenge under 25 seconds', icon: '🏆⚡', category: 'daily', rarity: 'legendary', questId: 'typing_speed' },
          
          // Achievement Badges (placeholder for now)
          { id: 'achievement_first_game', title: 'First Steps', description: 'Play your first game', icon: '🎯', category: 'achievement', rarity: 'common' },
          { id: 'achievement_streak_3', title: 'Getting Hot', description: 'Play 3 days in a row', icon: '🔥', category: 'achievement', rarity: 'uncommon' },
          { id: 'achievement_streak_7', title: 'Week Warrior', description: 'Play 7 days in a row', icon: '📅', category: 'achievement', rarity: 'rare' },
          { id: 'achievement_streak_30', title: 'Monthly Master', description: 'Play 30 days in a row', icon: '📆', category: 'achievement', rarity: 'epic' },
          { id: 'achievement_level_10', title: 'Rising Star', description: 'Reach level 10', icon: '⭐', category: 'achievement', rarity: 'uncommon' },
          { id: 'achievement_level_25', title: 'Experienced Learner', description: 'Reach level 25', icon: '🌟', category: 'achievement', rarity: 'rare' },
          { id: 'achievement_level_50', title: 'Master Student', description: 'Reach level 50', icon: '🏆', category: 'achievement', rarity: 'epic' },
          { id: 'achievement_level_100', title: 'Legendary Scholar', description: 'Reach level 100', icon: '👑', category: 'achievement', rarity: 'legendary' },
        ]
        setBadges(fallbackBadges)
      } else if (dbBadges && dbBadges.length > 0) {
        // Convert database badges to our format
        const convertedBadges: Badge[] = dbBadges.map(dbBadge => {
          // Determine if it's a daily quest badge based on name and map to quest ID
          const questMapping: { [key: string]: string } = {
            'Word Warrior': 'play_3_games',
            'Memory Champion': 'memory_2',
            'Spelling Bee': 'typing_1',
            'Choice Master': 'choice_3_perfect',
            'Gap Filler': 'sentence_gap_perfect',
            'Sentence Builder': 'sentence_gap_2',
            'Roulette Master': 'roulette_3'
          }
          
          const questId = questMapping[dbBadge.name]
          const isDailyQuest = !!questId
          
          return {
            id: dbBadge.id,
            title: dbBadge.name,
            description: dbBadge.description,
            icon: dbBadge.icon,
            category: isDailyQuest ? 'daily' : 'achievement',
            rarity: dbBadge.rarity as 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary',
            questId: questId
          }
        })
        setBadges(convertedBadges)
      } else {
        // No badges in database, use fallback
        console.warn('No badges found in database, using fallback')
        const fallbackBadges: Badge[] = [
          { id: 'achievement_first_game', title: 'First Steps', description: 'Play your first game', icon: '🎯', category: 'achievement', rarity: 'common' },
        ]
        setBadges(fallbackBadges)
      }
    } catch (err) {
      setError('Failed to load badges')
      console.error('Error loading badges:', err)
    } finally {
      setLoading(false)
    }
  }

  // Load user's earned badges from database
  const loadUserBadges = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        console.log('No user logged in, skipping badge load')
        return
      }

      const { data: userBadgeData, error } = await supabase
        .from('user_badges')
        .select('*')
        .eq('user_id', user.id)
        .order('unlocked_at', { ascending: false })

      if (error) {
        console.error('Error loading user badges from database:', error)
        console.error('Error details:', {
          message: error.message,
          details: error.details,
          hint: error.hint,
          code: error.code
        })
        // Fallback to localStorage
        const stored = localStorage.getItem('userBadges')
        if (stored) {
          setUserBadges(JSON.parse(stored))
        }
        return
      }

      if (userBadgeData) {
        const convertedUserBadges: UserBadge[] = userBadgeData.map(ub => ({
          id: ub.id,
          badgeId: ub.badge_id,
          earnedAt: ub.unlocked_at
        }))
        setUserBadges(convertedUserBadges)
        console.log('Loaded user badges from database:', convertedUserBadges.length)
      }
    } catch (err) {
      console.error('Error loading user badges:', err)
      // Fallback to localStorage
      const stored = localStorage.getItem('userBadges')
      if (stored) {
        setUserBadges(JSON.parse(stored))
      }
    }
  }

  // Award a badge
  const awardBadge = async (badgeId: string) => {
    try {
      console.log('=== AWARD BADGE START ===')
      console.log('Attempting to award badge:', badgeId)
      
      const badge = badges.find(b => b.id === badgeId)
      if (!badge) {
        console.log('Badge not found:', badgeId)
        return
      }

      // Check if already earned
      if (userBadges.some(ub => ub.badgeId === badgeId)) {
        console.log('Badge already earned:', badgeId)
        return
      }

      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        console.log('No user logged in, cannot award badge')
        return
      }

      const newBadge: UserBadge = {
        id: `${badgeId}_${Date.now()}`,
        badgeId,
        earnedAt: new Date().toISOString()
      }

      // Save to database
      const { data: insertData, error: dbError } = await supabase
        .from('user_badges')
        .insert({
          user_id: user.id,
          badge_id: badgeId,
          unlocked_at: newBadge.earnedAt,
          progress: 1
        })
        .select()

      if (dbError) {
        console.error('Error saving badge to database:', dbError)
        console.error('Error details:', {
          message: dbError.message,
          details: dbError.details,
          hint: dbError.hint,
          code: dbError.code
        })
        // Still update local state for immediate feedback
      } else {
        console.log('Badge saved to database successfully:', insertData)
      }

      // Update local state
      const updatedBadges = [...userBadges, newBadge]
      setUserBadges(updatedBadges)
      
      // Also save to localStorage as backup
      localStorage.setItem('userBadges', JSON.stringify(updatedBadges))

      console.log('Badge awarded successfully:', badge.title)
      console.log('Updated user badges:', updatedBadges.length)
      console.log('Badge details:', {
        badgeId: badge.id,
        badgeTitle: badge.title,
        category: badge.category,
        questId: badge.questId,
        earnedAt: newBadge.earnedAt
      })
      console.log('All user badges after award:', updatedBadges.map(ub => ({ id: ub.badgeId, earnedAt: ub.earnedAt })))
      console.log('=== AWARD BADGE END ===')

      // Add badge to animation queue
      setBadgeQueue(prev => [...prev, badge])

      return newBadge
    } catch (err) {
      console.error('Error awarding badge:', err)
    }
  }

  // Check and award achievement badges (only streaks now)
  const checkAchievements = async (userLevel: number, currentStreak: number = 0) => {
    try {
      // Only streak achievements - no level achievements
      const streakAchievements = [
        { streak: 3, badgeId: 'achievement_streak_3' },
        { streak: 7, badgeId: 'achievement_streak_7' },
        { streak: 30, badgeId: 'achievement_streak_30' }
      ]

      for (const achievement of streakAchievements) {
        if (currentStreak >= achievement.streak && !hasBadge(achievement.badgeId)) {
          console.log(`Awarding streak achievement: ${achievement.badgeId} for streak ${currentStreak}`)
          await awardBadge(achievement.badgeId)
        }
      }
    } catch (err) {
      console.error('Error checking achievements:', err)
    }
  }

  // Check if user has a specific badge
  const hasBadge = (badgeId: string): boolean => {
    return userBadges.some(ub => ub.badgeId === badgeId)
  }

  // Remove a badge (for debugging/correction)
  const removeBadge = async (badgeId: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        // Remove from database
        await supabase
          .from('user_badges')
          .delete()
          .eq('user_id', user.id)
          .eq('badge_id', badgeId)
      }

      // Update local state
      const updatedBadges = userBadges.filter(ub => ub.badgeId !== badgeId)
      setUserBadges(updatedBadges)
      localStorage.setItem('userBadges', JSON.stringify(updatedBadges))
      console.log('Removed badge:', badgeId)
    } catch (err) {
      console.error('Error removing badge:', err)
    }
  }

  // Get user's badges by category
  const getUserBadgesByCategory = (category: 'daily' | 'achievement'): Badge[] => {
    console.log('getUserBadgesByCategory Debug:', {
      category,
      userBadges: userBadges.length,
      userBadgeIds: userBadges.map(ub => ub.badgeId),
      allBadges: badges.length,
      allBadgeIds: badges.map(b => b.id),
      userBadgesDetails: userBadges,
      allBadgesDetails: badges.filter(b => b.category === category)
    })
    
    const result = userBadges
      .map(ub => badges.find(b => b.id === ub.badgeId))
      .filter((badge): badge is Badge => badge !== undefined && badge.category === category)
      .map(badge => ({
        ...badge,
        earnedAt: userBadges.find(ub => ub.badgeId === badge.id)?.earnedAt
      }))
    
    console.log('getUserBadgesByCategory Result:', {
      category,
      result: result.length,
      badges: result.map(b => ({ id: b.id, title: b.title, earnedAt: b.earnedAt }))
    })
    
    return result
  }

  // Get badges that can be earned from daily quests
  const getDailyQuestBadges = (): Badge[] => {
    const result = badges.filter(badge => badge.category === 'daily' && badge.questId)
    console.log('getDailyQuestBadges Debug:', {
      totalBadges: badges.length,
      dailyBadges: result.length,
      badges: result.map(b => ({ id: b.id, title: b.title, questId: b.questId }))
    })
    return result
  }

  // Get rarity color
  const getRarityColor = (rarity: string): string => {
    const colors = {
      common: 'text-gray-600',
      uncommon: 'text-green-600',
      rare: 'text-blue-600',
      epic: 'text-purple-600',
      legendary: 'text-yellow-600'
    }
    return colors[rarity as keyof typeof colors] || colors.common
  }

  // Get rarity background color
  const getRarityBgColor = (rarity: string): string => {
    const colors = {
      common: 'bg-gray-100',
      uncommon: 'bg-green-100',
      rare: 'bg-blue-100',
      epic: 'bg-purple-100',
      legendary: 'bg-yellow-100'
    }
    return colors[rarity as keyof typeof colors] || colors.common
  }

  // Process badge animation queue
  useEffect(() => {
    if (badgeQueue.length > 0 && !isAnimating) {
      const nextBadge = badgeQueue[0]
      setNewlyEarnedBadge(nextBadge)
      setIsAnimating(true)
      setBadgeQueue(prev => prev.slice(1))
    }
  }, [badgeQueue, isAnimating])

  // Handle animation completion
  const handleAnimationComplete = () => {
    setNewlyEarnedBadge(null)
    setIsAnimating(false)
  }

  // Auto-migration function
  const autoMigrateIfNeeded = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      // Check if user has badges in database
      const { data: dbBadges, error: dbError } = await supabase
        .from('user_badges')
        .select('*')
        .eq('user_id', user.id)

      if (dbError) return

      // Check if user has badges in localStorage
      const storedBadges = localStorage.getItem('userBadges')
      const hasLocalBadges = storedBadges && JSON.parse(storedBadges).length > 0

      // Migration needed if user has localStorage badges but no database badges
      if (hasLocalBadges && dbBadges.length === 0) {
        console.log('Auto-migrating badges from localStorage to database...')
        const userBadges = JSON.parse(storedBadges)
        const badgeIds = userBadges.map((ub: any) => ub.badgeId)
        
        const { data: migratedCount, error: migrateError } = await supabase.rpc('migrate_localStorage_badges', {
          user_id: user.id,
          badge_ids: badgeIds
        })

        if (!migrateError && migratedCount > 0) {
          console.log(`Successfully migrated ${migratedCount} badges to database`)
          // Reload user badges after migration
          await loadUserBadges()
        }
      }
    } catch (error) {
      console.error('Auto-migration failed:', error)
    }
  }

  useEffect(() => {
    // ⚡ OPTIMIZE: Load badges and user badges in parallel
    const initializeBadges = async () => {
      await Promise.all([
        loadBadges(),
        loadUserBadges()
      ])
      // Run migration after initial load
      await autoMigrateIfNeeded()
    }
    initializeBadges()
  }, [])

  // Check and award badges based on game completion
  const checkGameBadges = async (gameType: string, score?: number, accuracy?: number) => {
    // Disabled - only daily quests should work
    return
  }

  return {
    badges,
    userBadges,
    loading,
    error,
    newlyEarnedBadge,
    setNewlyEarnedBadge,
    badgeQueue,
    isAnimating,
    handleAnimationComplete,
    loadBadges,
    loadUserBadges,
    awardBadge,
    hasBadge,
    removeBadge,
    getUserBadgesByCategory,
    getDailyQuestBadges,
    getRarityColor,
    getRarityBgColor,
    checkAchievements,
    checkGameBadges
  }
}