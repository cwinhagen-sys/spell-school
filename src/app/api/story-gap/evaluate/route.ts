import { NextRequest, NextResponse } from 'next/server'
import { getOpenAI } from '@/lib/openai'

// Evaluate story coherence and word choices
export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { 
      originalStory, // The story with gaps
      completedStory, // The story with user's words filled in
      correctWords, // The expected correct words
      userWords, // The words the user chose
      scenario // The story setting
    } = body

    if (!completedStory || !userWords || !correctWords) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    const openai = getOpenAI()

    const systemPrompt = `You are evaluating a student's fill-in-the-blank story completion.
Score the student's work on three criteria:

1. COHERENCE (0-40 points): Does the completed story make logical sense? Do the sentences flow together?
2. WORD_CHOICE (0-40 points): Are the chosen words appropriate for the context? Do they fit grammatically and semantically?
3. ENDING (0-20 points): Does the story reach a satisfying conclusion? Does it feel complete?

For each wrong word (user word differs from correct word), deduct points based on how badly it affects coherence.
If a wrong word still makes grammatical and semantic sense in context, give partial credit.

Respond in JSON format:
{
  "coherence_score": number,
  "word_choice_score": number,
  "ending_score": number,
  "total_score": number,
  "feedback": "Brief encouraging feedback in Swedish",
  "word_evaluations": [
    { "word": "user word", "correct": "correct word", "points": number, "comment": "brief comment" }
  ]
}`

    const userPrompt = `Evaluate this story completion:

SCENARIO: ${scenario || 'General setting'}

COMPLETED STORY:
${completedStory}

CORRECT WORDS: ${JSON.stringify(correctWords)}
USER'S WORDS: ${JSON.stringify(userWords)}

Evaluate and provide scores.`

    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ],
      max_tokens: 500,
      temperature: 0.3,
      response_format: { type: 'json_object' }
    })

    const content = response.choices[0]?.message?.content
    if (!content) {
      throw new Error('No response from AI')
    }

    const evaluation = JSON.parse(content)

    return NextResponse.json({
      coherence: evaluation.coherence_score || 0,
      wordChoice: evaluation.word_choice_score || 0,
      ending: evaluation.ending_score || 0,
      total: evaluation.total_score || 0,
      feedback: evaluation.feedback || 'Bra jobbat!',
      wordEvaluations: evaluation.word_evaluations || []
    })
  } catch (error: any) {
    console.error('Story evaluation error:', error)
    return NextResponse.json(
      { error: 'Evaluation failed', details: error.message },
      { status: 500 }
    )
  }
}



