# Voice Recognition Game - Implementation Plan

## Spelkoncept
Eleven får ett ord från word set och ska säga ordet på engelska. Systemet ger feedback baserat på uttal.

## Tekniska Alternativ

### 1. Web Speech API (SpeechRecognition) - GRATIS
**Fördelar:**
- ✅ Gratis och inbyggt i moderna webbläsare
- ✅ Ingen API-nyckel behövs
- ✅ Fungerar direkt i webbläsaren
- ✅ Stöd för engelska (en-US, en-GB)

**Nackdelar:**
- ❌ Kan bara transkribera (konvertera tal till text), inte bedöma uttal
- ❌ Begränsad precision för uttalsbedömning
- ❌ Kräver manuell jämförelse mellan transkriberad text och rätt ord
- ❌ Ingen detaljerad feedback om specifika ljud/stavelser

**Implementering:**
- Använd `webkitSpeechRecognition` (Chrome/Edge) eller `SpeechRecognition` (Firefox)
- Jämför transkriberad text med rätt ord
- Ge feedback baserat på om orden matchar

**Kod-exempel:**
```typescript
const recognition = new (window.SpeechRecognition || window.webkitSpeechRecognition)()
recognition.lang = 'en-US'
recognition.continuous = false
recognition.interimResults = false

recognition.onresult = (event) => {
  const transcript = event.results[0][0].transcript.toLowerCase().trim()
  const expectedWord = currentWord.toLowerCase()
  
  if (transcript === expectedWord) {
    // Korrekt uttal
  } else {
    // Felaktigt uttal - ge feedback
  }
}
```

---

### 2. Azure Speech Service - BETALD
**Fördelar:**
- ✅ Har inbyggd **Pronunciation Assessment** API
- ✅ Ger detaljerad feedback: Accuracy Score, Fluency Score, Completeness Score
- ✅ Visar specifika ljud/stavelser som behöver förbättras
- ✅ Mycket mer precis än Web Speech API

**Nackdelar:**
- ❌ Kräver Azure-konto och API-nyckel
- ❌ Kostnad per användning (men relativt billigt)
- ❌ Kräver backend API-endpoint (kan inte köras direkt i webbläsaren)

**Kostnad:**
- ~$1 per 1000 requests (kan variera)
- Free tier: 5 timmar/månad

**Implementering:**
- Skapa API-endpoint: `/api/speech/pronunciation-assessment`
- Skicka ljudfil (WAV/MP3) från webbläsaren till Azure
- Få tillbaka detaljerad uttalsbedömning

---

### 3. Google Cloud Speech-to-Text - BETALD
**Fördelar:**
- ✅ Har pronunciation assessment features
- ✅ Mycket precis
- ✅ Bra dokumentation

**Nackdelar:**
- ❌ Kräver Google Cloud-konto
- ❌ Mer komplext att sätta upp än Azure
- ❌ Kräver backend API-endpoint

**Kostnad:**
- Liknande som Azure (~$1-2 per 1000 requests)

---

### 4. OpenAI Whisper API - BETALD
**Fördelar:**
- ✅ Mycket bra transkribering
- ✅ Stöd för många språk

**Nackdelar:**
- ❌ Ingen inbyggd pronunciation assessment
- ❌ Kräver manuell jämförelse (som Web Speech API)
- ❌ Kräver backend API-endpoint

---

## Rekommenderad Lösning

### Första Steget: Web Speech API (Gratis Prototyp)
1. Implementera grundfunktionalitet med Web Speech API
2. Jämför transkriberad text med rätt ord
3. Ge enkel feedback: "Korrekt!" eller "Försök igen"
4. Testa med användare

### Andra Steget: Azure Speech Service (Om mer precision behövs)
1. Om Web Speech API inte är tillräckligt precis
2. Implementera Azure Pronunciation Assessment
3. Ge detaljerad feedback om uttal

---

## Implementation Checklist

### Web Speech API Version (Gratis)
- [ ] Skapa ny game component: `PronunciationGame.tsx`
- [ ] Implementera SpeechRecognition
- [ ] Hantera mikrofon-tillstånd (permission, start, stop)
- [ ] Jämför transkriberad text med rätt ord
- [ ] Ge feedback (korrekt/felaktigt)
- [ ] Lägg till "Lyssna på rätt uttal" (text-to-speech)
- [ ] Lägg till i Games dropdown
- [ ] Integrera med tracking system

### Azure Speech Service Version (Betalning)
- [ ] Skapa Azure-konto
- [ ] Skapa Speech Service resource
- [ ] Hämta API-nyckel och region
- [ ] Skapa backend API: `/api/speech/pronunciation-assessment`
- [ ] Implementera ljudinspelning i webbläsaren (MediaRecorder API)
- [ ] Skicka ljudfil till backend
- [ ] Backend skickar till Azure
- [ ] Returnera detaljerad feedback till frontend
- [ ] Visa pronunciation score, fluency, completeness
- [ ] Visa specifika förbättringsområden

---

## Tekniska Detaljer

### Web Speech API Implementation
```typescript
// Browser support check
const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition

if (!SpeechRecognition) {
  // Fallback: Visa meddelande att webbläsaren inte stödjer
}

// Setup
const recognition = new SpeechRecognition()
recognition.lang = 'en-US'
recognition.continuous = false
recognition.interimResults = false
recognition.maxAlternatives = 1

// Start listening
recognition.start()

// Handle results
recognition.onresult = (event) => {
  const transcript = event.results[0][0].transcript.toLowerCase().trim()
  // Compare with expected word
}

// Handle errors
recognition.onerror = (event) => {
  // Handle errors (no speech detected, network error, etc.)
}
```

### Azure Speech Service Implementation
```typescript
// Frontend: Record audio
const mediaRecorder = new MediaRecorder(stream)
const chunks: Blob[] = []

mediaRecorder.ondataavailable = (event) => {
  chunks.push(event.data)
}

mediaRecorder.onstop = async () => {
  const audioBlob = new Blob(chunks, { type: 'audio/wav' })
  
  // Send to backend
  const formData = new FormData()
  formData.append('audio', audioBlob)
  formData.append('word', currentWord)
  
  const response = await fetch('/api/speech/pronunciation-assessment', {
    method: 'POST',
    body: formData
  })
  
  const result = await response.json()
  // result.accuracyScore, result.fluencyScore, etc.
}
```

---

## UX/UI Design

### Spel-flöde:
1. **Visa ord** - Stort ord i mitten av skärmen
2. **"Lyssna" knapp** - Spela upp rätt uttal (text-to-speech)
3. **"Säg ordet" knapp** - Starta röstigenkänning
4. **Feedback** - Visa om uttalet var korrekt eller felaktigt
5. **Nästa ord** - Automatiskt eller manuellt

### Feedback-visning:
- **Korrekt**: Grön checkmark + "Utmärkt uttal!"
- **Felaktigt**: Röd X + "Försök igen" + "Lyssna på rätt uttal"
- **Med Azure**: Visa score (Accuracy: 85%, Fluency: 90%) + specifika förbättringsområden

---

## Nästa Steg

1. **Besluta vilken lösning** - Börja med Web Speech API eller gå direkt till Azure?
2. **Skapa prototyp** - Implementera grundfunktionalitet
3. **Testa** - Se hur väl det fungerar med riktiga användare
4. **Iterera** - Förbättra baserat på feedback

---

## Frågor att Besvara

1. **Vilken precision behövs?** 
   - Web Speech API kan vara tillräckligt för enkla ord
   - Azure behövs för detaljerad feedback

2. **Budget?**
   - Web Speech API = Gratis
   - Azure = ~$1 per 1000 användare (kan bli dyrt vid många användare)

3. **Vilka webbläsare ska stödjas?**
   - Chrome/Edge: Fullt stöd för Web Speech API
   - Firefox: Begränsat stöd
   - Safari: Begränsat stöd

4. **Behövs offline-stöd?**
   - Web Speech API fungerar offline (i Chrome)
   - Azure kräver internetanslutning





