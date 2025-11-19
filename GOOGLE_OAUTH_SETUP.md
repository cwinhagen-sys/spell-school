# Google OAuth Setup Guide för Spell School

## Problem: Google visar Supabase-domänen i OAuth-meddelandet

När användare loggar in med Google Auth ser de meddelandet:
- "Välj ett konto"
- "om du vill fortsätta till edbbestqdwldryxuxkma.supabase.co"

Detta beror på att Google visar callback URL:en i OAuth consent screen.

## Lösningar

### Lösning 1: Förbättra Google Cloud Console-inställningar (Gratis)

Även om callback URL:en fortfarande visas, kan vi förbättra användarupplevelsen:

1. **Gå till Google Cloud Console**
   - Besök: https://console.cloud.google.com/
   - Välj ditt projekt

2. **OAuth Consent Screen**
   - Gå till: APIs & Services > OAuth consent screen
   - Säkerställ att:
     - **App name**: "Spell School"
     - **User support email**: Din e-post
     - **App logo**: Ladda upp Spell School-logotypen (om möjligt)
     - **Application home page**: Din Vercel-domän (t.ex. `https://spell-school.vercel.app`)
     - **Privacy Policy link**: `https://din-domän.vercel.app/privacy`
     - **Terms of Service link**: `https://din-domän.vercel.app/terms`
     - **Authorized domains**: Lägg till din Vercel-domän

3. **Spara ändringar**
   - Klicka på "Save and Continue"
   - Vänta på att ändringarna träder i kraft (kan ta några minuter)

### Lösning 2: Använd Custom Domain för Supabase (Kostar pengar)

För att helt ändra callback URL:en till "Spell School" behöver du:

1. **Supabase Custom Domain** (kostar extra)
   - Gå till Supabase Dashboard > Settings > Custom Domains
   - Konfigurera en custom domain (t.ex. `auth.spellschool.se`)
   - Detta kräver DNS-konfiguration och kan kosta extra

2. **Uppdatera Google OAuth**
   - Uppdatera callback URL:en i Google Cloud Console till din custom domain
   - Uppdatera redirect URL:en i Supabase Dashboard

## Nuvarande Status

- ✅ App name är satt till "Spell School" i Google Cloud Console
- ✅ Privacy Policy och Terms of Service länkar är konfigurerade
- ⚠️ Callback URL:en kommer fortfarande att visa Supabase-domänen (detta är Googles beteende)

## Rekommendation

För nu är det bäst att:
1. Säkerställa att "App name" är korrekt satt (vilket det redan är)
2. Informera användare att de kan lita på att det är Spell School även om Supabase-domänen visas
3. Överväga custom domain i framtiden om budget tillåter

## Ytterligare Förbättringar

Du kan också lägga till en informativ text på inloggningssidan som förklarar att:
- "När du loggar in med Google kan du se en Supabase-domän i meddelandet"
- "Detta är normalt och säkert - det är Spell School som använder Google Auth"




