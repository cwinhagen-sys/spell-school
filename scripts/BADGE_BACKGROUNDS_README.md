# Badge Background Images Generator

## Översikt
Detta script genererar custom bakgrundsbilder för alla badges i comic book wizard/magic-stil.

## Användning

### 1. Generera bilderna
```bash
node scripts/generate-badge-backgrounds.js
```

### 2. Vad scriptet gör
- Genererar 26 unika bakgrundsbilder (en för varje badge-typ)
- Sparar bilderna i `public/images/badges/backgrounds/`
- Använder DALL-E 3 för att generera bilderna
- Väntar 2 sekunder mellan varje bild (rate limiting)

### 3. Badge-mappning
Bilderna mappas automatiskt till badges baserat på badge-namn:
- Word Warrior → `word_warrior.png`
- Memory Champion → `memory_champion.png`
- Spelling Bee → `spelling_bee.png`
- etc.

## Badge-typer som genereras

### Daily Quest Badges:
1. Word Warrior (⚔️)
2. Memory Champion (🧠)
3. Spelling Bee (⌨️)
4. Choice Master (✅)
5. Gap Filler (📝)
6. Spell Slinger Novice (✨)
7. Sentence Builder (📝)
8. Roulette Master (🎯)
9. Multi-Game Player (🎮)
10. Perfect Score (💯)
11. Spell Slinger Expert (🔥)
12. Grammar Guru (📖)
13. Roulette Legend (👑)
14. Marathon Runner (🏃)
15. Perfectionist (⭐)
16. Quiz God (🎓)
17. Speed God (⚡)
18. Ultimate Gamer (👑)

### Achievement Badges:
19. First Steps (🎯)
20. Getting Hot (🔥)
21. Week Warrior (📅)
22. Monthly Master (📆)
23. Rising Star (⭐)
24. Experienced Learner (🌟)
25. Master Student (🏆)
26. Legendary Scholar (👑)

## Stil och tema

Alla bilder genereras med:
- **Comic book illustration style** - Bold outlines, vibrant colors
- **Wizard/Magic theme** - Magical elements, wizard's tools, mystical energy
- **No people** - Endast miljöer och magiska objekt
- **Dynamic composition** - Spännande och visuellt intressant
- **Child-friendly** - Lämpligt för alla åldrar

## Implementation

Badges-sidan (`src/app/student/badges/page.tsx`) använder automatiskt dessa bilder:
- Visas endast för earned badges
- Opacity 30% (hover: 40%)
- Mörk overlay för textläsbarhet
- Fallback till gradient om bild saknas

## Filstruktur

```
public/images/badges/backgrounds/
├── word_warrior.png
├── memory_champion.png
├── spelling_bee.png
├── ...
└── legendary_scholar.png
```

## Noteringar

- Scriptet hoppar över bilder som redan finns
- Varje bild tar ~2-3 sekunder att generera
- Totalt ~26 bilder = ~1-2 minuter
- Kräver `OPENAI_API_KEY` i `.env.local`












