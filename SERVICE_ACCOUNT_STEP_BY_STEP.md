# Steg-för-steg: Skapa Service Account och ladda ner Credentials

## Del 1: Skapa Service Account

### Steg 1: Öppna Service Accounts
1. Gå till [Google Cloud Console](https://console.cloud.google.com/)
2. Välj ditt projekt (eller skapa ett nytt om du inte har ett)
3. I vänstermenyn, gå till **IAM & Admin** (hitta ikonen med en person)
4. Klicka på **Service Accounts**

### Steg 2: Skapa ny Service Account
1. Klicka på knappen **"+ CREATE SERVICE ACCOUNT"** (överst på sidan)
2. Fyll i följande:
   - **Service account name**: `spell-school-tts` (eller något du känner igen)
   - **Service account ID**: Fylls i automatiskt baserat på namnet
   - **Description**: `Service account for Text-to-Speech API` (valfritt)
3. Klicka på **"CREATE AND CONTINUE"** (blå knapp längst ner)

### Steg 3: Tilldela Roll
1. Under **"Grant this service account access to project"**:
   - I fältet **"Select a role"**, klicka på listrutan
   - **SÖK efter**: `Cloud Text-to-Speech API User`
   - Välj rollen: **"Cloud Text-to-Speech API User"**
2. Klicka på **"CONTINUE"** (blå knapp)

### Steg 4: Slutför skapandet
1. Du kan hoppa över "Grant users access to this service account" (lämna tomt)
2. Klicka på **"DONE"** (blå knapp)

✅ **Service Account är nu skapat!** Du bör se den i listan.

---

## Del 2: Ladda ner JSON-credentials

### Steg 1: Öppna Service Account-detaljer
1. I listan över Service Accounts, hitta den du just skapade (`spell-school-tts`)
2. **Klicka på email-adressen** (t.ex. `spell-school-tts@projekt-id.iam.gserviceaccount.com`)
   - Detta öppnar Service Account-detaljerna

### Steg 2: Gå till Keys-fliken
1. Uppe i menyn, klicka på fliken **"KEYS"**
   - Det finns flera flikar: PERMISSIONS, KEYS, DETAILS, etc.
   - Klicka på **"KEYS"**

### Steg 3: Skapa ny nyckel
1. Klicka på **"ADD KEY"** (överst till höger)
2. Välj **"Create new key"** från dropdown-menyn
3. En dialogruta öppnas:
   - Välj **"JSON"** (ruta nedanför)
   - Klicka på **"CREATE"** (blå knapp)
4. **En JSON-fil laddas ner automatiskt!** 
   - Filen kommer ha ett namn som: `projekt-id-xxxxx-xxxxx.json`
   - Den laddas ner till din nedladdningsmapp (t.ex. `C:\Users\cwinh\Downloads\`)

### Steg 4: Flytta och döp om filen (rekommenderat)
1. **Hitta den nedladdade filen** i din nedladdningsmapp
2. **Kopiera eller flytta** den till projektets root-mapp:
   - `C:\Users\cwinh\Documents\GitHub\spell-school\`
3. **Döp om filen** till `credentials.json` (enklare att komma ihåg)
   - Högerklicka på filen > Rename
   - Byt namn till: `credentials.json`

### Steg 5: Lägg till i .env.local
1. Öppna filen `.env.local` i projektets root
2. Lägg till denna rad (använd rätt sökväg):
   ```env
   GOOGLE_APPLICATION_CREDENTIALS=./credentials.json
   ```
   
   **Om filen inte ligger i root**, använd absolut sökväg:
   ```env
   GOOGLE_APPLICATION_CREDENTIALS=C:\Users\cwinh\Documents\GitHub\spell-school\credentials.json
   ```

3. **Spara filen**

### Steg 6: Lägg till credentials.json i .gitignore
**VIKTIGT:** Se till att credentials-filen inte committas till git!

1. Öppna `.gitignore` i projektets root
2. Lägg till dessa rader (om de inte redan finns):
   ```gitignore
   # Google Cloud credentials
   credentials.json
   *.json
   !package*.json
   !tsconfig*.json
   ```
3. **Spara filen**

---

## Verifiera att det fungerar

### Steg 1: Starta om servern
```bash
npm run dev
```

### Steg 2: Testa Story Builder
1. Öppna Story Builder i webbläsaren
2. Välj scenario, difficulty, och voice
3. Klicka "Generate Story"
4. Texten bör läsas upp med Vertex AI TTS

### Steg 3: Kontrollera terminalen
Om det fungerar, bör du **INTE** se några 401-fel.

Om du ser fel:
- **"Could not load the default credentials"**: Kontrollera att sökvägen i `.env.local` är korrekt
- **"Permission denied"**: Kontrollera att Service Account har rollen "Cloud Text-to-Speech API User"
- **"API not enabled"**: Kontrollera att "Cloud Text-to-Speech API" är aktiverat

---

## Felsökning

### Problem: Kan inte hitta "Cloud Text-to-Speech API User" roll
- **Lösning**: Sök efter `Text-to-Speech` istället, eller `texttospeech`
- Rollen kan också heta bara "Text-to-Speech API User"

### Problem: JSON-filen laddas inte ner
- **Lösning**: 
  - Kontrollera att popup-blockerare är avstängd
  - Försök igen, ibland tar det en sekund
  - Kolla din nedladdningsmapp manuellt

### Problem: "Could not load the default credentials"
- **Lösning**:
  - Kontrollera att filen finns på rätt plats
  - För Windows, använd antingen `/` eller `\\` i sökvägen
  - Prova absolut sökväg istället för relativ: `C:\Users\cwinh\Documents\GitHub\spell-school\credentials.json`

### Problem: Credentials-filen är för stor/kopierad felaktigt
- **Lösning**: Filen ska vara en JSON-fil med ungefär 10-15 rader
- Öppna filen i en textredigerare för att kontrollera att den är giltig JSON
- Den bör börja med `{` och sluta med `}`
- Innehåller fält som: `type`, `project_id`, `private_key`, `client_email`, etc.

---

## Nästa steg

När credentials är konfigurerade och servern körs utan fel, är Vertex AI TTS redo att användas! 🎉


