
import { supabase } from '@/lib/supabase'
import { persistentLog } from '@/lib/errorLogger'

export type GameType = 'flashcards' | 'match' | 'typing' | 'story' | 'translate' | 'connect' | 'quiz' | 'choice' | 'roulette' | 'story_gap' | 'daily_quest' | 'pronunciation'

export interface TrackingContext {
  wordSetId?: string
  homeworkId?: string
  isWordBundle?: boolean
}

export interface GameSession {
  id: string
}

// ===== GRACEFUL SHUTDOWN TRACKING =====
// Track ongoing DB operations for graceful shutdown on logout
const ongoingOperations = new Set<Promise<any>>()

function trackOperation<T>(promise: Promise<T>): Promise<T> {
  ongoingOperations.add(promise)
  promise.finally(() => ongoingOperations.delete(promise))
  return promise
}

export async function waitForOngoingOperations(): Promise<void> {
  if (ongoingOperations.size === 0) {
    console.log('✅ No ongoing operations to wait for')
    return
  }
  
  console.log(`⏳ Waiting for ${ongoingOperations.size} ongoing DB operations to complete...`)
  try {
    await Promise.race([
      Promise.all(Array.from(ongoingOperations)),
      new Promise(resolve => setTimeout(resolve, 5000)) // Max 5 seconds
    ])
    console.log('✅ All ongoing operations completed or timeout reached')
  } catch (error) {
    console.error('⚠️ Some operations failed, but continuing:', error)
  }
}

/**
 * Check if the current user has already finished a quiz for the given word set
 */
export async function hasCompletedQuizForWordSet(context?: TrackingContext): Promise<boolean> {
  try {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user || !context?.wordSetId) return false
    const { count } = await supabase
      .from('game_sessions')
      .select('id', { count: 'exact', head: true })
      .eq('student_id', user.id)
      .eq('game_type', 'quiz')
      .eq('word_set_id', context.wordSetId)
      .not('finished_at', 'is', null)
    return (count || 0) > 0
  } catch (_) {
    return false
  }
}

/**
 * Calculate points after diminishing returns without mutating any state.
 * Input points should already include any UI scaling (e.g., scalePoints()).
 */
export async function previewDiminishedPoints(points: number, gameType: GameType, context?: TrackingContext): Promise<number> {
  try {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return Math.max(0, Math.round(points))

    let result = Math.max(0, Math.round(points))
    // Only apply diminishing returns for Line Matching (connect)
    if (gameType === 'connect' && context?.wordSetId) {
      const { count: priorSessionsCount } = await supabase
        .from('game_sessions')
        .select('id', { count: 'exact', head: true })
        .eq('student_id', user.id)
        .eq('game_type', gameType)
        .eq('word_set_id', context.wordSetId)
        .not('finished_at', 'is', null)

      const prior = priorSessionsCount || 0
      const diminishingFactor = Math.pow(0.8, prior)
      result = Math.max(0, Math.round(result * diminishingFactor))
    }
    return result
  } catch (_) {
    return Math.max(0, Math.round(points))
  }
}

/**
 * Return meta for diminishing returns: how many prior finished sessions exist
 * for the same game and word set, and the resulting factor (0.8^prior).
 */
export async function getDiminishingMeta(gameType: GameType, context?: TrackingContext): Promise<{ prior: number; factor: number }> {
  try {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user || !context?.wordSetId) return { prior: 0, factor: 1 }
    const { count: priorSessionsCount } = await supabase
      .from('game_sessions')
      .select('id', { count: 'exact', head: true })
      .eq('student_id', user.id)
      .eq('game_type', gameType)
      .eq('word_set_id', context.wordSetId)
      .not('finished_at', 'is', null)
    const prior = priorSessionsCount || 0
    const factor = Math.pow(0.8, prior)
    return { prior, factor }
  } catch (_) {
    return { prior: 0, factor: 1 }
  }
}

export async function startGameSession(gameType: GameType, context?: TrackingContext): Promise<GameSession | null> {
  try {
    console.log('🎮 startGameSession CALLED:', { gameType, context })
    
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      persistentLog('warn', `startGameSession: No user found for ${gameType}`)
      console.warn('⚠️ startGameSession: No user found - session will not be created!')
      return null
    }
    
    console.log('✅ User found for game session:', user.id)

    // Update last_active in profiles when starting a game
    await supabase
      .from('profiles')
      .update({ last_active: new Date().toISOString() })
      .eq('id', user.id)

    console.log('💾 Inserting game session into database...')
    const { data, error } = await supabase
      .from('game_sessions')
      .insert({
        student_id: user.id,
        game_type: gameType,
        word_set_id: context?.wordSetId ?? null,
        homework_id: context?.homeworkId ?? null,
        started_at: new Date().toISOString(),
      })
      .select('id')
      .single()

    if (error) {
      persistentLog('error', `Failed to start game session: ${error.message}`, {
        gameType,
        error: error.message,
        code: error.code,
        details: error.details
      })
      console.error('❌ Failed to start game session:', error)
      console.error('❌ Error details:', JSON.stringify(error, null, 2))
      throw error
    }
    
    persistentLog('info', `Game session started: ${gameType}`, { sessionId: data.id, gameType })
    console.log('✅ Game session started successfully! Session ID:', data.id)
    console.log('✅ Returning session object:', data)
    
    return data as unknown as GameSession
  } catch (error: any) {
    persistentLog('error', `Error in startGameSession: ${error?.message || 'Unknown'}`, {
      gameType,
      error: error?.message
    })
    console.error('❌ Error in startGameSession:', error)
    return null
  }
}

export async function endGameSession(sessionId: string | null, gameType: GameType, metrics: {
  score?: number
  durationSec?: number
  accuracyPct?: number
  details?: Record<string, unknown>
}, context?: TrackingContext): Promise<void> {
  const operation = (async () => {
    try {
      console.log('🎮 endGameSession CALLED:', { sessionId, gameType, metrics })
    
    if (!sessionId) {
      // No client-side sessionId - create session now with proper metrics
      console.log('ℹ️ No sessionId - creating session directly with accurate metrics')
      
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        console.warn('⚠️ No user found, cannot create game session')
        return
      }
      
      persistentLog('info', `Creating game session: ${gameType}`, { metrics })
      
      // Use started_at from details if available (typical case for Typing Challenge)
      // Otherwise use current time minus duration to reconstruct start time
      let startedAt = new Date()
      if (metrics.details && typeof metrics.details.started_at === 'string') {
        startedAt = new Date(metrics.details.started_at as string)
      } else if (metrics.durationSec) {
        // Calculate start time by subtracting duration from now
        startedAt = new Date(Date.now() - (metrics.durationSec * 1000))
      }
      
      // Ensure details is properly serialized if it's an object
      let detailsToSave = metrics.details ?? null
      if (detailsToSave && typeof detailsToSave === 'object') {
        // Supabase handles JSONB automatically, but we ensure it's a plain object
        detailsToSave = JSON.parse(JSON.stringify(detailsToSave))
      }
      
      console.log('📊 endGameSession INSERT: Saving details:', {
        gameType,
        details_type: typeof detailsToSave,
        details_is_null: detailsToSave === null,
        has_evaluations: detailsToSave && typeof detailsToSave === 'object' 
          ? !!(detailsToSave as any).evaluations 
          : false,
        evaluations_count: detailsToSave && typeof detailsToSave === 'object' && (detailsToSave as any).evaluations
          ? (detailsToSave as any).evaluations.length 
          : 0
      })
      
      const sessionData: any = {
        student_id: user.id,
        game_type: gameType,
        started_at: startedAt.toISOString(),
        finished_at: new Date().toISOString(),
        score: metrics.score ?? null,
        duration_sec: metrics.durationSec ?? null,
        accuracy_pct: metrics.accuracyPct ?? null,
        details: detailsToSave,
      }
      
      // Add word_set_id and homework_id from context if available
      if (context?.wordSetId) {
        sessionData.word_set_id = context.wordSetId
      }
      if (context?.homeworkId) {
        sessionData.homework_id = context.homeworkId
      }
      
      console.log('📊 INSERTING game session with accuracy:', {
        gameType,
        accuracy_pct: sessionData.accuracy_pct,
        score: sessionData.score,
        metrics_received: metrics
      })
      
      const { error: insertError } = await supabase
        .from('game_sessions')
        .insert(sessionData)
      
      if (insertError) {
        console.error('❌ Failed to create game session:', insertError)
        persistentLog('error', `Failed to create game session: ${insertError.message}`, { gameType, metrics })
      } else {
        console.log('✅ Game session created successfully with accuracy:', sessionData.accuracy_pct)
        persistentLog('info', `Game session created: ${gameType}`, { metrics })
      }
      return
    }
    
    persistentLog('info', `Ending game session: ${gameType}`, { sessionId, metrics })
    console.log('💾 Ending game session:', { sessionId, gameType, metrics })
    
    // Ensure details is properly serialized if it's an object
    let detailsToSave = metrics.details ?? null
    if (detailsToSave && typeof detailsToSave === 'object') {
      try {
        // Deep clone to ensure we have a clean object
        detailsToSave = JSON.parse(JSON.stringify(detailsToSave))
      } catch (e) {
        console.error('⚠️ Failed to serialize details:', e)
        detailsToSave = null
      }
    }
    
    console.log('📊 endGameSession UPDATE: Saving details:', {
      sessionId,
      gameType,
      details_type: typeof detailsToSave,
      details_is_null: detailsToSave === null,
      details_keys: detailsToSave && typeof detailsToSave === 'object' 
        ? Object.keys(detailsToSave) 
        : [],
      details_stringified_length: detailsToSave ? JSON.stringify(detailsToSave).length : 0
    })
    
    // Verify session exists before updating
    const { data: sessionCheck, error: checkError } = await supabase
      .from('game_sessions')
      .select('id, game_type')
      .eq('id', sessionId)
      .single()
    
    if (checkError || !sessionCheck) {
      console.error('❌ Session not found or check failed:', { sessionId, checkError })
      persistentLog('error', `Session not found: ${sessionId}`, { sessionId, gameType, checkError })
      return
    }
    
    console.log('✅ Session found:', { sessionId, existingGameType: sessionCheck.game_type })
    
    const { error } = await supabase
      .from('game_sessions')
      .update({
        score: metrics.score ?? null,
        duration_sec: metrics.durationSec ?? null,
        accuracy_pct: metrics.accuracyPct ?? null,
        details: detailsToSave,
        finished_at: new Date().toISOString(),
      })
      .eq('id', sessionId)
      
    if (error) {
      console.error('📊 endGameSession UPDATE ERROR:', {
        error_message: error.message || 'Unknown error',
        error_code: error.code || 'No code',
        error_details: error.details || 'No details',
        error_full: JSON.stringify(error),
        sessionId,
        gameType,
        detailsToSave_preview: detailsToSave ? JSON.stringify(detailsToSave).substring(0, 200) : null
      })
      persistentLog('error', `Failed to end game session: ${error.message || 'Unknown error'}`, { 
        sessionId, 
        gameType, 
        error: error.message || String(error),
        code: error.code || 'No code',
        details: error.details || 'No details',
        error_full: JSON.stringify(error)
      })
      console.error('❌ Failed to end game session:', error)
      
      // Store in localStorage as backup for retry
      const backup = {
        sessionId,
        gameType,
        metrics,
        timestamp: Date.now()
      }
      const backupKey = `pendingSession_${sessionId}`
      localStorage.setItem(backupKey, JSON.stringify(backup))
      persistentLog('info', 'Game session backed up to localStorage for retry', { sessionId })
      console.log('📦 Game session backed up to localStorage for retry')
      
      throw error
    }
    
    // Verify what was actually saved by reading it back
    const { data: savedSession, error: readError } = await supabase
      .from('game_sessions')
      .select('id, details')
      .eq('id', sessionId)
      .single()
    
    if (!readError && savedSession) {
      let savedDetails: any = null
      if (savedSession.details) {
        if (typeof savedSession.details === 'string') {
          try {
            savedDetails = JSON.parse(savedSession.details)
          } catch (e) {
            savedDetails = null
          }
        } else {
          savedDetails = savedSession.details
        }
      }
      
      console.log('📊 endGameSession UPDATE: Verified saved data:', {
        sessionId,
        saved_details_type: typeof savedDetails,
        saved_evaluations_count: savedDetails?.evaluations?.length || 0,
        saved_evaluations_is_array: Array.isArray(savedDetails?.evaluations),
        saved_details_keys: savedDetails ? Object.keys(savedDetails) : []
      })
    } else if (readError) {
      console.error('📊 endGameSession UPDATE: Failed to verify saved data:', readError)
    }
    
    persistentLog('info', `Game session ended successfully: ${gameType}`, { sessionId })
    console.log('✅ Game session ended successfully')
    
    // Clean up any backup
    const backupKey = `pendingSession_${sessionId}`
    localStorage.removeItem(backupKey)
    
  } catch (error: any) {
    persistentLog('error', `Error in endGameSession: ${error?.message || 'Unknown error'}`, { 
      sessionId, 
      gameType,
      error: error?.message,
      stack: error?.stack 
    })
    console.error('❌ Error in endGameSession:', error)
    
      // DON'T throw - games use `void` so they won't handle it
      // Instead, the backup mechanism will retry later
      // This prevents unhandled promise rejections
    }
  })()
  
  // Track this operation for graceful shutdown
  return trackOperation(operation)
}

/**
 * Retry any pending game sessions that failed to save
 * Call this on app startup to recover from crashes/quick logouts
 */
export async function retryPendingGameSessions(): Promise<void> {
  try {
    const pendingKeys = Object.keys(localStorage).filter(key => 
      key.startsWith('pendingSession_')
    )
    
    if (pendingKeys.length === 0) {
      console.log('📦 No pending game sessions to retry')
      return
    }
    
    console.log(`🔄 Retrying ${pendingKeys.length} pending game sessions...`)
    
    for (const key of pendingKeys) {
      try {
        const backup = JSON.parse(localStorage.getItem(key) || '{}')
        const { sessionId, gameType, metrics } = backup
        
        if (!sessionId) {
          localStorage.removeItem(key)
          continue
        }
        
        // Try to save again
        await endGameSession(sessionId, gameType, metrics)
        console.log(`✅ Successfully retried session: ${sessionId}`)
        
      } catch (error) {
        console.error(`❌ Failed to retry session from ${key}:`, error)
        // Keep in localStorage for next retry
      }
    }
  } catch (error) {
    console.error('Error retrying pending sessions:', error)
  }
}

/**
 * Sync all pending data before logout
 * Returns true if all data was synced successfully
 */
export async function syncBeforeLogout(): Promise<boolean> {
  try {
    persistentLog('info', 'Starting sync before logout')
    console.log('🔄 Syncing all pending game data before logout...')
    
    // CRITICAL: Wait for ongoing database operations to complete
    console.log('⏳ Step 1: Waiting for ongoing operations...')
    await waitForOngoingOperations()
    
    // Wait a bit more for any operations that just started
    console.log('⏳ Step 2: Safety delay for race conditions...')
    await new Promise(resolve => setTimeout(resolve, 500))
    
    // Wait again for operations that might have started during delay
    await waitForOngoingOperations()
    
    // Retry any pending sessions from previous failures
    console.log('⏳ Step 3: Retrying pending sessions...')
    await retryPendingGameSessions()
    
    // Final wait for retries to complete
    console.log('⏳ Step 4: Final wait...')
    await new Promise(resolve => setTimeout(resolve, 500))
    
    persistentLog('info', 'Sync before logout completed successfully')
    console.log('✅ All data synced before logout')
    return true
    
  } catch (error: any) {
    persistentLog('error', `Error syncing before logout: ${error?.message}`, { error: error?.message })
    console.error('❌ Error syncing before logout:', error)
    return false
  }
}

export async function logWordAttempt(params: {
  word: string
  correct: boolean
  gameType: GameType
  context?: TrackingContext
}): Promise<void> {
  try {
    // Comment out word_progress functionality for now since table doesn't exist
    console.log('Debug - logWordAttempt called but word_progress table not available:', params)
    return
    
    /*
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    // Try update existing progress
    const { data: existing } = await supabase
      .from('word_progress')
      .select('id, correct_count, incorrect_count')
      .match({
        student_id: user.id,
        word: params.word.toLowerCase(),
        word_set_id: params.context?.wordSetId ?? null,
        homework_id: params.context?.homeworkId ?? null,
      })
      .limit(1)
      .maybeSingle()

    if (existing?.id) {
      const { error } = await supabase
        .from('word_progress')
        .update({
          correct_count: (existing.correct_count ?? 0) + (params.correct ? 1 : 0),
          incorrect_count: (existing.incorrect_count ?? 0) + (params.correct ? 0 : 1),
          last_played_at: new Date().toISOString(),
        })
        .eq('id', existing.id)
      if (error) throw error
    } else {
      const { error } = await supabase
        .from('word_progress')
        .insert({
          student_id: user.id,
          word: params.word.toLowerCase(),
          correct_count: params.correct ? 1 : 0,
          incorrect_count: params.correct ? 0 : 1,
          word_set_id: params.context?.wordSetId ?? null,
          homework_id: params.context?.homeworkId ?? null,
          last_played_at: new Date().toISOString(),
        })
      if (error) throw error
    }
    */
  } catch (_) {
    // no-op
  }
}

// IMPORTANT: `score` must already be the final points to add (scaled if you use multipliers in the game UI)
export async function updateStudentProgress(score: number, gameType: GameType, context?: TrackingContext): Promise<number> {
  const operation = (async () => {
    try {
      // Emit sync start event for save status indicator
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('xp-sync-start'))
      }
      
      persistentLog('info', `updateStudentProgress called: ${gameType}, score: ${score}`, { score, gameType, context })
      console.log('🔥🔥🔥 tracking.ts updateStudentProgress called with:', { score, gameType, context })
    
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError) {
      persistentLog('error', `Auth error in updateStudentProgress: ${authError.message}`, { authError })
      console.error('❌ Auth error in updateStudentProgress:', authError)
      
      // Emit sync error event for save status indicator
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('xp-sync-error', {
          detail: { error: authError.message, gameType }
        }))
      }
      return 0
    }
    if (!user) {
      persistentLog('warn', 'No user found in updateStudentProgress')
      console.log('❌ No user found in updateStudentProgress')
      
      // Emit sync error event for save status indicator
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('xp-sync-error', {
          detail: { error: 'No user found', gameType }
        }))
      }
      return 0
    }
    
    console.log('✅ User authenticated in tracking.ts:', user.id)
    const studentId = user!.id
    
    // Update last_active in profiles when updating progress
    await supabase
      .from('profiles')
      .update({ last_active: new Date().toISOString() })
      .eq('id', studentId)
    // Treat incoming score as the exact points to add (already scaled in the game if needed)
    let pointsToAdd = Math.max(0, Math.round(score))

    // Apply 50% point reduction for word bundles
    if (context?.isWordBundle) {
      pointsToAdd = Math.floor(pointsToAdd * 0.5)
      console.log('Debug - Word bundle point reduction applied:', { originalScore: score, adjustedScore: pointsToAdd })
    }

    // Apply diminishing returns ONLY for Line Matching (connect)
    // 20% less XP for each prior finished session of the same game in the same word set
    try {
      if (gameType === 'connect' && context?.wordSetId) {
        const { count: priorSessionsCount } = await supabase
          .from('game_sessions')
          .select('id', { count: 'exact', head: true })
          .eq('student_id', studentId)
          .eq('game_type', gameType)
          .eq('word_set_id', context!.wordSetId)
          .not('finished_at', 'is', null)

        const prior = priorSessionsCount || 0
        const diminishingFactor = Math.pow(0.8, prior)
        const diminished = Math.max(0, Math.round(pointsToAdd * diminishingFactor))
        console.log('Debug - Diminishing returns:', { prior, pointsToAdd, diminishingFactor, diminished })
        pointsToAdd = diminished
      }
    } catch (dimErr) {
      console.log('Debug - Diminishing returns calculation failed (non-critical):', dimErr)
    }

    // CRITICAL FIX: Always use a global progress record for the student
    // This prevents losing points when word sets are removed
    // We'll create/update a record with word_set_id = null to represent total progress
    
    // First, try to find the global progress record (no word_set_id/homework_id)
    const { data: globalRecord, error: selectError } = await supabase
      .from('student_progress')
      .select('id, total_points, games_played, last_played_at')
      .eq('student_id', studentId)
      .is('word_set_id', null)
      .is('homework_id', null)
      .limit(1)
      .maybeSingle()

    if (selectError) {
      console.log('Debug - Select error:', selectError)
    }
    
    console.log('Debug - Global record found:', globalRecord)

    let newTotalPointsForReturn = pointsToAdd
    if (globalRecord?.id) {
      // Update existing global record
      const newTotalPoints = (globalRecord.total_points ?? 0) + pointsToAdd
      const newGamesPlayed = (globalRecord.games_played ?? 0) + 1
      console.log('🔥 Updating global record:', { 
        recordId: globalRecord.id,
        oldPoints: globalRecord.total_points,
        pointsToAdd,
        newTotalPoints,
        oldGames: globalRecord.games_played,
        newGames: newGamesPlayed
      })
      
      console.log('📊 Updating existing global record in database...')
      console.log('📊 Update query params:', { 
        recordId: globalRecord.id, 
        newTotalPoints, 
        newGamesPlayed, 
        gameType 
      })
      
      let updateData, updateError
      try {
        console.log('📊 Attempting DB UPDATE:', { 
          recordId: globalRecord.id,
          oldPoints: globalRecord.total_points,
          newPoints: newTotalPoints,
          pointsToAdd,
          gameType
        })
        
        const result = await supabase
          .from('student_progress')
          .update({
            total_points: newTotalPoints,
            games_played: newGamesPlayed,
            last_played_at: new Date().toISOString(),
            last_game_type: gameType,
          })
          .eq('id', globalRecord.id)
          .select()
        
        updateData = result.data
        updateError = result.error
        
        console.log('📊 Update query completed:', { 
          hasError: !!updateError, 
          dataLength: updateData?.length,
          errorCode: updateError?.code,
          data: updateData
        })
      } catch (e) {
        console.error('❌ EXCEPTION during update query:', e)
        persistentLog('error', `DB UPDATE exception: ${e}`, { error: String(e), gameType })
        
        // Check if it's a network error
        const isNetworkError = e instanceof TypeError && e.message.includes('Failed to fetch')
        if (isNetworkError) {
          console.error('🌐 Network error detected - XP will be retried later')
          persistentLog('error', `Network error during DB update: ${e.message}`, { 
            error: e.message, 
            gameType,
            pointsToAdd,
            willRetry: true
          })
        }
        
        // Emit error event for save status indicator
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('xp-sync-error', {
            detail: { 
              error: e instanceof Error ? e.message : String(e), 
              gameType,
              isNetworkError
            }
          }))
        }
        
        throw e
      }
      
      if (updateError) {
        console.error('❌ CRITICAL: Update error - XP will NOT be saved!', updateError)
        console.error('❌ Update error details:', JSON.stringify(updateError, null, 2))
        console.error('❌ Update error code:', updateError.code)
        console.error('❌ This means localStorage will be higher than DB!')
        persistentLog('error', `Update failed: ${updateError.message}`, {
          error: updateError.message,
          code: updateError.code,
          gameType,
          pointsToAdd
        })
        
        // Emit error event for save status indicator
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('xp-sync-error', {
            detail: { error: updateError.message, gameType }
          }))
        }
        
        // KRITISKT: Returnera 0 så localStorage inte uppdateras!
        return 0
      }
      
      console.log('✅✅✅ Global record updated successfully!')
      console.log('✅ Database now has:', { totalXP: newTotalPoints, gamesPlayed: newGamesPlayed })
      console.log('✅ Update response data:', updateData)
      console.log('✅ DB write confirmed - safe to update localStorage')
      persistentLog('info', `XP updated in DB: ${newTotalPoints} total XP`, { newTotalPoints, newGamesPlayed })
      newTotalPointsForReturn = pointsToAdd  // Return points ADDED, not total
      
      // NOTE: Game sessions are created client-side by games using endGameSession()
      // This includes ACCURATE accuracy_pct, duration, and other metrics
      // Server-side session creation REMOVED to prevent duplicate/incorrect accuracy data
    } else {
      // Create new global record using insert (not upsert, since this is first game)
      console.log('🔥 Creating NEW global record:', { studentId, pointsToAdd, gameType })
      const { data: insertData, error: insertError } = await supabase
        .from('student_progress')
        .insert({
          student_id: studentId,
          word_set_id: null, // Global record
          homework_id: null,  // Global record
          total_points: pointsToAdd,
          games_played: 1,
          last_played_at: new Date().toISOString(),
          last_game_type: gameType,
        })
        .select()
      
      if (insertError) {
        // If insert failed due to conflict, it means record exists - try update instead
        console.log('⚠️ Insert failed (record may exist), trying update...', insertError.code)
        const { data: updateData, error: updateError } = await supabase
          .from('student_progress')
          .update({
            total_points: pointsToAdd,
            games_played: 1,
            last_played_at: new Date().toISOString(),
            last_game_type: gameType,
          })
          .eq('student_id', studentId)
          .is('word_set_id', null)
          .is('homework_id', null)
          .select()
        
        if (updateError) {
          console.error('❌ Update error after insert conflict:', updateError)
          persistentLog('error', `Insert fallback UPDATE failed: ${updateError.message}`, {
            error: updateError.message,
            code: updateError.code
          })
          
          // Emit error event for save status indicator
          if (typeof window !== 'undefined') {
            window.dispatchEvent(new CustomEvent('xp-sync-error', {
              detail: { error: updateError.message, gameType }
            }))
          }
          
          // KRITISKT: Returnera 0 så localStorage inte uppdateras!
          return 0
        }
        console.log('✅ Global record updated after conflict:', updateData)
        persistentLog('info', `XP updated in DB: ${pointsToAdd} total XP`, { total: pointsToAdd, games: 1 })
      } else {
        console.log('✅ New global record created successfully:', insertData)
        persistentLog('info', `XP created in DB: ${pointsToAdd} total XP`, { total: pointsToAdd, games: 1 })
      }
      newTotalPointsForReturn = pointsToAdd
      
      // NOTE: Game sessions are created client-side by games using endGameSession()
      // This ensures accurate accuracy_pct, duration, and other game-specific metrics
    }

    // OPTIONAL: Also keep the specific word set record for detailed tracking
    // This won't affect total points but provides detailed history
    if (context?.wordSetId || context?.homeworkId) {
      try {
        const matchCriteria: any = {
          student_id: studentId,
          word_set_id: context?.wordSetId ?? null,
          homework_id: context?.homeworkId ?? null,
        }
        const { data: specificRecord } = await supabase
          .from('student_progress')
          .select('id, total_points, games_played')
          .match(matchCriteria)
          .limit(1)
          .maybeSingle()

        if (specificRecord && (specificRecord as any).id) {
          // Update specific record
          await supabase
            .from('student_progress')
            .update({
              total_points: (((specificRecord as any)?.total_points ?? 0) as number) + pointsToAdd,
              games_played: (((specificRecord as any)?.games_played ?? 0) as number) + 1,
              last_played_at: new Date().toISOString(),
              last_game_type: gameType,
            })
            .eq('id', (specificRecord as any).id)
        } else {
          // Create specific record
          await supabase
            .from('student_progress')
            .insert({
              student_id: studentId,
              word_set_id: context?.wordSetId ?? null,
              homework_id: context?.homeworkId ?? null,
              total_points: pointsToAdd,
              games_played: 1,
              last_played_at: new Date().toISOString(),
              last_game_type: gameType,
            })
        }
      } catch (specificError) {
        // Don't fail the main operation if specific tracking fails
        console.log('Debug - Specific word set tracking failed (non-critical):', specificError)
      }
    }
    
    console.log('🎉 updateStudentProgress COMPLETED successfully!')
    console.log('🎉 Returning total points added:', newTotalPointsForReturn)
    persistentLog('info', `XP updated successfully: +${newTotalPointsForReturn} XP for ${gameType}`, {
      pointsAdded: newTotalPointsForReturn,
      gameType,
      context
    })
    
    // Emit sync complete event for save status indicator ONLY if we actually saved something
    if (typeof window !== 'undefined' && newTotalPointsForReturn > 0) {
      window.dispatchEvent(new CustomEvent('xp-synced', {
        detail: { pointsAdded: newTotalPointsForReturn, gameType }
      }))
    }
    
      return newTotalPointsForReturn
    } catch (error: any) {
      persistentLog('error', `CRITICAL ERROR updating student progress: ${error?.message || 'Unknown'}`, {
        error: error?.message,
        gameType,
        score,
        context,
        stack: error?.stack
      })
      console.error('❌❌❌ CRITICAL ERROR updating student progress:', error)
      console.error('Error details:', JSON.stringify(error, null, 2))
      console.error('Error stack:', error instanceof Error ? error.stack : 'No stack trace')
      
      // Emit error event for save status indicator
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('xp-sync-error', {
          detail: { error: error?.message || 'Unknown error', gameType }
        }))
      }
      
      return 0
    }
  })()
  
  // Track this operation for graceful shutdown
  return trackOperation(operation)
}

/**
 * Reset all progress for all students - useful for testing and development
 * This function will clear all progress data and reset students to level 1
 * WARNING: This is destructive and should only be used in development/testing
 */
export async function resetAllStudentProgress(): Promise<{ success: boolean; message: string }> {
  try {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return { success: false, message: 'Ingen användare inloggad' }
    }

    // Check if user is a teacher
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    if (profile?.role !== 'teacher') {
      return { success: false, message: 'Endast lärare kan återställa framsteg' }
    }

    console.log('Debug - Starting progress reset for all students...')

    // 1. Reset student_progress table
    const { error: progressError } = await supabase
      .from('student_progress')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000') // Delete all records

    if (progressError) {
      console.error('Error resetting student_progress:', progressError)
      return { success: false, message: `Fel vid återställning av student_progress: ${progressError.message}` }
    }

    console.log('Debug - student_progress table reset successfully')

    // 2. Reset game_sessions table (if it exists)
    try {
      const { error: sessionsError } = await supabase
        .from('game_sessions')
        .delete()
        .neq('id', '00000000-0000-0000-0000-000000000000')

      if (sessionsError) {
        console.log('Debug - game_sessions table not found or error:', sessionsError.message)
      } else {
        console.log('Debug - game_sessions table reset successfully')
      }
    } catch (sessionsError) {
      console.log('Debug - game_sessions table may not exist:', sessionsError)
    }

    // 3. Reset game_scores table (if it exists)
    try {
      const { error: scoresError } = await supabase
        .from('game_scores')
        .delete()
        .neq('id', '00000000-0000-0000-0000-000000000000')

      if (scoresError) {
        console.log('Debug - game_scores table not found or error:', scoresError.message)
      } else {
        console.log('Debug - game_scores table reset successfully')
      }
    } catch (scoresError) {
      console.log('Debug - game_scores table may not exist:', scoresError)
    }

    console.log('Debug - All student progress reset successfully')
    return { 
      success: true, 
      message: 'Alla elevers framsteg har återställts. De börjar nu från nivå 1 med 0 XP och 0 poäng.' 
    }

  } catch (error) {
    console.error('Error in resetAllStudentProgress:', error)
    return { 
      success: false, 
      message: `Ett fel uppstod: ${error instanceof Error ? error.message : 'Okänt fel'}` 
    }
  }
}

/**
 * Reset progress for a specific student - useful for testing individual students
 */
export async function resetStudentProgress(studentId: string): Promise<{ success: boolean; message: string }> {
  try {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return { success: false, message: 'Ingen användare inloggad' }
    }

    // Check if user is a teacher
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    if (profile?.role !== 'teacher') {
      return { success: false, message: 'Endast lärare kan återställa framsteg' }
    }

    console.log(`Debug - Starting progress reset for student: ${studentId}`)

    // 1. Reset student_progress for specific student
    const { error: progressError } = await supabase
      .from('student_progress')
      .delete()
      .eq('student_id', studentId)

    if (progressError) {
      console.error('Error resetting student_progress:', progressError)
      return { success: false, message: `Fel vid återställning av student_progress: ${progressError.message}` }
    }

    // 2. Reset game_sessions for specific student
    try {
      const { error: sessionsError } = await supabase
        .from('game_sessions')
        .delete()
        .eq('student_id', studentId)

      if (sessionsError) {
        console.log('Debug - game_sessions reset error:', sessionsError.message)
      }
    } catch (sessionsError) {
      console.log('Debug - game_sessions table may not exist:', sessionsError)
    }

    // 3. Reset game_scores for specific student
    try {
      const { error: scoresError } = await supabase
        .from('game_scores')
        .delete()
        .eq('student_id', studentId)

      if (scoresError) {
        console.log('Debug - game_scores reset error:', scoresError.message)
      }
    } catch (scoresError) {
      console.log('Debug - game_scores table may not exist:', scoresError)
    }

    console.log(`Debug - Student ${studentId} progress reset successfully`)
    return { 
      success: true, 
      message: `Eleven ${studentId} har fått sitt framsteg återställt. De börjar nu från nivå 1 med 0 XP och 0 poäng.` 
    }

  } catch (error) {
    console.error('Error in resetStudentProgress:', error)
    return { 
      success: false, 
      message: `Ett fel uppstod: ${error instanceof Error ? error.message : 'Okänt fel'}` 
    }
  }
}

/**
 * Refresh all teacher pages after student account deletion
 * This ensures that progress, classes, and other pages show updated data
 */
export async function refreshTeacherPages(): Promise<void> {
  try {
    console.log('Debug - Attempting to refresh teacher pages...')
    
    // Try multiple refresh methods to ensure the page updates
    
    // Method 1: Force a hard refresh (clear cache)
    if (typeof window !== 'undefined') {
      console.log('Debug - Using hard refresh method')
      window.location.href = window.location.href
    }
    
    // Method 2: If the above doesn't work, try a full page reload
    setTimeout(() => {
      if (typeof window !== 'undefined') {
        console.log('Debug - Fallback: using window.location.reload()')
        window.location.reload()
      }
    }, 100)
    
  } catch (error) {
    console.error('Error refreshing teacher pages:', error)
    
    // Final fallback: redirect to a different page and back
    if (typeof window !== 'undefined') {
      console.log('Debug - Final fallback: redirecting to refresh data')
      const currentPath = window.location.pathname
      window.location.href = '/teacher'
      setTimeout(() => {
        window.location.href = currentPath
      }, 500)
    }
  }
}

/**
 * Delete all student accounts completely - removes auth users, profiles, and all data
 * WARNING: This is extremely destructive and will remove all student accounts permanently
 * Only use in development/testing environments
 */
export async function deleteAllStudentAccounts(): Promise<{ success: boolean; message: string; deletedCount?: number; errors?: string[] }> {
  try {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return { success: false, message: 'Ingen användare inloggad' }
    }

    // Check if user is a teacher
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    if (profile?.role !== 'teacher') {
      return { success: false, message: 'Endast lärare kan ta bort elevkonton' }
    }

    console.log('Debug - Starting complete deletion of all student accounts...')
    const errors: string[] = []

    // 1. Get all student profiles
    const { data: studentProfiles, error: profileError } = await supabase
      .from('profiles')
      .select('id, email, role')
      .eq('role', 'student')

    if (profileError) {
      console.error('Error fetching student profiles:', profileError)
      return { success: false, message: `Fel vid hämtning av elevprofiler: ${profileError.message}` }
    }

    if (!studentProfiles || studentProfiles.length === 0) {
      return { success: false, message: 'Inga elevkonton hittades att ta bort' }
    }

    console.log(`Debug - Found ${studentProfiles.length} student accounts to delete`)
    console.log('Debug - Student IDs:', studentProfiles.map(p => p.id))

    // 2. Delete all related data first (foreign key constraints)
    
    // Delete student_progress for all students
    console.log('Debug - Attempting to delete student_progress...')
    const { error: progressError } = await supabase
      .from('student_progress')
      .delete()
      .in('student_id', studentProfiles.map(p => p.id))

    if (progressError) {
      const errorMsg = `student_progress deletion error: ${progressError.message}`
      console.log('Debug -', errorMsg)
      errors.push(errorMsg)
    } else {
      console.log('Debug - student_progress deleted successfully')
    }

    // Delete game_sessions for all students
    try {
      console.log('Debug - Attempting to delete game_sessions...')
      const { error: sessionsError } = await supabase
        .from('game_sessions')
        .delete()
        .in('student_id', studentProfiles.map(p => p.id))

      if (sessionsError) {
        const errorMsg = `game_sessions deletion error: ${sessionsError.message}`
        console.log('Debug -', errorMsg)
        errors.push(errorMsg)
      } else {
        console.log('Debug - game_sessions deleted successfully')
      }
    } catch (sessionsError) {
      const errorMsg = `game_sessions table may not exist: ${sessionsError}`
      console.log('Debug -', errorMsg)
      errors.push(errorMsg)
    }

    // Delete game_scores for all students
    try {
      console.log('Debug - Attempting to delete game_scores...')
      const { error: scoresError } = await supabase
        .from('game_scores')
        .delete()
        .in('student_id', studentProfiles.map(p => p.id))

      if (scoresError) {
        const errorMsg = `game_scores deletion error: ${scoresError.message}`
        console.log('Debug -', errorMsg)
        errors.push(errorMsg)
      } else {
        console.log('Debug - game_scores deleted successfully')
      }
    } catch (scoresError) {
      const errorMsg = `game_scores table may not exist: ${scoresError}`
      console.log('Debug -', errorMsg)
      errors.push(errorMsg)
    }

    // Delete class_students entries for all students
    console.log('Debug - Attempting to delete class_students...')
    const { error: classStudentsError } = await supabase
      .from('class_students')
      .delete()
      .in('student_id', studentProfiles.map(p => p.id))

    if (classStudentsError) {
      const errorMsg = `class_students deletion error: ${classStudentsError.message}`
      console.log('Debug -', errorMsg)
      errors.push(errorMsg)
    } else {
      console.log('Debug - class_students deleted successfully')
    }

    // Delete assigned_word_sets for all students
    console.log('Debug - Attempting to delete assigned_word_sets...')
    const { error: assignedError } = await supabase
      .from('assigned_word_sets')
      .delete()
      .in('student_id', studentProfiles.map(p => p.id))

    if (assignedError) {
      const errorMsg = `assigned_word_sets deletion error: ${assignedError.message}`
      console.log('Debug -', errorMsg)
      errors.push(errorMsg)
    } else {
      console.log('Debug - assigned_word_sets deleted successfully')
    }

    // 3. Delete student profiles
    console.log('Debug - Attempting to delete student profiles...')
    const { error: deleteProfilesError } = await supabase
      .from('profiles')
      .delete()
      .in('id', studentProfiles.map(p => p.id))

    if (deleteProfilesError) {
      const errorMsg = `Error deleting student profiles: ${deleteProfilesError.message}`
      console.error('Debug -', errorMsg)
      errors.push(errorMsg)
      return { 
        success: false, 
        message: `Fel vid borttagning av elevprofiler: ${deleteProfilesError.message}`,
        errors
      }
    }

    console.log('Debug - Student profiles deleted successfully')

    // 4. Verify deletion by checking if any student profiles remain
    console.log('Debug - Verifying deletion...')
    const { data: remainingProfiles, error: verifyError } = await supabase
      .from('profiles')
      .select('id, email, role')
      .eq('role', 'student')
    
    if (verifyError) {
      const errorMsg = `Verification query error: ${verifyError.message}`
      console.log('Debug -', errorMsg)
      errors.push(errorMsg)
    } else {
      console.log(`Debug - Verification: ${remainingProfiles?.length || 0} student profiles remain in database`)
      if (remainingProfiles && remainingProfiles.length > 0) {
        console.log('Debug - Remaining students:', remainingProfiles.map(p => p.email))
        errors.push(`Verification failed: ${remainingProfiles.length} students still remain`)
      }
    }

    // 5. Also verify that class_students table is empty
    const { data: remainingClassStudents, error: classVerifyError } = await supabase
      .from('class_students')
      .select('student_id')
    
    if (classVerifyError) {
      const errorMsg = `Class students verification error: ${classVerifyError.message}`
      console.log('Debug -', errorMsg)
      errors.push(errorMsg)
    } else {
      console.log(`Debug - Verification: ${remainingClassStudents?.length || 0} class_students entries remain`)
      if (remainingClassStudents && remainingClassStudents.length > 0) {
        errors.push(`Verification failed: ${remainingClassStudents.length} class_students entries still remain`)
      }
    }

    // 6. IMPORTANT: Note about auth users
    // We cannot delete auth users directly from the client due to security restrictions
    // The teacher will need to manually delete them from Supabase dashboard or use admin functions
    
    const deletedCount = studentProfiles.length
    const hasErrors = errors.length > 0
    
    if (hasErrors) {
      console.log(`Debug - Deletion completed with ${errors.length} errors:`, errors)
      return { 
        success: false, 
        message: `${deletedCount} elevkonton har tagits bort, men det uppstod fel. Kontrollera verifieringen för detaljer.`,
        deletedCount,
        errors
      }
    } else {
      console.log(`Debug - Successfully deleted ${deletedCount} student accounts and all their data`)
      return { 
        success: true, 
        message: `${deletedCount} elevkonton har tagits bort helt. Alla profiler, framsteg och data har raderats. OBS: Du måste manuellt ta bort auth-användarna från Supabase dashboard under Authentication > Users.`,
        deletedCount
      }
    }

  } catch (error) {
    console.error('Error in deleteAllStudentAccounts:', error)
    return { 
      success: false, 
      message: `Ett fel uppstod: ${error instanceof Error ? error.message : 'Okänt fel'}`,
      errors: [`Unexpected error: ${error instanceof Error ? error.message : 'Okänt fel'}`]
    }
  }
}

/**
 * Alternative method to delete all student accounts - tries different approach
 * This function attempts to delete data in a more specific way to avoid permission issues
 */
export async function deleteAllStudentAccountsAlternative(): Promise<{ success: boolean; message: string; deletedCount?: number; errors?: string[] }> {
  try {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return { success: false, message: 'Ingen användare inloggad' }
    }

    // Check if user is a teacher
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    if (profile?.role !== 'teacher') {
      return { success: false, message: 'Endast lärare kan ta bort elevkonton' }
    }

    console.log('Debug - Starting ALTERNATIVE deletion method...')
    const errors: string[] = []

    // 1. Get all student profiles
    const { data: studentProfiles, error: profileError } = await supabase
      .from('profiles')
      .select('id, email, role')
      .eq('role', 'student')

    if (profileError) {
      console.error('Error fetching student profiles:', profileError)
      return { success: false, message: `Fel vid hämtning av elevprofiler: ${profileError.message}` }
    }

    if (!studentProfiles || studentProfiles.length === 0) {
      return { success: false, message: 'Inga elevkonton hittades att ta bort' }
    }

    console.log(`Debug - Found ${studentProfiles.length} student accounts to delete`)
    const studentIds = studentProfiles.map(p => p.id)

    // 2. Try to delete data one by one to identify which operations fail
    
    // First, try to delete from student_progress with specific conditions
    console.log('Debug - Attempting to delete student_progress (alternative method)...')
    const { error: progressError } = await supabase
      .from('student_progress')
      .delete()
      .in('student_id', studentIds)

    if (progressError) {
      const errorMsg = `student_progress deletion failed: ${progressError.message}`
      console.log('Debug -', errorMsg)
      errors.push(errorMsg)
    } else {
      console.log('Debug - student_progress deleted successfully')
    }

    // Try to delete from class_students with specific conditions
    console.log('Debug - Attempting to delete class_students (alternative method)...')
    const { error: classStudentsError } = await supabase
      .from('class_students')
      .delete()
      .in('student_id', studentIds)

    if (classStudentsError) {
      const errorMsg = `class_students deletion failed: ${classStudentsError.message}`
      console.log('Debug -', errorMsg)
      errors.push(errorMsg)
    } else {
      console.log('Debug - class_students deleted successfully')
    }

    // Try to delete from assigned_word_sets
    console.log('Debug - Attempting to delete assigned_word_sets (alternative method)...')
    const { error: assignedError } = await supabase
      .from('assigned_word_sets')
      .delete()
      .in('student_id', studentIds)

    if (assignedError) {
      const errorMsg = `assigned_word_sets deletion failed: ${assignedError.message}`
      console.log('Debug -', errorMsg)
      errors.push(errorMsg)
    } else {
      console.log('Debug - assigned_word_sets deleted successfully')
    }

    // Try to delete from game_sessions
    try {
      console.log('Debug - Attempting to delete game_sessions (alternative method)...')
      const { error: sessionsError } = await supabase
        .from('game_sessions')
        .delete()
        .in('student_id', studentIds)

      if (sessionsError) {
        const errorMsg = `game_sessions deletion failed: ${sessionsError.message}`
        console.log('Debug -', errorMsg)
        errors.push(errorMsg)
      } else {
        console.log('Debug - game_sessions deleted successfully')
      }
    } catch (sessionsError) {
      const errorMsg = `game_sessions table may not exist: ${sessionsError}`
      console.log('Debug -', errorMsg)
      errors.push(errorMsg)
    }

    // Try to delete from game_scores
    try {
      console.log('Debug - Attempting to delete game_scores (alternative method)...')
      const { error: scoresError } = await supabase
        .from('game_scores')
        .delete()
        .in('student_id', studentIds)

      if (scoresError) {
        const errorMsg = `game_scores deletion failed: ${scoresError.message}`
        console.log('Debug -', errorMsg)
        errors.push(errorMsg)
      } else {
        console.log('Debug - game_scores deleted successfully')
      }
    } catch (scoresError) {
      const errorMsg = `game_scores table may not exist: ${scoresError}`
      console.log('Debug -', errorMsg)
      errors.push(errorMsg)
    }

    // 3. Now try to delete student profiles one by one
    console.log('Debug - Attempting to delete student profiles one by one...')
    let successfulProfileDeletions = 0
    let failedProfileDeletions = 0

    for (const student of studentProfiles) {
      try {
        const { error: deleteError } = await supabase
          .from('profiles')
          .delete()
          .eq('id', student.id)

        if (deleteError) {
          const errorMsg = `Failed to delete profile for ${student.email}: ${deleteError.message}`
          console.log('Debug -', errorMsg)
          errors.push(errorMsg)
          failedProfileDeletions++
        } else {
          console.log(`Debug - Successfully deleted profile for ${student.email}`)
          successfulProfileDeletions++
        }
      } catch (profileDeleteError) {
        const errorMsg = `Exception deleting profile for ${student.email}: ${profileDeleteError}`
        console.log('Debug -', errorMsg)
        errors.push(errorMsg)
        failedProfileDeletions++
      }
    }

    console.log(`Debug - Profile deletion summary: ${successfulProfileDeletions} successful, ${failedProfileDeletions} failed`)

    // 4. Verify deletion
    console.log('Debug - Verifying deletion (alternative method)...')
    const { data: remainingProfiles, error: verifyError } = await supabase
      .from('profiles')
      .select('id, email, role')
      .eq('role', 'student')
    
    if (verifyError) {
      const errorMsg = `Verification query error: ${verifyError.message}`
      console.log('Debug -', errorMsg)
      errors.push(errorMsg)
    } else {
      console.log(`Debug - Verification: ${remainingProfiles?.length || 0} student profiles remain in database`)
      if (remainingProfiles && remainingProfiles.length > 0) {
        console.log('Debug - Remaining students:', remainingProfiles.map(p => p.email))
        errors.push(`Verification failed: ${remainingProfiles.length} students still remain`)
      }
    }

    // Check class_students
    const { data: remainingClassStudents, error: classVerifyError } = await supabase
      .from('class_students')
      .select('student_id')
    
    if (classVerifyError) {
      const errorMsg = `Class students verification error: ${classVerifyError.message}`
      console.log('Debug -', errorMsg)
      errors.push(errorMsg)
    } else {
      console.log(`Debug - Verification: ${remainingClassStudents?.length || 0} class_students entries remain`)
      if (remainingClassStudents && remainingClassStudents.length > 0) {
        errors.push(`Verification failed: ${remainingClassStudents.length} class_students entries still remain`)
      }
    }

    const totalErrors = errors.length
    const hasErrors = totalErrors > 0
    
    if (hasErrors) {
      console.log(`Debug - Alternative deletion completed with ${totalErrors} errors:`, errors)
      return { 
        success: false, 
        message: `Alternativ borttagning slutförd. ${successfulProfileDeletions} profiler raderades, ${failedProfileDeletions} misslyckades. ${totalErrors} fel uppstod.`,
        deletedCount: successfulProfileDeletions,
        errors
      }
    } else {
      console.log(`Debug - Alternative method successfully deleted all ${studentProfiles.length} student accounts`)
      return { 
        success: true, 
        message: `Alternativ metod lyckades! Alla ${studentProfiles.length} elevkonton har tagits bort helt.`,
        deletedCount: studentProfiles.length
      }
    }

  } catch (error) {
    console.error('Error in deleteAllStudentAccountsAlternative:', error)
    return { 
      success: false, 
      message: `Ett fel uppstod i alternativ metod: ${error instanceof Error ? error.message : 'Okänt fel'}`,
      errors: [`Unexpected error: ${error instanceof Error ? error.message : 'Okänt fel'}`]
    }
  }
}

/**
 * Delete a specific student account completely
 */
export async function deleteStudentAccount(studentId: string): Promise<{ success: boolean; message: string }> {
  try {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return { success: false, message: 'Ingen användare inloggad' }
    }

    // Check if user is a teacher
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    if (profile?.role !== 'teacher') {
      return { success: false, message: 'Endast lärare kan ta bort elevkonton' }
    }

    // Verify the target user is actually a student
    const { data: targetProfile } = await supabase
      .from('profiles')
      .select('id, email, role')
      .eq('id', studentId)
      .single()

    if (!targetProfile) {
      return { success: false, message: 'Användaren hittades inte' }
    }

    if (targetProfile.role !== 'student') {
      return { success: false, message: 'Endast elevkonton kan tas bort med denna funktion' }
    }

    console.log(`Debug - Starting deletion of student account: ${targetProfile.email}`)

    // Delete all related data first
    const tablesToClean = [
      'student_progress',
      'game_sessions', 
      'game_scores',
      'class_students',
      'assigned_word_sets'
    ]

    for (const table of tablesToClean) {
      try {
        const { error } = await supabase
          .from(table)
          .delete()
          .eq('student_id', studentId)

        if (error) {
          console.log(`Debug - ${table} deletion error (may not exist):`, error.message)
        } else {
          console.log(`Debug - ${table} cleaned successfully`)
        }
      } catch (tableError) {
        console.log(`Debug - ${table} table may not exist:`, tableError)
      }
    }

    // Delete the student profile
    const { error: deleteProfileError } = await supabase
      .from('profiles')
      .delete()
      .eq('id', studentId)

    if (deleteProfileError) {
      console.error('Error deleting student profile:', deleteProfileError)
      return { success: false, message: `Fel vid borttagning av elevprofil: ${deleteProfileError.message}` }
    }

    console.log(`Debug - Student ${targetProfile.email} account deleted successfully`)
    return { 
      success: true, 
      message: `Elevkontot ${targetProfile.email} har tagits bort helt. OBS: Du måste manuellt ta bort auth-användaren från Supabase dashboard under Authentication > Users.` 
    }

  } catch (error) {
    console.error('Error in deleteStudentAccount:', error)
    return { 
      success: false, 
      message: `Ett fel uppstod: ${error instanceof Error ? error.message : 'Okänt fel'}` 
    }
  }
}

/**
 * Check if there are any remaining students in the database
 * Useful for verifying that deletion was successful
 */
export async function checkRemainingStudents(): Promise<{ 
  hasStudents: boolean; 
  studentCount: number; 
  students: Array<{ id: string; email: string }> 
}> {
  try {
    const { data: students, error } = await supabase
      .from('profiles')
      .select('id, email')
      .eq('role', 'student')
    
    if (error) {
      console.error('Error checking remaining students:', error)
      return { hasStudents: false, studentCount: 0, students: [] }
    }
    
    const studentCount = students?.length || 0
    const hasStudents = studentCount > 0
    
    console.log(`Debug - Check remaining students: ${studentCount} students found`)
    
    return {
      hasStudents,
      studentCount,
      students: students || []
    }
  } catch (error) {
    console.error('Error in checkRemainingStudents:', error)
    return { hasStudents: false, studentCount: 0, students: [] }
  }
}

/**
 * Check if there are any remaining class_students entries
 * Useful for verifying that deletion was successful
 */
export async function checkRemainingClassStudents(): Promise<{ 
  hasEntries: boolean; 
  entryCount: number 
}> {
  try {
    const { data: entries, error } = await supabase
      .from('class_students')
      .select('student_id')
    
    if (error) {
      console.error('Error checking remaining class students:', error)
      return { hasEntries: false, entryCount: 0 }
    }
    
    const entryCount = entries?.length || 0
    const hasEntries = entryCount > 0
    
    console.log(`Debug - Check remaining class students: ${entryCount} entries found`)
    
    return {
      hasEntries,
      entryCount
    }
  } catch (error) {
    console.error('Error in checkRemainingClassStudents:', error)
    return { hasEntries: false, entryCount: 0 }
  }
}

/**
 * Check if we have permission to delete profiles and provide alternative solutions
 */
export async function checkProfileDeletionPermissions(): Promise<{ 
  canDelete: boolean; 
  reason?: string; 
  alternativeSolutions: string[] 
}> {
  try {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return { 
        canDelete: false, 
        reason: 'Ingen användare inloggad',
        alternativeSolutions: ['Logga in som lärare']
      }
    }

    // Check if user is a teacher
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    if (profile?.role !== 'teacher') {
      return { 
        canDelete: false, 
        reason: 'Endast lärare kan ta bort elevkonton',
        alternativeSolutions: ['Logga in som lärare']
      }
    }

    // Try to delete a test profile to see if we have permission
    const { data: testProfiles } = await supabase
      .from('profiles')
      .select('id, email, role')
      .eq('role', 'student')
      .limit(1)

    if (!testProfiles || testProfiles.length === 0) {
      return { 
        canDelete: false, 
        reason: 'Inga elevprofiler att testa',
        alternativeSolutions: ['Inga elever att ta bort']
      }
    }

    const testProfile = testProfiles[0]
    
    // Try to delete the test profile
    const { error: deleteError } = await supabase
      .from('profiles')
      .delete()
      .eq('id', testProfile.id)

    if (deleteError) {
      // If deletion fails, it's likely due to RLS policies
      return { 
        canDelete: false, 
        reason: `RLS-policy blockerar borttagning: ${deleteError.message}`,
        alternativeSolutions: [
          'Ta bort auth-användare manuellt från Supabase dashboard',
          'Kontakta systemadministratör för att uppdatera RLS-policies',
          'Använd Supabase admin-funktioner istället för klient-kod'
        ]
      }
    } else {
      // If deletion succeeds, we can delete profiles
      return { 
        canDelete: true,
        alternativeSolutions: ['Du kan ta bort profiler via admin-sidan']
      }
    }

  } catch (error) {
    console.error('Error checking profile deletion permissions:', error)
    return { 
      canDelete: false, 
      reason: `Fel vid kontroll av behörigheter: ${error instanceof Error ? error.message : 'Okänt fel'}`,
      alternativeSolutions: ['Kontrollera nätverksanslutning och försök igen']
    }
  }
}

/**
 * Get detailed information about remaining data after deletion attempts
 */
export async function getDetailedDeletionStatus(): Promise<{
  remainingProfiles: Array<{ id: string; email: string; role: string }>
  remainingClassStudents: Array<{ student_id: string }>
  remainingProgress: Array<{ student_id: string; total_points: number }>
  deletionSummary: {
    profilesDeleted: number
    profilesRemaining: number
    classStudentsDeleted: number
    classStudentsRemaining: number
    progressDeleted: number
    progressRemaining: number
  }
}> {
  try {
    // Get remaining student profiles
    const { data: remainingProfiles } = await supabase
      .from('profiles')
      .select('id, email, role')
      .eq('role', 'student')

    // Get remaining class_students entries
    const { data: remainingClassStudents } = await supabase
      .from('class_students')
      .select('student_id')

    // Get remaining student_progress entries
    const { data: remainingProgress } = await supabase
      .from('student_progress')
      .select('student_id, total_points')

    // Calculate deletion summary
    const totalProfiles = remainingProfiles?.length || 0
    const totalClassStudents = remainingClassStudents?.length || 0
    const totalProgress = remainingProgress?.length || 0

    return {
      remainingProfiles: remainingProfiles || [],
      remainingClassStudents: remainingClassStudents || [],
      remainingProgress: remainingProgress || [],
      deletionSummary: {
        profilesDeleted: 0, // We don't know the original count
        profilesRemaining: totalProfiles,
        classStudentsDeleted: 0, // We don't know the original count
        classStudentsRemaining: totalClassStudents,
        progressDeleted: 0, // We don't know the original count
        progressRemaining: totalProgress
      }
    }
  } catch (error) {
    console.error('Error getting detailed deletion status:', error)
    return {
      remainingProfiles: [],
      remainingClassStudents: [],
      remainingProgress: [],
      deletionSummary: {
        profilesDeleted: 0,
        profilesRemaining: 0,
        classStudentsDeleted: 0,
        classStudentsRemaining: 0,
        progressDeleted: 0,
        progressRemaining: 0
      }
    }
  }
}



