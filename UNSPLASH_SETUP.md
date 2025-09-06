# Unsplash API Setup Guide

## 🎯 Vad du får med Unsplash API:
- **Automatiska bildförslag** när du skriver ett ord
- **Hundratals bilder** att välja mellan för varje ord
- **Hög kvalitet** professionella fotografier
- **Gratis** för personlig användning

## 📋 Steg-för-steg guide:

### 1. Skapa Unsplash-konto
1. Gå till https://unsplash.com
2. Klicka "Sign up" (gratis)
3. Verifiera din email

### 2. Skapa en applikation
1. Gå till https://unsplash.com/developers
2. Klicka "Your apps" → "New Application"
3. Fyll i:
   - **Application name**: "Min Språklärare" (eller vad du vill)
   - **Description**: "Bildsökning för ord i språklärande"
   - **Website URL**: `http://localhost:3000` (för utveckling)
4. Acceptera terms of service
5. Klicka "Create application"

### 3. Hämta din API-nyckel
1. På din app-sida, hitta "Access Key"
2. Kopiera nyckeln (ser ut som: `abc123def456...`)

### 4. Lägg till i din app
1. Öppna filen `.env.local` i din `my-app` mapp
2. Lägg till:
```env
NEXT_PUBLIC_UNSPLASH_ACCESS_KEY=din_nyckel_här
```
3. Spara filen

### 5. Starta om applikationen
```bash
cd my-app
npm run dev
```

## ✨ Så här fungerar det:

### För lärare:
1. **Skriv ett ord** i engelska-fältet (t.ex. "apple")
2. **Klicka "Add image"** 
3. **Se automatiskt bildförslag** för "apple"
4. **Välj en bild** eller sök på något annat
5. **Spara** word set

### Exempel:
- Skriver "cat" → får bilder av katter
- Skriver "happy" → får bilder av glada människor
- Skriver "house" → får bilder av hus

## 🔧 Troubleshooting:

### "No images found"
- Kontrollera att API-nyckeln är korrekt
- Kontrollera att `.env.local` är sparad
- Starta om applikationen

### "Rate limit exceeded"
- Unsplash har dagliga gränser
- Vänta till nästa dag eller uppgradera konto

### Bilder laddas inte
- Kontrollera internetanslutning
- Kontrollera att API-nyckeln har rätt behörigheter

## 💡 Tips:
- **Sök på engelska** för bästa resultat
- **Prova synonymer** om du inte hittar rätt bild
- **Upload egna bilder** om du vill ha specifika bilder
- **Använd beskrivande ord** (t.ex. "red apple" istället för bara "apple")

## 🆓 Kostnad:
- **Gratis** för personlig användning
- **50 requests per timme** (mer än tillräckligt)
- **Ingen kreditkort** behövs


