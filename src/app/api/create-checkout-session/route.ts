import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'
import { supabaseServer } from '@/lib/supabase-server'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2025-11-17.clover',
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

    const { tier, yearly } = await request.json()
    
    // Validate tier
    if (!['premium', 'pro'].includes(tier)) {
      return NextResponse.json({ error: 'Invalid tier. Only premium and pro require payment.' }, { status: 400 })
    }
    
    // Price IDs från Stripe Dashboard - UPPDATERA DESSA MED DINA RIKTIGA PRICE IDs
    const priceIds: Record<string, { monthly: string; yearly: string }> = {
      premium: {
        monthly: process.env.STRIPE_PRICE_PREMIUM_MONTHLY || 'price_XXXXX', // Ersätt med ditt Premium månadspris ID
        yearly: process.env.STRIPE_PRICE_PREMIUM_YEARLY || 'price_XXXXX',  // Ersätt med ditt Premium årspris ID
      },
      pro: {
        monthly: process.env.STRIPE_PRICE_PRO_MONTHLY || 'price_XXXXX', // Ersätt med ditt Pro månadspris ID
        yearly: process.env.STRIPE_PRICE_PRO_YEARLY || 'price_XXXXX',  // Ersätt med ditt Pro årspris ID
      },
    }

    const priceId = priceIds[tier]?.[yearly ? 'yearly' : 'monthly']
    if (!priceId || priceId === 'price_XXXXX') {
      return NextResponse.json({ 
        error: 'Price ID not configured. Please set up Stripe products and prices first.' 
      }, { status: 500 })
    }

    // Get user email from profile
    const { data: profile } = await supabaseServer
      .from('profiles')
      .select('email')
      .eq('id', user.id)
      .single()

    // Skapa checkout session
    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      payment_method_types: ['card'],
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      customer_email: profile?.email || user.email || undefined,
      metadata: {
        userId: user.id,
        tier: tier,
        billingPeriod: yearly ? 'yearly' : 'monthly',
      },
      payment_intent_data: {
        statement_descriptor: 'Spell School',
      },
      subscription_data: {
        metadata: {
          userId: user.id,
          tier: tier,
          billingPeriod: yearly ? 'yearly' : 'monthly',
        },
      },
      success_url: `${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/teacher/account?success=true&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/signup/teacher?tier=${tier}&canceled=true`,
    })

    return NextResponse.json({ sessionId: session.id, url: session.url })
  } catch (error: any) {
    console.error('Stripe checkout error:', error)
    return NextResponse.json({ error: error.message || 'Failed to create checkout session' }, { status: 500 })
  }
}

