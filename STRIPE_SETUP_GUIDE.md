# Stripe Payment Integration - Setup Guide

Detta dokument beskriver hur du konfigurerar Stripe-betalningar för Spell School.

## Steg 1: Installera Stripe-paket

```bash
npm install stripe @stripe/stripe-js
```

**OBS:** Om `package.json` är korrupt, kan du behöva återskapa den eller installera paketen manuellt.

## Steg 2: Skapa Stripe-konto och produkter

1. Gå till [Stripe Dashboard](https://dashboard.stripe.com)
2. Skapa ett konto (gratis)
3. Aktivera **Test mode** för utveckling

### Skapa produkter och priser

1. Gå till **Products** i Stripe Dashboard
2. Klicka **Add product**
3. Skapa produkter för varje tier:

#### Premium Tier
- **Namn:** Premium Plan
- **Beskrivning:** Premium subscription for Spell School
- **Pris:** 
  - Månadsvis: 79 SEK/månad (Recurring)
  - Årsvis: 758 SEK/år (Recurring, faktureras årligen)
- **Kopiera Price ID** (börjar med `price_...`)

#### Pro Tier
- **Namn:** Pro Plan
- **Beskrivning:** Pro subscription for Spell School
- **Pris:**
  - Månadsvis: 129 SEK/månad (Recurring)
  - Årsvis: 1238 SEK/år (Recurring, faktureras årligen)
- **Kopiera Price ID** (börjar med `price_...`)

## Steg 3: Hämta API-nycklar

1. Gå till **Developers → API keys** i Stripe Dashboard
2. Kopiera:
   - **Publishable key** (börjar med `pk_test_...` för test mode)
   - **Secret key** (börjar med `sk_test_...` för test mode)

## Steg 4: Konfigurera Environment Variables

Lägg till följande i din `.env.local` fil:

```env
# Stripe Configuration
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_... (kommer i nästa steg)

# Stripe Price IDs (från steg 2)
STRIPE_PRICE_PREMIUM_MONTHLY=price_...
STRIPE_PRICE_PREMIUM_YEARLY=price_...
STRIPE_PRICE_PRO_MONTHLY=price_...
STRIPE_PRICE_PRO_YEARLY=price_...

# Base URL (för redirects)
NEXT_PUBLIC_BASE_URL=http://localhost:3000  # För lokal utveckling
# NEXT_PUBLIC_BASE_URL=https://www.spellschool.se  # För produktion
```

## Steg 5: Sätt upp Webhook

### För lokal utveckling (med Stripe CLI):

1. Installera [Stripe CLI](https://stripe.com/docs/stripe-cli)
2. Logga in:
   ```bash
   stripe login
   ```
3. Forwarda webhooks till din lokala server:
   ```bash
   stripe listen --forward-to localhost:3000/api/webhooks/stripe
   ```
4. Kopiera webhook secret (börjar med `whsec_...`) och lägg i `.env.local`

### För produktion:

1. Gå till **Developers → Webhooks** i Stripe Dashboard
2. Klicka **Add endpoint**
3. **Endpoint URL:** `https://www.spellschool.se/api/webhooks/stripe`
4. Välj events att lyssna på:
   - `checkout.session.completed`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
5. Klicka **Add endpoint**
6. Kopiera **Signing secret** (börjar med `whsec_...`) och lägg i `.env.local`

## Steg 6: Uppdatera databasen

Kör SQL-filen i Supabase SQL Editor:

```bash
add-stripe-customer-id-column.sql
```

Detta lägger till `stripe_customer_id` kolumnen i `profiles` tabellen.

## Steg 7: Uppdatera Price IDs i koden

Uppdatera Price IDs i `src/app/api/create-checkout-session/route.ts`:

```typescript
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
```

Eller använd environment variables (rekommenderat) - se steg 4.

## Steg 8: Testa integrationen

### Test-kort från Stripe:

- **Success:** `4242 4242 4242 4242`
- **Any future expiry date** (t.ex. 12/34)
- **Any CVC** (t.ex. 123)
- **Any ZIP code**

### Testflöde:

1. Gå till `/signup/teacher`
2. Välj **Premium** eller **Pro** tier
3. Fyll i signup-formulär
4. Du kommer att redirectas till Stripe Checkout
5. Använd test-kortet ovan
6. Efter betalning redirectas du till `/teacher/account?success=true`
7. Webhook uppdaterar `subscription_tier` i databasen
8. Kontrollera att tier är uppdaterad på account-sidan

## Säkerhetsöverväganden

1. **Använd alltid webhooks** - Verifiera betalningar på servern, inte client-side
2. **Verifiera webhook signatures** - Alltid verifiera Stripe signatures (redan implementerat)
3. **Använd service role key** - För webhook handler, använd Supabase service role om nödvändigt
4. **Spara customer ID** - `stripe_customer_id` sparas i profiles för framtida subscription management

## Nästa steg (valfritt)

1. **Customer Portal** - Implementera Stripe Customer Portal för self-service subscription management
2. **Årlig betalning** - Lägg till val för månadsvis/årlig betalning i UI
3. **Subscription management** - Lägg till funktioner för att uppgradera/nedgradera/avbryta subscriptions

## Felsökning

### Webhook fungerar inte lokalt:
- Använd Stripe CLI för att forwarda webhooks (se steg 5)
- Kontrollera att webhook secret är korrekt i `.env.local`

### Betalning går igenom men tier uppdateras inte:
- Kontrollera webhook logs i Stripe Dashboard
- Kontrollera server logs för fel
- Verifiera att `stripe_customer_id` kolumnen finns i databasen
- Kontrollera att webhook events är korrekt konfigurerade

### Price ID fel:
- Kontrollera att Price IDs är korrekta i Stripe Dashboard
- Verifiera att environment variables är satta korrekt
- Kontrollera att Price IDs matchar test/production mode

## Ytterligare resurser

- [Stripe Next.js Guide](https://stripe.com/docs/payments/quickstart)
- [Stripe Subscriptions](https://stripe.com/docs/billing/subscriptions/overview)
- [Stripe Webhooks](https://stripe.com/docs/webhooks)
- [Stripe Test Cards](https://stripe.com/docs/testing)



