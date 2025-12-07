# Testpilot-koder - Guide

## Översikt

Testpilot-koder låter dig ge Pro-planen till specifika lärare utan att de behöver betala. Detta är perfekt för:
- Beta-testare
- Early adopters
- Partners
- Testanvändare

## För lärare: Hur man använder en kod

1. Gå till `/teacher/account` (Mitt konto)
2. Scrolla ner till "Aktuell plan"-kortet
3. Klicka på **"Har du en testpilot-kod?"** (under "Uppgradera plan"-knappen)
4. Ange din kod (t.ex. `BETA2024`)
5. Klicka på **"Aktivera Pro"**
6. Pro-planen aktiveras omedelbart!

## För administratörer: Skapa testpilot-koder

### Steg 1: Skapa databastabellen

Kör SQL-scriptet i Supabase SQL Editor:
```sql
-- Se create-testpilot-codes-table.sql
```

### Steg 2: Skapa en kod

I Supabase SQL Editor, kör:

```sql
INSERT INTO public.testpilot_codes (
  code,
  max_uses,
  expires_at,
  notes
) VALUES (
  'BETA2024',           -- Koden (använd versaler)
  10,                   -- Max antal användningar
  NOW() + INTERVAL '90 days',  -- Utgångsdatum (valfritt, NULL = ingen utgång)
  'Beta tester kod för 2024'  -- Anteckningar
);
```

### Steg 3: Exempel-koder

```sql
-- En kod som kan användas 1 gång
INSERT INTO public.testpilot_codes (code, max_uses, notes)
VALUES ('BETA2024', 1, 'Engångskod för beta tester');

-- En kod som kan användas 10 gånger och gäller i 90 dagar
INSERT INTO public.testpilot_codes (code, max_uses, expires_at, notes)
VALUES ('EARLY2024', 10, NOW() + INTERVAL '90 days', 'Early adopter kod');

-- En kod utan utgångsdatum
INSERT INTO public.testpilot_codes (code, max_uses, notes)
VALUES ('PARTNER2024', 50, 'Partner kod');
```

## Hantera koder

### Se alla koder

```sql
SELECT 
  code,
  current_uses,
  max_uses,
  used_by,
  used_at,
  expires_at,
  is_active,
  notes
FROM public.testpilot_codes
ORDER BY created_at DESC;
```

### Se använda koder

```sql
SELECT 
  code,
  used_by,
  used_at,
  notes
FROM public.testpilot_codes
WHERE used_by IS NOT NULL
ORDER BY used_at DESC;
```

### Inaktivera en kod

```sql
UPDATE public.testpilot_codes
SET is_active = false
WHERE code = 'BETA2024';
```

### Ta bort en kod

```sql
DELETE FROM public.testpilot_codes
WHERE code = 'BETA2024';
```

### Återställa en kod (tillåt återanvändning)

```sql
UPDATE public.testpilot_codes
SET 
  used_by = NULL,
  used_at = NULL,
  current_uses = 0
WHERE code = 'BETA2024';
```

## Säkerhet

### RLS (Row Level Security)

- **Läsning**: Alla kan läsa aktiva koder (för validering)
- **Skrivning**: Endast service role kan skapa/uppdatera/radera koder
- Detta säkerställer att koder inte kan manipuleras av användare

### Best Practices

1. **Använd starka koder**: Använd kombinationer av bokstäver och siffror
2. **Sätt utgångsdatum**: Förhindra att gamla koder används
3. **Begränsa användningar**: Sätt `max_uses` för att kontrollera spridning
4. **Dokumentera**: Använd `notes` för att spåra vem/vad koden är för
5. **Inaktivera gamla koder**: Sätt `is_active = false` när koden inte längre behövs

## Validering

Koden valideras för:
- ✅ Existerar i databasen
- ✅ Är aktiv (`is_active = true`)
- ✅ Har inte gått ut (`expires_at` är i framtiden eller NULL)
- ✅ Har inte nått max antal användningar
- ✅ Användaren har inte redan använt koden
- ✅ Användaren har inte redan Pro-planen

## Teknisk information

### API Endpoint

`POST /api/redeem-testpilot-code`

**Request:**
```json
{
  "code": "BETA2024"
}
```

**Response (Success):**
```json
{
  "success": true,
  "message": "Pro-planen har aktiverats!",
  "tier": "pro"
}
```

**Response (Error):**
```json
{
  "error": "Ogiltig kod"
}
```

### Databasschema

```sql
CREATE TABLE testpilot_codes (
  id UUID PRIMARY KEY,
  code TEXT UNIQUE NOT NULL,
  used_by UUID REFERENCES auth.users(id),
  used_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  expires_at TIMESTAMP,
  is_active BOOLEAN DEFAULT true,
  max_uses INTEGER DEFAULT 1,
  current_uses INTEGER DEFAULT 0,
  created_by UUID REFERENCES auth.users(id),
  notes TEXT
);
```

## Vanliga frågor

**Q: Kan en kod användas flera gånger?**
A: Ja, om `max_uses > 1`. Men varje användare kan bara använda samma kod en gång.

**Q: Vad händer om koden går ut?**
A: Koden kan inte längre användas, men befintliga Pro-användare behåller sin plan.

**Q: Kan jag se vem som använt en kod?**
A: Ja, `used_by` kolumnen visar användarens ID och `used_at` visar när.

**Q: Kan en användare använda flera koder?**
A: Nej, om användaren redan har Pro-planen kan de inte använda fler koder.

**Q: Vad händer om en användare säger upp sin Pro-prenumeration?**
A: De kan använda en ny testpilot-kod för att aktivera Pro igen.

## Exempel: Skapa flera koder för olika grupper

```sql
-- Beta testers
INSERT INTO public.testpilot_codes (code, max_uses, expires_at, notes)
VALUES ('BETA2024', 20, NOW() + INTERVAL '60 days', 'Beta tester grupp');

-- Early adopters
INSERT INTO public.testpilot_codes (code, max_uses, expires_at, notes)
VALUES ('EARLY2024', 50, NOW() + INTERVAL '90 days', 'Early adopter program');

-- Partners
INSERT INTO public.testpilot_codes (code, max_uses, notes)
VALUES ('PARTNER2024', 100, 'Partner program - ingen utgång');
```



