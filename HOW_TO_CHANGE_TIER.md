# Hur man ändrar prenumerationsplan (Tier)

## Översikt

Du kan ändra din prenumerationsplan när som helst. Det finns två sätt att göra detta:

1. **Via Spell School** (Rekommenderat) - Enkel och direkt
2. **Via Stripe Customer Portal** - Mer avancerade alternativ

## Via Spell School

### Uppgradering (Free → Premium → Pro)

1. Gå till `/teacher/account` (Mitt konto)
2. Scrolla ner till "Aktuell plan"-kortet
3. Klicka på knappen **"Uppgradera till Premium"** eller **"Uppgradera till Pro"**
4. Välj faktureringsperiod (Månadsvis eller Årsvis)
5. Bekräfta uppgraderingen
6. Om du inte har en aktiv prenumeration, omdirigeras du till Stripe Checkout för betalning
7. Om du redan har en prenumeration, uppdateras den automatiskt med proration

### Nedgradering (Pro → Premium)

1. Gå till `/teacher/account` (Mitt konto)
2. Scrolla ner till "Aktuell plan"-kortet
3. Klicka på knappen **"Nedgradera till Premium"** (blå knapp)
4. Välj faktureringsperiod (Månadsvis eller Årsvis)
5. Bekräfta nedgraderingen
6. Din prenumeration uppdateras automatiskt
7. Du får kredit för återstående tid som används mot nästa faktura

## Via Stripe Customer Portal

1. Gå till `/teacher/account` (Mitt konto)
2. Klicka på **"Hantera prenumeration"** (öppnas i ny flik)
3. I Stripe Customer Portal, scrolla ner till "Prenumeration"
4. Klicka på **"Ändra plan"** eller **"Change plan"**
5. Välj ny plan och bekräfta

## Proration (Automatisk prisskillnad)

### Vad är proration?

När du ändrar plan mitt i en faktureringsperiod, beräknar Stripe automatiskt:
- **Uppgradering**: Du betalar skillnaden för återstående tid omedelbart
- **Nedgradering**: Du får kredit för återstående tid som används mot nästa faktura

### Exempel

**Scenario**: Du har Pro (129 SEK/månad) och vill nedgradera till Premium (79 SEK/månad) halvvägs genom månaden.

- Du har betalat för 15 dagar av Pro (64.50 SEK)
- Premium för 15 dagar kostar 39.50 SEK
- Du får kredit: 64.50 - 39.50 = 25 SEK
- Denna kredit används mot din nästa faktura

## Viktigt att veta

### Du behåller tillgång tills ändringen träder i kraft
- Ändringar träder i kraft omedelbart
- Du behåller alla funktioner från din nya plan direkt

### Faktureringsperiod
- Du kan välja mellan månadsvis eller årsvis fakturering
- Om du ändrar faktureringsperiod (t.ex. månadsvis → årsvis), skapas en ny faktureringsperiod

### Begränsningar vid nedgradering
- Om du har fler klasser/elever/ordlistor än din nya plan tillåter, behåller du dem
- Du kan inte skapa nya klasser/elever/ordlistor tills du är under gränsen
- Överväg att ta bort eller arkivera innehåll innan nedgradering

## Felsökning

### Knappen visas inte?
- Kontrollera att du är inloggad
- Kontrollera att du har en aktiv Premium eller Pro-prenumeration
- Free-användare kan bara uppgradera, inte nedgradera

### Ändringen fungerar inte?
- Kontrollera att du har en aktiv Stripe customer ID
- Kontrollera din internetanslutning
- Försök uppdatera sidan och försök igen
- Kontrollera server logs för felmeddelanden

### Kredit visas inte?
- Krediter visas på din nästa Stripe-faktura
- Kontrollera Stripe Customer Portal för fakturahistorik
- Kontakta support om problemet kvarstår

## Vanliga frågor

**Q: Kan jag gå direkt från Free till Pro?**
A: Ja! Du kan uppgradera till vilken plan som helst direkt.

**Q: Kan jag gå tillbaka till Free?**
A: Ja, men du måste säga upp din prenumeration via Customer Portal. Free är inte en betald plan.

**Q: Vad händer med mina data vid nedgradering?**
A: Alla dina data behålls. Du kan bara inte skapa nya klasser/elever/ordlistor om du överskrider gränserna.

**Q: Kan jag ändra faktureringsperiod?**
A: Ja, när du ändrar plan kan du välja mellan månadsvis och årsvis fakturering.

