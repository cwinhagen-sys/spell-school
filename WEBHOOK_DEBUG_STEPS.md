# Webhook Debugging Steps

## Problem: Tier uppdateras inte efter betalning

### Steg 1: Kontrollera att `stripe listen` körs

Kör detta i en separat terminal:
```powershell
C:\Users\cwinh\Downloads\stripe_1.33.0_windows_x86_64\stripe.exe listen --forward-to localhost:3000/api/webhooks/stripe
```

Du bör se events när du gör en betalning. Om du INTE ser events, är problemet att webhook forwarding inte fungerar.

### Steg 2: Kontrollera server logs

I terminalen där `npm run dev` körs, leta efter:
- `🔔 Webhook received!` - Om du INTE ser detta, kommer webhook events inte fram
- `✅ Webhook verified! Event type: checkout.session.completed` - Om du INTE ser detta, är signature verification fel
- `💳 Processing checkout.session.completed event` - Om du INTE ser detta, hanteras inte eventet
- `✅ Successfully updated user ... to tier premium` - Om du INTE ser detta, misslyckas databasuppdateringen

### Steg 3: Testa manuell uppdatering

Öppna browser console och kör:
```javascript
fetch('/api/test-webhook', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    userId: '75c9cc1b-9072-49de-923a-43789e45e13a', // Din user ID från console
    tier: 'premium'
  })
}).then(r => r.json()).then(console.log)
```

Om detta fungerar, är problemet att webhook-hanteraren inte körs. Om detta INTE fungerar, är problemet med databasuppdateringen.

### Steg 4: Kontrollera Stripe Dashboard

1. Gå till Stripe Dashboard > Events
2. Hitta `checkout.session.completed` eventet för din betalning
3. Klicka på eventet och kolla metadata:
   - `userId` ska vara ditt user ID
   - `tier` ska vara `premium` eller `pro`

### Steg 5: Testa webhook manuellt från Stripe

1. Gå till Stripe Dashboard > Events
2. Hitta `checkout.session.completed` eventet
3. Klicka på "Send test webhook"
4. Välj endpoint: `http://localhost:3000/api/webhooks/stripe`
5. Kontrollera server logs för att se om webhook kommer fram

### Steg 6: Kontrollera databasen direkt

1. Gå till Supabase Dashboard > Table Editor > `profiles`
2. Hitta din användare (user ID: `75c9cc1b-9072-49de-923a-43789e45e13a`)
3. Kontrollera:
   - `subscription_tier` - ska vara `premium` eller `pro`
   - `stripe_customer_id` - ska vara ifylld
   - `stripe_subscription_id` - ska vara ifylld (om kolumnen finns)

### Vanliga problem och lösningar

#### Problem: Inga webhook events i `stripe listen`
**Lösning**: 
- Kontrollera att `stripe listen` körs
- Kontrollera att URL är korrekt: `localhost:3000/api/webhooks/stripe`
- Försök starta om `stripe listen`

#### Problem: "Webhook signature verification failed"
**Lösning**: 
- Kontrollera att `STRIPE_WEBHOOK_SECRET` i `.env` matchar secret från `stripe listen`
- Secret börjar med `whsec_...`

#### Problem: "Missing userId or tier in checkout session metadata"
**Lösning**: 
- Kontrollera att `create-checkout-session` skickar metadata korrekt
- Se `src/app/api/create-checkout-session/route.ts` rad 67-71

#### Problem: "Profile not found"
**Lösning**: 
- Kontrollera att användaren har en profil i `profiles` tabellen
- Profilen skapas vid signup i `src/app/signup/teacher/page.tsx`

#### Problem: "Error updating profile"
**Lösning**: 
- Kontrollera att `SUPABASE_SERVICE_ROLE_KEY` är korrekt i `.env`
- Service role key behövs för att kringgå RLS
- Kontrollera Supabase logs för detaljerade felmeddelanden

### Nästa steg

Efter att ha följt dessa steg, kopiera:
1. Server logs från `npm run dev`
2. Output från `stripe listen`
3. Resultat från manuell test (`/api/test-webhook`)
4. Screenshot från Stripe Dashboard > Events

