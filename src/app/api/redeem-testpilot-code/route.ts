import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { supabaseServer } from '@/lib/supabase-server'

// Use service role key for admin operations
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://edbbestqdwldryxuxkma.supabase.co'
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'sb_publishable_bx81qdFnpcX79ovYbCL98Q_eirRtByp'

const supabaseAdmin = createClient(supabaseUrl, supabaseServiceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
})

export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization')
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const token = authHeader.replace('Bearer ', '')
    const { data: { user }, error: authError } = await supabaseServer.auth.getUser(token)

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { code } = await request.json()

    if (!code || typeof code !== 'string' || code.trim().length === 0) {
      return NextResponse.json({ error: 'Kod krävs' }, { status: 400 })
    }

    const codeUpper = code.trim().toUpperCase()

    console.log(`🔑 Attempting to redeem testpilot code: ${codeUpper} for user: ${user.id}`)

    // Check if code exists and is valid
    const { data: codeData, error: codeError } = await supabaseAdmin
      .from('testpilot_codes')
      .select('*')
      .eq('code', codeUpper)
      .eq('is_active', true)
      .single()

    if (codeError || !codeData) {
      console.error('❌ Code not found or invalid:', codeError?.message)
      return NextResponse.json({ error: 'Ogiltig kod' }, { status: 404 })
    }

    // Check if code has expired
    if (codeData.expires_at) {
      const expiresAt = new Date(codeData.expires_at)
      if (expiresAt < new Date()) {
        console.error('❌ Code has expired')
        return NextResponse.json({ error: 'Koden har gått ut' }, { status: 400 })
      }
    }

    // Check if code has reached max uses
    if (codeData.current_uses >= codeData.max_uses) {
      console.error('❌ Code has reached max uses')
      return NextResponse.json({ error: 'Koden har redan använts max antal gånger' }, { status: 400 })
    }

    // Check if user has already used this code (using new testpilot_code_usage table)
    const { data: existingUsage } = await supabaseAdmin
      .from('testpilot_code_usage')
      .select('id')
      .eq('code_id', codeData.id)
      .eq('user_id', user.id)
      .maybeSingle()

    if (existingUsage) {
      console.error('❌ User has already used this code')
      return NextResponse.json({ error: 'Du har redan använt denna kod' }, { status: 400 })
    }

    // Check if user already has Pro tier
    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('subscription_tier')
      .eq('id', user.id)
      .single()

    if (!profile) {
      return NextResponse.json({ error: 'Profil hittades inte' }, { status: 404 })
    }

    if (profile.subscription_tier === 'pro') {
      return NextResponse.json({ error: 'Du har redan Pro-planen' }, { status: 400 })
    }

    console.log(`✅ Code is valid. Upgrading user ${user.id} to Pro...`)

    // Calculate expiration date
    // Test pilot codes are valid for 1 month from when they are activated (used_at)
    const usedAt = new Date()
    const expiresAt = new Date(usedAt)
    expiresAt.setMonth(expiresAt.getMonth() + 1) // 1 month from activation

    // Create usage record in testpilot_code_usage table (each user gets their own expires_at)
    // Note: We already checked for existing usage above, but the UNIQUE constraint provides
    // additional protection in case of race conditions
    const { error: createUsageError } = await supabaseAdmin
      .from('testpilot_code_usage')
      .insert({
        code_id: codeData.id,
        user_id: user.id,
        used_at: usedAt.toISOString(),
        expires_at: expiresAt.toISOString(),
      })

    if (createUsageError) {
      console.error('❌ Error creating code usage record:', createUsageError)
      
      // Check if it's a UNIQUE constraint violation (user already used this code)
      if (createUsageError.code === '23505' || createUsageError.message?.includes('duplicate key') || createUsageError.message?.includes('unique constraint')) {
        return NextResponse.json({ error: 'Du har redan använt denna kod' }, { status: 400 })
      }
      
      return NextResponse.json({ error: 'Kunde inte skapa kodanvändning' }, { status: 500 })
    }

    // Update code usage count (but don't update used_by/used_at/expires_at as these are now per-user)
    const { error: updateCodeError } = await supabaseAdmin
      .from('testpilot_codes')
      .update({
        current_uses: codeData.current_uses + 1,
      })
      .eq('id', codeData.id)

    if (updateCodeError) {
      console.error('❌ Error updating code usage count:', updateCodeError)
      // Try to rollback usage record
      await supabaseAdmin
        .from('testpilot_code_usage')
        .delete()
        .eq('code_id', codeData.id)
        .eq('user_id', user.id)
      return NextResponse.json({ error: 'Kunde inte uppdatera kod' }, { status: 500 })
    }

    // Upgrade user to Pro tier
    // CRITICAL: Set stripe_subscription_id to NULL for test pilot users
    // If this is not NULL, getTestPilotInfo will return isTestPilot: false
    const { error: upgradeError } = await supabaseAdmin
      .from('profiles')
      .update({ 
        subscription_tier: 'pro',
        stripe_subscription_id: null  // Must be NULL for test pilot
      })
      .eq('id', user.id)

    if (upgradeError) {
      console.error('❌ Error upgrading user:', upgradeError)
      // Try to rollback code usage record and count
      await supabaseAdmin
        .from('testpilot_code_usage')
        .delete()
        .eq('code_id', codeData.id)
        .eq('user_id', user.id)
      await supabaseAdmin
        .from('testpilot_codes')
        .update({
          current_uses: codeData.current_uses,
        })
        .eq('id', codeData.id)
      return NextResponse.json({ error: 'Kunde inte uppgradera till Pro' }, { status: 500 })
    }

    console.log(`✅ Successfully upgraded user ${user.id} to Pro with code ${codeUpper}`)

    return NextResponse.json({
      success: true,
      message: 'Pro-planen har aktiverats!',
      tier: 'pro'
    })
  } catch (error: any) {
    console.error('❌ Error redeeming testpilot code:', error)
    return NextResponse.json({
      error: error.message || 'Ett fel uppstod vid aktivering av kod'
    }, { status: 500 })
  }
}






