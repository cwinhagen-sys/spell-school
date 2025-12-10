import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { getOpenAI } from '@/lib/openai'

// ---------- Types ----------
const RequestSchema = z.object({
  words: z.array(z.string().min(1)).min(1).max(12),
  difficulty: z.enum(['easy', 'medium', 'advanced']),
  theme: z.string().optional()
})

const ResponseSchema = z.object({
  story: z.string().min(1),
  theme: z.string()
})

export type DistortedTaleResponse = z.infer<typeof ResponseSchema>

// ---------- Difficulty Settings ----------
const DIFFICULTY_CONFIG = {
  easy: {
    wordCount: '50-80',
    level: 'A1-A2 (beginner)',
    description: `Use ONLY very simple, common words. Short sentences (5-10 words max). 
    Basic vocabulary like: go, come, see, find, happy, sad, big, small, good, bad.
    Simple present tense. No complex grammar. No idioms or advanced expressions.
    Think of a 10-year-old reader who is just learning English.`
  },
  medium: {
    wordCount: '80-120',
    level: 'A2-B1 (elementary/intermediate)',
    description: `Use moderate vocabulary. Sentences can be 8-15 words.
    Can use past tense and some descriptive words.
    Still accessible for younger students.`
  },
  advanced: {
    wordCount: '120-160',
    level: 'B1-B2 (intermediate)',
    description: `More complex vocabulary and sentence structures allowed.
    Can use varied tenses and more detailed descriptions.
    More nuanced storytelling.`
  }
}

// ---------- Build Prompt ----------
function buildPrompt(words: string[], difficulty: 'easy' | 'medium' | 'advanced', theme?: string) {
  const config = DIFFICULTY_CONFIG[difficulty]
  const themeInstruction = theme ? `The story should be themed around "${theme}".` : 'Choose an engaging theme appropriate for students aged 10-15 (adventure, mystery, friendship, animals, school, sports, etc.).'
  
  const system = `You are a creative writing assistant for an English learning game called "Finish the Story".

Your task is to write a SHORT STORY that:
1. Sets up an engaging scenario with a character facing a problem or challenge
2. STOPS at a cliffhanger moment - right when something important is about to happen
3. Does NOT contain any of the target vocabulary words (the student must use them)
4. Leaves room for the student to write a creative ending

${themeInstruction}

DIFFICULTY: ${difficulty.toUpperCase()} - ${config.level}
- Total story length: approximately ${config.wordCount} words
- ${config.description}

CRITICAL RULES:
1. The target vocabulary words must NOT appear anywhere in your story
2. Write ONE continuous story (not split into sections)
3. End at an exciting moment where the reader wants to know what happens next
4. The story should naturally lead to an ending where the target words could be used
5. Keep the language appropriate for the difficulty level

The student will write the ENDING using ALL the target vocabulary words.

Output format - JSON only:
{
  "story": "Your complete story here, ending at a cliffhanger moment...",
  "theme": "The theme (e.g., 'Adventure', 'Mystery', 'Friendship')"
}`

  const user = `Generate a story for these target vocabulary words that the STUDENT must use in their ending:
${words.map((w, i) => `${i + 1}. ${w}`).join('\n')}

Remember:
- Do NOT use any of these words in your story
- Stop at an exciting moment - do not write the ending
- The student will finish the story using ALL these words
- Difficulty: ${difficulty.toUpperCase()} - use ${config.level} vocabulary
- Return valid JSON only`

  return { system, user }
}

// ---------- API Handler ----------
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const parsed = RequestSchema.safeParse(body)
    
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid request', details: parsed.error.format() },
        { status: 400 }
      )
    }
    
    const { words, difficulty, theme } = parsed.data
    const { system, user } = buildPrompt(words, difficulty, theme)
    
    const openai = getOpenAI()
    
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: system },
        { role: 'user', content: user }
      ],
      temperature: 0.8,
      max_tokens: 800,
      response_format: { type: 'json_object' }
    })
    
    const content = completion.choices[0]?.message?.content
    if (!content) {
      return NextResponse.json(
        { error: 'No response from AI' },
        { status: 500 }
      )
    }
    
    let response: DistortedTaleResponse
    try {
      const parsed = JSON.parse(content)
      response = ResponseSchema.parse(parsed)
    } catch (parseError) {
      console.error('Failed to parse AI response:', content)
      return NextResponse.json(
        { error: 'Invalid AI response format' },
        { status: 500 }
      )
    }
    
    // Validate that target words are NOT in the story
    const storyText = response.story.toLowerCase()
    const foundWords = words.filter(w => {
      const regex = new RegExp(`\\b${w.toLowerCase()}\\b`, 'i')
      return regex.test(storyText)
    })
    
    if (foundWords.length > 0) {
      // Retry once if words were found in story
      console.warn('Target words found in story, retrying:', foundWords)
      
      const retryCompletion = await openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: system },
          { role: 'user', content: user },
          { role: 'assistant', content: content },
          { role: 'user', content: `ERROR: Your story contains these target words which should NOT appear: ${foundWords.join(', ')}. The STUDENT needs to use these words in their ending. Please regenerate the story WITHOUT these words. Use synonyms or different phrasing instead.` }
        ],
        temperature: 0.9,
        max_tokens: 800,
        response_format: { type: 'json_object' }
      })
      
      const retryContent = retryCompletion.choices[0]?.message?.content
      if (retryContent) {
        try {
          const retryParsed = JSON.parse(retryContent)
          response = ResponseSchema.parse(retryParsed)
        } catch {
          // Use original response if retry fails
        }
      }
    }
    
    return NextResponse.json(response)
    
  } catch (error: any) {
    console.error('Distorted Tale API error:', error)
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}


