# Stripe Production Setup Guide

Denna guide tar dig genom hela processen att sätta upp Stripe för produktion i Spell School.

## 📋 Checklista - Följ i ordning

### Steg 1: Förbered Stripe Production Account

1. **Logga in på Stripe Dashboard**
   - Gå till [dashboard.stripe.com](https://dashboard.stripe.com)
   - Växla från "Test mode" till **"Live mode"** (överst till höger)

2. **Skapa produkter i Production**
   - Gå till **Products** i menyn
   - Skapa två produkter:
     - **Premium** - Månadsvis: 79 SEK, Årsvis: 758 SEK
     - **Pro** - Månadsvis: 129 SEK, Årsvis: 1238 SEK
   - För varje produkt, skapa två priser:
     - En månadsvis (recurring, interval: month)
     - En årsvis (recurring, interval: year)
   - **VIKTIGT**: Kopiera alla 4 Price IDs (de börjar med `price_...`)
     - Du behöver dessa för environment variables senare (steg 4)

### Steg 2: Konfigurera Production Webhook

1. **Skapa Webhook Endpoint**
   - Gå till **Developers > Webhooks**
   - Klicka på **"Add endpoint"**
   - **Endpoint URL**: Detta beror på var din app är deployad:
     
     **Om du använder Vercel:**
     - Gå till ditt Vercel-projekt
     - Klicka på **Settings** → **Domains**
     - Kopiera din domän (t.ex. `spell-school.vercel.app` eller din anpassade domän)
     - Din endpoint URL blir: `https://din-domän.vercel.app/api/webhooks/stripe`
     - **Exempel**: Om din Vercel-domän är `spell-school.vercel.app`, blir URL:en:
       ```
       https://spell-school.vercel.app/api/webhooks/stripe
       ```
     
     **Om du använder en annan hosting-tjänst:**
     - Använd din produktionsdomän + `/api/webhooks/stripe`
     - **Exempel**: Om din domän är `spellschool.se`, blir URL:en:
       ```
       https://spellschool.se/api/webhooks/stripe
       ```
     
     **VIKTIGT**: 
     - URL:en måste vara HTTPS (inte HTTP)
     - URL:en måste vara tillgänglig från internet (inte localhost)
     - Om du inte har deployat ännu, kan du skapa webhook-endpointen senare eller använda en temporär URL
   
   - **Description**: "Spell School Production Webhook"
   - Välj följande events att lyssna på:
     - `checkout.session.completed`
     - `customer.subscription.created`
     - `customer.subscription.updated`
     - `customer.subscription.deleted`
   - Klicka på **"Add endpoint"**

2. **Kopiera Webhook Signing Secret**
   - Efter att webhook-endpointen skapats, klicka på den
   - Under **"Signing secret"**, klicka på **"Reveal"**
   - Kopiera värdet (börjar med `whsec_...`)
   - **VIKTIGT**: Spara detta säkert - du behöver det för environment variables

### Steg 3: Konfigurera Customer Portal

1. **Aktivera Customer Portal**
   - Gå till **Settings > Billing > Customer portal**
   - Klicka på **"Activate test link"** eller **"Activate"** (för produktion)
   - Konfigurera inställningar:
     - ✅ Tillåt kunder att uppdatera betalningsmetod
     - ✅ Tillåt kunder att avsluta prenumerationer
     - ✅ Tillåt kunder att se fakturahistorik
   - Spara inställningarna

### Steg 4: Hämta API Keys och Uppdatera Environment Variables

1. **Hämta Production API Keys**
   - Gå till **Developers > API keys** i Stripe Dashboard
   - Kopiera:
     - **Publishable key** (börjar med `pk_live_...`)
     - **Secret key** (börjar med `sk_live_...`) - klicka på "Reveal" för att se den
   - **VIKTIGT**: Spara dessa säkert - du behöver dem för environment variables

2. **Uppdatera Environment Variables**

**För lokal utveckling (`.env.local`):**
```bash
# Stripe Production Keys
STRIPE_SECRET_KEY=sk_live_...
STRIPE_PUBLISHABLE_KEY=pk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...

# Stripe Production Price IDs (från steg 1)
STRIPE_PRICE_PREMIUM_MONTHLY=price_...
STRIPE_PRICE_PREMIUM_YEARLY=price_...
STRIPE_PRICE_PRO_MONTHLY=price_...
STRIPE_PRICE_PRO_YEARLY=price_...

# Supabase (samma som tidigare)
NEXT_PUBLIC_SUPABASE_URL=https://edbbestqdwldryxuxkma.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=sb_publishable_bx81qdFnpcX79ovYbCL98Q_eirRtByp
SUPABASE_SERVICE_ROLE_KEY=din_service_role_key

# Base URL för produktion
NEXT_PUBLIC_BASE_URL=https://din-domän.se
```

**För Vercel Deployment:**
1. Gå till ditt Vercel-projekt
2. Klicka på **Settings > Environment Variables**
3. Lägg till alla ovanstående variabler
4. Välj **Production** (och eventuellt Preview/Development om du vill)
5. Spara

### Steg 5: Verifiera Säkerhet

- [ ] Kontrollera att `.env.local` är i `.gitignore` (så att API keys inte committas)
- [ ] Verifiera att inga API keys finns i koden (inga hardcoded keys)
- [ ] Kontrollera att `SUPABASE_SERVICE_ROLE_KEY` är korrekt
- [ ] Säkerställ att webhook signing secret är korrekt

### Steg 6: Testa i Produktion

**VIKTIGT**: Testa med små belopp först!

1. **Testa Checkout Flow**
   - Skapa ett nytt testkonto
   - Välj Premium eller Pro tier
   - Gå igenom checkout-processen
   - Verifiera att betalningen går igenom

2. **Testa Webhook**
   - Efter betalning, kontrollera Stripe Dashboard > Webhooks
   - Verifiera att webhook-events skickas och får 200-svar
   - Kontrollera att användarens tier uppdateras korrekt

3. **Testa Customer Portal**
   - Logga in med ett konto som har en aktiv prenumeration
   - Gå till Account-sidan
   - Klicka på "Hantera prenumeration"
   - Verifiera att Customer Portal öppnas korrekt

4. **Testa Upgrade**
   - Uppgradera från Premium till Pro
   - Verifiera att proration fungerar korrekt

### Steg 7: Monitoring och Support

1. **Sätt upp Monitoring**
   - Stripe Dashboard > Developers > Webhooks
   - Kontrollera regelbundet att webhooks fungerar
   - Sätt upp email-notifikationer för misslyckade webhooks

2. **Förbered Support**
   - Ha tillgång till Stripe Dashboard för att hjälpa kunder
   - Förstå hur du kan:
     - Se kundens prenumeration
     - Refundera betalningar
     - Uppdatera prenumerationer manuellt

## 🔒 Säkerhetschecklista

- [ ] Alla API keys är i environment variables (inte hardcoded)
- [ ] `.env.local` är i `.gitignore`
- [ ] Webhook signing verification är aktiverad
- [ ] Customer Portal är korrekt konfigurerad
- [ ] RLS (Row Level Security) är aktiverad i Supabase
- [ ] Service role key används endast på servern (inte i klientkod)

## 🐛 Felsökning

### Webhook fungerar inte
1. Kontrollera att webhook URL är korrekt
2. Verifiera att `STRIPE_WEBHOOK_SECRET` är korrekt
3. Kontrollera Stripe Dashboard > Webhooks för felmeddelanden
4. Kontrollera server logs för detaljerade fel

### Betalningar fungerar inte
1. Verifiera att Price IDs är korrekta
2. Kontrollera att API keys är för produktion (inte test)
3. Verifiera att produkter är aktiverade i Stripe Dashboard

### Customer Portal öppnas inte
1. Kontrollera att Customer Portal är aktiverad i Stripe Dashboard
2. Verifiera att användaren har en aktiv prenumeration
3. Kontrollera att `stripe_customer_id` är korrekt i databasen

## 📞 Support

Om du stöter på problem:
1. Kontrollera Stripe Dashboard för felmeddelanden
2. Kontrollera server logs
3. Kontrollera webhook events i Stripe Dashboard
4. Kontakta Stripe support om nödvändigt

## ✅ Final Checklist

Innan du går live:
- [ ] Alla produkter och priser är skapade i Production
- [ ] Production API keys är konfigurerade
- [ ] Webhook endpoint är konfigurerad och testad
- [ ] Customer Portal är aktiverad
- [ ] Environment variables är korrekt konfigurerade
- [ ] Testat checkout flow
- [ ] Testat webhook-hantering
- [ ] Testat Customer Portal
- [ ] Testat upgrade/downgrade
- [ ] Monitoring är på plats

---

**Lycka till med lanseringen! 🚀**

