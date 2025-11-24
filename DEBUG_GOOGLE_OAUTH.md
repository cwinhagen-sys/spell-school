# Debug Google OAuth Account Picker

## Problem
När du klickar på "Fortsätt med Google" så får du inte se account picker med dina Google-konton. Istället måste du skriva in din Google-adress och lösenord manuellt.

## Steg för att debugga

### Steg 1: Kolla Network-tabben

1. Öppna Developer Tools (F12)
2. Gå till **Network**-tabben
3. Klicka på "Fortsätt med Google"
4. Sök efter requests till `accounts.google.com` eller `supabase.co/auth`
5. Klicka på requesten som heter `auth?access_type=offline&client_id=...`
6. Gå till fliken **Headers**
7. Kopiera hela **Request URL** eller **Location** (om det är en redirect)

### Steg 2: Kontrollera om prompt=select_account finns i URL:en

I URL:en du kopierade, sök efter `prompt=select_account`. 

**Om det INTE finns:**
- Supabase skickar inte queryParams korrekt till Google
- Detta är ett känt problem med Supabase OAuth
- Lösning: Kontakta Supabase support eller använd en workaround

**Om det FINNS:**
- Google ignorerar prompt-parametern av någon anledning
- Detta kan bero på Google-konfiguration eller browser-inställningar

### Steg 3: Verifiera Supabase Dashboard Configuration

1. Gå till Supabase Dashboard → Authentication → Providers → Google
2. Kontrollera att **Authorized Client IDs** är korrekt
3. Kontrollera att **Authorized Redirect URLs** inkluderar:
   - `https://edbbestqdwldryxuxkma.supabase.co/auth/v1/callback`
   - `https://spellschool.se/auth/callback`

### Steg 4: Verifiera Google Cloud Console

1. Gå till Google Cloud Console → APIs & Services → Credentials
2. Klicka på ditt OAuth 2.0 Client ID
3. Kontrollera **Authorized redirect URIs**:
   - `https://edbbestqdwldryxuxkma.supabase.co/auth/v1/callback`
   - `https://spellschool.se/auth/callback`

### Steg 5: Testa i Incognito-fönster

Prova att logga in med Google i ett Incognito/Private-fönster. Detta hjälper att:
- Undvika browser cache-problem
- Undvika befintliga Google-sessioner
- Se om account picker visas när ingen session finns

## Workaround om prompt=select_account inte fungerar

Om Supabase inte skickar `prompt=select_account` korrekt, kan du:

1. **Logga ut från alla Google-konton** innan du testar
2. **Använd Incognito/Private-fönster** för att tvinga fram account picker
3. **Kontakta Supabase support** om detta är ett känt problem

## Ytterligare debugging

Kolla konsolen när du klickar på "Fortsätt med Google" - du bör se:
```
🔐 OAuth Configuration:
  - Current origin: https://spellschool.se
  - Redirect URL: https://spellschool.se/auth/callback?role=student
  - QueryParams: { prompt: 'select_account', ... }
```

Om QueryParams visas korrekt men account picker inte visas, är problemet i Supabase eller Google-konfigurationen.





