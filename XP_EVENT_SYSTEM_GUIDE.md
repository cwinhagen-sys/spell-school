# XP Event System - Hållbar Arkitektur

## Översikt

Detta nya system ersätter det gamla `student_progress`-baserade XP-systemet med en event-driven arkitektur som är:

✅ **Snabbare** - Batchar writes, färre DB-anrop  
✅ **Mer pålitlig** - Idempotent, ingen data förloras  
✅ **Enklare** - En källa till sanning (xp_totals)  
✅ **Skalbar** - IndexedDB + batch processing  

## Arkitektur

```
┌─────────────────────────────────────────────────────────────┐
│  CLIENT                                                      │
│                                                              │
│  Game Awards XP                                              │
│       ↓                                                      │
│  awardXP(score, gameType)                                    │
│       ↓                                                      │
│  createXpEvent() → XpOutbox (IndexedDB)                      │
│       ↓                                                      │
│  SyncManager (auto-flush var 3:e sekund)                    │
│       ↓                                                      │
│  Batch POST /api/xp-sync                                     │
└──────────────────────┼───────────────────────────────────────┘
                       │
                       ↓
┌─────────────────────────────────────────────────────────────┐
│  SERVER                                                      │
│                                                              │
│  POST /api/xp-sync                                           │
│       ↓                                                      │
│  ingest_xp_events RPC (Postgres)                             │
│       ↓                                                      │
│  INSERT INTO xp_events (idempotent via UUID)                 │
│       ↓                                                      │
│  TRIGGER apply_xp_event()                                    │
│       ↓                                                      │
│  UPSERT INTO xp_totals (single source of truth)              │
└─────────────────────────────────────────────────────────────┘
```

## Databas Schema

### xp_events (Append-only Event Log)

```sql
CREATE TABLE xp_events (
  id UUID PRIMARY KEY,              -- Client-generated (idempotent)
  student_id UUID NOT NULL,
  kind TEXT NOT NULL,               -- 'typing' | 'choice' | etc.
  delta INT NOT NULL,               -- +10, +20, etc.
  word_set_id UUID,
  homework_id UUID,
  created_at TIMESTAMPTZ,
  metadata JSONB
);
```

**Varför append-only?**
- Ingen data förloras
- Idempotent (client-generated UUID)
- Audit trail för analytics
- Race conditions spelar ingen roll

### xp_totals (Single Source of Truth)

```sql
CREATE TABLE xp_totals (
  student_id UUID PRIMARY KEY,
  total_xp INT NOT NULL DEFAULT 0,
  games_played INT NOT NULL DEFAULT 0,
  last_game_type TEXT,
  updated_at TIMESTAMPTZ
);
```

**Varför totals-tabell?**
- Snabba läsningar (ingen SUM över events)
- En källa till sanning
- Trigger uppdaterar automatiskt

## Client-Side Components

### 1. XpOutbox (`src/lib/xpOutbox.ts`)

IndexedDB-baserad queue för XP events.

```typescript
// Enqueue event (lagras lokalt först)
await xpOutbox.enqueue({
  id: crypto.randomUUID(),
  student_id: user.id,
  kind: 'typing',
  delta: 10,
  created_at: new Date().toISOString()
})
```

**Features:**
- IndexedDB för persistens (fallback till localStorage)
- Auto-retry på app startup
- sendBeacon för tab close

### 2. SyncManager (`src/lib/syncManager.ts`)

Central coordinator för all synk.

```typescript
// Auto-flush var 3:e sekund
setInterval(() => syncManager.flush(), 3000)

// Flush vid visibilitychange
document.addEventListener('visibilitychange', () => {
  if (hidden) syncManager.sendBeaconNow()
})
```

**Features:**
- Throttling (max en flush per 2 sekunder)
- Auto-flush vid visibilitychange
- sendBeacon vid pagehide/beforeunload

### 3. TrackingV2 (`src/lib/trackingV2.ts`)

Ny API för XP-hantering.

```typescript
// Gamla systemet:
await updateStudentProgress(score, gameType, context)

// Nya systemet:
await awardXP(score, gameType, context)
```

**Fördelar:**
- Queuar event istället för direkt DB write
- Batch processing automatiskt
- Optimistisk UI (visa direkt, synka i bakgrunden)

## Server-Side Components

### API Endpoint (`src/app/api/xp-sync/route.ts`)

```typescript
POST /api/xp-sync
Body: { events: [...] }
Response: { accepted_ids: [...], total_xp: 1234 }
```

**Features:**
- Batch processing
- Auth validation
- Idempotent (ignorerar duplicates)

### RPC Function (`migrations/create_xp_event_system.sql`)

```sql
SELECT ingest_xp_events('[
  {"id": "uuid1", "student_id": "...", "kind": "typing", "delta": 10},
  {"id": "uuid2", "student_id": "...", "kind": "choice", "delta": 5}
]'::jsonb);
```

**Features:**
- Transactional (allt eller inget)
- Idempotent (ON CONFLICT DO NOTHING)
- Trigger uppdaterar totals automatiskt

## Migration från Gamla Systemet

### Steg 1: Kör Migration

```bash
# I Supabase SQL Editor, kör:
psql -f migrations/create_xp_event_system.sql
```

Detta skapar:
- `xp_events` tabell
- `xp_totals` tabell
- Trigger `apply_xp_event`
- RPC `ingest_xp_events`
- RLS policies

### Steg 2: Migrera Befintlig Data (Optional)

```sql
-- Kopiera student_progress → xp_totals
INSERT INTO xp_totals (student_id, total_xp, games_played, last_game_type, updated_at)
SELECT 
  student_id,
  COALESCE(total_points, 0),
  COALESCE(games_played, 0),
  last_game_type,
  COALESCE(last_played_at, NOW())
FROM student_progress
WHERE word_set_id IS NULL AND homework_id IS NULL
ON CONFLICT (student_id) DO UPDATE
  SET total_xp = GREATEST(xp_totals.total_xp, EXCLUDED.total_xp);
```

### Steg 3: Uppdatera Code

**Gamla imports:**
```typescript
import { updateStudentProgress } from '@/lib/tracking'
```

**Nya imports:**
```typescript
import { awardXP, getStudentTotalXP } from '@/lib/trackingV2'
```

**Gamla usage:**
```typescript
const points = await updateStudentProgress(score, gameType, context)
```

**Nya usage:**
```typescript
const points = await awardXP(score, gameType, context)
```

### Steg 4: Läs från Nya Tabellen

**Gamla:**
```typescript
const { data } = await supabase
  .from('student_progress')
  .select('total_points')
  .eq('student_id', userId)
```

**Nya:**
```typescript
const total = await getStudentTotalXP()
// eller direkt:
const { data } = await supabase
  .from('xp_totals')
  .select('total_xp, games_played')
  .eq('student_id', userId)
```

## Fördelar mot Gamla Systemet

| Aspekt | Gammalt System | Nytt System |
|--------|----------------|-------------|
| **Write Performance** | 1 write per spel | Batchar 50 events |
| **Data Loss Risk** | Hög (sendBeacon kan misslyckas) | Låg (IndexedDB + retry) |
| **Race Conditions** | Problem vid snabba writes | Idempotent (ingen issue) |
| **Logout Sync** | 6+ sekunder väntan | 3 sekunder max |
| **Single Source of Truth** | Nej (localStorage vs DB) | Ja (xp_totals) |
| **Idempotency** | Nej | Ja (UUID-baserad) |
| **Offline Support** | Nej | Ja (IndexedDB queue) |

## Debugging

### Kolla Outbox Status

```typescript
import { xpOutbox } from '@/lib/xpOutbox'

const status = await xpOutbox.getStatus()
console.log('Pending events:', status.pendingCount)
console.log('Events:', status.events)
```

### Kolla SyncManager Status

```typescript
import { syncManager } from '@/lib/syncManager'

const status = await syncManager.getStatus()
console.log('State:', status.state)
console.log('XP pending:', status.xpPending)
console.log('Quest pending:', status.questPending)
```

### Force Flush

```typescript
import { forceSyncXP } from '@/lib/trackingV2'

await forceSyncXP() // Tvinga synk direkt
```

### Kolla DB

```sql
-- Se alla events för en student
SELECT * FROM xp_events 
WHERE student_id = 'uuid-here' 
ORDER BY created_at DESC;

-- Se total för en student
SELECT * FROM xp_totals WHERE student_id = 'uuid-here';

-- Verifiera att trigger fungerar
-- (total_xp ska matcha SUM(delta) från xp_events)
SELECT 
  t.student_id,
  t.total_xp AS totals_xp,
  COALESCE(SUM(e.delta), 0) AS events_sum,
  t.total_xp - COALESCE(SUM(e.delta), 0) AS diff
FROM xp_totals t
LEFT JOIN xp_events e ON e.student_id = t.student_id
GROUP BY t.student_id, t.total_xp
HAVING t.total_xp != COALESCE(SUM(e.delta), 0);
-- Tom result = allt matchar!
```

## Performance Optimizations

1. **Batch Size**: 50 events per batch (konfigurerbar i `xpOutbox.ts`)
2. **Flush Interval**: 3 sekunder (konfigurerbar i `syncManager.ts`)
3. **Throttling**: Max 1 flush per 2 sekunder
4. **Indexes**: På `student_id`, `created_at`, `word_set_id`
5. **RLS**: Optimerade policies med index hints

## Vanliga Frågor

### Vad händer om användaren stänger tabben mitt i ett spel?

SyncManager skickar automatiskt sendBeacon med pending events. Events sparas också i IndexedDB och kommer att synkas nästa gång användaren loggar in.

### Vad händer om samma event skickas två gånger?

Events har client-generated UUID:er. Databasen ignorerar duplicates via `ON CONFLICT DO NOTHING`.

### Hur lång tid tar det innan XP syns i UI?

**Optimistiskt:** Direkt (UI visar pending XP)  
**I DB:** 0-3 sekunder (nästa batch flush)

### Kan jag använda gamla `updateStudentProgress`?

Ja, men det är deprecated. Migrera till `awardXP` för bättre performance och pålitlighet.

### Vad händer med gamla student_progress tabellen?

Den kan behållas för backward compatibility eller analytics. Det nya systemet använder `xp_totals` istället.

## Nästa Steg

1. ✅ Kör migration (`create_xp_event_system.sql`)
2. ✅ Uppdatera imports till `trackingV2`
3. ✅ Testa i dev-miljö
4. ✅ Verifiera med debugging-queries
5. 🚀 Deploy till produktion

## Support

Vid problem, kolla:
1. Browser console för XP Outbox/SyncManager logs
2. Supabase logs för API errors
3. DB queries för att verifiera data
4. IndexedDB (DevTools → Application → IndexedDB → xp-outbox)














