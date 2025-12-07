# Production Quick Reference

Snabb referens för Stripe-produktionskonfiguration.

## 🔑 Environment Variables Checklist

Kontrollera att dessa är satta i produktion (Vercel/Deployment):

```bash
# Stripe Production
STRIPE_SECRET_KEY=sk_live_...
STRIPE_PUBLISHABLE_KEY=pk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...

# Stripe Price IDs (Production)
STRIPE_PRICE_PREMIUM_MONTHLY=price_...
STRIPE_PRICE_PREMIUM_YEARLY=price_...
STRIPE_PRICE_PRO_MONTHLY=price_...
STRIPE_PRICE_PRO_YEARLY=price_...

# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://edbbestqdwldryxuxkma.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=sb_publishable_bx81qdFnpcX79ovYbCL98Q_eirRtByp
SUPABASE_SERVICE_ROLE_KEY=eyJhbGci...

# Base URL
NEXT_PUBLIC_BASE_URL=https://din-domän.se
```

## 📍 Var hittar jag detta i Stripe?

### API Keys
- **Stripe Dashboard** → **Developers** → **API keys**
- Kopiera `pk_live_...` (Publishable key)
- Kopiera `sk_live_...` (Secret key) - klicka "Reveal"

### Price IDs
- **Stripe Dashboard** → **Products**
- Klicka på varje produkt
- Under "Pricing", kopiera Price ID (börjar med `price_...`)

### Webhook Secret
- **Stripe Dashboard** → **Developers** → **Webhooks**
- Klicka på din webhook endpoint
- Under "Signing secret", klicka "Reveal"
- Kopiera värdet (börjar med `whsec_...`)

## 🧪 Testa innan produktion

1. **Testa med test-kort i Production mode:**
   - Kortnummer: `4242 4242 4242 4242`
   - Utgångsdatum: Valfritt framtida datum
   - CVC: Valfritt 3-siffrigt nummer
   - ZIP: Valfritt 5-siffrigt nummer

2. **Verifiera webhook:**
   - Gör en testbetalning
   - Kontrollera Stripe Dashboard → Webhooks
   - Verifiera att events skickas och får 200-svar

3. **Testa Customer Portal:**
   - Logga in med testkonto
   - Gå till Account-sidan
   - Klicka "Hantera prenumeration"
   - Verifiera att portalen öppnas

## ⚠️ Viktiga påminnelser

- ✅ Använd **Live mode** API keys i produktion
- ✅ Använd **Production** Price IDs
- ✅ Webhook URL måste vara HTTPS i produktion
- ✅ Testa allt innan du går live
- ❌ Använd ALDRIG test keys i produktion
- ❌ Committa ALDRIG API keys till git

## 🆘 Snabb felsökning

**Webhook fungerar inte?**
→ Kontrollera `STRIPE_WEBHOOK_SECRET` är korrekt

**Betalningar fungerar inte?**
→ Verifiera Price IDs är för produktion

**Customer Portal öppnas inte?**
→ Kontrollera att Customer Portal är aktiverad i Stripe Dashboard



