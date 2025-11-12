# Badge Persistence Fix - Snabbstart

## Problem som upptäcktes
Databasen har fel kolumnnamn: `earned_at` istället för `unlocked_at`

## Snabbfix (5 minuter)

### Steg 1: Fixa databas-schema
1. Öppna din Supabase dashboard
2. Gå till SQL Editor
3. Kör denna SQL-fil: `check-user-badges-schema.sql`
4. Kontrollera att du ser meddelandet: "Renamed earned_at to unlocked_at" eller "Added unlocked_at column"

### Steg 2: Testa att det fungerar
1. Starta servern [[memory:8774975]]:
   ```bash
   npm run dev
   ```

2. Öppna test-sidan:
   ```
   http://localhost:3000/test-badge-persistence
   ```

3. Klicka på **"🚀 Run All Tests"**

4. Du ska nu se:
   ```
   ✅ All tests complete
   ```
   Istället för tidigare fel:
   ```
   ❌ Database error: column user_badges.earned_at does not exist
   ```

### Steg 3: Verifiera med en riktig badge
1. Gå till student dashboard: `http://localhost:3000/student`
2. Spela 3 spel för att slutföra "Word Warrior" quest
3. Du ska se en badge-animation ✨
4. Gå tillbaka till `/test-badge-persistence`
5. Klicka på **"📊 Check State"**
6. Verifiera att badgen finns i både localStorage OCH database

## Vad har fixats?

### 1. Database Schema
- ✅ Kolumnen heter nu `unlocked_at` (konsekvent genom hela systemet)
- ✅ Alla SQL queries använder rätt kolumnnamn
- ✅ Alla TypeScript-filer uppdaterade

### 2. Kod-ändringar
- ✅ `src/hooks/useDailyQuestBadges.ts` - Alla queries uppdaterade
- ✅ `src/app/test-badge-persistence/page.tsx` - Test-sidan uppdaterad
- ✅ Förbättrad error handling med retry
- ✅ Automatisk synkronisering vid sidladdning
- ✅ "Never lose badges" skydd

### 3. Nya filer
- ✅ `check-user-badges-schema.sql` - Fixar schema automatiskt
- ✅ `BADGE_PERSISTENCE_FIX.md` - Teknisk dokumentation
- ✅ `BADGE_TEST_INSTRUKTIONER.md` - Test-instruktioner
- ✅ `BADGE_FIX_SNABBSTART.md` - Denna fil

## Förväntat Resultat

### Efter att ha kört SQL-filen:
```sql
column_name    | data_type                   | is_nullable | column_default
---------------+-----------------------------+-------------+---------------------------
id             | uuid                        | NO          | gen_random_uuid()
user_id        | uuid                        | NO          | 
badge_id       | uuid                        | NO          | 
unlocked_at    | timestamp with time zone    | YES         | now()
created_at     | timestamp with time zone    | YES         | now()
```

### I test-sidan:
```
09:18:30: 🚀 Running all badge persistence tests...
09:18:30: === TEST 1: Current Badge State ===
09:18:30: 📦 localStorage: X badges
09:18:30: 🗄️ Database: X badges
09:18:30: ✅ Count matches: X badges in both
09:18:30: ⚛️ React state: X badges
09:18:31: === TEST 4: Cross-Day Persistence Check ===
09:18:31: 🛡️ Found X backup(s)
09:18:31: 📊 Total badges in database: X
09:18:31: ✅ All tests complete
```

## Felsökning

### Om du fortfarande ser "earned_at does not exist":
1. Kontrollera att du körde rätt SQL-fil i rätt Supabase-projekt
2. Refresha browsern (Ctrl+F5 eller Cmd+Shift+R)
3. Kör SQL-filen igen
4. Kontrollera console logs för andra fel

### Om badges försvinner fortfarande:
1. Gå till `/test-badge-persistence`
2. Kör **"Force Sync"**
3. Kolla console logs för ❌ fel
4. Kontrollera att du är inloggad som elev (inte lärare)

### Om test-sidan inte laddar:
1. Kontrollera att servern körs på port 3000
2. Kontrollera att du är inloggad
3. Öppna browser console (F12) och leta efter fel

## Nästa Steg

Nu när schema är fixat:
1. ✅ Testa att tjäna in badges
2. ✅ Verifiera att de finns kvar nästa dag
3. ✅ Övervaka console logs för fel
4. ✅ Rapportera om något fortfarande inte fungerar

## Kontakt
Om problem kvarstår efter dessa steg, samla:
- Console logs (särskilt med ❌)
- Screenshot från test-sidan
- Resultat från SQL-filen
- Din användar-ID från test-sidan

---

**Status:** Schema-problem fixat ✅  
**Senast uppdaterad:** 2025-10-08  
**Version:** 1.1


