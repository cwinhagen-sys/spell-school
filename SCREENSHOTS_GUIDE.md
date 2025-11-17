# Guide för Screenshots på Landing-vyn

## 📸 Var ska screenshots placeras?

Screenshots ska placeras i `public/screenshots/` mappen med följande namn:

```
public/
  screenshots/
    flashcards.png
    memory.png
    typing.png
    translate.png
    sentence-gap.png
    roulette.png
```

## 🎯 Rekommenderade storlekar

För bästa resultat, använd följande specifikationer:

- **Format:** PNG eller JPG
- **Storlek:** 1280x720 pixlar (16:9 aspect ratio)
- **Kvalitet:** Hög upplösning för skarp bild
- **Bakgrund:** Ta screenshots med ljus bakgrund eller transparent bakgrund

## 📋 Steg-för-steg guide

### 1. Ta screenshots från spelen

1. Öppna Spell School i webbläsaren
2. Logga in som lärare eller elev
3. Starta varje spel och ta en screenshot när spelet är i fullskärm
4. Försök visa spelet i ett representativt tillstånd:
   - **Flashcards:** Visa ett kort som är vänt (visar både svenska och engelska)
   - **Memory:** Visa några kort som är vända med matchningar
   - **Typing Challenge:** Visa spelet med ord och input-fält
   - **Translate:** Visa översättningsuppgiften
   - **Sentence Gap:** Visa en mening med luckor som ska fyllas i (framhäver kontext)
   - **Word Roulette:** Visa spelet med ord och mening

### 2. Redigera screenshots (valfritt)

- Beskär bilderna till 16:9 format
- Justera ljusstyrka/kontrast om nödvändigt
- Ta bort känslig information (användarnamn, etc.)

### 3. Spara screenshots

Spara bilderna i `public/screenshots/` med rätt namn:
- `flashcards.png`
- `memory.png`
- `typing.png`
- `translate.png`
- `choice.png`
- `roulette.png`

### 4. Testa på landing-vyn

Efter att ha lagt till screenshots:
1. Starta utvecklingsservern: `npm run dev`
2. Gå till landing-vyn (`/`)
3. Scrolla ner till "Magiska övningar" sektionen
4. Kontrollera att bilderna visas korrekt

## 🎨 Fallback-bilder

Om en screenshot inte finns, visas en fallback med:
- En gradient bakgrund i spelets färg
- Ett emoji som representerar spelet
- Spelets namn

Detta säkerställer att landing-vyn alltid ser bra ut även om screenshots saknas.

## 💡 Tips för bästa resultat

1. **Konsistent stil:** Försök ta alla screenshots med samma stil och bakgrund
2. **Höjd kvalitet:** Använd hög upplösning för skarpa bilder
3. **Representativt:** Visa spelet i ett tillstånd som är lätt att förstå
4. **Ingen känslig data:** Ta bort användarnamn och annan känslig information
5. **Optimerade filer:** Komprimera bilderna för snabbare laddning (använd t.ex. TinyPNG)

## 🔄 Uppdatera screenshots

Om du vill uppdatera en screenshot:
1. Ersätt den gamla bilden i `public/screenshots/`
2. Behåll samma filnamn
3. Ladda om sidan (Ctrl+F5 för att rensa cache)

## 📱 Responsiv design

Screenshots visas automatiskt responsivt:
- **Desktop:** 3 kolumner
- **Tablet:** 2 kolumner
- **Mobil:** 1 kolumn

Bilderna skalas automatiskt för att passa skärmstorleken.

