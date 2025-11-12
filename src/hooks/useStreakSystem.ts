'use client'

import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/lib/supabase'

export interface StreakData {
  current_streak: number
  longest_streak: number
  last_play_date?: string
  is_valid?: boolean
  was_broken?: boolean
}

export interface StreakUpdateResult extends StreakData {
  is_new_streak?: boolean
  streak_increased?: boolean
  show_animation?: boolean
}

export function useStreakSystem() {
  const [streakData, setStreakData] = useState<StreakData>({
    current_streak: 0,
    longest_streak: 0
  })
  const [loading, setLoading] = useState(true)
  const [showStreakAnimation, setShowStreakAnimation] = useState(false)
  const [animationStreak, setAnimationStreak] = useState(0)

  // Load current streak - LOCAL FIRST!
  const loadStreak = useCallback(async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        setStreakData({ current_streak: 0, longest_streak: 0 })
        setLoading(false)
        return
      }

      // ⚡ INSTANT: Load from localStorage first
      const localKey = `streak_${user.id}`
      const localData = localStorage.getItem(localKey)
      
      if (localData) {
        const parsed = JSON.parse(localData)
        setStreakData(parsed)
        console.log('⚡ INSTANT: Loaded streak from localStorage:', parsed)
        
        // Validate: check if streak is broken (last play > 1 day ago)
        const today = new Date().toISOString().split('T')[0]
        const yesterday = new Date()
        yesterday.setDate(yesterday.getDate() - 1)
        const yesterdayStr = yesterday.toISOString().split('T')[0]
        
        const isValid = parsed.last_play_date === today || parsed.last_play_date === yesterdayStr
        
        if (!isValid && parsed.current_streak > 0) {
          console.log('💔 Streak broken (last play too old), resetting to 0')
          setStreakData({ current_streak: 0, longest_streak: parsed.longest_streak })
        }
      }
      
      setLoading(false)

      // 🔄 BACKGROUND: Sync from database (non-blocking)
      setTimeout(async () => {
        try {
          const { data, error } = await supabase.rpc('get_current_streak', {
            p_user_id: user.id
          })

          if (error) {
            console.warn('⚠️ Background streak load failed (non-critical):', error.message)
          } else if (data) {
            console.log('🔄 Background: Streak loaded from database:', data)
            
            // Merge with local (prefer database if different)
            setStreakData({
              current_streak: data.current_streak,
              longest_streak: data.longest_streak,
              last_play_date: data.last_play_date
            })
            
            // Update localStorage cache
            localStorage.setItem(localKey, JSON.stringify({
              current_streak: data.current_streak,
              longest_streak: data.longest_streak,
              last_play_date: data.last_play_date
            }))
          }
        } catch (bgErr) {
          console.warn('⚠️ Background streak load error (non-critical):', bgErr)
        }
      }, 1000)
      
    } catch (err) {
      console.error('Exception loading streak:', err)
      setLoading(false)
    }
  }, [])

  // Update streak after playing a game (first game of the day) - LOCAL FIRST!
  const updateStreakAfterGame = useCallback(async (userId?: string): Promise<StreakUpdateResult | null> => {
    console.log('🔥 [START] updateStreakAfterGame called - LOCAL FIRST')
    
    try {
      // ⚡ OPTIMIZATION: Use passed userId if available to avoid async getUser() call
      let user_id = userId
      
      if (!user_id) {
        const { data: { user }, error: userError } = await supabase.auth.getUser()
        if (userError || !user) {
          console.log('⚠️ No user found')
          return null
        }
        user_id = user.id
      }

      console.log('🔥 User:', user_id)

      // ⚡ LOCAL-FIRST: Calculate streak from localStorage IMMEDIATELY
      const localKey = `streak_${user_id}`
      const localData = localStorage.getItem(localKey)
      let currentData = localData ? JSON.parse(localData) : { current_streak: 0, longest_streak: 0, last_play_date: null }
      
      const today = new Date().toISOString().split('T')[0]
      const yesterday = new Date()
      yesterday.setDate(yesterday.getDate() - 1)
      const yesterdayStr = yesterday.toISOString().split('T')[0]
      
      console.log('📊 Local streak data:', currentData)
      console.log('📅 Today:', today, 'Last play:', currentData.last_play_date)

      let newStreak = currentData.current_streak
      let streakIncreased = false
      let isNewStreak = false

      // Check if we already played today
      if (currentData.last_play_date === today) {
        console.log('✅ Already played today, no change')
        return {
          current_streak: currentData.current_streak,
          longest_streak: currentData.longest_streak,
          last_play_date: currentData.last_play_date,
          show_animation: false,
          streak_increased: false
        }
      }

      // Calculate new streak
      if (!currentData.last_play_date) {
        // First time ever
        newStreak = 1
        isNewStreak = true
        streakIncreased = true
        console.log('🎉 First time playing! Streak = 1')
      } else if (currentData.last_play_date === yesterdayStr) {
        // Played yesterday, continue streak
        newStreak = currentData.current_streak + 1
        streakIncreased = true
        console.log(`🔥 Continuing streak! ${currentData.current_streak} → ${newStreak}`)
      } else {
        // Streak broken, reset to 1
        newStreak = 1
        isNewStreak = true
        streakIncreased = true
        console.log('💔 Streak broken, reset to 1')
      }

      const longestStreak = Math.max(currentData.longest_streak, newStreak)
      
      // ⚡ INSTANT: Update localStorage
      const updatedData = {
        current_streak: newStreak,
        longest_streak: longestStreak,
        last_play_date: today
      }
      localStorage.setItem(localKey, JSON.stringify(updatedData))
      console.log('⚡ INSTANT: Streak updated in localStorage:', updatedData)

      // ⚡ INSTANT: Update React state
      setStreakData(updatedData)

      // ⚡ INSTANT: Show animation if increased
      if (streakIncreased) {
        console.log('🎬 INSTANT: Showing streak animation for:', newStreak)
        
        // Use animation queue if available (Phase 1)
        if (typeof window !== 'undefined' && (window as any).animationQueue) {
          const { animationQueue } = await import('@/lib/animationQueue')
          const { isFeatureEnabled } = await import('@/lib/featureFlags')
          
          if (isFeatureEnabled('USE_ANIMATION_QUEUE')) {
            animationQueue.enqueue('streak', { streak: newStreak })
          } else {
            // Old behavior
            setAnimationStreak(newStreak)
            setShowStreakAnimation(true)
            setTimeout(() => setShowStreakAnimation(false), 3000)
          }
        } else {
          // Fallback to old behavior
          setAnimationStreak(newStreak)
          setShowStreakAnimation(true)
          setTimeout(() => setShowStreakAnimation(false), 3000)
        }
      }

      // 🔄 BACKGROUND: Sync to database (non-blocking)
      setTimeout(async () => {
        try {
          console.log('🔄 Background: Syncing streak to database...')
          const { data: rpcData, error: rpcError } = await supabase.rpc('update_streak_after_game', {
            p_user_id: user_id
          })
          
          if (rpcError) {
            console.warn('⚠️ Background streak sync failed (non-critical):', rpcError.message)
          } else {
            console.log('✅ Background: Streak synced to database')
          }
        } catch (bgErr) {
          console.warn('⚠️ Background streak sync error (non-critical):', bgErr)
        }
      }, 500) // Delay to not block

      return {
        current_streak: newStreak,
        longest_streak: longestStreak,
        last_play_date: today,
        is_new_streak: isNewStreak,
        streak_increased: streakIncreased,
        show_animation: streakIncreased
      }
    } catch (err) {
      console.error('❌ Exception updating streak:', err)
      return null
    }
  }, [])

  // Check if we should update streak (called after each game) - LOCAL FIRST!
  const checkAndUpdateStreak = useCallback(async (userId?: string) => {
    try {
      // ⚡ OPTIMIZATION: Use passed userId if available to avoid async getUser() call
      let user_id = userId
      
      if (!user_id) {
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) {
          console.log('⚠️ No user for streak check')
          return
        }
        user_id = user.id
      }

      console.log('🔍 Checking streak (local-first) for user:', user_id)

      // ⚡ LOCAL-FIRST: Check localStorage immediately (0ms)
      const localKey = `streak_${user_id}`
      const localData = localStorage.getItem(localKey)
      const currentData = localData ? JSON.parse(localData) : { last_play_date: null }
      
      const today = new Date().toISOString().split('T')[0]
      
      console.log('📅 Today:', today, 'Last play (local):', currentData.last_play_date)
      
      // Only update if we haven't played today yet (based on localStorage)
      if (currentData.last_play_date !== today) {
        console.log('🎮 First game of the day! Updating streak...')
        const result = await updateStreakAfterGame(user_id)
        console.log('✅ Streak update result:', result)
      } else {
        console.log('✅ Already played today (from localStorage), no update')
      }
    } catch (err) {
      console.error('❌ Exception in checkAndUpdateStreak:', err)
    }
  }, [updateStreakAfterGame])

  // Dismiss animation manually
  const dismissAnimation = useCallback(() => {
    setShowStreakAnimation(false)
  }, [])

  // Initial load
  useEffect(() => {
    loadStreak()
    // Note: We do NOT auto-check streak on mount
    // Streak should only update when a game is actually played
  }, [loadStreak])

  return {
    streakData,
    loading,
    showStreakAnimation,
    animationStreak,
    updateStreakAfterGame,
    checkAndUpdateStreak,
    loadStreak,
    dismissAnimation,
    // Convenience getters
    currentStreak: streakData.current_streak,
    longestStreak: streakData.longest_streak
  }
}

