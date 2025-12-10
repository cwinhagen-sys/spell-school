# Databas-Synkronisering vid Hög Belastning från Samma IP

## Översikt

Detta dokument analyserar vad som händer med databas-synkroniseringar när många användare från samma IP-adress spelar Spell School samtidigt.

## Synkroniseringsflöden

### 1. XP Sync (`/api/xp-sync`)

**Vad händer:**
- När en elev avslutar ett spel skickas XP-events till `/api/xp-sync`
- Varje request kan innehålla flera events (batch)
- Events sparas i `xp_events` tabellen
- Game sessions sparas i `game_sessions` tabellen
- Database trigger uppdaterar `xp_totals` automatiskt

**Optimeringar:**
- ✅ **Batch insert**: Alla events i en request insertas tillsammans (inte en i taget)
- ✅ **Idempotency**: Events med samma ID ignoreras (ON CONFLICT DO NOTHING)
- ✅ **Non-blocking**: Sync sker asynkront, UI blockeras inte

**Databas-operationer per spel:**
1. Batch INSERT till `xp_events` (1 operation)
2. Batch INSERT till `game_sessions` (1 operation)
3. SELECT från `xp_totals` (för att visa uppdaterat värde)
4. Database trigger körs automatiskt (uppdaterar `xp_totals`)

**Totalt: ~3-4 databas-operationer per spel**

### 2. Quest Sync (`/api/quest-sync`)

**Vad händer:**
- Quest progress och completion skickas till `/api/quest-sync`
- Varje request kan innehålla flera quest events
- Events processas i **parallel** (Promise.all)
- Använder RPC functions för atomiska operationer

**Optimeringar:**
- ✅ **Batch idempotency check**: Alla event IDs checkas samtidigt
- ✅ **Parallel processing**: Events processas parallellt (inte sekventiellt)
- ✅ **Batch idempotency insert**: Alla idempotency records insertas tillsammans
- ✅ **Atomic RPC functions**: Quest completion + XP award i en transaktion

**Databas-operationer per quest event:**
1. SELECT från `quest_event_applied` (batch check för alla events)
2. RPC call till `upsert_quest_progress` eller `complete_quest_and_award_xp`
3. Batch INSERT till `quest_event_applied` (för idempotency)

**Totalt: ~2-3 databas-operationer per quest event**

## Vad händer vid hög belastning från samma IP?

### Scenario: 30 elever i samma klass spelar samtidigt

**Antaganden:**
- Alla elever är på samma IP (t.ex. skolans WiFi)
- Varje elev avslutar 1 spel samtidigt
- Varje spel genererar 1 XP sync + 1-2 Quest sync events

**Belastning:**
- **30 XP sync requests** → ~90-120 databas-operationer
- **30-60 Quest sync requests** → ~60-180 databas-operationer
- **Totalt: ~150-300 databas-operationer** inom några sekunder

### Rate Limits och Flaskhalsar

#### 1. Supabase Auth Rate Limits
- **200 requests per 5 minuter per IP** för authentication
- XP sync och Quest sync använder **Bearer tokens** (inte auth requests)
- ✅ **Ingen rate limit på sync endpoints** (de använder redan autentiserade tokens)

#### 2. Supabase Database Limits
- **Connection pooling**: Supabase hanterar connection pooling automatiskt
- **Concurrent connections**: Beror på din Supabase plan
- **Query performance**: Batch operations är mycket snabbare än individuella inserts

#### 3. Next.js API Routes
- **Serverless functions**: Varje request körs i egen serverless function
- **Concurrent execution**: Kan hantera många samtidiga requests
- **Connection reuse**: `supabaseServer` använder keep-alive för connection reuse

### Vad händer i praktiken?

#### ✅ **Bra nyheter:**
1. **Batch operations**: Varje sync request hanterar flera events, vilket minskar antalet requests
2. **Idempotency**: Duplicerade events ignoreras säkert (ingen risk för dubbel XP)
3. **Non-blocking**: Sync sker asynkront, eleverna kan fortsätta spela
4. **Parallel processing**: Quest events processas parallellt
5. **Connection pooling**: Supabase hanterar databas-anslutningar effektivt

#### ⚠️ **Potentiella problem:**

1. **Database lock contention**
   - Om många elever uppdaterar samma quest samtidigt kan det bli lock contention
   - **Lösning**: RPC functions använder optimistisk locking (ON CONFLICT)

2. **Trigger performance**
   - `xp_totals` trigger körs för varje XP event
   - Vid många samtidiga events kan trigger bli flaskhals
   - **Lösning**: Trigger är optimerad för batch operations

3. **Response time variation**
   - Vid hög belastning kan response times variera
   - **Detta är normalt**: Database queries tar längre tid när det är mycket trafik
   - **Användaren ser**: Sync-indikatorn visar att sync pågår tills allt är klart

4. **Supabase connection limits**
   - Om du har många samtidiga connections kan det bli problem
   - **Typiskt limit**: 200-500 concurrent connections (beroende på plan)
   - **30 elever**: Borde vara inom gränserna

### Sync-indikatorn

**Hur fungerar den:**
- Visar "Synkar..." när spel avslutas
- Visar "Synkat ✓" när alla syncs är klara
- Döljs automatiskt efter 3 sekunder

**Vad betyder varierande sync-tider?**
- **Normalt**: 200ms - 2 sekunder (beroende på databas-belastning)
- **Vid hög belastning**: Kan ta 3-5 sekunder
- **Vid mycket hög belastning**: Kan ta upp till 10 sekunder

**Varför varierar tiden?**
1. **Database load**: Fler samtidiga requests = längre kötid
2. **Network latency**: Varierar beroende på nätverksförhållanden
3. **Trigger execution**: Database triggers tar tid att köra
4. **Connection pooling**: Kan behöva vänta på tillgänglig connection

## Rekommendationer

### För normal användning (1-20 elever per IP):
✅ **Inga problem förväntas**
- Batch operations hanterar belastningen bra
- Sync-tider borde vara < 2 sekunder

### För hög belastning (20-50 elever per IP):
⚠️ **Övervaka sync-tider**
- Kan bli långsammare (3-5 sekunder)
- Överväg att sprida ut spel-slut lite (inte alla exakt samtidigt)

### För mycket hög belastning (50+ elever per IP):
🔴 **Potentiella problem:**
- Sync kan ta 5-10 sekunder
- Överväg:
  1. **Throttling**: Begränsa antalet samtidiga syncs
  2. **Queue system**: Köa syncs och processa i batches
  3. **Database scaling**: Uppgradera Supabase plan för mer kapacitet

## Tekniska detaljer

### XP Sync Flow:
```
Elev avslutar spel
  ↓
XP events skapas lokalt
  ↓
Batch skickas till /api/xp-sync
  ↓
Batch INSERT till xp_events (1 operation)
  ↓
Batch INSERT till game_sessions (1 operation)
  ↓
Database trigger uppdaterar xp_totals
  ↓
SELECT från xp_totals (för response)
  ↓
Response med uppdaterat XP
```

### Quest Sync Flow:
```
Quest progress ändras
  ↓
Quest events skapas lokalt
  ↓
Batch skickas till /api/quest-sync
  ↓
Batch SELECT från quest_event_applied (check idempotency)
  ↓
Parallel processing av events (Promise.all)
  ↓
RPC calls till upsert_quest_progress/complete_quest_and_award_xp
  ↓
Batch INSERT till quest_event_applied (idempotency)
  ↓
Response med resultat
```

## Sammanfattning

**Kort svar:**
- Vid normal användning (1-20 elever): Inga problem, sync tar < 2 sekunder
- Vid hög belastning (20-50 elever): Kan bli långsammare (3-5 sekunder), men fungerar
- Vid mycket hög belastning (50+ elever): Kan ta 5-10 sekunder, överväg optimeringar

**Viktigt:**
- Sync är **non-blocking**: Elever kan fortsätta spela medan sync pågår
- **Idempotency**: Duplicerade events ignoreras säkert
- **Batch operations**: Mycket effektivare än individuella inserts
- **Sync-indikatorn**: Visar tydligt när allt är synkat

**Varierande sync-tider är normalt** och beror på:
- Antal samtidiga användare
- Database load
- Network conditions
- Supabase plan och kapacitet







