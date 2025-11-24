# Azure Speech Service Setup Guide

## Steg 1: Skapa Azure-konto och Speech Service Resource

1. **Gå till Azure Portal**
   - Besök: https://portal.azure.com
   - Logga in eller skapa ett nytt konto (gratis konto ger $200 kredit)

2. **Skapa Speech Service Resource**
   - Klicka på "Create a resource" (eller "Skapa en resurs")
   - Sök efter "Speech"
   - Välj "Speech Services"
   - Klicka "Create" (Skapa)

3. **Fyll i formuläret:**
   - **Subscription**: Välj din prenumeration (eller skapa en ny)
   - **Resource Group**: Skapa ny eller välj befintlig
   - **Region**: Välj närmaste region (t.ex. "West Europe" för Sverige)
   - **Name**: Ge ett namn (t.ex. "spell-school-speech")
   - **Pricing tier**: Välj "Free F0" för att börja (5 timmar/månad gratis)
   - Klicka "Review + create" och sedan "Create"

4. **Vänta på att resursen skapas** (tar 1-2 minuter)

---

## Steg 2: Hämta API-nyckel och Region

1. **Gå till din Speech Service Resource**
   - I Azure Portal, gå till "All resources" (Alla resurser)
   - Klicka på din Speech Service resource

2. **Hämta nycklar:**
   - I vänstermenyn, klicka på "Keys and Endpoint" (Nycklar och slutpunkt)
   - Du kommer se två nycklar (Key 1 och Key 2) - använd vilken som helst
   - Kopiera **KEY 1** (eller KEY 2)
   - Kopiera också **REGION** (t.ex. "westeurope", "northeurope")

3. **Spara dessa värden säkert!**

---

## Steg 3: Lägg till miljövariabler

1. **Öppna `.env.local` filen** i projektets root-mapp

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

4. **Om du använder Vercel eller annan hosting:**
   - Lägg till samma variabler i din hosting-plattforms miljövariabler
   - I Vercel: Settings → Environment Variables

---

## Steg 4: Installera Azure Speech SDK (om behövs)

Azure Speech Service kan användas via REST API, så vi behöver inte installera någon SDK. Vi kommer använda fetch() direkt.

---

## Steg 5: Testa implementationen

1. **Starta utvecklingsservern:**
   ```bash
   npm run dev
   ```

2. **Gå till pronunciation game** via Games-menyn

3. **Testa med ett ord:**
   - Klicka på "Säg ordet"
   - Säga ordet högt och tydligt
   - Se feedback om uttalet

---

## Kostnad och Begränsningar

### Free Tier (F0):
- ✅ 5 timmar per månad gratis
- ✅ Perfekt för testning och små projekt
- ⚠️ Begränsad till 5 timmar/månad

### Standard Tier (S0):
- 💰 ~$1 per 1000 requests (eller per timme, beroende på användning)
- ✅ Obegränsad användning
- ✅ Bättre prestanda

**Rekommendation:** Börja med Free tier för att testa, uppgradera när du behöver mer.

---

## Felsökning

### Problem: "Invalid subscription key"
- ✅ Kontrollera att API-nyckeln är korrekt kopierad (inga extra mellanslag)
- ✅ Kontrollera att miljövariabeln är satt korrekt

### Problem: "Region not found"
- ✅ Kontrollera att region-namnet är korrekt (t.ex. "westeurope", inte "West Europe")
- ✅ Se Azure Portal för exakt region-namn

### Problem: Mikrofon fungerar inte
- ✅ Kontrollera att webbläsaren har tillstånd att använda mikrofon
- ✅ Testa i Chrome eller Edge (bäst stöd)
- ✅ Kontrollera systeminställningar för mikrofon

---

## Ytterligare Resurser

- [Azure Speech Service Dokumentation](https://learn.microsoft.com/en-us/azure/ai-services/speech-service/)
- [Pronunciation Assessment API](https://learn.microsoft.com/en-us/azure/ai-services/speech-service/how-to-pronunciation-assessment)
- [Azure Portal](https://portal.azure.com)






