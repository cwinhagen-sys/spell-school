# Performance Optimization Plan för Spell School

## Problem
Efter inloggning tar det lång tid för data att visas:
- Level/XP tar tid att ladda
- Assignments tar tid att visas
- Badges tar tid att ladda i badges-menyn

## Identifierade Flaskhalsar

### 1. RLS Policies med Komplexa Subqueries
**Problem:** Teacher access policies använder EXISTS med JOINs som körs på varje query
```sql
EXISTS (
  SELECT 1 FROM class_students cs
  JOIN classes c ON c.id = cs.class_id
  WHERE cs.student_id = student_progress.student_id
  AND c.teacher_id = auth.uid()
)
```

**Lösning:**
- Skapa materialized views eller cached results för teacher-student relationships
- Använd database functions med SECURITY DEFINER för att kringgå RLS när det är säkert
- Lägg till composite indexes för vanliga query patterns

### 2. Saknade Database Indexes
**Problem:** Vissa queries saknar optimala index

**Lösning:**
```sql
-- För student_progress
CREATE INDEX IF NOT EXISTS idx_student_progress_student_id_composite 
  ON student_progress(student_id, word_set_id, homework_id);

-- För user_badges (om inte redan finns)
CREATE INDEX IF NOT EXISTS idx_user_badges_user_badge_composite 
  ON user_badges(user_id, badge_id);

-- För profiles (ofta queried på login)
CREATE INDEX IF NOT EXISTS idx_profiles_user_id 
  ON profiles(id, role, last_active);

-- För assigned_word_sets (för snabbare joins)
CREATE INDEX IF NOT EXISTS idx_assigned_word_sets_composite 
  ON assigned_word_sets(student_id, class_id, word_set_id);
```

### 3. Sekventiella Queries
**Problem:** Data laddas sekventiellt istället för parallellt

**Lösning:**
- Använd Promise.all() för parallella database queries
- Kombinera relaterade queries med JOIN eller batch requests
- Implementera GraphQL eller RPC functions för att hämta relaterad data i en request

### 4. Inkonsekvent Caching
**Problem:** Assignments och user profile cachas inte i localStorage

**Lösning:**
- Lägg till localStorage caching för assignments (liknande homeworks)
- Cache user profile data (role, email) vid inloggning
- Implementera TTL (time-to-live) för cache invalidation

### 5. Badge Loading
**Problem:** Badges laddas i två separata queries (badges + user_badges)

**Lösning:**
- Skapa en database view som kombinerar badges med user status
- Eller använd en RPC function som returnerar all badge data i ett anrop

## Implementation Priority

### 🔥 HIGH PRIORITY - Quick Wins (30 min - 1h)

1. **Add Missing Indexes** (5-10 min)
   - Kör optimized_indexes.sql
   - Immediate performance boost för queries

2. **Cache Assignments** (20 min)
   - Lägg till localStorage caching för assignments
   - Använd samma pattern som för homeworks

3. **Parallelize Badge Loading** (15 min)
   - Ändra badge hooks till Promise.all() för parallella queries
   - Redan delvis implementerat, behöver bara refineras

### 🟡 MEDIUM PRIORITY - Substantial Improvements (2-3h)

4. **Create Optimized Badge View** (1h)
   - Database view som joinear badges + user_badges
   - Single query för all badge data

5. **Optimize Assignment Queries** (1h)
   - Use database function för assignment loading
   - Reduce JOIN complexity

6. **Add Profile Caching** (30 min)
   - Cache user role och basic info vid login
   - Reduce repeated profile queries

### 🟢 LOW PRIORITY - Long-term (4-8h)

7. **Implement Request Batching** (2-3h)
   - Create API layer för batch requests
   - Reduce total number of roundtrips

8. **Add Query Result Caching on Backend** (2-3h)
   - Implement Redis eller Supabase cache
   - Cache teacher-student relationships

9. **Profile and Monitor** (ongoing)
   - Add performance monitoring
   - Track query times
   - Set up alerts för slow queries

## Estimated Impact

| Optimization | Time to Implement | Expected Speed Improvement |
|--------------|-------------------|---------------------------|
| Add Indexes | 10 min | 30-50% faster queries |
| Cache Assignments | 20 min | Instant load after first fetch |
| Parallelize Queries | 15 min | 40-60% faster initial load |
| Badge View | 1h | 50-70% faster badge page |
| RPC Functions | 2h | 60-80% faster complex queries |

## Total Estimated Time
- Quick wins: 1 hour
- Medium improvements: 3 hours
- **Total for significant improvement: 4 hours**

## Recommendations

**Start with:**
1. Add missing database indexes (biggest impact, minimal effort)
2. Cache assignments in localStorage (instant UX improvement)
3. Parallelize existing queries (good performance boost)

**Then move to:**
4. Create optimized database views/functions
5. Implement more sophisticated caching strategy






















