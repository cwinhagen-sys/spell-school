import { NextRequest, NextResponse } from 'next/server'
import OpenAI from 'openai'
import { z } from 'zod'
import { StaticStory, getVocabularyLevel, getDifficultyFromSuccessRate } from '@/data/scenarios/types'

// API route for generating static stories with logical clues and consequences
// These stories are designed to be saved and reused

const RequestSchema = z.object({
  storyId: z.string().min(1),
  scenarioName: z.string().min(1),
  goalName: z.string().min(1),
  goalDescription: z.string().min(1),
  successRate: z.number().min(5).max(90),
})

function getOpenAIClient() {
  const apiKey = process.env.OPENAI_API_KEY
  if (!apiKey) {
    throw new Error('OPENAI_API_KEY environment variable is not set')
  }
  return new OpenAI({ apiKey })
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { storyId, scenarioName, goalName, goalDescription, successRate } = RequestSchema.parse(body)

    const client = getOpenAIClient()

    // Calculate story parameters based on success rate
    const vocabularyLevel = getVocabularyLevel(successRate)
    const difficulty = getDifficultyFromSuccessRate(successRate)
    const decisionPoints = difficulty === 'easy' ? 3 : difficulty === 'medium' ? 4 : 5
    
    // Segment length based on vocabulary
    const segmentLength = vocabularyLevel === 'beginner' ? '30-50' 
      : vocabularyLevel === 'intermediate' ? '50-70'
      : vocabularyLevel === 'advanced' ? '70-100'
      : '80-120'
    
    // Endings distribution
    const successEndings = successRate >= 50 ? 2 : 1
    const failureEndings = successRate <= 30 ? 3 : 2

    // Vocabulary guidance based on level
    const vocabularyGuidance = {
      beginner: `VOCABULARY LEVEL: BEGINNER
- Use simple, everyday words (e.g., "happy" not "elated", "big" not "enormous")
- Short sentences (8-12 words maximum)
- Common verbs: go, see, make, take, get, want, think, know, help, try
- Avoid idioms, metaphors, and complex phrases
- Direct, clear descriptions that are easy to understand
- Repeat key words to reinforce understanding`,

      intermediate: `VOCABULARY LEVEL: INTERMEDIATE
- Mix of simple and moderately complex words
- Medium sentences (10-15 words)
- Include descriptive adjectives and adverbs
- Can use common idioms and expressions
- More varied sentence structures
- Some challenging but context-clear vocabulary`,

      advanced: `VOCABULARY LEVEL: ADVANCED
- Rich, varied vocabulary with descriptive language
- Longer, more complex sentences (12-20 words)
- Include challenging words (e.g., "meticulous", "apprehensive", "endeavor")
- Use idioms, metaphors, and figurative language
- Sophisticated narrative style with nuance`,

      expert: `VOCABULARY LEVEL: EXPERT
- Sophisticated, literary vocabulary
- Complex sentence structures with multiple clauses
- Advanced words (e.g., "ephemeral", "ubiquitous", "paradigm", "disconcerting")
- Rich use of idioms, metaphors, and literary devices
- Nuanced emotional and descriptive language
- Subtle implications and subtext`
    }[vocabularyLevel]

    // Clue guidance based on difficulty
    const clueGuidance = successRate >= 60
      ? `CLUE DIFFICULTY: OBVIOUS
- Correct choices should be fairly clear from reading the text
- Dangerous or risky options should have clear warning signs
- Use phrases like "seems safe", "looks dangerous", "you remember that..."
- Good choices align with common sense and basic logic`
      : successRate >= 40
        ? `CLUE DIFFICULTY: MODERATE
- Clues should require some attention to notice
- Embed hints in descriptions and dialogue
- Wrong choices may seem appealing but have subtle red flags
- Correct choices connect to earlier information in the story`
        : successRate >= 20
          ? `CLUE DIFFICULTY: SUBTLE
- Clues require careful reading and inference
- Important details may be mentioned casually earlier
- Wrong choices often seem reasonable or tempting
- Success requires connecting information across segments
- "Reading between the lines" is necessary`
          : `CLUE DIFFICULTY: HIDDEN
- Clues are deeply embedded and require expert reading
- Success requires noticing very subtle details
- Wrong choices often appear equally valid as correct ones
- Only through careful analysis can patterns be detected
- The "correct" choice may seem counterintuitive at first glance`

    const systemPrompt = `You are a master storyteller creating an interactive story for English language learners.

YOUR STORY MUST FOLLOW THESE CRITICAL RULES:

1. LOGICAL CONSEQUENCES: Every choice must have a LOGICAL consequence based on the story context. No random outcomes.

2. EMBEDDED CLUES: The text MUST contain subtle clues that hint at which choices lead to success:
${clueGuidance}

3. NO WARNINGS, NO EXPLANATIONS: 
   - Never warn the player about bad choices
   - Never explain why something failed after it happens
   - Just show the natural consequence of their action
   - Let the outcome speak for itself

4. NATURAL FLOW:
   - Wrong choices should feel like reasonable options
   - Failure comes from logical consequences, not random bad luck
   - Success feels earned because the player read carefully

5. IMAGE PROMPTS:
   - Each segment needs an "imagePrompt" field
   - Write a DALL-E prompt describing the key visual moment
   - Style: "Digital illustration, children's book style, warm colors"
   - Include the setting, characters, and mood

${vocabularyGuidance}

Create a story where careful reading and logical thinking lead to success.`

    const userPrompt = `Create an interactive story:

SCENARIO: ${scenarioName}
GOAL: ${goalName} - ${goalDescription}
SUCCESS RATE: ${successRate}% (${difficulty} difficulty)
DECISION POINTS: ${decisionPoints}

STRUCTURE:
- ${decisionPoints} decision points (player makes ${decisionPoints} choices)
- 3 options per decision
- ${successEndings} success ending(s), ${failureEndings} failure ending(s)
- Use CONVERGENCE: some different choices can lead to the same next segment
- Total unique segments: approximately ${8 + decisionPoints * 2} segments

CRITICAL REQUIREMENTS:
1. Each segment text should be ${segmentLength} words
2. EVERY segment must contain subtle clues about what approach will work
3. Correct choices should connect to information given in the story
4. Wrong choices lead to natural, logical consequences (not random failure)
5. No warnings like "this seems risky" - just describe the situation
6. Endings show consequences, not explanations

OUTPUT FORMAT (JSON):
{
  "title": "Engaging Story Title",
  "segments": {
    "intro": {
      "id": "intro",
      "text": "Story introduction with embedded clues about the situation...",
      "imagePrompt": "Digital illustration, children's book style: [describe the scene]",
      "isEnding": false,
      "choices": [
        { "id": "c1", "text": "First option", "leadsTo": "seg_1a" },
        { "id": "c2", "text": "Second option", "leadsTo": "seg_1b" },
        { "id": "c3", "text": "Third option", "leadsTo": "seg_1a" }
      ]
    },
    "seg_1a": {
      "id": "seg_1a",
      "text": "What happens next, with more clues...",
      "imagePrompt": "Digital illustration, children's book style: [describe the scene]",
      "isEnding": false,
      "choices": [...]
    },
    "ending_success": {
      "id": "ending_success",
      "text": "The positive outcome, showing the natural result of good choices...",
      "imagePrompt": "Digital illustration, children's book style: [triumphant scene]",
      "isEnding": true,
      "isSuccess": true
    },
    "ending_fail": {
      "id": "ending_fail",
      "text": "The natural consequence of the player's choices...",
      "imagePrompt": "Digital illustration, children's book style: [disappointed scene]",
      "isEnding": true,
      "isSuccess": false
    }
  },
  "startSegmentId": "intro"
}

Return ONLY valid JSON.`

    const response = await client.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ],
      temperature: 0.7, // Slightly lower for more consistent quality
      max_tokens: 6000,
      response_format: { type: 'json_object' }
    })

    const content = response.choices[0]?.message?.content
    if (!content) {
      throw new Error('No content returned from AI')
    }

    const storyData = JSON.parse(content)

    // Validate structure
    if (!storyData.segments || !storyData.startSegmentId || !storyData.title) {
      throw new Error('Invalid story structure')
    }

    // Count segments and endings
    const segments = Object.values(storyData.segments) as any[]
    const endings = segments.filter((s: any) => s.isEnding)
    const successEndingsCount = endings.filter((s: any) => s.isSuccess).length
    const failureEndingsCount = endings.filter((s: any) => !s.isSuccess).length

    // Build the static story object
    const staticStory: StaticStory = {
      id: storyId,
      scenarioId: storyId.split('_')[0],
      goalId: storyId.split('_').slice(1).join('_'),
      title: storyData.title,
      description: `${goalDescription} in ${scenarioName}`,
      difficulty,
      difficultyStars: difficulty === 'easy' ? 1 : difficulty === 'medium' ? 2 : 3,
      estimatedMinutes: decisionPoints + 1,
      segments: storyData.segments,
      startSegmentId: storyData.startSegmentId,
      xpRewards: {
        oneStar: 10,
        twoStars: 20,
        threeStars: 30
      }
    }

    return NextResponse.json(staticStory)

  } catch (error: any) {
    console.error('Generate Static Story API error:', error)

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request', details: error.errors },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { error: 'Failed to generate story', details: error.message },
      { status: 500 }
    )
  }
}




