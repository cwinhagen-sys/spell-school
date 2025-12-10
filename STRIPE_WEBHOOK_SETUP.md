# Stripe Webhook Setup - Lokal Utveckling

## Steg 1: Installera Stripe CLI

### Windows:
1. Ladda ner från: https://github.com/stripe/stripe-cli/releases
2. Välj den senaste `stripe_X.X.X_windows_x86_64.zip`
3. Extrahera och lägg `stripe.exe` i en mapp som är i din PATH, eller använd full path

### Alternativt med Scoop (om du har det):
```powershell
scoop install stripe
```

## Steg 2: Logga in i Stripe CLI

```bash
stripe login
```

Detta öppnar en webbläsare där du loggar in med ditt Stripe-konto.

## Steg 3: Forwarda webhooks till lokal server

I en separat terminal (medan din Next.js server körs på port 3000):

```bash
stripe listen --forward-to localhost:3000/api/webhooks/stripe
```

Detta kommer:
- Visa en webhook signing secret (börjar med `whsec_...`)
- Forwarda alla Stripe events till din lokala server
- Visa alla events i realtid

## Steg 4: Kopiera Webhook Secret

När du kör `stripe listen`, kommer du se något liknande:

```
> Ready! Your webhook signing secret is whsec_xxxxxxxxxxxxx
```

Kopiera denna secret och lägg till i din `.env.local`:

```env
STRIPE_WEBHOOK_SECRET=whsec_xxxxxxxxxxxxx
```

## Steg 5: Testa Webhook

1. Gör en test-betalning i din app
2. Du kommer se webhook events i terminalen där `stripe listen` körs
3. Kontrollera att din webhook handler får events korrekt

## Viktigt

- **Kör `stripe listen` varje gång du utvecklar** - Den måste köras parallellt med din Next.js server
- **Använd test mode** - Alla webhooks i test mode går till din lokala server
- **För produktion** - Du behöver konfigurera webhook endpoint i Stripe Dashboard istället






