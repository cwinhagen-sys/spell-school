# Badge Persistence Fix - Daily Quest Badges

## Problem
Daily quest badges sparades inte korrekt mellan dagar och försvann när nya daily quests laddades. Badges som tjänades in försvann efter reset.

## Root Cause Analysis
Efter grundlig undersökning hittades flera potentiella problem:

1. **Tyst databasssynkronisering** - Badge-synkronisering till databasen kunde misslyckas tyst utan att användaren märkte det
2. **Ingen error recovery** - Om en database insert misslyckades, fanns ingen retry-mekanism
3. **Ingen skyddsmekanism** - Om database sync misslyckades kunde badges finnas i localStorage men inte i databasen
4. **Ingen automatisk återställning** - Vid sidladdning synkroniserades inte localStorage-badges till databasen om de saknades

## Lösning

### 1. Förbättrad Error Handling med Retry-Logik
**Fil:** `src/hooks/useDailyQuestBadges.ts`

- ✅ Detaljerad error logging när badge sync misslyckas
- ✅ Automatisk retry efter 2 sekunder om första försöket misslyckas
- ✅ Hantering av duplicate-fel (kod 23505) - ignoreras eftersom badge redan finns
- ✅ Kritiska fel markeras tydligt i konsolen med ❌

```typescript
// Förbättrad error handling
if (error) {
  // Check if error is due to duplicate (already exists)
  if (error.code === '23505' || error.message.includes('duplicate')) {
    console.log('🎖️ Badge already exists in database (duplicate), skipping:', badge.name)
    return
  }
  
  console.error('❌ CRITICAL: Background badge sync failed:', {
    error: error.message || error,
    badge: badge.name,
    badge_id: badge.id,
    user_id: user.id,
    errorCode: error.code
  })
  
  // Retry once after 2 seconds
  setTimeout(async () => {
    // ... retry logic
  }, 2000)
}
```

### 2. Automatisk Synkronisering vid Sidladdning
**Fil:** `src/hooks/useDailyQuestBadges.ts`

Varje gång sidan laddas körs nu en auto-sync som:
- ✅ Jämför localStorage badges med database badges
- ✅ Hittar badges som finns lokalt men saknas i databasen
- ✅ Synkroniserar automatiskt alla saknade badges till databasen
- ✅ Loggar alla sync-operationer

```typescript
// Auto-sync: Check if there are badges in localStorage that are missing from database
if (user) {
  const localBadges = JSON.parse(localStorage.getItem(userKey))
  const { data: dbBadges } = await supabase.from('user_badges').select('badge_id')
  
  const missingBadges = localBadges.filter((b: any) => !dbBadgeIds.has(b.badge_id))
  
  if (missingBadges.length > 0) {
    console.log(`🔧 Auto-sync: Found ${missingBadges.length} badges missing from database, syncing...`)
    // ... sync logic
  }
}
```

### 3. "Never Lose Badges" Protection
**Fil:** `src/hooks/useDailyQuestBadges.ts`

Implementerat en merge-strategi som garanterar att badges ALDRIG försvinner:
- ✅ Mergar localStorage badges med database badges (union, inte replace)
- ✅ Om en badge finns lokalt men inte i databasen, behålls den och synkas senare
- ✅ Skyddar mot databas-fel och nätverksproblem

```typescript
// NEVER LOSE BADGES: Merge database badges with local badges (union)
const dbBadgeIds = new Set(data.map(b => b.badge_id))
const localOnlyBadges = localBadges.filter((b: any) => !dbBadgeIds.has(b.badge_id))

let mergedBadges = [...data]

if (localOnlyBadges.length > 0) {
  console.warn(`⚠️ Found ${localOnlyBadges.length} badges in localStorage that are NOT in database!`)
  mergedBadges = [...data, ...localOnlyBadges]
  console.log('🛡️ Protected: Merged local badges with database badges')
  
  // Try to sync these to database in background
  // ... recovery logic
}
```

### 4. Omfattande Test-Sida
**Fil:** `src/app/test-badge-persistence/page.tsx`

Skapad en dedikerad test-sida för att diagnostisera och verifiera badge-persistens:

#### Test-funktioner:
1. **Check State** - Jämför localStorage vs database vs React state
2. **Award Test Badge** - Tjäna in "Word Warrior" badge för test
3. **Test Persistence** - Rensar cache och återladdar från database
4. **Check History** - Visar badges tjänade över olika dagar
5. **Force Sync** - Tvingar synkronisering av localStorage till database
6. **Clear Test Badge** - Tar bort test-badge för att kunna testa igen
7. **Run All Tests** - Kör alla tester automatiskt

#### Åtkomst:
```
http://localhost:3000/test-badge-persistence
```

#### Användning:
1. Logga in som en elev
2. Gå till test-sidan
3. Klicka på "Run All Tests" för en fullständig diagnos
4. Tjäna in en badge genom att klicka "Award Test Badge"
5. Verifiera att badgen finns i både localStorage och database
6. Testa persistence genom att klicka "Test Persistence"

## Testning

### Manuellt Test-Scenario
För att verifiera att badges sparas mellan dagar:

1. **Dag 1:**
   - Logga in som elev
   - Slutför en daily quest och tjäna in en badge
   - Gå till `/test-badge-persistence`
   - Kör "Check State" - verifiera att badgen finns i både localStorage och database
   - Notera badge_id och unlocked_at timestamp

2. **Dag 2 (nästa dag):**
   - Logga in igen
   - Nya daily quests kommer att laddas
   - Gå till `/test-badge-persistence`
   - Kör "Check State" igen
   - **✅ Förväntad:** Gårdagens badge ska fortfarande finnas
   - **✅ Förväntad:** Badge count ska vara samma eller högre (inte lägre)

3. **Dag 2 (fortsättning):**
   - Slutför en ny daily quest och tjäna in en ny badge
   - Kör "Check State" igen
   - **✅ Förväntad:** Båda badges (från dag 1 och dag 2) ska finnas
   - Kör "Check History" för att se badges grupperade per dag

### Console Logging
Systemet loggar nu mycket mer detaljerat. Sök efter dessa meddelanden i konsolen:

#### ✅ Positiva signaler (allt är OK):
- `✅ 🎖️ Badge synced to database successfully`
- `✅ All localStorage badges are in database`
- `✅ Auto-synced badge`
- `🎖️ Badge already exists in database (duplicate)`

#### ⚠️ Varningssignaler (kan vara problem):
- `⚠️ Found X badges in localStorage that are NOT in database!`
- `🔧 Auto-sync: Found X badges missing from database, syncing...`

#### ❌ Kritiska fel:
- `❌ CRITICAL: Background badge sync failed`
- `❌ CRITICAL: Badge sync retry FAILED`
- `❌ Failed to auto-sync badge`

## Backup-System
Systemet skapar nu automatiska backups:
- ✅ Backup skapas efter varje badge-award
- ✅ Backup lagras per användare och dag: `badge_backup_{user_id}_{date}`
- ✅ Kan återställas manuellt via test-sidan

## Database Schema
Badges sparas i två tabeller:

### `badges` - Badge definitions
```sql
CREATE TABLE badges (
  id UUID PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT NOT NULL,
  icon TEXT NOT NULL,
  category TEXT NOT NULL,
  rarity TEXT NOT NULL,
  quest_id TEXT UNIQUE,  -- Links to daily quest ID
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ
);
```

### `user_badges` - User's earned badges
```sql
CREATE TABLE user_badges (
  id UUID PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  badge_id UUID NOT NULL REFERENCES badges(id) ON DELETE CASCADE,
  unlocked_at TIMESTAMPTZ DEFAULT NOW(),  -- Column name is unlocked_at, not earned_at
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, badge_id)  -- Prevents duplicate badges
);
```

**⚠️ Important:** The column name is `unlocked_at`, not `earned_at`. If you see errors about `earned_at` not existing, run `check-user-badges-schema.sql` to fix the schema.

## localStorage Keys
- `daily_quest_badges` - Alla badge-definitioner (cache)
- `user_badges_{user_id}` - Användarens tjänade badges (primär cache)
- `badge_backup_{user_id}_{date}` - Daglig backup av badges

## Potentiella Problem och Lösningar

### Problem: "Badges försvinner fortfarande"
**Diagnos:**
1. Gå till `/test-badge-persistence`
2. Kör "Check State"
3. Kolla console logs efter kritiska fel (❌)

**Lösning:**
1. Om badges finns i localStorage men inte i database: Kör "Force Sync"
2. Om ingen badge finns: Kontrollera att RLS-policies är korrekta i Supabase
3. Kör "Run All Tests" för fullständig diagnos

### Problem: "Badge syns i UI men inte i database"
**Diagnos:**
1. Öppna browser console
2. Sök efter "CRITICAL" error messages
3. Kontrollera nätverkstab i DevTools för misslyckade requests

**Lösning:**
1. Kontrollera Supabase-anslutning
2. Verifiera RLS policies: `Users can insert their own badges`
3. Kör "Force Sync" från test-sidan

### Problem: "Badges dupliceras"
**Detta är inte längre ett problem:**
- Database constraint `UNIQUE(user_id, badge_id)` förhindrar duplicates
- Duplicate-fel (kod 23505) ignoreras nu gracefully

## Förbättringar för Framtiden

### Förslag på ytterligare förbättringar:
1. **Service Worker** för offline-support och garanterad synkronisering
2. **IndexedDB** istället för localStorage för bättre reliabilitet
3. **Periodic sync** var 5:e minut för att säkerställa synkronisering
4. **Badge event queue** för att garantera att ingen award går förlorad
5. **Admin dashboard** för att manuellt återställa badges vid problem

## Support
Om problem kvarstår:
1. Kör alla tester på `/test-badge-persistence`
2. Kopiera console logs (särskilt fel-meddelanden)
3. Ta screenshots av test-resultat
4. Kontrollera Supabase dashboard för user_badges data

## Ändringslogg
- **2025-10-08:** Initial fix implementerad
  - Förbättrad error handling med retry
  - Automatisk synkronisering vid sidladdning
  - "Never lose badges" protection
  - Omfattande test-sida skapad

