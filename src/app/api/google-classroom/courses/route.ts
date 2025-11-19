import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

/**
 * API Route: Get Google Classroom Courses
 * 
 * This endpoint fetches courses from Google Classroom API.
 * Currently returns a placeholder response until Google Classroom API is configured.
 * 
 * To enable:
 * 1. Set up Google Classroom API in Google Cloud Console
 * 2. Add GOOGLE_CLASSROOM_CLIENT_ID and GOOGLE_CLASSROOM_CLIENT_SECRET to environment variables
 * 3. Implement OAuth token exchange
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
    const hasGoogleClassroomConfig = !!(
      process.env.GOOGLE_CLASSROOM_CLIENT_ID &&
      process.env.GOOGLE_CLASSROOM_CLIENT_SECRET
    )

    if (!hasGoogleClassroomConfig) {
      return NextResponse.json({
        error: 'Google Classroom API not configured',
        message: 'Google Classroom integration is not yet set up. Please contact support.',
        configured: false,
        courses: []
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
        message: 'Du behöver först ansluta ditt Google Classroom-konto. Klicka på "Anslut Google Classroom" för att börja.',
        configured: true,
        connected: false,
        courses: []
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

    // Call Google Classroom API
    try {
      const classroomResponse = await fetch('https://classroom.googleapis.com/v1/courses?teacherId=me&courseStates=ACTIVE', {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
        },
      })

      if (!classroomResponse.ok) {
        const errorData = await classroomResponse.json().catch(() => ({}))
        
        if (classroomResponse.status === 401) {
          // Token invalid, need to reconnect
          return NextResponse.json({
            error: 'Token expired',
            message: 'Din Google Classroom-anslutning har gått ut. Vänligen anslut igen.',
            configured: true,
            connected: false,
            courses: []
          })
        }

        throw new Error(errorData.error?.message || `Google Classroom API error: ${classroomResponse.status}`)
      }

      const classroomData = await classroomResponse.json()
      const courses = (classroomData.courses || []).map((course: any) => ({
        id: course.id,
        name: course.name,
        section: course.section,
        descriptionHeading: course.descriptionHeading,
        description: course.description,
        room: course.room,
        ownerId: course.ownerId,
        creationTime: course.creationTime,
        updateTime: course.updateTime,
        enrollmentCode: course.enrollmentCode,
        courseState: course.courseState,
        alternateLink: course.alternateLink,
        teacherGroupEmail: course.teacherGroupEmail,
        courseGroupEmail: course.courseGroupEmail,
        teacherFolder: course.teacherFolder,
        courseMaterialSets: course.courseMaterialSets,
        guardiansEnabled: course.guardiansEnabled,
        calendarId: course.calendarId
      }))

      return NextResponse.json({
        courses,
        configured: true,
        connected: true
      })

    } catch (apiError: any) {
      console.error('Error calling Google Classroom API:', apiError)
      return NextResponse.json({
        error: 'API error',
        message: apiError.message || 'Kunde inte hämta kurser från Google Classroom',
        configured: true,
        connected: true,
        courses: []
      })
    }

  } catch (error: any) {
    console.error('Error fetching Google Classroom courses:', error)
    return NextResponse.json(
      { error: 'Internal server error', message: error.message },
      { status: 500 }
    )
  }
}



