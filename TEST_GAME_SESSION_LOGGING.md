# Test: Game Session Logging & Persistent Error Logs

## 🐛 **Problem Vi Försöker Lösa**

Game sessions sparas inte när användaren loggar ut snabbt efter spel. Vi ser ett "N" i hörnet (error notification) men console rensas vid logout så vi kan inte se felet.

## ✅ **Ny Lösning: Persistent Logging**

Jag har implementerat:
1. **Persistent error logging** - Errors sparas i localStorage och överlever logout/refresh
2. **Inte kasta errors** - `endGameSession` kastar inte errors längre (för att undvika unhandled promise rejections)
3. **Längre sync timeout** - 3 sekunder istället för 2 sekunder vid logout
4. **Auto-visning av logs** - Logs visas automatiskt när du laddar sidan om några finns

## 🧪 **Test-Instruktioner**

### **Steg 1: Spela ett spel och logga ut snabbt**

1. Öppna **Console** (F12 → Console tab)
2. Logga in som student
3. Spela ett kort spel (t.ex. Memory Game)
4. Avsluta spelet
5. **Klicka Logout OMEDELBART** (inom 1 sekund)
6. **NOTERA:** Console rensas, men logs sparas!

### **Steg 2: Logga in igen och se loggarna**

1. Logga in igen som student
2. **Öppna Console** (F12)
3. Efter ~1 sekund ska du se:
   ```
   🔍 Persistent logs detected from previous session
   📋 Found X persistent log entries:
   ═══════════════════════════════════════════
   ℹ️ [HH:MM:SS] Ending game session: memory
   ❌ [HH:MM:SS] Failed to end game session: ...
   ℹ️ [HH:MM:SS] Game session backed up to localStorage for retry
   ℹ️ [HH:MM:SS] Starting sync before logout
   ...
   ═══════════════════════════════════════════
   ```

### **Steg 3: Analysera Loggarna**

**Leta efter:**

#### **Scenario A: Successful Save**
```
✅ Bra tecken:
ℹ️ Ending game session: memory
ℹ️ Game session ended successfully: memory
ℹ️ Starting sync before logout
ℹ️ Sync before logout completed successfully
```
→ **Data ska vara sparad!**

#### **Scenario B: Failed Save**
```
❌ Problem identifierat:
ℹ️ Ending game session: memory
❌ Failed to end game session: [FEL-MEDDELANDE HÄR]
   Details: {sessionId: "...", error: "...", code: "..."}
ℹ️ Game session backed up to localStorage for retry
```
→ **Vi ser nu VAD som gick fel!**

#### **Scenario C: Retry Succeeded**
```
✅ Recovery fungerade:
🔄 Retrying 1 pending game sessions...
ℹ️ Ending game session: memory
ℹ️ Game session ended successfully: memory
✅ Successfully retried session: xxx
```
→ **Data återställd via retry!**

### **Steg 4: Rensa Logs (När Du Är Klar med Testning)**

I Console, kör:
```javascript
clearPersistentLogs()
```

Eller ladda om sidan flera gånger, så försvinner loggarna efter att de visats.

## 📊 **Vanliga Error-Meddelanden**

### **1. "Failed to end game session: relation does not exist"**
```
❌ Failed to end game session: relation "game_sessions" does not exist
```
**Orsak:** `game_sessions` tabellen finns inte i databasen  
**Lösning:** Behöver köra migrations för att skapa tabellen

### **2. "Failed to end game session: permission denied"**
```
❌ Failed to end game session: permission denied for table game_sessions
```
**Orsak:** RLS policies tillåter inte insert/update  
**Lösning:** Behöver fixa RLS policies för `game_sessions`

### **3. "Failed to end game session: null value"**
```
❌ Failed to end game session: null value in column violates not-null constraint
```
**Orsak:** Saknade required fields  
**Lösning:** Kontrollera vilka kolumner som är NOT NULL

### **4. "endGameSession: No session ID provided"**
```
⚠️ endGameSession: No session ID provided
```
**Orsak:** `startGameSession` returnerade null (antagligen också ett tabell-problem)  
**Lösning:** Samma som #1 - tabellen kanske inte finns

## 🔍 **Debug-Kommandon i Console**

### **Visa Logs:**
```javascript
displayPersistentLogs()
```

### **Rensa Logs:**
```javascript
clearPersistentLogs()
```

### **Se Pending Sessions:**
```javascript
// Kolla om det finns pending sessions som väntar på retry
Object.keys(localStorage).filter(k => k.startsWith('pendingSession_'))
```

### **Se En Pending Session:**
```javascript
// Om du hittar en pending session ovan, kolla detaljer:
const key = 'pendingSession_XXX' // Byt ut XXX
JSON.parse(localStorage.getItem(key))
```

## 📝 **Vad Händer Nu vs Tidigare**

### **Tidigare (Fel):**
```
1. Spel avslutas → void endGameSession() körs
2. endGameSession() kastar error
3. Error blir unhandled promise rejection → "N" visas
4. Console rensas vid logout → Kan inte se error
5. Data förlorad
```

### **Nu (Fixat):**
```
1. Spel avslutas → void endGameSession() körs
2. endGameSession() försöker spara
3. Om fel: Loggas persistent + backup i localStorage
4. Logout: Väntar 3 sekunder + försöker retry
5. Nästa login: Auto-retry från backup
6. Logs visas automatiskt i console!
```

## 🎯 **Vad Vi Förväntar Oss**

### **Om `game_sessions` Tabellen Finns:**
- ✅ Sessions sparas direkt
- ✅ Ingen error i logs
- ✅ Data synlig i teacher dashboard

### **Om `game_sessions` Tabellen INTE Finns:**
- ❌ Error i logs: "relation does not exist"
- ℹ️ Backup skapas i localStorage
- 🔄 Retry försöker igen nästa login (men misslyckas igen)
- ➡️ Vi vet nu att vi behöver fixa databasen!

## 🚀 **Nästa Steg Efter Testing**

Baserat på loggarna kan vi:

1. **Om inget error syns** → Kolla om timeout är för kort
2. **Om "relation does not exist"** → Skapa `game_sessions` tabell
3. **Om "permission denied"** → Fixa RLS policies
4. **Om "null value"** → Justera required fields

---

**Testa nu och dela med mig vad som visas i loggarna!** 🔍

Vi kommer äntligen att se VAD som orsakar problemet! 🎉


















