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

    // Process events in a transaction-like manner using Supabase RPC
    const results = []
    
    for (const event of events) {
      try {
        // Check if event was already processed (idempotency)
        const { data: existingEvent } = await supabaseServer
          .from('quest_event_applied')
          .select('id')
          .eq('idempotency_key', event.id)
          .single()

        if (existingEvent) {
          console.log(`Quest Sync: Event ${event.id} already processed, skipping`)
          results.push({ eventId: event.id, status: 'skipped', reason: 'already_processed' })
          continue
        }

        // Determine server date (UTC midnight)
        const questDate = new Date()
        questDate.setUTCHours(0, 0, 0, 0)
        const questDateStr = questDate.toISOString().split('T')[0]

        // Process the event based on type
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
            // For bonus quest, award XP atomically using the same pattern as regular quests
            // Use a direct SQL update to add XP instead of upsert to prevent overwriting
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

        // Mark event as applied (idempotency) - with error handling for RLS issues
        try {
          const { error: idempotencyError } = await supabaseServer
            .from('quest_event_applied')
            .insert({
              idempotency_key: event.id,
              applied_at: new Date().toISOString(),
              user_id: user.id,
              event_type: event.type,
              quest_id: event.questId
            })

          if (idempotencyError) {
            console.error('Quest Sync: Idempotency tracking error:', idempotencyError)
            // Don't fail the whole request for this - quest completion is more important
            result.idempotency = { applied: false, error: idempotencyError.message }
          } else {
            result.idempotency = { applied: true }
          }
        } catch (idempotencyException) {
          console.error('Quest Sync: Idempotency tracking exception:', idempotencyException)
          result.idempotency = { applied: false, error: 'Exception during idempotency tracking' }
        }

        results.push(result)

      } catch (eventError) {
        console.error(`Quest Sync: Error processing event ${event.id}:`, eventError)
        results.push({
          eventId: event.id,
          status: 'error',
          error: eventError instanceof Error ? eventError.message : 'Unknown error'
        })
      }
    }

    console.log(`Quest Sync: Completed processing ${events.length} events`)

    return NextResponse.json({
      success: true,
      processed: results.length,
      results
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
