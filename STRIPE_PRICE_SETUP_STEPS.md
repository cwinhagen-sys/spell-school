# Steg-för-steg: Skapa nya priser i Stripe

## Varfor nya priser?

Stripe tillåter inte att ändra pris på befintliga Price-objekt som redan använts i transaktioner. Därför måste vi skapa nya Price-objekt.

## Steg 1: Logga in på Stripe Dashboard

1. Gå till https://dashboard.stripe.com
2. Logga in med ditt konto
3. Välj rätt miljö (Test mode eller Live mode)

## Steg 2: Skapa nya priser för Premium

1. Gå till **Products** i vänstermenyn
2. Hitta produkten "Premium" (eller skapa en ny om den inte finns)
3. Klicka på produkten för att öppna den
4. Scrolla ner till **Pricing**-sektionen
5. Klicka på **"+ Add price"** eller **"Add another price"**
6. För månadspriset:
   - **Price description**: "Premium Monthly" (valfritt)
   - **Pricing model**: Standard pricing
   - **Price**: 29.00
   - **Currency**: SEK (Swedish Krona)
   - **Billing period**: Monthly
   - Klicka **"Add price"**
7. För årspriset:
   - Klicka på **"+ Add price"** igen
   - **Price description**: "Premium Yearly" (valfritt)
   - **Pricing model**: Standard pricing
   - **Price**: 299.00
   - **Currency**: SEK (Swedish Krona)
   - **Billing period**: Yearly
   - Klicka **"Add price"**
8. **Kopiera Price IDs** - de börjar med `price_` och visas i listan
   - Exempel: `price_1ABC123DEF456` (Monthly)
   - Exempel: `price_1XYZ789GHI012` (Yearly)

## Steg 3: Skapa nya priser för Pro

1. Gå tillbaka till **Products**
2. Hitta produkten "Pro" (eller skapa en ny om den inte finns)
3. Klicka på produkten för att öppna den
4. Scrolla ner till **Pricing**-sektionen
5. Klicka på **"+ Add price"**
6. För månadspriset:
   - **Price description**: "Pro Monthly" (valfritt)
   - **Pricing model**: Standard pricing
   - **Price**: 49.00
   - **Currency**: SEK (Swedish Krona)
   - **Billing period**: Monthly
   - Klicka **"Add price"**
7. För årspriset:
   - Klicka på **"+ Add price"** igen
   - **Price description**: "Pro Yearly" (valfritt)
   - **Pricing model**: Standard pricing
   - **Price**: 499.00
   - **Currency**: SEK (Swedish Krona)
   - **Billing period**: Yearly
   - Klicka **"Add price"**
8. **Kopiera Price IDs** - de börjar med `price_`
   - Exempel: `price_1DEF456JKL345` (Monthly)
   - Exempel: `price_1MNO678PQR567` (Yearly)

## Steg 4: Uppdatera miljövariabler i Vercel

### Detaljerade instruktioner för Vercel:

1. **Gå till Vercel Dashboard**
   - Öppna https://vercel.com/dashboard
   - Logga in med ditt konto

2. **Hitta ditt projekt**
   - Klicka på projektet "spell-school" (eller vad ditt projekt heter)

3. **Gå till Settings**
   - Klicka på fliken **"Settings"** i projektets meny

4. **Öppna Environment Variables**
   - Klicka på **"Environment Variables"** i vänstermenyn under Settings

5. **Uppdatera varje variabel:**
   
   Du ska uppdatera följande 4 variabler med de nya Price IDs du kopierade från Stripe:
   
   - **`STRIPE_PRICE_PREMIUM_MONTHLY`**
     - Hitta raden med denna variabel
     - Klicka på den för att redigera (eller klicka på "Edit")
     - Ersätt värdet med det nya Monthly Price ID för Premium (börjar med `price_`)
     - Klicka "Save"
   
   - **`STRIPE_PRICE_PREMIUM_YEARLY`**
     - Hitta raden med denna variabel
     - Klicka för att redigera
     - Ersätt värdet med det nya Yearly Price ID för Premium
     - Klicka "Save"
   
   - **`STRIPE_PRICE_PRO_MONTHLY`**
     - Hitta raden med denna variabel
     - Klicka för att redigera
     - Ersätt värdet med det nya Monthly Price ID för Pro
     - Klicka "Save"
   
   - **`STRIPE_PRICE_PRO_YEARLY`**
     - Hitta raden med denna variabel
     - Klicka för att redigera
     - Ersätt värdet med det nya Yearly Price ID för Pro
     - Klicka "Save"

6. **Redploy din app:**
   - Efter att du uppdaterat alla variabler, gå till **"Deployments"**-fliken
   - Hitta den senaste deployment
   - Klicka på de tre punkterna (...) och välj **"Redeploy"**
   - ELLER gör en liten ändring i koden och pusha till GitHub (om du har auto-deploy aktiverat)

### Om du inte använder Vercel:

**Om du använder annan hosting-plattform:**
- Kolla din hosting-plattforms dokumentation för hur man uppdaterar miljövariabler
- Det brukar finnas under "Settings" → "Environment Variables" eller liknande

**Om du kör lokalt:**
- Uppdatera `.env.local`-filen i projektets rotmapp
- Format: `STRIPE_PRICE_PREMIUM_MONTHLY=price_ditt_nya_id`
- Starta om utvecklingsservern (`npm run dev`)

## Steg 5: Verifiera

1. Testa att skapa en ny checkout session
2. Verifiera att rätt pris visas
3. Kontrollera serverlogs för att se att rätt Price ID används

## Vad händer med gamla priser?

- **Gamla Price IDs** kan arkiveras eller lämnas aktiva (påverkar inte nya subscriptions)
- **Befintliga subscriptions** fortsätter använda gamla priser tills de uppgraderas/ändras eller går ut
- **Nya subscriptions** kommer använda nya priser automatiskt

## Tips

- Du kan ge de nya priserna beskrivande namn i Stripe för att hålla koll
- Behåll gamla priserna synliga så länge du har aktiva subscriptions med dem
- Dokumentera när du skapade nya priser för framtida referens

