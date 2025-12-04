# Stripe Prenumerationsuppsägning - Guide

## Hur fungerar uppsägning?

När en användare säger upp sin prenumeration via Stripe Customer Portal:

### 1. **Omedelbart (när användaren säger upp)**
- Stripe sätter `cancel_at_period_end: true` på subscriptionen
- Subscription status förblir `active` (användaren behåller tillgång tills perioden är slut)
- Webhook `customer.subscription.updated` skickas
- **Tier ändras INTE ännu** - användaren behåller sin Premium/Pro-plan tills perioden är slut

### 2. **När faktureringsperioden är slut**
- Stripe avslutar subscriptionen automatiskt
- Webhook `customer.subscription.deleted` skickas
- **Tier ändras automatiskt till 'free'** via webhook-hanteraren

## Webhook Events

### `customer.subscription.updated`
Detta event triggas när:
- Prenumerationen uppdateras (t.ex. uppgradering, nedgradering)
- Uppsägning schemaläggs (`cancel_at_period_end` sätts till `true`)
- Status ändras

**Vad händer:**
- Om `cancel_at_period_end: true` → Loggas men tier ändras INTE ännu
- Om `status === 'canceled'` → Tier ändras omedelbart till 'free'
- Om `status === 'active'` → Tier uppdateras baserat på metadata

### `customer.subscription.deleted`
Detta event triggas när:
- Faktureringsperioden är slut och subscriptionen faktiskt avslutas
- Subscriptionen raderas från Stripe

**Vad händer:**
- Tier ändras automatiskt till 'free'
- Detta är det event som faktiskt triggar nedgraderingen

## Testning

### Testa uppsägning i test-miljö:

1. **Säg upp via Customer Portal:**
   - Gå till `/teacher/account`
   - Klicka på "Hantera prenumeration"
   - Säg upp prenumerationen i Stripe Customer Portal
   - Kontrollera att tier fortfarande är Premium/Pro (ska vara kvar tills perioden är slut)

2. **Simulera period slut:**
   - I Stripe Dashboard (test mode), gå till subscriptionen
   - Manuellt avsluta subscriptionen (eller vänta tills perioden är slut)
   - Kontrollera webhook logs för `customer.subscription.deleted`
   - Kontrollera att tier ändras till 'free' i Spell School

### Testa med Stripe CLI:

```bash
# Simulera subscription deletion
stripe trigger customer.subscription.deleted
```

## Viktiga punkter

✅ **Användaren behåller tillgång tills perioden är slut**
- Detta är standard Stripe-beteende
- Användaren kan fortfarande använda Premium/Pro-funktioner tills faktureringsperioden är slut

✅ **Automatisk nedgradering**
- När perioden är slut, ändras tier automatiskt till 'free' via webhook
- Ingen manuell åtgärd krävs

✅ **Webhook-hantering**
- `customer.subscription.deleted` är det event som faktiskt triggar nedgraderingen
- `customer.subscription.updated` loggar när uppsägning schemaläggs men ändrar inte tier ännu

## Felsökning

### Tier ändras inte till 'free' efter uppsägning?

1. **Kontrollera webhook logs:**
   - Se server logs för `customer.subscription.deleted` event
   - Verifiera att webhook faktiskt mottogs

2. **Kontrollera Stripe Dashboard:**
   - Se om subscriptionen faktiskt är raderad
   - Kontrollera subscription status

3. **Kontrollera webhook forwarding:**
   - Om du använder Stripe CLI: `stripe listen --forward-to localhost:3000/api/webhooks/stripe`
   - Verifiera att webhook secret är korrekt i `.env.local`

4. **Manuell test:**
   - Använd Stripe CLI för att simulera event: `stripe trigger customer.subscription.deleted`

## Produktion

I produktion:
- Konfigurera webhook endpoint i Stripe Dashboard
- Lägg till webhook secret i production environment variables
- Testa uppsägning i production innan launch

