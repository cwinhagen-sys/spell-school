import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

// Supabase configuration
const supabaseUrl = 'https://edbbestqdwldryxuxkma.supabase.co'
const supabaseAnonKey = 'sb_publishable_bx81qdFnpcX79ovYbCL98Q_eirRtByp'

// OPTIMIZATION: Reuse Supabase client instances for better connection pooling
// Create a shared auth client (stateless, safe to reuse)
const supabaseAuthClient = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
  global: {
    fetch: (input: RequestInfo | URL, init?: RequestInit) => {
      return fetch(input, {
        ...init,
        // Enable keep-alive for connection reuse
        ...(typeof (globalThis as any).Request !== 'undefined' && { keepalive: true }),
      })
    },
  },
})

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
    // OPTIMIZATION: Use shared client and add retry logic for rate limiting
    for (const student of students) {
      try {
        console.log('🔐 Attempting auth with email:', student.email)
        
        // Use shared client (reuses connections, better for concurrent requests)
        // Retry with exponential backoff if we hit rate limits
        let authData = null
        let authError = null
        const maxRetries = 3
        
        for (let attempt = 0; attempt < maxRetries; attempt++) {
          const result = await supabaseAuthClient.auth.signInWithPassword({
            email: student.email,
            password: password
          })
          
          authData = result.data
          authError = result.error
          
          // Check if it's a rate limit error (429 or specific Supabase rate limit messages)
          const isRateLimit = authError && (
            authError.status === 429 ||
            authError.message?.toLowerCase().includes('rate limit') ||
            authError.message?.toLowerCase().includes('too many requests') ||
            authError.message?.toLowerCase().includes('quota')
          )
          
          if (!authError || !isRateLimit) {
            // Success or non-rate-limit error - break retry loop
            break
          }
          
          // Rate limit hit - wait with exponential backoff before retrying
          if (attempt < maxRetries - 1) {
            const backoffMs = Math.min(1000 * Math.pow(2, attempt), 5000) // Max 5 seconds
            console.log(`⏳ Rate limit hit, waiting ${backoffMs}ms before retry ${attempt + 1}/${maxRetries}`)
            await new Promise(resolve => setTimeout(resolve, backoffMs))
          }
        }

        if (!authError && authData?.user) {
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
        } else if (authError) {
          // Log rate limit errors specifically
          const isRateLimit = authError.status === 429 ||
            authError.message?.toLowerCase().includes('rate limit') ||
            authError.message?.toLowerCase().includes('too many requests')
          
          if (isRateLimit) {
            console.warn('⚠️ Rate limit error during auth (after retries):', authError.message)
          }
        }
      } catch (err) {
        // Continue to next student if this one failed
        console.log('⏭️ Auth failed for:', student.email, '- trying next...', err)
        continue
      }
    }

    // If we get here, none of the students with this username had the correct password
    // OR we hit rate limits on all attempts
    console.log('❌ No matching password for any student with username:', normalizedUsername)
    
    // Check if the last error was a rate limit (for better error messaging)
    // Note: We don't expose which specific student failed for security reasons
    return NextResponse.json(
      { 
        success: false, 
        error: 'Invalid username or password',
        // Don't expose rate limit details to client for security
      },
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





