import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

export async function POST(request: Request) {
  // Automatic session deletion has been disabled
  // Sessions will no longer be automatically deleted
  return NextResponse.json({ 
    success: true, 
    message: 'Session cleanup is disabled. Sessions are not automatically deleted.' 
  })
}


