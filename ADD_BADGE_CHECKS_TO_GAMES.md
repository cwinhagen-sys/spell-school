# 🏆 Lägg till Badge-kontroll i alla spel

## ✅ **Redan fixat:**
- ✅ TypingChallenge.tsx - "Spelling Bee" badge
- ✅ RouletteGame.tsx - "Roulette Master" badge

## 🔧 **Behöver fixas:**

### **1. WordMatchingGame.tsx**
```typescript
// Lägg till import
import { useBadges } from '@/hooks/useBadges'

// Lägg till i komponenten
const { checkGameBadges } = useBadges()

// Lägg till efter game completion
await checkGameBadges('matching', score, accuracy)
```

### **2. LineMatchingGame.tsx**
```typescript
// Lägg till import
import { useBadges } from '@/hooks/useBadges'

// Lägg till i komponenten
const { checkGameBadges } = useBadges()

// Lägg till efter game completion
await checkGameBadges('matching', score, accuracy)
```

### **3. FlashcardGame.tsx**
```typescript
// Lägg till import
import { useBadges } from '@/hooks/useBadges'

// Lägg till i komponenten
const { checkGameBadges } = useBadges()

// Lägg till efter game completion
await checkGameBadges('flashcards', score, accuracy)
```

### **4. QuizGame.tsx**
```typescript
// Lägg till import
import { useBadges } from '@/hooks/useBadges'

// Lägg till i komponenten
const { checkGameBadges } = useBadges()

// Lägg till efter game completion
await checkGameBadges('multiple_choice', score, accuracy)
```

## 🎯 **Badge-mappning:**
- **typing** → "Spelling Bee" badge
- **word_roulette** → "Roulette Master" badge
- **matching** → "Memory Champion" badge
- **flashcards** → "Word Warrior" badge
- **multiple_choice** → "Choice Master" badge
- **sentence_gap** → "Gap Filler" och "Sentence Builder" badges
- **spell_slinger** → "Spell Slinger Novice" badge

## 📋 **Steg för varje spel:**
1. Lägg till `import { useBadges } from '@/hooks/useBadges'`
2. Lägg till `const { checkGameBadges } = useBadges()` i komponenten
3. Lägg till `await checkGameBadges(gameType, score, accuracy)` efter game completion
4. Testa att badge triggar korrekt



