# Payment Integration Guide för Spell School

## Översikt

Detta dokument beskriver hur du implementerar betalningsfunktionalitet för subscription tiers (Free, Premium, Pro) i Spell School.

## Nuvarande Status

**Vad som fungerar:**
- ✅ Subscription tiers är definierade (free, premium, pro)
- ✅ Limits kontrolleras korrekt (max students, max classes, etc.)
- ✅ Användare kan välja tier vid signup
- ✅ Tier sparas i `profiles.subscription_tier`

**Vad som saknas:**
- ❌ Faktisk betalning vid tier-val
- ❌ Betalningsverifiering
- ❌ Subscription management (uppgradera/nedgradera)
- ❌ Betalningshistorik

## Rekommenderad Lösning: Stripe

Stripe är det mest populära valet för subscription-betalningar eftersom det:
- Har bra Next.js integration
- Stödjer recurring payments (perfekt för månadsvis/årlig betalning)
- Har webhook support för automatisk verifiering
- Har bra dokumentation på svenska
- Stödjer svenska betalningsmetoder

## Implementation Plan

### Steg 1: Stripe Setup

1. **Skapa Stripe-konto**
   - Gå till https://stripe.com
   - Skapa konto (gratis)
   - Aktivera test mode för utveckling

2. **Hämta API-nycklar**
   - Gå till Developers → API keys
   - Kopiera:
     - Publishable key (börjar med `pk_test_...`)
     - Secret key (börjar med `sk_test_...`)

3. **Lägg till i `.env.local`**
   ```env
   NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...
   STRIPE_SECRET_KEY=sk_test_...
   STRIPE_WEBHOOK_SECRET=whsec_... (kommer senare)
   ```

### Steg 2: Installera Stripe

```bash
npm install stripe @stripe/stripe-js
```

### Steg 3: Skapa Stripe Products & Prices

I Stripe Dashboard:
1. Gå till Products
2. Skapa produkter för varje tier:
   - **Premium**: 79 SEK/månad eller 758 SEK/år
   - **Pro**: 129 SEK/månad eller 1238 SEK/år
3. Kopiera Price IDs (börjar med `price_...`)

### Steg 4: Skapa API Routes

#### 4.1 Create Checkout Session (`/api/create-checkout-session`)

```typescript
// src/app/api/create-checkout-session/route.ts
import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'
import { supabaseServer } from '@/lib/supabase-server'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2024-11-20.acacia',
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
    
    // Price IDs från Stripe Dashboard
    const priceIds: Record<string, { monthly: string; yearly: string }> = {
      premium: {
        monthly: 'price_...', // Ersätt med ditt Premium månadspris ID
        yearly: 'price_...',  // Ersätt med ditt Premium årspris ID
      },
      pro: {
        monthly: 'price_...', // Ersätt med ditt Pro månadspris ID
        yearly: 'price_...',  // Ersätt med ditt Pro årspris ID
      },
    }

    const priceId = priceIds[tier]?.[yearly ? 'yearly' : 'monthly']
    if (!priceId) {
      return NextResponse.json({ error: 'Invalid tier' }, { status: 400 })
    }

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
      customer_email: user.email,
      metadata: {
        userId: user.id,
        tier: tier,
      },
      success_url: `${process.env.NEXT_PUBLIC_BASE_URL}/teacher/account?success=true`,
      cancel_url: `${process.env.NEXT_PUBLIC_BASE_URL}/teacher/account?canceled=true`,
    })

    return NextResponse.json({ sessionId: session.id, url: session.url })
  } catch (error: any) {
    console.error('Stripe checkout error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
```

#### 4.2 Webhook Handler (`/api/webhooks/stripe`)

```typescript
// src/app/api/webhooks/stripe/route.ts
import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'
import { supabaseServer } from '@/lib/supabase-server'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2024-11-20.acacia',
})

const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET!

export async function POST(request: NextRequest) {
  const body = await request.text()
  const signature = request.headers.get('stripe-signature')!

  let event: Stripe.Event

  try {
    event = stripe.webhooks.constructEvent(body, signature, webhookSecret)
  } catch (err: any) {
    console.error('Webhook signature verification failed:', err.message)
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 })
  }

  // Hantera olika event types
  switch (event.type) {
    case 'checkout.session.completed': {
      const session = event.data.object as Stripe.Checkout.Session
      const userId = session.metadata?.userId
      const tier = session.metadata?.tier

      if (userId && tier) {
        // Uppdatera subscription_tier i profiles
        await supabaseServer
          .from('profiles')
          .update({ subscription_tier: tier })
          .eq('id', userId)
      }
      break
    }

    case 'customer.subscription.updated':
    case 'customer.subscription.deleted': {
      const subscription = event.data.object as Stripe.Subscription
      // Hantera subscription updates/cancellations
      // Du kan spara subscription ID i profiles för att kunna uppdatera
      break
    }
  }

  return NextResponse.json({ received: true })
}
```

### Steg 5: Uppdatera Signup Flow

I `src/app/signup/teacher/page.tsx`:

```typescript
// När användare väljer Premium eller Pro tier
const handleTierSelection = async (tier: 'premium' | 'pro', yearly: boolean) => {
  try {
    const response = await fetch('/api/create-checkout-session', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${session?.access_token}`,
      },
      body: JSON.stringify({ tier, yearly }),
    })

    const { url } = await response.json()
    
    // Redirect till Stripe Checkout
    window.location.href = url
  } catch (error) {
    console.error('Checkout error:', error)
  }
}
```

### Steg 6: Webhook Setup i Stripe

1. I Stripe Dashboard → Developers → Webhooks
2. Klicka "Add endpoint"
3. URL: `https://www.spellschool.se/api/webhooks/stripe`
4. Välj events:
   - `checkout.session.completed`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
5. Kopiera webhook secret och lägg i `.env.local`

### Steg 7: Testa

1. **Test mode**: Använd test-kort från Stripe
   - Success: `4242 4242 4242 4242`
   - Any future expiry date
   - Any CVC

2. **Verifiera**:
   - Checkout session skapas
   - Betalning går igenom
   - Webhook triggas
   - `subscription_tier` uppdateras i databasen

## Alternativ: Stripe Customer Portal

För att låta användare hantera sina subscriptions (uppgradera, nedgradera, avbryta):

```typescript
// src/app/api/create-portal-session/route.ts
const session = await stripe.billingPortal.sessions.create({
  customer: customerId, // Spara customer ID från Stripe i profiles
  return_url: `${process.env.NEXT_PUBLIC_BASE_URL}/teacher/account`,
})
```

## Säkerhetsöverväganden

1. **Validera alltid på servern**: Använd webhooks, inte client-side events
2. **Använd service role key**: För webhook handler, använd Supabase service role
3. **Verifiera webhook signatures**: Alltid verifiera Stripe signatures
4. **Spara subscription ID**: Spara Stripe subscription ID i profiles för framtida uppdateringar

## Nästa Steg

1. Implementera Stripe checkout
2. Testa med test-kort
3. Sätt upp webhooks
4. Lägg till subscription management UI
5. Implementera customer portal för self-service

## Ytterligare Resurser

- [Stripe Next.js Guide](https://stripe.com/docs/payments/quickstart)
- [Stripe Subscriptions](https://stripe.com/docs/billing/subscriptions/overview)
- [Stripe Webhooks](https://stripe.com/docs/webhooks)




