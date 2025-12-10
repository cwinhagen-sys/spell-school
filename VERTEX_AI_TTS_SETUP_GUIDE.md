# Vertex AI Text-to-Speech Setup Guide

Denna guide visar hur du konfigurerar Vertex AI Text-to-Speech med OAuth2-autentisering.

## Snabbstart (TL;DR)

1. Skapa Google Cloud Project
2. Aktivera "Cloud Text-to-Speech API"
3. Skapa Service Account med rollen "Cloud Text-to-Speech API User"
4. Ladda ner JSON-credentials
5. Lägg till `GOOGLE_APPLICATION_CREDENTIALS=./credentials.json` i `.env.local`
6. Sätt credentials-filen i projektets root
7. Starta om servern: `npm run dev`

**Detaljerade instruktioner följer nedan.**

## Steg 1: Skapa ett Google Cloud Project

1. Gå till [Google Cloud Console](https://console.cloud.google.com/)
2. Klicka på projekt-väljaren (överst till vänster)
3. Klicka på "New Project"
4. Ge projektet ett namn (t.ex. "spell-school-tts")
5. Klicka "Create"

## Steg 2: Aktivera Text-to-Speech API

1. I Google Cloud Console, gå till **APIs & Services** > **Library**
2. Sök efter "Cloud Text-to-Speech API"
3. Klicka på "Cloud Text-to-Speech API"
4. Klicka på "Enable" (Aktivera)

## Steg 3: Skapa ett Service Account

1. Gå till **IAM & Admin** > **Service Accounts**
2. Klicka på "Create Service Account"
3. Fyll i:
   - **Service account name**: `spell-school-tts` (eller valfritt namn)
   - **Service account ID**: genereras automatiskt
   - **Description**: `Service account for Text-to-Speech API`
4. Klicka "Create and Continue"
5. För **Role**, välj: **Cloud Text-to-Speech API User**
6. Klicka "Continue" och sedan "Done"

## Steg 4: Skapa och ladda ner nycklar (Credentials)

1. Gå tillbaka till **Service Accounts** (om du inte redan är där)
2. Hitta det service account du just skapade
3. Klicka på det (på email-adressen)
4. Gå till fliken **Keys**
5. Klicka på "Add Key" > "Create new key"
6. Välj **JSON** format
7. Klicka "Create"
8. En JSON-fil laddas ner automatiskt - **spara denna fil säkert!**

## Steg 5: Konfigurera miljövariabler

### För lokal utveckling (.env.local):

1. Öppna filen `.env.local` i projektets root
2. Lägg till följande (ersätt `path/to/credentials.json` med sökvägen till din nedladdade JSON-fil):

```env
GOOGLE_APPLICATION_CREDENTIALS=path/to/credentials.json
```

**OBS:** För Windows, använd absolut sökväg eller relativ sökväg från projektets root.

Exempel för Windows:
```env
GOOGLE_APPLICATION_CREDENTIALS=C:\Users\cwinh\Documents\GitHub\spell-school\credentials.json
```

Eller om du lägger filen i projektets root:
```env
GOOGLE_APPLICATION_CREDENTIALS=./credentials.json
```

### För produktion (Vercel/annat):

1. Ladda upp JSON-filen till din hosting-plattform som en environment variable
2. Alternativt, konvertera JSON-innehållet till base64 och lägg det i en env variabel

#### Alternativ 1: Lägga credentials direkt i .env (rekommenderat för Vercel)

1. Öppna JSON-filen du laddade ner
2. Kopiera hela innehållet
3. I Vercel Dashboard:
   - Gå till ditt projekt
   - **Settings** > **Environment Variables**
   - Lägg till ny variabel:
     - **Key**: `GOOGLE_SERVICE_ACCOUNT_KEY`
     - **Value**: Klistra in hela JSON-innehållet (som en lång sträng)
     - Välj alla environments (Production, Preview, Development)

4. Uppdatera koden för att läsa från denna variabel (se Steg 6)

## Steg 6: Installera paket (redan gjort)

Paketet `@google-cloud/text-to-speech` är redan installerat. Om du behöver installera det manuellt:

```bash
npm install @google-cloud/text-to-speech
```

## Steg 7: API-koden är redan uppdaterad

API-koden i `src/app/api/tts/vertex/route.ts` är redan uppdaterad för att använda OAuth2 med Service Account credentials.

## Steg 8: Testa

1. Starta utvecklingsservern: `npm run dev`
2. Testa Story Builder och se om TTS fungerar
3. Kontrollera terminalen för felmeddelanden

## Felsökning

### Fel: "API keys are not supported"
- **Lösning**: Du använder fortfarande API-nycklar. Följ steg 4-5 för att använda Service Account istället.

### Fel: "Could not load the default credentials"
- **Lösning**: 
  - Kontrollera att `GOOGLE_APPLICATION_CREDENTIALS` är satt korrekt i `.env.local`
  - Kontrollera att JSON-filen finns på den angivna sökvägen
  - För Windows, använd backslashes (`\`) eller forward slashes (`/`)

### Fel: "Permission denied" eller "403"
- **Lösning**: 
  - Kontrollera att Service Account har rätt roller (Cloud Text-to-Speech API User)
  - Kontrollera att Text-to-Speech API är aktiverat i projektet

### För produktion på Vercel:
- Använd `GOOGLE_SERVICE_ACCOUNT_KEY` environment variable med hela JSON-innehållet
- Koden kommer automatiskt skapa credentials från denna variabel vid runtime

## Ytterligare resurser

- [Google Cloud Text-to-Speech Documentation](https://cloud.google.com/text-to-speech/docs)
- [Service Account Authentication](https://cloud.google.com/docs/authentication/production)
- [Node.js Client Library](https://github.com/googleapis/nodejs-text-to-speech)

