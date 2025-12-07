# 🚀 Köra Stress-Test - Snabbguide

## Steg 1: Skapa credentials-fil

Du har redan skapat 30 elever. Nu behöver du skapa en fil med deras inloggningsuppgifter.

### Hitta ditt Class ID

1. Gå till https://www.spellschool.se/teacher/classes
2. Öppna den klass där dina 30 elever finns
3. Kolla URL:en - den ser ut så här:
   ```
   /teacher/classes/abc123-def456-ghi789
   ```
4. Det sista delen (`abc123-def456-ghi789`) är ditt **class ID**

### Generera credentials-fil

Kör detta kommando (ersätt med dina värden):

```bash
node scripts/generate-credentials.js \
  --prefix=teststudent \
  --count=30 \
  --password=ditt-lösenord \
  --class-id=ditt-class-id-här
```

**Exempel:**
```bash
node scripts/generate-credentials.js \
  --prefix=teststudent \
  --count=30 \
  --password=password123 \
  --class-id=abc123-def456-ghi789
```

Detta skapar en fil `test-credentials.json` med alla inloggningsuppgifter.

---

## Steg 2: Kör stress-testet

### Grundläggande test (rekommenderat att börja med)

```bash
node scripts/stress-test-auth-customizable.js \
  --students=10 \
  --duration=60 \
  --base-url=https://www.spellschool.se \
  --credentials-file=test-credentials.json
```

Detta testar med:
- **10 elever** (börja smått!)
- **60 sekunder** längd
- **Leaderboard requests** var 10:e sekund
- **Dashboard requests** var 30:e sekund

### Fullt test med alla 30 elever

När grundtestet fungerar, kör med alla elever:

```bash
node scripts/stress-test-auth-customizable.js \
  --students=30 \
  --duration=120 \
  --base-url=https://www.spellschool.se \
  --credentials-file=test-credentials.json
```

---

## Steg 3: Anpassa testet (valfritt)

Om du vill ändra hur ofta eleverna gör requests, redigera `scripts/stress-test-auth-customizable.js`:

```javascript
const CONFIG = {
  // Var 5:e sekund (mer aggressivt)
  LEADERBOARD_INTERVAL: 5000,
  
  // Var 15:e sekund (mer aggressivt)
  DASHBOARD_INTERVAL: 15000,
  
  // Stäng av activity tracking
  ACTIVITY_TRACKING_INTERVAL: null,
  
  // Aktivera spelresultat-simulering
  SIMULATE_GAME_RESULTS: true,
  GAME_RESULTS_INTERVAL: 30000,
}
```

---

## Steg 4: Övervaka resultatet

### Under testet

- **Vercel Dashboard**: Kolla på Function invocations och response times
- **Supabase Dashboard**: Kolla på Database queries och response times
- **Terminal**: Se live-statistik från testet

### Efter testet

Testet visar:
- Totala antalet requests
- Success rate (%)
- Genomsnittlig response time
- Min/Max response times
- Requests per sekund
- Requests per endpoint

---

## Vanliga problem

### "Login failed" för alla elever

**Lösning:**
- Kontrollera att användarnamn och lösenord stämmer
- Kontrollera att eleverna faktiskt finns i databasen
- Testa att logga in manuellt med ett konto

### "Class ID not found"

**Lösning:**
- Kontrollera att classId i credentials-filen stämmer
- Kontrollera att eleverna faktiskt är kopplade till den klassen

### Timeout errors

**Lösning:**
- Servern är överbelastad
- Minska antalet elever eller öka interval mellan requests
- Kolla Vercel/Supabase dashboards för bottlenecks

---

## Tips

1. **Börja smått**: Testa med 5-10 elever först
2. **Öka gradvis**: Öka antalet elever stegvis
3. **Övervaka**: Håll koll på Vercel och Supabase dashboards
4. **Dokumentera**: Skriv ner resultaten så du kan jämföra

---

## Exempel på output

```
🚀 Spell School Customizable Stress Test
==================================================
Students: 10
Duration: 60s
Base URL: https://www.spellschool.se

📋 Test Configuration:
  Leaderboard requests: every 10s
  Dashboard requests: every 30s
  Activity tracking: every 60s
  Game results: disabled
==================================================

Logging in 10 students...
✓ Student 1 logged in
✓ Student 2 logged in
...

📊 Test Results
==================================================
Total Duration: 60.00s
Total Requests: 120
Successful: 118
Failed: 2
Success Rate: 98.33%

Response Times:
  Average: 234.56ms
  Min: 45ms
  Max: 1234ms
  Requests/sec: 2.00
```

---

## Nästa steg

När testet är klart:
1. Analysera resultaten
2. Identifiera bottlenecks (långsamma endpoints)
3. Optimera de långsamma delarna
4. Kör testet igen för att verifiera förbättringar




