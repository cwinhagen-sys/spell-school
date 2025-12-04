# Stripe Production Checklist

## ✅ Redan implementerat (Test-miljö)

- [x] Stripe test API keys konfigurerade
- [x] Price IDs konfigurerade
- [x] Webhook forwarding (lokalt via Stripe CLI)
- [x] Checkout session creation
- [x] Webhook handler för subscription events
- [x] Customer Portal integration
- [x] Upgrade functionality
- [x] Tier indicator i header
- [x] Månadsvis/Årsvis val i signup och upgrade

## 🚀 Nästa steg för produktion

### 1. **Testa hela flödet i test-miljö**
- [ ] Skapa nytt lärarkonto med Premium (månadsvis)
- [ ] Skapa nytt lärarkonto med Pro (årsvis)
- [ ] Uppgradera från Premium till Pro
- [ ] Testa Customer Portal (uppdatera betalningsmetod, se fakturor)
- [ ] Testa webhook-hantering (avsluta prenumeration via Stripe Dashboard)

### 2. **Förbered för produktion**
- [ ] Skapa Stripe Production Account (om du inte redan har)
- [ ] Skapa produkter och priser i Production Dashboard
- [ ] Kopiera Production API keys (pk_live_... och sk_live_...)
- [ ] Konfigurera Production Webhook endpoint
- [ ] Uppdatera environment variables för produktion

### 3. **Säkerhet och konfiguration**
- [ ] Säkerställ att alla API keys är i `.env.local` (inte i git)
- [ ] Verifiera att `SUPABASE_SERVICE_ROLE_KEY` är korrekt
- [ ] Konfigurera Stripe Customer Portal i Production Dashboard
- [ ] Testa webhook signature verification i produktion

### 4. **Förbättringar (valfritt)**
- [x] Visa prenumerationsstatus (nästa faktureringsdatum, status) ✅
- [ ] Email-notifikationer vid subscription events
- [ ] Nedgraderingsfunktionalitet (Pro → Premium, Premium → Free)
- [ ] Fakturahistorik i account-sidan (om Customer Portal inte räcker)

## 📋 Viktiga filer att kontrollera

### Environment Variables (`.env.local`)
```
STRIPE_SECRET_KEY=sk_live_... (för produktion)
STRIPE_PUBLISHABLE_KEY=pk_live_... (för produktion)
STRIPE_WEBHOOK_SECRET=whsec_... (från Production webhook)
STRIPE_PRICE_PREMIUM_MONTHLY=price_...
STRIPE_PRICE_PREMIUM_YEARLY=price_...
STRIPE_PRICE_PRO_MONTHLY=price_...
STRIPE_PRICE_PRO_YEARLY=price_...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGci...
NEXT_PUBLIC_BASE_URL=https://din-domän.se
```

### Stripe Dashboard konfiguration
1. **Products & Prices**: Skapa produkter i Production Dashboard
2. **Webhooks**: Konfigurera webhook endpoint för produktion
3. **Customer Portal**: Aktivera och konfigurera i Settings > Billing

## 🎯 Rekommenderad ordning

1. **Testa allt i test-miljö först** ✅
2. **Förbättra UX** (lägg till prenumerationsstatus)
3. **Förbered produktion** (API keys, webhooks, etc.)
4. **Deploy och testa i produktion**

## 💡 Förslag på förbättringar

### Hög prioritet:
- Visa prenumerationsstatus (nästa faktureringsdatum, status)
- Bättre felhantering och användarvänliga meddelanden

### Medel prioritet:
- Email-notifikationer
- Nedgraderingsfunktionalitet

### Låg prioritet:
- Fakturahistorik (Customer Portal täcker detta)
- Betalningsmetodhantering (Customer Portal täcker detta)

