import { NextRequest, NextResponse } from 'next/server'
import { supabaseServer } from '@/lib/supabase-server'
import { z } from 'zod'

// Event schema for quest synchronization
const QuestEventSchema = z.object({
  id: z.string().uuid(), // idempotency key
  type: z.enum(['QUEST_PROGRESS', 'QUEST_COMPLETE']),
  questId: z.string(),
  delta: z.number().optional(),
  xp: z.number().optional(),
  ts: z.number()
})

const QuestSyncRequestSchema = z.object({
  events: z.array(QuestEventSchema)
})

type QuestEvent = z.infer<typeof QuestEventSchema>

/**
 * Atomic, idempotent quest sync endpoint
 * 
 * Features:
 * - Single transaction for quest progress + XP award
 * - Idempotency to prevent duplicate awards
 * - Server-determined dates (no client trust)
 * - Robust error handling
 */
export async function POST(request: NextRequest) {
  try {
    // Parse and validate request
    const body = await request.json()
    const { events } = QuestSyncRequestSchema.parse(body)
    
    // Get authenticated user (try both header and cookie auth)
    let user = null
    
    // Try authorization header first (for fetch requests)
    const authHeader = request.headers.get('authorization')
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.substring(7)
      const { data: { user: headerUser }, error: headerError } = await supabaseServer.auth.getUser(token)
      if (!headerError && headerUser) {
        user = headerUser
      }
    }
    
    // Try cookie-based auth (for sendBeacon requests)
    if (!user) {
      const { data: { user: cookieUser }, error: cookieError } = await supabaseServer.auth.getUser()
      if (!cookieError && cookieUser) {
        user = cookieUser
      }
    }
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    console.log(`Quest Sync: Processing ${events.length} events for user ${user.id}`)

    // OPTIMIZATION: Batch check all idempotency keys at once
    const eventIds = events.map(e => e.id)
    const { data: existingEvents } = await supabaseServer
      .from('quest_event_applied')
      .select('idempotency_key')
      .in('idempotency_key', eventIds)
    
    const processedKeys = new Set(existingEvents?.map(e => e.idempotency_key) || [])
    
    // Filter out already processed events
    const eventsToProcess = events.filter(e => !processedKeys.has(e.id))
    
    if (eventsToProcess.length === 0) {
      console.log(`Quest Sync: All ${events.length} events already processed`)
      return NextResponse.json({
        success: true,
        processed: events.length,
        results: events.map(e => ({ eventId: e.id, status: 'skipped', reason: 'already_processed' }))
      })
    }

    console.log(`Quest Sync: Processing ${eventsToProcess.length} new events (${events.length - eventsToProcess.length} already processed)`)

    // Determine server date once (UTC midnight)
    const questDate = new Date()
    questDate.setUTCHours(0, 0, 0, 0)
    const questDateStr = questDate.toISOString().split('T')[0]

    // OPTIMIZATION: Process all events in parallel
    const processEvent = async (event: QuestEvent): Promise<any> => {
      try {
        let result: any = { eventId: event.id, status: 'processed' }

        if (event.type === 'QUEST_PROGRESS') {
          // Update quest progress
          const { data: progressResult, error: progressError } = await supabaseServer
            .rpc('upsert_quest_progress', {
              p_user_id: user.id,
              p_quest_id: event.questId,
              p_quest_date: questDateStr,
              p_progress_delta: event.delta || 0
            })

          if (progressError) {
            console.error('Quest Sync: Progress update error:', progressError)
            result = { eventId: event.id, status: 'error', error: progressError.message }
          } else {
            result.progress = progressResult
          }
        } else if (event.type === 'QUEST_COMPLETE') {
          // Special handling for bonus quest completion
          if (event.questId === 'all_quests_bonus') {
            // For bonus quest, award XP atomically
            const { error: xpError } = await supabaseServer
              .rpc('increment_student_xp', {
                p_student_id: user.id,
                p_xp_delta: event.xp || 0,
                p_game_type: 'daily_quest'
              })

            if (xpError) {
              console.error('Quest Sync: Bonus XP award error:', xpError)
              result = { eventId: event.id, status: 'error', error: xpError.message }
            } else {
              result = { eventId: event.id, status: 'processed', xp_awarded: event.xp }
            }
          } else {
            // Regular quest completion - check if already completed
            const { data: existingQuest } = await supabaseServer
              .from('daily_quest_progress')
              .select('completed_at, xp_awarded')
              .eq('user_id', user.id)
              .eq('quest_id', event.questId)
              .eq('quest_date', questDateStr)
              .single()

            if (existingQuest && existingQuest.completed_at && existingQuest.xp_awarded) {
              console.log(`Quest Sync: Quest ${event.questId} already completed and XP awarded, skipping`)
              result = { eventId: event.id, status: 'skipped', reason: 'already_completed' }
            } else {
              // Complete quest and award XP atomically
              const { data: completeResult, error: completeError } = await supabaseServer
                .rpc('complete_quest_and_award_xp', {
                  p_user_id: user.id,
                  p_quest_id: event.questId,
                  p_quest_date: questDateStr,
                  p_xp_amount: event.xp || 0
                })

              if (completeError) {
                console.error('Quest Sync: Quest completion error:', completeError)
                result = { eventId: event.id, status: 'error', error: completeError.message }
              } else {
                console.log(`Quest Sync: Quest ${event.questId} completed successfully for user ${user.id}`)
                result.completion = completeResult
                result.status = 'completed'
              }
            }
          }
        }

        return result
      } catch (eventError) {
        console.error(`Quest Sync: Error processing event ${event.id}:`, eventError)
        return {
          eventId: event.id,
          status: 'error',
          error: eventError instanceof Error ? eventError.message : 'Unknown error'
        }
      }
    }

    // Process all events in parallel
    const results = await Promise.all(eventsToProcess.map(processEvent))

    // OPTIMIZATION: Batch insert all idempotency records at once
    const idempotencyRecords = results
      .filter(r => r.status !== 'error' && r.status !== 'skipped')
      .map(r => {
        const event = events.find(e => e.id === r.eventId)!
        return {
          idempotency_key: event.id,
          applied_at: new Date().toISOString(),
          user_id: user.id,
          event_type: event.type,
          quest_id: event.questId
        }
      })

    if (idempotencyRecords.length > 0) {
      try {
        const { error: idempotencyError } = await supabaseServer
          .from('quest_event_applied')
          .insert(idempotencyRecords)

        if (idempotencyError) {
          console.error('Quest Sync: Batch idempotency tracking error:', idempotencyError)
          // Mark idempotency as failed for all affected results
          results.forEach(r => {
            if (r.status !== 'error' && r.status !== 'skipped') {
              r.idempotency = { applied: false, error: idempotencyError.message }
            }
          })
        } else {
          // Mark idempotency as successful
          results.forEach(r => {
            if (r.status !== 'error' && r.status !== 'skipped') {
              r.idempotency = { applied: true }
            }
          })
        }
      } catch (idempotencyException) {
        console.error('Quest Sync: Batch idempotency tracking exception:', idempotencyException)
        results.forEach(r => {
          if (r.status !== 'error' && r.status !== 'skipped') {
            r.idempotency = { applied: false, error: 'Exception during idempotency tracking' }
          }
        })
      }
    }

    // Add skipped events for already processed ones
    const skippedResults = events
      .filter(e => processedKeys.has(e.id))
      .map(e => ({ eventId: e.id, status: 'skipped', reason: 'already_processed' }))
    
    const allResults = [...skippedResults, ...results]

    console.log(`Quest Sync: Completed processing ${events.length} events (${eventsToProcess.length} new, ${skippedResults.length} skipped)`)

    return NextResponse.json({
      success: true,
      processed: allResults.length,
      results: allResults
    })

  } catch (error) {
    console.error('Quest Sync: Request processing error:', error)
    
    if (error instanceof z.ZodError) {
      return NextResponse.json({
        error: 'Invalid request format',
        details: error.errors
      }, { status: 400 })
    }

    return NextResponse.json({
      error: 'Internal server error'
    }, { status: 500 })
  }
}
