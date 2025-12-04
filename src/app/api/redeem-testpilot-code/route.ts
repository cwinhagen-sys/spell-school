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

    // Check if user has already used this code
    if (codeData.used_by === user.id) {
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

    // Update code usage
    const { error: updateCodeError } = await supabaseAdmin
      .from('testpilot_codes')
      .update({
        used_by: user.id,
        used_at: new Date().toISOString(),
        current_uses: codeData.current_uses + 1,
      })
      .eq('id', codeData.id)

    if (updateCodeError) {
      console.error('❌ Error updating code usage:', updateCodeError)
      return NextResponse.json({ error: 'Kunde inte uppdatera kod' }, { status: 500 })
    }

    // Upgrade user to Pro tier
    const { error: upgradeError } = await supabaseAdmin
      .from('profiles')
      .update({ subscription_tier: 'pro' })
      .eq('id', user.id)

    if (upgradeError) {
      console.error('❌ Error upgrading user:', upgradeError)
      // Try to rollback code usage
      await supabaseAdmin
        .from('testpilot_codes')
        .update({
          used_by: codeData.used_by,
          used_at: codeData.used_at,
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

