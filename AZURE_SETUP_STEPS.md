# Azure Speech Service - Snabb Start Guide

## ✅ Steg 1: Skapa Azure Speech Service Resource

1. **Gå till Azure Portal**: https://portal.azure.com
2. **Klicka på "Create a resource"** (eller "Skapa en resurs")
3. **Sök efter "Speech"** och välj "Speech Services"
4. **Klicka "Create"** och fyll i:
   - **Subscription**: Välj din prenumeration
   - **Resource Group**: Skapa ny eller välj befintlig
   - **Region**: Välj "West Europe" eller "North Europe" (närmast Sverige)
   - **Name**: `spell-school-speech` (eller valfritt namn)
   - **Pricing tier**: Välj **"Free F0"** (5 timmar/månad gratis)
5. **Klicka "Review + create"** → **"Create"**
6. **Vänta** på att resursen skapas (1-2 minuter)

---

## ✅ Steg 2: Hämta API-nyckel och Region

1. **Gå till din Speech Service Resource** i Azure Portal
2. **Klicka på "Keys and Endpoint"** i vänstermenyn
3. **Kopiera:**
   - **KEY 1** (eller KEY 2 - båda fungerar)
   - **REGION** (t.ex. "westeurope" eller "northeurope")
4. **Spara dessa värden säkert!**

---

## ✅ Steg 3: Lägg till Miljövariabler

1. **Öppna `.env.local`** i projektets root-mapp
2. **Lägg till dessa rader:**
```env
AZURE_SPEECH_KEY=din_api_nyckel_här
AZURE_SPEECH_REGION=din_region_här
```

**Exempel:**
```env
AZURE_SPEECH_KEY=abc123def456ghi789jkl012mno345pqr678
AZURE_SPEECH_REGION=westeurope
```

3. **Spara filen**

---

## ✅ Steg 4: Om du använder Vercel eller annan hosting

1. **Gå till din hosting-plattform** (t.ex. Vercel)
2. **Settings** → **Environment Variables**
3. **Lägg till:**
   - `AZURE_SPEECH_KEY` = din API-nyckel
   - `AZURE_SPEECH_REGION` = din region
4. **Redeploy** din applikation

---

## ✅ Steg 5: Testa

1. **Starta utvecklingsservern:**
   ```bash
   npm run dev
   ```

2. **Gå till Games-menyn** i applikationen
3. **Välj "Pronunciation"** (eller vad vi kallar det)
4. **Testa med ett ord:**
   - Klicka på "Lyssna på rätt uttal"
   - Klicka på "Säg ordet"
   - Säga ordet högt och tydligt
   - Se feedback om uttalet

---

## ⚠️ Viktiga Noteringar

### Mikrofon-tillstånd
- Webbläsaren kommer be om tillstånd att använda mikrofon
- **Tillåt** mikrofon-tillstånd för att spelet ska fungera
- **Chrome/Edge** har bäst stöd
- **Firefox/Safari** kan ha begränsningar

### Ljudformat
- Spelet spelar in i **WebM-format** (webbläsarens standard)
- Backend konverterar till WAV för Azure
- Om du får fel, kontrollera att ljudfilen är korrekt formaterad

### Kostnad
- **Free Tier**: 5 timmar/månad gratis
- **Standard Tier**: ~$1 per 1000 requests
- Börja med Free tier för att testa!

---

## 🐛 Felsökning

### "Invalid subscription key"
- ✅ Kontrollera att API-nyckeln är korrekt kopierad (inga extra mellanslag)
- ✅ Kontrollera att miljövariabeln är satt korrekt i `.env.local`

### "Region not found"
- ✅ Kontrollera att region-namnet är korrekt (t.ex. "westeurope", inte "West Europe")
- ✅ Se Azure Portal för exakt region-namn under "Keys and Endpoint"

### Mikrofon fungerar inte
- ✅ Kontrollera att webbläsaren har tillstånd att använda mikrofon
- ✅ Testa i Chrome eller Edge (bäst stöd)
- ✅ Kontrollera systeminställningar för mikrofon

### "Failed to assess pronunciation"
- ✅ Kontrollera att Azure-nyckeln och region är korrekt
- ✅ Kontrollera konsolen för detaljerade felmeddelanden
- ✅ Testa att Azure Speech Service är aktiv i Azure Portal

---

## 📚 Ytterligare Resurser

- [Azure Speech Service Dokumentation](https://learn.microsoft.com/en-us/azure/ai-services/speech-service/)
- [Pronunciation Assessment API](https://learn.microsoft.com/en-us/azure/ai-services/speech-service/how-to-pronunciation-assessment)
- [Azure Portal](https://portal.azure.com)

---

## 🎉 Klar!

När du har följt dessa steg är Azure Speech Service redo att användas! 

**Nästa steg:** Testa pronunciation-spelet i applikationen och se hur det fungerar.





