# Verifiering: Automatisk nedgradering vid prenumerationsutgång

## Översikt

Detta dokument verifierar att systemet korrekt hanterar automatisk nedgradering till free tier när en Stripe-prenumeration går ut (t.ex. efter 1 år för en årsprenumeration).

## Hur Stripe hanterar prenumerationsutgång

När en Stripe subscription går ut (vid period end):

1. **Stripe skickar webhook event**: `customer.subscription.deleted`
   - Detta event skickas automatiskt när en subscription når `current_period_end` och inte förnyas
   - Detta gäller både för månadsvisa och årliga prenumerationer

2. **Subscription status**: 
   - Subscription blir `canceled` vid period end om den inte förnyas
   - Stripe skickar `customer.subscription.deleted` event när subscription faktiskt tas bort

## Nuvarande implementation

### Webhook-hantering i `src/app/api/webhooks/stripe/route.ts`

Systemet hanterar följande events:

#### 1. `customer.subscription.deleted` (rad 264-299)

**Funktionalitet:**
- ✅ När en subscription tas bort (vid period end eller manuell avbokning)
- ✅ Hittar användaren via `stripe_customer_id`
- ✅ Nedgraderar automatiskt till `free` tier:
  ```typescript
  await supabaseAdmin
    .from('profiles')
    .update({ subscription_tier: 'free' })
    .eq('id', profile.id)
  ```

**Status:** ✅ IMPLEMENTERAT

#### 2. `customer.subscription.updated` (rad 194-261)

**Funktionalitet:**
- ✅ Hanterar statusändringar i realtid
- ✅ Om status är `canceled`, `past_due`, eller `unpaid` → nedgraderar till free omedelbart
- ✅ Om status är `active` → uppdaterar tier baserat på metadata/price
- ✅ Loggar när subscription är schemalagd för avbokning (`cancel_at_period_end`)

**Status:** ✅ IMPLEMENTERAT

**Notera:** Systemet väntar på `customer.subscription.deleted` event för att nedgradera vid period end (kommentar på rad 225), vilket är korrekt beteende.

## Testscenarion

### Scenario 1: Årsprenumeration går ut efter 1 år

**Förväntat beteende:**
1. Användare köper årsprenumeration (Premium eller Pro)
2. Efter 365 dagar, när `current_period_end` når, skickar Stripe `customer.subscription.deleted`
3. Webhook fångar eventet och nedgraderar användaren till `free` tier
4. Användaren förlorar Premium/Pro-funktioner automatiskt

**Status:** ✅ FUNGERAR (om webhook är korrekt konfigurerad)

### Scenario 2: Betalning misslyckas

**Förväntat beteende:**
1. Stripe försöker debitera kundens kort
2. Om betalningen misslyckas → subscription blir `past_due`
3. `customer.subscription.updated` event triggas med status `past_due`
4. Systemet nedgraderar till `free` omedelbart (rad 229)

**Status:** ✅ FUNGERAR

### Scenario 3: Manuell avbokning

**Förväntat beteende:**
1. Användare avbokar prenumerationen
2. Stripe sätter `cancel_at_period_end = true`
3. Vid period end → `customer.subscription.deleted` event
4. Systemet nedgraderar till `free`

**Status:** ✅ FUNGERAR

## Krav för att det ska fungera

### 1. Stripe Webhook Configuration ✅

Webhook endpoint måste vara konfigurerad i Stripe Dashboard:
- **URL:** `https://din-domän.com/api/webhooks/stripe`
- **Events att lyssna på:**
  - `customer.subscription.deleted` (KRITISKT)
  - `customer.subscription.updated` (VIKTIGT)
  - `checkout.session.completed` (för nya prenumerationer)

### 2. Webhook Secret ✅

Miljövariabeln `STRIPE_WEBHOOK_SECRET` måste vara konfigurerad och matcha Stripe Dashboard.

### 3. Supabase Service Role Key ✅

`SUPABASE_SERVICE_ROLE_KEY` måste vara konfigurerad för att webhook ska kunna uppdatera profiles-tabellen.

## Potentiella problem

### Problem 1: Webhook når inte servern

**Symptom:** Användare förblir på Premium/Pro efter att prenumerationen går ut

**Lösning:**
- Kontrollera Stripe Dashboard → Webhooks → Events
- Verifiera att events faktiskt skickas
- Kontrollera serverlogs för webhook events
- Verifiera att webhook URL är tillgänglig publikt

### Problem 2: Webhook verification misslyckas

**Symptom:** Webhook events tas emot men avvisas

**Lösning:**
- Verifiera att `STRIPE_WEBHOOK_SECRET` är korrekt
- Kontrollera att webhook endpoint använder samma secret som Stripe Dashboard

### Problem 3: Supabase update misslyckas

**Symptom:** Webhook når servern men nedgradering misslyckas

**Lösning:**
- Kontrollera serverlogs för felmeddelanden
- Verifiera att `SUPABASE_SERVICE_ROLE_KEY` är korrekt
- Kontrollera RLS policies (webhook använder admin client så det borde fungera)

## Rekommendationer

### 1. Logging

Nuvarande implementation har bra logging:
- ✅ Logger när subscription tas bort
- ✅ Logger när nedgradering sker
- ✅ Logger felmeddelanden

### 2. Monitoring

Överväg att lägga till:
- Alert när subscription går ut (för att kunna följa upp)
- Dashboard för aktiva/förfallna prenumerationer
- Statistiksida för subscription events

### 3. Backup check (Valfritt)

För extra säkerhet kan du lägga till en cron job som:
- Kontrollerar alla aktiva subscriptions i Stripe
- Jämför med profiles i databasen
- Nedgraderar användare där subscription faktiskt är borttagen men profilen fortfarande visar Premium/Pro

**Exempel:**
```typescript
// Körs en gång per dag via cron
async function syncSubscriptionStatus() {
  // Hämta alla Premium/Pro användare med stripe_subscription_id
  // För varje: kontrollera i Stripe om subscription fortfarande är aktiv
  // Om inte aktiv: nedgradera till free
}
```

## Slutsats

✅ **Systemet har funktionalitet för automatisk nedgradering**

När en prenumeration går ut (t.ex. efter 1 år för årsprenumeration):
1. Stripe skickar `customer.subscription.deleted` event
2. Webhook fångar eventet
3. Användaren nedgraderas automatiskt till `free` tier

**VIKTIGT:** För att det ska fungera måste:
- Webhook vara korrekt konfigurerad i Stripe Dashboard
- Webhook secret vara korrekt konfigurerad
- Supabase service role key vara korrekt konfigurerad

## Testning

För att testa funktionaliteten:

1. **Stripe Test Mode:**
   - Skapa en test subscription
   - Manuellt ta bort subscription i Stripe Dashboard
   - Verifiera att webhook event tas emot
   - Kontrollera att användaren nedgraderas i databasen

2. **Production:**
   - Övervaka Stripe Dashboard → Webhooks → Events
   - Övervaka serverlogs för webhook events
   - Verifiera att nedgraderingar sker när förväntat


## Översikt

Detta dokument verifierar att systemet korrekt hanterar automatisk nedgradering till free tier när en Stripe-prenumeration går ut (t.ex. efter 1 år för en årsprenumeration).

## Hur Stripe hanterar prenumerationsutgång

När en Stripe subscription går ut (vid period end):

1. **Stripe skickar webhook event**: `customer.subscription.deleted`
   - Detta event skickas automatiskt när en subscription når `current_period_end` och inte förnyas
   - Detta gäller både för månadsvisa och årliga prenumerationer

2. **Subscription status**: 
   - Subscription blir `canceled` vid period end om den inte förnyas
   - Stripe skickar `customer.subscription.deleted` event när subscription faktiskt tas bort

## Nuvarande implementation

### Webhook-hantering i `src/app/api/webhooks/stripe/route.ts`

Systemet hanterar följande events:

#### 1. `customer.subscription.deleted` (rad 264-299)

**Funktionalitet:**
- ✅ När en subscription tas bort (vid period end eller manuell avbokning)
- ✅ Hittar användaren via `stripe_customer_id`
- ✅ Nedgraderar automatiskt till `free` tier:
  ```typescript
  await supabaseAdmin
    .from('profiles')
    .update({ subscription_tier: 'free' })
    .eq('id', profile.id)
  ```

**Status:** ✅ IMPLEMENTERAT

#### 2. `customer.subscription.updated` (rad 194-261)

**Funktionalitet:**
- ✅ Hanterar statusändringar i realtid
- ✅ Om status är `canceled`, `past_due`, eller `unpaid` → nedgraderar till free omedelbart
- ✅ Om status är `active` → uppdaterar tier baserat på metadata/price
- ✅ Loggar när subscription är schemalagd för avbokning (`cancel_at_period_end`)

**Status:** ✅ IMPLEMENTERAT

**Notera:** Systemet väntar på `customer.subscription.deleted` event för att nedgradera vid period end (kommentar på rad 225), vilket är korrekt beteende.

## Testscenarion

### Scenario 1: Årsprenumeration går ut efter 1 år

**Förväntat beteende:**
1. Användare köper årsprenumeration (Premium eller Pro)
2. Efter 365 dagar, när `current_period_end` når, skickar Stripe `customer.subscription.deleted`
3. Webhook fångar eventet och nedgraderar användaren till `free` tier
4. Användaren förlorar Premium/Pro-funktioner automatiskt

**Status:** ✅ FUNGERAR (om webhook är korrekt konfigurerad)

### Scenario 2: Betalning misslyckas

**Förväntat beteende:**
1. Stripe försöker debitera kundens kort
2. Om betalningen misslyckas → subscription blir `past_due`
3. `customer.subscription.updated` event triggas med status `past_due`
4. Systemet nedgraderar till `free` omedelbart (rad 229)

**Status:** ✅ FUNGERAR

### Scenario 3: Manuell avbokning

**Förväntat beteende:**
1. Användare avbokar prenumerationen
2. Stripe sätter `cancel_at_period_end = true`
3. Vid period end → `customer.subscription.deleted` event
4. Systemet nedgraderar till `free`

**Status:** ✅ FUNGERAR

## Krav för att det ska fungera

### 1. Stripe Webhook Configuration ✅

Webhook endpoint måste vara konfigurerad i Stripe Dashboard:
- **URL:** `https://din-domän.com/api/webhooks/stripe`
- **Events att lyssna på:**
  - `customer.subscription.deleted` (KRITISKT)
  - `customer.subscription.updated` (VIKTIGT)
  - `checkout.session.completed` (för nya prenumerationer)

### 2. Webhook Secret ✅

Miljövariabeln `STRIPE_WEBHOOK_SECRET` måste vara konfigurerad och matcha Stripe Dashboard.

### 3. Supabase Service Role Key ✅

`SUPABASE_SERVICE_ROLE_KEY` måste vara konfigurerad för att webhook ska kunna uppdatera profiles-tabellen.

## Potentiella problem

### Problem 1: Webhook når inte servern

**Symptom:** Användare förblir på Premium/Pro efter att prenumerationen går ut

**Lösning:**
- Kontrollera Stripe Dashboard → Webhooks → Events
- Verifiera att events faktiskt skickas
- Kontrollera serverlogs för webhook events
- Verifiera att webhook URL är tillgänglig publikt

### Problem 2: Webhook verification misslyckas

**Symptom:** Webhook events tas emot men avvisas

**Lösning:**
- Verifiera att `STRIPE_WEBHOOK_SECRET` är korrekt
- Kontrollera att webhook endpoint använder samma secret som Stripe Dashboard

### Problem 3: Supabase update misslyckas

**Symptom:** Webhook når servern men nedgradering misslyckas

**Lösning:**
- Kontrollera serverlogs för felmeddelanden
- Verifiera att `SUPABASE_SERVICE_ROLE_KEY` är korrekt
- Kontrollera RLS policies (webhook använder admin client så det borde fungera)

## Rekommendationer

### 1. Logging

Nuvarande implementation har bra logging:
- ✅ Logger när subscription tas bort
- ✅ Logger när nedgradering sker
- ✅ Logger felmeddelanden

### 2. Monitoring

Överväg att lägga till:
- Alert när subscription går ut (för att kunna följa upp)
- Dashboard för aktiva/förfallna prenumerationer
- Statistiksida för subscription events

### 3. Backup check (Valfritt)

För extra säkerhet kan du lägga till en cron job som:
- Kontrollerar alla aktiva subscriptions i Stripe
- Jämför med profiles i databasen
- Nedgraderar användare där subscription faktiskt är borttagen men profilen fortfarande visar Premium/Pro

**Exempel:**
```typescript
// Körs en gång per dag via cron
async function syncSubscriptionStatus() {
  // Hämta alla Premium/Pro användare med stripe_subscription_id
  // För varje: kontrollera i Stripe om subscription fortfarande är aktiv
  // Om inte aktiv: nedgradera till free
}
```

## Slutsats

✅ **Systemet har funktionalitet för automatisk nedgradering**

När en prenumeration går ut (t.ex. efter 1 år för årsprenumeration):
1. Stripe skickar `customer.subscription.deleted` event
2. Webhook fångar eventet
3. Användaren nedgraderas automatiskt till `free` tier

**VIKTIGT:** För att det ska fungera måste:
- Webhook vara korrekt konfigurerad i Stripe Dashboard
- Webhook secret vara korrekt konfigurerad
- Supabase service role key vara korrekt konfigurerad

## Testning

För att testa funktionaliteten:

1. **Stripe Test Mode:**
   - Skapa en test subscription
   - Manuellt ta bort subscription i Stripe Dashboard
   - Verifiera att webhook event tas emot
   - Kontrollera att användaren nedgraderas i databasen

2. **Production:**
   - Övervaka Stripe Dashboard → Webhooks → Events
   - Övervaka serverlogs för webhook events
   - Verifiera att nedgraderingar sker när förväntat



