import { NextRequest, NextResponse } from 'next/server'
import { runCleanupProcess } from '@/lib/softDelete'

// POST /api/cron/cleanup - Automatisk GDPR cleanup (körs dagligen)
export async function POST(request: NextRequest) {
  try {
    // Kontrollera att det är en cron job (från Vercel eller liknande)
    const authHeader = request.headers.get('authorization')
    const cronSecret = process.env.CRON_SECRET
    
    if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    console.log('Starting scheduled GDPR cleanup process...')
    
    const result = await runCleanupProcess()
    
    console.log('Scheduled cleanup completed:', {
      success: result.success,
      processed: result.processed,
      errors: result.errors.length
    })

    // Logga resultatet för övervakning
    if (result.errors.length > 0) {
      console.error('Cleanup errors:', result.errors)
    }

    return NextResponse.json({
      success: result.success,
      processed: result.processed,
      errors: result.errors,
      timestamp: new Date().toISOString(),
      message: `Scheduled cleanup completed. Processed ${result.processed} records.`
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







