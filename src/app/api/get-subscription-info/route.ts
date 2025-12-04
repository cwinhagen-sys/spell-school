import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'
import { createClient } from '@supabase/supabase-js'
import { supabaseServer } from '@/lib/supabase-server'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2024-11-20.acacia',
})

// Use service role key for admin operations
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://edbbestqdwldryxuxkma.supabase.co'
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'sb_publishable_bx81qdFnpcX79ovYbCL98Q_eirRtByp'

const supabaseAdmin = createClient(supabaseUrl, supabaseServiceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
})

export async function GET(request: NextRequest) {
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

    console.log('📊 Fetching subscription info for user:', user.id)

    // Get user's Stripe customer ID and subscription ID from profile
    const { data: profile, error: profileError } = await supabaseAdmin
      .from('profiles')
      .select('stripe_customer_id, stripe_subscription_id, subscription_tier')
      .eq('id', user.id)
      .single()

    if (profileError || !profile) {
      console.error('❌ Profile not found:', profileError)
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 })
    }

    // If user doesn't have a subscription, return null
    if (!profile.stripe_customer_id || !profile.stripe_subscription_id) {
      return NextResponse.json({
        subscription: null,
        tier: profile.subscription_tier || 'free'
      })
    }

    // Get subscription details from Stripe
    try {
      const subscription = await stripe.subscriptions.retrieve(profile.stripe_subscription_id, {
        expand: ['items.data.price.product']
      })

      // Determine billing period from price interval
      const price = subscription.items.data[0]?.price
      const billingPeriod = price?.recurring?.interval === 'year' ? 'yearly' : 'monthly'

      // Format dates
      const currentPeriodStart = new Date(subscription.current_period_start * 1000)
      const currentPeriodEnd = new Date(subscription.current_period_end * 1000)
      const cancelAt = subscription.cancel_at ? new Date(subscription.cancel_at * 1000) : null

      return NextResponse.json({
        subscription: {
          id: subscription.id,
          status: subscription.status,
          billingPeriod,
          currentPeriodStart: currentPeriodStart.toISOString(),
          currentPeriodEnd: currentPeriodEnd.toISOString(),
          cancelAt: cancelAt?.toISOString() || null,
          cancelAtPeriodEnd: subscription.cancel_at_period_end,
          price: {
            amount: price?.unit_amount ? price.unit_amount / 100 : 0,
            currency: price?.currency || 'sek',
            interval: price?.recurring?.interval || 'month'
          }
        },
        tier: profile.subscription_tier || 'free'
      })
    } catch (stripeError: any) {
      console.error('❌ Error fetching subscription from Stripe:', stripeError)
      // If subscription doesn't exist in Stripe, return null
      if (stripeError.code === 'resource_missing') {
        return NextResponse.json({
          subscription: null,
          tier: profile.subscription_tier || 'free'
        })
      }
      throw stripeError
    }
  } catch (error: any) {
    console.error('❌ Error getting subscription info:', error)
    return NextResponse.json({
      error: error.message || 'Failed to get subscription info'
    }, { status: 500 })
  }
}

