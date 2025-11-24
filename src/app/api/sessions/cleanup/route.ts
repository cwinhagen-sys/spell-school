import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

export async function POST(request: Request) {
  try {
    // Use service role key for admin operations
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // Call the cleanup function
    const { error } = await supabase.rpc('cleanup_expired_sessions')

    if (error) {
      console.error('Error cleaning up sessions:', error)
      return NextResponse.json(
        { error: 'Failed to cleanup sessions', details: error.message },
        { status: 500 }
      )
    }

    return NextResponse.json({ success: true, message: 'Sessions cleaned up successfully' })
  } catch (error: any) {
    console.error('Error in cleanup route:', error)
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    )
  }
}


