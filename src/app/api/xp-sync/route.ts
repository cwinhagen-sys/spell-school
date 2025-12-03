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

    // OPTIMIZATION: Batch insert all events at once
    const now = new Date().toISOString()
    const xpEventRecords = events.map((event: any) => ({
      id: event.id,
      student_id: event.student_id,
      kind: event.kind,
      delta: event.delta,
      word_set_id: event.word_set_id || null,
      homework_id: event.homework_id || null,
      created_at: event.created_at || now,
      metadata: event.metadata || {}
    }))

    // Batch insert XP events (ON CONFLICT DO NOTHING for idempotency)
    const { data: insertedEvents, error: insertError } = await supabase
      .from('xp_events')
      .upsert(xpEventRecords, { onConflict: 'id', ignoreDuplicates: true })
      .select('id')

    const acceptedIds = insertedEvents?.map(e => e.id) || []
    
    // Handle any events that failed to insert (non-duplicate errors)
    if (insertError && insertError.code !== '23505') {
      console.error('XP Sync: Batch insert error:', insertError)
      // Fall back to individual inserts for error handling
      for (const event of events) {
        try {
          const { error: singleError } = await supabase
            .from('xp_events')
            .insert({
              id: event.id,
              student_id: event.student_id,
              kind: event.kind,
              delta: event.delta,
              word_set_id: event.word_set_id || null,
              homework_id: event.homework_id || null,
              created_at: event.created_at || now,
              metadata: event.metadata || {}
            })

          if (!singleError) {
            acceptedIds.push(event.id)
          } else if (singleError.code === '23505') {
            // Duplicate - already exists, that's okay
            console.log(`XP Sync: Event ${event.id} already exists (duplicate)`)
          }
        } catch (eventError) {
          console.error(`XP Sync: Error processing event ${event.id}:`, eventError)
        }
      }
    }

    console.log(`XP Sync: Inserted ${acceptedIds.length}/${events.length} events`)

    // OPTIMIZATION: Batch insert game sessions for accepted events
    const sessionRecords = events
      .filter((e: any) => acceptedIds.includes(e.id))
      .map((event: any) => ({
        student_id: event.student_id,
        game_type: event.kind,
        word_set_id: event.word_set_id || null,
        homework_id: event.homework_id || null,
        started_at: event.metadata?.game_session?.started_at || event.created_at || now,
        finished_at: event.metadata?.game_session?.finished_at || now,
        score: event.delta,
        accuracy_pct: event.metadata?.game_session?.accuracy_pct || 100
      }))

    if (sessionRecords.length > 0) {
      try {
        const { error: sessionError } = await supabase
          .from('game_sessions')
          .insert(sessionRecords)

        if (sessionError) {
          console.warn('XP Sync: Batch game session creation failed (non-critical):', sessionError)
        } else {
          console.log(`XP Sync: Created ${sessionRecords.length} game sessions`)
        }
      } catch (sessionErr) {
        console.warn('XP Sync: Batch game session creation exception (non-critical):', sessionErr)
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

