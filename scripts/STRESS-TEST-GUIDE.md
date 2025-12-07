# 📚 Stress-Test Guide - Pedagogisk Förklaring

## Vad gör testet egentligen?

Stress-testet simulerar **många elever som använder Spell School samtidigt**. Det gör detta genom att:

### 1. **Logga in elever** (en gång per elev)
- Varje elev loggar in med sitt användarnamn och lösenord
- Får en autentiseringstoken (som en "nyckel" för att komma åt sidan)

### 2. **Hämta leaderboard** (upprepas regelbundet)
- Varje elev hämtar klassens leaderboard
- Detta är en av de tyngsta operationerna eftersom den räknar ut poäng för alla elever

### 3. **Ladda dashboard** (upprepas regelbundet)
- Simulerar att en elev öppnar eller uppdaterar sin dashboard

### 4. **Activity tracking** (valfritt)
- Simulerar att systemet uppdaterar när eleven är aktiv

---

## Vad testet INTE gör

❌ **Spelar inte faktiska spel** - Det skulle kräva mycket mer komplex kod  
❌ **Simulerar inte klick eller scroll** - Fokuserar på server-belastning  
❌ **Skickar inte faktiska spelresultat** - Bara om du aktiverar det manuellt  

**Varför?** Testet fokuserar på de **API-anrop som påverkar servern mest**, inte på UI-interaktioner.

---

## Hur fungerar det tekniskt?

### Steg 1: Testet startar
```
Du kör: node scripts/stress-test-auth.js --students=30 --duration=60
```

### Steg 2: Testet loggar in alla elever
```
Elev 1: Loggar in... ✓
Elev 2: Loggar in... ✓
Elev 3: Loggar in... ✓
...
```

### Steg 3: Testet simulerar aktivitet
```
Varje elev gör detta i bakgrunden:
├─ Var 10:e sekund: Hämta leaderboard
├─ Var 30:e sekund: Ladda dashboard
└─ Var 60:e sekund: Uppdatera activity status
```

### Steg 4: Testet samlar statistik
```
- Hur många requests gjordes?
- Hur lång tid tog varje request?
- Hur många misslyckades?
- Vilka endpoints var långsammast?
```

### Steg 5: Testet visar resultat
```
📊 Test Results
Total Requests: 450
Successful: 445
Failed: 5
Average Response Time: 234ms
```

---

## Hur modifierar man testet?

### Metod 1: Använd den modifierbara versionen

Jag har skapat `stress-test-auth-customizable.js` där du enkelt kan ändra beteendet.

**Öppna filen och ändra dessa värden:**

```javascript
const CONFIG = {
  // Hur ofta elever hämtar leaderboard
  LEADERBOARD_INTERVAL: 10000,  // 10000 = var 10:e sekund
  
  // Hur ofta elever laddar dashboard
  DASHBOARD_INTERVAL: 30000,    // 30000 = var 30:e sekund
  
  // Hur ofta elever uppdaterar activity
  ACTIVITY_TRACKING_INTERVAL: 60000,  // 60000 = var 60:e sekund
  
  // Simulera spelresultat?
  SIMULATE_GAME_RESULTS: false,  // true för att aktivera
  
  // Hur ofta elever skickar spelresultat
  GAME_RESULTS_INTERVAL: 60000,
}
```

**Exempel på ändringar:**

```javascript
// Mer aggressivt test (mer belastning)
LEADERBOARD_INTERVAL: 5000,  // Var 5:e sekund istället för 10

// Mindre aggressivt test (mindre belastning)
LEADERBOARD_INTERVAL: 20000,  // Var 20:e sekund

// Stäng av activity tracking
ACTIVITY_TRACKING_INTERVAL: null,

// Aktivera simulering av spelresultat
SIMULATE_GAME_RESULTS: true,
```

### Metod 2: Lägg till nya typer av requests

I funktionen `simulateAuthenticatedStudent`, lägg till nya intervals:

```javascript
// Exempel: Simulera att elever hämtar badges var 2:e minut
const badgesInterval = setInterval(async () => {
  try {
    stats.totalRequests++
    studentStats.requests++
    await makeRequest(`${options.baseUrl}/api/badges`, {
      method: 'GET',
      headers
    })
  } catch (error) {
    studentStats.errors++
  }
}, 120000) // 120000 = 2 minuter

setTimeout(() => {
  clearInterval(badgesInterval)
}, options.duration * 1000)
```

---

## Exempel på olika test-scenarier

### Scenario 1: "Normal användning"
```javascript
LEADERBOARD_INTERVAL: 10000,    // Var 10:e sekund
DASHBOARD_INTERVAL: 30000,      // Var 30:e sekund
ACTIVITY_TRACKING_INTERVAL: 60000,  // Var 60:e sekund
SIMULATE_GAME_RESULTS: false,
```
**Användning:** Simulerar normal användning där elever kollar leaderboard ibland.

### Scenario 2: "Intensiv användning"
```javascript
LEADERBOARD_INTERVAL: 5000,     // Var 5:e sekund (mer ofta!)
DASHBOARD_INTERVAL: 15000,      // Var 15:e sekund
ACTIVITY_TRACKING_INTERVAL: 30000,  // Var 30:e sekund
SIMULATE_GAME_RESULTS: true,
GAME_RESULTS_INTERVAL: 30000,
```
**Användning:** Simulerar när elever är mycket aktiva och spelar mycket.

### Scenario 3: "Lugn användning"
```javascript
LEADERBOARD_INTERVAL: 30000,    // Var 30:e sekund
DASHBOARD_INTERVAL: 60000,      // Var 60:e sekund
ACTIVITY_TRACKING_INTERVAL: 120000,  // Var 2:e minut
SIMULATE_GAME_RESULTS: false,
```
**Användning:** Simulerar när elever bara är inne och kollar lite.

---

## Vanliga frågor

### Q: Blir resultatet samma lokalt som online?
**A:** Nej! Lokalt testar du din dator, online testar du faktisk server. Online ger mer realistiska resultat.

### Q: Kan jag simulera att elever spelar spel?
**A:** Ja, men det kräver mer kod. Du kan aktivera `SIMULATE_GAME_RESULTS: true` för att skicka fake spelresultat.

### Q: Hur vet jag om testet är för aggressivt?
**A:** Om servern börjar ge timeout-fel eller svarstider över 2 sekunder, är testet för aggressivt.

### Q: Kan jag testa specifika endpoints?
**A:** Ja! Lägg till nya `setInterval`-block i `simulateAuthenticatedStudent` för att testa specifika API:er.

---

## Tips för att få bra resultat

1. **Börja smått** - Testa med 5-10 elever först
2. **Öka gradvis** - Öka antalet elever stegvis
3. **Övervaka** - Håll koll på Vercel och Supabase dashboards
4. **Testa olika scenarier** - Testa både normal och intensiv användning
5. **Dokumentera** - Skriv ner resultaten så du kan jämföra

---

## Exempel på körning

```bash
# Testa med modifierbar version
node scripts/stress-test-auth-customizable.js \
  --students=10 \
  --duration=60 \
  --base-url=https://www.spellschool.se \
  --credentials-file=test-credentials.json
```

**Output:**
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

## Sammanfattning

- **Testet simulerar** många elever som gör API-anrop
- **Det är modifierbart** genom att ändra CONFIG-värden
- **Det testar inte** faktiska spel, bara server-belastning
- **Börja smått** och öka gradvis
- **Övervaka** servern under testerna




