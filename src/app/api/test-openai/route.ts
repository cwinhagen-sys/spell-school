import { NextResponse } from 'next/server'
import { getOpenAI } from '@/lib/openai'

export async function GET() {
  try {
    console.log('Testing OpenAI connection...')
    const openai = getOpenAI()
    
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'user', content: 'Say "Hello, OpenAI is working!" in JSON format: {"message": "your response"}' }
      ],
      max_tokens: 50,
      temperature: 0
    })
    
    const response = completion.choices?.[0]?.message?.content?.trim() || ''
    console.log('OpenAI test response:', response)
    
    return NextResponse.json({ 
      success: true, 
      response,
      model: 'gpt-4o-mini'
    })
  } catch (error: any) {
    console.error('OpenAI test failed:', error)
    return NextResponse.json({ 
      success: false, 
      error: error.message,
      code: error.code,
      status: error.status
    }, { status: 500 })
  }
}