# Fixa Google Account Picker Problem

## Problem
När du klickar på "Fortsätt med Google" så får du inte se account picker med dina Google-konton. Istället måste du skriva in din Google-adress och lösenord manuellt.

## Lösning

### Steg 1: Verifiera Supabase Google OAuth Configuration

1. Gå till [Supabase Dashboard](https://supabase.com/dashboard)
2. Välj ditt projekt
3. Gå till **Authentication** → **Providers**
4. Klicka på **Google**
5. Kontrollera att:
   - ✅ Google provider är **Enabled**
   - ✅ **Authorized Client IDs** är korrekt konfigurerat
   - ✅ **Authorized Redirect URLs** inkluderar din callback URL

### Steg 2: Verifiera Google Cloud Console Configuration

1. Gå till [Google Cloud Console](https://console.cloud.google.com/)
2. Välj ditt projekt
3. Gå till **APIs & Services** → **Credentials**
4. Klicka på ditt OAuth 2.0 Client ID
5. Kontrollera att:
   - ✅ **Authorized JavaScript origins** inkluderar:
     - `https://edbbestqdwldryxuxkma.supabase.co`
     - `https://spellschool.se` (för produktion)
   - ✅ **Authorized redirect URIs** inkluderar:
     - `https://edbbestqdwldryxuxkma.supabase.co/auth/v1/callback`
     - `https://spellschool.se/auth/callback` (för produktion)

### Steg 3: Testa med Debug-logging

1. Öppna Developer Console (F12)
2. Gå till `https://spellschool.se`
3. Klicka på "Fortsätt med Google"
4. Kolla konsolen - du bör se:
   ```
   🔐 OAuth Configuration:
     - Current origin: https://spellschool.se
     - Redirect URL: https://spellschool.se/auth/callback?role=student
     - Role: student
   ```
5. Kolla Network-tabben för att se vilken URL som faktiskt anropas

### Steg 4: Verifiera att prompt=select_account skickas

När du klickar på "Fortsätt med Google", kolla Network-tabben i Developer Tools:
1. Sök efter requests till `accounts.google.com` eller `supabase.co/auth/v1/authorize`
2. Kolla query-parametrarna i URL:en
3. Du bör se `prompt=select_account` i URL:en

Om `prompt=select_account` inte finns i URL:en, betyder det att Supabase inte skickar queryParams korrekt.

### Steg 5: Alternativ lösning - Använd Supabase Auth UI

Om problemet kvarstår, kan du överväga att använda Supabase Auth UI som hanterar detta automatiskt:

```bash
npm install @supabase/auth-ui-react @supabase/auth-ui-shared
```

Men detta kräver större ändringar i koden.

## Vanliga orsaker

1. **Google Cloud Console konfiguration** - Redirect URIs måste matcha exakt
2. **Supabase Provider konfiguration** - Authorized Client IDs måste vara korrekt
3. **Browser cache** - Prova i Incognito/Private-fönster
4. **Google account session** - Om du redan är inloggad på ett konto kan Google hoppa över account picker

## Testa i Incognito-fönster

Prova att logga in med Google i ett Incognito/Private-fönster. Detta hjälper att:
- Undvika browser cache-problem
- Undvika befintliga Google-sessioner
- Se om account picker visas när ingen session finns

## Ytterligare debugging

Om problemet kvarstår efter att ha följt ovanstående steg:

1. Kolla Supabase logs för OAuth-fel
2. Kolla Google Cloud Console logs för OAuth-fel
3. Verifiera att `prompt=select_account` faktiskt skickas i OAuth-URL:en
4. Kontakta Supabase support om problemet kvarstår

