import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'
import { createClient } from '@supabase/supabase-js'
import { supabaseServer } from '@/lib/supabase-server'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2024-11-20.acacia',
})

// Use service role key for admin operations (database updates)
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
    console.log('🔄 Upgrade subscription request received')
    
    const authHeader = request.headers.get('authorization')
    if (!authHeader?.startsWith('Bearer ')) {
      console.error('❌ Missing authorization header')
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const token = authHeader.replace('Bearer ', '')
    // Use supabaseServer for auth (same as create-checkout-session)
    const { data: { user }, error: authError } = await supabaseServer.auth.getUser(token)
    
    if (authError || !user) {
      console.error('❌ Auth error:', authError)
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    console.log('👤 User authenticated:', user.id)

    const { targetTier, yearly } = await request.json()
    console.log('📋 Upgrade request:', { targetTier, yearly })
    
    // Validate target tier
    if (!['premium', 'pro'].includes(targetTier)) {
      console.error('❌ Invalid target tier:', targetTier)
      return NextResponse.json({ error: 'Invalid target tier' }, { status: 400 })
    }

    // Get user's current subscription info
    const { data: profile, error: profileError } = await supabaseAdmin
      .from('profiles')
      .select('subscription_tier, stripe_customer_id')
      .eq('id', user.id)
      .single()

    if (profileError || !profile) {
      console.error('❌ Profile not found:', profileError)
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 })
    }

    const currentTier = profile.subscription_tier as string
    const customerId = profile.stripe_customer_id as string | null
    
    console.log('📊 Current subscription:', { currentTier, customerId })

    // If user doesn't have a Stripe customer ID, create a new checkout session
    if (!customerId) {
      console.log('📝 No customer ID found, creating new checkout session')
      
      // Price IDs - use same as create-checkout-session
      const priceIds: Record<string, { monthly: string; yearly: string }> = {
        premium: {
          monthly: process.env.STRIPE_PRICE_PREMIUM_MONTHLY || 'price_XXXXX',
          yearly: process.env.STRIPE_PRICE_PREMIUM_YEARLY || 'price_XXXXX',
        },
        pro: {
          monthly: process.env.STRIPE_PRICE_PRO_MONTHLY || 'price_XXXXX',
          yearly: process.env.STRIPE_PRICE_PRO_YEARLY || 'price_XXXXX',
        },
      }

      const priceId = priceIds[targetTier]?.[yearly ? 'yearly' : 'monthly']
      console.log('💰 Price ID:', { targetTier, yearly, priceId })
      
      if (!priceId || priceId === 'price_XXXXX') {
        console.error('❌ Price ID not configured')
        return NextResponse.json({ 
          error: 'Price ID not configured. Please set up Stripe products and prices first.' 
        }, { status: 500 })
      }

      // Create checkout session for new subscription
      console.log('🔗 Creating checkout session...')
      const session = await stripe.checkout.sessions.create({
        mode: 'subscription',
        payment_method_types: ['card'],
        line_items: [{ price: priceId, quantity: 1 }],
        customer_email: user.email || undefined,
        metadata: {
          userId: user.id,
          tier: targetTier,
          billingPeriod: yearly ? 'yearly' : 'monthly',
          isUpgrade: 'true',
        },
        success_url: `${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/teacher/account?success=true&session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/teacher/account?canceled=true`,
      })

      console.log('✅ Checkout session created:', session.id)
      return NextResponse.json({ sessionId: session.id, url: session.url })
    }

    // User has existing subscription - upgrade/downgrade it
    console.log('📦 User has existing subscription, upgrading...')
    
    // Get customer's active subscriptions
    const subscriptions = await stripe.subscriptions.list({
      customer: customerId,
      status: 'active',
      limit: 1,
    })

    console.log('📋 Found subscriptions:', subscriptions.data.length)

    if (subscriptions.data.length === 0) {
      console.error('❌ No active subscription found')
      return NextResponse.json({ error: 'No active subscription found' }, { status: 400 })
    }

    const subscription = subscriptions.data[0]
    console.log('📦 Current subscription:', { id: subscription.id, status: subscription.status })

    // Get the new price ID - use same as create-checkout-session
    const priceIds: Record<string, { monthly: string; yearly: string }> = {
      premium: {
        monthly: process.env.STRIPE_PRICE_PREMIUM_MONTHLY || 'price_XXXXX',
        yearly: process.env.STRIPE_PRICE_PREMIUM_YEARLY || 'price_XXXXX',
      },
      pro: {
        monthly: process.env.STRIPE_PRICE_PRO_MONTHLY || 'price_XXXXX',
        yearly: process.env.STRIPE_PRICE_PRO_YEARLY || 'price_XXXXX',
      },
    }

    const newPriceId = priceIds[targetTier]?.[yearly ? 'yearly' : 'monthly']
    console.log('💰 New price ID:', { targetTier, yearly, newPriceId })
    
    if (!newPriceId || newPriceId === 'price_XXXXX') {
      console.error('❌ Price ID not configured')
      return NextResponse.json({ 
        error: 'Price ID not configured. Please set up Stripe products and prices first.' 
      }, { status: 500 })
    }

    // Check current price
    const currentPriceId = subscription.items.data[0]?.price?.id
    console.log('💰 Current price ID:', currentPriceId)
    
    if (currentPriceId === newPriceId) {
      console.log('⚠️ User already has this tier')
      return NextResponse.json({ 
        error: 'Du har redan denna plan' 
      }, { status: 400 })
    }

    // Update subscription with proration (Stripe handles cost calculation automatically)
    console.log('🔄 Updating subscription...')
    const updatedSubscription = await stripe.subscriptions.update(subscription.id, {
      items: [{
        id: subscription.items.data[0].id,
        price: newPriceId,
      }],
      proration_behavior: 'always_invoice', // Charge immediately for the difference
      metadata: {
        tier: targetTier,
        billingPeriod: yearly ? 'yearly' : 'monthly',
      },
    })

    console.log('✅ Subscription updated:', updatedSubscription.id)

    // Update tier immediately (webhook will also update it, but this gives instant feedback)
    const { error: updateError } = await supabaseAdmin
      .from('profiles')
      .update({ subscription_tier: targetTier })
      .eq('id', user.id)

    if (updateError) {
      console.error('❌ Error updating profile:', updateError)
      // Don't fail the request, webhook will update it
    } else {
      console.log('✅ Profile updated to tier:', targetTier)
    }

    return NextResponse.json({ 
      success: true, 
      subscriptionId: updatedSubscription.id,
      message: 'Subscription upgraded successfully. Webhook will finalize the update.'
    })
  } catch (error: any) {
    console.error('Subscription upgrade error:', error)
    return NextResponse.json({ error: error.message || 'Failed to upgrade subscription' }, { status: 500 })
  }
}

