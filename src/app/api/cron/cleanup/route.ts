import { NextRequest, NextResponse } from 'next/server'
import { runCleanupProcess } from '@/lib/softDelete'
import { downgradeExpiredTestPilots } from '@/lib/subscription'
import { createClient } from '@supabase/supabase-js'

// Use service role key for admin operations
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://edbbestqdwldryxuxkma.supabase.co'
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'sb_publishable_bx81qdFnpcX79ovYbCL98Q_eirRtByp'

const supabaseAdmin = createClient(supabaseUrl, supabaseServiceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
})

// POST /api/cron/cleanup - Automatisk GDPR cleanup och test pilot nedgradering (körs dagligen)
export async function POST(request: NextRequest) {
  try {
    // Kontrollera att det är en cron job (från Vercel eller liknande)
    const authHeader = request.headers.get('authorization')
    const cronSecret = process.env.CRON_SECRET
    
    if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    console.log('Starting scheduled cleanup process...')
    
    // Run GDPR cleanup
    const cleanupResult = await runCleanupProcess()
    
    // Downgrade expired test pilots
    console.log('Checking for expired test pilot subscriptions...')
    const testPilotResult = await downgradeExpiredTestPilots(supabaseAdmin)
    
    console.log('Scheduled cleanup completed:', {
      cleanup: {
        success: cleanupResult.success,
        processed: cleanupResult.processed,
        errors: cleanupResult.errors.length
      },
      testPilots: {
        downgraded: testPilotResult.downgraded,
        errors: testPilotResult.errors.length
      }
    })

    // Logga resultatet för övervakning
    const allErrors = [...cleanupResult.errors, ...testPilotResult.errors]
    if (allErrors.length > 0) {
      console.error('Cleanup errors:', allErrors)
    }

    return NextResponse.json({
      success: cleanupResult.success,
      cleanup: {
        processed: cleanupResult.processed,
        errors: cleanupResult.errors
      },
      testPilots: {
        downgraded: testPilotResult.downgraded,
        errors: testPilotResult.errors
      },
      timestamp: new Date().toISOString(),
      message: `Scheduled cleanup completed. Processed ${cleanupResult.processed} records, downgraded ${testPilotResult.downgraded} expired test pilots.`
    })

  } catch (error) {
    console.error('Error in scheduled cleanup:', error)
    return NextResponse.json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    }, { status: 500 })
  }
}







