import { NextResponse } from 'next/server'
import { getOpenAI } from '@/lib/openai'

export async function POST(req: Request) {
  try {
    const { model } = await req.json()
    const modelName = model || 'gpt-4o-mini'
    
    console.log(`Testing model: ${modelName}`)
    const openai = getOpenAI()
    
    try {
      // GPT-5-mini uses max_completion_tokens instead of max_tokens
      // GPT-5-mini also doesn't support temperature: 0, only default (1)
      const isGPT5Mini = modelName.includes('gpt-5')
      const completionParams: any = {
        model: modelName,
        messages: [
          { role: 'user', content: 'Say "Hello, this model works!" in JSON format: {"message": "your response"}' }
        ]
      }
      
      // GPT-5-mini doesn't support temperature: 0, only default (1)
      if (!isGPT5Mini) {
        completionParams.temperature = 0
      }
      
      // Use correct parameter based on model
      if (isGPT5Mini) {
        completionParams.max_completion_tokens = 50
      } else {
        completionParams.max_tokens = 50
      }
      
      const completion = await openai.chat.completions.create(completionParams)
      
      const response = completion.choices?.[0]?.message?.content?.trim() || ''
      console.log(`Model ${modelName} response:`, response)
      
      return NextResponse.json({ 
        success: true, 
        model: modelName,
        response,
        available: true
      })
    } catch (error: any) {
      console.error(`Model ${modelName} failed:`, {
        error: error?.message,
        code: error?.code,
        status: error?.status,
        type: error?.type
      })
      
      return NextResponse.json({ 
        success: false, 
        model: modelName,
        available: false,
        error: error?.message,
        code: error?.code,
        status: error?.status
      })
    }
  } catch (error: any) {
    return NextResponse.json({ 
      success: false, 
      error: error?.message 
    }, { status: 500 })
  }
}

