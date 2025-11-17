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

    // TODO: Implement actual Google Classroom API call
    // This requires:
    // 1. Getting Google OAuth token from user's session
    // 2. Exchanging for Classroom API access token
    // 3. Calling: GET https://classroom.googleapis.com/v1/courses/{courseId}/students
    
    // Placeholder response
    return NextResponse.json({
      error: 'Not implemented',
      message: 'Google Classroom API integration is not yet implemented. This feature is coming soon.',
      configured: true,
      courseId,
      students: []
    })

  } catch (error: any) {
    console.error('Error fetching Google Classroom students:', error)
    return NextResponse.json(
      { error: 'Internal server error', message: error.message },
      { status: 500 }
    )
  }
}

