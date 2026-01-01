import { NextRequest, NextResponse } from 'next/server'
import OpenAI from 'openai'

// OpenAI Advanced Text-to-Speech API endpoint
// Uses gpt-4o-mini-tts for promptable voice control
// Supports: accent, emotion, tone, speed, whispering, etc.

interface TTSRequest {
  text: string
  voice?: 'alloy' | 'ash' | 'ballad' | 'coral' | 'echo' | 'fable' | 'onyx' | 'nova' | 'sage' | 'shimmer' | 'verse'
  instructions?: string  // Voice instructions for controlling speech style
  speed?: number  // 0.25 to 4.0, default 1.0
}

// Initialize OpenAI client
function getOpenAIClient() {
  const apiKey = process.env.OPENAI_API_KEY
  if (!apiKey) {
    throw new Error('OPENAI_API_KEY environment variable is not set')
  }
  return new OpenAI({ apiKey })
}

// Preset voice styles for the scenario game
export const VOICE_PRESETS = {
  narrator: {
    name: 'Narrator',
    description: 'Clear and engaging storytelling voice',
    voice: 'fable' as const,
    instructions: 'Read this as an engaging narrator. Use a warm, inviting tone that draws the listener into the story. Pace yourself well, adding subtle pauses for dramatic effect.'
  },
  excited: {
    name: 'Excited',
    description: 'Energetic and enthusiastic',
    voice: 'nova' as const,
    instructions: 'Read this with excitement and energy! Sound enthusiastic and happy, like something wonderful is happening.'
  },
  mysterious: {
    name: 'Mysterious',
    description: 'Suspenseful and intriguing',
    voice: 'onyx' as const,
    instructions: 'Read this with a mysterious, slightly suspenseful tone. Speak a bit slower and lower, as if revealing secrets.'
  },
  friendly: {
    name: 'Friendly',
    description: 'Warm and encouraging',
    voice: 'shimmer' as const,
    instructions: 'Read this in a warm, friendly manner. Sound like a kind teacher or helpful friend. Be encouraging and supportive.'
  },
  dramatic: {
    name: 'Dramatic',
    description: 'Theatrical and expressive',
    voice: 'fable' as const,
    instructions: 'Read this dramatically, like a theatrical performance. Emphasize emotions, use varied intonation, and make it feel like a grand adventure.'
  },
  calm: {
    name: 'Calm',
    description: 'Peaceful and soothing',
    voice: 'sage' as const,
    instructions: 'Read this calmly and peacefully. Use a soothing, relaxed tone. Speak at a measured pace, never rushed.'
  },
  serious: {
    name: 'Serious',
    description: 'Professional and focused',
    voice: 'echo' as const,
    instructions: 'Read this in a serious, professional tone. Be clear and direct. This is important information that requires focus.'
  },
  playful: {
    name: 'Playful',
    description: 'Fun and lighthearted',
    voice: 'coral' as const,
    instructions: 'Read this playfully and lightheartedly! Have fun with it, sound cheerful and maybe even a bit silly at times.'
  }
} as const

export type VoicePreset = keyof typeof VOICE_PRESETS

export async function POST(req: NextRequest) {
  try {
    const body: TTSRequest = await req.json()
    const { text, voice = 'fable', instructions, speed = 1.0 } = body

    if (!text) {
      return NextResponse.json(
        { error: 'Missing required field: text' },
        { status: 400 }
      )
    }

    const clampedSpeed = Math.max(0.25, Math.min(4.0, speed))
    const client = getOpenAIClient()

    // Use gpt-4o-mini-tts for promptable voice control
    // Note: This uses the Audio API with the newer model
    const response = await client.audio.speech.create({
      model: 'gpt-4o-mini-tts',
      voice: voice,
      input: text,
      speed: clampedSpeed,
      response_format: 'mp3',
      // The instructions parameter controls voice style
      ...(instructions && { instructions })
    } as any) // Type assertion needed as SDK may not have latest types

    const audioBuffer = await response.arrayBuffer()

    if (!audioBuffer || audioBuffer.byteLength === 0) {
      return NextResponse.json(
        { error: 'No audio content returned from API' },
        { status: 500 }
      )
    }

    const audioContent = Buffer.from(audioBuffer).toString('base64')

    return NextResponse.json({
      audioContent,
      contentType: 'audio/mpeg',
      voice,
      speed: clampedSpeed,
    })

  } catch (error: any) {
    console.error('OpenAI Advanced TTS API error:', error)

    if (error.status === 401) {
      return NextResponse.json(
        { error: 'Invalid OpenAI API key' },
        { status: 401 }
      )
    }

    if (error.status === 429) {
      return NextResponse.json(
        { error: 'Rate limit exceeded' },
        { status: 429 }
      )
    }

    // If gpt-4o-mini-tts fails, fall back to tts-1
    try {
      console.log('Falling back to tts-1 model...')
      const client = getOpenAIClient()
      const body: TTSRequest = await req.clone().json()
      const { text, voice = 'fable', speed = 1.0 } = body

      const response = await client.audio.speech.create({
        model: 'tts-1',
        voice: voice as any,
        input: text,
        speed: Math.max(0.25, Math.min(4.0, speed)),
        response_format: 'mp3',
      })

      const audioBuffer = await response.arrayBuffer()
      const audioContent = Buffer.from(audioBuffer).toString('base64')

      return NextResponse.json({
        audioContent,
        contentType: 'audio/mpeg',
        voice,
        speed,
        fallback: true
      })
    } catch (fallbackError: any) {
      return NextResponse.json(
        { error: 'Failed to generate speech', details: fallbackError.message },
        { status: 500 }
      )
    }
  }
}
