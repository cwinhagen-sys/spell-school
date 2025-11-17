# Google Workspace Setup Guide för Spell School

## ✅ Vad som redan är implementerat

### 1. Google Sign-in för elever
- ✅ Google OAuth-knapp på student signup-sidan
- ✅ Google sign-in på login-sidan
- ✅ Hantering av Google Workspace-konton
- ✅ Automatisk detektering av Workspace-domäner
- ✅ Tydliga felmeddelanden när Workspace inte är godkänt
- ✅ Databasstruktur för Google-relaterad data

### 2. Databasstruktur
- ✅ Kolumner för Google email, user ID, namn, profilbild
- ✅ Email source tracking (synthetic/google/manual)
- ✅ Workspace domain tracking
- ✅ Index för snabb lookup

### 3. API Routes (Placeholder)
- ✅ `/api/google-classroom/courses` - Hämta kurser
- ✅ `/api/google-classroom/students` - Hämta elever från kurs
- ✅ Autentisering och säkerhet implementerad
- ⚠️ Returnerar placeholder-respons tills Google Classroom API är konfigurerat

## 🔧 Vad du behöver göra för att aktivera Google Workspace

### Steg 1: Kör SQL Migration

Kör följande SQL i Supabase SQL Editor:

```sql
-- Fil: migrations/add_google_workspace_support.sql
-- Kör hela filen i Supabase SQL Editor
```

Detta lägger till alla nödvändiga kolumner i `profiles`-tabellen.

### Steg 2: Konfigurera Google OAuth i Supabase

1. Gå till Supabase Dashboard → Authentication → Providers
2. Aktivera **Google** provider
3. Lägg till **Authorized Client IDs** från Google Cloud Console
4. Spara ändringar

### Steg 3: Konfigurera Google Cloud Console

1. Gå till [Google Cloud Console](https://console.cloud.google.com/)
2. Välj ditt projekt
3. Gå till **APIs & Services** → **OAuth consent screen**
4. Konfigurera:
   - **App name**: Spell School
   - **User support email**: Din email
   - **Scopes**: Lägg till:
     - `https://www.googleapis.com/auth/userinfo.email`
     - `https://www.googleapis.com/auth/userinfo.profile`
5. Spara och fortsätt

### Steg 4: För IT-ansvarig - Godkänn Spell School

När du pratar med IT-ansvarig, behöver de:

1. **Godkänna Spell School i Google Workspace Admin Console**
   - Gå till [Google Admin Console](https://admin.google.com/)
   - Navigera till **Security** → **API Controls** → **Manage Third-Party App Access**
   - Sök efter "Spell School" eller ditt OAuth Client ID
   - Godkänn appen för hela organisationen eller specifika enheter

2. **Alternativt: Lägg till i Trusted Apps**
   - Gå till **Security** → **Access and data control** → **API Controls**
   - Lägg till Spell School som "Trusted App"

### Steg 5: Testa Google Sign-in

1. Gå till `/signup/student`
2. Klicka på "Continue with Google"
3. Välj ett Workspace-konto
4. Om det fungerar: Du kommer att loggas in automatiskt
5. Om det inte fungerar: Du får ett tydligt felmeddelande som förklarar att skolan inte har godkänt tjänsten ännu

## 📋 Vad som behöver göras för Google Classroom Import

### Nuvarande status
- ✅ UI för Google Classroom import finns på plats
- ✅ API routes är skapade men returnerar placeholder-respons
- ✅ Autentisering och säkerhet är implementerad
- ⚠️ Faktisk Google Classroom API-integration saknas

### För att aktivera Google Classroom Import:

#### 1. Aktivera Google Classroom API

```bash
# I Google Cloud Console:
# 1. Gå till APIs & Services → Library
# 2. Sök efter "Google Classroom API"
# 3. Klicka på "Enable"
```

#### 2. Lägg till Scopes i OAuth Consent Screen

Lägg till dessa scopes:
- `https://www.googleapis.com/auth/classroom.courses.readonly`
- `https://www.googleapis.com/auth/classroom.rosters.readonly`

#### 3. Environment Variables

Lägg till i `.env.local` och Vercel:

```env
GOOGLE_CLASSROOM_CLIENT_ID=din-client-id.apps.googleusercontent.com
GOOGLE_CLASSROOM_CLIENT_SECRET=din-client-secret
```

**OBS**: Dessa är SEPARATA från Supabase OAuth credentials. Du behöver:
- Supabase OAuth credentials (för sign-in)
- Google Classroom API credentials (för Classroom import)

#### 4. Implementera Token Exchange

Du behöver implementera logik för att:
1. Hämta Google access token från användarens session
2. Använda denna token för att göra Google Classroom API-anrop
3. Eller implementera separat OAuth flow för Classroom API

#### 5. Uppdatera API Routes

Uppdatera följande filer när Classroom API är aktiverat:
- `src/app/api/google-classroom/courses/route.ts`
- `src/app/api/google-classroom/students/route.ts`

## 🎯 Vad fungerar nu (utan Workspace-godkännande)

### ✅ Fungerar:
- Google sign-in med **personliga Google-konton** (@gmail.com)
- Tydliga felmeddelanden när Workspace inte är godkänt
- Alla manuella funktioner (skapa klass, lägg till elever, etc.)

### ⚠️ Fungerar INTE ännu:
- Google sign-in med **Workspace-konton** (tills IT-ansvarig godkänt)
- Google Classroom import (tills API är konfigurerat)

## 📝 Checklista för demo med IT-ansvarig

- [ ] Kör SQL migration (`migrations/add_google_workspace_support.sql`)
- [ ] Verifiera att Google OAuth är aktiverat i Supabase
- [ ] Testa Google sign-in med personligt konto (ska fungera)
- [ ] Testa Google sign-in med Workspace-konto (ska visa tydligt felmeddelande)
- [ ] Förbered demo av:
  - Student signup med Google-knapp
  - Tydligt felmeddelande när Workspace inte är godkänt
  - Manuell import-funktionalitet som fallback
- [ ] Förklara för IT-ansvarig vad som behöver godkännas

## 🔐 Säkerhet & GDPR

### Implementerat:
- ✅ Email source tracking för att veta varifrån emails kommer
- ✅ Workspace domain tracking för att identifiera skolor
- ✅ Struktur för consent management (databas-kolumner finns)

### Behöver implementeras senare:
- ⚠️ Consent management UI (när Google Classroom import aktiveras)
- ⚠️ Parental consent för elever under 13 år
- ⚠️ Privacy Policy uppdateringar för Google data

## 💡 Tips för demo

1. **Visa Google-knappen**: "Här kan elever logga in med sina Google-konton"
2. **Visa felmeddelandet**: "Om skolan inte har godkänt ännu, får elever detta tydliga meddelande"
3. **Visa fallback**: "Elever kan fortfarande använda användarnamn/lösenord"
4. **Förklara fördelar**: "När Workspace är godkänt, kan elever logga in med ett klick"
5. **Mention Classroom**: "Vi har också förberett för Google Classroom import när det är möjligt"

## 🚀 Nästa steg efter Workspace-godkännande

1. Testa Google sign-in med Workspace-konto
2. Verifiera att data sparas korrekt i databasen
3. Kontrollera att `workspace_domain` fylls i korrekt
4. Planera Google Classroom import-implementation

## 📞 Support

Om du stöter på problem:
1. Kontrollera Supabase logs för OAuth-fel
2. Kontrollera Google Cloud Console för OAuth-fel
3. Verifiera att environment variables är korrekt konfigurerade
4. Testa med personligt Google-konto först för att isolera Workspace-problem

