import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { supabaseServer } from '@/lib/supabase-server'

// Use service role key for admin operations
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://edbbestqdwldryxuxkma.supabase.co'
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || ''

const supabaseAdmin = createClient(supabaseUrl, supabaseServiceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
})

/**
 * API route to create teacher profile
 * Uses service role key to bypass RLS when email verification is enabled
 */
export async function POST(request: NextRequest) {
  try {
    // Try to get user from auth header if available
    const authHeader = request.headers.get('authorization')
    let userId: string | null = null
    
    if (authHeader?.startsWith('Bearer ')) {
      const token = authHeader.replace('Bearer ', '')
      const { data: { user }, error: authError } = await supabaseServer.auth.getUser(token)
      
      if (!authError && user) {
        userId = user.id
      }
    }

    const { user_id, email, name, role = 'teacher', subscription_tier = 'free' } = await request.json()

    // Use user_id from request body, or from authenticated user, or throw error
    const targetUserId = user_id || userId
    
    if (!targetUserId) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 })
    }

    if (!email || !name) {
      return NextResponse.json({ error: 'Email and name are required' }, { status: 400 })
    }

    // If we have authenticated user, verify they match
    if (userId && targetUserId !== userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }

    // Use admin client to insert profile (bypasses RLS)
    // This allows creating profiles even when email verification is pending
    const { error: profileError } = await supabaseAdmin
      .from('profiles')
      .insert({
        id: targetUserId,
        email: email,
        role: role,
        name: name,
        subscription_tier: subscription_tier
      })

    if (profileError) {
      console.error('Error creating profile:', profileError)
      // Check if profile already exists
      if (profileError.code === '23505') { // Unique violation
        return NextResponse.json({ 
          success: true, 
          message: 'Profile already exists' 
        })
      }
      return NextResponse.json({ 
        error: 'Failed to create profile', 
        details: profileError.message 
      }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      message: 'Profile created successfully'
    })
  } catch (error: any) {
    console.error('Error in create-teacher-profile:', error)
    return NextResponse.json({
      error: error.message || 'Failed to create profile'
    }, { status: 500 })
  }
}


import { supabaseServer } from '@/lib/supabase-server'

// Use service role key for admin operations
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://edbbestqdwldryxuxkma.supabase.co'
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || ''

const supabaseAdmin = createClient(supabaseUrl, supabaseServiceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
})

/**
 * API route to create teacher profile
 * Uses service role key to bypass RLS when email verification is enabled
 */
export async function POST(request: NextRequest) {
  try {
    // Try to get user from auth header if available
    const authHeader = request.headers.get('authorization')
    let userId: string | null = null
    
    if (authHeader?.startsWith('Bearer ')) {
      const token = authHeader.replace('Bearer ', '')
      const { data: { user }, error: authError } = await supabaseServer.auth.getUser(token)
      
      if (!authError && user) {
        userId = user.id
      }
    }

    const { user_id, email, name, role = 'teacher', subscription_tier = 'free' } = await request.json()

    // Use user_id from request body, or from authenticated user, or throw error
    const targetUserId = user_id || userId
    
    if (!targetUserId) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 })
    }

    if (!email || !name) {
      return NextResponse.json({ error: 'Email and name are required' }, { status: 400 })
    }

    // If we have authenticated user, verify they match
    if (userId && targetUserId !== userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }

    // Use admin client to insert profile (bypasses RLS)
    // This allows creating profiles even when email verification is pending
    const { error: profileError } = await supabaseAdmin
      .from('profiles')
      .insert({
        id: targetUserId,
        email: email,
        role: role,
        name: name,
        subscription_tier: subscription_tier
      })

    if (profileError) {
      console.error('Error creating profile:', profileError)
      // Check if profile already exists
      if (profileError.code === '23505') { // Unique violation
        return NextResponse.json({ 
          success: true, 
          message: 'Profile already exists' 
        })
      }
      return NextResponse.json({ 
        error: 'Failed to create profile', 
        details: profileError.message 
      }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      message: 'Profile created successfully'
    })
  } catch (error: any) {
    console.error('Error in create-teacher-profile:', error)
    return NextResponse.json({
      error: error.message || 'Failed to create profile'
    }, { status: 500 })
  }
}

