# Fixa Localhost OAuth Redirect Problem

## Problem
När du försöker logga in med Google OAuth på `localhost:3000` så redirectar det till produktions-versionen (`spellschool.se`) istället.

## ⚠️ VIKTIGT: Detta är ett Supabase Dashboard-konfigurationsproblem

Koden är korrekt - problemet är att Supabase validerar redirect URLs mot en whitelist. Om `localhost:3000` inte finns i listan, kommer Supabase att använda den första giltiga URL:en (oftast produktions-URL:en).

## Lösning

### Steg 1: Lägg till localhost i Supabase Redirect URLs

1. Gå till [Supabase Dashboard](https://supabase.com/dashboard)
2. Välj ditt projekt (det som matchar din `.env.local`)
3. Gå till **Authentication** (vänstermenyn)
4. Klicka på **URL Configuration** (under Authentication)
5. Under **Redirect URLs**, lägg till:
   ```
   http://localhost:3000/auth/callback
   ```
   **VIKTIGT**: Lägg till exakt denna URL, inklusive `http://` (inte `https://`)
6. Klicka på **Save** (längst ned på sidan)

### Steg 2: Verifiera Site URL

I samma sektion (**URL Configuration**):
- **Site URL** kan vara tom eller satt till `http://localhost:3000`
- Detta påverkar inte OAuth redirects, men kan vara bra att ha korrekt

### Steg 3: Rensa cookies och cache

Efter att ha ändrat inställningarna i Supabase:
1. Rensa cookies för `localhost:3000` i din webbläsare
2. Rensa cache (Ctrl+Shift+Delete i Chrome/Edge)
3. Eller använd en Incognito/Private-fönster för att testa

### Steg 4: Testa med debug-logging

1. Öppna Developer Console (F12)
2. Gå till `http://localhost:3000`
3. Klicka på "Logga in med Google"
4. Kolla konsolen - du bör se:
   ```
   🔐 OAuth Configuration:
     - Current origin: http://localhost:3000
     - Redirect URL: http://localhost:3000/auth/callback?role=student
   ```
5. Om redirect URL är korrekt men du ändå redirectas till produktions-versionen, är problemet i Supabase Dashboard

### Steg 5: Verifiera att du använder rätt Supabase-projekt

Kontrollera att din `.env.local` har samma Supabase-projekt som du konfigurerar:
```env
NEXT_PUBLIC_SUPABASE_URL=https://edbbestqdwldryxuxkma.supabase.co
```

Om du har flera Supabase-projekt, se till att du konfigurerar rätt projekt!

### Steg 6: Testa med debug-sidan

Jag har skapat en debug-sida för att testa OAuth:
1. Gå till `http://localhost:3000/debug/oauth-test`
2. Klicka på "Test Google OAuth"
3. Kolla debug-informationen som visas
4. Detta hjälper dig att se exakt vad som skickas till Supabase

## Ytterligare tips

### Om problemet kvarstår:

1. **Rensa cookies och cache** i din webbläsare
2. **Kontrollera konsolen** för eventuella felmeddelanden
3. **Verifiera att du använder rätt Supabase-projekt** (samma som i `.env.local`)
4. **Kontrollera att `.env.local` har rätt värden**:
   ```env
   NEXT_PUBLIC_SUPABASE_URL=https://din-projekt-id.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=din-anon-key
   ```

### För produktion:

Se till att även produktions-URL:en är tillagd:
```
https://spellschool.se/auth/callback
```

## Varför händer detta?

Supabase validerar alla OAuth redirect URLs mot en whitelist för säkerhet. Om `localhost:3000` inte finns i listan, kommer Supabase att använda den första giltiga URL:en i listan (oftast produktions-URL:en) eller en standard-URL.

Koden i `src/lib/google-auth.ts` använder `window.location.origin` vilket är korrekt, men Supabase validerar ändå mot sin whitelist innan redirect sker.

