# Testa testpilot_code_usage systemet

## Steg 1: Verifiera databasen

Kör `verify-testpilot-code-usage.sql` i Supabase SQL Editor för att kontrollera att:
- Tabellen `testpilot_code_usage` finns och har rätt struktur
- Befintliga data har migrerats korrekt
- RLS policies är på plats

**Förväntat resultat:**
- Du ska se alla befintliga testpilot-kod användningar
- Varje användare ska ha sitt eget `expires_at` datum
- Om samma kod används av flera lärare, ska de ha olika `expires_at` datum

## Steg 2: Testa i UI:t

### Scenario 1: Verifiera befintlig användning (om du redan har aktiverat en kod)

1. Gå till `/teacher/account`
2. Leta efter sektionen om "Test Pilot" eller subscription information
3. Kontrollera att utgångsdatumet visas korrekt
4. Kontrollera att datumet stämmer (1 månad från när du aktiverade koden)

### Scenario 2: Testa med en ny kod (om du har en testkod tillgänglig)

**VIKTIGT:** Om du testar med en ny kod, se till att använda en annan lärare-konto eller en kod som har `max_uses > 1`.

1. Gå till `/teacher/account`
2. Använd testpilot-kod inmatningen för att aktivera en kod
3. Efter aktivering, kontrollera att:
   - Du har fått Pro-tier
   - Utgångsdatumet visas (ska vara 1 månad från nu)
   - Du kan se alla Pro-funktioner

### Scenario 3: Testa med samma kod av flera lärare (om möjligt)

1. Skapa eller använd en kod med `max_uses >= 2`
2. Aktivera koden med lärare 1
3. Kontrollera `expires_at` för lärare 1 (via SQL eller UI)
4. Aktivera samma kod med lärare 2
5. Kontrollera att lärare 2 har sitt eget `expires_at` (1 månad från aktiveringsdatum)
6. Verifiera via SQL att båda lärare har separata rader i `testpilot_code_usage`

## Steg 3: Verifiera via SQL

Efter att ha testat i UI:t, kör denna query för att se alla användningar:

```sql
SELECT 
  tc.code,
  p.email AS user_email,
  tcu.used_at,
  tcu.expires_at,
  EXTRACT(EPOCH FROM (tcu.expires_at - tcu.used_at)) / 86400 AS days_valid,
  CASE 
    WHEN tcu.expires_at > NOW() THEN 'Active'
    ELSE 'Expired'
  END AS status
FROM testpilot_code_usage tcu
JOIN testpilot_codes tc ON tc.id = tcu.code_id
LEFT JOIN profiles p ON p.id = tcu.user_id
ORDER BY tcu.used_at DESC;
```

**Förväntat resultat:**
- Varje lärare ska ha sin egen rad
- `days_valid` ska vara ca 30 dagar (1 månad)
- Om flera lärare använt samma kod, ska de ha olika `used_at` och `expires_at` datum

## Steg 4: Testa getTestPilotInfo funktionen

Du kan testa detta genom att:

1. Öppna browser console på `/teacher/account`
2. Kör denna kod (ersätt USER_ID med ditt user ID):

```javascript
fetch('/api/redeem-testpilot-code', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${await supabase.auth.getSession().then(s => s.data.session?.access_token)}`
  },
  body: JSON.stringify({ code: 'TESTCODE' })
}).then(r => r.json()).then(console.log)
```

Eller enklare: Kolla i Network-tabben när du laddar `/teacher/account` och se vilka API-calls som görs.

## Steg 5: Kontrollera nedgradering (för framtida test)

Systemet ska automatiskt nedgradera lärare när deras `expires_at` passerar. Detta hanteras av:
- `getUserSubscriptionTier()` - kontrollerar vid varje anrop
- Cron jobbet (`/api/cron/cleanup`) - körs dagligen kl 02:00

För att testa nedgradering kan du:
1. Manuellt ändra `expires_at` till en tidigare datum i SQL:
   ```sql
   UPDATE testpilot_code_usage 
   SET expires_at = NOW() - INTERVAL '1 day'
   WHERE user_id = 'YOUR_USER_ID';
   ```
2. Ladda om `/teacher/account` - tier ska ha ändrats till 'free'
3. Eller vänta tills cron jobbet körs (nästa dag kl 02:00)

## Checklista

- [ ] Tabellen `testpilot_code_usage` finns i databasen
- [ ] Befintliga data har migrerats korrekt
- [ ] Nya kodaktiveringar skapar rader i `testpilot_code_usage`
- [ ] Varje lärare har sitt eget `expires_at` datum
- [ ] UI:n visar korrekt utgångsdatum
- [ ] Flera lärare kan använda samma kod med separata utgångsdatum
- [ ] `getTestPilotInfo` returnerar korrekt information

## Vanliga problem och lösningar

**Problem:** "Ingen data syns i testpilot_code_usage"
- **Lösning:** Kör migration-delen av SQL-filen igen, eller kontrollera att du har aktiverat en kod tidigare

**Problem:** "Expires_at är fel (t.ex. 1 år istället för 1 månad)"
- **Lösning:** Detta borde vara fixat med den nya koden, men om du ser gamla data kan du köra `fix-testpilot-expiration-dates.sql` för att fixa befintliga rader

**Problem:** "Flera lärare ser samma expires_at"
- **Lösning:** Kontrollera att den nya koden används. Om du ser detta betyder det att gamla data fortfarande används från `testpilot_codes` tabellen. Den nya koden läser från `testpilot_code_usage` där varje lärare har sin egen rad.



## Steg 1: Verifiera databasen

Kör `verify-testpilot-code-usage.sql` i Supabase SQL Editor för att kontrollera att:
- Tabellen `testpilot_code_usage` finns och har rätt struktur
- Befintliga data har migrerats korrekt
- RLS policies är på plats

**Förväntat resultat:**
- Du ska se alla befintliga testpilot-kod användningar
- Varje användare ska ha sitt eget `expires_at` datum
- Om samma kod används av flera lärare, ska de ha olika `expires_at` datum

## Steg 2: Testa i UI:t

### Scenario 1: Verifiera befintlig användning (om du redan har aktiverat en kod)

1. Gå till `/teacher/account`
2. Leta efter sektionen om "Test Pilot" eller subscription information
3. Kontrollera att utgångsdatumet visas korrekt
4. Kontrollera att datumet stämmer (1 månad från när du aktiverade koden)

### Scenario 2: Testa med en ny kod (om du har en testkod tillgänglig)

**VIKTIGT:** Om du testar med en ny kod, se till att använda en annan lärare-konto eller en kod som har `max_uses > 1`.

1. Gå till `/teacher/account`
2. Använd testpilot-kod inmatningen för att aktivera en kod
3. Efter aktivering, kontrollera att:
   - Du har fått Pro-tier
   - Utgångsdatumet visas (ska vara 1 månad från nu)
   - Du kan se alla Pro-funktioner

### Scenario 3: Testa med samma kod av flera lärare (om möjligt)

1. Skapa eller använd en kod med `max_uses >= 2`
2. Aktivera koden med lärare 1
3. Kontrollera `expires_at` för lärare 1 (via SQL eller UI)
4. Aktivera samma kod med lärare 2
5. Kontrollera att lärare 2 har sitt eget `expires_at` (1 månad från aktiveringsdatum)
6. Verifiera via SQL att båda lärare har separata rader i `testpilot_code_usage`

## Steg 3: Verifiera via SQL

Efter att ha testat i UI:t, kör denna query för att se alla användningar:

```sql
SELECT 
  tc.code,
  p.email AS user_email,
  tcu.used_at,
  tcu.expires_at,
  EXTRACT(EPOCH FROM (tcu.expires_at - tcu.used_at)) / 86400 AS days_valid,
  CASE 
    WHEN tcu.expires_at > NOW() THEN 'Active'
    ELSE 'Expired'
  END AS status
FROM testpilot_code_usage tcu
JOIN testpilot_codes tc ON tc.id = tcu.code_id
LEFT JOIN profiles p ON p.id = tcu.user_id
ORDER BY tcu.used_at DESC;
```

**Förväntat resultat:**
- Varje lärare ska ha sin egen rad
- `days_valid` ska vara ca 30 dagar (1 månad)
- Om flera lärare använt samma kod, ska de ha olika `used_at` och `expires_at` datum

## Steg 4: Testa getTestPilotInfo funktionen

Du kan testa detta genom att:

1. Öppna browser console på `/teacher/account`
2. Kör denna kod (ersätt USER_ID med ditt user ID):

```javascript
fetch('/api/redeem-testpilot-code', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${await supabase.auth.getSession().then(s => s.data.session?.access_token)}`
  },
  body: JSON.stringify({ code: 'TESTCODE' })
}).then(r => r.json()).then(console.log)
```

Eller enklare: Kolla i Network-tabben när du laddar `/teacher/account` och se vilka API-calls som görs.

## Steg 5: Kontrollera nedgradering (för framtida test)

Systemet ska automatiskt nedgradera lärare när deras `expires_at` passerar. Detta hanteras av:
- `getUserSubscriptionTier()` - kontrollerar vid varje anrop
- Cron jobbet (`/api/cron/cleanup`) - körs dagligen kl 02:00

För att testa nedgradering kan du:
1. Manuellt ändra `expires_at` till en tidigare datum i SQL:
   ```sql
   UPDATE testpilot_code_usage 
   SET expires_at = NOW() - INTERVAL '1 day'
   WHERE user_id = 'YOUR_USER_ID';
   ```
2. Ladda om `/teacher/account` - tier ska ha ändrats till 'free'
3. Eller vänta tills cron jobbet körs (nästa dag kl 02:00)

## Checklista

- [ ] Tabellen `testpilot_code_usage` finns i databasen
- [ ] Befintliga data har migrerats korrekt
- [ ] Nya kodaktiveringar skapar rader i `testpilot_code_usage`
- [ ] Varje lärare har sitt eget `expires_at` datum
- [ ] UI:n visar korrekt utgångsdatum
- [ ] Flera lärare kan använda samma kod med separata utgångsdatum
- [ ] `getTestPilotInfo` returnerar korrekt information

## Vanliga problem och lösningar

**Problem:** "Ingen data syns i testpilot_code_usage"
- **Lösning:** Kör migration-delen av SQL-filen igen, eller kontrollera att du har aktiverat en kod tidigare

**Problem:** "Expires_at är fel (t.ex. 1 år istället för 1 månad)"
- **Lösning:** Detta borde vara fixat med den nya koden, men om du ser gamla data kan du köra `fix-testpilot-expiration-dates.sql` för att fixa befintliga rader

**Problem:** "Flera lärare ser samma expires_at"
- **Lösning:** Kontrollera att den nya koden används. Om du ser detta betyder det att gamla data fortfarande används från `testpilot_codes` tabellen. Den nya koden läser från `testpilot_code_usage` där varje lärare har sin egen rad.




