# 🧪 Test Guide: XP Persistence Problem

## 🔍 **Problem**
XP sparas inte när student loggar ut och in igen.

## 📊 **Evidence från loggar:**
```
📊 Global progress data for student: 8f83c33e...
  total_points: 34,
  games_played: 10,
  last_played_at: '2025-10-16T06:28:20.92+00:00'
```

XP finns i databasen (34 points), men kanske inte visas när student loggar in igen.

---

## 🧪 **Test Procedure**

### **STEG 1: Spela ett spel som student**
1. Logga in som student (t.ex. elev3)
2. Öppna Developer Console (F12)
3. Notera nuvarande XP (t.ex. "Level 3, 34 XP")
4. Spela **Typing Challenge** och slutför det
5. **KRITISK CHECK - Kolla konsolen för dessa meddelanden:**

```javascript
// När spelet startar:
🎮 startGameSession CALLED: { gameType: 'typing', context: {...} }
✅ User found for game session: xxx
💾 Inserting game session into database...
✅ Game session started successfully! Session ID: yyy

// När spelet slutar:
🔥🔥🔥 tracking.ts updateStudentProgress called with: { score: X, gameType: 'typing', ... }
✅ User authenticated in tracking.ts: xxx
📊 Fetching current global progress record...
📊 Current global record: { id: 'zzz', total_points: 34, games_played: 10, ... }
🔥 Updating global record: { 
  oldPoints: 34, 
  pointsToAdd: 2, 
  newTotalPoints: 36, 
  oldGames: 10, 
  newGames: 11 
}
📊 Updating existing global record in database...
✅✅✅ Global record updated successfully!
✅ Database now has: { totalXP: 36, gamesPlayed: 11 }
🎉 updateStudentProgress COMPLETED successfully!

// Game session ends:
🎮 endGameSession CALLED: { sessionId: 'yyy', gameType: 'typing', ... }
💾 Ending game session: { sessionId: 'yyy', ... }
✅ Game session ended successfully
```

6. **Om du INTE ser dessa meddelanden, då är det problemet!**

### **STEG 2: Verifiera i Supabase**
1. Gå till Supabase Dashboard
2. Gå till Table Editor → `student_progress`
3. Filtrera på studenten (student_id = '8f83c33e...')
4. Kolla raden där `word_set_id` och `homework_id` är `NULL`
5. **Verifiera att `total_points` har ökat**

### **STEG 3: Logga ut och in igen**
1. Logga ut från student account
2. Logga in igen
3. **Kolla konsolen:**

```javascript
Debug - Loading progress for user: xxx
Debug - Loading from user-specific localStorage key: studentTotalXP_xxx, value: 36
Debug - Loading from database
Debug - Global progress record: { total_points: 36, games_played: 11, ... }
Debug - localStorage XP: 36
Debug - Final XP (max of local and DB): 36
```

4. **Om DB XP är lägre än localStorage XP:**
```javascript
⚠️ localStorage XP is higher than DB: { localXP: 36, dbXP: 34 }
⚠️ This might indicate sync issues. DB updates handled by tracking.ts
```

**Detta betyder att `updateStudentProgress` INTE sparade till databasen!**

---

## 🚨 **Möjliga Problem & Lösningar**

### **Problem 1: updateStudentProgress anropas inte**
**Check:** Leta efter `🔥🔥🔥 tracking.ts updateStudentProgress called` i konsolen

**Om meddelandet SAKNAS:**
- Spelet anropar INTE `updateStudentProgress`
- Fix: Lägg till anrop i spelets finish funktion

### **Problem 2: updateStudentProgress misslyckas tyst**
**Check:** Leta efter `❌ CRITICAL: Update error - XP will NOT be saved!`

**Om detta visas:**
- RLS policy fel på `student_progress` tabellen
- Fix: Kör RLS fix script för `student_progress`

### **Problem 3: Update körs men sparas inte**
**Check:** Leta efter `✅✅✅ Global record updated successfully!`

**Om meddelandet visas MEN XP ändå inte sparas:**
- Supabase connection issue
- Fix: Kontrollera nätverksloggar (Network tab i DevTools)

### **Problem 4: void anrop väntar inte**
**Check:** Spelet stängs innan update slutförs

**Om spelet stängs direkt efter:**
```typescript
void updateStudentProgress(...)  // Returnerar direkt, väntar inte
onClose()  // Stänger spelet innan DB update slutför
```

**Fix:** Använd `await` istället för `void` och vänta på completion

---

## 🔧 **Emergency Fix: Sync localStorage to DB**

Om localStorage har högre XP än DB, kör detta i konsolen som student:

```javascript
// Check persistent logs first
window.displayPersistentLogs()

// Manual sync localStorage to DB
const syncXP = async () => {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return console.error('No user')
  
  const localXP = localStorage.getItem(`studentTotalXP_${user.id}`)
  if (!localXP) return console.error('No local XP')
  
  const xp = parseInt(localXP)
  console.log('Syncing localStorage XP to DB:', xp)
  
  const { data, error } = await supabase
    .from('student_progress')
    .upsert({
      student_id: user.id,
      word_set_id: null,
      homework_id: null,
      total_points: xp,
      games_played: 1,  // This might be wrong, but XP is more important
      last_played_at: new Date().toISOString()
    }, {
      onConflict: 'student_id,word_set_id,homework_id'
    })
    .select()
  
  if (error) {
    console.error('Sync failed:', error)
  } else {
    console.log('Sync successful!', data)
  }
}

syncXP()
```

---

## 📝 **Expected Console Output (Normal Flow)**

```
// Game starts
🎮 startGameSession CALLED: { gameType: 'typing' }
✅ Game session started successfully! Session ID: abc-123

// Game ends
🔥🔥🔥 tracking.ts updateStudentProgress called
📊 Fetching current global progress record...
📊 Current global record: { total_points: 34 }
🔥 Updating global record: { oldPoints: 34, newTotalPoints: 36 }
📊 Updating existing global record in database...
✅✅✅ Global record updated successfully!
✅ Database now has: { totalXP: 36, gamesPlayed: 11 }
🎉 updateStudentProgress COMPLETED successfully!

🎮 endGameSession CALLED: { sessionId: 'abc-123' }
✅ Game session ended successfully

// Logout
🔄 Syncing all pending game data before logout...
✅ All data synced before logout

// Login again
Debug - Loading from database
Debug - Global progress record: { total_points: 36 }
Debug - Final XP (max of local and DB): 36
```

---

## 🎯 **What to Report Back**

Please copy and paste the **exact console output** after playing a game, specifically:

1. ✅ `✅✅✅ Global record updated successfully!` - Did you see this?
2. ❌ Any errors with `❌ CRITICAL` in them
3. ⚠️ Any warnings about `localStorage XP is higher than DB`
4. The values shown in `Debug - Global progress record:` after re-login

This will help me identify exactly where the XP persistence is failing!

---

**Last Updated:** 2025-10-16  
**Status:** Verbose logging added, awaiting test results















