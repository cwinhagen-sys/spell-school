import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { getOpenAI } from '@/lib/openai'

const RequestSchema = z.object({
  word: z.string().min(1),
  context: z.string().optional() // Optional context sentence where the word appears
})

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { word, context } = RequestSchema.parse(body)

    const openai = getOpenAI()
    
    // Generate simple, student-friendly explanation
    const prompt = context 
      ? `Explain the word "${word}" in simple English for a student learning English. The word appears in this sentence: "${context}". Give a short, clear explanation (1-2 sentences max).`
      : `Explain the word "${word}" in simple English for a student learning English. Give a short, clear explanation (1-2 sentences max).`

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: 'You are a helpful English teacher. Explain words simply and clearly for students learning English as a second language. Keep explanations short (1-2 sentences) and use simple language.'
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      temperature: 0.7,
      max_tokens: 100
    })

    const explanation = completion.choices[0]?.message?.content?.trim() || `A word meaning "${word}"`

    return NextResponse.json({ 
      word: word.toLowerCase(),
      explanation 
    })
  } catch (error: any) {
    console.error('Word explanation error:', error)
    return NextResponse.json(
      { error: 'Failed to generate explanation', details: error.message },
      { status: 500 }
    )
  }
}


