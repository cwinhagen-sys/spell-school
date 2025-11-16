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
    
    // Generate Swedish translation using OpenAI
    const prompt = context 
      ? `Translate the English word "${word}" to Swedish. The word appears in this sentence: "${context}". Return ONLY the Swedish translation, nothing else.`
      : `Translate the English word "${word}" to Swedish. Return ONLY the Swedish translation, nothing else.`

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: 'You are a helpful translator. Translate English words to Swedish. Return only the Swedish word, no explanations or additional text.'
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      temperature: 0.3,
      max_tokens: 50
    })

    const translation = completion.choices[0]?.message?.content?.trim() || null

    if (!translation) {
      return NextResponse.json(
        { error: 'Failed to generate translation' },
        { status: 500 }
      )
    }

    return NextResponse.json({ 
      word: word.toLowerCase(),
      translation: translation.toLowerCase()
    })
  } catch (error: any) {
    console.error('Translation error:', error)
    return NextResponse.json(
      { error: 'Failed to translate word', details: error.message },
      { status: 500 }
    )
  }
}


