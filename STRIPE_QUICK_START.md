# Stripe Quick Start Guide - Steg för Steg

## ✅ Checklista

### Steg 1: Skapa Produkter i Stripe Dashboard
- [ ] Gå till **Products** i vänstermenyn
- [ ] Klicka **Add product**
- [ ] Skapa **Premium Plan**:
  - Name: `Premium Plan`
  - Description: `Premium subscription for Spell School`
  - Price: `79 SEK` månadsvis (recurring)
  - Lägg till årligt pris: `758 SEK` (recurring, yearly)
- [ ] Skapa **Pro Plan**:
  - Name: `Pro Plan`
  - Description: `Pro subscription for Spell School`
  - Price: `129 SEK` månadsvis (recurring)
  - Lägg till årligt pris: `1238 SEK` (recurring, yearly)
- [ ] **Kopiera alla 4 Price IDs** (börjar med `price_...`)

### Steg 2: Hämta API-nycklar
- [ ] Gå till **Developers** > **API keys**
- [ ] Kopiera **Publishable key** (`pk_test_...`)
- [ ] Klicka **Reveal test key** och kopiera **Secret key** (`sk_test_...`)

### Steg 3: Sätt upp Webhook (Lokal Utveckling)
- [ ] Installera Stripe CLI (se `STRIPE_WEBHOOK_SETUP.md`)
- [ ] Kör `stripe login` i terminal
- [ ] Kör `stripe listen --forward-to localhost:3000/api/webhooks/stripe`
- [ ] Kopiera webhook secret (`whsec_...`)

### Steg 4: Konfigurera Environment Variables
- [ ] Skapa/uppdatera `.env.local` med alla nycklar och Price IDs
- [ ] Se `.env.local.example` för format

### Steg 5: Uppdatera Databasen
- [ ] Gå till Supabase Dashboard > SQL Editor
- [ ] Kör SQL-filen: `add-stripe-customer-id-column.sql`

### Steg 6: Testa
- [ ] Starta Next.js server: `npm run dev`
- [ ] Gå till `/signup/teacher`
- [ ] Välj Premium eller Pro tier
- [ ] Använd test-kort: `4242 4242 4242 4242`
- [ ] Verifiera att betalning går igenom
- [ ] Kontrollera att tier uppdateras i databasen

## 📝 Detaljerade Instruktioner

### Skapa Premium Produkt:
1. **Products** > **Add product**
2. Fyll i:
   - **Name:** `Premium Plan`
   - **Description:** `Premium subscription for Spell School`
3. Under **Pricing**:
   - **Price:** `79`
   - **Currency:** `SEK`
   - **Billing period:** `Monthly` (recurring)
4. Klicka **Save product**
5. På produktsidan, klicka **Add another price**:
   - **Price:** `758`
   - **Currency:** `SEK`
   - **Billing period:** `Yearly` (recurring)
6. Klicka **Save price**
7. **Kopiera båda Price IDs** (börjar med `price_...`)

### Skapa Pro Produkt:
Upprepa samma steg men med:
- **Name:** `Pro Plan`
- **Description:** `Pro subscription for Spell School`
- Månadsvis: `129 SEK`
- Årlig: `1238 SEK`

### Hitta Price IDs:
1. Gå till **Products**
2. Klicka på en produkt
3. Under **Pricing**, hitta **Price ID** (liten text som börjar med `price_...`)
4. Klicka på kopieringsikonen bredvid Price ID

### Test-kort för Stripe:
- **Kortnummer:** `4242 4242 4242 4242`
- **Utgångsdatum:** Valfritt framtida datum (t.ex. `12/34`)
- **CVC:** Valfritt 3-siffrigt nummer (t.ex. `123`)
- **ZIP:** Valfritt (t.ex. `12345`)

## 🚨 Vanliga Problem

### "Price ID not configured"
- Kontrollera att alla Price IDs är korrekt kopierade i `.env.local`
- Verifiera att Price IDs börjar med `price_...`

### "Webhook signature verification failed"
- Kontrollera att `STRIPE_WEBHOOK_SECRET` är korrekt i `.env.local`
- För lokal utveckling, använd secret från `stripe listen`
- För produktion, använd secret från Stripe Dashboard > Webhooks

### "Unauthorized" vid checkout
- Kontrollera att användaren är inloggad
- Verifiera att Bearer token skickas korrekt i API-anropet

## 📚 Ytterligare Resurser

- [Stripe Test Cards](https://stripe.com/docs/testing)
- [Stripe Webhooks Guide](https://stripe.com/docs/webhooks)
- [Stripe CLI Documentation](https://stripe.com/docs/stripe-cli)

