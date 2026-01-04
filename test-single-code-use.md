# Testa att samma kod inte kan användas flera gånger

## Skydd på två nivåer

Systemet har skydd på två nivåer för att förhindra att samma användare använder samma kod flera gånger:

### 1. Application-level check (API-kod)
API-koden kontrollerar INNAN den försöker skapa en ny användningspost:
```typescript
// Check if user has already used this code
const { data: existingUsage } = await supabaseAdmin
  .from('testpilot_code_usage')
  .select('id')
  .eq('code_id', codeData.id)
  .eq('user_id', user.id)
  .maybeSingle()

if (existingUsage) {
  return NextResponse.json({ error: 'Du har redan använt denna kod' }, { status: 400 })
}
```

### 2. Database-level constraint (UNIQUE)
Databasen har en UNIQUE constraint på `(code_id, user_id)` som förhindrar duplicerade poster även om application-level check skulle missas (t.ex. vid race conditions).

## Hur man testar

### Test 1: Verifiera att constraint finns
Kör `verify-code-single-use-constraint.sql` i Supabase SQL Editor för att:
- Kontrollera att UNIQUE constraint finns
- Verifiera att det inte finns några duplicerade poster
- Se alla användningsposter

**Förväntat resultat:**
- Constraint ska finnas: `UNIQUE(code_id, user_id)`
- Inga duplicerade poster ska finnas
- Varje (code, user) kombination ska bara finnas en gång

### Test 2: Testa i UI
1. Logga in som en lärare som redan har aktiverat en kod
2. Gå till `/teacher/account`
3. Försök aktivera samma kod igen
4. Du ska få felmeddelandet: "Du har redan använt denna kod"

**Förväntat resultat:**
- Felmeddelande visas
- Ingen ny användningspost skapas i databasen
- Subscription tier förblir oförändrad

### Test 3: Testa via API (för avancerade)
Du kan också testa direkt via API med curl eller Postman:

```bash
# Försök aktivera samma kod två gånger
# (Ersätt TOKEN med din auth token och CODE med en kod du redan använt)
curl -X POST https://your-domain.com/api/redeem-testpilot-code \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"code": "BETA2024"}'
```

**Första anropet:** Ska lyckas (om koden är giltig och inte redan använd)
**Andra anropet:** Ska returnera `400 Bad Request` med meddelandet "Du har redan använt denna kod"

### Test 4: Testa constraint direkt i SQL (valfritt)
Om du vill testa att constraint faktiskt fungerar på databas-nivå, kan du försöka skapa en duplicerad post:

```sql
-- Detta SKA misslyckas med UNIQUE constraint error
-- (Ersätt code_id och user_id med faktiska värden från din databas)
INSERT INTO testpilot_code_usage (code_id, user_id, used_at, expires_at)
SELECT 
  code_id,
  user_id,
  NOW(),
  NOW() + INTERVAL '1 month'
FROM testpilot_code_usage
LIMIT 1;
```

**Förväntat resultat:**
- Error: `duplicate key value violates unique constraint "testpilot_code_usage_code_id_user_id_key"`

## Checklista

- [ ] UNIQUE constraint finns i databasen
- [ ] Inga duplicerade poster i testpilot_code_usage
- [ ] API returnerar fel när samma användare försöker använda samma kod igen
- [ ] UI visar tydligt felmeddelande
- [ ] Databasen blockerar duplicerade poster även vid race conditions

## Ytterligare förbättringar

Om du vill ytterligare förbättra skyddet kan du:
1. Lägga till en index på (code_id, user_id) för bättre prestanda (redan gjort)
2. Lägga till loggning när försök att använda samma kod igen görs (för analytics)
3. Visa tydligt i UI vilka koder användaren redan använt



## Skydd på två nivåer

Systemet har skydd på två nivåer för att förhindra att samma användare använder samma kod flera gånger:

### 1. Application-level check (API-kod)
API-koden kontrollerar INNAN den försöker skapa en ny användningspost:
```typescript
// Check if user has already used this code
const { data: existingUsage } = await supabaseAdmin
  .from('testpilot_code_usage')
  .select('id')
  .eq('code_id', codeData.id)
  .eq('user_id', user.id)
  .maybeSingle()

if (existingUsage) {
  return NextResponse.json({ error: 'Du har redan använt denna kod' }, { status: 400 })
}
```

### 2. Database-level constraint (UNIQUE)
Databasen har en UNIQUE constraint på `(code_id, user_id)` som förhindrar duplicerade poster även om application-level check skulle missas (t.ex. vid race conditions).

## Hur man testar

### Test 1: Verifiera att constraint finns
Kör `verify-code-single-use-constraint.sql` i Supabase SQL Editor för att:
- Kontrollera att UNIQUE constraint finns
- Verifiera att det inte finns några duplicerade poster
- Se alla användningsposter

**Förväntat resultat:**
- Constraint ska finnas: `UNIQUE(code_id, user_id)`
- Inga duplicerade poster ska finnas
- Varje (code, user) kombination ska bara finnas en gång

### Test 2: Testa i UI
1. Logga in som en lärare som redan har aktiverat en kod
2. Gå till `/teacher/account`
3. Försök aktivera samma kod igen
4. Du ska få felmeddelandet: "Du har redan använt denna kod"

**Förväntat resultat:**
- Felmeddelande visas
- Ingen ny användningspost skapas i databasen
- Subscription tier förblir oförändrad

### Test 3: Testa via API (för avancerade)
Du kan också testa direkt via API med curl eller Postman:

```bash
# Försök aktivera samma kod två gånger
# (Ersätt TOKEN med din auth token och CODE med en kod du redan använt)
curl -X POST https://your-domain.com/api/redeem-testpilot-code \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"code": "BETA2024"}'
```

**Första anropet:** Ska lyckas (om koden är giltig och inte redan använd)
**Andra anropet:** Ska returnera `400 Bad Request` med meddelandet "Du har redan använt denna kod"

### Test 4: Testa constraint direkt i SQL (valfritt)
Om du vill testa att constraint faktiskt fungerar på databas-nivå, kan du försöka skapa en duplicerad post:

```sql
-- Detta SKA misslyckas med UNIQUE constraint error
-- (Ersätt code_id och user_id med faktiska värden från din databas)
INSERT INTO testpilot_code_usage (code_id, user_id, used_at, expires_at)
SELECT 
  code_id,
  user_id,
  NOW(),
  NOW() + INTERVAL '1 month'
FROM testpilot_code_usage
LIMIT 1;
```

**Förväntat resultat:**
- Error: `duplicate key value violates unique constraint "testpilot_code_usage_code_id_user_id_key"`

## Checklista

- [ ] UNIQUE constraint finns i databasen
- [ ] Inga duplicerade poster i testpilot_code_usage
- [ ] API returnerar fel när samma användare försöker använda samma kod igen
- [ ] UI visar tydligt felmeddelande
- [ ] Databasen blockerar duplicerade poster även vid race conditions

## Ytterligare förbättringar

Om du vill ytterligare förbättra skyddet kan du:
1. Lägga till en index på (code_id, user_id) för bättre prestanda (redan gjort)
2. Lägga till loggning när försök att använda samma kod igen görs (för analytics)
3. Visa tydligt i UI vilka koder användaren redan använt



