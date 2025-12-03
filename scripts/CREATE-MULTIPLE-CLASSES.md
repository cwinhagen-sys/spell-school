# 🚀 Skapa Flera Klasser Automatiskt - Guide

## Snabbstart

Detta script skapar automatiskt flera klasser med elever för stress-testing.

### Steg 0: Installera Dependencies (om inte redan gjort)

```bash
npm install @supabase/supabase-js
```

### Steg 1: Kör Scriptet

```bash
node scripts/create-multiple-classes.js \
  --classes=5 \
  --students-per-class=30 \
  --teacher-email=your-email@example.com \
  --teacher-password=your-password \
  --base-url=https://www.spellschool.se \
  --output=multi-class-credentials.json
```

**OBS:** Scriptet använder Supabase SDK direkt, så du behöver inte vara inloggad i webbläsaren.

### Steg 2: Vänta på att Scriptet Klarar

Scriptet kommer att:
1. Logga in som lärare
2. Skapa 5 klasser (eller så många du angav)
3. Skapa 30 elever per klass (eller så många du angav)
4. Spara credentials-filen för stress-testing

### Steg 3: Kör Stress-Test

När scriptet är klart, kör stress-testet:

```bash
node scripts/stress-test-multi-class.js \
  --classes=5 \
  --students-per-class=30 \
  --duration=120 \
  --base-url=https://www.spellschool.se \
  --credentials-file=multi-class-credentials.json
```

---

## Parametrar

### Obligatoriska Parametrar

- `--teacher-email`: Din lärare-email
- `--teacher-password`: Ditt lärare-lösenord

### Valfria Parametrar

- `--classes=5`: Antal klasser att skapa (standard: 5)
- `--students-per-class=30`: Antal elever per klass (standard: 30)
- `--base-url=https://www.spellschool.se`: Base URL (standard: https://www.spellschool.se)
- `--output=multi-class-credentials.json`: Output-fil (standard: multi-class-credentials.json)
- `--password=password123`: Lösenord för alla elever (standard: password123)
- `--prefix=teststudent`: Prefix för användarnamn (standard: teststudent)

---

## Exempel

### Exempel 1: Skapa 10 klasser med 30 elever vardera

```bash
node scripts/create-multiple-classes.js \
  --classes=10 \
  --students-per-class=30 \
  --teacher-email=teacher@example.com \
  --teacher-password=mypassword
```

Detta skapar:
- 10 klasser
- 300 elever totalt (30 per klass)
- Användarnamn: teststudent1, teststudent2, ..., teststudent300

### Exempel 2: Skapa 5 klasser med 50 elever vardera

```bash
node scripts/create-multiple-classes.js \
  --classes=5 \
  --students-per-class=50 \
  --teacher-email=teacher@example.com \
  --teacher-password=mypassword \
  --password=testpass123 \
  --prefix=student
```

Detta skapar:
- 5 klasser
- 250 elever totalt (50 per klass)
- Användarnamn: student1, student2, ..., student250
- Lösenord: testpass123

---

## Viktiga Noteringar

### Subscription Limits

- **Free Plan**: Max 30 elever totalt
- **Premium Plan**: Max 30 elever per klass
- **Pro Plan**: Obegränsat

Om du har Free eller Premium plan och försöker skapa för många elever kommer scriptet att ge fel.

### Rate Limiting

Scriptet skapar elever i batches av 10 för att undvika rate limiting. Det finns också små delays mellan batches och klasser.

### Felhantering

Om något går fel:
- Scriptet fortsätter med nästa klass
- Alla errors loggas
- En sammanfattning visas i slutet

---

## Output Format

Credentials-filen ser ut så här:

```json
[
  {
    "classId": "abc123-def456-ghi789",
    "className": "Stress Test Class 1",
    "students": [
      {
        "username": "teststudent1",
        "password": "password123"
      },
      {
        "username": "teststudent2",
        "password": "password123"
      }
    ]
  },
  {
    "classId": "xyz789-abc123-def456",
    "className": "Stress Test Class 2",
    "students": [
      {
        "username": "teststudent31",
        "password": "password123"
      }
    ]
  }
]
```

---

## Troubleshooting

### "Unauthorized" Error

- Kontrollera att teacher email och password är korrekt
- Kontrollera att kontot är en lärare (inte elev)

### "Subscription limit exceeded" Error

- Du har försökt skapa för många elever för din plan
- Uppgradera till Pro plan eller minska antalet elever

### "Class not found" Error

- Något gick fel vid skapande av klassen
- Scriptet fortsätter med nästa klass

### Timeout Errors

- Servern kan vara överbelastad
- Försök igen senare eller minska antalet klasser/elever

---

## Tips

1. **Börja smått**: Testa med 2-3 klasser först
2. **Öka gradvis**: Öka antalet klasser när du vet att det fungerar
3. **Övervaka**: Håll koll på Vercel Dashboard under skapandet
4. **Spara credentials**: Spara credentials-filen säkert för framtida tester

---

## Nästa Steg

När scriptet är klart:

1. ✅ Verifiera att alla klasser och elever skapades
2. ✅ Kör stress-testet med `stress-test-multi-class.js`
3. ✅ Övervaka prestanda i Vercel Dashboard
4. ✅ Identifiera flaskhalsar och optimera

