# Session Mode UI Components

Detta är UI-komponenter för session mode som kan redesignas med Gemini 3 medan all backend-logik behålls i `page.tsx`.

## Komponenter

### 1. `BlockSelectionUI.tsx`
UI för att välja färgblock i session mode.

**Props:**
- `colorBlocks: ColorBlock[]` - Array av tillgängliga färgblock
- `selectedBlocks: string[]` - Array av valda block-IDs
- `onToggleBlock: (blockId: string) => void` - Callback när ett block väljs/avväljs
- `onSubmit: () => void` - Callback när användaren bekräftar valet

**Användning i Gemini 3:**
```
Design a modern, engaging block selection UI component for a language learning app.

Props Interface:
```typescript
interface BlockSelectionUIProps {
  colorBlocks: Array<{
    id: string
    color: string
    words: Array<{en: string, sv: string, image_url?: string}>
  }>
  selectedBlocks: string[]
  onToggleBlock: (blockId: string) => void
  onSubmit: () => void
}
```

Requirements:
- Modern, playful design suitable for students aged 8-16
- Clear visual feedback for selected blocks
- Show word count and preview words in each block
- Smooth hover animations and transitions
- Mobile-responsive grid layout
- Use Tailwind CSS
- Keep all props and callbacks exactly as defined
- Maintain all functionality
```

---

### 2. `GameSelectionUI.tsx`
UI för spelval-skärmen i session mode. Den största och mest komplexa komponenten.

**Props:**
- `enabledGames: string[]` - Array av spel-IDs som är aktiverade
- `progress: GameProgress[]` - Array av progress-objekt för varje spel
- `gameRounds?: { [key: string]: number }` - Antal omgångar som krävs per spel
- `quizEnabled: boolean` - Om quiz är aktiverat
- `quizResult: QuizResult | null` - Quiz-resultat om klart, annars null
- `quizDetails: QuizDetail[]` - Array av quiz-svar detaljer
- `showQuizDetails: boolean` - Om quiz-detaljer modal ska visas
- `allGamesCompleted: boolean` - Om alla spel är klara
- `isQuizUnlocked: boolean` - Om quiz är upplåst
- `onChangeBlocks: () => void` - Callback för att ändra färgblock
- `onExitSession: () => void` - Callback för att avsluta sessionen
- `onSelectGame: (gameIndex: number, gameId: string) => void` - Callback när ett spel väljs
- `onQuizClick: () => void` - Callback när quiz-knappen klickas
- `onQuizDetailsClick: () => Promise<void>` - Async callback för att ladda quiz-detaljer
- `onCloseQuizDetails: () => void` - Callback för att stänga quiz-detaljer modal

**Användning i Gemini 3:**
```
Create a modern, student-friendly game selection UI component for a language learning session.

Component: GameSelectionUI

Props Interface:
```typescript
interface GameSelectionUIProps {
  enabledGames: string[]
  progress: Array<{
    game_name: string
    completed: boolean
    score: number
    rounds_completed?: number
  }>
  gameRounds?: { [key: string]: number }
  quizEnabled: boolean
  quizResult: {score: number, total: number, percentage: number} | null
  quizDetails: Array<{
    word_en: string
    word_sv: string
    student_answer: string
    score: number
  }>
  showQuizDetails: boolean
  allGamesCompleted: boolean
  isQuizUnlocked: boolean
  onChangeBlocks: () => void
  onExitSession: () => void
  onSelectGame: (gameIndex: number, gameId: string) => void
  onQuizClick: () => void
  onQuizDetailsClick: () => Promise<void>
  onCloseQuizDetails: () => void
}
```

Design Requirements:
- Modern, playful design for students aged 8-16
- Clear visual hierarchy
- Smooth hover animations
- Color-coded game cards based on COLOR_GRIDS
- Lock/unlock states clearly visible
- Progress indicators for rounds
- Quiz section with result display
- Quiz details modal
- Session complete banner
- Mobile-responsive grid
- Use Tailwind CSS
- Keep all props exactly as defined
- Maintain all callback functionality
- Use getGameMetadata() and getGameIcon() helper functions from '@/lib/session-games'
```

---

## Viktiga punkter för Gemini 3

1. **Behåll alla props exakt som de är** - Ändra inte props interfaces eller callback-signaturer
2. **Behåll all funktionalitet** - Alla callbacks måste fungera exakt som tidigare
3. **Använd Tailwind CSS** - För konsistens med resten av appen
4. **Mobile-responsive** - Alla komponenter måste fungera på mobil
5. **Behåll helper-funktioner** - Använd `getGameMetadata()`, `getGameIcon()`, `COLOR_GRIDS` etc.
6. **TypeScript** - Alla komponenter måste vara fullt typade

## Workflow

1. **Kopiera props interface** från komponenten
2. **Ge Gemini 3 design-brief** med props interface
3. **Testa komponenten isolerat** innan integration
4. **Integrera i page.tsx** - Ersätt gammal JSX med ny komponent
5. **Testa funktionalitet** - Se till att alla callbacks fungerar

## Backend-logik

All backend-logik finns kvar i `src/app/session/[id]/play/page.tsx`:
- State management (`useState`, `useEffect`)
- Supabase queries (`loadSession`, `loadParticipant`, etc.)
- Business logic (`handleGameComplete`, `handleGameScoreUpdate`)
- Navigation logic (`setStep`, routing)

UI-komponenterna är **pure presentational components** - de tar emot data och callbacks, men hanterar ingen logik själva.



