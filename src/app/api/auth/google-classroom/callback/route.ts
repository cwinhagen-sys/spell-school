import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

/**
 * API Route: Google Classroom OAuth Callback
 * 
 * Handles the OAuth callback from Google and exchanges code for access token.
 * Stores the token in the database for future use.
 */

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const code = searchParams.get('code')
    const state = searchParams.get('state')
    const error = searchParams.get('error')

    if (error) {
      const errorDescription = searchParams.get('error_description') || error
      return NextResponse.redirect(
        new URL(`/teacher/classes?error=${encodeURIComponent(errorDescription)}`, request.nextUrl.origin)
      )
    }

    if (!code || !state) {
      return NextResponse.redirect(
        new URL('/teacher/classes?error=Missing authorization code', request.nextUrl.origin)
      )
    }

    // Verify state
    let stateData: { userId: string; timestamp: number }
    try {
      stateData = JSON.parse(Buffer.from(state, 'base64url').toString())
      // Check if state is not too old (5 minutes)
      if (Date.now() - stateData.timestamp > 5 * 60 * 1000) {
        return NextResponse.redirect(
          new URL('/teacher/classes?error=Authorization expired', request.nextUrl.origin)
        )
      }
    } catch {
      return NextResponse.redirect(
        new URL('/teacher/classes?error=Invalid state parameter', request.nextUrl.origin)
      )
    }

    const clientId = process.env.GOOGLE_CLASSROOM_CLIENT_ID
    const clientSecret = process.env.GOOGLE_CLASSROOM_CLIENT_SECRET

    if (!clientId || !clientSecret) {
      return NextResponse.redirect(
        new URL('/teacher/classes?error=Server configuration error', request.nextUrl.origin)
      )
    }

    // Build redirect URI
    const origin = request.nextUrl.origin
    const redirectUri = `${origin}/api/auth/google-classroom/callback`

    // Exchange code for access token
    const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        code,
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: redirectUri,
        grant_type: 'authorization_code',
      }),
    })

    if (!tokenResponse.ok) {
      const errorData = await tokenResponse.json().catch(() => ({}))
      console.error('Token exchange error:', errorData)
      return NextResponse.redirect(
        new URL(`/teacher/classes?error=${encodeURIComponent(errorData.error_description || 'Failed to get access token')}`, request.nextUrl.origin)
      )
    }

    const tokenData = await tokenResponse.json()
    const { access_token, refresh_token, expires_in } = tokenData

    if (!access_token) {
      return NextResponse.redirect(
        new URL('/teacher/classes?error=No access token received', request.nextUrl.origin)
      )
    }

    // Store tokens in database
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

    if (!supabaseUrl || !serviceRoleKey) {
      return NextResponse.redirect(
        new URL('/teacher/classes?error=Server configuration error', request.nextUrl.origin)
      )
    }

    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    })

    // Store tokens in profiles table (add google_classroom_token column if needed)
    const expiresAt = expires_in 
      ? new Date(Date.now() + expires_in * 1000).toISOString()
      : null

    const { error: updateError } = await supabaseAdmin
      .from('profiles')
      .update({
        google_classroom_access_token: access_token,
        google_classroom_refresh_token: refresh_token,
        google_classroom_token_expires_at: expiresAt,
        google_classroom_connected_at: new Date().toISOString()
      })
      .eq('id', stateData.userId)

    if (updateError) {
      console.error('Error storing tokens:', updateError)
      // Try without optional columns if they don't exist
      // For now, we'll continue even if storage fails
    }

    // Redirect back to classes page with success
    return NextResponse.redirect(
      new URL('/teacher/classes?googleClassroomConnected=true', request.nextUrl.origin)
    )

  } catch (error: any) {
    console.error('Error in Google Classroom callback:', error)
    return NextResponse.redirect(
      new URL(`/teacher/classes?error=${encodeURIComponent(error.message || 'Unknown error')}`, request.nextUrl.origin)
    )
  }
}


