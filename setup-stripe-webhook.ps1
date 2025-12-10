# Stripe Webhook Setup Script
# Kör detta efter att du har installerat Stripe CLI

Write-Host "=== Stripe Webhook Setup ===" -ForegroundColor Cyan
Write-Host ""
Write-Host "Steg 1: Logga in i Stripe CLI" -ForegroundColor Yellow
Write-Host "Kör: stripe login" -ForegroundColor White
Write-Host "Detta öppnar en webbläsare där du loggar in med ditt Stripe-konto."
Write-Host ""
Write-Host "Steg 2: Starta webhook forwarding" -ForegroundColor Yellow
Write-Host "Kör: stripe listen --forward-to localhost:3000/api/webhooks/stripe" -ForegroundColor White
Write-Host "Detta kommer:"
Write-Host "  - Visa en webhook signing secret (börjar med whsec_...)"
Write-Host "  - Forwarda alla Stripe events till din lokala server"
Write-Host "  - Visa alla events i realtid"
Write-Host ""
Write-Host "Steg 3: Kopiera Webhook Secret" -ForegroundColor Yellow
Write-Host "När du kör 'stripe listen', kommer du se:" -ForegroundColor White
Write-Host "  > Ready! Your webhook signing secret is whsec_xxxxxxxxxxxxx" -ForegroundColor Green
Write-Host "Kopiera denna secret och lägg till i din .env fil:" -ForegroundColor White
Write-Host "  STRIPE_WEBHOOK_SECRET=whsec_xxxxxxxxxxxxx" -ForegroundColor Green
Write-Host ""
Write-Host "VIKTIGT:" -ForegroundColor Red
Write-Host "- Kör 'stripe listen' i en SEPARAT terminal" -ForegroundColor Yellow
Write-Host "- Den måste köras parallellt med din Next.js server (npm run dev)" -ForegroundColor Yellow
Write-Host "- Låt den köra medan du utvecklar" -ForegroundColor Yellow
Write-Host ""






