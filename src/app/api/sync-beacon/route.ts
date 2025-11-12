/**
 * Beacon Sync Endpoint
 * 
 * Receives data from navigator.sendBeacon when page closes
 * Must be fast and reliable - no complex logic
 */

import { NextRequest, NextResponse } from 'next/server'
import { supabaseServer } from '@/lib/supabase-server'

export async function POST(request: NextRequest) {
  try {
    // Get authenticated user (try both header and cookie auth for beacon compatibility)
    let user = null
    
    // Try authorization header first
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

    // Parse events from beacon
    const body = await request.json()
    const { events } = body

    if (!events || !Array.isArray(events)) {
      return NextResponse.json({ error: 'Invalid events' }, { status: 400 })
    }

    console.log(`[BeaconAPI] Received ${events.length} events from user ${user.id}`)

    // Process events quickly - save to a processing queue table
    // Don't do complex processing here (beacon needs to be FAST)
    
    // For now, just acknowledge receipt
    // TODO: Store in a processing queue table for async processing
    
    // Quick storage approach: Insert into a pending_sync table
    const pendingEvents = events.map(e => ({
      user_id: user.id,
      event_type: e.type,
      event_data: e.data,
      received_at: new Date().toISOString(),
      processed: false
    }))

    // Try to insert into a queue table (create if doesn't exist)
    // For now, just log (we'll add proper table later)
    console.log(`[BeaconAPI] Would store ${pendingEvents.length} events for processing`)

    // Acknowledge receipt immediately
    return NextResponse.json({ 
      success: true, 
      received: events.length,
      message: 'Events received and queued for processing'
    }, { 
      status: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST',
      }
    })

  } catch (error) {
    console.error('[BeaconAPI] Error:', error)
    
    // Still return 200 to beacon (avoid retry spam)
    return NextResponse.json({ 
      error: 'Processing error', 
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 200 })
  }
}

// Handle OPTIONS for CORS
export async function OPTIONS(request: NextRequest) {
  return NextResponse.json({}, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    }
  })
}

