import { NextRequest, NextResponse } from 'next/server'
import { runCleanupProcess } from '@/lib/softDelete'
import { supabase } from '@/lib/supabase'

// POST /api/cleanup - Kör GDPR cleanup-processen
export async function POST(request: NextRequest) {
  try {
    // Kontrollera att det är en auktoriserad användare (admin/lärare)
    const authHeader = request.headers.get('authorization')
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    console.log('Starting GDPR cleanup process...')
    
    const result = await runCleanupProcess()
    
    console.log('Cleanup process completed:', {
      success: result.success,
      processed: result.processed,
      errors: result.errors.length
    })

    return NextResponse.json({
      success: result.success,
      processed: result.processed,
      errors: result.errors,
      message: `Cleanup completed. Processed ${result.processed} records.`
    })

  } catch (error) {
    console.error('Error in cleanup API:', error)
    return NextResponse.json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

// GET /api/cleanup - Kontrollera status på cleanup-processen
export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization')
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Hämta statistik om raderade poster
    const { data: deletionLogs } = await supabase
      .from('deletion_logs')
      .select('*')
      .order('deleted_at', { ascending: false })
      .limit(50)

    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()
    
    // Räkna poster som väntar på cleanup
    const { data: pendingCleanup } = await supabase
      .from('profiles')
      .select('id')
      .not('deleted_at', 'is', null)
      .lt('deleted_at', thirtyDaysAgo)

    return NextResponse.json({
      recent_deletions: deletionLogs?.length || 0,
      pending_cleanup: pendingCleanup?.length || 0,
      last_cleanup_check: new Date().toISOString()
    })

  } catch (error) {
    console.error('Error in cleanup status API:', error)
    return NextResponse.json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}