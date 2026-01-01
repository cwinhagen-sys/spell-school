import { NextRequest, NextResponse } from 'next/server'
import OpenAI from 'openai'

// OpenAI Text-to-Speech API endpoint
// Uses OpenAI's TTS API with high-quality neural voices

interface TTSRequest {
  text: string
  voice?: 'alloy' | 'echo' | 'fable' | 'onyx' | 'nova' | 'shimmer'
  speed?: number  // 0.25 to 4.0, default 1.0
  language?: 'en' | 'sv'  // Used to select appropriate voice
}

interface WordTiming {
  word: string
  start: number
  end: number
}

// Initialize OpenAI client
function getOpenAIClient() {
  const apiKey = process.env.OPENAI_API_KEY
  
  if (!apiKey) {
    throw new Error('OPENAI_API_KEY environment variable is not set')
  }
  
  return new OpenAI({ apiKey })
}

// Voice recommendations:
// - alloy: Neutral, balanced (good for general use)
// - echo: Male, warm and engaging
// - fable: British accent, expressive (good for storytelling)
// - onyx: Deep male voice, authoritative
// - nova: Female, warm and friendly (recommended for education)
// - shimmer: Female, clear and expressive

export async function POST(req: NextRequest) {
  try {
    const body: TTSRequest = await req.json()
    const { text, voice = 'nova', speed = 1.0, language = 'en' } = body

    if (!text) {
      return NextResponse.json(
        { error: 'Missing required field: text' },
        { status: 400 }
      )
    }

    // Validate speed range
    const clampedSpeed = Math.max(0.25, Math.min(4.0, speed))

    // Initialize OpenAI client
    let client: OpenAI
    try {
      client = getOpenAIClient()
    } catch (error: any) {
      console.error('Failed to initialize OpenAI client:', error)
      return NextResponse.json(
        { 
          error: 'Failed to initialize OpenAI client',
          details: error.message,
          hint: 'Make sure OPENAI_API_KEY is set correctly'
        },
        { status: 500 }
      )
    }

    // Generate speech using OpenAI TTS
    const response = await client.audio.speech.create({
      model: 'tts-1',  // Use 'tts-1-hd' for higher quality (more expensive)
      voice: voice,
      input: text,
      speed: clampedSpeed,
      response_format: 'mp3',
    })

    // Get the audio as an ArrayBuffer
    const audioBuffer = await response.arrayBuffer()
    
    if (!audioBuffer || audioBuffer.byteLength === 0) {
      return NextResponse.json(
        { error: 'No audio content returned from API' },
        { status: 500 }
      )
    }

    // Convert to base64 for consistent API response format
    const audioContent = Buffer.from(audioBuffer).toString('base64')

    // Calculate estimated word timings based on speech patterns
    // OpenAI TTS doesn't provide word-level timestamps, so we estimate
    const words = text.split(/\s+/).filter(w => w.trim().length > 0)
    let currentTime = 0
    const wordTimings: WordTiming[] = words.map((word) => {
      const cleanWord = word.replace(/[.,!?;:'"]/g, '')
      
      // Base duration calculation adjusted for OpenAI TTS characteristics
      const wordLength = cleanWord.length
      let baseDuration: number
      
      if (wordLength <= 2) {
        baseDuration = 0.18
      } else if (wordLength <= 5) {
        baseDuration = 0.18 + (wordLength - 2) * 0.04
      } else {
        baseDuration = 0.30 + (wordLength - 5) * 0.03
      }
      
      // Adjust for speed
      const duration = baseDuration / clampedSpeed
      
      // Check for punctuation that adds pauses
      const hasPause = /[.,!?;:]/.test(word)
      const pauseTime = hasPause ? (0.2 / clampedSpeed) : 0
      
      const startTime = currentTime
      const endTime = currentTime + duration
      
      currentTime = endTime + pauseTime + (0.08 / clampedSpeed)
      
      return {
        word: word,
        start: startTime,
        end: endTime,
      }
    })

    return NextResponse.json({
      audioContent,
      contentType: 'audio/mpeg',
      wordTimings,
      voice,
      speed: clampedSpeed,
    })
  } catch (error: any) {
    console.error('OpenAI TTS API error:', error)
    
    // Handle specific OpenAI errors
    if (error.status === 401) {
      return NextResponse.json(
        { 
          error: 'Invalid OpenAI API key',
          hint: 'Check that OPENAI_API_KEY is set correctly'
        },
        { status: 401 }
      )
    }
    
    if (error.status === 429) {
      return NextResponse.json(
        { 
          error: 'Rate limit exceeded',
          hint: 'Too many requests to OpenAI API'
        },
        { status: 429 }
      )
    }
    
    return NextResponse.json(
      { 
        error: 'Internal server error', 
        details: error.message,
      },
      { status: 500 }
    )
  }
}




