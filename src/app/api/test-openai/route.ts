import { NextRequest, NextResponse } from 'next/server'
import { getOpenAI } from '@/lib/openai'

export async function GET(request: NextRequest) {
  try {
    console.log('Testing OpenAI connection...')
    
    // Test if we can create the OpenAI client
    const openai = getOpenAI()
    console.log('OpenAI client created successfully')
    
    // Test a simple API call
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'user',
          content: 'Say "Hello, API test successful!"'
        }
      ],
      max_tokens: 10
    })
    
    const response = completion.choices[0]?.message?.content
    console.log('OpenAI response:', response)
    
    return NextResponse.json({
      success: true,
      message: 'OpenAI API is working!',
      response: response
    })
    
  } catch (error) {
    console.error('OpenAI test failed:', error)
    
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      details: error
    }, { status: 500 })
  }
}



