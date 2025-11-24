# SQL Setup Guide för Session Mode

## Steg-för-steg guide

Kör dessa SQL-filer i Supabase SQL Editor i denna ordning:

### 1. Huvudfilen (kör först)
**`session-mode-setup.sql`**
- Skapar alla grundläggande tabeller (`sessions`, `session_participants`, `session_progress`)
- Inkluderar redan `quiz_enabled` och `quiz_grading_type` kolumner
- Skapar RLS policies och funktioner
- **Kör denna först om du inte redan har kört den**

### 2. Quiz-kolumner (om du redan har sessions-tabellen)
**`add-quiz-columns.sql`**
- Lägger till `quiz_enabled` och `quiz_grading_type` kolumner
- **Kör denna FÖRE session-quiz-setup.sql om du redan har sessions-tabellen**

### 3. Quiz-funktionalitet
**`session-quiz-setup.sql`**
- Skapar `session_quiz_responses` tabellen
- Skapar RLS policies för quiz
- **Kör denna efter add-quiz-columns.sql (eller efter session-mode-setup.sql om den inkluderar quiz-kolumnerna)**

### 4. Quiz policy (om du fick fel om quiz_grading_type)
**`session-quiz-policy.sql`**
- Skapar policy för manuell rättning
- **Kör denna efter add-quiz-columns.sql om du fick fel**

### 3. Migrations (om du redan har kört huvudfilen tidigare)

Om du redan har kört `session-mode-setup.sql` INNAN vi lade till quiz-kolumnerna, kör dessa:

**`add-quiz-columns.sql`**
- Lägger till `quiz_enabled` och `quiz_grading_type` kolumner i `sessions` tabellen
- **Kör endast om du redan har en `sessions` tabell utan dessa kolumner**

**`add-selected-blocks-column.sql`**
- Lägger till `selected_blocks` kolumn i `session_participants`
- **Kör endast om du redan har en `session_participants` tabell utan denna kolumn**

**`add-progress-timestamps.sql`**
- Lägger till `created_at` och `updated_at` i `session_progress`
- **Kör endast om du redan har en `session_progress` tabell utan dessa kolumner**

### 5. Cleanup-funktion
**`session-cleanup-function.sql`**
- Skapar funktionen för att automatiskt radera utgångna sessioner
- **Kör denna sist**

## Snabbguide för ny installation

Om du startar från början, kör bara dessa 3 filer i ordning:

1. ✅ `session-mode-setup.sql` (inkluderar redan quiz-kolumner)
2. ✅ `session-quiz-setup.sql`
3. ✅ `session-cleanup-function.sql`

## Om du redan har sessions-tabellen

Om du redan har kört `session-mode-setup.sql` INNAN vi lade till quiz-kolumnerna:

1. ✅ `add-quiz-columns.sql` (lägg till quiz-kolumner)
2. ✅ `session-quiz-setup.sql` (skapa quiz-tabellen)
3. ✅ `session-quiz-policy.sql` (om du fick fel om quiz_grading_type)
4. ✅ `session-cleanup-function.sql`

## Kontrollera om tabeller redan finns

Om du är osäker på vad som redan finns, kör detta i Supabase SQL Editor för att kontrollera:

```sql
-- Kontrollera om sessions tabellen har quiz-kolumner
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'sessions' 
AND column_name IN ('quiz_enabled', 'quiz_grading_type');

-- Kontrollera om session_participants har selected_blocks
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'session_participants' 
AND column_name = 'selected_blocks';

-- Kontrollera om session_progress har timestamps
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'session_progress' 
AND column_name IN ('created_at', 'updated_at');

-- Kontrollera om session_quiz_responses tabellen finns
SELECT table_name 
FROM information_schema.tables 
WHERE table_name = 'session_quiz_responses';
```

Om någon av dessa queries returnerar inga rader, betyder det att du behöver köra motsvarande migration-fil.

