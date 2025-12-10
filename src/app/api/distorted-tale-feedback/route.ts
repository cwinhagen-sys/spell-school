import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { getOpenAI } from '@/lib/openai'

// ---------- Types ----------
const RequestSchema = z.object({
  story: z.string().min(1),
  studentEnding: z.string().min(1),
  targetWords: z.array(z.string().min(1)).min(1),
  difficulty: z.enum(['easy', 'medium', 'advanced'])
})

const InlineFeedbackSchema = z.object({
  type: z.enum(['strength', 'improvement']),
  segment: z.string().min(1),
  comment: z.string().min(1),
  suggestion: z.string().optional()
})

const ResponseSchema = z.object({
  scorePercentage: z.number().min(0).max(100),
  inlineFeedback: z.array(InlineFeedbackSchema)
})

export type DistortedTaleFeedbackResponse = z.infer<typeof ResponseSchema>

// ---------- Build Prompt ----------
function buildFeedbackPrompt(
  story: string,
  studentEnding: string,
  targetWords: string[],
  difficulty: string
) {
  const system = `You are an ENCOURAGING and GENEROUS English teacher evaluating a student's story ending.

The student was given a story that stops at a cliffhanger, then asked to write the ENDING using specific vocabulary words.

**IMPORTANT: BE GENEROUS WITH SCORING!** 
- This is for young learners (ages 10-15)
- If they made an effort and the text makes sense, reward them
- Small grammar mistakes should NOT heavily penalize the score
- Focus on effort, creativity, and word usage

**Scoring Guide (be generous!):**
- 90-100%: Used all words, text makes sense, connects to story (minor errors OK!)
- 80-89%: Used most words, decent connection to story
- 70-79%: Used some words, basic connection to story
- 60-69%: Used few words or weak connection
- Below 60%: Major issues with comprehension or didn't try

**Score Criteria:**
1. **Word Inclusion (40%)** - Did they USE the vocabulary words? Even if grammar is imperfect, if words are present, give points!
2. **Story Connection (30%)** - Does the ending relate to the original story?
3. **Makes Sense (20%)** - Is the text understandable?
4. **Grammar (10%)** - Minor issues are OK! Don't be harsh.

**CRITICAL:** If the student used ALL the target words and the text is comprehensible, the score should be AT LEAST 85%!

**Inline Feedback:**
- Find 2-3 segments to highlight
- Focus more on STRENGTHS than improvements
- For improvements, ALWAYS provide a helpful suggestion
- Keep comments SHORT, POSITIVE, and encouraging

Output format - JSON only:
{
  "scorePercentage": 92,
  "inlineFeedback": [
    {
      "type": "strength",
      "segment": "the brave hero smiled",
      "comment": "Excellent use of vocabulary! Great job!"
    },
    {
      "type": "strength", 
      "segment": "they finally found the treasure",
      "comment": "Nice connection to the story!"
    },
    {
      "type": "improvement",
      "segment": "he go home",
      "comment": "Small fix needed here",
      "suggestion": "he went home"
    }
  ]
}`

  const user = `**ORIGINAL STORY (ending at cliffhanger):**
${story}

**STUDENT'S ENDING:**
${studentEnding}

**TARGET VOCABULARY WORDS the student should have used:**
${targetWords.map((w, i) => `${i + 1}. ${w}`).join('\n')}

**DIFFICULTY LEVEL:** ${difficulty}

Remember: Be GENEROUS! If they tried and used the words, give a HIGH score (85%+)!
Provide encouraging feedback in JSON format.`

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
    
    const { story, studentEnding, targetWords, difficulty } = parsed.data
    const { system, user } = buildFeedbackPrompt(story, studentEnding, targetWords, difficulty)
    
    const openai = getOpenAI()
    
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: system },
        { role: 'user', content: user }
      ],
      temperature: 0.6, // Slightly lower for more consistent scoring
      max_tokens: 1200,
      response_format: { type: 'json_object' }
    })
    
    const content = completion.choices[0]?.message?.content
    if (!content) {
      return NextResponse.json(
        { error: 'No response from AI' },
        { status: 500 }
      )
    }
    
    let response: DistortedTaleFeedbackResponse
    try {
      const parsedResponse = JSON.parse(content)
      response = ResponseSchema.parse(parsedResponse)
      
      // Calculate word usage for potential score boosting
      const textLower = studentEnding.toLowerCase()
      const usedWords = targetWords.filter(word => {
        const regex = new RegExp(`\\b${word.toLowerCase().replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i')
        return regex.test(textLower)
      })
      
      const wordUsageRatio = usedWords.length / targetWords.length
      const wordCount = studentEnding.trim().split(/\s+/).length
      const hasRealSentences = studentEnding.includes('.') || studentEnding.includes('!') || studentEnding.includes('?')
      
      // Only boost if:
      // 1. The text is substantial (at least 30 words or 150 chars)
      // 2. Contains actual sentences (punctuation)
      // 3. AI didn't give an extremely low score (below 40% means it's probably nonsense)
      const isSubstantialText = (wordCount >= 30 || studentEnding.length >= 150) && hasRealSentences
      const aiThoughtItMadeSense = response.scorePercentage >= 40
      
      // If student used all words AND wrote real sentences but got below 85%, boost
      if (wordUsageRatio === 1 && response.scorePercentage < 85 && isSubstantialText && aiThoughtItMadeSense) {
        response.scorePercentage = Math.max(response.scorePercentage, 88)
      }
      // If used most words (>80%) AND wrote real sentences but got below 75%, boost
      else if (wordUsageRatio >= 0.8 && response.scorePercentage < 75 && isSubstantialText && aiThoughtItMadeSense) {
        response.scorePercentage = Math.max(response.scorePercentage, 78)
      }
      // Minimum score of 60% if they wrote something meaningful (>100 chars, sentences) and used at least half the words
      else if (studentEnding.length > 100 && hasRealSentences && wordUsageRatio >= 0.5 && response.scorePercentage < 60 && aiThoughtItMadeSense) {
        response.scorePercentage = 60
      }
      
    } catch (parseError) {
      console.error('Failed to parse AI feedback response:', content)
      
      // Provide generous fallback response
      response = {
        scorePercentage: 75,
        inlineFeedback: [
          {
            type: 'strength',
            segment: studentEnding.slice(0, 30),
            comment: 'Good effort! Keep practicing!'
          }
        ]
      }
    }
    
    return NextResponse.json(response)
    
  } catch (error: any) {
    console.error('Distorted Tale Feedback API error:', error)
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}


