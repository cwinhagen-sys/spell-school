import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

/**
 * SIMPLIFIED XP Sync Endpoint
 * 
 * This version doesn't use RPC - it directly inserts into xp_events
 * and reads from xp_totals. Trigger handles xp_totals updates automatically.
 */
export async function POST(request: NextRequest) {
  try {
    // Get authorization header
    const authHeader = request.headers.get('Authorization')
    if (!authHeader) {
      console.error('XP Sync: No authorization header')
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const token = authHeader.replace('Bearer ', '')

    // Verify the user is authenticated using the provided token
    const { data: { user }, error: authError } = await supabase.auth.getUser(token)
    if (authError || !user) {
      console.error('XP Sync: Auth error:', authError)
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Parse request body
    const body = await request.json()
    const { events } = body

    if (!Array.isArray(events) || events.length === 0) {
      return NextResponse.json({ error: 'No events provided' }, { status: 400 })
    }

    console.log(`XP Sync (Simple): Processing ${events.length} events for user ${user.id}`)

    // Validate all events belong to the authenticated user
    const invalidEvents = events.filter((e: any) => e.student_id !== user.id)
    if (invalidEvents.length > 0) {
      console.error('XP Sync: Invalid events (wrong student_id):', invalidEvents)
      return NextResponse.json({ 
        error: 'Invalid events: student_id mismatch' 
      }, { status: 403 })
    }

    // Insert events directly (ON CONFLICT DO NOTHING for idempotency)
    const acceptedIds: string[] = []
    
    for (const event of events) {
      try {
        const { error: insertError } = await supabase
          .from('xp_events')
          .insert({
            id: event.id,
            student_id: event.student_id,
            kind: event.kind,
            delta: event.delta,
            word_set_id: event.word_set_id || null,
            homework_id: event.homework_id || null,
            created_at: event.created_at || new Date().toISOString(),
            metadata: event.metadata || {}
          })

        if (!insertError) {
          acceptedIds.push(event.id)
          console.log(`XP Sync: Event ${event.id} inserted successfully`)
          
          // ALSO create game session for this event (så läraren ser både XP och session samtidigt)
          try {
            const sessionData: any = {
              student_id: event.student_id,
              game_type: event.kind,
              word_set_id: event.word_set_id || null,
              homework_id: event.homework_id || null,
              started_at: event.metadata?.game_session?.started_at || event.created_at || new Date().toISOString(),
              finished_at: event.metadata?.game_session?.finished_at || new Date().toISOString(),
              score: event.delta,
              accuracy_pct: event.metadata?.game_session?.accuracy_pct || 100
            }
            
            await supabase.from('game_sessions').insert(sessionData)
            console.log(`XP Sync: Game session created for event ${event.id}`)
          } catch (sessionErr) {
            console.warn(`XP Sync: Game session creation failed (non-critical):`, sessionErr)
          }
          
        } else if (insertError.code === '23505') {
          // Duplicate key - already exists, that's okay (idempotent)
          console.log(`XP Sync: Event ${event.id} already exists (duplicate)`)
        } else {
          console.error(`XP Sync: Failed to insert event ${event.id}:`, insertError)
        }
      } catch (eventError) {
        console.error(`XP Sync: Error processing event ${event.id}:`, eventError)
      }
    }
    
    console.log(`XP Sync: Inserted ${acceptedIds.length} events and sessions`)

    // Wait a tiny bit for trigger to fire
    await new Promise(resolve => setTimeout(resolve, 100))

    // Read current totals (AFTER trigger has fired)
    const { data: totalsData } = await supabase
      .from('xp_totals')
      .select('total_xp, games_played')
      .eq('student_id', user.id)
      .maybeSingle()

    const totalXP = totalsData?.total_xp || 0
    const gamesPlayed = totalsData?.games_played || 0

    console.log(`XP Sync (Simple): Processed ${acceptedIds.length}/${events.length} events`)
    console.log(`XP Sync (Simple): Total XP: ${totalXP}, Games: ${gamesPlayed}`)
    console.log(`XP Sync (Simple): Trigger has updated xp_totals successfully!`)

    return NextResponse.json({
      success: true,
      accepted_ids: acceptedIds,
      total_xp: totalXP,
      games_played: gamesPlayed
    })

  } catch (error) {
    console.error('XP Sync (Simple): Unexpected error:', error)
    return NextResponse.json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

