# Stress Test Scripts

Detta dokument beskriver hur man använder stress-test scripten för att simulera många samtidiga användare och testa prestanda.

## Scripts

### 1. `stress-test.js` - Basic Stress Test

Simulerar många användare utan autentisering. Användbart för att testa grundläggande load.

**Användning:**
```bash
node scripts/stress-test.js --students=30 --duration=60 --base-url=https://www.spellschool.se
```

**Options:**
- `--students=N` - Antal elever att simulera (default: 30)
- `--duration=N` - Varaktighet i sekunder (default: 60)
- `--base-url=URL` - Base URL för applikationen (default: http://localhost:3000)
- `--class-id=ID` - Class ID för leaderboard-tester

### 2. `stress-test-auth.js` - Authenticated Stress Test

Simulerar autentiserade elever med riktiga API-anrop. Kräver test-konton.

**Förberedelser:**

1. Skapa test-elever i en test-klass
2. Skapa en credentials-fil (`test-credentials.json`):
```json
[
  {
    "username": "teststudent1",
    "password": "password123",
    "classId": "your-class-id-here"
  },
  {
    "username": "teststudent2",
    "password": "password123",
    "classId": "your-class-id-here"
  }
]
```

**Användning:**
```bash
# Med credentials-fil
node scripts/stress-test-auth.js --students=30 --duration=60 --base-url=https://www.spellschool.se --credentials-file=test-credentials.json

# Med environment variable
TEST_STUDENT_CREDENTIALS='[{"username":"test1","password":"pass1","classId":"class-id"}]' node scripts/stress-test-auth.js --students=30
```

## Exempel: Testa med 30 elever i 2 minuter

```bash
node scripts/stress-test-auth.js \
  --students=30 \
  --duration=120 \
  --base-url=https://www.spellschool.se \
  --credentials-file=test-credentials.json
```

## Vad scripten testar

### Simulerad aktivitet per elev:
- **Leaderboard requests**: Var 10:e sekund
- **Dashboard access**: Var 30:e sekund  
- **Activity tracking**: Var 60:e sekund (debounced)
- **Sync flushes**: Var 10:e sekund

### Med 30 elever:
- ~3 leaderboard requests/sekund
- ~1 dashboard request/sekund
- ~0.5 activity updates/sekund
- ~3 sync flushes/sekund
- **Totalt: ~7-8 requests/sekund**

## Tolka resultat

### Bra prestanda:
- ✅ Average response time < 500ms
- ✅ Success rate > 95%
- ✅ Inga timeout errors
- ✅ Requests/sekund hanteras smidigt

### Varningstecken:
- ⚠️ Average response time > 1000ms
- ⚠️ Success rate < 90%
- ⚠️ Många timeout errors
- ⚠️ Auth failures

### Exempel på output:
```
📊 Test Results
==================================================
Total Duration: 60.00s
Total Requests: 450
Successful: 445
Failed: 5
Success Rate: 98.89%

Response Times:
  Average: 234.56ms
  Min: 45ms
  Max: 1234ms
  Requests/sec: 7.50

Requests by Endpoint:
  /api/student/leaderboards:
    Requests: 180
    Avg Time: 156.78ms
    Errors: 2
```

## Tips

1. **Börja små**: Testa med 5-10 elever först
2. **Öka gradvis**: Öka antalet elever stegvis för att hitta gränsen
3. **Övervaka databasen**: Kolla Supabase dashboard för connection pool usage
4. **Testa på staging**: Använd staging-miljö först, inte produktion
5. **Jämför före/efter**: Kör samma test före och efter optimeringar

## Felsökning

### "Request timeout"
- Databasen är överbelastad
- Nätverksproblem
- För många samtidiga requests

### "Auth failures"
- Test-konton är inte korrekt konfigurerade
- Session tokens har gått ut
- RLS policies blockerar requests

### "High response times"
- Databas-queries är långsamma (kolla indexes)
- Caching fungerar inte
- För många realtime subscriptions




