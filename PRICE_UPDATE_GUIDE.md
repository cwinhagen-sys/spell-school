# Price Update Guide - Spell School

## Nya priser (2025)

- **Premium månadsvis**: 29 SEK (tidigare 79 SEK)
- **Premium årligen**: 299 SEK (tidigare 758 SEK)
- **Pro månadsvis**: 49 SEK (tidigare 129 SEK)
- **Pro årligen**: 499 SEK (tidigare 1238 SEK)

## Vad som behöver uppdateras

### 1. Stripe Dashboard (MÅSTE göras manuellt)

**VIKTIGT:** Du kan INTE redigera befintliga priser i Stripe om de redan använts i transaktioner. Du måste skapa **nya Price-objekt**.

#### Premium Plan
1. Gå till Stripe Dashboard → Products
2. Hitta "Premium" produkten (eller skapa en ny om den inte finns)
3. Klicka på produkten för att öppna den
4. Klicka på "Add another price" eller "+ Add price"
5. Skapa två nya priser:
   - **Monthly**: 
     - Amount: 29 SEK
     - Billing period: Monthly (Recurring)
     - Klicka "Add price"
   - **Yearly**:
     - Amount: 299 SEK
     - Billing period: Yearly (Recurring)
     - Klicka "Add price"
6. Kopiera de nya Price IDs (börjar med `price_`) - de visas i listan över priser

#### Pro Plan
1. Hitta "Pro" produkten (eller skapa en ny om den inte finns)
2. Klicka på produkten för att öppna den
3. Klicka på "Add another price" eller "+ Add price"
4. Skapa två nya priser:
   - **Monthly**:
     - Amount: 49 SEK
     - Billing period: Monthly (Recurring)
     - Klicka "Add price"
   - **Yearly**:
     - Amount: 499 SEK
     - Billing period: Yearly (Recurring)
     - Klicka "Add price"
5. Kopiera de nya Price IDs (börjar med `price_`)

#### Uppdatera miljövariabler
Uppdatera följande miljövariabler med de nya Price IDs:

```env
STRIPE_PRICE_PREMIUM_MONTHLY=price_NYTT_ID_HÄR
STRIPE_PRICE_PREMIUM_YEARLY=price_NYTT_ID_HÄR
STRIPE_PRICE_PRO_MONTHLY=price_NYTT_ID_HÄR
STRIPE_PRICE_PRO_YEARLY=price_NYTT_ID_HÄR
```

⚠️ **VIKTIGT**: 
- **Gamla Price IDs kan INTE redigeras** - du måste skapa nya Price-objekt
- **Gamla subscriptions** kommer fortsätta med gamla priserna tills de uppgraderas/ändras eller går ut
- **Nya subscriptions** kommer använda nya priserna automatiskt (efter att du uppdaterat miljövariablerna)
- För att migrera befintliga kunder till nya priser behöver du använda Stripe's subscription update API eller Dashboard
- Du kan behålla gamla priserna aktiva eller arkivera dem - det påverkar inte befintliga subscriptions

### 2. Kod-uppdateringar (Redan gjorda)

Följande filer har uppdaterats med nya priser:
- ✅ `src/lib/subscription.ts` - `getTierPrice()` funktionen
- ✅ `src/components/SpellSchoolSignup.tsx` - tiers array
- ✅ `src/app/pricing/page.tsx` - tiers array
- ✅ `src/components/PaymentWallModal.tsx` - price display

### 3. Testning

Efter uppdatering:
1. Testa att nya priser visas korrekt på pricing-sidan
2. Testa att checkout-session skapas med rätt Price ID
3. Verifiera att Stripe webhooks fungerar korrekt
4. Testa både månadsvis och årlig fakturering

### 4. Migration av befintliga kunder (Valfritt)

Om du vill migrera befintliga kunder till nya priser:

1. Använd Stripe Dashboard → Customers
2. Välj kunder med gamla priser
3. Använd "Update subscription" för att ändra till nya Price IDs
4. Stripe hanterar proration automatiskt

Alternativt kan du skapa ett script som migrerar alla subscriptions via Stripe API.

