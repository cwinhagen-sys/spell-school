# Badge Persistence Test - Instruktioner

## Problem som åtgärdats
Daily quest badges sparades inte permanent och försvann när nya daily quests laddades. Nu är detta fixat med flera skyddslager.

## Vad har ändrats?

### 1. Förbättrad Databas-Synkronisering
- ✅ Bättre error handling när badges sparas till databasen
- ✅ Automatisk retry om sparning misslyckas
- ✅ Tydligare logging av fel i konsolen

### 2. Automatisk Återställning
- ✅ Varje gång sidan laddas kontrolleras om badges saknas i databasen
- ✅ Saknade badges synkroniseras automatiskt från localStorage

### 3. "Never Lose Badges" Skydd
- ✅ Badges mergas mellan localStorage och databas (försvinner aldrig)
- ✅ Om badge finns lokalt men inte i databasen, behålls den och synkas senare

### 4. Test-Sida
- ✅ Ny sida för att testa och diagnostisera badge-problem: `/test-badge-persistence`

## Hur du testar

### Snabbt Test (5 minuter)
1. Starta servern på port 3000:
   ```
   npm run dev
   ```

2. Logga in som en elevkonto

3. Gå till test-sidan:
   ```
   http://localhost:3000/test-badge-persistence
   ```

4. Klicka på **"🚀 Run All Tests"**

5. Se resultat i loggen - leta efter:
   - ✅ Gröna checkmarks = Allt fungerar
   - ⚠️ Varningar = Synkronisering behövs (görs automatiskt)
   - ❌ Röda kryss = Problem som behöver åtgärdas

### Fullständigt Test (Över 2 dagar)

#### Dag 1:
1. Logga in som elev
2. Slutför en daily quest (t.ex. "Word Warrior" - spela 3 spel)
3. När du får en badge, gå till `/test-badge-persistence`
4. Klicka på **"📊 Check State"**
5. Verifiera att badgen finns i både **localStorage** och **Database**
6. Anteckna antalet badges (t.ex. "1 badge")

#### Dag 2 (Nästa dag efter kl. 06:00):
1. Logga in igen
2. **Nya daily quests kommer att laddas automatiskt**
3. Gå direkt till `/test-badge-persistence`
4. Klicka på **"📊 Check State"**
5. **✅ Verifiera:** Gårdagens badge ska fortfarande finnas!
6. Slutför en ny daily quest och tjäna in en ny badge
7. Klicka på **"📅 Check History"** för att se badges per dag

### Test-Knappar Förklaring

| Knapp | Vad den gör |
|-------|-------------|
| 🚀 Run All Tests | Kör alla tester automatiskt |
| 📊 Check State | Visar badges i localStorage vs database |
| 🎖️ Award Test Badge | Ger dig "Word Warrior" badge för test |
| 💾 Test Persistence | Rensar cache och laddar från database |
| 📅 Check History | Visar badges per datum |
| 🔧 Force Sync | Tvingar synkronisering localStorage → database |
| 🗑️ Clear Test Badge | Tar bort test-badge (så du kan testa igen) |
| 🧹 Clear Logs | Rensar logg-fönstret |

## Vad ska du se i konsolen?

### Bra signaler (allt fungerar):
```
✅ 🎖️ Badge synced to database successfully: Word Warrior Badge
✅ All localStorage badges are in database
🎖️ Badge system initialized instantly
```

### Varningar (inget allvarligt, åtgärdas automatiskt):
```
⚠️ Found 1 badges in localStorage that are NOT in database!
🔧 Auto-sync: Found 1 badges missing from database, syncing...
✅ Auto-synced badge: <badge_id>
```

### Kritiska problem:
```
❌ CRITICAL: Background badge sync failed
❌ CRITICAL: Badge sync retry FAILED
```

Om du ser kritiska problem:
1. Kör **"Force Sync"** från test-sidan
2. Kontrollera din internetanslutning
3. Verifiera att Supabase är online

## Manuell Återställning

Om badges fortfarande försvinner:

1. Gå till `/test-badge-persistence`
2. Klicka på **"🔧 Force Sync"**
3. Vänta tills alla badges har synkats
4. Klicka på **"📊 Check State"** för att verifiera

## Backup-System

Systemet skapar automatiska backups av badges:
- Sparas i localStorage med nyckel: `badge_backup_{user_id}_{date}`
- Skapas automatiskt efter varje badge du tjänar in
- Kan användas för att återställa badges manuellt

För att se backups:
1. Öppna browser DevTools (F12)
2. Gå till Application → Local Storage
3. Leta efter nycklar som börjar med `badge_backup_`

## Förväntade Resultat

### När du tjänar in en badge:
1. Animationen visas omedelbart ✅
2. Badge sparas till localStorage (instant) ✅
3. Badge sparas till database (inom 100ms) ✅
4. Console visar: `✅ 🎖️ Badge synced to database successfully` ✅

### Nästa dag:
1. Nya daily quests laddas ✅
2. Gamla badges finns kvar ✅
3. Du kan tjäna in nya badges ✅
4. Alla badges från alla dagar samlas ✅

### Om internet går ner:
1. Badge sparas till localStorage ✅
2. Badge synkas automatiskt när internet är tillbaka ✅
3. Ingen badge går förlorad ✅

## Felsökning

### "Badges försvinner fortfarande"
→ Kör "Run All Tests" på `/test-badge-persistence` och kontrollera console logs

### "Badge visas men finns inte i database"
→ Kör "Force Sync" från test-sidan

### "Får dubbletter av samma badge"
→ Detta är inte längre möjligt (database constraint förhindrar det)

### "Test-sidan visar fel"
→ Kopiera console logs och kontrollera att du är inloggad som elev

## Nästa Steg

Efter att testerna fungerar:
1. Testa med riktiga elever över flera dagar
2. Övervaka console logs för fel
3. Kontrollera Supabase `user_badges` tabell regelbundet

## Support-Info för Debugging

Om problem kvarstår, samla denna info:
1. Console logs (särskilt med ❌ eller ⚠️)
2. Screenshot från `/test-badge-persistence` efter "Run All Tests"
3. Användar-ID (visas på test-sidan)
4. Antal badges i localStorage vs database
5. Datum när badge försvann

---

**Författare:** AI Assistant  
**Datum:** 2025-10-08  
**Status:** Implementerat och redo för test


