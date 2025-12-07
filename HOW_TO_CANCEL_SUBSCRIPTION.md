# Hur man säger upp en prenumeration

## Via Spell School (Rekommenderat)

### Steg-för-steg:

1. **Logga in på Spell School**
   - Gå till `/teacher/account` (eller klicka på "Mitt konto" i menyn)

2. **Öppna Customer Portal**
   - Scrolla ner till "Aktuell plan"-kortet
   - Klicka på knappen **"Hantera prenumeration"**
   - Detta öppnar Stripe Customer Portal i en **ny flik** (så du kan enkelt gå tillbaka)

3. **Säg upp prenumerationen i Stripe Portal**
   - I Stripe Customer Portal, scrolla ner till "Prenumeration"
   - Klicka på **"Avsluta prenumeration"** eller **"Cancel subscription"**
   - Bekräfta uppsägningen

4. **Vad händer efter uppsägning?**
   - Du behåller tillgång till Premium/Pro-funktioner tills faktureringsperioden är slut
   - När perioden är slut, ändras din plan automatiskt till "Free"
   - Du kommer inte att faktureras igen

## Via Stripe Dashboard (Alternativ)

Om du har direkt åtkomst till Stripe Dashboard:

1. Logga in på [Stripe Dashboard](https://dashboard.stripe.com)
2. Gå till **Customers** → Hitta din kund
3. Klicka på prenumerationen
4. Klicka på **"Cancel subscription"**
5. Bekräfta uppsägningen

## Viktigt att veta

### Du behåller tillgång tills perioden är slut
- När du säger upp, avslutas prenumerationen **inte omedelbart**
- Du behåller alla Premium/Pro-funktioner tills den betalda perioden är slut
- Detta är standard Stripe-beteende och ger dig full valuta för din betalning

### Automatisk nedgradering
- När faktureringsperioden är slut, ändras din plan automatiskt till "Free"
- Detta sker automatiskt via webhook - ingen manuell åtgärd krävs
- Du kommer inte att faktureras igen

### Återaktivering
- Om du ångrar dig, kan du återaktivera prenumerationen i Customer Portal
- Du kan också uppgradera igen via Spell School account-sidan

## Felsökning

### Kan inte hitta "Hantera prenumeration"-knappen?
- Kontrollera att du är inloggad
- Kontrollera att du har en aktiv Premium eller Pro-prenumeration
- Om du har Free-plan, finns det ingen prenumeration att hantera

### Customer Portal öppnas inte?
- Kontrollera att du har en aktiv Stripe customer ID
- Kontrollera din internetanslutning
- Försök uppdatera sidan och försök igen

### Prenumerationen avslutas inte?
- Kontrollera att du faktiskt bekräftade uppsägningen i Stripe Portal
- Kontrollera Stripe Dashboard för att se subscription status
- Kontakta support om problemet kvarstår



