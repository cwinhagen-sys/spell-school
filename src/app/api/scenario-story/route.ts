import { NextRequest, NextResponse } from 'next/server'
import OpenAI from 'openai'
import { z } from 'zod'

// API route for generating scenario-based interactive story trees
// Uses GPT-4 to create branching narratives with multiple choice points

const RequestSchema = z.object({
  scenario: z.string().min(1),
  goal: z.string().min(1),
  difficulty: z.enum(['easy', 'medium', 'advanced']).default('medium'),
  successRate: z.number().min(5).max(90).default(50), // Percentage of paths leading to success (5% = extremely hard)
})

// Story segment with choices
interface StoryChoice {
  id: string
  text: string
  leadsto: string // ID of next segment
}

interface StorySegment {
  id: string
  text: string
  isEnding: boolean
  isSuccess?: boolean // Only for endings
  choices?: StoryChoice[]
}

interface StoryTree {
  scenario: string
  goal: string
  title: string
  segments: { [id: string]: StorySegment }
  startSegmentId: string
}

export type ScenarioStoryResponse = StoryTree

// Initialize OpenAI client
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
    const { scenario, goal, difficulty, successRate } = RequestSchema.parse(body)

    const client = getOpenAIClient()

    // Calculate complexity based on difficulty
    const decisionPoints = difficulty === 'easy' ? 3 : difficulty === 'medium' ? 4 : 5
    const segmentLength = difficulty === 'easy' ? '30-50' : difficulty === 'medium' ? '50-80' : '80-120'
    
    // Calculate success/failure ending distribution based on success rate
    // Lower success rate = harder scenario
    const successEndings = successRate >= 50 ? 3 : successRate >= 35 ? 2 : 1
    const failureEndings = successRate <= 30 ? 4 : successRate <= 45 ? 3 : 2
    
    // Determine how choices should be distributed
    const successPathGuidance = successRate >= 60 
      ? 'At each decision point, 2 out of 3 choices should lead toward success paths.'
      : successRate >= 40
        ? 'At each decision point, roughly 1-2 out of 3 choices should lead toward success paths.'
        : successRate >= 20
          ? 'At each decision point, only 1 out of 3 choices should lead toward success. The other 2 should lead toward failure or dead ends.'
          : 'At each decision point, there is only 1 correct choice. The other 2 choices should lead to immediate or eventual failure. This is an EXTREMELY HARD scenario.'
    
    // Vocabulary complexity based on success rate
    // Easier scenarios = simpler words for beginners
    // Harder scenarios = more complex vocabulary for advanced learners
    const vocabularyGuidance = successRate >= 60
      ? `VOCABULARY LEVEL: BEGINNER
- Use simple, everyday words (e.g., "happy" not "elated", "big" not "enormous")
- Short sentences (8-12 words)
- Common verbs: go, see, make, take, get, want, think, know
- Avoid idioms and complex phrases
- Direct, clear descriptions`
      : successRate >= 40
        ? `VOCABULARY LEVEL: INTERMEDIATE
- Mix of simple and moderately complex words
- Medium sentences (10-15 words)
- Include some descriptive adjectives and adverbs
- Can use common idioms and expressions
- More varied sentence structures`
        : successRate >= 20
          ? `VOCABULARY LEVEL: ADVANCED
- Rich, varied vocabulary with descriptive language
- Longer, more complex sentences (12-20 words)
- Include challenging words (e.g., "meticulous", "apprehensive", "endeavor")
- Use idioms, metaphors, and figurative language
- Sophisticated narrative style`
          : `VOCABULARY LEVEL: EXPERT
- Sophisticated, literary vocabulary
- Complex sentence structures with multiple clauses
- Advanced words (e.g., "ephemeral", "ubiquitous", "paradigm")
- Rich use of idioms, metaphors, and literary devices
- Nuanced emotional and descriptive language
- This is for advanced English learners who want a challenge`

    const systemPrompt = `You are a creative storyteller creating interactive stories for English language learners.
Your stories should be:
- Engaging and age-appropriate (suitable for students aged 10-16)
- Written in clear, natural English appropriate for the vocabulary level
- Educational while being entertaining
- Have meaningful choices that affect the outcome

${vocabularyGuidance}

The story should have a clear goal that the player is trying to achieve.
This story has a ${successRate}% success rate - meaning approximately ${successRate}% of all possible paths through the story should lead to success.`

    const userPrompt = `Create an interactive story with the following:

SCENARIO: ${scenario}
GOAL: ${goal}
DIFFICULTY: ${difficulty}
TARGET SUCCESS RATE: ${successRate}%

Create a branching story with exactly ${decisionPoints} decision points.
Each decision point should have exactly 3 choices.

STRUCTURE REQUIREMENTS:
1. Start with an engaging introduction (${segmentLength} words)
2. Each segment should be ${segmentLength} words
3. Create ${decisionPoints} decision points before any endings
4. Have exactly ${successEndings} successful endings and ${failureEndings} failure endings
5. ${successPathGuidance}
6. Some paths can converge (lead to the same next segment) to manage complexity
7. Choices should feel meaningful and have logical consequences
8. Make "wrong" choices feel natural - not obviously bad, just leading to complications

OUTPUT FORMAT (JSON):
{
  "title": "Story title",
  "segments": {
    "intro": {
      "id": "intro",
      "text": "Story introduction text...",
      "isEnding": false,
      "choices": [
        { "id": "c1", "text": "Choice 1 text", "leadsto": "segment_1a" },
        { "id": "c2", "text": "Choice 2 text", "leadsto": "segment_1b" },
        { "id": "c3", "text": "Choice 3 text", "leadsto": "segment_1c" }
      ]
    },
    "segment_1a": {
      "id": "segment_1a", 
      "text": "What happens after choice 1...",
      "isEnding": false,
      "choices": [...]
    },
    "ending_success_1": {
      "id": "ending_success_1",
      "text": "Success ending text...",
      "isEnding": true,
      "isSuccess": true
    },
    "ending_fail_1": {
      "id": "ending_fail_1", 
      "text": "Failure ending text...",
      "isEnding": true,
      "isSuccess": false
    }
  },
  "startSegmentId": "intro"
}

IMPORTANT:
- All segment IDs must be unique
- Every choice must lead to an existing segment ID
- Endings should have no choices
- The ${successRate}% success rate means: if a player randomly picks choices, they have about a ${successRate}% chance of reaching a success ending
- Make the story immersive and the goal clear throughout
- Use natural dialogue and descriptions
- The player should feel invested in reaching the goal

Return ONLY the JSON object, no additional text.`

    const response = await client.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ],
      temperature: 0.8,
      max_tokens: 4000,
      response_format: { type: 'json_object' }
    })

    const content = response.choices[0]?.message?.content
    if (!content) {
      throw new Error('No content returned from AI')
    }

    const storyData = JSON.parse(content)

    // Validate the story structure
    if (!storyData.segments || !storyData.startSegmentId || !storyData.title) {
      throw new Error('Invalid story structure returned from AI')
    }

    // Verify all segment references are valid
    for (const segment of Object.values(storyData.segments) as StorySegment[]) {
      if (segment.choices) {
        for (const choice of segment.choices) {
          if (!storyData.segments[choice.leadsto]) {
            console.warn(`Invalid reference: ${choice.leadsto} not found`)
          }
        }
      }
    }

    const storyTree: StoryTree = {
      scenario,
      goal,
      title: storyData.title,
      segments: storyData.segments,
      startSegmentId: storyData.startSegmentId
    }

    return NextResponse.json(storyTree)

  } catch (error: any) {
    console.error('Scenario Story API error:', error)

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
