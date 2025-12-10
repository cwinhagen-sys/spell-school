# Finish the Story - Integration Guide

## Overview
"Finish the Story" is a creative writing game where students complete AI-generated stories using target vocabulary words in English.

## Game Concept

### How It Works
1. AI generates a **story introduction** and **problem/challenge**
2. The story stops at a cliffhanger - before the solution
3. Student writes the **ending** (solution + conclusion)
4. The ending must include ALL vocabulary words naturally
5. AI evaluates the ending and provides feedback

### Key Points
- **Words are displayed in English** (not Swedish)
- **Story does NOT contain** the target vocabulary words
- **Student must use ALL words** in their ending
- **Focus on creative writing** and natural word integration

## Files

### Components
- `src/components/games/DistortedTaleGame.tsx` - Main game component
- `src/components/FeedbackModule.tsx` - Feedback with score meter

### API Routes
- `src/app/api/distorted-tale/route.ts` - AI story generation
- `src/app/api/distorted-tale-feedback/route.ts` - AI feedback evaluation

### Updated Files
- `src/lib/gameScoring.ts` - `calculateDistortedTaleScore()`
- `src/lib/tracking.ts` - `distorted_tale` GameType

---

## Game Flow

```
1. Select Color Block → 2. Choose Difficulty → 3. AI Generates Story Intro + Problem
                                    ↓
4. Student Writes Ending (Solution + Conclusion) using ALL vocabulary words
                                    ↓
5. Submit → AI Evaluates → Score Meter + Inline Feedback
```

---

## Difficulty Levels

| Level | Intro Length | Problem Length | Description |
|-------|--------------|----------------|-------------|
| Easy | 40-60 words | 30-50 words | Simple story, clear problem |
| Medium | 60-90 words | 40-60 words | Moderate complexity |
| Advanced | 80-120 words | 50-80 words | Complex narrative |

---

## Scoring Criteria (100%)

| Criteria | Weight |
|----------|--------|
| Grammar & Spelling | 25% |
| Flow & Story Quality | 25% |
| Inclusion of All Words | 10% |
| Natural Word Integration | 40% |

---

## Feedback Display

The feedback module shows:
1. **Animated Score Meter** (0-100%) with celebration effects
2. **Score Breakdown** by category
3. **Your Text with Feedback** - Highlighted segments showing:
   - 🟢 Strengths (green highlights)
   - 🟡 Areas for improvement (amber highlights)

---

## API Usage

### Generate Story
```typescript
POST /api/distorted-tale
{
  "words": ["discover", "ancient", "mysterious"],
  "difficulty": "easy" | "medium" | "advanced",
  "theme": "optional theme string"
}

Response:
{
  "storyIntro": "The introduction...",
  "problem": "The challenge that needs solving...",
  "theme": "Adventure"
}
```

### Get Feedback
```typescript
POST /api/distorted-tale-feedback
{
  "storyIntro": "The introduction...",
  "problem": "The problem...",
  "studentEnding": "Student's written ending...",
  "targetWords": ["discover", "ancient", "mysterious"],
  "difficulty": "medium"
}

Response:
{
  "scorePercentage": 85,
  "inlineFeedback": [
    {
      "type": "strength",
      "segment": "discovered the ancient map",
      "comment": "Great use of 'ancient'!"
    }
  ],
  "breakdown": {
    "grammar": 23,
    "flow": 20,
    "inclusion": 10,
    "integration": 32
  }
}
```

---

## Integration in Student Dashboard

The game is already integrated. Students can access it via:
- Practice Games section → "Distorted Tale" card (fuchsia color)

---

## Design Features

- Modern dark theme
- Animated 3D score meter with particle effects
- Real-time word usage tracking
- Color-coded feedback (green/amber)
- Responsive layout
- Smooth Framer Motion animations


