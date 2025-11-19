# Vercel Environment Variables Setup Guide

## Problem
Azure Speech och ElevenLabs fungerar lokalt men inte i Vercel deployment trots att environment variables är tillagda.

## Lösning

### 1. Kontrollera att environment variables är korrekt konfigurerade i Vercel

1. Gå till ditt Vercel-projekt: https://vercel.com/dashboard
2. Välj ditt projekt (spell-school)
3. Gå till **Settings** → **Environment Variables**
4. Kontrollera att följande variabler finns:

```
AZURE_SPEECH_KEY=din_azure_key_här
AZURE_SPEECH_REGION=din_azure_region_här (t.ex. "swedencentral" eller "westeurope")
ELEVENLABS_API_KEY=din_elevenlabs_key_här
```

### 2. Viktiga punkter:

- **Inga mellanslag**: Se till att det inte finns mellanslag före eller efter `=` tecknet
- **Inga citattecken**: Lägg INTE in värdena i citattecken (`"` eller `'`)
- **Rätt miljö**: Se till att variablerna är tillgängliga för **Production**, **Preview**, och **Development** (eller åtminstone Production)

### 3. Efter att du har lagt till/uppdaterat environment variables:

**VIKTIGT**: Du måste göra en **ny deployment** för att environment variables ska laddas!

1. Gå till **Deployments** i Vercel
2. Klicka på de tre punkterna (`...`) på den senaste deploymenten
3. Välj **Redeploy**
4. Eller gör en ny commit och push till GitHub (detta triggar en automatisk deployment)

### 4. Testa att environment variables är tillgängliga:

Efter att du har gjort en ny deployment, testa debug-endpointen:

```
https://din-vercel-domän.vercel.app/api/debug/env-check
```

Detta kommer visa om environment variables är tillgängliga (utan att visa de faktiska värdena av säkerhetsskäl).

### 5. Kontrollera Vercel logs:

Om det fortfarande inte fungerar:

1. Gå till **Deployments** → Välj din senaste deployment
2. Klicka på **Functions** tab
3. Försök köra en flashcard-game och se loggarna för:
   - `/api/speech/pronunciation-assessment`
   - `/api/tts/elevenlabs`

Du bör se felmeddelanden om environment variables saknas.

### 6. Vanliga problem:

#### Problem: "Missing required env var: AZURE_SPEECH_KEY"
**Lösning**: 
- Kontrollera att variabeln är korrekt namngiven (exakt `AZURE_SPEECH_KEY`)
- Kontrollera att den är aktiverad för Production-miljön
- Gör en ny deployment

#### Problem: "Missing required env var: AZURE_SPEECH_REGION"
**Lösning**: 
- Kontrollera att variabeln är korrekt namngiven (exakt `AZURE_SPEECH_REGION`)
- Kontrollera att värdet är korrekt (t.ex. `swedencentral`, `westeurope`, `eastus`)
- Gör en ny deployment

#### Problem: "Missing required env var: ELEVENLABS_API_KEY"
**Lösning**: 
- Kontrollera att variabeln är korrekt namngiven (exakt `ELEVENLABS_API_KEY`)
- Kontrollera att den är aktiverad för Production-miljön
- Gör en ny deployment

### 7. Verifiera lokalt:

För att verifiera att dina environment variables fungerar lokalt, kontrollera din `.env.local` fil:

```env
AZURE_SPEECH_KEY=din_key_här
AZURE_SPEECH_REGION=din_region_här
ELEVENLABS_API_KEY=din_key_här
```

**OBS**: `.env.local` filer synkroniseras INTE automatiskt till Vercel. Du måste manuellt lägga till dem i Vercel dashboard.

### 8. Ytterligare debugging:

Om problemet kvarstår efter att du har följt alla steg ovan:

1. Testa debug-endpointen: `/api/debug/env-check`
2. Kontrollera Vercel logs för specifika felmeddelanden
3. Kontrollera att API-nycklarna är giltiga och inte har gått ut
4. Kontrollera att API-nycklarna har rätt behörigheter

## Snabb checklista:

- [ ] Environment variables är tillagda i Vercel dashboard
- [ ] Variablerna är aktiverade för Production-miljön
- [ ] Inga mellanslag eller citattecken i värdena
- [ ] En ny deployment har gjorts efter att variablerna lades till
- [ ] Debug-endpointen visar att variablerna finns
- [ ] API-nycklarna är giltiga och har rätt behörigheter




