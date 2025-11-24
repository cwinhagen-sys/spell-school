# Google Classroom Import - Setup Guide

Denna guide beskriver vad som behöver göras för att implementera Google Classroom import av elever.

## 1. Google Cloud Console Setup

### Steg 1: Aktivera Google Classroom API

1. Gå till [Google Cloud Console](https://console.cloud.google.com/)
2. Välj ditt projekt (eller skapa ett nytt)
3. Navigera till **APIs & Services** → **Library**
4. Sök efter "Google Classroom API"
5. Klicka på **Enable** för att aktivera API:et

### Steg 2: Konfigurera OAuth Consent Screen

1. Gå till **APIs & Services** → **OAuth consent screen**
2. Välj **External** (eller Internal om du har Google Workspace)
3. Fyll i:
   - **App name**: Spell School
   - **User support email**: Din email
   - **Developer contact information**: Din email
4. Lägg till **Scopes**:
   - `https://www.googleapis.com/auth/classroom.courses.readonly` - Läsa kurser
   - `https://www.googleapis.com/auth/classroom.rosters.readonly` - Läsa elever i kurser
   - `https://www.googleapis.com/auth/userinfo.email` - Läsa email (redan tillagd)
   - `https://www.googleapis.com/auth/userinfo.profile` - Läsa profil (redan tillagd)
5. Spara och fortsätt

### Steg 3: Skapa OAuth 2.0 Credentials

1. Gå till **APIs & Services** → **Credentials**
2. Klicka på **Create Credentials** → **OAuth client ID**
3. Välj **Web application**
4. Lägg till **Authorized redirect URIs**:
   - `https://your-supabase-project.supabase.co/auth/v1/callback` (för Supabase OAuth)
   - `http://localhost:3000/api/auth/google-classroom/callback` (för lokal utveckling)
5. Spara och kopiera **Client ID** och **Client Secret**

## 2. Environment Variables

Lägg till följande i din `.env.local` och Vercel:

```env
# Google Classroom API
GOOGLE_CLASSROOM_CLIENT_ID=din-client-id.apps.googleusercontent.com
GOOGLE_CLASSROOM_CLIENT_SECRET=din-client-secret
GOOGLE_CLASSROOM_REDIRECT_URI=http://localhost:3000/api/auth/google-classroom/callback
# För produktion: https://din-domän.vercel.app/api/auth/google-classroom/callback
```

## 3. Implementation Steps

### Steg 1: Skapa API Route för Google OAuth

Skapa `src/app/api/auth/google-classroom/route.ts`:

```typescript
import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const action = searchParams.get('action') // 'authorize' eller 'callback'
  
  if (action === 'authorize') {
    // Initiera OAuth flow
    const clientId = process.env.GOOGLE_CLASSROOM_CLIENT_ID
    const redirectUri = process.env.GOOGLE_CLASSROOM_REDIRECT_URI
    const scopes = [
      'https://www.googleapis.com/auth/classroom.courses.readonly',
      'https://www.googleapis.com/auth/classroom.rosters.readonly',
      'https://www.googleapis.com/auth/userinfo.email',
      'https://www.googleapis.com/auth/userinfo.profile'
    ].join(' ')
    
    const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?` +
      `client_id=${clientId}&` +
      `redirect_uri=${encodeURIComponent(redirectUri)}&` +
      `response_type=code&` +
      `scope=${encodeURIComponent(scopes)}&` +
      `access_type=offline&` +
      `prompt=consent`
    
    return NextResponse.redirect(authUrl)
  }
  
  // Handle callback...
}
```

### Steg 2: Skapa API Route för att hämta klassrum

Skapa `src/app/api/google-classroom/courses/route.ts`:

```typescript
import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get('authorization')
  if (!authHeader) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  
  try {
    const response = await fetch('https://classroom.googleapis.com/v1/courses?studentId=me&teacherId=me', {
      headers: {
        'Authorization': authHeader
      }
    })
    
    if (!response.ok) {
      throw new Error('Failed to fetch courses')
    }
    
    const data = await response.json()
    return NextResponse.json(data)
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
```

### Steg 3: Skapa API Route för att hämta elever från ett klassrum

Skapa `src/app/api/google-classroom/students/route.ts`:

```typescript
import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const courseId = searchParams.get('courseId')
  const authHeader = request.headers.get('authorization')
  
  if (!courseId || !authHeader) {
    return NextResponse.json({ error: 'Missing parameters' }, { status: 400 })
  }
  
  try {
    const response = await fetch(
      `https://classroom.googleapis.com/v1/courses/${courseId}/students`,
      {
        headers: {
          'Authorization': authHeader
        }
      }
    )
    
    if (!response.ok) {
      throw new Error('Failed to fetch students')
    }
    
    const data = await response.json()
    return NextResponse.json(data)
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
```

### Steg 4: Uppdatera UI för Google Classroom Import

I `src/app/teacher/add-students/page.tsx` och `src/app/teacher/classes/page.tsx`:

1. Lägg till state för Google OAuth token
2. Lägg till UI för att välja Google Classroom-klassrum
3. Implementera funktionalitet för att hämta och visa elever från Google Classroom
4. Mappa Google Classroom-elever till Spell School-format

## 4. Alternativ: Använd Supabase OAuth + Google Classroom API

Om du redan använder Supabase OAuth för Google login, kan du:

1. Spara Google access token i databasen när användaren loggar in
2. Använda denna token för att göra Google Classroom API-anrop
3. Skapa en API route som använder denna token

## 5. Säkerhetsöverväganden

- **Token Storage**: Spara access tokens säkert (krypterat i databasen)
- **Token Refresh**: Implementera token refresh för att hantera utgångna tokens
- **Permissions**: Se till att endast lärare kan importera elever
- **Rate Limiting**: Implementera rate limiting för Google Classroom API-anrop

## 6. Testning

1. Testa OAuth flow lokalt
2. Verifiera att du kan hämta klassrum
3. Testa att hämta elever från ett klassrum
4. Testa import-funktionaliteten

## 7. Produktionsdeployment

1. Uppdatera redirect URIs i Google Cloud Console
2. Lägg till environment variables i Vercel
3. Testa OAuth flow i produktion
4. Verifiera att alla API-anrop fungerar

## Ytterligare resurser

- [Google Classroom API Documentation](https://developers.google.com/classroom)
- [Google OAuth 2.0 Guide](https://developers.google.com/identity/protocols/oauth2)
- [Supabase OAuth Documentation](https://supabase.com/docs/guides/auth/social-login/auth-google)

## Noteringar

- Google Classroom API kräver att läraren har ett Google Workspace-konto eller ett personligt Google-konto med tillgång till Classroom
- Elever måste ha Google-konton för att kunna importeras
- Du kan behöva hantera fall där elever inte har Google-konton (manuell import)





