/**
 * Tracking V2 - Event-based XP System
 * 
 * Replacement for the old tracking.ts system.
 * Uses event-driven architecture with batching, idempotency, and single source of truth.
 * 
 * Key improvements:
 * - Events are queued locally (IndexedDB) and synced in batches
 * - Idempotent (client-generated UUIDs prevent duplicates)
 * - Single source of truth (xp_totals table)
 * - Auto-sync every 3 seconds + on visibility change
 * - No reliance on sendBeacon at logout (continuous sync instead)
 */

import { supabase } from '@/lib/supabase'
import { xpOutbox, createXpEvent } from '@/lib/xpOutbox'
import { syncManager } from '@/lib/syncManager'

export type GameType = 'flashcards' | 'match' | 'typing' | 'story' | 'translate' | 'connect' | 'quiz' | 'choice' | 'roulette' | 'story_gap' | 'daily_quest'

export interface TrackingContext {
  wordSetId?: string
  homeworkId?: string
  isWordBundle?: boolean
}

/**
 * Award XP to a student (new event-based system with fallback)
 * 
 * This replaces the old updateStudentProgress function.
 * Instead of directly updating the database, it queues an event
 * that will be synced automatically in batches.
 * 
 * FALLBACK: If new system fails, falls back to old student_progress system
 * 
 * @param score - Base XP to award (before modifiers)
 * @param gameType - Type of game played
 * @param context - Optional context (word set, homework, etc.)
 * @returns The XP delta that was queued (after modifiers)
 */
export async function awardXP(
  score: number, 
  gameType: GameType, 
  context?: TrackingContext
): Promise<number> {
  try {
    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      console.error('❌ awardXP: No user found')
      return 0
    }

    console.log('🎉 awardXP called:', { score, gameType, context })

    // Calculate final XP with modifiers
    let finalXP = Math.max(0, Math.round(score))

    // Apply 50% reduction for word bundles
    if (context?.isWordBundle) {
      finalXP = Math.floor(finalXP * 0.5)
      console.log('📉 Word bundle reduction applied:', { original: score, final: finalXP })
    }

    // Apply diminishing returns ONLY for Line Matching (connect)
    if (gameType === 'connect' && context?.wordSetId) {
      try {
        const { count: priorSessionsCount } = await supabase
          .from('game_sessions')
          .select('id', { count: 'exact', head: true })
          .eq('student_id', user.id)
          .eq('game_type', gameType)
          .eq('word_set_id', context.wordSetId)
          .not('finished_at', 'is', null)

        const prior = priorSessionsCount || 0
        const diminishingFactor = Math.pow(0.8, prior)
        const diminished = Math.max(0, Math.round(finalXP * diminishingFactor))
        console.log('📉 Diminishing returns applied:', { prior, diminishingFactor, original: finalXP, final: diminished })
        finalXP = diminished
      } catch (dimErr) {
        console.warn('⚠️ Diminishing returns calculation failed (non-critical):', dimErr)
      }
    }

    // Dispatch "game completed" event for UI indicator
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('game-completed', {
        detail: { 
          gameType,
          xp: finalXP,
          timestamp: Date.now()
        }
      }))
    }

    // Try new event system first
    try {
      // Create XP event
      const event = createXpEvent({
        student_id: user.id,
        kind: gameType,
        delta: finalXP,
        word_set_id: context?.wordSetId || null,
        homework_id: context?.homeworkId || null,
        metadata: {
          original_score: score,
          is_word_bundle: context?.isWordBundle || false,
          // Include game session data in metadata for future use
          game_session: {
            started_at: new Date().toISOString(),
            finished_at: new Date().toISOString(),
            accuracy_pct: 100
          }
        }
      })

      // Enqueue event (will be synced automatically)
      await xpOutbox.enqueue(event)

      console.log('✅ XP event queued:', { eventId: event.id, delta: finalXP })
      
      // IMPORTANT: Don't create game session here - let it batch with XP sync
      // This ensures läraren ser både game session OCH XP samtidigt
      
    } catch (eventError) {
      console.error('⚠️ Event system failed, using fallback:', eventError)
      
      // FALLBACK: Use old student_progress system
      const { updateStudentProgress } = await import('@/lib/tracking')
      return await updateStudentProgress(finalXP, gameType, context)
    }

    // Update last_active in profiles (non-blocking)
    supabase
      .from('profiles')
      .update({ last_active: new Date().toISOString() })
      .eq('id', user.id)
      .then(() => console.log('✅ Profile last_active updated'), 
            (err: any) => console.warn('⚠️ Profile update failed:', err))

    return finalXP

  } catch (error) {
    console.error('❌ awardXP error:', error)
    
    // Final fallback: Try old system
    try {
      console.log('🔄 Using fallback to old tracking system...')
      const { updateStudentProgress } = await import('@/lib/tracking')
      return await updateStudentProgress(score, gameType, context)
    } catch (fallbackError) {
      console.error('❌ Fallback also failed:', fallbackError)
      return 0
    }
  }
}

/**
 * Get student's total XP from the database
 * (reads from xp_totals - single source of truth)
 */
export async function getStudentTotalXP(): Promise<{
  total_xp: number
  games_played: number
  last_game_type: string | null
  updated_at: string | null
}> {
  try {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return { total_xp: 0, games_played: 0, last_game_type: null, updated_at: null }
    }

    // Read from xp_totals table (single source of truth)
    const { data, error } = await supabase
      .from('xp_totals')
      .select('total_xp, games_played, last_game_type, updated_at')
      .eq('student_id', user.id)
      .maybeSingle()

    if (error) {
      console.error('❌ getStudentTotalXP error:', error)
      return { total_xp: 0, games_played: 0, last_game_type: null, updated_at: null }
    }

    if (!data) {
      // No record yet (new student)
      return { total_xp: 0, games_played: 0, last_game_type: null, updated_at: null }
    }

    return {
      total_xp: data.total_xp || 0,
      games_played: data.games_played || 0,
      last_game_type: data.last_game_type,
      updated_at: data.updated_at
    }

  } catch (error) {
    console.error('❌ getStudentTotalXP error:', error)
    return { total_xp: 0, games_played: 0, last_game_type: null, updated_at: null }
  }
}

/**
 * Get student's total XP with optimistic updates
 * (combines DB total with pending outbox events)
 */
export async function getStudentTotalXPWithPending(): Promise<{
  total_xp: number
  games_played: number
  pending_xp: number
  pending_count: number
}> {
  try {
    // Get DB total
    const dbTotal = await getStudentTotalXP()

    // Get pending events from outbox
    const outboxStatus = await xpOutbox.getStatus()
    const pendingXP = outboxStatus.events.reduce((sum, event) => sum + event.delta, 0)

    return {
      total_xp: dbTotal.total_xp + pendingXP,  // Optimistic total
      games_played: dbTotal.games_played,
      pending_xp: pendingXP,
      pending_count: outboxStatus.pendingCount
    }

  } catch (error) {
    console.error('❌ getStudentTotalXPWithPending error:', error)
    return { total_xp: 0, games_played: 0, pending_xp: 0, pending_count: 0 }
  }
}

/**
 * Force sync all pending XP events immediately
 * (useful for manual sync or pre-navigation)
 */
export async function forceSyncXP(): Promise<void> {
  try {
    console.log('🔄 Force syncing XP...')
    await syncManager.forceFlush()
    console.log('✅ Force sync complete')
  } catch (error) {
    console.error('❌ Force sync error:', error)
  }
}

/**
 * Cleanup before logout (optional - system auto-syncs anyway)
 */
export async function cleanupBeforeLogout(): Promise<void> {
  try {
    console.log('🧹 Cleaning up before logout...')
    await syncManager.cleanup()
    console.log('✅ Cleanup complete')
  } catch (error) {
    console.error('❌ Cleanup error:', error)
  }
}

// Re-export other functions from old tracking.ts that don't need changes
export {
  hasCompletedQuizForWordSet,
  previewDiminishedPoints,
  getDiminishingMeta,
  startGameSession,
  endGameSession,
  retryPendingGameSessions,
  logWordAttempt
} from './tracking'

