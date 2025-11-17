import { NextRequest, NextResponse } from 'next/server'
import { ELEVENLABS_API_KEY } from '@/lib/env'

export async function POST(request: NextRequest) {
  try {
    // Check environment variable first
    if (!process.env.ELEVENLABS_API_KEY) {
      console.error('ElevenLabs API key missing:', {
        hasKey: !!process.env.ELEVENLABS_API_KEY,
        nodeEnv: process.env.NODE_ENV,
        vercel: !!process.env.VERCEL,
      })
      return NextResponse.json(
        { 
          error: 'ElevenLabs API configuration missing',
          details: 'ELEVENLABS_API_KEY must be set in environment variables'
        },
        { status: 500 }
      )
    }

    const { text, voice_id = '21m00Tcm4TlvDq8ikWAM', stability = 0.5, similarity_boost = 0.75, speed = 1.0 } = await request.json()

    if (!text) {
      return NextResponse.json({ error: 'Text is required' }, { status: 400 })
    }

    const apiKey = ELEVENLABS_API_KEY()
    
    const response = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voice_id}`, {
      method: 'POST',
      headers: {
        'Accept': 'audio/mpeg',
        'Content-Type': 'application/json',
        'xi-api-key': apiKey
      },
      body: JSON.stringify({
        text,
        model_id: 'eleven_multilingual_v2', // Good for English texts
        voice_settings: {
          stability,
          similarity_boost,
          speed
        }
      })
    })

    if (!response.ok) {
      const error = await response.text()
      console.error('ElevenLabs API error:', error)
      return NextResponse.json(
        { error: 'Failed to generate speech', details: error },
        { status: response.status }
      )
    }

    const audioBuffer = await response.arrayBuffer()
    
    return new NextResponse(audioBuffer, {
      headers: {
        'Content-Type': 'audio/mpeg',
        'Content-Length': audioBuffer.byteLength.toString()
      }
    })
  } catch (error: any) {
    console.error('ElevenLabs TTS error:', error)
    return NextResponse.json(
      { error: 'Failed to generate speech', details: error.message },
      { status: 500 }
    )
  }
}


