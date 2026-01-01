import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'
import { createClient } from '@supabase/supabase-js'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2025-11-17.clover',
})

const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET!

// Use service role key for webhooks to bypass RLS
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://edbbestqdwldryxuxkma.supabase.co'
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'sb_publishable_bx81qdFnpcX79ovYbCL98Q_eirRtByp'

const supabaseAdmin = createClient(supabaseUrl, supabaseServiceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
})

export async function POST(request: NextRequest) {
  console.log('🔔 Webhook received!')
  const body = await request.text()
  const signature = request.headers.get('stripe-signature')!

  if (!signature) {
    console.error('❌ Missing stripe-signature header')
    return NextResponse.json({ error: 'Missing signature' }, { status: 400 })
  }

  let event: Stripe.Event

  try {
    event = stripe.webhooks.constructEvent(body, signature, webhookSecret)
    console.log(`✅ Webhook verified! Event type: ${event.type}`)
  } catch (err: any) {
    console.error('❌ Webhook signature verification failed:', err.message)
    return NextResponse.json({ error: `Invalid signature: ${err.message}` }, { status: 400 })
  }

  // Hantera olika event types
  switch (event.type) {
    case 'checkout.session.completed': {
      console.log('💳 Processing checkout.session.completed event')
      const session = event.data.object as Stripe.Checkout.Session
      const userId = session.metadata?.userId
      const tier = session.metadata?.tier

      console.log('📋 Session metadata:', { userId, tier, allMetadata: session.metadata })
      console.log('📋 Session object:', { 
        id: session.id, 
        mode: session.mode, 
        payment_status: session.payment_status,
        subscription: session.subscription,
        customer: session.customer
      })

      if (!userId || !tier) {
        console.error('❌ Missing userId or tier in checkout session metadata', { userId, tier })
        return NextResponse.json({ error: 'Missing metadata' }, { status: 400 })
      }

      // Get the subscription to get customer ID and subscription ID
      let subscriptionId: string | null = null
      let customerId: string | null = null

      // Try to get subscription ID from session
      if (session.subscription) {
        subscriptionId = typeof session.subscription === 'string' 
          ? session.subscription 
          : session.subscription?.id || null
      }

      // Try to get customer ID from session first
      if (session.customer) {
        customerId = typeof session.customer === 'string' 
          ? session.customer 
          : session.customer?.id || null
      }

      // If we have subscription ID but no customer ID, retrieve subscription
      if (subscriptionId && !customerId) {
        try {
          const subscription = await stripe.subscriptions.retrieve(subscriptionId)
          customerId = typeof subscription.customer === 'string' 
            ? subscription.customer 
            : subscription.customer?.id || null
          console.log('📦 Retrieved subscription:', { subscriptionId, customerId })
        } catch (err: any) {
          console.error('❌ Error retrieving subscription:', err.message)
        }
      }

      // If we still don't have customer ID, try to get it from customer object
      if (!customerId && session.customer) {
        try {
          const customer = typeof session.customer === 'string'
            ? await stripe.customers.retrieve(session.customer)
            : null
          if (customer && !customer.deleted) {
            customerId = customer.id
            console.log('👤 Retrieved customer:', customerId)
          }
        } catch (err: any) {
          console.error('❌ Error retrieving customer:', err.message)
        }
      }

      // Uppdatera subscription_tier, customer_id och subscription_id i profiles
      const updateData: any = { subscription_tier: tier }
      if (customerId) {
        updateData.stripe_customer_id = customerId
      }
      // Only add stripe_subscription_id if column exists (it might not exist yet)
      // We'll try to add it, but if it fails, we'll continue without it
      if (subscriptionId) {
        try {
          updateData.stripe_subscription_id = subscriptionId
        } catch (err) {
          console.warn('⚠️ Could not add stripe_subscription_id (column may not exist):', err)
        }
      }

      console.log(`🔄 Updating profile for user ${userId} with data:`, updateData)
      
      try {
        // First, check if profile exists
        const { data: existingProfile, error: checkError } = await supabaseAdmin
          .from('profiles')
          .select('id, subscription_tier')
          .eq('id', userId)
          .single()

        if (checkError) {
          console.error('❌ Error checking profile:', checkError)
          console.error('❌ Check error details:', JSON.stringify(checkError, null, 2))
          return NextResponse.json({ error: 'Profile not found', details: checkError.message }, { status: 404 })
        }

        if (!existingProfile) {
          console.error('❌ Profile does not exist for user:', userId)
          return NextResponse.json({ error: 'Profile not found' }, { status: 404 })
        }

        console.log('📊 Current profile state:', existingProfile)
        
        // Try to update with all fields first
        let updateResult, updateError
        const { data: result, error: error } = await supabaseAdmin
          .from('profiles')
          .update(updateData)
          .eq('id', userId)
          .select()
        
        updateResult = result
        updateError = error

        // If update fails and stripe_subscription_id is included, try without it
        if (updateError && subscriptionId && updateData.stripe_subscription_id) {
          console.warn('⚠️ Update failed with stripe_subscription_id, trying without it...')
          const updateDataWithoutSubId = { ...updateData }
          delete updateDataWithoutSubId.stripe_subscription_id
          
          const { data: result2, error: error2 } = await supabaseAdmin
            .from('profiles')
            .update(updateDataWithoutSubId)
            .eq('id', userId)
            .select()
          
          updateResult = result2
          updateError = error2
          
          if (!updateError) {
            console.log('✅ Update succeeded without stripe_subscription_id (column may not exist)')
          }
        }

        if (updateError) {
          console.error('❌ Error updating profile:', updateError)
          console.error('❌ Update error details:', JSON.stringify(updateError, null, 2))
          return NextResponse.json({ error: 'Failed to update profile', details: updateError.message }, { status: 500 })
        }

        console.log(`✅ Successfully updated user ${userId} to tier ${tier}`, updateResult)
      } catch (error: any) {
        console.error('❌ Unexpected error in checkout.session.completed handler:', error)
        console.error('❌ Error stack:', error.stack)
        return NextResponse.json({ error: 'Unexpected error', details: error.message }, { status: 500 })
      }
      break
    }

    case 'customer.subscription.updated': {
      console.log('🔄 Processing customer.subscription.updated event')
      const subscription = event.data.object as any
      const customerId = typeof subscription.customer === 'string'
        ? subscription.customer
        : subscription.customer?.id

      if (!customerId) {
        console.error('❌ Missing customer ID in subscription update')
        break
      }

      // Find user by customer ID
      const { data: profile } = await supabaseAdmin
        .from('profiles')
        .select('id')
        .eq('stripe_customer_id', customerId)
        .single()

      if (!profile) {
        console.error('❌ Profile not found for customer ID:', customerId)
        break
      }

      // Check if subscription is scheduled for cancellation (cancel_at_period_end)
      if (subscription.cancel_at_period_end) {
        const cancelAt = subscription.current_period_end
          ? new Date(subscription.current_period_end * 1000).toISOString()
          : 'unknown'
        console.log(`⚠️ Subscription ${subscription.id} is scheduled for cancellation at period end: ${cancelAt}`)
        console.log(`ℹ️ User ${profile.id} will be downgraded to free tier when subscription period ends`)
        // Don't downgrade yet - wait for customer.subscription.deleted event
      }

      // If subscription is canceled or past_due, downgrade to free immediately
      if (subscription.status === 'canceled' || subscription.status === 'past_due' || subscription.status === 'unpaid') {
        const { error } = await supabaseAdmin
          .from('profiles')
          .update({ 
            subscription_tier: 'free',
            stripe_subscription_id: null // Clear subscription ID when subscription is canceled/unpaid
          })
          .eq('id', profile.id)

        if (error) {
          console.error('❌ Error downgrading subscription:', error)
        } else {
          console.log(`✅ Downgraded user ${profile.id} to free tier (subscription ${subscription.status})`)
        }
      } else if (subscription.status === 'active') {
        // Subscription is active - check metadata for tier update
        const tier = subscription.metadata?.tier
        if (tier && ['premium', 'pro'].includes(tier)) {
          const updateData: any = { subscription_tier: tier }
          if (subscription.id) {
            updateData.stripe_subscription_id = subscription.id
          }
          
          const { error } = await supabaseAdmin
            .from('profiles')
            .update(updateData)
            .eq('id', profile.id)

          if (error) {
            console.error('❌ Error updating subscription tier:', error)
          } else {
            console.log(`✅ Updated user ${profile.id} to tier ${tier}`)
          }
        }
      }
      break
    }

    case 'customer.subscription.deleted': {
      console.log('🗑️ Processing customer.subscription.deleted event')
      const subscription = event.data.object as any
      const customerId = typeof subscription.customer === 'string' 
        ? subscription.customer 
        : subscription.customer?.id

      if (!customerId) {
        console.error('❌ Missing customer ID in subscription deletion')
        break
      }

      // Find user by customer ID and downgrade to free
      const { data: profile } = await supabaseAdmin
        .from('profiles')
        .select('id, subscription_tier')
        .eq('stripe_customer_id', customerId)
        .single()

      if (profile) {
        console.log(`🔄 Downgrading user ${profile.id} from ${profile.subscription_tier} to free (subscription period ended)`)
        
        const { error } = await supabaseAdmin
          .from('profiles')
          .update({ 
            subscription_tier: 'free',
            stripe_subscription_id: null // Clear subscription ID when subscription is deleted
          })
          .eq('id', profile.id)

        if (error) {
          console.error('❌ Error downgrading subscription:', error)
        } else {
          console.log(`✅ Successfully downgraded user ${profile.id} to free tier after subscription period ended`)
        }
      } else {
        console.error('❌ Profile not found for customer ID:', customerId)
      }
      break
    }

    case 'customer.subscription.created': {
      console.log('🆕 Processing customer.subscription.created event')
      const subscription = event.data.object as any
      const customerId = typeof subscription.customer === 'string' 
        ? subscription.customer 
        : subscription.customer?.id

      if (!customerId) {
        console.error('❌ Missing customer ID in subscription creation')
        break
      }

      // Find user by customer ID
      const { data: profile } = await supabaseAdmin
        .from('profiles')
        .select('id, subscription_tier')
        .eq('stripe_customer_id', customerId)
        .single()

      if (!profile) {
        console.error('❌ Profile not found for customer ID:', customerId)
        break
      }

      // Get tier from subscription metadata or price
      let tier = subscription.metadata?.tier
      
      // If no tier in metadata, try to determine from price
      if (!tier) {
        const priceId = subscription.items.data[0]?.price?.id
        // Check if price matches any of our configured prices
        const priceIds: Record<string, { monthly: string; yearly: string }> = {
          premium: {
            monthly: process.env.STRIPE_PRICE_PREMIUM_MONTHLY || '',
            yearly: process.env.STRIPE_PRICE_PREMIUM_YEARLY || '',
          },
          pro: {
            monthly: process.env.STRIPE_PRICE_PRO_MONTHLY || '',
            yearly: process.env.STRIPE_PRICE_PRO_YEARLY || '',
          },
        }
        
        for (const [tierName, prices] of Object.entries(priceIds)) {
          if (priceId === prices.monthly || priceId === prices.yearly) {
            tier = tierName
            break
          }
        }
      }

      if (tier && ['premium', 'pro'].includes(tier)) {
        const updateData: any = { 
          subscription_tier: tier,
          stripe_subscription_id: subscription.id
        }
        
        const { error } = await supabaseAdmin
          .from('profiles')
          .update(updateData)
          .eq('id', profile.id)

        if (error) {
          console.error('❌ Error updating subscription tier:', error)
        } else {
          console.log(`✅ Updated user ${profile.id} to tier ${tier} from subscription.created`)
        }
      }
      break
    }

    case 'invoice.payment_succeeded': {
      console.log('💰 Processing invoice.payment_succeeded event')
      const invoice = event.data.object as any
      
      // Only process subscription invoices (not one-time payments)
      if (!invoice.subscription) {
        console.log('ℹ️ Not a subscription invoice, skipping')
        break
      }

      const customerId = typeof invoice.customer === 'string'
        ? invoice.customer
        : invoice.customer?.id

      if (!customerId) {
        console.error('❌ Missing customer ID in invoice')
        break
      }

      // Find user by customer ID
      const { data: profile } = await supabaseAdmin
        .from('profiles')
        .select('id, subscription_tier')
        .eq('stripe_customer_id', customerId)
        .single()

      if (!profile) {
        console.error('❌ Profile not found for customer ID:', customerId)
        break
      }

      // Retrieve the subscription to get the correct tier
      const subscriptionId = typeof invoice.subscription === 'string'
        ? invoice.subscription
        : invoice.subscription?.id

      if (!subscriptionId) {
        console.error('❌ Missing subscription ID in invoice')
        break
      }

      try {
        const subscription = await stripe.subscriptions.retrieve(subscriptionId)
        
        // Get tier from subscription metadata or price
        let tier = subscription.metadata?.tier
        
        // If no tier in metadata, try to determine from price
        if (!tier) {
          const priceId = subscription.items.data[0]?.price?.id
          const priceIds: Record<string, { monthly: string; yearly: string }> = {
            premium: {
              monthly: process.env.STRIPE_PRICE_PREMIUM_MONTHLY || '',
              yearly: process.env.STRIPE_PRICE_PREMIUM_YEARLY || '',
            },
            pro: {
              monthly: process.env.STRIPE_PRICE_PRO_MONTHLY || '',
              yearly: process.env.STRIPE_PRICE_PRO_YEARLY || '',
            },
          }
          
          for (const [tierName, prices] of Object.entries(priceIds)) {
            if (priceId === prices.monthly || priceId === prices.yearly) {
              tier = tierName
              break
            }
          }
        }

        if (tier && ['premium', 'pro'].includes(tier)) {
          // Check if user was previously downgraded (e.g., from past_due)
          if (profile.subscription_tier === 'free') {
            console.log(`🔄 Restoring user ${profile.id} from free to ${tier} after successful payment`)
          } else {
            console.log(`✅ Confirming user ${profile.id} tier ${tier} after successful renewal`)
          }

          const { error } = await supabaseAdmin
            .from('profiles')
            .update({ 
              subscription_tier: tier,
              stripe_subscription_id: subscriptionId
            })
            .eq('id', profile.id)

          if (error) {
            console.error('❌ Error updating subscription tier:', error)
          } else {
            console.log(`✅ Successfully ensured user ${profile.id} has tier ${tier}`)
          }
        }
      } catch (err: any) {
        console.error('❌ Error retrieving subscription:', err.message)
      }
      break
    }

    case 'invoice.payment_failed': {
      console.log('❌ Processing invoice.payment_failed event')
      const invoice = event.data.object as any
      
      if (!invoice.subscription) {
        console.log('ℹ️ Not a subscription invoice, skipping')
        break
      }

      const customerId = typeof invoice.customer === 'string'
        ? invoice.customer
        : invoice.customer?.id

      if (!customerId) {
        console.error('❌ Missing customer ID in invoice')
        break
      }

      // Find user by customer ID
      const { data: profile } = await supabaseAdmin
        .from('profiles')
        .select('id, subscription_tier')
        .eq('stripe_customer_id', customerId)
        .single()

      if (profile) {
        console.log(`⚠️ Payment failed for user ${profile.id} (current tier: ${profile.subscription_tier})`)
        console.log('ℹ️ User will be downgraded when subscription status changes to past_due/unpaid/canceled')
        // Note: We don't downgrade immediately here - we wait for subscription.updated event
        // This gives the customer time to update their payment method
      }
      break
    }

    default:
      console.log(`Unhandled event type: ${event.type}`)
  }

  return NextResponse.json({ received: true })
}

// Disable body parsing for webhooks (Stripe needs raw body)
export const runtime = 'nodejs'

