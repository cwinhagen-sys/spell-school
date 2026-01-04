# Supabase Email Verification Setup Guide

## Problem: Email verification links går till production istället för localhost

### Lösning: Konfigurera Site URL i Supabase

1. **Gå till Supabase Dashboard**
   - Logga in på [supabase.com](https://supabase.com)
   - Välj ditt projekt

2. **Gå till Authentication Settings**
   - I vänstermenyn: **Authentication** → **URL Configuration**

3. **Uppdatera Site URL för development**
   - **Site URL**: `http://localhost:3000`
   - Detta används när du utvecklar lokalt

4. **Lägg till Redirect URLs**
   I fältet "Redirect URLs", lägg till både development och production:
   ```
   http://localhost:3000/auth/callback
   https://din-production-url.com/auth/callback
   ```

5. **För Production (när du deployar)**
   När du deployar till production, uppdatera Site URL till din produktion-URL:
   - **Site URL**: `https://din-production-url.com`
   - Lägg till både localhost och production i Redirect URLs så du kan testa båda

### Alternativ: Använd environment-specific Site URL

Supabase stödjer inte olika Site URLs för olika miljöer direkt, men du kan:
1. Ha två separata Supabase-projekt (en för dev, en för prod) - **rekommenderat**
2. Eller ändra Site URL manuellt när du byter miljö (inte praktiskt)

## Email Templates

Om du vill anpassa email-meddelandet:
1. **Authentication** → **Email Templates** → **Confirm signup**
2. Du kan ändra innehållet, men se till att behålla `{{ .ConfirmationURL }}`

Se `SUPABASE_EMAIL_CUSTOMIZATION.md` för detaljerad guide om hur du anpassar email-innehåll och avsändare.

## Testa

Efter att du har uppdaterat Site URL:
1. Skapa ett nytt testkonto
2. Kolla att verifieringslänken går till `http://localhost:3000/auth/callback?token=...`
3. Efter verifiering ska du loggas in automatiskt


## Problem: Email verification links går till production istället för localhost

### Lösning: Konfigurera Site URL i Supabase

1. **Gå till Supabase Dashboard**
   - Logga in på [supabase.com](https://supabase.com)
   - Välj ditt projekt

2. **Gå till Authentication Settings**
   - I vänstermenyn: **Authentication** → **URL Configuration**

3. **Uppdatera Site URL för development**
   - **Site URL**: `http://localhost:3000`
   - Detta används när du utvecklar lokalt

4. **Lägg till Redirect URLs**
   I fältet "Redirect URLs", lägg till både development och production:
   ```
   http://localhost:3000/auth/callback
   https://din-production-url.com/auth/callback
   ```

5. **För Production (när du deployar)**
   När du deployar till production, uppdatera Site URL till din produktion-URL:
   - **Site URL**: `https://din-production-url.com`
   - Lägg till både localhost och production i Redirect URLs så du kan testa båda

### Alternativ: Använd environment-specific Site URL

Supabase stödjer inte olika Site URLs för olika miljöer direkt, men du kan:
1. Ha två separata Supabase-projekt (en för dev, en för prod) - **rekommenderat**
2. Eller ändra Site URL manuellt när du byter miljö (inte praktiskt)

## Email Templates

Om du vill anpassa email-meddelandet:
1. **Authentication** → **Email Templates** → **Confirm signup**
2. Du kan ändra innehållet, men se till att behålla `{{ .ConfirmationURL }}`

Se `SUPABASE_EMAIL_CUSTOMIZATION.md` för detaljerad guide om hur du anpassar email-innehåll och avsändare.

## Testa

Efter att du har uppdaterat Site URL:
1. Skapa ett nytt testkonto
2. Kolla att verifieringslänken går till `http://localhost:3000/auth/callback?token=...`
3. Efter verifiering ska du loggas in automatiskt

