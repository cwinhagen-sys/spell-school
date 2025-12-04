# 🚀 Stress-Test med Flera Klasser - Skalningsguide

## Vercel Limits & Kapacitet

### Vercel Pro Plan Limits
- **Concurrent Executions**: 30,000 samtidiga function executions
- **Function Duration**: Max 60 sekunder per request
- **Memory**: 1 GB per function (kan ökas till 3 GB)
- **Bandwidth**: Obegränsat

### Uppskattad Kapacitet för Spell School

Baserat på nuvarande prestanda:

**Per Klass (30 elever):**
- Leaderboard requests: ~70ms per request
- Login requests: ~300ms per request
- Totalt: ~100-200 requests/minut per klass

**Teoretisk Max Kapacitet:**
- **30,000 concurrent executions** ÷ **~100ms per request** = **~300,000 requests/sekund**
- Men i praktiken: **~1,000-5,000 klasser samtidigt** (beroende på aktivitet)

**Realistisk Uppskattning:**
- **100-500 klasser** med normal aktivitet (30 elever per klass)
- **50-200 klasser** med intensiv aktivitet (många leaderboard requests)
- **1,000+ klasser** med låg aktivitet (sporadiska requests)

---

## Stress-Test med Flera Klasser

### Steg 1: Skapa Flera Test-Klasser

```bash
# Skapa 5 test-klasser med 30 elever vardera
# (Gör detta via Spell School UI eller SQL)

# Klass 1: testclass1 med teststudent1-30
# Klass 2: testclass2 med teststudent31-60
# Klass 3: testclass3 med teststudent61-90
# Klass 4: testclass4 med teststudent91-120
# Klass 5: testclass5 med teststudent121-150
```

### Steg 2: Skapa Multi-Class Credentials File

```json
[
  {
    "classId": "class-id-1",
    "students": [
      { "username": "teststudent1", "password": "password123" },
      { "username": "teststudent2", "password": "password123" },
      ...
    ]
  },
  {
    "classId": "class-id-2",
    "students": [
      { "username": "teststudent31", "password": "password123" },
      ...
    ]
  }
]
```

### Steg 3: Kör Multi-Class Stress Test

```bash
node scripts/stress-test-multi-class.js \
  --classes=5 \
  --students-per-class=30 \
  --duration=120 \
  --base-url=https://www.spellschool.se \
  --credentials-file=multi-class-credentials.json
```

---

## Vad Göra När Gränsen Nås?

### 1. Identifiera Flaskhalsar

**Vanliga Flaskhalsar:**
- **Leaderboard API**: Tung query med många joins
- **Database Connections**: Supabase connection pool limits
- **Memory Usage**: Funktioner som använder för mycket minne
- **Cold Starts**: Första requesten till en function är långsam

### 2. Optimeringar

#### A. Öka Cache-Tid
```typescript
// I leaderboard API
const CACHE_TTL_MS = 300000 // 5 minuter istället för 60 sekunder
```

#### B. Använd Vercel KV eller Redis
```typescript
// För bättre caching mellan function invocations
import { kv } from '@vercel/kv'

const cached = await kv.get(`leaderboard_${classId}`)
if (cached) return cached
```

#### C. Optimera Database Queries
- Lägg till indexes på ofta använda kolumner
- Använd connection pooling
- Begränsa query-resultat (LIMIT)

#### D. Använd Edge Functions
- Flytta enkla requests till Edge Functions (snabbare)
- Behåll komplexa queries i Serverless Functions

### 3. Scaling Strategies

#### Horizontal Scaling (Rekommenderat)
- Vercel skalar automatiskt
- Inga ändringar behövs i koden
- Fungerar upp till 30,000 concurrent executions

#### Vertical Scaling
- Öka function memory (1 GB → 3 GB)
- Kan hjälpa för memory-intensive operations

#### Database Scaling
- Supabase skalar automatiskt
- Överväg dedicated database för stora volymer

### 4. Monitoring & Alerts

**Vad du ska övervaka:**
- Function invocations (Vercel Dashboard)
- Error rate (bör vara < 1%)
- Response times (bör vara < 500ms)
- Database query times (Supabase Dashboard)
- Memory usage (bör vara < 80% av limit)

**När du ska agera:**
- Error rate > 5% → Stoppa testet, optimera
- Response times > 2000ms → Optimera queries
- Memory usage > 90% → Öka memory eller optimera kod

---

## Skalningsplan

### Fase 1: Nuvarande (100-500 klasser)
- ✅ Nuvarande optimeringar räcker
- ✅ Cache på 60 sekunder
- ✅ In-memory caching

### Fase 2: Medel (500-2,000 klasser)
- 🔄 Öka cache-tid till 5 minuter
- 🔄 Lägg till Vercel KV för bättre caching
- 🔄 Optimera database queries med indexes

### Fase 3: Stor (2,000-10,000 klasser)
- 🔄 Dedicated Supabase database
- 🔄 Redis för distributed caching
- 🔄 CDN för statiska assets
- 🔄 Edge Functions för enkla requests

### Fase 4: Enterprise (10,000+ klasser)
- 🔄 Vercel Enterprise plan
- 🔄 Custom scaling options
- 🔄 Dedicated infrastructure
- 🔄 Load balancing

---

## Rekommendationer

### Kortsiktigt (Nu)
1. ✅ Fortsätt med nuvarande optimeringar
2. ✅ Övervaka prestanda under stress-tester
3. ✅ Identifiera flaskhalsar

### Medellång sikt (3-6 månader)
1. 🔄 Implementera Vercel KV för caching
2. 🔄 Optimera database queries med indexes
3. 🔄 Öka cache-tider för tungt använda endpoints

### Långsiktigt (6-12 månader)
1. 🔄 Överväg Redis för distributed caching
2. 🔄 Implementera Edge Functions för enkla requests
3. 🔄 Överväg dedicated database

---

## Sammanfattning

**Nuvarande Kapacitet:**
- ✅ **100-500 klasser** med normal aktivitet
- ✅ **30,000 concurrent executions** på Vercel Pro
- ✅ **Automatisk skalning** utan kodändringar

**När Gränsen Nås:**
1. Identifiera flaskhalsar (leaderboard, database, etc.)
2. Optimera (cache, queries, indexes)
3. Skala (Vercel KV, Redis, dedicated database)
4. Övervaka kontinuerligt

**Nästa Steg:**
- Kör stress-test med flera klasser
- Övervaka prestanda
- Identifiera flaskhalsar
- Optimera baserat på resultat


