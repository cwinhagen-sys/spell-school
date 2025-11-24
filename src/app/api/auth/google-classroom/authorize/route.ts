import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

/**
 * API Route: Authorize Google Classroom Access
 * 
 * Initiates OAuth flow for Google Classroom API access.
 * This is separate from the main Google OAuth login.
 */

export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization')
    if (!authHeader) {
      return NextResponse.json(
        { error: 'Unauthorized', message: 'Missing authorization header' },
        { status: 401 }
      )
    }

    // Verify teacher authentication
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

    if (!supabaseUrl || !serviceRoleKey) {
      return NextResponse.json(
        { error: 'Server configuration error' },
        { status: 500 }
      )
    }

    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    })

    const token = authHeader.replace('Bearer ', '')
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token)

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized', message: 'Invalid token' },
        { status: 401 }
      )
    }

    // Verify user is a teacher
    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    if (!profile || profile.role !== 'teacher') {
      return NextResponse.json(
        { error: 'Forbidden', message: 'Only teachers can access Google Classroom' },
        { status: 403 }
      )
    }

    // Check if Google Classroom API is configured
    const clientId = process.env.GOOGLE_CLASSROOM_CLIENT_ID
    const clientSecret = process.env.GOOGLE_CLASSROOM_CLIENT_SECRET

    if (!clientId || !clientSecret) {
      return NextResponse.json({
        error: 'Google Classroom API not configured',
        message: 'Google Classroom integration is not yet set up. Please contact support.',
        configured: false
      })
    }

    // Build redirect URI
    const origin = request.headers.get('origin') || request.nextUrl.origin
    const redirectUri = `${origin}/api/auth/google-classroom/callback`

    // Scopes needed for Google Classroom API
    const scopes = [
      'https://www.googleapis.com/auth/classroom.courses.readonly',
      'https://www.googleapis.com/auth/classroom.rosters.readonly',
      'https://www.googleapis.com/auth/userinfo.email',
      'https://www.googleapis.com/auth/userinfo.profile'
    ].join(' ')

    // Generate state token to prevent CSRF
    const state = Buffer.from(JSON.stringify({ userId: user.id, timestamp: Date.now() })).toString('base64url')

    // Build Google OAuth URL
    const authUrl = new URL('https://accounts.google.com/o/oauth2/v2/auth')
    authUrl.searchParams.set('client_id', clientId)
    authUrl.searchParams.set('redirect_uri', redirectUri)
    authUrl.searchParams.set('response_type', 'code')
    authUrl.searchParams.set('scope', scopes)
    authUrl.searchParams.set('access_type', 'offline')
    authUrl.searchParams.set('prompt', 'consent')
    authUrl.searchParams.set('state', state)

    // Store state in database for verification (optional, but recommended)
    // For now, we'll include it in the redirect URL

    return NextResponse.json({
      authUrl: authUrl.toString(),
      redirectUri
    })

  } catch (error: any) {
    console.error('Error initiating Google Classroom OAuth:', error)
    return NextResponse.json(
      { error: 'Internal server error', message: error.message },
      { status: 500 }
    )
  }
}



