# Supabase Email Customization Guide

## Anpassa Email-meddelanden från Spell School

### 1. Ändra "From" Address (Avsändare)

**Via Supabase Dashboard:**

1. Gå till **Authentication** → **Settings** → **Email**
2. Hitta fältet **"Email From"** eller **"Sender Email"**
3. Ändra till: `Spell School <noreply@spell-school.com>` eller ditt domännamn
   - Exempel: `noreply@din-domän.se`
   - Notera: För att använda custom domän måste du konfigurera SMTP (se nedan)

**Alternativ: Använd SMTP med custom domain (Rekommenderat för production)**

För att ha full kontroll över email-avsändare och få professionellt utseende:

1. **Authentication** → **Settings** → **SMTP Settings**
2. Aktivera **"Enable Custom SMTP"**
3. Använd en email-service som:
   - **SendGrid** (gratis nivå: 100 emails/dag)
   - **Mailgun** (gratis nivå: 5000 emails/månad)
   - **AWS SES** (mycket billigt)
   - **Postmark** (bra för transaktions-email)

4. Konfigurera SMTP-inställningar med din service
5. Ställ in "From" address till: `Spell School <noreply@din-domän.se>`

### 2. Anpassa Email-innehåll (Email Templates)

**Via Supabase Dashboard:**

1. Gå till **Authentication** → **Email Templates**
2. Välj **"Confirm signup"** (för email-verifiering)
3. Klicka på **"Edit"** eller **"Customize"**

#### Standard Template Variabler

Supabase använder Go-templates. Här är tillgängliga variabler:

- `{{ .ConfirmationURL }}` - Länken för att verifiera email
- `{{ .SiteURL }}` - Din Site URL
- `{{ .Email }}` - Användarens email-adress
- `{{ .Token }}` - Verifierings-token (används i ConfirmationURL)
- `{{ .TokenHash }}` - Hashad version av token
- `{{ .RedirectTo }}` - Redirect URL efter verifiering

#### Exempel: Anpassad Email Template

```html
<h2>Välkommen till Spell School!</h2>

<p>Hej!</p>

<p>Tack för att du registrerade dig på Spell School. För att aktivera ditt konto, klicka på länken nedan:</p>

<p><a href="{{ .ConfirmationURL }}">Verifiera min email-adress</a></p>

<p>Om knappen inte fungerar, kopiera och klistra in denna länk i din webbläsare:</p>
<p>{{ .ConfirmationURL }}</p>

<p>Denna länk är giltig i 24 timmar.</p>

<p>Om du inte skapade detta konto kan du ignorera detta meddelande.</p>

<p>Med vänliga hälsningar,<br>
Spell School Team</p>
```

#### För HTML Email (rekommenderat)

Du kan använda HTML för att göra emailen snyggare:

```html
<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: linear-gradient(135deg, #f59e0b 0%, #ea580c 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
    .content { background: #f9fafb; padding: 30px; border-radius: 0 0 10px 10px; }
    .button { display: inline-block; background: #f59e0b; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; margin: 20px 0; }
    .footer { text-align: center; color: #6b7280; font-size: 12px; margin-top: 30px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>Spell School</h1>
    </div>
    <div class="content">
      <h2>Välkommen till Spell School!</h2>
      <p>Hej!</p>
      <p>Tack för att du registrerade dig på Spell School. För att aktivera ditt lärarkonto, klicka på knappen nedan:</p>
      <p style="text-align: center;">
        <a href="{{ .ConfirmationURL }}" class="button">Verifiera min email-adress</a>
      </p>
      <p>Eller kopiera och klistra in denna länk i din webbläsare:</p>
      <p style="word-break: break-all; color: #6b7280;">{{ .ConfirmationURL }}</p>
      <p><strong>Denna länk är giltig i 24 timmar.</strong></p>
      <p>Om du inte skapade detta konto kan du ignorera detta meddelande.</p>
      <p>Med vänliga hälsningar,<br><strong>Spell School Team</strong></p>
    </div>
    <div class="footer">
      <p>© 2024 Spell School. Alla rättigheter förbehållna.</p>
    </div>
  </div>
</body>
</html>
```

### 3. Ytterligare Email Templates

Du kan också anpassa:

- **Magic Link** - För "Log in with magic link"
- **Change Email Address** - När användare ändrar email
- **Reset Password** - För återställning av lösenord
- **Email Change** - Bekräftelse vid email-ändring

### 4. Tips för bästa resultat

1. **Testa emailen** - Skicka ett test-meddelande till dig själv
2. **Använd ditt varumärke** - Inkludera Spell School-logotyp om möjligt (via HTML email)
3. **Tydlig call-to-action** - Gör verifieringslänken tydlig och lätt att klicka på
4. **Mobile-friendly** - Se till att emailen ser bra ut på mobil också
5. **Språk** - Anpassa språket till svenska (eller engelska beroende på målgrupp)

### 5. Ytterligare anpassningar

**Via Supabase Dashboard → Authentication → Settings:**

- **Email Auth** - Aktivera/deaktivera email-baserad autentisering
- **Confirm email** - Kräv email-verifiering (redan aktiverat)
- **Secure email change** - Kräv verifiering vid email-ändring
- **Email template rate limit** - Begränsa antal emails som skickas

### Noteringar

- **Standard Supabase email** använder `noreply@mail.app.supabase.io` som avsändare
- För att ändra detta behöver du antingen:
  - Använda SMTP med custom domain (bäst för production)
  - Eller kontakta Supabase support för custom sender (om tillgängligt)

### Rekommendation

För production: Konfigurera SMTP med egen domän för professionellt utseende och bättre leverans.







## Anpassa Email-meddelanden från Spell School

### 1. Ändra "From" Address (Avsändare)

**Via Supabase Dashboard:**

1. Gå till **Authentication** → **Settings** → **Email**
2. Hitta fältet **"Email From"** eller **"Sender Email"**
3. Ändra till: `Spell School <noreply@spell-school.com>` eller ditt domännamn
   - Exempel: `noreply@din-domän.se`
   - Notera: För att använda custom domän måste du konfigurera SMTP (se nedan)

**Alternativ: Använd SMTP med custom domain (Rekommenderat för production)**

För att ha full kontroll över email-avsändare och få professionellt utseende:

1. **Authentication** → **Settings** → **SMTP Settings**
2. Aktivera **"Enable Custom SMTP"**
3. Använd en email-service som:
   - **SendGrid** (gratis nivå: 100 emails/dag)
   - **Mailgun** (gratis nivå: 5000 emails/månad)
   - **AWS SES** (mycket billigt)
   - **Postmark** (bra för transaktions-email)

4. Konfigurera SMTP-inställningar med din service
5. Ställ in "From" address till: `Spell School <noreply@din-domän.se>`

### 2. Anpassa Email-innehåll (Email Templates)

**Via Supabase Dashboard:**

1. Gå till **Authentication** → **Email Templates**
2. Välj **"Confirm signup"** (för email-verifiering)
3. Klicka på **"Edit"** eller **"Customize"**

#### Standard Template Variabler

Supabase använder Go-templates. Här är tillgängliga variabler:

- `{{ .ConfirmationURL }}` - Länken för att verifiera email
- `{{ .SiteURL }}` - Din Site URL
- `{{ .Email }}` - Användarens email-adress
- `{{ .Token }}` - Verifierings-token (används i ConfirmationURL)
- `{{ .TokenHash }}` - Hashad version av token
- `{{ .RedirectTo }}` - Redirect URL efter verifiering

#### Exempel: Anpassad Email Template

```html
<h2>Välkommen till Spell School!</h2>

<p>Hej!</p>

<p>Tack för att du registrerade dig på Spell School. För att aktivera ditt konto, klicka på länken nedan:</p>

<p><a href="{{ .ConfirmationURL }}">Verifiera min email-adress</a></p>

<p>Om knappen inte fungerar, kopiera och klistra in denna länk i din webbläsare:</p>
<p>{{ .ConfirmationURL }}</p>

<p>Denna länk är giltig i 24 timmar.</p>

<p>Om du inte skapade detta konto kan du ignorera detta meddelande.</p>

<p>Med vänliga hälsningar,<br>
Spell School Team</p>
```

#### För HTML Email (rekommenderat)

Du kan använda HTML för att göra emailen snyggare:

```html
<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: linear-gradient(135deg, #f59e0b 0%, #ea580c 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
    .content { background: #f9fafb; padding: 30px; border-radius: 0 0 10px 10px; }
    .button { display: inline-block; background: #f59e0b; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; margin: 20px 0; }
    .footer { text-align: center; color: #6b7280; font-size: 12px; margin-top: 30px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>Spell School</h1>
    </div>
    <div class="content">
      <h2>Välkommen till Spell School!</h2>
      <p>Hej!</p>
      <p>Tack för att du registrerade dig på Spell School. För att aktivera ditt lärarkonto, klicka på knappen nedan:</p>
      <p style="text-align: center;">
        <a href="{{ .ConfirmationURL }}" class="button">Verifiera min email-adress</a>
      </p>
      <p>Eller kopiera och klistra in denna länk i din webbläsare:</p>
      <p style="word-break: break-all; color: #6b7280;">{{ .ConfirmationURL }}</p>
      <p><strong>Denna länk är giltig i 24 timmar.</strong></p>
      <p>Om du inte skapade detta konto kan du ignorera detta meddelande.</p>
      <p>Med vänliga hälsningar,<br><strong>Spell School Team</strong></p>
    </div>
    <div class="footer">
      <p>© 2024 Spell School. Alla rättigheter förbehållna.</p>
    </div>
  </div>
</body>
</html>
```

### 3. Ytterligare Email Templates

Du kan också anpassa:

- **Magic Link** - För "Log in with magic link"
- **Change Email Address** - När användare ändrar email
- **Reset Password** - För återställning av lösenord
- **Email Change** - Bekräftelse vid email-ändring

### 4. Tips för bästa resultat

1. **Testa emailen** - Skicka ett test-meddelande till dig själv
2. **Använd ditt varumärke** - Inkludera Spell School-logotyp om möjligt (via HTML email)
3. **Tydlig call-to-action** - Gör verifieringslänken tydlig och lätt att klicka på
4. **Mobile-friendly** - Se till att emailen ser bra ut på mobil också
5. **Språk** - Anpassa språket till svenska (eller engelska beroende på målgrupp)

### 5. Ytterligare anpassningar

**Via Supabase Dashboard → Authentication → Settings:**

- **Email Auth** - Aktivera/deaktivera email-baserad autentisering
- **Confirm email** - Kräv email-verifiering (redan aktiverat)
- **Secure email change** - Kräv verifiering vid email-ändring
- **Email template rate limit** - Begränsa antal emails som skickas

### Noteringar

- **Standard Supabase email** använder `noreply@mail.app.supabase.io` som avsändare
- För att ändra detta behöver du antingen:
  - Använda SMTP med custom domain (bäst för production)
  - Eller kontakta Supabase support för custom sender (om tillgängligt)

### Rekommendation

För production: Konfigurera SMTP med egen domän för professionellt utseende och bättre leverans.







