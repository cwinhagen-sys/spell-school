# Session Mode - Data Isolation

## Översikt
Session Mode är **helt separat** från Spell School's permanenta funktionalitet. All data i Session Mode är **temporär** och raderas automatiskt efter sessionens slut.

## Separata Tabeller
Session Mode använder egna tabeller som är isolerade från huvudsystemet:

### Session-specifika tabeller:
- `sessions` - Session-metadata
- `session_participants` - Deltagare i sessioner
- `session_progress` - Spel-progress i sessioner
- `session_quiz_responses` - Quiz-svar i sessioner

### Spell School's permanenta tabeller (INTE påverkade):
- `word_sets` - Ordlistor (används av sessioner men påverkas inte)
- `homeworks` - Läxor
- `student_progress` - Studentens permanenta progress
- `quiz_responses` - Quiz-svar i huvudsystemet
- Alla andra permanenta tabeller

## Data-radering
All session data raderas automatiskt 1 dag efter `due_date`:

1. **Automatisk radering**: Cleanup-funktionen körs dagligen
2. **CASCADE DELETE**: När en session raderas, raderas automatiskt:
   - Alla deltagare (`session_participants`)
   - All progress (`session_progress`)
   - Alla quiz-svar (`session_quiz_responses`)

## Viktiga Punkter

### ✅ Session Mode data:
- **Temporär** - Existerar bara under sessionens gång
- **Isolerad** - Påverkar INTE Spell School's permanenta data
- **Raderas automatiskt** - 1 dag efter due_date
- **Exportbar** - Lärare kan exportera data innan radering

### ❌ Session Mode påverkar INTE:
- Studentens permanenta progress i Spell School
- Lärarens ordlistor eller läxor
- Quiz-resultat i huvudsystemet
- Någon annan permanent data

## Export
Lärare kan exportera session-data (progress och quiz-resultat) som CSV:
- Under sessionens gång
- Upp till 1 dag efter due_date
- Efter export-deadline raderas allt permanent

## Implementation
Se SQL-filer:
- `session-mode-setup.sql` - Skapar session-tabeller med CASCADE DELETE
- `session-quiz-setup.sql` - Skapar quiz-tabeller med CASCADE DELETE
- `session-cleanup-function.sql` - Funktion för automatisk radering


