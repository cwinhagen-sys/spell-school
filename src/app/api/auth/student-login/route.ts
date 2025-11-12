import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

// Supabase configuration
const supabaseUrl = 'https://edbbestqdwldryxuxkma.supabase.co'
const supabaseAnonKey = 'sb_publishable_bx81qdFnpcX79ovYbCL98Q_eirRtByp'

/**
 * Student Login API
 * Allows students to login with just username + password
 * instead of username.CLASSCODE + password
 * 
 * Uses service role to bypass RLS for authentication lookup
 */
export async function POST(request: NextRequest) {
  try {
    const { username, password } = await request.json()

    if (!username || !password) {
      return NextResponse.json(
        { success: false, error: 'Username and password are required' },
        { status: 400 }
      )
    }

    const normalizedUsername = username.toLowerCase().trim()

    console.log('🔍 Student login attempt:', { username: normalizedUsername })

    // Use service role client to bypass RLS for authentication lookup
    // This prevents infinite recursion in RLS policies
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    if (!serviceRoleKey) {
      console.error('❌ SUPABASE_SERVICE_ROLE_KEY not configured')
      console.error('Available env vars:', Object.keys(process.env).filter(k => k.includes('SUPABASE')))
      console.error('NEXT_PUBLIC vars:', Object.keys(process.env).filter(k => k.includes('NEXT_PUBLIC')))
      return NextResponse.json(
        { success: false, error: 'Server configuration error: SUPABASE_SERVICE_ROLE_KEY not found. Please check .env file and restart server.' },
        { status: 500 }
      )
    }
    
    console.log('✅ Service role key found (length:', serviceRoleKey.length, ')')

    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    })

    // Find all students with this username (bypasses RLS with service role)
    // Note: Removed deleted_at filter - column may not exist in all databases
    const { data: students, error: queryError } = await supabaseAdmin
      .from('profiles')
      .select('id, email, username, class_code, role')
      .eq('username', normalizedUsername)
      .eq('role', 'student')

    if (queryError) {
      console.error('❌ Database query error:', queryError)
      return NextResponse.json(
        { success: false, error: 'Database error' },
        { status: 500 }
      )
    }

    if (!students || students.length === 0) {
      console.log('❌ No student found with username:', normalizedUsername)
      return NextResponse.json(
        { success: false, error: 'Invalid username or password' },
        { status: 401 }
      )
    }

    console.log(`✅ Found ${students.length} student(s) with username:`, normalizedUsername)

    // Try to authenticate with each student's email until one succeeds
    // This handles the case where multiple students have the same username in different classes
    for (const student of students) {
      try {
        console.log('🔐 Attempting auth with email:', student.email)
        
        // Use regular client (not service role) for authentication
        // Service role should not be used for user authentication
        const supabaseAuth = createClient(supabaseUrl, supabaseAnonKey)
        
        // Try to sign in with this student's email + the provided password
        const { data: authData, error: authError } = await supabaseAuth.auth.signInWithPassword({
          email: student.email,
          password: password
        })

        if (!authError && authData.user) {
          // Success! This is the correct student
          console.log('✅ Authentication successful for:', student.email)
          
          return NextResponse.json({
            success: true,
            user: {
              id: authData.user.id,
              email: student.email,
              username: student.username,
              class_code: student.class_code
            },
            session: authData.session
          })
        }
      } catch (err) {
        // Continue to next student if this one failed
        console.log('⏭️ Auth failed for:', student.email, '- trying next...')
        continue
      }
    }

    // If we get here, none of the students with this username had the correct password
    console.log('❌ No matching password for any student with username:', normalizedUsername)
    return NextResponse.json(
      { success: false, error: 'Invalid username or password' },
      { status: 401 }
    )

  } catch (error) {
    console.error('❌ Student login error:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}





