# Stripe Webhook Quick Start

## Steg 1: Ladda ner Stripe CLI

1. Gå till: https://github.com/stripe/stripe-cli/releases/latest
2. Ladda ner: `stripe_X.X.X_windows_x86_64.zip`
3. Extrahera ZIP-filen
4. Notera var `stripe.exe` finns (t.ex. `C:\stripe-cli\stripe.exe`)

## Steg 2: Logga in

Öppna en terminal och kör (ersätt sökvägen med din):
```powershell
C:\stripe-cli\stripe.exe login
```

Detta öppnar en webbläsare - logga in med ditt Stripe-konto.

## Steg 3: Starta Next.js server

I en terminal, kör:
```powershell
npm run dev
```

Låt denna köra.

## Steg 4: Starta webhook forwarding

Öppna en NY terminal (låt npm run dev köra i den första) och kör:
```powershell
C:\stripe-cli\stripe.exe listen --forward-to localhost:3000/api/webhooks/stripe
```

Du kommer se:
```
> Ready! Your webhook signing secret is whsec_xxxxxxxxxxxxx
```

## Steg 5: Kopiera webhook secret

Kopiera `whsec_xxxxxxxxxxxxx` och lägg till i din `.env` fil:
```env
STRIPE_WEBHOOK_SECRET=whsec_xxxxxxxxxxxxx
```

## Steg 6: Starta om Next.js server

Stoppa `npm run dev` (Ctrl+C) och starta om:
```powershell
npm run dev
```

Nu är webhook konfigurerad! 🎉

## Testa

1. Gå till `/signup/teacher`
2. Välj Premium eller Pro
3. Använd test-kort: `4242 4242 4242 4242`
4. Efter betalning ska webhook automatiskt uppdatera `subscription_tier` i databasen

## Tips

- Låt både `npm run dev` OCH `stripe listen` köra parallellt
- Du kommer se webhook events i terminalen där `stripe listen` körs
- Om något inte fungerar, kontrollera att båda terminalerna kör



