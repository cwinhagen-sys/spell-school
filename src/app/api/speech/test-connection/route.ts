import { NextRequest, NextResponse } from 'next/server'
import { AZURE_SPEECH_KEY, AZURE_SPEECH_REGION } from '@/lib/env'
import * as sdk from 'microsoft-cognitiveservices-speech-sdk'

/**
 * Test endpoint to verify Azure Speech Service connection
 * This helps diagnose subscription/authentication issues
 */
export async function GET(request: NextRequest) {
  try {
    // Check environment variables
    if (!process.env.AZURE_SPEECH_KEY || !process.env.AZURE_SPEECH_REGION) {
      return NextResponse.json(
        { 
          success: false,
          error: 'Missing environment variables',
          details: {
            hasKey: !!process.env.AZURE_SPEECH_KEY,
            hasRegion: !!process.env.AZURE_SPEECH_REGION
          }
        },
        { status: 500 }
      )
    }

    const apiKey = AZURE_SPEECH_KEY()
    const region = AZURE_SPEECH_REGION()

    // Validate credentials format
    const validation = {
      keyLength: apiKey.length,
      keyValid: apiKey.length >= 10,
      regionValid: region.length >= 3,
      region: region
    }

    if (!validation.keyValid || !validation.regionValid) {
      return NextResponse.json(
        { 
          success: false,
          error: 'Invalid credentials format',
          validation
        },
        { status: 400 }
      )
    }

    // Try to create SpeechConfig (this validates the credentials)
    try {
      const speechConfig = sdk.SpeechConfig.fromSubscription(apiKey, region)
      speechConfig.speechRecognitionLanguage = 'en-US'
      
      // If we get here, the config was created successfully
      // This means the credentials are valid format-wise
      // But we can't fully test without making an actual API call
      
      return NextResponse.json({
        success: true,
        message: 'Azure Speech Service credentials are valid format',
        validation,
        note: 'This only validates the format. Actual API calls may still fail if subscription is inactive or has issues.'
      })
    } catch (configError: any) {
      return NextResponse.json(
        { 
          success: false,
          error: 'Failed to create Azure Speech config',
          details: configError?.message || 'Unknown error',
          validation
        },
        { status: 500 }
      )
    }
  } catch (error: any) {
    console.error('Test connection error:', error)
    return NextResponse.json(
      { 
        success: false,
        error: 'Test failed',
        details: error?.message || 'Unknown error'
      },
      { status: 500 }
    )
  }
}

