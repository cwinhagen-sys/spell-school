'use client'

import { useState, useEffect, useRef } from 'react'
import { supabase } from '@/lib/supabase'

export interface DailyQuestBadge {
  id: string
  name: string
  description: string
  icon: string
  category: string
  rarity: 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary'
  quest_id: string
  unlocked_at?: string
  earned: boolean
}

export interface UserDailyQuestBadge {
  id: string
  user_id: string
  badge_id: string
  unlocked_at: string
}

export function useDailyQuestBadges() {
  const [badges, setBadges] = useState<DailyQuestBadge[]>([])
  const [userBadges, setUserBadges] = useState<UserDailyQuestBadge[]>([])
  const [badgesWithStatus, setBadgesWithStatus] = useState<DailyQuestBadge[]>([])
  const [recentBadges, setRecentBadges] = useState<DailyQuestBadge[]>([])
  const [stats, setStats] = useState({
    total: 0,
    earned: 0,
    percentage: 0,
    byRarity: { common: 0, uncommon: 0, rare: 0, epic: 0, legendary: 0 }
  })
  const [loading, setLoading] = useState(true)
  const [newBadge, setNewBadge] = useState<DailyQuestBadge | null>(null)
  const [initialized, setInitialized] = useState(false)
  
  // 🔒 Prevent duplicate initialization (React Strict Mode protection)
  const isInitializing = useRef(false)
  const hasInitialized = useRef(false)

  // Load badges from localStorage first, then sync from database
  const loadBadges = async () => {
    try {
      // Load from localStorage immediately for instant UI
      const cachedBadges = localStorage.getItem('daily_quest_badges')
      if (cachedBadges) {
        const parsedBadges = JSON.parse(cachedBadges)
        setBadges(parsedBadges)
        console.log('Loaded badges from localStorage:', parsedBadges.length)
      }

      // Then sync from database in background
      const { data, error } = await supabase
        .from('badges')
        .select('id, name, description, icon, category, rarity, quest_id, created_at, updated_at')
        .not('quest_id', 'is', null)
        .order('rarity', { ascending: true })

      if (error) {
        console.warn('Warning: Could not load badges from database (non-critical):', error.message || error)
        return
      }

      if (data && data.length > 0) {
        const badgesWithEarned = data.map(badge => ({
          ...badge,
          earned: false // Will be updated based on user progress
        }))
        setBadges(badgesWithEarned)
        // Update localStorage cache
        localStorage.setItem('daily_quest_badges', JSON.stringify(data))
        console.log('Synced badges from database:', data.length)
      }
    } catch (error) {
      console.warn('Warning: Error loading badges (non-critical):', error instanceof Error ? error.message : String(error))
    }
  }

  // Load user's earned badges from localStorage first, then sync from database
  const loadUserBadges = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      // Load from localStorage immediately for instant UI
      const userKey = `user_badges_${user.id}`
      const cachedUserBadges = localStorage.getItem(userKey)
      let localBadges: any[] = []
      
      if (cachedUserBadges) {
        const parsedUserBadges = JSON.parse(cachedUserBadges)
        localBadges = parsedUserBadges
        setUserBadges(parsedUserBadges)
        console.log('Loaded user badges from localStorage:', parsedUserBadges.length)
      }

      // Then sync from database in background
      const { data, error } = await supabase
        .from('user_badges')
        .select('id, user_id, badge_id, unlocked_at')
        .eq('user_id', user.id)
        .order('unlocked_at', { ascending: false })

      if (error) {
        console.warn('Warning: Could not load user badges from database (non-critical):', error.message || error)
        return
      }

      if (data) {
        // NEVER LOSE BADGES: Merge database badges with local badges (union)
        // This protects against database sync failures
        const dbBadgeIds = new Set(data.map(b => b.badge_id))
        const localOnlyBadges = localBadges.filter((b: any) => !dbBadgeIds.has(b.badge_id))
        
        let mergedBadges = [...data]
        
        if (localOnlyBadges.length > 0) {
          console.warn(`⚠️ Found ${localOnlyBadges.length} badges in localStorage that are NOT in database!`)
          console.log('Local-only badges:', localOnlyBadges.map((b: any) => b.badge_id))
          
          // Keep local badges too (never lose badges)
          mergedBadges = [...data, ...localOnlyBadges]
          console.log('🛡️ Protected: Merged local badges with database badges')
          
          // Try to sync these to database in background
          setTimeout(async () => {
            for (const badge of localOnlyBadges) {
              try {
                await supabase
                  .from('user_badges')
                  .insert({
                    user_id: user.id,
                    badge_id: badge.badge_id,
                    unlocked_at: badge.unlocked_at || new Date().toISOString()
                  })
                console.log('✅ Recovered and synced local-only badge to database:', badge.badge_id)
              } catch (err) {
                console.error('Failed to sync local-only badge:', badge.badge_id, err)
              }
            }
          }, 2000)
        }
        
        setUserBadges(mergedBadges)
        // Update localStorage cache with merged data
        localStorage.setItem(userKey, JSON.stringify(mergedBadges))
        console.log('Synced user badges from database:', data.length, '(Total with local:', mergedBadges.length, ')')
      }
    } catch (error) {
      console.warn('Warning: Error loading user badges (non-critical):', error instanceof Error ? error.message : String(error))
    }
  }

  // Award a badge for completing a daily quest for the first time - INSTANT LOCAL-FIRST
  const awardBadgeForQuest = async (questId: string, userId?: string) => {
    try {
      console.log('🎖️ [INSTANT] Attempting to award badge for quest:', questId)
      console.log('🎖️ Current badges in memory:', badges.length)
      console.log('🎖️ Current user badges:', userBadges.length)

      // ⚡ OPTIMIZATION: Use passed userId to avoid async getUser() call
      let user_id = userId
      
      if (!user_id) {
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) {
          console.log('No user logged in, cannot award badge')
          return false
        }
        user_id = user.id
      }

      console.log('🎖️ User:', user_id)
      const userKey = `user_badges_${user_id}`

      // INSTANT LOCAL CHECK - Use cached data first for immediate response
      let currentBadges = badges
      let currentUserBadges = userBadges

      // If badges not loaded in memory, try localStorage cache first
      if (currentBadges.length === 0) {
        const cachedBadges = localStorage.getItem('daily_quest_badges')
        if (cachedBadges) {
          try {
            currentBadges = JSON.parse(cachedBadges).map((badge: any) => ({
              ...badge,
              earned: false // Will be updated based on user progress
            }))
            setBadges(currentBadges)
            console.log('🎖️ Loaded badges from localStorage cache for instant response')
          } catch (error) {
            console.warn('Failed to parse cached badges:', error)
            currentBadges = []
          }
        }
      }

      // If user badges not loaded in memory, try localStorage cache first
      if (currentUserBadges.length === 0) {
        const cachedUserBadges = localStorage.getItem(userKey)
        if (cachedUserBadges) {
          try {
            currentUserBadges = JSON.parse(cachedUserBadges)
            setUserBadges(currentUserBadges)
            console.log('🎖️ Loaded user badges from localStorage cache for instant response')
          } catch (error) {
            console.warn('Failed to parse cached user badges:', error)
            currentUserBadges = []
          }
        }
      }

      // Find the badge for this quest
      let badge = currentBadges.find(b => b.quest_id === questId)
      
      // If badge not found in cache, try loading from database first (with timeout)
      if (!badge) {
        console.log('🎖️ No badge found in cache for quest:', questId, '- Loading from database...')
        
        try {
          // TRY to load badge from database with a timeout
          const { data: badgeData, error } = await Promise.race([
            supabase
              .from('badges')
              .select('id, name, description, icon, category, rarity, quest_id, created_at, updated_at')
              .eq('quest_id', questId)
              .maybeSingle(),
            new Promise((_, reject) => 
              setTimeout(() => reject(new Error('Timeout')), 500)
            )
          ]) as any
          
          if (!error && badgeData) {
            console.log('🎖️ Found badge in database:', badgeData)
            const newBadge: DailyQuestBadge = {
              ...badgeData,
              earned: false
            }
            badge = newBadge
            
            // Add to cache
            currentBadges = [...currentBadges, newBadge]
            setBadges(currentBadges)
            localStorage.setItem('daily_quest_badges', JSON.stringify(currentBadges))
          } else {
            console.warn('🎖️ No badge found in database for quest:', questId)
            badge = {
              id: `temp-${questId}`,
              name: `Quest Badge`,
              description: `Badge for completing ${questId}`,
              icon: '🏆',
              category: 'daily',
              rarity: 'common' as const,
              quest_id: questId,
              earned: false
            }
          }
        } catch (error) {
          console.warn('🎖️ Error loading badge from database (timeout or error):', error)
          badge = {
            id: `temp-${questId}`,
            name: `Quest Badge`,
            description: `Badge for completing ${questId}`,
            icon: '🏆',
            category: 'daily',
            rarity: 'common' as const,
            quest_id: questId,
            earned: false
          }
        }
        
        // Ensure badge is defined before using it
        if (!badge) {
          badge = {
            id: `temp-${questId}`,
            name: `Quest Badge`,
            description: `Badge for completing ${questId}`,
            icon: '🏆',
            category: 'daily',
            rarity: 'common' as const,
            quest_id: questId,
            earned: false
          }
        }
      }
      
      console.log('🎖️ Badge to award:', badge.name, badge.icon)

      // Check if user already has this badge (instant local check)
      const alreadyEarned = currentUserBadges.some(ub => ub.badge_id === badge.id)
      if (alreadyEarned) {
        console.log('Badge already earned for quest:', questId)
        return false // Return false for already earned
      }

      const now = new Date().toISOString()
      const tempUserBadge = {
        id: `temp-${Date.now()}`, // Temporary ID
        user_id: user_id,
        badge_id: badge.id,
        unlocked_at: now
      }

      // INSTANT LOCAL UPDATES - No delay whatsoever
      const updatedCachedBadges = [tempUserBadge, ...currentUserBadges]
      localStorage.setItem(userKey, JSON.stringify(updatedCachedBadges))

      // Update React state immediately for instant UI feedback
      setUserBadges(updatedCachedBadges)
      
      // Trigger badge animation immediately
      const newBadgeData = {
        ...badge,
        earned: true,
        unlocked_at: now
      }
      
      console.log('🎖️ Triggering badge animation for:', newBadgeData.name, newBadgeData.icon)
      
      // Use animation queue if enabled (Phase 1), otherwise old behavior
      if (typeof window !== 'undefined') {
        try {
          const { animationQueue } = await import('@/lib/animationQueue')
          const { isFeatureEnabled } = await import('@/lib/featureFlags')
          
          if (isFeatureEnabled('USE_ANIMATION_QUEUE')) {
            console.log('🎬 [Phase1] Enqueuing badge animation:', newBadgeData.name)
            animationQueue.enqueue('badge', newBadgeData)
          } else {
            console.log('🎬 [OLD] Setting new badge directly:', newBadgeData.name)
            setNewBadge(newBadgeData)
          }
        } catch (importErr) {
          console.log('🎬 [FALLBACK] Using fallback setNewBadge:', newBadgeData.name)
          setNewBadge(newBadgeData)
        }
      } else {
        console.log('🎬 [SSR] Setting new badge (SSR):', newBadgeData.name)
        setNewBadge(newBadgeData)
      }

      // Force immediate recent badges update - always update recent badges instantly
      const immediateRecentBadges = [newBadgeData, ...currentUserBadges.slice(0, 4).map(userBadge => {
        const existingBadge = currentBadges.find(b => b.id === userBadge.badge_id)
        return existingBadge ? {
          ...existingBadge,
          earned: true,
          unlocked_at: userBadge.unlocked_at
        } : {
          id: userBadge.badge_id,
          name: `Badge ${userBadge.badge_id}`,
          description: 'Recently earned badge',
          icon: '🏆',
          category: 'daily',
          rarity: 'common' as const,
          quest_id: userBadge.badge_id,
          earned: true,
          unlocked_at: userBadge.unlocked_at
        }
      })].sort((a, b) => {
        // Sort by date (newest first)
        if (a.unlocked_at && b.unlocked_at) {
          return new Date(b.unlocked_at).getTime() - new Date(a.unlocked_at).getTime()
        }
        return 0
      })
      setRecentBadges(immediateRecentBadges)
      console.log('🎖️ Recent badges updated instantly with new badge (sorted):', newBadgeData.name)
      
      // Force a second update after a small delay to ensure UI sync
      setTimeout(() => {
        // Re-compute recent badges to ensure they're up to date
        if (userBadges.length > 0) {
          const recentUserBadges = userBadges.slice(0, 5)
          const recentBadgesComputed = recentUserBadges.map(userBadge => {
            const badge = badges.find(b => b.id === userBadge.badge_id)
            if (!badge) {
              return {
                id: userBadge.badge_id,
                name: `Badge ${userBadge.badge_id}`,
                description: 'Recently earned badge',
                icon: '🏆',
                category: 'daily',
                rarity: 'common' as const,
                quest_id: userBadge.badge_id,
                earned: true,
                unlocked_at: userBadge.unlocked_at
              }
            }
            return {
              ...badge,
              earned: true,
              unlocked_at: userBadge.unlocked_at
            }
          }).filter(Boolean) as DailyQuestBadge[]
          
          const sortedRecentBadges = recentBadgesComputed.sort((a, b) => {
            if (a.unlocked_at && b.unlocked_at) {
              return new Date(b.unlocked_at).getTime() - new Date(a.unlocked_at).getTime()
            }
            return 0
          })
          
          setRecentBadges(sortedRecentBadges)
          console.log('🎖️ Recent badges double-checked after badge award:', sortedRecentBadges.length)
        }
      }, 50)

      console.log('🎖️ Badge awarded INSTANTLY locally and animation triggered:', badge.name)
      console.log('🎖️ Recent badges updated instantly with count:', immediateRecentBadges.length)
      
      // Backup badges after awarding (for safety)
      setTimeout(() => backupBadges(), 200)
      
      // Background database sync (non-blocking but WITH error handling and retry)
      setTimeout(async () => {
        try {
          const { data, error } = await supabase
            .from('user_badges')
            .insert({
              user_id: user_id,
              badge_id: badge.id,
              unlocked_at: now
            })
            .select()
            .single()

          if (error) {
            // Check if error is due to duplicate (already exists)
            if (error.code === '23505' || error.message.includes('duplicate')) {
              console.log('🎖️ Badge already exists in database (duplicate), skipping:', badge.name)
              return
            }
            
            console.error('❌ CRITICAL: Background badge sync failed:', {
              error: error.message || error,
              badge: badge.name,
              badge_id: badge.id,
              user_id: user_id,
              errorCode: error.code
            })
            
            // Retry once after 2 seconds
            setTimeout(async () => {
              console.log('🔄 Retrying badge sync for:', badge.name)
              try {
                const { data: retryData, error: retryError } = await supabase
                  .from('user_badges')
                  .insert({
                    user_id: user_id,
                    badge_id: badge.id,
                    unlocked_at: now
                  })
                  .select()
                  .single()
                
                if (retryError) {
                  if (retryError.code === '23505' || retryError.message.includes('duplicate')) {
                    console.log('🎖️ Badge already exists on retry (duplicate), this is OK')
                    return
                  }
                  console.error('❌ CRITICAL: Badge sync retry FAILED:', {
                    error: retryError.message,
                    badge: badge.name
                  })
                } else {
                  console.log('✅ Badge sync retry succeeded:', badge.name)
                }
              } catch (retryErr) {
                console.error('❌ Badge sync retry exception:', retryErr)
              }
            }, 2000)
            return
          }

          // Update localStorage with real database ID
          const finalCachedBadges = updatedCachedBadges.map(ub => 
            ub.id === tempUserBadge.id ? {
              ...data,
              unlocked_at: data.unlocked_at
            } : ub
          )
          localStorage.setItem(userKey, JSON.stringify(finalCachedBadges))

          // Update React state with real ID
          setUserBadges(finalCachedBadges)

          // Create backup after successful database sync
          setTimeout(() => backupBadges(), 100)

          console.log('✅ 🎖️ Badge synced to database successfully:', badge.name, 'DB ID:', data.id)
        } catch (error) {
          console.error('❌ CRITICAL: Background badge sync exception:', {
            error: error instanceof Error ? error.message : String(error),
            badge: badge.name
          })
        }
      }, 100) // Small delay to not block UI

      return true // Badge awarded successfully
    } catch (error) {
      console.warn('Warning: Error awarding badge for quest (non-critical):', error instanceof Error ? error.message : String(error))
      setNewBadge(null)
      return false
    }
  }


  // Update computed values when badges or userBadges change
  useEffect(() => {
    // Always compute recent badges even if badges are not loaded yet
    if (userBadges.length > 0) {
      const recentUserBadges = userBadges.slice(0, 5)
      const recentBadgesComputed = recentUserBadges.map(userBadge => {
        const badge = badges.find(b => b.id === userBadge.badge_id)
        if (!badge) {
          // If badge not found in loaded badges, create a placeholder
          return {
            id: userBadge.badge_id,
            name: `Badge ${userBadge.badge_id}`,
            description: 'Recently earned badge',
            icon: '🏆',
            category: 'daily',
            rarity: 'common' as const,
            quest_id: userBadge.badge_id,
            earned: true,
            unlocked_at: userBadge.unlocked_at
          }
        }
        return {
          ...badge,
          earned: true,
          unlocked_at: userBadge.unlocked_at
        }
      }).filter(Boolean) as DailyQuestBadge[]
      
      // Sort recent badges by date (newest first)
      const sortedRecentBadges = recentBadgesComputed.sort((a, b) => {
        if (a.unlocked_at && b.unlocked_at) {
          return new Date(b.unlocked_at).getTime() - new Date(a.unlocked_at).getTime()
        }
        return 0
      })
      
      setRecentBadges(sortedRecentBadges)
      console.log('🎖️ Recent badges updated and sorted:', sortedRecentBadges.length)
    }

    if (badges.length === 0) return

    // Create a map for O(1) lookups
    const userBadgeMap = new Map(userBadges.map(ub => [ub.badge_id, ub]))
    
    // Compute badges with status
    const badgesWithStatusComputed = badges.map(badge => {
      const userBadge = userBadgeMap.get(badge.id)
      return {
        ...badge,
        earned: !!userBadge,
        unlocked_at: userBadge?.unlocked_at
      }
    })
    setBadgesWithStatus(badgesWithStatusComputed)

    // Compute stats
    const earnedByRarity = { common: 0, uncommon: 0, rare: 0, epic: 0, legendary: 0 }
    userBadges.forEach(userBadge => {
      const badge = badges.find(b => b.id === userBadge.badge_id)
      if (badge) {
        earnedByRarity[badge.rarity]++
      }
    })

    setStats({
      total: badges.length,
      earned: userBadges.length,
      percentage: badges.length > 0 ? Math.round((userBadges.length / badges.length) * 100) : 0,
      byRarity: earnedByRarity
    })
  }, [badges, userBadges])

  // Initialize with INSTANT localStorage loading, then background sync
  useEffect(() => {
    const init = async () => {
      // 🔒 GUARD: Prevent duplicate initialization (React Strict Mode protection)
      if (isInitializing.current || hasInitialized.current) {
        console.log('⏭️ Badge initialization: Already initializing or initialized, skipping')
        return
      }
      
      isInitializing.current = true
      console.log('🚀 Badge initialization: Starting (first time only)')
      
      // INSTANT: Load from localStorage FIRST (synchronous, no await)
      const hasCachedBadges = typeof window !== 'undefined' && localStorage.getItem('daily_quest_badges')
      
      if (hasCachedBadges) {
        try {
          const cachedBadges = JSON.parse(localStorage.getItem('daily_quest_badges')!)
          setBadges(cachedBadges)
          console.log('⚡ INSTANT badge load from cache:', cachedBadges.length)
        } catch (e) {
          console.warn('Failed to parse cached badges')
        }
        
        // Instant loading from cache - no loading state needed
        setLoading(false)
        setInitialized(true)
      } else {
        setLoading(true)
      }
      
      // Load user data and user badges INSTANTLY from localStorage
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        // INSTANT: Load user badges from localStorage FIRST
        const userKey = `user_badges_${user.id}`
        const cachedUserBadges = localStorage.getItem(userKey)
        if (cachedUserBadges) {
          try {
            const parsedUserBadges = JSON.parse(cachedUserBadges)
            setUserBadges(parsedUserBadges)
            console.log('⚡ INSTANT user badges load from cache:', parsedUserBadges.length)
          } catch (e) {
            console.warn('Failed to parse cached user badges')
          }
        }
        
        // Clear any cross-user badge data on login (but be more careful)
        const otherUserBadgeKeys = Object.keys(localStorage).filter(key => 
          key.startsWith('user_badges_') && key !== userKey && !key.includes('backup')
        )
        otherUserBadgeKeys.forEach(key => {
          console.log('Clearing cross-user badge data:', key)
          localStorage.removeItem(key)
        })
        
        // If badges not already loaded from cache at the top, try again here
        if (!hasCachedBadges) {
          const cachedBadges = localStorage.getItem('daily_quest_badges')
          if (cachedBadges) {
            try {
              const parsedBadges = JSON.parse(cachedBadges)
              setBadges(parsedBadges)
              console.log('⚡ Instant badges loaded from localStorage:', parsedBadges.length)
            } catch (error) {
              console.warn('Failed to parse cached badges, will load from database')
              localStorage.removeItem('daily_quest_badges') // Remove corrupted cache
            }
          }
        }
        
        if (!hasCachedBadges && badges.length === 0) {
          // Create default badge set for instant display
          const defaultBadges: DailyQuestBadge[] = [
            { id: 'daily_word_warrior', name: 'Word Warrior', description: 'Complete 3 games of any type', icon: '🏆⚔️', category: 'daily', rarity: 'common', quest_id: 'play_3_games', earned: false },
            { id: 'daily_memory_champion', name: 'Memory Champion', description: 'Complete 2 Memory Games', icon: '🏆🧠', category: 'daily', rarity: 'common', quest_id: 'memory_2', earned: false },
            { id: 'daily_spelling_bee', name: 'Spelling Bee', description: 'Complete 1 Typing Challenge', icon: '🏆⌨️', category: 'daily', rarity: 'common', quest_id: 'typing_1', earned: false },
            { id: 'daily_choice_master', name: 'Choice Master', description: 'Complete 3 perfect games of multiple choice', icon: '🏆✅', category: 'daily', rarity: 'uncommon', quest_id: 'choice_3_perfect', earned: false },
            { id: 'daily_gap_filler', name: 'Gap Filler', description: 'Get a perfect result in sentence gap', icon: '🏆📝', category: 'daily', rarity: 'uncommon', quest_id: 'sentence_gap_perfect', earned: false },
            { id: 'daily_sentence_builder', name: 'Sentence Builder', description: 'Complete 2 Sentence Gap games', icon: '🏆📝', category: 'daily', rarity: 'rare', quest_id: 'sentence_gap_2', earned: false },
            { id: 'daily_roulette_master', name: 'Roulette Master', description: 'Get 3 perfect sentences in Word Roulette', icon: '🏆🎯', category: 'daily', rarity: 'rare', quest_id: 'roulette_3', earned: false },
            { id: 'daily_multi_game_player', name: 'Multi-Game Player', description: 'Play 4 different game types today', icon: '🏆🎮', category: 'daily', rarity: 'epic', quest_id: 'multi_game_4', earned: false },
            { id: 'daily_quiz_god', name: 'Quiz God', description: 'Get a perfect score in Quiz Game', icon: '🏆🧠', category: 'daily', rarity: 'epic', quest_id: 'quiz_perfect', earned: false },
            { id: 'daily_roulette_pro', name: 'Roulette Pro', description: 'Get 5 perfect sentences in Word Roulette', icon: '🏆🎲', category: 'daily', rarity: 'epic', quest_id: 'roulette_5', earned: false },
            { id: 'daily_perfect_3', name: 'Perfect 3', description: 'Get perfect scores in 3 different game types', icon: '🏆⭐', category: 'daily', rarity: 'legendary', quest_id: 'perfect_3', earned: false },
            { id: 'daily_perfect_score', name: 'Perfect Score', description: 'Get a perfect score in any game', icon: '🏆💯', category: 'daily', rarity: 'legendary', quest_id: 'perfect_score_1', earned: false },
            { id: 'daily_marathon', name: 'Marathon Runner', description: 'Complete 10 games in one day', icon: '🏆🏃', category: 'daily', rarity: 'legendary', quest_id: 'marathon_10', earned: false },
            { id: 'daily_spell_casting_master', name: 'Spell Casting Master', description: 'Score 1500+ points in Spell Casting Challenge', icon: '🏆🔮', category: 'daily', rarity: 'legendary', quest_id: 'spell_casting_1500', earned: false },
            { id: 'daily_all_quests_bonus', name: 'Quest Master', description: 'Complete all daily quests in one day', icon: '🏆👑', category: 'daily', rarity: 'legendary', quest_id: 'all_quests_bonus', earned: false }
          ]
          setBadges(defaultBadges)
          localStorage.setItem('daily_quest_badges', JSON.stringify(defaultBadges))
          console.log('Default badges set loaded instantly:', defaultBadges.length)
        }
      }

      // Set initialized and loading states immediately after cache loading
      setInitialized(true)
      setLoading(false)
      console.log('🎖️ Badge system initialized instantly')
      
      // Load badges immediately ONLY if not in localStorage (instant loading)
      if (!hasCachedBadges) {
        console.log('No badges in localStorage, loading immediately...')
        await loadBadges()
      } else {
        console.log('Badges loaded instantly from cache, skipping immediate database load')
      }
      
      // Background sync from database (silent, non-blocking)
      setTimeout(async () => {
        try {
          await Promise.all([loadBadges(), loadUserBadges()])
          console.log('Background sync completed')
          
          // Auto-sync: Check if there are badges in localStorage that are missing from database
          if (user) {
            const userKey = `user_badges_${user.id}`
            const localStorageData = localStorage.getItem(userKey)
            
            if (localStorageData) {
              const localBadges = JSON.parse(localStorageData)
              
              if (localBadges.length > 0) {
                // Get database badges
                const { data: dbBadges } = await supabase
                  .from('user_badges')
                  .select('badge_id')
                  .eq('user_id', user.id)
                
                const dbBadgeIds = new Set(dbBadges?.map(b => b.badge_id) || [])
                
                // Find missing badges
                const missingBadges = localBadges.filter((b: any) => !dbBadgeIds.has(b.badge_id))
                
                if (missingBadges.length > 0) {
                  console.log(`🔧 Auto-sync: Found ${missingBadges.length} badges in localStorage missing from database, syncing...`)
                  
                  for (const badge of missingBadges) {
                    try {
                      const { error } = await supabase
                        .from('user_badges')
                        .insert({
                    user_id: user.id,
                    badge_id: badge.badge_id,
                    unlocked_at: badge.unlocked_at || new Date().toISOString()
                  })
                      
                      if (error) {
                        if (error.code !== '23505' && !error.message.includes('duplicate')) {
                          console.error('❌ Failed to auto-sync badge:', badge.badge_id, error.message)
                        }
                      } else {
                        console.log('✅ Auto-synced badge:', badge.badge_id)
                      }
                    } catch (err) {
                      console.error('❌ Auto-sync exception:', err)
                    }
                  }
                  
                  // Reload after sync
                  await loadUserBadges()
                  console.log('✅ Auto-sync complete, reloaded badges')
                } else {
                  console.log('✅ All localStorage badges are in database')
                }
              }
            }
          }
        } catch (error) {
          console.warn('Background sync failed (non-critical):', error)
        } finally {
          // Mark initialization as complete
          isInitializing.current = false
          hasInitialized.current = true
          console.log('✅ Badge initialization: Complete')
        }
      }, 1000) // Longer delay to not interfere with instant loading
      
      // Mark initialization as started (but background sync continues)
      hasInitialized.current = true
      isInitializing.current = false
    }

    init()
  }, [])

  // Function to manually refresh recent badges (useful after fly animation)
  const refreshRecentBadges = () => {
    console.log('🔄 Manually refreshing recent badges...')
    if (userBadges.length > 0) {
      const recentUserBadges = userBadges.slice(0, 5)
      const recentBadgesComputed = recentUserBadges.map(userBadge => {
        const badge = badges.find(b => b.id === userBadge.badge_id)
        if (!badge) {
          // If badge not found in loaded badges, create a placeholder
          return {
            id: userBadge.badge_id,
            name: `Badge ${userBadge.badge_id}`,
            description: 'Recently earned badge',
            icon: '🏆',
            category: 'daily',
            rarity: 'common' as const,
            quest_id: userBadge.badge_id,
            earned: true,
            unlocked_at: userBadge.unlocked_at
          }
        }
        return {
          ...badge,
          earned: true,
          unlocked_at: userBadge.unlocked_at
        }
      }).filter(Boolean) as DailyQuestBadge[]
      
      // Sort recent badges by date (newest first)
      const sortedRecentBadges = recentBadgesComputed.sort((a, b) => {
        if (a.unlocked_at && b.unlocked_at) {
          return new Date(b.unlocked_at).getTime() - new Date(a.unlocked_at).getTime()
        }
        return 0
      })
      
      setRecentBadges(sortedRecentBadges)
      console.log('🎖️ Recent badges manually refreshed:', sortedRecentBadges.length)
    }
  }

  // Function to backup badges to localStorage (for safety)
  const backupBadges = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        const today = new Date().toISOString().split('T')[0]
        const backupKey = `badge_backup_${user.id}_${today}`
        
        // Only backup if we have badges to backup
        if (userBadges.length > 0 || badges.length > 0) {
          const backupData = {
            userBadges: userBadges,
            badges: badges,
            timestamp: new Date().toISOString()
          }
          localStorage.setItem(backupKey, JSON.stringify(backupData))
          console.log('🛡️ Badges backed up:', backupKey, 'with', userBadges.length, 'user badges and', badges.length, 'total badges')
        } else {
          console.log('🛡️ No badges to backup yet')
        }
      }
    } catch (error) {
      console.warn('Failed to backup badges:', error)
    }
  }

  // Function to restore badges from backup
  const restoreBadges = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        // Find the most recent backup
        const backupKeys = Object.keys(localStorage).filter(key => 
          key.startsWith(`badge_backup_${user.id}_`)
        )
        
        if (backupKeys.length > 0) {
          const latestBackupKey = backupKeys.sort().pop()
          const backupDataStr = latestBackupKey ? localStorage.getItem(latestBackupKey) : null
          if (backupDataStr) {
            const backupData = JSON.parse(backupDataStr)
            setUserBadges(backupData.userBadges)
            setBadges(backupData.badges)
            
            // Update localStorage
            localStorage.setItem(`user_badges_${user.id}`, JSON.stringify(backupData.userBadges))
            localStorage.setItem('daily_quest_badges', JSON.stringify(backupData.badges))
            
            console.log('🔄 Badges restored from backup:', latestBackupKey)
          }
          return true
        }
      }
    } catch (error) {
      console.warn('Failed to restore badges:', error)
    }
    return false
  }

  // Compute badges with status synchronously for instant display
  const computeBadgesWithStatus = () => {
    if (badges.length === 0) return badges
    
    // Create a map for O(1) lookups
    const userBadgeMap = new Map(userBadges.map(ub => [ub.badge_id, ub]))
    
    // Compute badges with status
    return badges.map(badge => {
      const userBadge = userBadgeMap.get(badge.id)
      return {
        ...badge,
        earned: !!userBadge,
        unlocked_at: userBadge?.unlocked_at
      }
    })
  }

  const computedBadgesWithStatus = computeBadgesWithStatus()

  return {
    badges: computedBadgesWithStatus,
    userBadges: userBadges,
    recentBadges: recentBadges,
    stats: stats,
    loading: loading && !initialized && computedBadgesWithStatus.length === 0 && (typeof window === 'undefined' || !localStorage.getItem('daily_quest_badges')), // Only show loading if no badges at all and no cache
    newBadge,
    setNewBadge,
    awardBadgeForQuest,
    refreshRecentBadges,
    backupBadges,
    restoreBadges,
    refresh: async () => {
      setLoading(true)
      await Promise.all([loadBadges(), loadUserBadges()])
      setLoading(false)
    },
    // Quick refresh without loading state for instant updates
    quickRefresh: async () => {
      await Promise.all([loadBadges(), loadUserBadges()])
    }
  }
}
