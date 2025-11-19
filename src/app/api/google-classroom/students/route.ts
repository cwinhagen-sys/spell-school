import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

/**
 * API Route: Get Students from Google Classroom Course
 * 
 * This endpoint fetches students from a specific Google Classroom course.
 * Currently returns a placeholder response until Google Classroom API is configured.
 * 
 * Query parameters:
 * - courseId: Google Classroom course ID
 */

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const courseId = searchParams.get('courseId')
    const authHeader = request.headers.get('authorization')

    if (!courseId) {
      return NextResponse.json(
        { error: 'Missing courseId parameter' },
        { status: 400 }
      )
    }

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
    const hasGoogleClassroomConfig = !!(
      process.env.GOOGLE_CLASSROOM_CLIENT_ID &&
      process.env.GOOGLE_CLASSROOM_CLIENT_SECRET
    )

    if (!hasGoogleClassroomConfig) {
      return NextResponse.json({
        error: 'Google Classroom API not configured',
        message: 'Google Classroom integration is not yet set up. Please contact support.',
        configured: false,
        students: []
      })
    }

    // Get Google Classroom access token from user's profile
    const { data: profileWithToken } = await supabaseAdmin
      .from('profiles')
      .select('google_classroom_access_token, google_classroom_refresh_token, google_classroom_token_expires_at')
      .eq('id', user.id)
      .single()

    if (!profileWithToken?.google_classroom_access_token) {
      return NextResponse.json({
        error: 'Not connected',
        message: 'Du behöver först ansluta ditt Google Classroom-konto.',
        configured: true,
        connected: false,
        courseId,
        students: []
      })
    }

    // Check if token is expired and refresh if needed
    let accessToken = profileWithToken.google_classroom_access_token
    const expiresAt = profileWithToken.google_classroom_token_expires_at
    const refreshToken = profileWithToken.google_classroom_refresh_token

    if (expiresAt && new Date(expiresAt) < new Date() && refreshToken) {
      // Token expired, try to refresh
      try {
        const clientId = process.env.GOOGLE_CLASSROOM_CLIENT_ID
        const clientSecret = process.env.GOOGLE_CLASSROOM_CLIENT_SECRET

        if (clientId && clientSecret) {
          const refreshResponse = await fetch('https://oauth2.googleapis.com/token', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/x-www-form-urlencoded',
            },
            body: new URLSearchParams({
              refresh_token: refreshToken,
              client_id: clientId,
              client_secret: clientSecret,
              grant_type: 'refresh_token',
            }),
          })

          if (refreshResponse.ok) {
            const refreshData = await refreshResponse.json()
            accessToken = refreshData.access_token

            // Update token in database
            const expiresAtNew = refreshData.expires_in
              ? new Date(Date.now() + refreshData.expires_in * 1000).toISOString()
              : null

            await supabaseAdmin
              .from('profiles')
              .update({
                google_classroom_access_token: accessToken,
                google_classroom_token_expires_at: expiresAtNew
              })
              .eq('id', user.id)
          }
        }
      } catch (refreshError) {
        console.error('Error refreshing token:', refreshError)
        // Continue with old token, might still work
      }
    }

    // Call Google Classroom API to get students
    try {
      const classroomResponse = await fetch(
        `https://classroom.googleapis.com/v1/courses/${courseId}/students`,
        {
          headers: {
            'Authorization': `Bearer ${accessToken}`,
          },
        }
      )

      if (!classroomResponse.ok) {
        const errorData = await classroomResponse.json().catch(() => ({}))
        
        if (classroomResponse.status === 401) {
          // Token invalid, need to reconnect
          return NextResponse.json({
            error: 'Token expired',
            message: 'Din Google Classroom-anslutning har gått ut. Vänligen anslut igen.',
            configured: true,
            connected: false,
            courseId,
            students: []
          })
        }

        if (classroomResponse.status === 403) {
          return NextResponse.json({
            error: 'Permission denied',
            message: 'Du har inte behörighet att se elever i denna kurs.',
            configured: true,
            connected: true,
            courseId,
            students: []
          })
        }

        throw new Error(errorData.error?.message || `Google Classroom API error: ${classroomResponse.status}`)
      }

      const classroomData = await classroomResponse.json()
      const students = (classroomData.students || []).map((student: any) => ({
        userId: student.userId,
        courseId: student.courseId,
        profile: {
          id: student.profile?.id,
          name: student.profile?.name?.fullName || student.profile?.name?.givenName || '',
          emailAddress: student.profile?.emailAddress,
          photoUrl: student.profile?.photoUrl,
          verifiedTeacher: student.profile?.verifiedTeacher
        }
      }))

      return NextResponse.json({
        students,
        configured: true,
        connected: true,
        courseId
      })

    } catch (apiError: any) {
      console.error('Error calling Google Classroom API:', apiError)
      return NextResponse.json({
        error: 'API error',
        message: apiError.message || 'Kunde inte hämta elever från Google Classroom',
        configured: true,
        connected: true,
        courseId,
        students: []
      })
    }

  } catch (error: any) {
    console.error('Error fetching Google Classroom students:', error)
    return NextResponse.json(
      { error: 'Internal server error', message: error.message },
      { status: 500 }
    )
  }
}



