import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  // Check if environment variables are available
  const envCheck = {
    AZURE_SPEECH_KEY: !!process.env.AZURE_SPEECH_KEY,
    AZURE_SPEECH_REGION: !!process.env.AZURE_SPEECH_REGION,
    ELEVENLABS_API_KEY: !!process.env.ELEVENLABS_API_KEY,
    // Don't expose actual values, just check if they exist
    AZURE_SPEECH_KEY_LENGTH: process.env.AZURE_SPEECH_KEY?.length || 0,
    AZURE_SPEECH_REGION_VALUE: process.env.AZURE_SPEECH_REGION || 'not set',
    ELEVENLABS_API_KEY_LENGTH: process.env.ELEVENLABS_API_KEY?.length || 0,
    NODE_ENV: process.env.NODE_ENV,
    VERCEL: !!process.env.VERCEL,
    VERCEL_ENV: process.env.VERCEL_ENV,
  }

  return NextResponse.json(envCheck)
}




