# Stripe Webhook Felsökning

## Problem: Subscription tier uppdateras inte efter betalning

### Steg 1: Kontrollera att webhook forwarding körs

Kör detta i en separat terminal:
```powershell
C:\Users\cwinh\Downloads\stripe_1.33.0_windows_x86_64\stripe.exe listen --forward-to localhost:3000/api/webhooks/stripe
```

Du bör se events när du gör en betalning:
```
2025-12-03 22:45:28   --> checkout.session.completed [evt_...]
2025-12-03 22:45:30  <--  [200] POST http://localhost:3000/api/webhooks/stripe
```

### Steg 2: Kontrollera server logs

I terminalen där `npm run dev` körs, leta efter:
- `🔔 Webhook received!`
- `✅ Webhook verified! Event type: checkout.session.completed`
- `💳 Processing checkout.session.completed event`
- `📋 Session metadata: { userId: ..., tier: ... }`
- `✅ Successfully updated user ... to tier premium`

### Steg 3: Kontrollera databasen

1. Gå till Supabase Dashboard > Table Editor > `profiles`
2. Hitta din användare
3. Kontrollera att:
   - `subscription_tier` är uppdaterad till `premium` eller `pro`
   - `stripe_customer_id` är ifylld
   - `stripe_subscription_id` är ifylld (om kolumnen finns)

### Steg 4: Kör SQL-filer om de saknas

Kör dessa SQL-filer i Supabase SQL Editor om du inte redan gjort det:
1. `add-stripe-customer-id-column.sql`
2. `add-stripe-subscription-id-column.sql`

### Steg 5: Kontrollera environment variables

Kontrollera att dessa finns i `.env`:
```
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGci...
STRIPE_PRICE_PREMIUM_MONTHLY=price_...
STRIPE_PRICE_PREMIUM_YEARLY=price_...
STRIPE_PRICE_PRO_MONTHLY=price_...
STRIPE_PRICE_PRO_YEARLY=price_...
```

### Steg 6: Testa manuellt

Om webhook inte fungerar, kan du testa manuellt:

1. Gå till Stripe Dashboard > Events
2. Hitta `checkout.session.completed` eventet
3. Klicka på "Send test webhook"
4. Välj endpoint: `http://localhost:3000/api/webhooks/stripe`
5. Kontrollera server logs

### Vanliga problem

#### Problem: "Missing userId or tier in checkout session metadata"
**Lösning**: Kontrollera att `create-checkout-session` skickar metadata korrekt. Se `src/app/api/create-checkout-session/route.ts` rad 67-71.

#### Problem: "Profile not found"
**Lösning**: Kontrollera att användaren har en profil i `profiles` tabellen. Profilen skapas vid signup.

#### Problem: "Error updating profile"
**Lösning**: Kontrollera att `SUPABASE_SERVICE_ROLE_KEY` är korrekt i `.env`. Service role key behövs för att kringgå RLS.

#### Problem: Webhook events kommer men tier uppdateras inte
**Lösning**: 
1. Kontrollera server logs för specifika felmeddelanden
2. Kontrollera att `stripe_subscription_id` kolumnen finns i databasen
3. Testa att uppdatera manuellt i Supabase för att se om det är ett RLS-problem

### Debug logging

Webhook-hanteraren loggar nu:
- `🔔 Webhook received!` - Webhook mottagen
- `✅ Webhook verified!` - Signature verifierad
- `💳 Processing checkout.session.completed event` - Event processas
- `📋 Session metadata:` - Metadata som skickas
- `🔄 Updating profile for user ...` - Uppdatering påbörjas
- `✅ Successfully updated user ...` - Uppdatering lyckades
- `❌ Error ...` - Fel uppstod

### Ytterligare hjälp

Om problemet kvarstår:
1. Kopiera alla loggar från både `stripe listen` och `npm run dev`
2. Kontrollera Stripe Dashboard > Events för att se vilka events som skickas
3. Kontrollera Supabase logs för databasfel

