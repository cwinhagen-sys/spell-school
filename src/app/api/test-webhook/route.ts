import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

// Use service role key for admin operations
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://edbbestqdwldryxuxkma.supabase.co'
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'sb_publishable_bx81qdFnpcX79ovYbCL98Q_eirRtByp'

const supabaseAdmin = createClient(supabaseUrl, supabaseServiceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
})

// Test endpoint to manually update subscription tier (for debugging)
export async function POST(request: NextRequest) {
  try {
    const { userId, tier } = await request.json()
    
    if (!userId || !tier) {
      return NextResponse.json({ error: 'Missing userId or tier' }, { status: 400 })
    }

    console.log(`🧪 TEST: Updating user ${userId} to tier ${tier}`)

    // Check if profile exists
    const { data: existingProfile, error: checkError } = await supabaseAdmin
      .from('profiles')
      .select('id, subscription_tier')
      .eq('id', userId)
      .single()

    if (checkError) {
      console.error('❌ TEST: Error checking profile:', checkError)
      return NextResponse.json({ error: 'Profile not found', details: checkError.message }, { status: 404 })
    }

    if (!existingProfile) {
      console.error('❌ TEST: Profile does not exist for user:', userId)
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 })
    }

    console.log('📊 TEST: Current profile state:', existingProfile)

    // Update tier
    const { data: updateResult, error: updateError } = await supabaseAdmin
      .from('profiles')
      .update({ subscription_tier: tier })
      .eq('id', userId)
      .select()

    if (updateError) {
      console.error('❌ TEST: Error updating profile:', updateError)
      return NextResponse.json({ error: 'Failed to update profile', details: updateError.message }, { status: 500 })
    }

    console.log(`✅ TEST: Successfully updated user ${userId} to tier ${tier}`, updateResult)
    return NextResponse.json({ success: true, updated: updateResult })
  } catch (error: any) {
    console.error('❌ TEST: Error:', error)
    return NextResponse.json({ error: error.message || 'Unknown error' }, { status: 500 })
  }
}






