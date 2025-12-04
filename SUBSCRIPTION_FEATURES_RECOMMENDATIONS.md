# Rekommendationer för Subscription-funktioner

## ✅ Redan implementerat
- ✅ Uppgradering av tier (premium → pro)
- ✅ Tier-indikator i header
- ✅ Webhook-hantering för automatisk tier-uppdatering
- ✅ Success-meddelanden efter betalning

## 🎯 Rekommenderade funktioner

### 1. **Stripe Customer Portal** (HÖGST PRIORITET)
Stripe Customer Portal är en färdig lösning som ger användare:
- ✅ Se och uppdatera betalningsmetod
- ✅ Se fakturahistorik och ladda ner fakturor
- ✅ Avsluta prenumeration
- ✅ Se prenumerationsstatus och förnyelsedatum
- ✅ Ändra faktureringsperiod (månadsvis ↔ årsvis)

**Fördelar:**
- Stripe hanterar all säkerhet och PCI-compliance
- Ingen extra kod behövs (bara en länk)
- Automatisk översättning till svenska
- Uppdaterar automatiskt via webhooks

**Implementation:** Skapa en Customer Portal session och redirecta användaren

### 2. **Prenumerationsstatus i Account-sidan**
Visa:
- Nästa faktureringsdatum
- Prenumerationsstatus (aktiv, avbruten, etc.)
- Faktureringsperiod (månadsvis/årsvis)
- När prenumerationen skapades

### 3. **Nedgradering av tier**
- Pro → Premium
- Premium → Free
- Visa när nedgraderingen träder i kraft (vid nästa faktureringsperiod)

### 4. **Avsluta prenumeration**
- Direkt avslutning (tier → free omedelbart)
- Avslutning vid periodens slut (behåller access till periodens slut)
- Bekräftelsedialog med tydlig information

### 5. **Fakturahistorik**
- Lista över tidigare fakturor
- Ladda ner PDF-fakturor
- Se betalningsstatus

### 6. **Betalningsmetodhantering**
- Se nuvarande betalningsmetod (korttyp, sista 4 siffror)
- Uppdatera betalningsmetod (via Customer Portal)
- Ta bort betalningsmetod (via Customer Portal)

## 📋 Prioritering

### Fas 1: Grundläggande (Implementera nu)
1. **Stripe Customer Portal** - Ger allt ovan på en gång
2. **Prenumerationsstatus** - Visa nästa faktureringsdatum och status

### Fas 2: Förbättringar (Efter Fas 1)
3. **Nedgradering** - Pro → Premium, Premium → Free
4. **Avslutning** - Direkt eller vid periodens slut

### Fas 3: Nice-to-have
5. **Fakturahistorik** - Om Customer Portal inte räcker
6. **Betalningsmetodhantering** - Om Customer Portal inte räcker

## 💡 Rekommendation

**Använd Stripe Customer Portal för allt!**

Det är den enklaste och säkraste lösningen. Du behöver bara:
1. Skapa en Customer Portal session
2. Redirecta användaren till Stripe
3. Stripe hanterar resten (betalningsmetod, fakturor, avslutning, etc.)

**Vad behöver du implementera:**
- API route för att skapa Customer Portal session
- Knapp i account-sidan som öppnar Customer Portal
- Webhook-hantering för när användare gör ändringar (redan implementerat!)

## 🔒 Säkerhet

**Viktigt:** Betalkort och betalningsinformation lagras INTE hos dig - allt hanteras av Stripe. Du behöver bara:
- `stripe_customer_id` - För att identifiera användaren i Stripe
- `stripe_subscription_id` - För att identifiera prenumerationen
- `subscription_tier` - För att veta vilken tier användaren har

Stripe hanterar:
- ✅ Betalkortnummer
- ✅ CVV
- ✅ Fakturor
- ✅ Betalningshistorik
- ✅ PCI-compliance

## 📝 Exempel: Customer Portal Implementation

```typescript
// API route: /api/create-portal-session
const session = await stripe.billingPortal.sessions.create({
  customer: customerId,
  return_url: `${baseUrl}/teacher/account`,
})
// Redirect till session.url
```

Detta ger användare en komplett portal för att hantera sin prenumeration!

